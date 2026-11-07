'use client';

import React from 'react';
import { DashboardLayout } from '@/features/dashboard';
import { useDbInspector } from '../hooks/useDbInspector';

export function DbInspectorView() {
  const { data, loading, errorMsg, reload } = useDbInspector();

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-canvas p-6 md:p-8">
        <div className="max-w-5xl mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-mono text-primary font-semibold uppercase tracking-wider">
                Kriteria #5: Database Column Encryption
              </span>
              <h1 className="font-display font-bold text-lg text-text-dark">
                Inspektur Database SQLite Mentah
              </h1>
            </div>

            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className="h-8 px-3 rounded-lg border border-sage-border bg-surface hover:bg-canvas text-text-dark text-xs font-medium flex items-center gap-1.5 transition"
            >
              <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>{loading ? 'Memeriksa...' : 'Refresh DB'}</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 mb-5">
              {errorMsg}
            </div>
          )}

          <div className="p-4 rounded-xl bg-surface border border-sage-border mb-6">
            <h3 className="font-semibold text-xs text-text-dark mb-1">
              Spesifikasi Kriptografi Database-at-Rest
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed font-mono">
              Algoritma: {data?.encryptionSpec?.columnEncryptionAlgorithm || 'AES-256-GCM'} | Hash Password: {data?.encryptionSpec?.passwordHashAlgorithm || 'Scrypt (N=16384, r=8, p=1)'}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="font-display font-semibold text-xs uppercase tracking-wider text-text-dark">
              Perbandingan Nilai Mentah di File SQLite vs Dekripsi di Aplikasi
            </h2>

            {data?.usersTable?.map((user) => (
              <div
                key={user.id}
                className="p-4 rounded-xl bg-surface border border-sage-border shadow-xs flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-primary">
                    User: @{user.username}
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">
                    ID #{user.id}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-canvas border border-sage-border flex flex-col gap-1.5">
                    <span className="font-mono text-[10px] font-semibold text-red-800 uppercase">
                      Nilai Ciphertext Mentah (di Disk SQLite)
                    </span>
                    <div className="font-mono text-[10px] text-text-secondary break-all">
                      <p>Nama: {user.rawInSqlite.fullNameEncrypted}</p>
                      <p className="mt-1">Hash: {user.rawInSqlite.passwordHash.slice(0, 40)}...</p>
                      <p className="mt-1">Dongle: {user.rawInSqlite.dongleIdEncrypted.slice(0, 30)}...</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-50/40 border border-emerald-200 flex flex-col gap-1.5">
                    <span className="font-mono text-[10px] font-semibold text-emerald-800 uppercase">
                      Hasil Dekripsi Aplikasi (AES-256-GCM)
                    </span>
                    <div className="text-[11px] text-emerald-950">
                      <p className="font-semibold">Nama: {user.decryptedInApp.fullName}</p>
                      <p className="mt-1 font-mono text-[10px]">Dongle: {user.decryptedInApp.dongleId}</p>
                      <p className="mt-1 font-mono text-[10px]">Catatan: {user.decryptedInApp.secretNote}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
