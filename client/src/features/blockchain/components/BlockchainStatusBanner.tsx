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
      style={{
        padding: 14,
        borderRadius: 8,
        marginBottom: 16,
        background: isValid
          ? 'rgba(16,185,129,0.15)'
          : 'rgba(239,68,68,0.18)',
        border: `1px solid ${isValid ? '#10b981' : '#ef4444'}`,
      }}
    >
      Status Rantai:{' '}
      <strong>
        {isValid
          ? `✅ VALID (${validation.totalBlocks} Blok — Seluruh Hash SHA-256 Cocok)`
          : `🚨 INVALID / RUSAK MULAI BLOK #${validation.firstCorruptedIndex}`}
      </strong>
    </div>
  );
}
