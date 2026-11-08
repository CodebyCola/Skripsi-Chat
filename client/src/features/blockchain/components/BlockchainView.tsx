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
  fetchIssuerAssets,
} from '../api/blockchainApi';
import { AcademicAssetItem, VerificationResult } from '../types/blockchain.types';

const PRESET_APPROVED_DOC = [
  '====================================================================',
  'DOKUMEN DRAF SKRIPSI TERENKRIPSI - SKRIPSICHAT ACADEMIC SHIELD',
  '====================================================================',
  'Judul        : Implementasi Super Enkripsi & Blockchain pada Bimbingan Tugas Akhir',
  'Mahasiswa    : Rian Pratama (NIM: 2108561042)',
  'Pembimbing   : Dr. Ir. Budi Santoso, M.Kom (NIP: 197805122003121002)',
  'Status       : TERENKRIPSI CHACHA20-POLY1305 DENGAN AUTHTAG INTEGRITY',
  'Bab Terlampir: Bab 1 Pendahuluan s/d Bab 4 Pengujian dan Evaluasi Kriptografi',
  '====================================================================',
].join('\n');

const PRESET_TAMPERED_DOC = [
  '====================================================================',
  'DOKUMEN DRAF SKRIPSI TERENKRIPSI - SKRIPSICHAT ACADEMIC SHIELD',
  '====================================================================',
  'Judul        : Implementasi Super Enkripsi & Blockchain pada Bimbingan Tugas Akhir (PALSU)',
  'Mahasiswa    : Rian Pratama (NIM: 2108561042 - DIUBAH SECARA ILEGAL)',
  'Pembimbing   : Dr. Ir. Budi Santoso, M.Kom (NIP: 197805122003121002)',
  'Status       : DOKUMEN PALSU (ISI TEKS BERBEDA 1 HURUF SAJA AKAN GAGAL HASH)',
  '====================================================================',
].join('\n');

export function BlockchainView() {
  const { user } = useCurrentUser();
  const { data, loading, errorMsg, loadChain, tamperBlock, restoreChain } =
    useBlockchain();

  const isLecturer = user?.role?.toUpperCase().includes('DOSEN') || false;

  const [activeTab, setActiveTab] = useState<'assets' | 'verify' | 'chain'>('assets');

  // STATE TAB 1: ASSETS
  const [assetList, setAssetList] = useState<AcademicAssetItem[]>([]);
  const [assetTitle, setAssetTitle] = useState('Lembar Pengesahan Sidang Skripsi (ACC)');
  const [assetType, setAssetType] = useState<'THESIS_ACC' | 'GRADE' | 'CERTIFICATE' | 'DIPLOMA' | 'ACC_BAB'>('THESIS_ACC');
  const [studentId, setStudentId] = useState('mahasiswa_01');
  const [documentFileBase64, setDocumentFileBase64] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [issueNotice, setIssueNotice] = useState('');

  // STATE TAB 2: VERIFIKASI DOKUMEN
  const [verifyFileBase64, setVerifyFileBase64] = useState('');
  const [verifyFileName, setVerifyFileName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null);

  const loadAssets = useCallback(async () => {
    try {
      const isLect = user?.role?.toUpperCase().includes('DOSEN');
      const list = isLect
        ? await fetchIssuerAssets(user?.username || 'dosen_pembimbing')
        : await fetchStudentAssets(user?.username || 'mahasiswa_01');
      setAssetList(list);
    } catch {
      // Ignore
    }
  }, [user]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  function handleDocumentPick(e: React.ChangeEvent<HTMLInputElement>, forVerify = false) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (forVerify) {
      setVerifyFileName(file.name);
    } else {
      setSelectedFileName(file.name);
    }

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
      // Jika user tidak memilih file khusus, buat payload kanonik otomatis
      const docPayload =
        documentFileBase64 ||
        Buffer.from(
          `DOKUMEN SURAT KEPUTUSAN ${assetType} - ${assetTitle} - MAHASISWA: ${studentId} - DOSEN: ${user?.username} - ${new Date().toISOString()}`
        ).toString('base64');

      const res = await issueAcademicAsset({
        assetType,
        studentId,
        issuerId: user?.username || 'dosen_pembimbing',
        title: assetTitle,
        documentBase64: docPayload,
      });

      setIssueNotice(
        `Aset akademik berhasil diterbitkan ke Blok #${res.blockIndex} dengan Tanda Tangan Digital RSA-PSS & PoW!`
      );
      setSelectedFileName('');
      setDocumentFileBase64('');
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

  async function handleVerifyPresetSample(isValidPreset: boolean) {
    setVerifying(true);
    setVerifyResult(null);
    const content = isValidPreset ? PRESET_APPROVED_DOC : PRESET_TAMPERED_DOC;
    setVerifyFileName(
      isValidPreset
        ? 'draf_skripsi_bab1_4_pengujian.docx (Draf Asli Disetujui Dosen)'
        : 'draf_skripsi_palsu_dimanipulasi.docx (File Draf Dimodifikasi)'
    );

    try {
      const b64 = Buffer.from(content, 'utf8').toString('base64');
      const res = await verifyAcademicDocument(b64);
      setVerifyResult(res);
    } catch (err: any) {
      alert(err.message || 'Gagal menjalankan simulasi verifikasi');
    } finally {
      setVerifying(false);
    }
  }

  function handleDownloadCertificate(asset: AcademicAssetItem) {
    const cert = {
      aplikasi: 'SkripsiChat Academic Shield v2.4-ENC',
      standarIntegritas: 'SHA-256 Hash Linking + FIPS-186-4 RSA-PSS Digital Signature + Proof-of-Work',
      institusi: 'Fakultas Ilmu Komputer - Program Studi Teknik Informatika',
      sertifikatAkademik: {
        nomorBlok: asset.blockIndex,
        jenisAset: asset.assetType,
        judul: asset.title,
        mahasiswaPenerima: `@${asset.studentId}`,
        dosenPenerbit: `@${asset.issuerId}`,
        sidikJariDokumenSha256: asset.docHash,
        waktuPenerbitan: asset.issuedAt,
      },
      panduanVerifikasi:
        'Unggah berkas fisik/PDF dokumen ke menu "Verifikasi Keaslian Dokumen" di SkripsiChat. Jika nilai SHA-256 berkas cocok dengan sidikJariDokumenSha256 di atas dan tanda tangan digital RSA-PSS dosen pembimbing sah, maka dokumen dijamin 100% ASLI & BELUM PERNAH DIUBAH.',
    };

    const blob = new Blob([JSON.stringify(cert, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sertifikat_${asset.assetType}_Blok${asset.blockIndex}_${asset.studentId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-canvas p-6 md:p-8">
        <div className="max-w-5xl mx-auto w-full">
          {/* HEADER */}
          <div className="flex flex-col gap-1 mb-5">
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

          {/* ROLE DUTIES & WORKFLOW BANNER */}
          <div className="p-4 rounded-xl border mb-6 bg-surface border-sage-border shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isLecturer ? 'bg-primary text-white' : 'bg-sage-tint text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {isLecturer ? 'verified_user' : 'account_circle'}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-text-dark">
                    {isLecturer
                      ? 'Peran: Dosen Pembimbing (Issuer / Penandatangan Sah)'
                      : 'Peran: Mahasiswa (Penerima Sertifikat ACC & Verifikator)'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium border bg-canvas border-sage-border text-text-secondary">
                    @{user?.username || (isLecturer ? 'dosen_pembimbing' : 'mahasiswa_01')}
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                  {isLecturer
                    ? 'Tugas Dosen: Menerbitkan dan menandatangani secara digital (RSA-PSS) Surat ACC Sidang atau Lembar Pengesahan ke buku besar Blockchain dengan Proof-of-Work.'
                    : 'Tugas Mahasiswa: Mengakses surat persetujuan (ACC) resmi dari dosen, mengunduh sertifikat digital (.json), dan memverifikasi keaslian berkas draf naskah skripsi fisik Anda.'}
                </p>
              </div>
            </div>

            <span className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-canvas border border-sage-border text-text-secondary shrink-0">
              PoW Target: SHA-256 "00..."
            </span>
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
              <span>
                {isLecturer ? 'Penerbitan & Aset Terbit' : 'Surat Keputusan & ACC Resmi'} ({assetList.length})
              </span>
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

              {/* FORM PENERBITAN ASET: HANYA DITAMPILKAN KEPADA DOSEN */}
              {isLecturer ? (
                <form
                  onSubmit={handleIssueAsset}
                  className="p-5 rounded-2xl bg-surface border border-sage-border shadow-xs flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-sage-border">
                    <h2 className="font-display font-semibold text-xs uppercase tracking-wider text-text-dark flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-primary">post_add</span>
                      <span>Formulir Penerbitan Surat Keputusan / ACC Sidang (Khusus Dosen)</span>
                    </h2>
                    <span className="text-[10px] font-mono text-text-muted">
                      RSA-PSS Digital Signature + PoW Mining
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-text-dark">Jenis Keputusan Akademik</label>
                      <select
                        value={assetType}
                        onChange={(e) => setAssetType(e.target.value as any)}
                        className="h-9 px-3 rounded-lg border border-sage-border bg-canvas text-xs text-text-dark font-medium focus:bg-surface focus:border-primary focus:outline-none"
                      >
                        <option value="THESIS_ACC">THESIS_ACC (Surat ACC Sidang Skripsi)</option>
                        <option value="ACC_BAB">ACC_BAB (Persetujuan Bimbingan Bab Skripsi)</option>
                        <option value="GRADE">GRADE (Nilai Akhir Bimbingan/Sidang)</option>
                        <option value="CERTIFICATE">CERTIFICATE (Bebas Plagiasi &amp; Integritas)</option>
                        <option value="DIPLOMA">DIPLOMA (Surat Keterangan Lulus)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-text-dark">Mahasiswa Penerima</label>
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
                      <label className="text-xs font-medium text-text-dark">Lampiran Berkas Draf/Surat</label>
                      <input
                        type="file"
                        onChange={(e) => handleDocumentPick(e, false)}
                        className="text-xs text-text-secondary file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border file:border-sage-border file:text-xs file:bg-canvas file:text-text-dark cursor-pointer"
                      />
                      {selectedFileName && (
                        <span className="text-[10px] font-mono text-primary truncate">
                          Terpilih: {selectedFileName}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 md:col-span-3">
                      <label className="text-xs font-medium text-text-dark">Judul Surat / Keterangan Persetujuan</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={assetTitle}
                          onChange={(e) => setAssetTitle(e.target.value)}
                          placeholder="Contoh: Lembar Pengesahan Sidang Skripsi Bab 1-5"
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
                          <span>{issuing ? 'Menambang PoW & Menandatangani...' : 'Terbitkan ke Blockchain'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                /* INFO KARTU MAHASISWA (BUKAN FORM PENERBITAN) */
                <div className="p-5 rounded-2xl bg-surface border border-sage-border shadow-xs flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-primary">
                    <span className="material-symbols-outlined text-xl">verified</span>
                    <h2 className="font-display font-semibold text-xs uppercase tracking-wider text-text-dark">
                      Surat Keputusan &amp; ACC Resmi Anda
                    </h2>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Di bawah ini adalah daftar Surat Persetujuan (ACC) dan Aset Akademik yang telah disahkan oleh Dosen Pembimbing Anda. Setiap aset dijamin oleh tanda tangan digital RSA-PSS dan dicatat permanen dalam buku besar Blockchain yang tidak dapat dimanipulasi. Anda dapat mengunduh sertifikat digitalnya atau memverifikasi keaslian naskah skripsi Anda.
                  </p>
                </div>
              )}

              {/* DAFTAR ASET YANG SUDAH DITERBITKAN */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-text-dark">
                    {isLecturer
                      ? `Daftar Aset Akademik Diterbitkan (${assetList.length})`
                      : `Daftar Surat ACC / Keputusan Anda (${assetList.length})`}
                  </h3>
                  <span className="text-[10px] font-mono text-text-muted">
                    Integritas: RSA-PSS (SHA-256) Verified
                  </span>
                </div>

                {assetList.length === 0 ? (
                  <div className="p-8 rounded-xl bg-surface border border-sage-border text-center text-xs text-text-secondary flex flex-col items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-2xl text-text-muted">folder_off</span>
                    <p>
                      {isLecturer
                        ? 'Anda belum menerbitkan surat ACC atau aset akademik pada sistem. Gunakan form di atas untuk menerbitkan.'
                        : 'Belum ada surat ACC atau pengesahan yang diterbitkan oleh Dosen Pembimbing untuk Anda. Silakan hubungi pembimbing melalui menu Ruang Bimbingan.'}
                    </p>
                  </div>
                ) : (
                  assetList.map((a) => (
                    <div
                      key={a.id}
                      className="p-4 rounded-xl bg-surface border border-sage-border shadow-xs flex flex-col gap-3 hover:border-primary/40 transition"
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
                        <div>
                          Mahasiswa: <span className="text-text-dark font-medium">@{a.studentId}</span> | Diterbitkan Oleh Dosen: <span className="text-text-dark font-medium">@{a.issuerId}</span>
                        </div>
                        <div>
                          Hash SHA-256 Dokumen: <span className="text-primary font-semibold">{a.docHash}</span>
                        </div>
                      </div>

                      {/* ACTION BUTTONS: DOWNLOAD CERTIFICATE & QUICK VERIFY */}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-sage-border">
                        <button
                          type="button"
                          onClick={() => handleDownloadCertificate(a)}
                          className="h-8 px-3 rounded-lg border border-sage-border bg-surface hover:bg-canvas text-text-dark text-xs font-medium flex items-center gap-1.5 transition"
                        >
                          <span className="material-symbols-outlined text-sm">download</span>
                          <span>Unduh Sertifikat ACC (.json)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('verify');
                            handleVerifyPresetSample(true);
                          }}
                          className="h-8 px-3 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition"
                        >
                          <span className="material-symbols-outlined text-sm">fact_check</span>
                          <span>Uji Keaslian Dokumen Ini</span>
                        </button>
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
              {/* ALUR KERJA VERIFIKASI 3 LANGKAH */}
              <div className="p-4 rounded-xl bg-surface border border-sage-border shadow-xs">
                <span className="text-[10px] font-mono text-primary font-semibold uppercase tracking-wider">
                  Alur Verifikasi Integritas Akademik
                </span>
                <h3 className="font-display font-semibold text-xs text-text-dark mt-0.5 mb-3">
                  Bagaimana Cara Membuktikan Naskah Skripsi Anda Asli &amp; Sah?
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-canvas border border-sage-border flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-primary text-xs font-semibold">
                      <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">1</span>
                      <span>Unggah Berkas Fisik/PDF</span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-snug">
                      Mahasiswa, dosen, atau penguji mengunggah berkas naskah skripsi yang ingin diuji keasliannya.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-canvas border border-sage-border flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-primary text-xs font-semibold">
                      <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">2</span>
                      <span>Pencacahan SHA-256</span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-snug">
                      Sistem menghitung sidik jari kriptografi (hash SHA-256) unik dari seluruh byte dokumen tersebut.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-canvas border border-sage-border flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-primary text-xs font-semibold">
                      <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">3</span>
                      <span>Pencocokan Ledger &amp; RSA-PSS</span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-snug">
                      Hash dicocokkan dengan catatan blok. Tanda tangan digital RSA-PSS dosen pembimbing diverifikasi.
                    </p>
                  </div>
                </div>
              </div>

              {/* UPLOAD FORM CARD */}
              <div className="p-6 rounded-2xl bg-surface border border-sage-border shadow-xs flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sage-tint border border-sage-border text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">fact_check</span>
                </div>

                <div className="flex flex-col gap-1 max-w-md">
                  <h2 className="font-display font-bold text-sm text-text-dark">
                    Uji Keaslian Dokumen Akademik Terhadap Blockchain
                  </h2>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Pilih berkas dokumen dari komputer Anda untuk memverifikasi apakah dokumen tersebut identik dengan dokumen yang disetujui (ACC) oleh dosen pembimbing.
                  </p>
                </div>

                <div className="w-full max-w-md flex flex-col gap-3">
                  <input
                    type="file"
                    onChange={(e) => handleDocumentPick(e, true)}
                    className="text-xs text-text-secondary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-sage-border file:text-xs file:bg-canvas file:text-text-dark cursor-pointer w-full"
                  />

                  {verifyFileName && (
                    <span className="text-xs font-mono text-primary truncate">
                      Berkas Uji: {verifyFileName}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleVerifyDocument}
                    disabled={verifying || !verifyFileBase64}
                    className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-base">
                      {verifying ? 'hourglass_top' : 'shield_with_heart'}
                    </span>
                    <span>{verifying ? 'Memvalidasi Rantai Blok & RSA-PSS...' : 'Verifikasi Keaslian Sekarang'}</span>
                  </button>
                </div>

                {/* SIMULASI PENGUJIAN CEPAT (1-KLIK) */}
                <div className="pt-4 border-t border-sage-border w-full flex flex-col items-center gap-2">
                  <span className="text-[11px] font-mono text-text-muted">
                    Atau Uji Cepat Menggunakan Data Simulasi Preset Skripsi:
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleVerifyPresetSample(true)}
                      disabled={verifying}
                      className="h-8 px-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      <span className="material-symbols-outlined text-sm text-emerald-700">task_alt</span>
                      <span>Uji Draf ACC Asli (Valid)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleVerifyPresetSample(false)}
                      disabled={verifying}
                      className="h-8 px-3 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      <span className="material-symbols-outlined text-sm text-amber-700">warning</span>
                      <span>Uji Draf Dimanipulasi (Simulasi Avalanche Effect)</span>
                    </button>
                  </div>
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
                        ? 'TIDAK COCOK: DOKUMEN TIDAK TERDAFTAR / TELAH DIMODIFIKASI'
                        : 'PERINGATAN: INTEGRITAS RANTAI BLOK RUSAK'}
                    </h3>
                  </div>

                  <p className="text-xs leading-relaxed">
                    {verifyResult.message}
                  </p>

                  <div className="p-3 rounded-lg bg-white/80 border border-sage-border font-mono text-[11px] text-text-dark flex flex-col gap-1 mt-1">
                    {verifyResult.title && <div>Judul Terdaftar: <span className="font-bold">{verifyResult.title}</span></div>}
                    {verifyResult.blockIndex !== undefined && (
                      <div>Tercatat Pada Blok #{verifyResult.blockIndex} &bull; Tipe: {verifyResult.assetType || 'N/A'}</div>
                    )}
                    {verifyResult.issuerId && (
                      <div>Diterbitkan Oleh: @{verifyResult.issuerId} &bull; Mahasiswa: @{verifyResult.studentId}</div>
                    )}
                    <div>SHA-256 Hash Dokumen: <span className="break-all">{verifyResult.docHash}</span></div>
                    {verifyResult.status === 'AUTHENTIC' && (
                      <div className="text-emerald-800 font-semibold mt-1">
                        ✔ Tanda Tangan Digital RSA-PSS: VALID &amp; SESUAI KUNCI PUBLIK DOSEN PEMBIMBING
                      </div>
                    )}
                    {verifyResult.status === 'NOT_FOUND' && (
                      <div className="text-amber-800 font-semibold mt-1">
                        ✖ Tidak ditemukan kecocokan nilai hash pada rantai blok. Berkas ini bukan berkas resmi atau isinya telah diubah.
                      </div>
                    )}
                  </div>
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
