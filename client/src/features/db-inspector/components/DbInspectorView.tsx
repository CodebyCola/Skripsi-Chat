'use client';

import React from 'react';
import { DashboardNav } from '@/features/dashboard';
import { useDbInspector } from '../hooks/useDbInspector';
import { DbUserCard } from './DbUserCard';

export function DbInspectorView() {
  const { data, loading, errorMsg, reload } = useDbInspector();

  return (
    <>
      <DashboardNav />
      <main
        style={{ maxWidth: 1020, margin: '0 auto', padding: '0 20px 48px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h1>
            🗄️ Inspector Enkripsi Database (Database-at-Rest AES-256-GCM)
          </h1>
          <button type="button" onClick={reload} style={{ background: '#1e293b', border: '1px solid #334155' }}>
            🔄 Refresh DB
          </button>
        </div>

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

        {loading && (
          <p style={{ color: '#94a3b8', fontSize: 13 }}>
            Memuat perbandingan tabel database dari Server...
          </p>
        )}

        {data?.usersTable?.map((user) => (
          <DbUserCard key={user.id} user={user} />
        ))}
      </main>
    </>
  );
}
