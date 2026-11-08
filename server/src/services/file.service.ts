import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { db, appendNewBlockchainRecord } from '../database/connection.ts';
import { UPLOADS_DIR, MAX_FILE_MB, ALLOWED_FILE_EXT } from '../config/index.ts';
import { AppError, ErrorCodes } from '../config/errors.ts';
import {
  encryptFileChaCha20,
  decryptFileChaCha20,
  encryptFileChaCha20WithKey,
  decryptFileChaCha20WithKey,
} from '../crypto/2_fileChaCha20.ts';
import {
  encryptDatabaseColumn,
  decryptDatabaseColumn,
} from '../crypto/3_dbEncryption.ts';
import { AuditService } from './audit.service.ts';
import { ChatService } from './chat.service.ts';
import type { Session } from './session.service.ts';

// Ref: FR-FILE-01 — magic bytes: %PDF untuk PDF, PK\x03\x04 (ZIP) untuk DOCX
const MAGIC: Record<string, Buffer> = {
  pdf: Buffer.from('%PDF', 'utf8'),
  docx: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
};
// MIME ditentukan server dari ekstensi tervalidasi, bukan dari klien
const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
const REVIEW_STATUSES = ['REVISION', 'APPROVED'] as const;
const MAX_NOTE_CHARS = 1000;

interface FileRow {
  id: number;
  convId: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storedFileName: string;
  originalSha256: string;
  uploaderEncrypted: string;
  version: number;
  status: string;
  reviewedBy: string;
  reviewNote: string;
  reviewedAt: string;
  createdAt: string;
}

/** Ref: FR-FILE-02 — AAD mengikat ciphertext ke percakapan */
const fileAad = (convId: number) => `skripsichat-file|conv:${convId}`;

function asId(value: unknown, label: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppError(ErrorCodes.ERR_AUTH_INVALID, `${label} tidak valid`, 400);
  }
  return n;
}

/** Buang path & karakter berbahaya; sisakan 120 karakter terakhir agar ekstensi tetap ada */
function sanitizeFileName(raw: unknown): string {
  const base = String(raw ?? '').split(/[\\/]/).pop() ?? '';
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '').slice(-120);
}

export class FileService {
  static getEncryptedFiles() {
    const rows = db
      .prepare('SELECT * FROM EncryptedFile ORDER BY id DESC')
      .all() as Array<{
      id: number;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
      storedFileName: string;
      nonceHex: string;
      authTagHex: string;
      originalSha256: string;
      uploaderEncrypted: string;
      createdAt: string;
    }>;

    return rows.map((r) => {
      const filePath = path.join(UPLOADS_DIR, r.storedFileName);
      let cipherPreviewHex = '';
      if (fs.existsSync(filePath)) {
        const buf = fs.readFileSync(filePath);
        cipherPreviewHex = buf.subarray(0, Math.min(48, buf.length)).toString('hex');
      }

      return {
        id: r.id,
        originalName: r.originalName,
        mimeType: r.mimeType,
        sizeBytes: r.sizeBytes,
        storedFileName: r.storedFileName,
        nonceHex: r.nonceHex,
        authTagHex: r.authTagHex,
        originalSha256: r.originalSha256,
        uploader: decryptDatabaseColumn(r.uploaderEncrypted),
        uploaderRawEncryptedInDb: r.uploaderEncrypted,
        cipherPreviewHex,
        createdAt: r.createdAt,
      };
    });
  }

  static uploadAndEncryptFile(body: {
    originalName: string;
    mimeType?: string;
    fileBase64: string;
    passphrase: string;
    uploader?: string;
  }) {
    const originalName = (body.originalName || 'dokumen_bukti.bin').replace(
      /[^a-zA-Z0-9._-]/g,
      '_'
    );
    const mimeType = body.mimeType || 'application/octet-stream';
    const passphrase = body.passphrase || '';
    const uploader = body.uploader || 'editor_aegis';

    if (!body.fileBase64 || !passphrase) {
      throw new Error('File dan Kunci Enkripsi ChaCha20 wajib diisi');
    }

    const cleanBase64 = body.fileBase64.includes(',')
      ? body.fileBase64.split(',')[1]
      : body.fileBase64;
    const rawBuffer = Buffer.from(cleanBase64, 'base64');

    const encrypted = encryptFileChaCha20(rawBuffer, passphrase);
    const storedFileName = `${Date.now()}_${originalName}.enc`;
    const filePath = path.join(UPLOADS_DIR, storedFileName);
    fs.writeFileSync(filePath, encrypted.encryptedBuffer);

    const info = db
      .prepare(`
        INSERT INTO EncryptedFile (
          originalName, mimeType, sizeBytes, storedFileName,
          nonceHex, authTagHex, originalSha256, uploaderEncrypted, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        originalName,
        mimeType,
        rawBuffer.length,
        storedFileName,
        encrypted.nonceHex,
        encrypted.authTagHex,
        encrypted.originalSha256,
        encryptDatabaseColumn(uploader),
        new Date().toISOString()
      );

    // Catat ke Blockchain Audit Ledger
    appendNewBlockchainRecord({
      actionType: 'CHACHA20_FILE_VAULT',
      actor: uploader,
      assetTitle: originalName,
      assetData: encrypted.encryptedBuffer,
    });

    return {
      id: Number(info.lastInsertRowid),
      originalName,
      storedFileName,
      algorithm: 'ChaCha20-Poly1305 (256-bit Key, 96-bit Nonce, 128-bit MAC)',
      nonceHex: encrypted.nonceHex,
      authTagHex: encrypted.authTagHex,
      originalSha256: encrypted.originalSha256,
      encryptedSizeBytes: encrypted.encryptedBuffer.length,
    };
  }

  static decryptStoredFile(body: { id: number; passphrase: string }) {
    const row = db
      .prepare('SELECT * FROM EncryptedFile WHERE id = ?')
      .get(body.id) as
      | {
          id: number;
          originalName: string;
          mimeType: string;
          storedFileName: string;
          originalSha256: string;
        }
      | undefined;

    if (!row) {
      throw new Error('Data file tidak ditemukan di database');
    }

    const filePath = path.join(UPLOADS_DIR, row.storedFileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File terenkripsi '${row.storedFileName}' tidak ditemukan di disk`);
    }

    const encryptedBuffer = fs.readFileSync(filePath);

    try {
      const decrypted = decryptFileChaCha20(encryptedBuffer, body.passphrase);
      const isTextPreviewable =
        row.mimeType.startsWith('text/') ||
        row.originalName.endsWith('.txt') ||
        row.originalName.endsWith('.json') ||
        row.originalName.endsWith('.md') ||
        row.originalName.endsWith('.csv');

      return {
        success: true,
        originalName: row.originalName,
        mimeType: row.mimeType,
        decryptedBase64: decrypted.decryptedBuffer.toString('base64'),
        textPreview: isTextPreviewable
          ? decrypted.decryptedBuffer.toString('utf8').slice(0, 2000)
          : null,
        sha256Verified: decrypted.decryptedSha256 === row.originalSha256,
        decryptedSha256: decrypted.decryptedSha256,
      };
    } catch {
      throw new Error(
        'Dekripsi ChaCha20-Poly1305 Gagal! Kunci salah atau AuthTag Poly1305 mendeteksi perubahan byte pada file.'
      );
    }
  }

  /**
   * FR-FILE-05: Dosen mengubah status review draf skripsi (SUBMITTED, REVISION, APPROVED)
   */
  static reviewFile(params: {
    fileId: number;
    status: 'SUBMITTED' | 'REVISION' | 'APPROVED';
    reviewNote?: string;
    reviewer: string;
  }) {
    const nowIso = new Date().toISOString();
    const res = db
      .prepare(`
        UPDATE EncryptedFile
        SET status = ?,
            reviewedBy = ?,
            reviewNote = ?,
            reviewedAt = ?
        WHERE id = ?
      `)
      .run(
        params.status,
        params.reviewer,
        params.reviewNote || '',
        nowIso,
        params.fileId
      );

    if (res.changes === 0) {
      throw new Error(`File ID #${params.fileId} tidak ditemukan`);
    }

    return {
      success: true,
      fileId: params.fileId,
      status: params.status,
      reviewer: params.reviewer,
      reviewedAt: nowIso,
    };
  }

  // ==========================================================================
  // LAPISAN BERBASIS SESI (FR-AUTH-08, FR-FILE-01..05)
  // Identitas, percakapan & kunci berasal dari sesi server, bukan dari body klien.
  // ==========================================================================

  /** Ambil baris file lalu pastikan pemilik sesi peserta percakapannya (403 sama untuk "tidak ada") */
  private static loadFileFor(session: Session, fileId: number) {
    const row = db.prepare('SELECT * FROM EncryptedFile WHERE id = ?').get(fileId) as
      | FileRow
      | undefined;
    if (!row) {
      throw new AppError(
        ErrorCodes.ERR_NOT_PARTICIPANT,
        'Berkas tidak ditemukan atau Anda bukan peserta percakapan ini',
        403
      );
    }
    const conv = ChatService.requireParticipant(session, row.convId);
    return { row, conv };
  }

  /** FR-FILE-05 (UA-MHS-08): daftar berkas, versi & status review pada satu percakapan */
  static listFilesFor(session: Session, convIdRaw: unknown) {
    const convId = asId(convIdRaw, 'convId');
    ChatService.requireParticipant(session, convId);

    const rows = db
      .prepare('SELECT * FROM EncryptedFile WHERE convId = ? ORDER BY id DESC')
      .all(convId) as unknown as FileRow[];

    return rows.map((r) => ({
      id: r.id,
      convId: r.convId,
      originalName: r.originalName,
      mimeType: r.mimeType,
      sizeBytes: r.sizeBytes,
      originalSha256: r.originalSha256,
      uploader: decryptDatabaseColumn(r.uploaderEncrypted),
      version: r.version,
      status: r.status,
      reviewedBy: r.reviewedBy,
      reviewNote: r.reviewNote,
      reviewedAt: r.reviewedAt,
      createdAt: r.createdAt,
    }));
  }

  /**
   * FR-FILE-01..03, 06: unggah PDF/DOCX → validasi ukuran, ekstensi & magic bytes →
   * enkripsi ChaCha20-Poly1305 dengan k_file percakapan → versi naik bila nama sama.
   */
  static uploadFileAs(
    session: Session,
    params: { convId: unknown; originalName: unknown; fileBase64: unknown }
  ) {
    const convId = asId(params.convId, 'convId');
    const conv = ChatService.requireParticipant(session, convId);

    const originalName = sanitizeFileName(params.originalName);
    const ext = originalName.includes('.') ? originalName.split('.').pop()!.toLowerCase() : '';
    if (!ALLOWED_FILE_EXT.includes(ext)) {
      throw new AppError(
        ErrorCodes.ERR_FILE_TYPE,
        'Hanya berkas PDF atau DOCX yang diperbolehkan',
        415
      );
    }

    const maxBytes = MAX_FILE_MB * 1024 * 1024;
    const tooLarge = () =>
      new AppError(
        ErrorCodes.ERR_FILE_TOO_LARGE,
        `Ukuran berkas melebihi batas ${MAX_FILE_MB} MB`,
        413
      );
    const b64 = String(params.fileBase64 ?? '');
    const cleanB64 = b64.includes(',') ? b64.slice(b64.indexOf(',') + 1) : b64;
    // Perkiraan ukuran sebelum decode, supaya buffer raksasa tidak dialokasikan
    if (cleanB64.length * 0.75 > maxBytes + 4) throw tooLarge();

    const raw = Buffer.from(cleanB64, 'base64');
    if (raw.length === 0) {
      throw new AppError(ErrorCodes.ERR_FILE_TYPE, 'Berkas kosong', 400);
    }
    if (raw.length > maxBytes) throw tooLarge();
    if (!raw.subarray(0, MAGIC[ext].length).equals(MAGIC[ext])) {
      throw new AppError(
        ErrorCodes.ERR_FILE_TYPE,
        'Isi berkas tidak sesuai ekstensinya (magic bytes tidak cocok)',
        415
      );
    }

    const subkeys = ChatService.subkeysFor(session, conv);
    const encrypted = encryptFileChaCha20WithKey(raw, subkeys.k_file, fileAad(convId));
    const storedFileName = `${crypto.randomUUID()}.enc`;
    const filePath = path.join(UPLOADS_DIR, storedFileName);
    fs.writeFileSync(filePath, encrypted.encryptedBuffer);

    const nowIso = new Date().toISOString();
    let id: number;
    let version: number;
    try {
      // FR-FILE-03: nama sama pada percakapan yang sama → versi berikutnya
      const next = db
        .prepare(
          'SELECT COALESCE(MAX(version), 0) + 1 AS v FROM EncryptedFile WHERE convId = ? AND originalName = ?'
        )
        .get(convId, originalName) as { v: number };
      version = next.v;
      const info = db
        .prepare(`
          INSERT INTO EncryptedFile (
            convId, originalName, mimeType, sizeBytes, storedFileName,
            nonceHex, authTagHex, originalSha256, uploaderEncrypted,
            version, status, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?)
        `)
        .run(
          convId,
          originalName,
          MIME[ext],
          raw.length,
          storedFileName,
          encrypted.nonceHex,
          encrypted.authTagHex,
          encrypted.originalSha256,
          encryptDatabaseColumn(session.username),
          version,
          nowIso
        );
      id = Number(info.lastInsertRowid);
    } catch (err) {
      fs.rmSync(filePath, { force: true }); // jangan tinggalkan file yatim
      throw err;
    }

    AuditService.log({
      actorId: session.username,
      action: 'UPLOAD_FILE',
      targetType: 'FILE',
      targetId: id,
      result: 'SUCCESS',
      detail: `${originalName} v${version}`,
    });

    // FR-FILE-06: hash draf mahasiswa dicatat ke blockchain; kegagalan tidak menggagalkan upload
    if (session.role === 'MAHASISWA') {
      try {
        appendNewBlockchainRecord({
          actionType: 'DRAFT_SUBMISSION',
          actor: session.username,
          assetTitle: `${originalName} v${version}`,
          assetData: raw,
        });
      } catch {
        /* best-effort */
      }
    }

    return {
      id,
      convId,
      originalName,
      version,
      status: 'SUBMITTED',
      sizeBytes: raw.length,
      originalSha256: encrypted.originalSha256,
      algorithm: 'ChaCha20-Poly1305 (k_file, AAD = percakapan)',
    };
  }

  /**
   * FR-FILE-04: dekripsi + bandingkan SHA-256. Tag tidak valid atau hash berbeda →
   * ditolak dan TIDAK ada data berkas yang dikembalikan.
   */
  static downloadFileAs(session: Session, fileIdRaw: unknown) {
    const fileId = asId(fileIdRaw, 'fileId');
    const { row, conv } = FileService.loadFileFor(session, fileId);
    const reject = (code: string, message: string, status: number) => {
      AuditService.log({
        actorId: session.username,
        action: 'DOWNLOAD_FILE',
        targetType: 'FILE',
        targetId: fileId,
        result: 'FAILURE',
        detail: code,
      });
      return new AppError(code, message, status);
    };

    const filePath = path.join(UPLOADS_DIR, row.storedFileName);
    if (!fs.existsSync(filePath)) {
      throw reject(
        ErrorCodes.ERR_INTEGRITY_FAILED,
        'Berkas terenkripsi hilang dari penyimpanan server',
        409
      );
    }

    const subkeys = ChatService.subkeysFor(session, conv);
    let decrypted: { decryptedBuffer: Buffer; decryptedSha256: string };
    try {
      decrypted = decryptFileChaCha20WithKey(
        fs.readFileSync(filePath),
        subkeys.k_file,
        fileAad(row.convId)
      );
    } catch {
      throw reject(
        ErrorCodes.ERR_DECRYPT_FAILED,
        'Dekripsi ditolak: tag Poly1305 tidak valid, berkas terenkripsi telah diubah atau kunci tidak cocok',
        422
      );
    }
    if (decrypted.decryptedSha256 !== row.originalSha256) {
      throw reject(
        ErrorCodes.ERR_INTEGRITY_FAILED,
        'SHA-256 hasil dekripsi tidak cocok dengan catatan; unduhan ditolak',
        409
      );
    }

    AuditService.log({
      actorId: session.username,
      action: 'DOWNLOAD_FILE',
      targetType: 'FILE',
      targetId: fileId,
      result: 'SUCCESS',
      detail: `${row.originalName} v${row.version}`,
    });

    return {
      originalName: row.originalName,
      mimeType: row.mimeType,
      version: row.version,
      sha256Verified: true,
      decryptedSha256: decrypted.decryptedSha256,
      decryptedBase64: decrypted.decryptedBuffer.toString('base64'),
    };
  }

  /** FR-FILE-05: hanya dosen peserta percakapan; status REVISION / APPROVED dengan catatan */
  static reviewFileAs(
    session: Session,
    params: { fileId: unknown; status: unknown; note?: unknown }
  ) {
    if (session.role !== 'DOSEN_PEMBIMBING') {
      throw new AppError(
        ErrorCodes.ERR_FORBIDDEN,
        'Hanya dosen pembimbing yang dapat mereview berkas',
        403
      );
    }
    const fileId = asId(params.fileId, 'fileId');
    const { row } = FileService.loadFileFor(session, fileId);

    const status = String(params.status ?? '') as (typeof REVIEW_STATUSES)[number];
    if (!REVIEW_STATUSES.includes(status)) {
      throw new AppError(
        ErrorCodes.ERR_AUTH_INVALID,
        'Status review harus REVISION atau APPROVED',
        400
      );
    }
    const note = String(params.note ?? '').trim();
    if (note.length > MAX_NOTE_CHARS) {
      throw new AppError(
        ErrorCodes.ERR_AUTH_INVALID,
        `Catatan review maksimal ${MAX_NOTE_CHARS} karakter`,
        400
      );
    }
    if (status === 'REVISION' && !note) {
      throw new AppError(
        ErrorCodes.ERR_AUTH_INVALID,
        'Catatan wajib diisi untuk status REVISION',
        400
      );
    }

    const result = FileService.reviewFile({
      fileId,
      status,
      reviewNote: note,
      reviewer: session.username,
    });
    AuditService.log({
      actorId: session.username,
      action: 'REVIEW_FILE',
      targetType: 'FILE',
      targetId: fileId,
      result: 'SUCCESS',
      detail: `${row.originalName} v${row.version}: ${status}`,
    });
    return { ...result, reviewNote: note };
  }
}