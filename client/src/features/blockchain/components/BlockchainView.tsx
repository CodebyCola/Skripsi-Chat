'use client';

import React from 'react';
import { PageShell, useCurrentUser, normalizeRole } from '@/features/dashboard';
import { useBlockchain } from '../hooks/useBlockchain';
import { BlockCard } from './BlockCard';
import { BlockchainControls } from './BlockchainControls';
import { BlockchainStatusBanner } from './BlockchainStatusBanner';

export function BlockchainView() {
  const { user } = useCurrentUser();
  const { data, loading, errorMsg, loadChain, tamperBlock, restoreChain } =
    useBlockchain();

  // FR-CHAIN-07: demo tamper hanya untuk admin (tampilan saja; penegakan tetap di server)
  const isAdmin = normalizeRole(user?.role) === 'admin';

  return (
    <PageShell
      title="Buku Besar Blockchain SHA-256"
      subtitle="Chain of Custody"
    >
      <BlockchainControls
        loading={loading}
        showDemoTools={isAdmin}
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
