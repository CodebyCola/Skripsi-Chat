/**
 * ============================================================================
 * MODUL VAULT: PESAN PENTING TERENKRIPSI DI DATABASE (FR-VAULT-01 s.d. 04)
 * ============================================================================
 * Kriteria Tugas Akhir #5:
 * Pesan penting (ACC, Revisi, Jadwal Sidang) disimpan terenkripsi per kolom di DB
 * menggunakan AES-256-GCM dengan master key (K_master_db) di luar database.
 */

import crypto from 'node:crypto';
import { db } from '../database/connection.ts';
import { KeysService } from './keys.service.ts';
import { AuditService } from './audit.service.ts';
import { AppError, ErrorCodes } from '../config/errors.ts';

export interface ImportantMessageRecord {
  id: number;
  convId: number;
  messageId: number;
  category: 'ACC' | 'REVISI' | 'JADWAL_SIDANG' | 'LAINNYA';
  contentPlain?: string;
  markedBy: string;
  markedAt: string;
}

export class VaultService {
  /**
   * FR-VAULT-01 & 02: Dosen menandai pesan sebagai penting (dienkripsi per-kolom dengan K_master_db)
   */
  static markImportant(params: {
    messageId: number;
    category: 'ACC' | 'REVISI' | 'JADWAL_SIDANG' | 'LAINNYA';
    plainContent: string;
    markedBy: string;
    convId?: number;
  }): ImportantMessageRecord {
    const category = params.category || 'ACC';
    const markedBy = params.markedBy || 'dosen_pembimbing';

    // Cek apakah pesan sudah pernah ditandai sebelumnya (idempoten)
    const existing = db
      .prepare('SELECT * FROM ImportantMessage WHERE messageId = ?')
      .get(params.messageId) as any;

    if (existing) {
      return {
        id: existing.id,
        convId: existing.convId,
        messageId: existing.messageId,
        category: existing.category,
        contentPlain: params.plainContent,
        markedBy: existing.markedBy,
        markedAt: existing.markedAt,
      };
    }

    const masterKey = KeysService.loadMasterDbKey();
    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, nonce);
    cipher.setAAD(Buffer.from(`important_messages.content|${params.messageId}`, 'utf8'));

    const encrypted = Buffer.concat([
      cipher.update(params.plainContent, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    const nowIso = new Date().toISOString();
    const convId = params.convId || 1;

    const info = db.prepare(`
      INSERT INTO ImportantMessage (
        convId, messageId, category, contentEnc, nonceHex, authTagHex, markedBy, markedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      convId,
      params.messageId,
      category,
      encrypted.toString('hex'),
      nonce.toString('hex'),
      authTag.toString('hex'),
      markedBy,
      nowIso
    );

    AuditService.log({
      actorId: markedBy,
      action: 'MARK_IMPORTANT',
      targetType: 'MESSAGE',
      targetId: params.messageId,
      result: 'SUCCESS',
      detail: `Kategori: ${category}`,
    });

    return {
      id: Number(info.lastInsertRowid),
      convId,
      messageId: params.messageId,
      category,
      contentPlain: params.plainContent,
      markedBy,
      markedAt: nowIso,
    };
  }

  /**
   * FR-VAULT-03: Menampilkan daftar pesan penting (didekripsi on-the-fly dengan K_master_db)
   */
  static listImportant(convId?: number): ImportantMessageRecord[] {
    const query = convId
      ? 'SELECT * FROM ImportantMessage WHERE convId = ? ORDER BY id DESC'
      : 'SELECT * FROM ImportantMessage ORDER BY id DESC';

    const rows = (convId ? db.prepare(query).all(convId) : db.prepare(query).all()) as Array<{
      id: number;
      convId: number;
      messageId: number;
      category: 'ACC' | 'REVISI' | 'JADWAL_SIDANG' | 'LAINNYA';
      contentEnc: string;
      nonceHex: string;
      authTagHex: string;
      markedBy: string;
      markedAt: string;
    }>;

    const masterKey = KeysService.loadMasterDbKey();

    return rows.map((r) => {
      let contentPlain = '[CORRUPTED: Tag AEAD tidak valid]';
      try {
        const nonce = Buffer.from(r.nonceHex, 'hex');
        const authTag = Buffer.from(r.authTagHex, 'hex');
        const ciphertext = Buffer.from(r.contentEnc, 'hex');

        const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, nonce);
        decipher.setAAD(Buffer.from(`important_messages.content|${r.messageId}`, 'utf8'));
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        contentPlain = decrypted.toString('utf8');
      } catch {
        // Tag gagal didekripsi
      }

      return {
        id: r.id,
        convId: r.convId,
        messageId: r.messageId,
        category: r.category,
        contentPlain,
        markedBy: r.markedBy,
        markedAt: r.markedAt,
      };
    });
  }

  /**
   * FR-VAULT-04: Menghapus tanda penting pada pesan
   */
  static unmarkImportant(messageId: number, actor: string): boolean {
    const res = db.prepare('DELETE FROM ImportantMessage WHERE messageId = ?').run(messageId);
    if (res.changes > 0) {
      AuditService.log({
        actorId: actor,
        action: 'UNMARK_IMPORTANT',
        targetType: 'MESSAGE',
        targetId: messageId,
        result: 'SUCCESS',
      });
      return true;
    }
    return false;
  }
}
