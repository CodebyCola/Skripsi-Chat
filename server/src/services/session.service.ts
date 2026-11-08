/**
 * ============================================================================
 * MODUL SESSION: SESI LOGIN, TOKEN & KUNCI DI MEMORI (FR-AUTH-05, 07, 10)
 * ============================================================================
 * - Token acak 32 byte (hex 64 karakter), dikirim klien via `Authorization: Bearer`.
 * - Private key user & subkey percakapan HANYA disimpan di memori proses ini.
 * - Sesi berakhir karena: logout, idle > IDLE_LOCK_MINUTES, atau lewat SESSION_TTL_HOURS.
 */

import crypto from 'node:crypto';
import { IDLE_LOCK_MINUTES, SESSION_TTL_HOURS } from '../config/index.ts';
import { AppError, ErrorCodes } from '../config/errors.ts';
import type { SubKeys } from './keys.service.ts';

export interface Session {
  token: string;
  userId: number;
  username: string;
  role: string;
  dongleId: string;
  /** null untuk akun legacy yang belum punya keypair RSA */
  privateKeyPem: string | null;
  /** Cache subkey per percakapan (diturunkan lazy dari K_conv) */
  subkeysByConv: Map<number, SubKeys>;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
}

const sessions = new Map<string, Session>();

function wipe(session: Session): void {
  for (const sk of session.subkeysByConv.values()) {
    sk.k_text_vig.fill(0);
    sk.k_text_trans.fill(0);
    sk.k_text_aes.fill(0);
    sk.k_file.fill(0);
    sk.k_stego.fill(0);
  }
  session.subkeysByConv.clear();
  session.privateKeyPem = null;
}

export class SessionService {
  /** FR-AUTH-03/05: dipanggil hanya setelah dongle, password, wajah, dan unlock key sukses */
  static create(params: {
    userId: number;
    username: string;
    role: string;
    dongleId: string;
    privateKeyPem: string | null;
  }): Session {
    const now = Date.now();
    const session: Session = {
      token: crypto.randomBytes(32).toString('hex'),
      userId: params.userId,
      username: params.username,
      role: params.role,
      dongleId: params.dongleId,
      privateKeyPem: params.privateKeyPem,
      subkeysByConv: new Map(),
      createdAt: now,
      lastActivity: now,
      expiresAt: now + SESSION_TTL_HOURS * 3600_000,
    };
    sessions.set(session.token, session);
    return session;
  }

  /**
   * Ambil sesi valid. `touch: false` untuk request otomatis (polling) agar
   * tidak memperpanjang idle-timer; hanya aksi user yang dihitung aktivitas.
   */
  static get(token: string, opts: { touch?: boolean } = {}): Session {
    const session = sessions.get(token);
    if (!session) {
      throw new AppError(ErrorCodes.ERR_SESSION_EXPIRED, 'Sesi tidak valid. Silakan login ulang.', 401);
    }
    const now = Date.now();
    const idleMs = IDLE_LOCK_MINUTES * 60_000;
    if (now >= session.expiresAt || now - session.lastActivity > idleMs) {
      SessionService.destroy(token);
      throw new AppError(ErrorCodes.ERR_SESSION_EXPIRED, 'Sesi berakhir. Silakan login ulang.', 401);
    }
    if (opts.touch !== false) session.lastActivity = now;
    return session;
  }

  /** FR-AUTH-10: hapus sesi + kunci dari memori */
  static destroy(token: string): void {
    const session = sessions.get(token);
    if (!session) return;
    wipe(session);
    sessions.delete(token);
  }

  static clearAll(): void {
    for (const t of [...sessions.keys()]) SessionService.destroy(t);
  }
}
