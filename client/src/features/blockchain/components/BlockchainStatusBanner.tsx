'use client';

import React from 'react';
import { BlockchainValidation } from '../types/blockchain.types';

interface BlockchainStatusBannerProps {
  validation?: BlockchainValidation;
}

export function BlockchainStatusBanner({
  validation,
}: BlockchainStatusBannerProps) {
  if (!validation) return null;

  const isValid = validation.isChainValid;

  return (
    <div
      className={`p-4 rounded-xl border flex items-center justify-between mb-6 shadow-xs ${
        isValid
          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
          : 'bg-red-50/60 border-red-200 text-red-950'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-2xl text-primary">
          {isValid ? 'verified' : 'gpp_bad'}
        </span>
        <div>
          <h3 className="font-semibold text-xs">
            {isValid
              ? 'Rantai Bukti Blockchain Utuh & Terverifikasi'
              : `PERINGATAN: Integritas Rantai Rusak pada Blok #${validation.firstCorruptedIndex}`}
          </h3>
          <p className="text-[11px] text-text-secondary mt-0.5">
            {isValid
              ? `Seluruh ${validation.totalBlocks} blok terhubung sah dengan SHA-256 hash pointer & Proof-of-Work.`
              : 'Terdapat manipulasi data payload tanpa menghitung ulang nonce dan hash berantai.'}
          </p>
        </div>
      </div>

      <div className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-surface border border-sage-border text-text-dark shrink-0">
        Total: {validation.totalBlocks} Blok
      </div>
    </div>
  );
}
