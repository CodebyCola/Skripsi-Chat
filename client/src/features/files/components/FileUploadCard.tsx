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
    <div
      style={{
        background: '#111827',
        padding: 20,
        borderRadius: 12,
        border: '1px solid #334155',
        marginBottom: 24,
      }}
    >
      <label>Passphrase Enkripsi / Dekripsi ChaCha20-Poly1305</label>
      <input
        value={passphrase}
        onChange={(e) => onPassphraseChange(e.target.value)}
        placeholder="Kunci rahasia file..."
      />

      <label style={{ display: 'block', marginTop: 10 }}>
        Pilih File Dokumen Bukti / Draf Skripsi untuk Dienkripsi
      </label>
      <input type="file" onChange={onFileUpload} disabled={loading} />

      {loading && (
        <p style={{ fontSize: 13, color: '#38bdf8', marginTop: 8 }}>
          ⏳ Sedang memproses enkripsi ChaCha20-Poly1305 di Server...
        </p>
      )}
    </div>
  );
}
