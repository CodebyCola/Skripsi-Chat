'use client';

import React, { useState } from 'react';
import { PageShell, normalizeRole, useCurrentUser } from '@/features/dashboard';
import { ConfirmDialog, EmptyState, ErrorBanner } from '@/components/ui';
import { useImportantMessages } from '../hooks/useImportantMessages';
import { ImportantMessageCard } from './ImportantMessageCard';
import { CategoryFilter, ImportantMessage } from '../types/messages.types';

// Ref: FR-VAULT-03/04, FR-AUTH-08 (admin tidak punya akses; ditegakkan server & guard navigasi)
const FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: 'ALL', label: 'Semua' },
  { key: 'ACC', label: 'ACC' },
  { key: 'REVISI', label: 'Revisi' },
  { key: 'JADWAL_SIDANG', label: 'Jadwal Sidang' },
  { key: 'LAINNYA', label: 'Lainnya' },
];

export function MessagesView() {
  const { user } = useCurrentUser();
  const isLecturer = normalizeRole(user?.role) === 'lecturer';
  const m = useImportantMessages(user?.username);
  const [pending, setPending] = useState<ImportantMessage | null>(null);

  async function confirmUnmark() {
    if (!pending) return;
    const target = pending;
    setPending(null);
    await m.unmark(target);
  }

  return (
    <PageShell title="Pesan Penting" subtitle="ACC, revisi, dan jadwal sidang">
      <ErrorBanner message={m.error} onRetry={m.reload} onDismiss={m.clearError} />

      <div role="tablist" aria-label="Filter kategori" className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = m.category === f.key;
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => m.setCategory(f.key)}
              className={`h-8 px-3 rounded-full border text-xs font-semibold cursor-pointer transition ${
                active
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-text-secondary border-sage-border hover:bg-canvas'
              }`}
            >
              {f.label} <span className={active ? 'text-white/80' : 'text-text-muted'}>({m.counts[f.key]})</span>
            </button>
          );
        })}
      </div>

      {m.loading ? (
        <p role="status" className="text-xs text-text-secondary">Memuat pesan penting…</p>
      ) : m.items.length === 0 ? (
        <EmptyState
          icon="bookmark"
          title={m.total === 0 ? 'Belum ada pesan penting' : 'Tidak ada pesan pada kategori ini'}
          description={
            m.total === 0
              ? isLecturer
                ? 'Tandai pesan dengan ikon bintang di Ruang Bimbingan agar tersimpan di sini.'
                : 'Pesan ACC, revisi, atau jadwal sidang yang ditandai dosen akan muncul di sini.'
              : 'Pilih kategori lain untuk melihat pesan yang tersimpan.'
          }
        />
      ) : (
        m.items.map((msg) => (
          <ImportantMessageCard
            key={msg.id}
            message={msg}
            conversation={m.conversations.find((c) => c.id === msg.convId)}
            canUnmark={isLecturer}
            busy={m.busyId === msg.messageId}
            onUnmark={setPending}
          />
        ))
      )}

      <ConfirmDialog
        open={!!pending}
        tone="danger"
        title="Cabut tanda penting?"
        description="Pesan asli di percakapan tetap ada; hanya salinan terenkripsi di daftar ini yang dihapus."
        confirmLabel="Ya, cabut"
        onConfirm={confirmUnmark}
        onCancel={() => setPending(null)}
      />
    </PageShell>
  );
}