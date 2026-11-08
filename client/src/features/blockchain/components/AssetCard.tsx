import React from 'react';
import { HashText, SecurityPill } from '@/components/ui';
import { AcademicAsset } from '../types/blockchain.types';
import { ASSET_TYPE_LABEL, formatDate } from '../utils';

// Ref: FR-CHAIN-06 — kartu aset akademik; `showStudent` untuk riwayat dosen, `showIssuer` untuk mahasiswa
interface AssetCardProps {
  asset: AcademicAsset;
  showStudent?: boolean;
  showIssuer?: boolean;
}

export function AssetCard({ asset, showStudent = false, showIssuer = false }: AssetCardProps) {
  return (
    <article className="bg-surface border border-sage-border rounded-xl p-4 shadow-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="material-symbols-outlined text-base text-primary" aria-hidden="true">verified</span>
        <p className="text-xs font-semibold text-text-dark">{asset.title}</p>
        <SecurityPill tone="info">{ASSET_TYPE_LABEL[asset.assetType] ?? asset.assetType}</SecurityPill>
        <SecurityPill tone="neutral" icon="link">Blok #{asset.blockIndex}</SecurityPill>
      </div>
      <p className="mt-1.5 text-[11px] text-text-secondary">
        {showStudent && <>Mahasiswa: {asset.studentName} • </>}
        {showIssuer && <>Diterbitkan oleh {asset.issuerName} • </>}
        {formatDate(asset.issuedAt)}
      </p>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-text-secondary">
        <span>SHA-256 dokumen</span>
        <HashText value={asset.docHash} head={12} tail={8} />
      </div>
    </article>
  );
}