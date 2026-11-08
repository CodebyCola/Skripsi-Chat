'use client';

import React from 'react';
import { PageShell, normalizeRole, useCurrentUser } from '@/features/dashboard';
import { EmptyState, ErrorBanner } from '@/components/ui';
import { useFiles } from '../hooks/useFiles';
import { FileItemCard } from './FileItemCard';
import { FileUploadCard } from './FileUploadCard';

// Ref: FR-FILE-01..05, FR-AUTH-08 (admin tidak punya akses; ditegakkan server & guard navigasi)
export function FilesView() {
  const { user } = useCurrentUser();
  const isLecturer = normalizeRole(user?.role) === 'lecturer';
  const f = useFiles(user?.username);

  const picker =
    f.conversations.length > 1 ? (
      <select
        aria-label="Pilih percakapan"
        value={f.convId ?? ''}
        onChange={(e) => f.selectConversation(Number(e.target.value))}
        className="h-8 max-w-56 rounded-lg border border-sage-border bg-surface px-2 text-xs text-text-dark focus:border-primary focus:outline-none"
      >
        {f.conversations.map((c) => (
          <option key={c.id} value={c.id}>{c.peerName} — {c.topic}</option>
        ))}
      </select>
    ) : undefined;

  const active = f.conversations.find((c) => c.id === f.convId);

  return (
    <PageShell title={active ? `${active.peerName} — ${active.topic}` : 'Naskah & Berkas'} subtitle="Naskah & Berkas" actions={picker}>
      <ErrorBanner message={f.error} onRetry={f.reload} onDismiss={f.clearError} />

      {!f.loading && f.conversations.length === 0 ? (
        <EmptyState
          icon="forum"
          title="Belum ada percakapan bimbingan"
          description="Berkas diunggah di dalam percakapan bimbingan. Minta admin menetapkan pembimbing."
        />
      ) : (
        <>
          <FileUploadCard disabled={!f.convId} uploading={f.uploading} onSelect={f.upload} />

          <h2 className="text-xs font-semibold text-text-dark">Daftar Berkas ({f.files.length})</h2>

          {f.loading ? (
            <p role="status" className="text-xs text-text-secondary">Memuat berkas…</p>
          ) : f.files.length === 0 ? (
            <EmptyState icon="folder_open" title="Belum ada berkas" description="Unggah draf pertama untuk memulai." />
          ) : (
            f.files.map((file) => (
              <FileItemCard
                key={file.id}
                file={file}
                isLecturer={isLecturer}
                check={f.checks[file.id]}
                busy={f.busyId === file.id}
                onDownload={f.download}
                onReview={f.review}
              />
            ))
          )}
        </>
      )}
    </PageShell>
  );
}
