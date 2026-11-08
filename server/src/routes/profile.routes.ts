import crypto from 'node:crypto';
import type http from 'node:http';
import { db } from '../database/connection.ts';
import { requireSession } from '../middlewares/auth.middleware.ts';
import { sendJson, handleError } from '../middlewares/error.middleware.ts';

/**
 * Ref: DESIGN.md §4 (panel Konteks & Keamanan) — sidik jari kunci publik RSA milik pemilik sesi.
 *   GET /api/profile/key-fingerprint
 * Hanya SHA-256 dari public key (bukan rahasia); private key tidak pernah disentuh.
 */
export function keyFingerprintFor(userId: number): string | null {
  const row = db.prepare('SELECT publicKey FROM User WHERE id = ?').get(userId) as
    | { publicKey?: string }
    | undefined;
  if (!row?.publicKey) return null;
  return crypto.createHash('sha256').update(row.publicKey).digest('hex');
}

export function handleProfileRoutes(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
  method: string
): boolean {
  if (method === 'GET' && pathname === '/api/profile/key-fingerprint') {
    try {
      // touch:false → dipanggil otomatis oleh panel, tidak memperpanjang idle-timer
      const session = requireSession(req, { touch: false });
      sendJson(res, 200, { fingerprint: keyFingerprintFor(session.userId) });
    } catch (err) {
      handleError(res, err);
    }
    return true;
  }
  return false;
}