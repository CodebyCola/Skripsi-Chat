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
    <div
      style={{
        display: 'flex',
        gap: 10,
        marginBottom: 16,
        flexWrap: 'wrap',
      }}
    >
      <button type="button" onClick={onVerify} disabled={loading}>
        🔍 Verifikasi Integritas Rantai
      </button>
      <button
        type="button"
        onClick={onTamper}
        disabled={loading}
        style={{ background: '#dc2626' }}
      >
        ⚠️ Simulasi Tamper Blok #1
      </button>
      <button
        type="button"
        onClick={onRestore}
        disabled={loading}
        style={{ background: '#059669' }}
      >
        🛠️ Pulihkan Integritas Rantai
      </button>
    </div>
  );
}
