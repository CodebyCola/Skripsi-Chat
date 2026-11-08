'use client';

import React from 'react';
import { PageShell } from '@/features/dashboard';
import { useBlockchain } from '../hooks/useBlockchain';
import { BlockCard } from './BlockCard';
import { BlockchainControls } from './BlockchainControls';
import { BlockchainStatusBanner } from './BlockchainStatusBanner';

export function BlockchainView() {
  const { data, loading, errorMsg, loadChain, tamperBlock, restoreChain } =
    useBlockchain();

  return (
    <PageShell
      title="Buku Besar Blockchain SHA-256"
      subtitle="Chain of Custody"
    >
      <BlockchainControls
        loading={loading}
        onVerify={loadChain}
        onTamper={() => tamperBlock(1)}
        onRestore={restoreChain}
      />

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-security-danger text-xs">
          {errorMsg}
        </div>
      )}

      <BlockchainStatusBanner validation={data?.validation} />

      <h2 className="text-xs font-semibold text-text-dark">
        Daftar Blok Berantai ({data?.blocks?.length || 0})
      </h2>

      {data?.blocks?.map((b, idx) => (
        <BlockCard
          key={b.index}
          block={b}
          detail={data.validation?.details?.[idx]}
        />
      ))}
    </PageShell>
  );
}
