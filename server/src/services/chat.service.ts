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
}
