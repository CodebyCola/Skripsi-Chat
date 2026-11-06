/**
 * ============================================================================
 * PILAR 2B: ENKRIPSI & TRANSFER FILE (ALGORITMA CHACHA20-POLY1305)
 * ============================================================================
 * Penjelasan untuk Presentasi Dosen:
 * Sesuai spesifikasi tugas, enkripsi berkas (file) WAJIB menggunakan algoritma
 * yang berbeda dari enkripsi pesan teks (AES).
 * Di sini digunakan ChaCha20-Poly1305 (RFC 8439):
 *   - ChaCha20 : Stream Cipher berkecepatan tinggi berbasis operasi ARX
 *                (Add-Rotate-XOR) dengan kunci 256-bit dan Nonce 96-bit (12 byte).
 *   - Poly1305 : Message Authentication Code (MAC) 128-bit (16 byte) untuk
 *                menjamin keutuhan file saat ditransfer/disimpan.
 */

import crypto from 'node:crypto';

export interface EncryptedFileResult {
  nonceHex: string;
  authTagHex: string;
  originalSha256: string;
  encryptedBuffer: Buffer;
}

function deriveChaChaKey(passphrase: string): Buffer {
  // Menghasilkan kunci 32-byte (256-bit) khusus ChaCha20
  return crypto
    .createHash('sha256')
    .update(`CHACHA20_FILE_KEY::${passphrase}`)
    .digest();
}

/**
 * Mengenkripsi Buffer file menggunakan ChaCha20-Poly1305
 * Format file `.enc`: [12-byte Nonce][16-byte AuthTag][Ciphertext Bytes...]
 */
export function encryptFileChaCha20(
  fileBuffer: Buffer,
  passphrase: string
): EncryptedFileResult {
  const key = deriveChaChaKey(passphrase);
  const nonce = crypto.randomBytes(12); // ChaCha20-Poly1305 wajib Nonce 12 byte (96-bit)

  const originalSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  const cipher = crypto.createCipheriv('chacha20-poly1305', key, nonce, {
    authTagLength: 16,
  });

  const ciphertext = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Gabungkan Nonce (12B) + AuthTag (16B) + Ciphertext ke dalam 1 file biner .enc
  const packedBuffer = Buffer.concat([nonce, authTag, ciphertext]);

  return {
    nonceHex: nonce.toString('hex'),
    authTagHex: authTag.toString('hex'),
    originalSha256,
    encryptedBuffer: packedBuffer,
  };
}

/**
 * Mendekripsi Buffer file `.enc` yang terenkripsi ChaCha20-Poly1305
 */
export function decryptFileChaCha20(
  packedEncryptedBuffer: Buffer,
  passphrase: string
): {
  decryptedBuffer: Buffer;
  decryptedSha256: string;
} {
  if (packedEncryptedBuffer.length < 28) {
    throw new Error('File terenkripsi terlalu pendek / rusak');
  }

  const key = deriveChaChaKey(passphrase);
  const nonce = packedEncryptedBuffer.subarray(0, 12);
  const authTag = packedEncryptedBuffer.subarray(12, 28);
  const ciphertext = packedEncryptedBuffer.subarray(28);

  const decipher = crypto.createDecipheriv('chacha20-poly1305', key, nonce, {
    authTagLength: 16,
  });
  decipher.setAuthTag(authTag);

  const decryptedBuffer = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const decryptedSha256 = crypto
    .createHash('sha256')
    .update(decryptedBuffer)
    .digest('hex');

  return {
    decryptedBuffer,
    decryptedSha256,
  };
}
