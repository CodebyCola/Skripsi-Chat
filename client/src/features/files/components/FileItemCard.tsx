'use client';

import React, { useState } from 'react';
import { HashText, SecurityPill, StatusBadge } from '@/components/ui';
import { FileRecord, HashCheck, ReviewStatus } from '../types/files.types';
import { ReviewPanel } from './ReviewPanel';

// Ref: FR-FILE-03..05 (versi, hash, status review)
interface FileItemCardProps {
  file: FileRecord;
  isLecturer: boolean;
  check?: HashCheck;
  busy: boolean;
  onDownload: (file: FileRecord) => void;
  onReview: (file: FileRecord, status: ReviewStatus, note: string) => Promise<boolean>;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

export function FileItemCard({ file, isLecturer, check, busy, onDownload, onReview }: FileItemCardProps) {
  const [reviewing, setReviewing] = useState(false);

  return (
    <article className="bg-surface border border-sage-border rounded-xl p-4 shadow-xs">
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-sage-tint border border-sage-border flex items-center justify-center text-primary shrink-0">
          <span className="material-symbols-outlined text-xl" aria-hidden="true">description</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-xs font-semibold text-text-dark truncate">{file.originalName}</p>
            <SecurityPill tone="neutral">v{file.version}</SecurityPill>
            <StatusBadge status={file.status} />
          </div>
          <p className="mt-0.5 text-[11px] text-text-secondary">
            {formatSize(file.sizeBytes)} • diunggah {file.uploader} • {formatDate(file.createdAt)}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2 text-[11px] text-text-secondary">
        <span className="shrink-0">SHA-256</span>
        <HashText value={file.originalSha256} head={12} tail={8} />
      </div>

      {file.reviewNote && (
        <p className="mt-2.5 rounded-lg bg-canvas border border-sage-border px-3 py-2 text-xs text-text-dark">
          <span className="block text-[11px] text-text-secondary mb-0.5">Catatan {file.reviewedBy}</span>
          {file.reviewNote}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onDownload(file)}
          disabled={busy}
          className="h-8 px-3 rounded-lg border border-sage-border bg-surface hover:bg-canvas text-text-dark text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
        >
          <span className="material-symbols-outlined text-base text-text-secondary" aria-hidden="true">
            {busy ? 'hourglass_top' : 'download'}
          </span>
          {busy ? 'Memverifikasi…' : 'Unduh & verifikasi'}
        </button>

        {isLecturer && (
          <button
            type="button"
            onClick={() => setReviewing((v) => !v)}
            aria-expanded={reviewing}
            className="h-8 px-3 rounded-lg border border-sage-border bg-surface hover:bg-canvas text-text-dark text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-base text-text-secondary" aria-hidden="true">rate_review</span>
            Review
          </button>
        )}

        {check?.ok === true && <SecurityPill tone="valid" icon="verified">Hash cocok</SecurityPill>}
        {check?.ok === false && <SecurityPill tone="danger" icon="gpp_bad">Ditolak</SecurityPill>}
      </div>

      {check?.ok === false && (
        <p role="alert" className="mt-2 text-[11px] text-security-danger">{check.message}</p>
      )}

      {isLecturer && reviewing && (
        <ReviewPanel
          initialNote={file.reviewNote}
          onSubmit={async (status, note) => {
            const ok = await onReview(file, status, note);
            if (ok) setReviewing(false);
            return ok;
          }}
        />
      )}
    </article>
  );
}
