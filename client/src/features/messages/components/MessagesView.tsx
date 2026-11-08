'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/features/dashboard';
import { useCurrentUser } from '@/features/dashboard/hooks/useCurrentUser';
import {
  fetchImportantMessages,
  markImportant,
  unmarkImportant,
  fetchDbRawInspection,
  ImportantMessageItem,
  DbRawInspectionData,
} from '../api/vaultApi';

export function MessagesView() {
  const { user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<'vault' | 'db-inspector'>('vault');

  // STATE TAB 1: VAULT PESAN PENTING
  const [importantList, setImportantList] = useState<ImportantMessageItem[]>([]);
  const [newContent, setNewContent] = useState('');
  const [category, setCategory] = useState<'ACC' | 'REVISI' | 'JADWAL_SIDANG'>('ACC');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  // STATE TAB 2: DB INSPECTOR
  const [dbData, setDbData] = useState<DbRawInspectionData | null>(null);
  const [dbLoading, setDbLoading] = useState(false);

  const loadImportant = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchImportantMessages();
      setImportantList(data);
    } catch {
      // Server offline / empty
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDbInspection = useCallback(async () => {
    try {
      setDbLoading(true);
      const data = await fetchDbRawInspection();
      setDbData(data);
    } catch {
      // Server offline
    } finally {
      setDbLoading(false);
    }
  }, []);

  useEffect(() => {
    loadImportant();
    loadDbInspection();
  }, [loadImportant, loadDbInspection]);

  async function handleAddImportant(e: React.FormEvent) {
    e.preventDefault();
    if (!newContent.trim()) return;

    try {
      setNotice('');
      const randomMsgId = Math.floor(1000 + Math.random() * 9000);
      await markImportant({
        messageId: randomMsgId,
        category,
        plainContent: newContent.trim(),
        markedBy: user?.fullName || user?.username || 'dosen_pembimbing',
        convId: 1,
      });
      setNewContent('');
      setNotice(`Pesan penting berhasil dienkripsi per-kolom (AES-256-GCM) ke basis data!`);
      await loadImportant();
      await loadDbInspection();
    } catch (err: any) {
      setNotice(err.message || 'Gagal menandai pesan');
    }
  }

  async function handleUnmark(messageId: number) {
    if (!confirm('Hapus tanda penting dari brankas database?')) return;
    try {
      await unmarkImportant(messageId, user?.fullName || 'dosen_pembimbing');
      await loadImportant();
      await loadDbInspection();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus tanda penting');
    }
  }

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-canvas p-6 md:p-8">
        <div className="max-w-5xl mx-auto w-full">
          {/* HEADER */}
          <div className="flex flex-col gap-1 mb-6">
            <span className="text-[11px] font-mono text-primary font-semibold uppercase tracking-wider">
              Kriteria #5: Pesan Penting Dienkripsi Pada Basis Data (AES-256-GCM)
            </span>
            <h1 className="font-display font-bold text-lg text-text-dark">
              Brankas Pesan Penting &amp; Inspeksi Basis Data
            </h1>
            <p className="text-xs text-text-secondary leading-relaxed">
              Pesan krusial (ACC sidang, revisi mayor, dan jadwal) disimpan terenkripsi per kolom di SQLite menggunakan AES-256-GCM dengan kunci master server (<span className="font-mono text-primary font-semibold">K_master_db</span>) di luar database.
            </p>
          </div>

          {/* TAB CONTROLS */}
          <div className="flex items-center gap-2 border-b border-sage-border pb-3 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('vault')}
              className={`h-8 px-4 rounded-lg text-xs font-medium flex items-center gap-2 transition ${
                activeTab === 'vault'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface text-text-secondary hover:text-text-dark border border-sage-border'
              }`}
            >
              <span className="material-symbols-outlined text-base">bookmark</span>
              <span>Daftar Pesan Penting ({importantList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('db-inspector')}
              className={`h-8 px-4 rounded-lg text-xs font-medium flex items-center gap-2 transition ${
                activeTab === 'db-inspector'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface text-text-secondary hover:text-text-dark border border-sage-border'
              }`}
            >
              <span className="material-symbols-outlined text-base">table_view</span>
              <span>Inspeksi Mentah SQLite (Proof of Encryption)</span>
            </button>
          </div>

          {notice && (
            <div className="p-3.5 rounded-xl bg-sage-tint border border-sage-border text-xs text-text-dark mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-primary">
                check_circle
              </span>
              <span>{notice}</span>
            </div>
          )}

          {/* ================= TAB 1: VAULT PESAN PENTING ================= */}
          {activeTab === 'vault' && (
            <div className="flex flex-col gap-6">
              {/* FORM TAMBAH PESAN PENTING */}
              <form
                onSubmit={handleAddImportant}
                className="p-5 rounded-2xl bg-surface border border-sage-border shadow-xs flex flex-col gap-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-sage-border">
                  <h2 className="font-display font-semibold text-xs uppercase tracking-wider text-text-dark flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-primary">bookmark_add</span>
                    <span>Tandai Catatan / Keputusan Sidang Penting</span>
                  </h2>
                  <span className="text-[10px] font-mono text-text-muted">
                    AES-256-GCM + AAD Binding
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5 md:col-span-1">
                    <label className="text-xs font-medium text-text-dark">Kategori Keputusan</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="h-9 px-3 rounded-lg border border-sage-border bg-canvas text-xs text-text-dark font-medium focus:bg-surface focus:border-primary focus:outline-none"
                    >
                      <option value="ACC">ACC (Persetujuan Sidang)</option>
                      <option value="REVISI">REVISI (Catatan Revisi)</option>
                      <option value="REVISI_PENTING">REVISI_PENTING (Catatan Revisi Krusial)</option>
                      <option value="JADWAL_SIDANG">JADWAL_SIDANG (Batas Waktu/Target)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs font-medium text-text-dark">Isi Catatan Keputusan</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="Contoh: Draf naskah Bab 4 & 5 disetujui untuk maju seminar hasil."
                        className="flex-1 h-9 px-3 rounded-lg border border-sage-border bg-canvas text-xs text-text-dark focus:bg-surface focus:border-primary focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition shrink-0"
                      >
                        <span className="material-symbols-outlined text-base">save</span>
                        <span>Simpan Penting</span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* DAFTAR PESAN PENTING */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-text-dark">
                    Daftar Keputusan Akademik Terdaftar ({importantList.length})
                  </h3>
                  <button
                    type="button"
                    onClick={loadImportant}
                    className="text-[11px] font-mono text-primary hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">refresh</span>
                    <span>Muat Ulang</span>
                  </button>
                </div>

                {loading ? (
                  <p className="text-xs text-text-secondary">Memuat brankas penting...</p>
                ) : importantList.length === 0 ? (
                  <div className="p-8 rounded-xl bg-surface border border-sage-border text-center text-xs text-text-secondary">
                    Belum ada pesan penting yang ditandai. Anda dapat menandai pesan lewat form di atas atau via tombol "Penting" pada gelembung Ruang Bimbingan.
                  </div>
                ) : (
                  importantList.map((imp) => (
                    <div
                      key={imp.id}
                      className="p-4 rounded-xl bg-surface border border-sage-border shadow-xs flex flex-col gap-2 hover:border-primary/40 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
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
                            Ref Pesan #{imp.messageId}
                          </span>
                          <span className="text-[11px] font-mono text-text-secondary">
                            &bull; Oleh: {imp.markedBy}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleUnmark(imp.messageId)}
                          title="Hapus tanda penting"
                          className="p-1 rounded text-text-secondary hover:text-red-600 hover:bg-canvas transition"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>

                      <p className="text-xs text-text-dark font-medium leading-relaxed">
                        {imp.contentPlain}
                      </p>

                      <div className="pt-2 border-t border-sage-border flex items-center justify-between text-[10px] font-mono text-text-muted">
                        <span>Waktu: {new Date(imp.markedAt).toLocaleString('id-ID')}</span>
                        <span className="text-primary font-semibold">Terenkripsi AES-256-GCM di SQLite</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 2: INSPEKSI MENTAH SQLITE ================= */}
          {activeTab === 'db-inspector' && (
            <div className="flex flex-col gap-6">
              <div className="p-4 rounded-xl bg-surface border border-sage-border flex items-center justify-between">
                <div>
                  <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-text-dark">
                    Bukti Enkripsi Kolom Database-at-Rest
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Membandingkan nilai hex ciphertext yang benar-benar tersimpan di file SQLite vs hasil dekripsi aplikasi secara real-time.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadDbInspection}
                  disabled={dbLoading}
                  className="h-8 px-3 rounded-lg border border-sage-border bg-canvas hover:bg-surface text-text-dark text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <span className={`material-symbols-outlined text-sm ${dbLoading ? 'animate-spin' : ''}`}>
                    refresh
                  </span>
                  <span>{dbLoading ? 'Memeriksa...' : 'Refresh DB'}</span>
                </button>
              </div>

              {/* 1. TABEL IMPORTANT MESSAGE */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold text-text-dark font-mono uppercase">
                  Tabel: ImportantMessage (Kolom contentEnc)
                </h4>
                <div className="overflow-x-auto rounded-xl border border-sage-border bg-surface">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-canvas border-b border-sage-border text-[11px] font-mono text-text-secondary">
                      <tr>
                        <th className="p-3">ID / Kat</th>
                        <th className="p-3">Ciphertext Mentah di SQLite (AES-256-GCM)</th>
                        <th className="p-3">Nonce / Tag Hex</th>
                        <th className="p-3">Plaintext Terdekripsi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sage-border">
                      {dbData?.importantMessagesTable?.map((row) => (
                        <tr key={row.id} className="hover:bg-canvas/50">
                          <td className="p-3 font-mono">
                            <span className="font-semibold text-primary">#{row.id}</span>
                            <br />
                            <span className="text-[10px] text-text-muted">{row.category}</span>
                          </td>
                          <td className="p-3 font-mono text-[10px] text-red-700 max-w-xs break-all">
                            {row.rawInSqlite.contentEnc.slice(0, 32)}...
                          </td>
                          <td className="p-3 font-mono text-[10px] text-text-secondary">
                            N: {row.rawInSqlite.nonceHex?.slice(0, 8)}...
                            <br />
                            T: {row.rawInSqlite.authTagHex?.slice(0, 8)}...
                          </td>
                          <td className="p-3 font-sans font-medium text-emerald-900 max-w-sm">
                            {row.decryptedInApp.contentPlain}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. TABEL USER SENSITIVE COLUMNS */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold text-text-dark font-mono uppercase">
                  Tabel: User (fullNameEncrypted, passwordHash, dongleIdEncrypted)
                </h4>
                <div className="overflow-x-auto rounded-xl border border-sage-border bg-surface">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-canvas border-b border-sage-border text-[11px] font-mono text-text-secondary">
                      <tr>
                        <th className="p-3">Username</th>
                        <th className="p-3">Password Hash (Scrypt + Salt)</th>
                        <th className="p-3">Nama di SQLite vs Terdekripsi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sage-border">
                      {dbData?.usersTable?.map((u) => (
                        <tr key={u.id} className="hover:bg-canvas/50">
                          <td className="p-3 font-mono font-semibold text-text-dark">
                            @{u.username}
                          </td>
                          <td className="p-3 font-mono text-[10px] text-text-secondary max-w-xs break-all">
                            {u.rawInSqlite.passwordHash.slice(0, 36)}...
                          </td>
                          <td className="p-3 text-[11px]">
                            <span className="font-mono text-red-700 text-[10px] block break-all">
                              {u.rawInSqlite.fullNameEncrypted.slice(0, 24)}...
                            </span>
                            <span className="font-semibold text-emerald-900 block mt-0.5">
                              {u.decryptedInApp.fullName}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
