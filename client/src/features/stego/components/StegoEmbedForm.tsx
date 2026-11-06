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
      style={{
        background: '#111827',
        padding: 20,
        borderRadius: 12,
        border: '1px solid #334155',
        marginBottom: 24,
      }}
    >
      <label>Judul Bukti Gambar</label>
      <input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        required
      />

      <label>Pilih Gambar Cover (Kosongkan untuk Gambar PNG Otomatis)</label>
      <input type="file" accept="image/*" onChange={onSelectCover} />

      <label>Pesan Rahasia yang Disisipkan ke Bit LSB PNG</label>
      <textarea
        value={secretMessage}
        onChange={(e) => onSecretMessageChange(e.target.value)}
        placeholder="Ketik pesan rahasia investigasi / catatan naskah..."
        rows={3}
        required
      />

      <label>Passkey Steganografi (Kunci Ekstraksi)</label>
      <input
        value={passkey}
        onChange={(e) => onPasskeyChange(e.target.value)}
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Memproses Penyisipan LSB...' : '🧬 Tanamkan Pesan ke LSB PNG'}
      </button>
    </form>
  );
}
