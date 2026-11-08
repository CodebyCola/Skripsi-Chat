'use client';

import React from 'react';
import { PageShell } from '@/features/dashboard';
import { useDbInspector } from '../hooks/useDbInspector';
import { DbUserCard } from './DbUserCard';

export function DbInspectorView() {
  const { data, loading, errorMsg, reload } = useDbInspector();

  return (
    <PageShell
      title="Inspector Enkripsi Database"
      subtitle="Database-at-Rest AES-256-GCM"
      actions={
        <button
          type="button"
          onClick={reload}
          className="h-8 px-3 rounded-lg border border-sage-border bg-surface hover:bg-canvas text-text-dark text-xs font-medium flex items-center gap-1.5 transition"
        >
          <span className="material-symbols-outlined text-base text-text-secondary">
            refresh
          </span>
          <span>Refresh DB</span>
        </button>
      }
    >
      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-security-danger text-xs">
          {errorMsg}
        </div>
      )}

      {loading && (
        <p className="text-xs text-text-secondary">
          Memuat perbandingan tabel database dari Server...
        </p>
      )}

      {data?.usersTable?.map((user) => (
        <DbUserCard key={user.id} user={user} />
      ))}
    </PageShell>
  );
}
