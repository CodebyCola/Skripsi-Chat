'use client';

import React from 'react';

interface DongleLockModalProps {
  onRecheck: () => void;
  onLogout: () => void;
  checking?: boolean;
}

export function DongleLockModal({
  onRecheck,
  onLogout,
  checking = false,
}: DongleLockModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-[#121E19]/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-sage-border rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl">usb_off</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <h2 className="font-display font-bold text-base text-text-dark">
            Hardware USB Dongle Terputus
          </h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            Koneksi ke kunci perangkat fisik <span className="font-mono text-primary font-semibold">.skripsi_key</span> terputus. Sesuai protokol keamanan multi-faktor, seluruh akses brankas dan percakapan bimbingan dikunci seketika.
          </p>
        </div>

        <div className="p-3 rounded-lg bg-canvas border border-sage-border w-full text-[11px] text-text-secondary font-mono">
          Status: Port Dongle Kosong / Non-Aktif
        </div>

        <div className="flex items-center gap-3 w-full pt-1">
          <button
            type="button"
            onClick={onLogout}
            className="flex-1 h-9 rounded-lg border border-sage-border bg-surface hover:bg-canvas text-text-dark text-xs font-medium flex items-center justify-center gap-1.5 transition"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            <span>Keluar Sesi</span>
          </button>

          <button
            type="button"
            onClick={onRecheck}
            disabled={checking}
            className="flex-1 h-9 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-base ${checking ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>{checking ? 'Memeriksa...' : 'Periksa Ulang'}</span>
          </button>
        </div>

        <p className="text-[10px] text-text-muted">
          Tips Sidang: Nyalakan kembali USB Dongle melalui Server Console (:4000)
        </p>
      </div>
    </div>
  );
}
