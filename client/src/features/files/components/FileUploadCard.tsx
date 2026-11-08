'use client';

import React from 'react';

interface FileUploadCardProps {
  passphrase: string;
  onPassphraseChange: (val: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loading: boolean;
}

const labelCls = 'block text-[11px] font-medium text-text-secondary mb-1';

export function FileUploadCard({
  passphrase,
  onPassphraseChange,
  onFileUpload,
  loading,
}: FileUploadCardProps) {
  return (
    <div className="bg-surface border border-sage-border rounded-xl p-5 shadow-xs space-y-3.5">
      <div>
        <label className={labelCls}>
          Passphrase Enkripsi / Dekripsi ChaCha20-Poly1305
        </label>
        <input
          value={passphrase}
          onChange={(e) => onPassphraseChange(e.target.value)}
          placeholder="Kunci rahasia file..."
          className="w-full rounded-lg border border-sage-border bg-canvas px-3 py-2 text-xs text-text-dark placeholder-text-muted focus:border-primary focus:bg-surface focus:outline-none transition"
        />
      </div>

      <div>
        <label className={labelCls}>
          Pilih File Dokumen Bukti / Draf Skripsi untuk Dienkripsi
        </label>
        <input
          type="file"
          onChange={onFileUpload}
          disabled={loading}
          className="block w-full text-xs text-text-secondary file:mr-3 file:h-8 file:px-3 file:rounded-lg file:border file:border-sage-border file:bg-surface file:text-xs file:text-text-dark hover:file:bg-canvas disabled:opacity-40"
        />
      </div>

      {loading && (
        <p className="flex items-center gap-1.5 text-xs text-security-info">
          <span className="material-symbols-outlined text-base">
            hourglass_top
          </span>
          Sedang memproses enkripsi ChaCha20-Poly1305 di Server...
        </p>
      )}
    </div>
  );
}
