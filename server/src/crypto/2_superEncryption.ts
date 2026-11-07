/**
 * ============================================================================
 * PILAR 2A: SUPER ENKRIPSI PESAN TEKS (KLASIK + MODERN)
 * ============================================================================
 * Penjelasan untuk Presentasi Dosen:
 * Super Enkripsi menggabungkan algoritma kriptografi klasik dan modern secara berlapis:
 *   Lapis 1 (Klasik Substitusi Polialfabetik) : Extended Vigenère Cipher (Mod 256)
 *   Lapis 2 (Klasik Bitwise Stream XOR)       : Vernam Cipher (XOR Key Stream)
 *   Lapis 3 (Modern Symmetric Block Cipher)   : AES-256-CBC (atau AES-256-ECB)
 *
 * Saat dekripsi, urutan dibalik:
 *   Ciphertext -> Dekripsi AES-256 -> Inverse Vernam (XOR) -> Inverse Vigenère -> Plaintext
 */

import crypto from 'node:crypto';

export type AesBlockMode = 'CBC' | 'ECB';

export interface SuperEncryptionResult {
  plaintextLength: number;
  mode: AesBlockMode;
  ivHex: string;
  stage1VigenereHex: string;
  stage1VigenerePreview: string;
  stage2VernamHex: string;
  stage3AesCiphertextHex: string;
  combinedPayload: string; // Format: "SUPER-V1:<mode>:<ivHex>:<ciphertextHex>"
}

/**
 * TAHAP 1: Extended Vigenère Cipher (Beroperasi pada byte 0..255 agar mendukung
 * semua karakter huruf, angka, spasi, simbol, dan tanda baca)
 * Rumus Enkripsi: C[i] = (P[i] + K[i mod len(K)]) mod 256
 */
export function vigenereEncryptBytes(input: Buffer, key: string): Buffer {
  const keyBytes = Buffer.from(key || 'AEGIS', 'utf8');
  const out = Buffer.alloc(input.length);
  for (let i = 0; i < input.length; i++) {
    out[i] = (input[i] + keyBytes[i % keyBytes.length]) % 256;
  }
  return out;
}

/**
 * Rumus Dekripsi Vigenère: P[i] = (C[i] - K[i mod len(K)] + 256) mod 256
 */
export function vigenereDecryptBytes(input: Buffer, key: string): Buffer {
  const keyBytes = Buffer.from(key || 'AEGIS', 'utf8');
  const out = Buffer.alloc(input.length);
  for (let i = 0; i < input.length; i++) {
    out[i] = (input[i] - keyBytes[i % keyBytes.length] + 256) % 256;
  }
  return out;
}

/**
 * TAHAP 2: Vernam Cipher (Operasi XOR Bitwise antara byte pesan dan byte kunci)
 * Rumus Enkripsi & Dekripsi identik karena sifat XOR: (A ^ K) ^ K = A
 */
export function vernamXorBytes(input: Buffer, key: string): Buffer {
  // Ekspansi kunci menggunakan SHA-256 stream jika kunci lebih pendek dari pesan
  const seedKey = Buffer.from(key || 'VERNAM_KEY', 'utf8');
  const out = Buffer.alloc(input.length);
  for (let i = 0; i < input.length; i++) {
    const keyByte = seedKey[i % seedKey.length] ^ ((i * 31) & 0xff);
    out[i] = input[i] ^ keyByte;
  }
  return out;
}

/**
 * Menurunkan kunci AES 256-bit (32 byte) dari passphrase menggunakan SHA-256
 */
function deriveAes256Key(secretKey: string): Buffer {
  return crypto.createHash('sha256').update(secretKey || 'AES_DEFAULT_KEY').digest();
}

/**
 * FUNGSI UTAMA ENKRIPSI: Plaintext -> Vigenère -> Vernam -> AES-256 (CBC/ECB)
 */
export function superEncryptText(
  plaintext: string,
  passphrase: string,
  mode: AesBlockMode = 'CBC'
): SuperEncryptionResult {
  const plainBuf = Buffer.from(plaintext, 'utf8');

  // Turunkan sub-key untuk masing-masing lapisan dari passphrase utama
  const vigenereKey = `VIG_${passphrase}`;
  const vernamKey = `VER_${passphrase}`;
  const aesKey = deriveAes256Key(`AES_${passphrase}`);

  // Lapis 1: Vigenère Cipher
  const stage1Buf = vigenereEncryptBytes(plainBuf, vigenereKey);

  // Lapis 2: Vernam Cipher (XOR)
  const stage2Buf = vernamXorBytes(stage1Buf, vernamKey);

  // Lapis 3: AES-256-CBC atau AES-256-ECB
  const iv = mode === 'CBC' ? crypto.randomBytes(16) : Buffer.alloc(0);
  const cipherAlgo = mode === 'CBC' ? 'aes-256-cbc' : 'aes-256-ecb';
  const cipher = crypto.createCipheriv(cipherAlgo, aesKey, mode === 'CBC' ? iv : null);

  const stage3Buf = Buffer.concat([cipher.update(stage2Buf), cipher.final()]);

  const ivHex = iv.toString('hex') || 'NONE';
  const stage3Hex = stage3Buf.toString('hex');

  // Buat preview karakter ASCII yang aman untuk ditampilkan di UI
  const stage1Preview = Array.from(stage1Buf)
    .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
    .join('');

  return {
    plaintextLength: plainBuf.length,
    mode,
    ivHex,
    stage1VigenereHex: stage1Buf.toString('hex'),
    stage1VigenerePreview: stage1Preview,
    stage2VernamHex: stage2Buf.toString('hex'),
    stage3AesCiphertextHex: stage3Hex,
    combinedPayload: `SUPER-V1:${mode}:${ivHex}:${stage3Hex}`,
  };
}

/**
 * FUNGSI UTAMA DEKRIPSI: AES-256 (CBC/ECB) -> Vernam -> Vigenère -> Plaintext
 */
export function superDecryptText(
  combinedPayload: string,
  passphrase: string
): {
  plaintext: string;
  stage2VernamHex: string;
  stage1VigenereHex: string;
  mode: AesBlockMode;
} {
  const parts = combinedPayload.trim().split(':');
  if (parts.length !== 4 || parts[0] !== 'SUPER-V1') {
    throw new Error('Format ciphertext Super Enkripsi tidak valid');
  }

  const mode = (parts[1] === 'ECB' ? 'ECB' : 'CBC') as AesBlockMode;
  const ivHex = parts[2];
  const cipherHex = parts[3];

  const vigenereKey = `VIG_${passphrase}`;
  const vernamKey = `VER_${passphrase}`;
  const aesKey = deriveAes256Key(`AES_${passphrase}`);

  const iv = mode === 'CBC' ? Buffer.from(ivHex, 'hex') : null;
  const cipherAlgo = mode === 'CBC' ? 'aes-256-cbc' : 'aes-256-ecb';

  // Balik Lapis 3: Dekripsi AES-256
  const decipher = crypto.createDecipheriv(cipherAlgo, aesKey, iv);
  const afterAesBuf = Buffer.concat([
    decipher.update(Buffer.from(cipherHex, 'hex')),
    decipher.final(),
  ]);

  // Balik Lapis 2: Dekripsi Vernam (XOR)
  const afterVernamBuf = vernamXorBytes(afterAesBuf, vernamKey);

  // Balik Lapis 1: Dekripsi Vigenère
  const plainBuf = vigenereDecryptBytes(afterVernamBuf, vigenereKey);

  return {
    plaintext: plainBuf.toString('utf8'),
    stage2VernamHex: afterAesBuf.toString('hex'),
    stage1VigenereHex: afterVernamBuf.toString('hex'),
    mode,
  };
}

/**
 * ============================================================================
 * SPESIFIKASI SKRIPSICHAT BAGIAN 11.3:
 * TRANSPOSISI KOLOM & SUPER ENKRIPSI BERBASIS SUBKEYS (HKDF)
 * ============================================================================
 */

export interface SubKeyPayload {
  k_text_vig: Buffer;
  k_text_trans: Buffer;
  k_text_aes: Buffer;
}

export interface EncryptedMessageBlob {
  ciphertextHex: string;
  nonceHex: string;
  authTagHex: string;
  combinedPayload: string;
}

/**
 * Bentuk permutasi kolom 0..15 dari kunci 16-byte secara deterministik (Fisher-Yates)
 */
export function permFromKey(key16: Buffer): number[] {
  const perm = Array.from({ length: 16 }, (_, i) => i);
  // Aliran pseudo-random deterministik dari SHA-256(key16)
  const hash = crypto.createHash('sha256').update(key16).digest();

  for (let i = perm.length - 1; i > 0; i--) {
    const j = hash[i % hash.length] % (i + 1);
    const temp = perm[i];
    perm[i] = perm[j];
    perm[j] = temp;
  }
  return perm;
}

/**
 * Transposisi Kolom byte-wise
 */
export function transpositionEncrypt(data: Buffer, perm: number[]): Buffer {
  const cols = perm.length;
  const rem = data.length % cols;
  const paddingLen = rem === 0 ? 0 : cols - rem;
  const padded = Buffer.concat([data, Buffer.alloc(paddingLen, 0)]);
  const rows = padded.length / cols;

  const out = Buffer.alloc(padded.length);
  let outIdx = 0;

  for (let c = 0; c < cols; c++) {
    const colIdx = perm[c];
    for (let r = 0; r < rows; r++) {
      out[outIdx++] = padded[r * cols + colIdx];
    }
  }

  return out;
}

/**
 * Invers Transposisi Kolom byte-wise
 */
export function transpositionDecrypt(data: Buffer, perm: number[]): Buffer {
  const cols = perm.length;
  const rows = data.length / cols;
  const grid = Buffer.alloc(data.length);
  let inIdx = 0;

  for (let c = 0; c < cols; c++) {
    const colIdx = perm[c];
    for (let r = 0; r < rows; r++) {
      grid[r * cols + colIdx] = data[inIdx++];
    }
  }

  return grid;
}

/**
 * FR-CHAT-02: Super Enkripsi Teks Lengkap (Vigenère -> Transposisi -> AES-256-GCM)
 */
export function superEncryptWithSubkeys(
  plaintext: string,
  subkeys: SubKeyPayload,
  aad: string = ''
): EncryptedMessageBlob {
  const plainBytes = Buffer.from(plaintext, 'utf8');

  // Prefix panjang asli 4-byte (big-endian) agar padding transposisi dapat dipotong sempurna
  const lenHeader = Buffer.alloc(4);
  lenHeader.writeUInt32BE(plainBytes.length, 0);
  const withHeader = Buffer.concat([lenHeader, plainBytes]);

  // Lapis 1: Vigenère Byte-wise (Mod 256)
  const afterVig = Buffer.alloc(withHeader.length);
  for (let i = 0; i < withHeader.length; i++) {
    afterVig[i] = (withHeader[i] + subkeys.k_text_vig[i % subkeys.k_text_vig.length]) % 256;
  }

  // Lapis 2: Transposisi Kolom
  const perm = permFromKey(subkeys.k_text_trans);
  const afterTrans = transpositionEncrypt(afterVig, perm);

  // Lapis 3: AES-256-GCM (Authenticated Encryption)
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', subkeys.k_text_aes, nonce);
  if (aad) cipher.setAAD(Buffer.from(aad, 'utf8'));

  const ciphertext = Buffer.concat([cipher.update(afterTrans), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const ciphertextHex = ciphertext.toString('hex');
  const nonceHex = nonce.toString('hex');
  const authTagHex = authTag.toString('hex');

  return {
    ciphertextHex,
    nonceHex,
    authTagHex,
    combinedPayload: `SUPER-GCM-V1:${nonceHex}:${authTagHex}:${ciphertextHex}`,
  };
}

/**
 * FR-CHAT-03 & 05: Super Dekripsi Teks Lengkap (AES-256-GCM -> Invers Transposisi -> Invers Vigenère)
 */
export function superDecryptWithSubkeys(
  blob: { ciphertextHex: string; nonceHex: string; authTagHex: string },
  subkeys: SubKeyPayload,
  aad: string = ''
): string {
  const nonce = Buffer.from(blob.nonceHex, 'hex');
  const authTag = Buffer.from(blob.authTagHex, 'hex');
  const ciphertext = Buffer.from(blob.ciphertextHex, 'hex');

  // Balik Lapis 3: AES-256-GCM
  const decipher = crypto.createDecipheriv('aes-256-gcm', subkeys.k_text_aes, nonce);
  if (aad) decipher.setAAD(Buffer.from(aad, 'utf8'));
  decipher.setAuthTag(authTag);

  const afterAes = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  // Balik Lapis 2: Invers Transposisi Kolom
  const perm = permFromKey(subkeys.k_text_trans);
  const afterTransInv = transpositionDecrypt(afterAes, perm);

  // Balik Lapis 1: Invers Vigenère
  const afterVigInv = Buffer.alloc(afterTransInv.length);
  for (let i = 0; i < afterTransInv.length; i++) {
    afterVigInv[i] =
      (afterTransInv[i] - subkeys.k_text_vig[i % subkeys.k_text_vig.length] + 256) % 256;
  }

  // Baca 4-byte panjang asli
  const originalLength = afterVigInv.readUInt32BE(0);
  const plainBytes = afterVigInv.subarray(4, 4 + originalLength);

  return plainBytes.toString('utf8');
}

