'use client';

import React, { useState } from 'react';
import { PageShell, useCurrentUser, normalizeRole } from '@/features/dashboard';
import { EmptyState, ErrorBanner } from '@/components/ui';
import { useBlockchain } from '../hooks/useBlockchain';
import { useAssets } from '../hooks/useAssets';
import { AssetCard } from './AssetCard';
import { BlockCard } from './BlockCard';
import { BlockchainControls } from './BlockchainControls';
import { BlockchainStatusBanner } from './BlockchainStatusBanner';
import { IssueAssetForm } from './IssueAssetForm';
import { VerifyDocumentCard } from './VerifyDocumentCard';

// Ref: FR-CHAIN-02..07, FR-AUTH-08 — tab menyesuaikan peran; penegakan hak akses tetap di server
type TabKey = 'assets' | 'issue' | 'verify' | 'chain';

const TABS: Record<'student' | 'lecturer' | 'admin', { key: TabKey; label: string }[]> = {
  student: [
    { key: 'assets', label: 'Aset Saya' },
    { key: 'verify', label: 'Verifikasi Dokumen' },
    { key: 'chain', label: 'Rantai Blok' },
  ],
  lecturer: [
    { key: 'issue', label: 'Terbitkan Aset' },
    { key: 'verify', label: 'Verifikasi Dokumen' },
    { key: 'chain', label: 'Rantai Blok' },
  ],
  admin: [
    { key: 'verify', label: 'Verifikasi Dokumen' },
    { key: 'chain', label: 'Rantai Blok' },
  ],
};

export function BlockchainView() {
  const { user } = useCurrentUser();
  const role = normalizeRole(user?.role);
  const tabs = TABS[role];
  const [tab, setTab] = useState<TabKey | null>(null);
  const active = tab && tabs.some((t) => t.key === tab) ? tab : tabs[0].key;

  const chain = useBlockchain();
  const assets = useAssets(role, !!user);

  // FR-CHAIN-07: tamper hanya admin & saat DEMO_MODE (tampilan saja; penegakan di server)
  const showDemoTools = role === 'admin' && !!chain.data?.demoMode;

  return (
    <PageShell title="Buku Konsultasi & ACC" subtitle="Chain of Custody">
      <div role="tablist" aria-label="Bagian buku konsultasi" className="flex flex-wrap gap-1.5">
        {tabs.map((t) => {
          const on = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.key)}
              className={`h-8 px-3 rounded-full border text-xs font-semibold cursor-pointer transition ${
                on
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-text-secondary border-sage-border hover:bg-canvas'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {active === 'assets' && (
        <>
          <ErrorBanner message={assets.error} onRetry={assets.reload} onDismiss={assets.clearError} />
          <h2 className="text-xs font-semibold text-text-dark">Aset Akademik Saya ({assets.assets.length})</h2>
          {assets.loading ? (
            <p role="status" className="text-xs text-text-secondary">Memuat aset…</p>
          ) : assets.assets.length === 0 ? (
            <EmptyState
              icon="verified"
              title="Belum ada aset akademik"
              description="ACC sidang, nilai, atau sertifikat yang diterbitkan dosen akan muncul di sini."
            />
          ) : (
            assets.assets.map((a) => <AssetCard key={a.id} asset={a} showIssuer />)
          )}
        </>
      )}

      {active === 'issue' && (
        <>
          <ErrorBanner message={assets.error} onRetry={assets.reload} onDismiss={assets.clearError} />
          <IssueAssetForm students={assets.students} issuing={assets.issuing} onSubmit={assets.issue} />
          <h2 className="text-xs font-semibold text-text-dark">Riwayat Penerbitan ({assets.assets.length})</h2>
          {assets.loading ? (
            <p role="status" className="text-xs text-text-secondary">Memuat riwayat…</p>
          ) : assets.assets.length === 0 ? (
            <EmptyState icon="history" title="Belum ada aset diterbitkan" description="Aset yang Anda terbitkan akan tercatat di sini." />
          ) : (
            assets.assets.map((a) => <AssetCard key={a.id} asset={a} showStudent />)
          )}
        </>
      )}

      {active === 'verify' && <VerifyDocumentCard />}

      {active === 'chain' && (
        <>
          <BlockchainControls
            loading={chain.loading}
            showDemoTools={showDemoTools}
            onVerify={chain.loadChain}
            onTamper={() => chain.tamperBlock(1)}
            onRestore={chain.restoreChain}
          />
          <ErrorBanner message={chain.errorMsg} onRetry={chain.loadChain} onDismiss={chain.clearError} />
          <BlockchainStatusBanner validation={chain.data?.validation} />
          <h2 className="text-xs font-semibold text-text-dark">
            Daftar Blok Berantai ({chain.data?.blocks?.length || 0})
          </h2>
          {chain.data?.blocks?.map((b, idx) => (
            <BlockCard key={b.index} block={b} detail={chain.data?.validation?.details?.[idx]} />
          ))}
        </>
      )}
    </PageShell>
  );
}