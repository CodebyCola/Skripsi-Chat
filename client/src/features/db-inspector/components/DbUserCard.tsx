import React from 'react';
import { DbInspectorUserRecord } from '../types/dbInspector.types';

interface DbUserCardProps {
  user: DbInspectorUserRecord;
}

export function DbUserCard({ user }: DbUserCardProps) {
  return (
    <div className="bg-surface border border-sage-border rounded-xl p-5 shadow-xs">
      <h3 className="text-sm font-semibold text-text-dark">
        User #{user.id} (@{user.username})
      </h3>
      <p className="mt-3 mb-1.5 text-xs font-medium text-security-danger">
        Raw di Tabel SQLite (Ciphertext AES-256-GCM &amp; Scrypt):
      </p>
      <pre className="bg-canvas border border-sage-border rounded-lg p-2.5 font-mono text-[11px] text-text-dark overflow-x-auto">
        {JSON.stringify(user.rawInSqlite, null, 2)}
      </pre>
      <p className="mt-3 mb-1.5 text-xs font-medium text-primary">
        Hasil Dekripsi di Aplikasi:
      </p>
      <pre className="bg-sage-tint border border-sage-border rounded-lg p-2.5 font-mono text-[11px] text-text-dark overflow-x-auto">
        {JSON.stringify(user.decryptedInApp, null, 2)}
      </pre>
    </div>
  );
}
