/**
 * ============================================================================
 * MODUL AUDIT: PENCATATAN AUDIT TRAIL IMMUTABLE (FR-AUD-01 & FR-ADM-04)
 * ============================================================================
 * 1. Setiap aksi penting (Login, Upload, Terbitkan Aset, Enkripsi, Review)
 *    dicatat ke tabel AuditLog.
 * 2. Detail log TIDAK PERNAH memuat plaintext, password, atau kunci privat.
 * 3. Append-only: Tidak menyediakan aksi UPDATE atau DELETE.
 */

import { db } from '../database/connection.ts';

export interface AuditLogRecord {
  id: number;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  result: 'SUCCESS' | 'FAILURE' | string;
  detail: string;
  createdAt: string;
}

export class AuditService {
  /**
   * FR-AUD-01: Mencatat entri audit log secara aman
   */
  static log(params: {
    actorId: string;
    action: string;
    targetType: string;
    targetId: string | number;
    result: 'SUCCESS' | 'FAILURE' | string;
    detail?: string;
  }): void {
    try {
      const nowIso = new Date().toISOString();
      db.prepare(`
        INSERT INTO AuditLog (
          actorId, action, targetType, targetId, result, detail, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        params.actorId || 'SYSTEM',
        params.action,
        params.targetType,
        String(params.targetId),
        params.result,
        params.detail || '',
        nowIso
      );
    } catch (err: any) {
      // Sesuai FR-AUD-01: Kegagalan audit log tidak boleh menggagalkan operasi utama
      console.error('[AUDIT_LOG_ERROR]', err?.message);
    }
  }

  /**
   * FR-ADM-04: Mengambil daftar audit log (dipaginasi)
   */
  static listLogs(limit: number = 50, offset: number = 0): AuditLogRecord[] {
    return db
      .prepare('SELECT * FROM AuditLog ORDER BY id DESC LIMIT ? OFFSET ?')
      .all(limit, offset) as unknown as AuditLogRecord[];
  }
}
