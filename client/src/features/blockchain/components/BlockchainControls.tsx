'use client';

import React from 'react';

interface BlockchainControlsProps {
  loading: boolean;
  showDemoTools: boolean;
  onVerify: () => void;
  onTamper: () => void;
  onRestore: () => void;
}

export function BlockchainControls({
  loading,
  showDemoTools,
  onVerify,
  onTamper,
  onRestore,
}: BlockchainControlsProps) {
  const base =
    'h-8 px-3.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="flex gap-2.5 flex-wrap">
      <button
        type="button"
        onClick={onVerify}
        disabled={loading}
        className={`${base} bg-primary hover:bg-primary-hover text-white shadow-xs`}
      >
        <span className="material-symbols-outlined text-base">fact_check</span>
        <span>Verifikasi Integritas Rantai</span>
      </button>
      {showDemoTools && (
        <>
          <button
            type="button"
            onClick={onTamper}
            disabled={loading}
            className={`${base} bg-security-danger hover:opacity-90 text-white`}
          >
            <span className="material-symbols-outlined text-base">warning</span>
            <span>Simulasi Tamper Blok #1</span>
          </button>
          <button
            type="button"
            onClick={onRestore}
            disabled={loading}
            className={`${base} border border-sage-border bg-surface hover:bg-canvas text-text-dark`}
          >
            <span className="material-symbols-outlined text-base text-text-secondary">
              build
            </span>
            <span>Pulihkan Integritas Rantai</span>
          </button>
        </>
      )}
    </div>
  );
}
