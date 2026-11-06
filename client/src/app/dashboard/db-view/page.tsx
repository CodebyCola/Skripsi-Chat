'use client';

import React, { useEffect, useState } from 'react';
import { DashboardNav } from '../../../components/DashboardNav';
import { apiRequest } from '../../../lib/api';

export default function DbInspectorPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    apiRequest('/api/db-inspector').then(setData);
  }, []);

  return (
    <>
      <DashboardNav />
      <main style={{ maxWidth: 1020, margin: '0 auto', padding: '0 20px 48px' }}>
        <h1 style={{ marginBottom: 14 }}>
          🗄️ Inspector Enkripsi Database (Database-at-Rest AES-256-GCM)
        </h1>
        {data?.usersTable?.map((u: any) => (
          <div
            key={u.id}
            style={{
              background: '#111827',
              padding: 16,
              borderRadius: 10,
              border: '1px solid #334155',
              marginBottom: 14,
            }}
          >
            <h3>
              User #{u.id} (@{u.username})
            </h3>
            <p style={{ color: '#f87171', fontSize: 13, marginTop: 8 }}>
              Raw di Tabel SQLite (Ciphertext AES-256-GCM &amp; Scrypt):
            </p>
            <pre
              style={{
                background: '#070a12',
                padding: 10,
                borderRadius: 8,
                overflowX: 'auto',
                color: '#38bdf8',
                fontSize: 12,
              }}
            >
              {JSON.stringify(u.rawInSqlite, null, 2)}
            </pre>
            <p style={{ color: '#34d399', fontSize: 13, marginTop: 8 }}>
              Hasil Dekripsi di Aplikasi:
            </p>
            <pre
              style={{
                background: '#070a12',
                padding: 10,
                borderRadius: 8,
                overflowX: 'auto',
                color: '#a7f3d0',
                fontSize: 12,
              }}
            >
              {JSON.stringify(u.decryptedInApp, null, 2)}
            </pre>
          </div>
        ))}
      </main>
    </>
  );
}
