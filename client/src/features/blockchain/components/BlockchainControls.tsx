'use client';

import React from 'react';

interface BlockchainControlsProps {
  loading: boolean;
  onVerify: () => void;
  onTamper: () => void;
  onRestore: () => void;
}

export function BlockchainControls({
  loading,
  onVerify,
  onTamper,
  onRestore,
}: BlockchainControlsProps) {
  return (
    <div className="p-4 rounded-xl bg-surface border border-sage-border shadow-xs flex flex-wrap items-center justify-between gap-3 mb-6">
      <div className="flex flex-col gap-0.5">
        <h3 className="font-semibold text-xs text-text-dark">
          Simulasi Pengujian Sidang (Proof-of-Work &amp; Tamper Resistance)
        </h3>
        <p className="text-[11px] text-text-secondary">
          Uji ketahanan blockchain terhadap serangan manipulasi langsung pada baris data SQLite.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onVerify}
          disabled={loading}
          className="h-8 px-3 rounded-lg border border-sage-border bg-canvas hover:bg-surface text-text-dark text-xs font-medium flex items-center gap-1.5 transition"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          <span>Validasi Ulang</span>
        </button>

        <button
          type="button"
          onClick={onTamper}
          disabled={loading}
          className="h-8 px-3 rounded-lg border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 text-xs font-medium flex items-center gap-1.5 transition"
        >
          <span className="material-symbols-outlined text-sm">edit_off</span>
          <span>Simulasi Manipulasi Blok #1</span>
        </button>

        <button
          type="button"
          onClick={onRestore}
          disabled={loading}
          className="h-8 px-3.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition"
        >
          <span className="material-symbols-outlined text-sm">build</span>
          <span>Pulihkan Rantai</span>
        </button>
      </div>
    </div>
  );
}
