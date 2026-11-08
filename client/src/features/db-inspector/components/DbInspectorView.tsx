'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/features/dashboard';
import { useDbInspector } from '../hooks/useDbInspector';

type InspectorTab = 'users' | 'important' | 'messages';

export function DbInspectorView() {
  const { data, loading, errorMsg, reload } = useDbInspector();
  const [activeTab, setActiveTab] = useState<InspectorTab>('users');

  const usersCount = data?.usersTable?.length || 0;
  const importantCount = data?.importantMessagesTable?.length || 0;
  const messagesCount = data?.messagesTable?.length || 0;

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-canvas p-6 md:p-8">
        <div className="max-w-5xl mx-auto w-full">
          {/* HEADER */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-mono text-primary font-semibold uppercase tracking-wider">
                Pilar 3A / Kriteria #5: Database-at-Rest Column Encryption
              </span>
              <h1 className="font-display font-bold text-lg text-text-dark">
                Inspektur Basis Data SQLite Mentah
              </h1>
              <p className="text-xs text-text-secondary">
                Verifikasi real-time nilai ciphertext acak yang tersimpan di disk SQLite vs hasil dekripsi resmi di aplikasi.
              </p>
            </div>

            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className="h-8 px-3 rounded-lg border border-sage-border bg-surface hover:bg-canvas text-text-dark text-xs font-medium flex items-center gap-1.5 shadow-xs transition"
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

          {/* SPESIFIKASI KRIPTOGRAFI KARTU */}
          <div className="p-4 rounded-xl bg-surface border border-sage-border shadow-xs mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-text-muted uppercase">Algoritma Enkripsi Kolom</span>
              <span className="text-xs font-semibold text-primary font-mono">
                {data?.encryptionSpec?.columnEncryptionAlgorithm || 'AES-256-GCM (Authenticated)'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-text-muted uppercase">Hash Password Kredensial</span>
              <span className="text-xs font-semibold text-emerald-800 font-mono">
                {data?.encryptionSpec?.passwordHashAlgorithm || 'Scrypt (N=16384, r=8, p=1)'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-text-muted uppercase">Lokasi Berkas SQLite</span>
              <span className="text-xs font-semibold text-text-dark font-mono truncate">
                {data?.encryptionSpec?.sqliteFilePath || 'server/prisma/dev.db'}
              </span>
            </div>
          </div>

          {/* TAB BAR */}
          <div className="flex border-b border-sage-border mb-6 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`pb-2.5 px-3.5 text-xs font-medium flex items-center gap-2 border-b-2 transition ${
                activeTab === 'users'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-text-secondary hover:text-text-dark'
              }`}
            >
              <span className="material-symbols-outlined text-sm">group</span>
              <span>Tabel User ({usersCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('important')}
              className={`pb-2.5 px-3.5 text-xs font-medium flex items-center gap-2 border-b-2 transition ${
                activeTab === 'important'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-text-secondary hover:text-text-dark'
              }`}
            >
              <span className="material-symbols-outlined text-sm">bookmark</span>
              <span>Pesan Penting / ACC ({importantCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('messages')}
              className={`pb-2.5 px-3.5 text-xs font-medium flex items-center gap-2 border-b-2 transition ${
                activeTab === 'messages'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-text-secondary hover:text-text-dark'
              }`}
            >
              <span className="material-symbols-outlined text-sm">chat_bubble</span>
              <span>Super Enkripsi Chat ({messagesCount})</span>
            </button>
          </div>

          {/* TAB 1: USER TABLE */}
          {activeTab === 'users' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold text-xs uppercase tracking-wider text-text-dark">
                  Kolom Sensitif Tabel User (fullNameEncrypted, passwordHash, dongleIdEncrypted)
                </h2>
              </div>

              {usersCount === 0 ? (
                <div className="p-8 rounded-xl bg-surface border border-sage-border text-center text-xs text-text-secondary">
                  Belum ada data user tersimpan.
                </div>
              ) : (
                data?.usersTable?.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 rounded-xl bg-surface border border-sage-border shadow-xs flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-primary">
                          @{user.username}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sage-tint border border-sage-border text-text-secondary">
                          {user.decryptedInApp.role || 'USER'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted">
                        ID #{user.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* RAW SQLITE */}
                      <div className="p-3.5 rounded-lg bg-canvas border border-sage-border flex flex-col gap-1.5">
                        <span className="font-mono text-[10px] font-semibold text-red-800 uppercase flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
                          Ciphertext Mentah di Disk SQLite
                        </span>
                        <div className="font-mono text-[10px] text-text-secondary flex flex-col gap-1 break-all">
                          <p>
                            <strong className="text-text-dark">fullNameEncrypted:</strong>{' '}
                            {user.rawInSqlite.fullNameEncrypted || '-'}
                          </p>
                          <p>
                            <strong className="text-text-dark">passwordHash:</strong>{' '}
                            {user.rawInSqlite.passwordHash ? `${user.rawInSqlite.passwordHash.slice(0, 48)}...` : '-'}
                          </p>
                          <p>
                            <strong className="text-text-dark">dongleIdEncrypted:</strong>{' '}
                            {user.rawInSqlite.dongleIdEncrypted || '-'}
                          </p>
                        </div>
                      </div>

                      {/* DECRYPTED IN APP */}
                      <div className="p-3.5 rounded-lg bg-emerald-50/40 border border-emerald-200 flex flex-col gap-1.5">
                        <span className="font-mono text-[10px] font-semibold text-emerald-800 uppercase flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                          Hasil Dekripsi Resmi di Aplikasi
                        </span>
                        <div className="text-xs text-emerald-950 flex flex-col gap-1">
                          <p>
                            <strong className="text-emerald-900">Nama Lengkap:</strong>{' '}
                            {user.decryptedInApp.fullName || user.username}
                          </p>
                          <p className="font-mono text-[11px]">
                            <strong className="text-emerald-900">Serial Dongle:</strong>{' '}
                            {user.decryptedInApp.dongleId || '-'}
                          </p>
                          <p className="font-mono text-[11px]">
                            <strong className="text-emerald-900">Catatan Rahasia:</strong>{' '}
                            {user.decryptedInApp.secretNote || '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: IMPORTANT MESSAGES */}
          {activeTab === 'important' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold text-xs uppercase tracking-wider text-text-dark">
                  Keputusan Akademik & Pesan Penting (Enkripsi Master AES-256-GCM + AAD)
                </h2>
              </div>

              {importantCount === 0 ? (
                <div className="p-8 rounded-xl bg-surface border border-sage-border text-center text-xs text-text-secondary">
                  Belum ada pesan penting yang tersimpan di basis data. Anda dapat menandai pesan bimbingan di menu Pesan Penting atau Ruang Bimbingan.
                </div>
              ) : (
                data?.importantMessagesTable?.map((imp) => (
                  <div
                    key={imp.id}
                    className="p-4 rounded-xl bg-surface border border-sage-border shadow-xs flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                            imp.category === 'ACC'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : imp.category?.includes('REVISI')
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}
                        >
                          {imp.category}
                        </span>
                        <span className="text-[11px] font-mono text-text-muted">
                          Ref Pesan #{imp.messageId} &bull; Oleh @{imp.markedBy}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted">
                        ID #{imp.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* RAW SQLITE */}
                      <div className="p-3.5 rounded-lg bg-canvas border border-sage-border flex flex-col gap-1.5">
                        <span className="font-mono text-[10px] font-semibold text-red-800 uppercase flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
                          Ciphertext Mentah di Kolom contentEnc
                        </span>
                        <div className="font-mono text-[10px] text-text-secondary flex flex-col gap-1 break-all">
                          <p>
                            <strong className="text-text-dark">Ciphertext:</strong>{' '}
                            {imp.rawInSqlite.contentEnc ? `${imp.rawInSqlite.contentEnc.slice(0, 70)}...` : '-'}
                          </p>
                          <p>
                            <strong className="text-text-dark">Nonce (IV):</strong> {imp.rawInSqlite.nonceHex}
                          </p>
                          <p>
                            <strong className="text-text-dark">Auth Tag GCM:</strong> {imp.rawInSqlite.authTagHex}
                          </p>
                        </div>
                      </div>

                      {/* DECRYPTED IN APP */}
                      <div className="p-3.5 rounded-lg bg-emerald-50/40 border border-emerald-200 flex flex-col gap-1.5">
                        <span className="font-mono text-[10px] font-semibold text-emerald-800 uppercase flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                          Plaintext Terdekripsi di Aplikasi
                        </span>
                        <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                          "{imp.decryptedInApp.contentPlain}"
                        </p>
                        <span className="text-[10px] font-mono text-text-muted mt-auto pt-1">
                          Waktu: {new Date(imp.markedAt).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: SECRET MESSAGES (SUPER ENCRYPTION) */}
          {activeTab === 'messages' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold text-xs uppercase tracking-wider text-text-dark">
                  Pesan Bimbingan Super Enkripsi (Vigenère + Kolom Transposisi + AES-256)
                </h2>
              </div>

              {messagesCount === 0 ? (
                <div className="p-8 rounded-xl bg-surface border border-sage-border text-center text-xs text-text-secondary">
                  Belum ada pesan bimbingan tersimpan. Kirim pesan di Ruang Bimbingan untuk melihat perbandingan.
                </div>
              ) : (
                data?.messagesTable?.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-4 rounded-xl bg-surface border border-sage-border shadow-xs flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-text-dark">
                          {msg.title || `Pesan #${msg.id}`}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sage-tint border border-sage-border text-primary font-semibold">
                          Mode: {msg.decryptedInApp.mode || 'CBC'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted">
                        ID #{msg.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* RAW SQLITE */}
                      <div className="p-3.5 rounded-lg bg-canvas border border-sage-border flex flex-col gap-1.5">
                        <span className="font-mono text-[10px] font-semibold text-red-800 uppercase flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
                          Payload 3-Lapis di SQLite
                        </span>
                        <div className="font-mono text-[10px] text-text-secondary flex flex-col gap-1 break-all">
                          <p>
                            <strong className="text-text-dark">Payload:</strong>{' '}
                            {msg.rawInSqlite.superCiphertextPayload
                              ? `${msg.rawInSqlite.superCiphertextPayload.slice(0, 80)}...`
                              : '-'}
                          </p>
                          <p>
                            <strong className="text-text-dark">Pengirim (Terkunci):</strong>{' '}
                            {msg.rawInSqlite.senderEncrypted
                              ? `${msg.rawInSqlite.senderEncrypted.slice(0, 40)}...`
                              : '-'}
                          </p>
                        </div>
                      </div>

                      {/* DECRYPTED IN APP */}
                      <div className="p-3.5 rounded-lg bg-emerald-50/40 border border-emerald-200 flex flex-col gap-1.5">
                        <span className="font-mono text-[10px] font-semibold text-emerald-800 uppercase flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                          Dekripsi Pengirim & Status
                        </span>
                        <p className="text-xs text-emerald-950 font-semibold">
                          Pengirim: {msg.decryptedInApp.sender}
                        </p>
                        <p className="text-[11px] text-text-secondary leading-relaxed">
                          Pesan ini diproteksi oleh 3 lapisan kriptografi berurutan (Extended Vigenère, Columnar Transposition, dan AES-256). Dekripsi teks penuh dapat diakses langsung oleh pihak bimbingan di Ruang Bimbingan.
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
