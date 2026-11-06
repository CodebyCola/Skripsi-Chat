import React from 'react';
import { DbInspectorUserRecord } from '../types/dbInspector.types';

interface DbUserCardProps {
  user: DbInspectorUserRecord;
}

export function DbUserCard({ user }: DbUserCardProps) {
  return (
    <div
      style={{
        background: '#111827',
        padding: 16,
        borderRadius: 10,
        border: '1px solid #334155',
        marginBottom: 14,
      }}
    >
      <h3>
        User #{user.id} (@{user.username})
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
        {JSON.stringify(user.rawInSqlite, null, 2)}
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
        {JSON.stringify(user.decryptedInApp, null, 2)}
      </pre>
    </div>
  );
}
