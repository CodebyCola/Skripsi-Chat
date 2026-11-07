'use client';

import React from 'react';

interface StegoEmbedFormProps {
  title: string;
  onTitleChange: (val: string) => void;
  secretMessage: string;
  onSecretMessageChange: (val: string) => void;
  passkey: string;
  onPasskeyChange: (val: string) => void;
  onSelectCover: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function StegoEmbedForm({
  title,
  onTitleChange,
  secretMessage,
  onSecretMessageChange,
  passkey,
  onPasskeyChange,
  onSelectCover,
  loading,
  onSubmit,
}: StegoEmbedFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="p-5 rounded-2xl bg-surface border border-sage-border shadow-xs flex flex-col gap-4 mb-6"
    >
      <div className="flex items-center justify-between pb-3 border-b border-sage-border">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-primary">
            image
          </span>
          <h2 className="font-display font-semibold text-xs uppercase tracking-wider text-text-dark">
            Sisipkan Pesan Tersembunyi (LSB Steganografi PNG)
          </h2>
        </div>
        <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded bg-canvas border border-sage-border">
          Spatial Domain LSB &bull; Lossless
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* JUDUL CITRA */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-dark">
            Judul / Keterangan Gambar
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Contoh: Diagram Arsitektur Skripsi v2"
            required
            className="w-full h-9 px-3 rounded-lg border border-sage-border bg-canvas text-xs text-text-dark focus:bg-surface focus:border-primary focus:outline-none"
          />
        </div>

        {/* PASSKEY */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-dark flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-text-muted">key</span>
            <span>Kunci Ekstraksi (Passkey)</span>
          </label>
          <input
            type="text"
            value={passkey}
            onChange={(e) => onPasskeyChange(e.target.value)}
            placeholder="Passkey steganografi..."
            required
            className="w-full h-9 px-3 rounded-lg border border-sage-border bg-canvas text-xs font-mono text-text-dark focus:bg-surface focus:border-primary focus:outline-none"
          />
        </div>

        {/* COVER FILE PICKER */}
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs font-medium text-text-dark">
            Berkas Citra Wadah (Kosongkan jika ingin generate kanvas PNG otomatis di Server)
          </label>
          <input
            type="file"
            accept="image/png,image/*"
            onChange={onSelectCover}
            className="text-xs text-text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-sage-border file:text-xs file:bg-canvas file:text-text-dark hover:file:bg-surface cursor-pointer"
          />
        </div>

        {/* PESAN RAHASIA */}
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs font-medium text-text-dark">
            Pesan Rahasia yang Disisipkan ke Bit LSB Piksel RGB
          </label>
          <textarea
            value={secretMessage}
            onChange={(e) => onSecretMessageChange(e.target.value)}
            placeholder="Ketik catatan bimbingan rahasia, instruksi dewan penguji, atau kode otentikasi..."
            rows={3}
            required
            className="w-full p-3 rounded-lg border border-sage-border bg-canvas text-xs text-text-dark focus:bg-surface focus:border-primary focus:outline-none leading-relaxed"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-sage-border">
        <span className="text-[10px] font-mono text-text-muted">
          Metrik imperceptibility: PSNR dihitung otomatis terhadap gambar asli
        </span>

        <button
          type="submit"
          disabled={loading}
          className="h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-base">
            {loading ? 'hourglass_top' : 'lock'}
          </span>
          <span>{loading ? 'Menanamkan ke LSB...' : 'Sisipkan Pesan ke LSB PNG'}</span>
        </button>
      </div>
    </form>
  );
}
