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
      className={`p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
        isValid
          ? 'bg-sage-tint border-sage-border text-primary'
          : 'bg-red-50 border-red-200 text-security-danger'
      }`}
    >
      <span className="material-symbols-outlined text-lg shrink-0">
        {isValid ? 'verified_user' : 'gpp_bad'}
      </span>
      <span>
        Status Rantai:{' '}
        <strong>
          {isValid
            ? `VALID (${validation.totalBlocks} Blok — Seluruh Hash SHA-256 Cocok)`
            : `INVALID / RUSAK MULAI BLOK #${validation.firstCorruptedIndex}`}
        </strong>
      </span>
    </div>
  );
}
