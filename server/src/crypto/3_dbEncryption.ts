/**
 * ============================================================================
 * PILAR 3A: KEAMANAN BASIS DATA (DATABASE-AT-REST FIELD ENCRYPTION)
 * ============================================================================
 * Penjelasan untuk Presentasi Dosen:
 * Seluruh kolom sensitif di tabel Database SQLite (seperti vektor biometrik wajah,
 * nomor identitas pelapor, catatan rahasia kredensial, dan ID Dongle) TIDAK
 * disimpan dalam bentuk plaintext, melainkan dienkripsi otomatis pada level
 * database menggunakan AES-256-GCM sebelum perintah INSERT/UPDATE dijalankan.
 */

import crypto from 'node:crypto';

const DB_MASTER_SECRET =
  process.env.AEGIS_DB_MASTER_KEY || 'AegisVault_Database_At_Rest_Master_Key_2026!';

function getDatabaseMasterKey(): Buffer {
  return crypto.createHash('sha256').update(DB_MASTER_SECRET).digest();
}

/**
 * Mengenkripsi nilai kolom sebelum disimpan ke tabel SQLite
 * Output format di tabel DB: "DBENC$v1$<ivHex>$<authTagHex>$<ciphertextHex>"
 */
export function encryptDatabaseColumn(plainValue: string): string {
  if (!plainValue) return '';
  if (plainValue.startsWith('DBENC$v1$')) return plainValue; // Sudah terenkripsi

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getDatabaseMasterKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(plainValue, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `DBENC$v1$${iv.toString('hex')}$${tag.toString('hex')}$${encrypted.toString('hex')}`;
}

/**
 * Mendekripsi nilai kolom yang diambil dari tabel SQLite
 */
export function decryptDatabaseColumn(encryptedColumnValue: string): string {
  if (!encryptedColumnValue) return '';
  if (!encryptedColumnValue.startsWith('DBENC$v1$')) {
    return encryptedColumnValue;
  }

  const parts = encryptedColumnValue.split('$');
  if (parts.length !== 5) {
    throw new Error('Format enkripsi kolom database tidak valid');
  }

  const [, , ivHex, tagHex, cipherHex] = parts;
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getDatabaseMasterKey(),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherHex, 'hex')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
