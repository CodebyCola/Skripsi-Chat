'use client';

import React from 'react';
import { DashboardLayout } from '@/features/dashboard';
import { useCurrentUser } from '@/features/dashboard/hooks/useCurrentUser';
import { useFiles } from '../hooks/useFiles';
import { FileItemCard } from './FileItemCard';
import { FileUploadCard } from './FileUploadCard';

export function FilesView() {
  const { user } = useCurrentUser();
  const {
    passphrase,
    setPassphrase,
    files,
    notice,
    loading,
    handleFileUpload,
    handleDecryptFile,
    handleReviewFile,
  } = useFiles();

  const isLecturer = user?.role?.toUpperCase().includes('DOSEN') || false;

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-canvas p-6 md:p-8">
        <div className="max-w-5xl mx-auto w-full">
          {/* HEADER */}
          <div className="flex flex-col gap-1 mb-6">
            <span className="text-[11px] font-mono text-primary font-semibold uppercase tracking-wider">
              Kriteria #4: Enkripsi Berkas Berbeda (ChaCha20-Poly1305)
            </span>
            <h1 className="font-display font-bold text-lg text-text-dark">
              Naskah &amp; Berkas Bimbingan Terenkripsi
            </h1>
            <p className="text-xs text-text-secondary leading-relaxed">
              Berkas naskah skripsi dienkripsi menggunakan stream cipher ChaCha20-Poly1305 dengan kunci terpisah dari pesan teks. Dilengkapi penelaahan dosen dan verifikasi keutuhan berkas asli (SHA-256).
            </p>
          </div>

          {/* ROLE WORKFLOW BANNER */}
          <div className="p-3.5 rounded-xl border mb-5 flex items-center justify-between text-xs bg-surface border-sage-border shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isLecturer ? 'bg-primary text-white' : 'bg-sage-tint text-primary'}`}>
                <span className="material-symbols-outlined text-lg">
                  {isLecturer ? 'rate_review' : 'school'}
                </span>
              </div>
              <div>
                <span className="font-semibold text-text-dark">
                  {isLecturer ? 'Mode Wewenang: Dosen Pembimbing' : 'Mode Akses: Mahasiswa Bimbingan'}
                </span>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  {isLecturer
                    ? 'Anda memiliki wewenang telaah draf naskah: memberikan catatan revisi, meminta perbaikan bab, atau menyetujui (ACC).'
                    : 'Anda dapat mengunggah draf skripsi terenkripsi dan mendekripsi berkas draf Anda. Tombol dan formulir telaah naskah hanya dapat diakses oleh Dosen Pembimbing.'}
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium border bg-canvas border-sage-border text-text-secondary shrink-0">
              {user?.role || (isLecturer ? 'DOSEN_PEMBIMBING' : 'MAHASISWA')}
            </span>
          </div>

          {/* NOTICE BANNER */}
          {notice && (
            <div className="p-3.5 rounded-xl bg-sage-tint border border-sage-border text-xs text-text-dark mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">
                  check_circle
                </span>
                <span>{notice}</span>
              </div>
            </div>
          )}

          {/* UPLOAD CARD */}
          <FileUploadCard
            passphrase={passphrase}
            onPassphraseChange={setPassphrase}
            onFileUpload={handleFileUpload}
            loading={loading}
          />

          {/* FILE LIST SECTION */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-xs uppercase tracking-wider text-text-dark">
              Daftar Naskah &amp; Berkas Terenkripsi ({files.length})
            </h2>
            <span className="text-[10px] font-mono text-text-muted">
              Format: *.enc (Payload Hex + Poly1305 Tag)
            </span>
          </div>

          {files.length === 0 ? (
            <div className="p-8 rounded-xl bg-surface border border-sage-border text-center flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-2xl text-text-muted">
                folder_open
              </span>
              <p className="text-xs text-text-secondary">
                Belum ada berkas naskah yang diunggah. Silakan unggah draf skripsi di atas.
              </p>
            </div>
          ) : (
            files.map((f) => (
              <FileItemCard
                key={f.id}
                file={f}
                onDecrypt={handleDecryptFile}
                onReview={handleReviewFile}
                isLecturer={isLecturer}
              />
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
