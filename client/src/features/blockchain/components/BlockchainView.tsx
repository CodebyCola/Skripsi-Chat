'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/features/dashboard';
import { useCurrentUser } from '@/features/dashboard/hooks/useCurrentUser';
import { useBlockchain } from '../hooks/useBlockchain';
import { BlockCard } from './BlockCard';
import { BlockchainControls } from './BlockchainControls';
import { BlockchainStatusBanner } from './BlockchainStatusBanner';
import {
  issueAcademicAsset,
  verifyAcademicDocument,
  fetchStudentAssets,
} from '../api/blockchainApi';
import { AcademicAssetItem, VerificationResult } from '../types/blockchain.types';

export function BlockchainView() {
  const { user } = useCurrentUser();
  const { data, loading, errorMsg, loadChain, tamperBlock, restoreChain } =
    useBlockchain();

  const [activeTab, setActiveTab] = useState<'assets' | 'verify' | 'chain'>('assets');

  // STATE TAB 1: ASSETS
  const [assetList, setAssetList] = useState<AcademicAssetItem[]>([]);
  const [assetTitle, setAssetTitle] = useState('Lembar Pengesahan Sidang Skripsi (ACC)');
  const [assetType, setAssetType] = useState<'THESIS_ACC' | 'GRADE' | 'CERTIFICATE' | 'DIPLOMA'>('THESIS_ACC');
  const [studentId, setStudentId] = useState('mahasiswa_01');
  const [documentFileBase64, setDocumentFileBase64] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [issueNotice, setIssueNotice] = useState('');

  // STATE TAB 2: VERIFIKASI DOKUMEN
  const [verifyFileBase64, setVerifyFileBase64] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null);

  const loadAssets = useCallback(async () => {
    try {
      const targetUser = user?.username || 'mahasiswa_01';
      const list = await fetchStudentAssets(targetUser);
      setAssetList(list);
    } catch {
      // Empty
    }
  }, [user]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  function handleDocumentPick(e: React.ChangeEvent<HTMLInputElement>, forVerify = false) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1] || (reader.result as string);
      if (forVerify) {
        setVerifyFileBase64(base64);
      } else {
        setDocumentFileBase64(base64);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleIssueAsset(e: React.FormEvent) {
    e.preventDefault();
    setIssueNotice('');
    setIssuing(true);

    try {
      // Jika user tidak memilih file khusus, buat payload teks kanonik otomatis
      const docPayload = documentFileBase64 || Buffer.from(`DOKUMEN SURAT KEPUTUSAN ${assetType} - ${assetTitle} - ${new Date().toISOString()}`).toString('base64');

      const res = await issueAcademicAsset({
        assetType,
        studentId,
        issuerId: user?.username || 'dosen_pembimbing',
        title: assetTitle,
        documentBase64: docPayload,
      });

      setIssueNotice(`Aset akademik berhasil diterbitkan ke Blok #${res.blockIndex} dengan Tanda Tangan Digital RSA-PSS & PoW!`);
      await loadChain();
      await loadAssets();
    } catch (err: any) {
      setIssueNotice(`Gagal menerbitkan aset: ${err.message}`);
    } finally {
      setIssuing(false);
    }
  }

  async function handleVerifyDocument() {
    if (!verifyFileBase64) {
      alert('Silakan pilih berkas dokumen yang ingin diverifikasi keasliannya.');
      return;
    }

    setVerifying(true);
    setVerifyResult(null);

    try {
      const res = await verifyAcademicDocument(verifyFileBase64);
      setVerifyResult(res);
    } catch (err: any) {
      alert(err.message || 'Gagal memverifikasi dokumen');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-canvas p-6 md:p-8">
        <div className="max-w-5xl mx-auto w-full">
          {/* HEADER */}
          <div className="flex flex-col gap-1 mb-6">
            <span className="text-[11px] font-mono text-primary font-semibold uppercase tracking-wider">
              Kriteria #7: Aset Penting Diamankan Teknologi Blockchain Sederhana
            </span>
            <h1 className="font-display font-bold text-lg text-text-dark">
              Buku Konsultasi &amp; Ledger Blockchain SHA-256
            </h1>
            <p className="text-xs text-text-secondary leading-relaxed">
              Penerbitan surat ACC sidang, nilai skripsi, dan catatan integritas bimbingan dicatat ke dalam buku besar berantai SHA-256 dengan Proof-of-Work dan Tanda Tangan Digital RSA-PSS Dosen Pembimbing.
            </p>
          </div>

          {/* TAB BAR */}
          <div className="flex items-center gap-2 border-b border-sage-border pb-3 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('assets')}
              className={`h-8 px-4 rounded-lg text-xs font-medium flex items-center gap-2 transition ${
                activeTab === 'assets'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface text-text-secondary hover:text-text-dark border border-sage-border'
              }`}
            >
              <span className="material-symbols-outlined text-base">verified</span>
              <span>Aset Akademik &amp; Surat ACC ({assetList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('verify')}
              className={`h-8 px-4 rounded-lg text-xs font-medium flex items-center gap-2 transition ${
                activeTab === 'verify'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface text-text-secondary hover:text-text-dark border border-sage-border'
              }`}
            >
              <span className="material-symbols-outlined text-base">fact_check</span>
              <span>Verifikasi Keaslian Dokumen</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('chain')}
              className={`h-8 px-4 rounded-lg text-xs font-medium flex items-center gap-2 transition ${
                activeTab === 'chain'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface text-text-secondary hover:text-text-dark border border-sage-border'
              }`}
            >
              <span className="material-symbols-outlined text-base">link</span>
              <span>Rantai Blok &amp; Audit Tamper ({data?.blocks?.length || 0})</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 mb-5">
              {errorMsg}
            </div>
          )}

          {/* ================= TAB 1: ASSETS & ISSUE ================= */}
          {activeTab === 'assets' && (
            <div className="flex flex-col gap-6">
              {issueNotice && (
                <div className="p-3.5 rounded-xl bg-sage-tint border border-sage-border text-xs text-text-dark flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-primary">
                    check_circle
                  </span>
                  <span>{issueNotice}</span>
                </div>
              )}

              {/* FORM PENERBITAN ASET OLEH DOSEN */}
              <form
                onSubmit={handleIssueAsset}
                className="p-5 rounded-2xl bg-surface border border-sage-border shadow-xs flex flex-col gap-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-sage-border">
                  <h2 className="font-display font-semibold text-xs uppercase tracking-wider text-text-dark flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-primary">post_add</span>
                    <span>Penerbitan Surat Keputusan / ACC Sidang ke Blockchain</span>
                  </h2>
                  <span className="text-[10px] font-mono text-text-muted">
                    RSA-PSS Digital Signature + PoW Mining
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-text-dark">Jenis Aset</label>
                    <select
                      value={assetType}
                      onChange={(e) => setAssetType(e.target.value as any)}
                      className="h-9 px-3 rounded-lg border border-sage-border bg-canvas text-xs text-text-dark font-medium focus:bg-surface focus:border-primary focus:outline-none"
                    >
                      <option value="THESIS_ACC">THESIS_ACC (Surat ACC Sidang)</option>
                      <option value="GRADE">GRADE (Nilai Akhir Skripsi)</option>
                      <option value="CERTIFICATE">CERTIFICATE (Surat Bebas Plagiasi)</option>
                      <option value="DIPLOMA">DIPLOMA (Surat Keterangan Lulus)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-text-dark">Penerima (Username Mahasiswa)</label>
                    <input
                      type="text"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="Username mahasiswa..."
                      required
                      className="h-9 px-3 rounded-lg border border-sage-border bg-canvas text-xs text-text-dark font-mono focus:bg-surface focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-text-dark">Lampirkan Berkas Dokumen Asli</label>
                    <input
                      type="file"
                      onChange={(e) => handleDocumentPick(e, false)}
                      className="text-xs text-text-secondary file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border file:border-sage-border file:text-xs file:bg-canvas file:text-text-dark cursor-pointer"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-3">
                    <label className="text-xs font-medium text-text-dark">Judul Surat / Keterangan Aset</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={assetTitle}
                        onChange={(e) => setAssetTitle(e.target.value)}
                        placeholder="Judul aset..."
                        required
                        className="flex-1 h-9 px-3 rounded-lg border border-sage-border bg-canvas text-xs text-text-dark focus:bg-surface focus:border-primary focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={issuing}
                        className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition shrink-0 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-base">
                          {issuing ? 'hourglass_top' : 'verified'}
                        </span>
                        <span>{issuing ? 'Menambang Blok...' : 'Terbitkan ke Blockchain'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* DAFTAR ASET YANG SUDAH DITERBITKAN */}
              <div className="flex flex-col gap-3">
                <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-text-dark">
                  Daftar Aset Akademik Terbit ({assetList.length})
                </h3>

                {assetList.length === 0 ? (
                  <div className="p-8 rounded-xl bg-surface border border-sage-border text-center text-xs text-text-secondary">
                    Belum ada aset akademik terdaftar untuk akun ini. Dosen dapat menerbitkan surat ACC sidang pada form di atas.
                  </div>
                ) : (
                  assetList.map((a) => (
                    <div
                      key={a.id}
                      className="p-4 rounded-xl bg-surface border border-sage-border shadow-xs flex flex-col gap-2 hover:border-primary/40 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {a.assetType}
                          </span>
                          <span className="text-[11px] font-mono text-primary font-bold">
                            Tercatat di Blok #{a.blockIndex}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-text-muted">
                          {new Date(a.issuedAt).toLocaleString('id-ID')}
                        </span>
                      </div>

                      <h4 className="font-semibold text-xs text-text-dark">
                        {a.title}
                      </h4>

                      <div className="p-2.5 rounded-lg bg-canvas border border-sage-border font-mono text-[10px] text-text-secondary flex flex-col gap-1 break-all">
                        <div>Mahasiswa: @{a.studentId} | Diterbitkan Oleh Dosen: @{a.issuerId}</div>
                        <div>SHA-256 Dokumen: <span className="text-text-dark">{a.docHash}</span></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 2: VERIFIKASI DOKUMEN ================= */}
          {activeTab === 'verify' && (
            <div className="flex flex-col gap-6">
              <div className="p-6 rounded-2xl bg-surface border border-sage-border shadow-xs flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sage-tint border border-sage-border text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">fact_check</span>
                </div>

                <div className="flex flex-col gap-1 max-w-md">
                  <h2 className="font-display font-bold text-sm text-text-dark">
                    Verifikasi Keaslian Dokumen Akademik
                  </h2>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Unggah surat ACC sidang, naskah PDF, atau berkas kelulusan untuk mencocokkan nilai hash SHA-256 dan tanda tangan digital penerbit terhadap rantai blok.
                  </p>
                </div>

                <div className="w-full max-w-md flex flex-col gap-3">
                  <input
                    type="file"
                    onChange={(e) => handleDocumentPick(e, true)}
                    className="text-xs text-text-secondary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-sage-border file:text-xs file:bg-canvas file:text-text-dark cursor-pointer w-full"
                  />

                  <button
                    type="button"
                    onClick={handleVerifyDocument}
                    disabled={verifying || !verifyFileBase64}
                    className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-base">
                      {verifying ? 'hourglass_top' : 'shield_with_heart'}
                    </span>
                    <span>{verifying ? 'Memvalidasi Rantai Blok...' : 'Verifikasi Keaslian Sekarang'}</span>
                  </button>
                </div>
              </div>

              {/* HASIL VERIFIKASI */}
              {verifyResult && (
                <div
                  className={`p-5 rounded-2xl border shadow-xs flex flex-col gap-3 ${
                    verifyResult.status === 'AUTHENTIC'
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                      : verifyResult.status === 'NOT_FOUND'
                      ? 'bg-amber-50/50 border-amber-200 text-amber-950'
                      : 'bg-red-50/60 border-red-200 text-red-950'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-2xl">
                      {verifyResult.status === 'AUTHENTIC'
                        ? 'verified'
                        : verifyResult.status === 'NOT_FOUND'
                        ? 'search_off'
                        : 'report'}
                    </span>
                    <h3 className="font-display font-bold text-sm">
                      {verifyResult.status === 'AUTHENTIC'
                        ? 'DOKUMEN ASLI & TERVERIFIKASI SAH'
                        : verifyResult.status === 'NOT_FOUND'
                        ? 'TIDAK COCOK: DOKUMEN TIDAK TERDAFTAR'
                        : 'PERINGATAN: INTEGRITAS RANTAI BLOK RUSAK'}
                    </h3>
                  </div>

                  <p className="text-xs leading-relaxed">
                    {verifyResult.message}
                  </p>

                  {verifyResult.status === 'AUTHENTIC' && (
                    <div className="p-3 rounded-lg bg-white/80 border border-emerald-200 font-mono text-[11px] text-text-dark flex flex-col gap-1 mt-1">
                      <div>Judul: <span className="font-bold">{verifyResult.title}</span></div>
                      <div>Tercatat Pada Blok #{verifyResult.blockIndex} &bull; Tipe: {verifyResult.assetType}</div>
                      <div>Diterbitkan Oleh: @{verifyResult.issuerId} &bull; Mahasiswa: @{verifyResult.studentId}</div>
                      <div>SHA-256 Hash: {verifyResult.docHash}</div>
                      <div className="text-emerald-800 font-semibold mt-1">
                        Tanda Tangan Digital RSA-PSS: VALID &amp; SESUAI KUNCI PUBLIK DOSEN
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: BLOCKS & TAMPER SIMULATION ================= */}
          {activeTab === 'chain' && (
            <div className="flex flex-col">
              <BlockchainStatusBanner validation={data?.validation} />

              <BlockchainControls
                loading={loading}
                onVerify={loadChain}
                onTamper={() => tamperBlock(1)}
                onRestore={restoreChain}
              />

              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-semibold text-xs uppercase tracking-wider text-text-dark">
                  Daftar Blok Berantai ({data?.blocks?.length || 0})
                </h2>
                <span className="text-[10px] font-mono text-text-muted">
                  PoW Target: SHA-256 diawali "00"
                </span>
              </div>

              {data?.blocks?.map((b, idx) => (
                <BlockCard
                  key={b.index}
                  block={b}
                  detail={data.validation?.details?.[idx]}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
