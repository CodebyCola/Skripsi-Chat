import type http from 'node:http';
import { AppError, ErrorCodes } from '../config/errors.ts';
import { SessionService, type Session } from '../services/session.service.ts';

/** Ambil token dari header `Authorization: Bearer <64 hex>` */
export function extractToken(req: http.IncomingMessage): string {
  const header = req.headers['authorization'] || '';
  const match = /^Bearer\s+([0-9a-f]{64})$/i.exec(header);
  if (!match) {
    throw new AppError(ErrorCodes.ERR_SESSION_EXPIRED, 'Belum login. Silakan login terlebih dahulu.', 401);
  }
  return match[1].toLowerCase();
}

/** Ref: FR-AUTH-08 — wajib sesi valid; `touch:false` untuk polling */
export function requireSession(req: http.IncomingMessage, opts: { touch?: boolean } = {}): Session {
  return SessionService.get(extractToken(req), opts);
}
