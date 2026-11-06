/**
 * ============================================================================
 * PILAR 1A: OTENTIKASI PASSWORD (HASHING + SALT) & VERIFIKASI BIOMETRIK WAJAH
 * ============================================================================
 * Penjelasan untuk Presentasi Dosen:
 * 1. Password TIDAK disimpan secara plaintext di database, melainkan di-hash
 *    menggunakan algoritma KDF (Key Derivation Function) Scrypt + Random Salt 16-byte.
 * 2. Biometrik Wajah dari Webcam menghasilkan array vektor fitur wajah (128 float).
 *    Saat login, sistem menghitung jarak Euclidean (Euclidean Distance) antara
 *    wajah di kamera dengan data wajah saat registrasi.
 */

import crypto from 'node:crypto';

export interface PasswordHashResult {
  salt: string;
  hash: string;
  combined: string; // Format: "scrypt$<salt_hex>$<hash_hex>"
}

/**
 * Membuat hash password dengan salt acak 16-byte menggunakan Scrypt
 */
export function hashPasswordWithSalt(password: string, customSaltHex?: string): PasswordHashResult {
  const saltBuffer = customSaltHex
    ? Buffer.from(customSaltHex, 'hex')
    : crypto.randomBytes(16);

  // Scrypt: N=16384, r=8, p=1, panjang output = 64 byte (512-bit)
  const derivedKey = crypto.scryptSync(password, saltBuffer, 64);

  const salt = saltBuffer.toString('hex');
  const hash = derivedKey.toString('hex');

  return {
    salt,
    hash,
    combined: `scrypt$${salt}$${hash}`,
  };
}

/**
 * Memverifikasi password terhadap hash yang tersimpan dengan timingSafeEqual
 * (mencegah Timing Attack)
 */
export function verifyPasswordWithSalt(password: string, storedCombined: string): boolean {
  const parts = storedCombined.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }

  const [, saltHex, storedHashHex] = parts;
  const candidate = hashPasswordWithSalt(password, saltHex);

  const storedBuf = Buffer.from(storedHashHex, 'hex');
  const candidateBuf = Buffer.from(candidate.hash, 'hex');

  if (storedBuf.length !== candidateBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedBuf, candidateBuf);
}

/**
 * Menghitung Euclidean Distance antara 2 vektor fitur wajah (Biometrik Webcam)
 * Rumus: d = sqrt( sum( (a[i] - b[i])^2 ) )
 */
export function verifyBiometricFace(
  registeredDescriptor: number[],
  loginDescriptor: number[],
  threshold: number = 0.45
): { matched: boolean; distance: number; similarityPercent: number } {
  if (
    !registeredDescriptor.length ||
    !loginDescriptor.length ||
    registeredDescriptor.length !== loginDescriptor.length
  ) {
    return { matched: false, distance: 999, similarityPercent: 0 };
  }

  let sumSquares = 0;
  for (let i = 0; i < registeredDescriptor.length; i++) {
    const diff = registeredDescriptor[i] - loginDescriptor[i];
    sumSquares += diff * diff;
  }

  const distance = Math.sqrt(sumSquares);
  // Konversi jarak Euclidean ke persentase kemiripan (0.0 distance = 100%)
  const similarityPercent = Math.max(0, Math.min(100, Math.round((1 - distance / 0.9) * 100)));

  return {
    matched: distance <= threshold,
    distance: Number(distance.toFixed(4)),
    similarityPercent,
  };
}
