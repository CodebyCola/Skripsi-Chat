'use client';

import React from 'react';

interface FileUploadCardProps {
  passphrase: string;
  onPassphraseChange: (val: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loading: boolean;
}

export function FileUploadCard({
  passphrase,
  onPassphraseChange,
  onFileUpload,
  loading,
}: FileUploadCardProps) {
  return (
    <div className="p-5 rounded-2xl bg-surface border border-sage-border shadow-xs flex flex-col gap-4 mb-6">
      <div className="flex items-center justify-between pb-3 border-b border-sage-border">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-primary">
            enhanced_encryption
          </span>
          <h2 className="font-display font-semibold text-xs uppercase tracking-wider text-text-dark">
            Enkripsi Berkas Naskah &amp; Draf (ChaCha20-Poly1305)
          </h2>
        </div>
        <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded bg-canvas border border-sage-border">
          Stream Cipher RFC 8439
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PASSPHRASE INPUT */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-dark flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-text-muted">key</span>
            <span>Kunci Enkripsi / Dekripsi Berkas</span>
          </label>
          <input
            type="text"
            value={passphrase}
            onChange={(e) => onPassphraseChange(e.target.value)}
            placeholder="Kunci rahasia berkas..."
            className="w-full h-9 px-3 rounded-lg border border-sage-border bg-canvas text-xs font-mono text-text-dark focus:bg-surface focus:border-primary focus:outline-none transition"
          />
          <p className="text-[10px] text-text-secondary">
            Kunci ini digunakan untuk menurunkan 256-bit key ChaCha20 secara terpisah dari teks percakapan.
          </p>
        </div>

        {/* FILE DROPZONE / UPLOAD */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-dark flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-text-muted">upload_file</span>
            <span>Pilih Berkas Draf / Bukti Akademik (.docx, .pdf, .zip)</span>
          </label>
          <label className="h-9 px-3 rounded-lg border border-dashed border-sage-border bg-canvas hover:bg-surface flex items-center justify-center gap-2 text-xs text-text-secondary hover:text-text-dark cursor-pointer transition">
            <span className="material-symbols-outlined text-base text-primary">add</span>
            <span>{loading ? 'Mengenkripsi di Server...' : 'Pilih Berkas Komputer'}</span>
            <input
              type="file"
              onChange={onFileUpload}
              disabled={loading}
              className="hidden"
            />
          </label>
          <p className="text-[10px] text-text-secondary">
            Biner file dienkripsi per-chunk dengan Poly1305 AuthTag untuk validasi integritas.
          </p>
        </div>
      </div>
    </div>
  );
}
