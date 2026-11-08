'use client';

import React from 'react';
import { PageShell, useCurrentUser } from '@/features/dashboard';
import { EmptyState, ErrorBanner } from '@/components/ui';
import { useStego } from '../hooks/useStego';
import { StegoEmbedForm } from './StegoEmbedForm';
import { StegoGalleryItem } from './StegoGalleryItem';

// Ref: FR-IMG-01 s.d. 04, FR-AUTH-08
export function StegoView() {
  const { user } = useCurrentUser();
  const s = useStego(user?.username);

  const picker =
    s.conversations.length > 1 ? (
      <select
        aria-label="Pilih percakapan bimbingan"
        value={s.convId ?? ''}
        onChange={(e) => s.selectConversation(Number(e.target.value))}
        className="h-8 max-w-56 rounded-lg border border-sage-border bg-surface px-2 text-xs text-text-dark focus:border-primary focus:outline-none"
      >
        {s.conversations.map((c) => (
          <option key={c.id} value={c.id}>
            {c.peerName} — {c.topic}
          </option>
        ))}
      </select>
    ) : undefined;

  const active = s.conversations.find((c) => c.id === s.convId);

  return (
    <PageShell
      title={active ? `${active.peerName} — ${active.topic}` : 'Foto Dokumen'}
      subtitle="Steganografi Citra PNG LSB & Metadata Terenkripsi"
      actions={picker}
    >
      <ErrorBanner message={s.error} onRetry={s.reload} onDismiss={s.clearError} />

      {!s.loading && s.conversations.length === 0 ? (
        <EmptyState
          icon="forum"
          title="Belum ada percakapan bimbingan"
          description="Foto dokumen steganografi disematkan di dalam percakapan bimbingan. Minta admin menetapkan pembimbing."
        />
      ) : (
        <>
          <StegoEmbedForm
            title={s.title}
            onTitleChange={s.setTitle}
            note={s.note}
            onNoteChange={s.setNote}
            coverPngBase64={s.coverPngBase64}
            coverDimensions={s.coverDimensions}
            maxCapacityBytes={s.maxCapacityBytes}
            notePayloadBytes={s.notePayloadBytes}
            isCapacityExceeded={s.isCapacityExceeded}
            onSelectCover={s.handleSelectCover}
            onResetCover={s.handleResetCover}
            loading={s.uploading}
            disabled={!s.convId}
            onSubmit={s.handleEmbed}
          />

          <div className="pt-2">
            <h2 className="text-xs font-semibold text-text-dark mb-3">
              Daftar Foto Dokumen Steganografi ({s.gallery.length})
            </h2>

            {s.loading ? (
              <p role="status" className="text-xs text-text-secondary">
                Memuat galeri citra…
              </p>
            ) : s.gallery.length === 0 ? (
              <EmptyState
                icon="image"
                title="Belum ada foto dokumen"
                description="Unggah foto dokumen atau gunakan sampel cover untuk menyisipkan catatan rahasia LSB."
              />
            ) : (
              <div className="space-y-3">
                {s.gallery.map((item) => (
                  <StegoGalleryItem
                    key={item.id}
                    item={item}
                    extracted={s.extractedData[item.id]}
                    isExtracting={s.extractingId === item.id}
                    onExtract={s.handleExtract}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </PageShell>
  );
}
