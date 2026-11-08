'use client';

import React, { useEffect, useState } from 'react';
import { SESSION_EXPIRED_EVENT } from '@/lib/api';

// Ref: FR-AUTH-07 (idle-lock), FR-AUTH-10. Server memakai satu kode (ERR_SESSION_EXPIRED)
// untuk idle-lock, TTL habis, dan logout, jadi bannernya satu.
export function SessionExpiredBanner() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onExpired = (e: Event) =>
      setMessage((e as CustomEvent<string | undefined>).detail || 'Sesi berakhir. Silakan login ulang.');
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-center gap-3 px-6 py-2.5 shrink-0 text-xs text-security-warning bg-security-warning/10 border-b border-security-warning/30"
    >
      <span className="material-symbols-outlined text-base" aria-hidden="true">lock_clock</span>
      <span className="flex-1 min-w-0">{message} Kunci di memori sesi sudah dihapus.</span>
      <button
        type="button"
        onClick={() => {
          window.location.href = '/';
        }}
        className="h-7 px-3 rounded-lg bg-primary text-white font-semibold hover:opacity-90 cursor-pointer"
      >
        Login ulang
      </button>
    </div>
  );
}