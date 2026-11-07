/**
 * ============================================================================
 * KODE ERROR RESMI SKRIPSICHAT (Berdasarkan Spesifikasi Bagian 13)
 * ============================================================================
 */

export const ErrorCodes = {
  ERR_DONGLE_NOT_FOUND: 'ERR_DONGLE_NOT_FOUND',
  ERR_DONGLE_MISMATCH: 'ERR_DONGLE_MISMATCH',
  ERR_AUTH_INVALID: 'ERR_AUTH_INVALID',
  ERR_ACCOUNT_LOCKED: 'ERR_ACCOUNT_LOCKED',
  ERR_FACE_MISMATCH: 'ERR_FACE_MISMATCH',
  ERR_KEY_UNLOCK_FAILED: 'ERR_KEY_UNLOCK_FAILED',
  ERR_SESSION_EXPIRED: 'ERR_SESSION_EXPIRED',
  ERR_FORBIDDEN: 'ERR_FORBIDDEN',
  ERR_NOT_PARTICIPANT: 'ERR_NOT_PARTICIPANT',
  ERR_CONFIG_MISSING: 'ERR_CONFIG_MISSING',
  ERR_DECRYPT_FAILED: 'ERR_DECRYPT_FAILED',
  ERR_INTEGRITY_FAILED: 'ERR_INTEGRITY_FAILED',
  ERR_FILE_TOO_LARGE: 'ERR_FILE_TOO_LARGE',
  ERR_FILE_TYPE: 'ERR_FILE_TYPE',
  ERR_STEGO_CAPACITY: 'ERR_STEGO_CAPACITY',
  ERR_STEGO_NO_PAYLOAD: 'ERR_STEGO_NO_PAYLOAD',
  ERR_CHAIN_INVALID: 'ERR_CHAIN_INVALID',
  ERR_SIGNATURE_INVALID: 'ERR_SIGNATURE_INVALID',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class AppError extends Error {
  public readonly code: ErrorCode | string;
  public readonly statusCode: number;

  constructor(code: ErrorCode | string, message: string, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
