/**
 * ============================================================================
 * MODUL CHAT: PERCAKAPAN & SUPER ENKRIPSI BIMBINGAN (FR-CHAT-01 s.d. 06)
 * ============================================================================
 */

import { db } from '../database/connection.ts';
import {
  superEncryptWithSubkeys,
  superDecryptWithSubkeys,
  type SubKeyPayload,
} from '../crypto/2_superEncryption.ts';
import { encryptDatabaseColumn, decryptDatabaseColumn } from '../crypto/3_dbEncryption.ts';
import { AuditService } from './audit.service.ts';
import { AppError, ErrorCodes } from '../config/errors.ts';
import { KeysService, type SubKeys } from './keys.service.ts';
import type { Session } from './session.service.ts';

export interface PlainChatMessage {
  id: number;
  convId: number;
  sender: string;
  msgType: string;
  plaintext?: string;
  status: 'DELIVERED' | 'CORRUPTED';
  createdAt: string;
}

export class ChatService {
  /**
   * FR-CHAT-01: Melihat daftar percakapan aktif milik user
   */
  static listConversations(userId: number | string) {
    const rows = db
      .prepare(`
        SELECT c.*, 
               u1.username as studentUsername, u1.fullNameEncrypted as studentNameEnc,
               u2.username as lecturerUsername, u2.fullNameEncrypted as lecturerNameEnc
        FROM Conversation c
        LEFT JOIN User u1 ON c.studentId = u1.id
        LEFT JOIN User u2 ON c.lecturerId = u2.id
        WHERE (c.studentId = ? OR c.lecturerId = ? OR u1.username = ? OR u2.username = ?)
          AND c.isActive = 1
        ORDER BY c.id DESC
      `)
      .all(userId, userId, userId, userId) as any[];

    return rows.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      studentUsername: r.studentUsername,
      studentFullName: r.studentNameEnc ? decryptDatabaseColumn(r.studentNameEnc) : '',
      lecturerId: r.lecturerId,
      lecturerUsername: r.lecturerUsername,
      lecturerFullName: r.lecturerNameEnc ? decryptDatabaseColumn(r.lecturerNameEnc) : '',
      topic: r.topic,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Mengambil detail percakapan beserta kunci wrapped untuk user
   */
  static getConversation(convId: number, userId?: number | string) {
    const row = db.prepare('SELECT * FROM Conversation WHERE id = ?').get(convId) as any;
    if (!row) {
      throw new AppError(ErrorCodes.ERR_NOT_PARTICIPANT, 'Percakapan tidak ditemukan', 404);
    }
    return row;
  }

  /**
   * FR-CHAT-02: Kirim pesan bimbingan dengan Super Enkripsi (Vigenère -> Transposisi -> AES-GCM)
   */
  static sendMessage(params: {
    convId: number;
    sender: string;
    plaintext: string;
    subkeys: SubKeyPayload;
  }) {
    if (!params.plaintext) {
      throw new AppError(ErrorCodes.ERR_AUTH_INVALID, 'Pesan teks tidak boleh kosong', 400);
    }

    const aad = `conv:${params.convId}|sender:${params.sender}`;
    const encrypted = superEncryptWithSubkeys(params.plaintext, params.subkeys, aad);

    const nowIso = new Date().toISOString();
    const senderEnc = encryptDatabaseColumn(params.sender);

    const info = db.prepare(`
      INSERT INTO SecretMessage (
        convId, title, senderEncrypted, mode,
        stage1VigenerePreview, stage2VernamHex, superCiphertextPayload,
        msgType, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'TEXT', ?)
    `).run(
      params.convId,
      'Pesan Bimbingan',
      senderEnc,
      'GCM',
      '[Vigenere+Transposisi]',
      encrypted.authTagHex,
      encrypted.combinedPayload,
      nowIso
    );

    return {
      id: Number(info.lastInsertRowid),
      convId: params.convId,
      sender: params.sender,
      msgType: 'TEXT',
      ciphertextHex: encrypted.ciphertextHex,
      nonceHex: encrypted.nonceHex,
      authTagHex: encrypted.authTagHex,
      createdAt: nowIso,
    };
  }

  /**
   * FR-CHAT-03 & 05: Membaca pesan dalam percakapan (Dekripsi otomatis)
   */
  static fetchMessages(params: {
    convId: number;
    subkeys: SubKeyPayload;
    afterId?: number;
    limit?: number;
  }): PlainChatMessage[] {
    const afterId = params.afterId || 0;
    const limit = params.limit || 50;

    const rows = db
      .prepare(`
        SELECT * FROM SecretMessage
        WHERE convId = ? AND id > ?
        ORDER BY id ASC
        LIMIT ?
      `)
      .all(params.convId, afterId, limit) as any[];

    return rows.map((r) => {
      const sender = decryptDatabaseColumn(r.senderEncrypted);
      let plaintext = '';
      let status: 'DELIVERED' | 'CORRUPTED' = 'DELIVERED';

      if (r.superCiphertextPayload.startsWith('SUPER-GCM-V1:')) {
        try {
          const parts = r.superCiphertextPayload.split(':');
          const nonceHex = parts[1];
          const authTagHex = parts[2];
          const ciphertextHex = parts[3];
          const aad = `conv:${r.convId}|sender:${sender}`;

          plaintext = superDecryptWithSubkeys(
            { ciphertextHex, nonceHex, authTagHex },
            params.subkeys,
            aad
          );
        } catch {
          status = 'CORRUPTED';
          plaintext = '[Pesan rusak atau mengalami manipulasi (Tag GCM invalid)]';
        }
      } else {
        // Fallback ke cipher legacy
        plaintext = '[Cipher Legacy CBC/ECB]';
      }

      return {
        id: r.id,
        convId: r.convId,
        sender,
        msgType: r.msgType || 'TEXT',
        plaintext,
        status,
        createdAt: r.createdAt,
      };
    });
  }

  // ==========================================================================
  // LAPISAN BERBASIS SESI (FR-AUTH-08, FR-CHAT-04)
  // Identitas & kunci berasal dari sesi server, bukan dari body request klien.
  // ==========================================================================

  /** FR-AUTH-08 / FR-CHAT-04: hanya mahasiswa atau dosen pada percakapan yang boleh akses */
  static requireParticipant(session: Session, convId: number) {
    const conv = db
      .prepare('SELECT * FROM Conversation WHERE id = ? AND isActive = 1')
      .get(convId) as any;
    // Pesan sama untuk "tidak ada" & "bukan peserta" agar ID percakapan tidak bisa ditebak
    if (!conv || (conv.studentId !== session.userId && conv.lecturerId !== session.userId)) {
      throw new AppError(
        ErrorCodes.ERR_NOT_PARTICIPANT,
        'Anda bukan peserta percakapan ini',
        403
      );
    }
    return conv;
  }

  /** FR-KEY-02/03: unwrap K_conv dengan private key sesi, turunkan subkey, cache di memori sesi */
  static subkeysFor(session: Session, conv: any): SubKeys {
    const cached = session.subkeysByConv.get(conv.id);
    if (cached) return cached;

    if (!session.privateKeyPem) {
      throw new AppError(
        ErrorCodes.ERR_KEY_UNLOCK_FAILED,
        'Akun ini belum memiliki keypair. Minta admin melakukan provisioning akun.',
        409
      );
    }
    const wrapped =
      conv.studentId === session.userId ? conv.wrappedKeyStudent : conv.wrappedKeyLecturer;
    const kConv = KeysService.unwrapKey(wrapped, session.privateKeyPem);
    const subkeys = KeysService.deriveSubkeys(kConv);
    kConv.fill(0);
    session.subkeysByConv.set(conv.id, subkeys);
    return subkeys;
  }

  static listConversationsFor(session: Session) {
    return ChatService.listConversations(session.userId);
  }

  /** Detail percakapan TANPA kunci terbungkus */
  static getConversationFor(session: Session, convId: number) {
    const c = ChatService.requireParticipant(session, convId);
    return {
      id: c.id,
      studentId: c.studentId,
      lecturerId: c.lecturerId,
      topic: c.topic,
      createdAt: c.createdAt,
    };
  }

  /** FR-CHAT-02: pengirim = pemilik sesi (tidak bisa dipalsukan klien) */
  static sendMessageAs(session: Session, convId: number, plaintext: string) {
    const conv = ChatService.requireParticipant(session, convId);
    return ChatService.sendMessage({
      convId,
      sender: session.username,
      plaintext,
      subkeys: ChatService.subkeysFor(session, conv),
    });
  }

  /** FR-CHAT-03/05: baca & dekripsi pesan baru (afterId) */
  static fetchMessagesAs(session: Session, convId: number, afterId = 0, limit = 50) {
    const conv = ChatService.requireParticipant(session, convId);
    return ChatService.fetchMessages({
      convId,
      subkeys: ChatService.subkeysFor(session, conv),
      afterId,
      limit,
    });
  }
}
