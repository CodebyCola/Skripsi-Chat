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

const labelCls = 'block text-[11px] font-medium text-text-secondary mb-1';
const inputCls =
  'w-full rounded-lg border border-sage-border bg-canvas px-3 py-2 text-xs text-text-dark placeholder-text-muted focus:border-primary focus:bg-surface focus:outline-none transition';

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
      className="bg-surface border border-sage-border rounded-xl p-5 shadow-xs space-y-3.5"
    >
      <div>
        <label className={labelCls}>Judul Bukti Gambar</label>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          required
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>
          Pilih Gambar Cover (Kosongkan untuk Gambar PNG Otomatis)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={onSelectCover}
          className="block w-full text-xs text-text-secondary file:mr-3 file:h-8 file:px-3 file:rounded-lg file:border file:border-sage-border file:bg-surface file:text-xs file:text-text-dark hover:file:bg-canvas"
        />
      </div>

      <div>
        <label className={labelCls}>
          Pesan Rahasia yang Disisipkan ke Bit LSB PNG
        </label>
        <textarea
          value={secretMessage}
          onChange={(e) => onSecretMessageChange(e.target.value)}
          placeholder="Ketik pesan rahasia investigasi / catatan naskah..."
          rows={3}
          required
          className={`${inputCls} resize-none leading-relaxed`}
        />
      </div>

      <div>
        <label className={labelCls}>Passkey Steganografi (Kunci Ekstraksi)</label>
        <input
          value={passkey}
          onChange={(e) => onPasskeyChange(e.target.value)}
          required
          className={inputCls}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="h-8 px-3.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined text-base">image</span>
        <span>
          {loading ? 'Memproses Penyisipan LSB...' : 'Tanamkan Pesan ke LSB PNG'}
        </span>
      </button>
    </form>
  );
}
