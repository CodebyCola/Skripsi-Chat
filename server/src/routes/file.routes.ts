/**
 * ============================================================================
 * ROUTE PILAR 2B: ENKRIPSI & TRANSFER FILE (ALGORITMA CHACHA20-POLY1305)
 * ============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { db, UPLOADS_DIR, appendNewBlockchainRecord } from '../db.ts';
import {
  encryptFileChaCha20,
  decryptFileChaCha20,
} from '../crypto/2_fileChaCha20.ts';
import {
  encryptDatabaseColumn,
  decryptDatabaseColumn,
} from '../crypto/3_dbEncryption.ts';

export function handleGetEncryptedFiles() {
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

export function handleUploadAndEncryptFile(body: {
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

export function handleDecryptStoredFile(body: {
  id: number;
  passphrase: string;
}) {
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
