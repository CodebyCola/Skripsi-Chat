'use client';

import React, { useEffect, useState } from 'react';
import { DashboardNav } from '../../../components/DashboardNav';
import { apiRequest } from '../../../lib/api';

export default function BlockchainPage() {
  const [data, setData] = useState<any>(null);

  async function loadChain() {
    const res = await apiRequest('/api/blockchain');
    setData(res);
  }

  async function tamperBlock() {
    const res = await apiRequest('/api/blockchain/tamper', 'POST', { index: 1 });
    setData(res);
  }

  async function restoreChain() {
    const res = await apiRequest('/api/blockchain/restore', 'POST', {});
    setData(res);
  }

  useEffect(() => {
    loadChain();
  }, []);

  return (
    <>
      <DashboardNav />
      <main style={{ maxWidth: 1020, margin: '0 auto', padding: '0 20px 48px' }}>
        <h1 style={{ marginBottom: 14 }}>
          ⛓️ Buku Besar Blockchain SHA-256 (Chain of Custody)
        </h1>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <button type="button" onClick={loadChain}>
            🔍 Verifikasi Rantai
          </button>
          <button
            type="button"
            onClick={tamperBlock}
            style={{ background: '#dc2626' }}
          >
            ⚠️ Simulasi Tamper Blok #1
          </button>
          <button
            type="button"
            onClick={restoreChain}
            style={{ background: '#059669' }}
          >
            🛠️ Pulihkan Integritas Rantai
          </button>
        </div>

        {data && (
          <div
            style={{
              padding: 14,
              borderRadius: 8,
              marginBottom: 16,
              background: data.validation.isChainValid
                ? 'rgba(16,185,129,0.15)'
                : 'rgba(239,68,68,0.18)',
              border: `1px solid ${
                data.validation.isChainValid ? '#10b981' : '#ef4444'
              }`,
            }}
          >
            Status Rantai:{' '}
            <strong>
              {data.validation.isChainValid
                ? `✅ VALID (${data.validation.totalBlocks} Blok — Seluruh Hash SHA-256 Cocok)`
                : `🚨 INVALID / RUSAK MULAI BLOK #${data.validation.firstCorruptedIndex}`}
            </strong>
          </div>
        )}

        {data?.blocks?.map((b: any, idx: number) => {
          const detail = data.validation?.details?.[idx];
          const isValid = detail ? detail.isValid : true;
          return (
            <div
              key={b.index}
              style={{
                background: '#111827',
                padding: 16,
                borderRadius: 10,
                border: '1px solid #334155',
                borderLeft: `5px solid ${isValid ? '#10b981' : '#ef4444'}`,
                marginBottom: 12,
              }}
            >
              <strong>
                Blok #{b.index} — [{b.actionType}] {b.assetTitle}
              </strong>
              {detail?.errorReason && (
                <div style={{ color: '#fca5a5', fontSize: 12.5, marginTop: 4 }}>
                  {detail.errorReason}
                </div>
              )}
              <pre
                style={{
                  background: '#070a12',
                  padding: 10,
                  borderRadius: 8,
                  overflowX: 'auto',
                  color: '#38bdf8',
                  fontSize: 12,
                  marginTop: 8,
                }}
              >
                {`previousHash : ${b.previousHash}\nassetHash    : ${b.assetDataHash}\nblockHash    : ${b.hash} (nonce: ${b.nonce})`}
              </pre>
            </div>
          );
        })}
      </main>
    </>
  );
}
