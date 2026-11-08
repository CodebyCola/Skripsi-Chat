'use client';

import React from 'react';
import { ErrorBanner, HashText, SecurityPill, StatusBadge } from '@/components/ui';
import { useVerifyDocument } from '../hooks/useVerifyDocument';
import { VerifyStatus } from '../types/blockchain.types';
import { ASSET_TYPE_LABEL, formatDate, MAX_DOC_MB } from '../utils';

// Ref: FR-CHAIN-05 — unggah dokumen → ASLI / TIDAK COCOK / CHAIN RUSAK
const BADGE: Record<VerifyStatus, string> = {
  AUTHENTIC: 'ASLI',
  NOT_FOUND: 'TIDAK_COCOK',
  CHAIN_COMPROMISED: 'CHAIN_RUSAK',
};

export function VerifyDocumentCard() {
  const v = useVerifyDocument();
  const r = v.result;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // izinkan memilih berkas yang sama lagi
    if (file) v.verify(file);
  }

  return (
    <div className="bg-surface border border-sage-border rounded-xl shadow-xs overflow-hidden">
      <div className="p-5 space-y-3">
        <div>
          <label htmlFor="verify-file" className="block text-[11px] font-medium text-text-secondary mb-1">
            Unggah dokumen yang ingin dicek keasliannya
          </label>
          <input
            id="verify-file"
            type="file"
            onChange={handleChange}
            disabled={v.verifying}
            className="block w-full text-xs text-text-secondary file:mr-3 file:h-8 file:px-3 file:rounded-lg file:border file:border-sage-border file:bg-surface file:text-xs file:text-text-dark hover:file:bg-canvas disabled:opacity-40"
          />
        </div>
        <p className="text-[11px] text-text-muted">
          Maksimal {MAX_DOC_MB} MB. Dokumen di-hash SHA-256 lalu dicocokkan dengan catatan blockchain; satu byte berbeda
          menghasilkan TIDAK COCOK.
        </p>
        {v.verifying && (
          <p role="status" className="flex items-center gap-1.5 text-xs text-security-info">
            <span className="material-symbols-outlined text-base" aria-hidden="true">hourglass_top</span>
            Memverifikasi {v.fileName}…
          </p>
        )}
      </div>

      <ErrorBanner message={v.error} onDismiss={v.clearError} />

      {r && (
        <div role="status" className="border-t border-sage-border p-5 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={BADGE[r.status]} />
            <span className="text-[11px] text-text-secondary truncate">{v.fileName}</span>
          </div>
          <p className="text-xs text-text-dark">{r.message}</p>

          {r.status === 'AUTHENTIC' && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[11px]">
              <dt className="text-text-muted">Judul</dt>
              <dd className="text-text-dark">{r.title}</dd>
              <dt className="text-text-muted">Tipe</dt>
              <dd className="text-text-dark">{ASSET_TYPE_LABEL[r.assetType ?? ''] ?? r.assetType}</dd>
              <dt className="text-text-muted">Mahasiswa</dt>
              <dd className="text-text-dark">{r.studentName ?? r.studentId}</dd>
              <dt className="text-text-muted">Penerbit</dt>
              <dd className="text-text-dark">{r.issuerName ?? r.issuerId}</dd>
              <dt className="text-text-muted">Waktu terbit</dt>
              <dd className="text-text-dark">{r.issuedAt ? formatDate(r.issuedAt) : '—'}</dd>
              <dt className="text-text-muted">Blok</dt>
              <dd className="text-text-dark">#{r.blockIndex}</dd>
              <dt className="text-text-muted">Tanda tangan</dt>
              <dd>
                <SecurityPill tone={r.signatureValid ? 'valid' : 'danger'} icon={r.signatureValid ? 'draw' : 'gpp_bad'}>
                  {r.signatureValid ? 'RSA-PSS sah' : 'Tanda tangan tidak sah'}
                </SecurityPill>
              </dd>
              <dt className="text-text-muted">SHA-256</dt>
              <dd><HashText value={r.docHash} head={12} tail={8} /></dd>
            </dl>
          )}

          {r.status !== 'AUTHENTIC' && r.docHash && (
            <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
              <span>SHA-256 dokumen</span>
              <HashText value={r.docHash} head={12} tail={8} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}