'use client';

import React from 'react';
import { DashboardNav } from '@/features/dashboard';
import { useBlockchain } from '../hooks/useBlockchain';
import { BlockCard } from './BlockCard';
import { BlockchainControls } from './BlockchainControls';
import { BlockchainStatusBanner } from './BlockchainStatusBanner';

export function BlockchainView() {
  const { data, loading, errorMsg, loadChain, tamperBlock, restoreChain } =
    useBlockchain();

  return (
    <>
      <DashboardNav />
      <main
        style={{ maxWidth: 1020, margin: '0 auto', padding: '0 20px 48px' }}
      >
        <h1 style={{ marginBottom: 14 }}>
          ⛓️ Buku Besar Blockchain SHA-256 (Chain of Custody)
        </h1>

        <BlockchainControls
          loading={loading}
          onVerify={loadChain}
          onTamper={() => tamperBlock(1)}
          onRestore={restoreChain}
        />

        {errorMsg && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              marginBottom: 16,
            }}
          >
            {errorMsg}
          </div>
        )}

        <BlockchainStatusBanner validation={data?.validation} />

        <h2 style={{ marginBottom: 12 }}>
          Daftar Blok Berantai ({data?.blocks?.length || 0})
        </h2>

        {data?.blocks?.map((b, idx) => (
          <BlockCard
            key={b.index}
            block={b}
            detail={data.validation?.details?.[idx]}
          />
        ))}
      </main>
    </>
  );
}
