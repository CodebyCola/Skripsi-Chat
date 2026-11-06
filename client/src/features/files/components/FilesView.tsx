'use client';

import React from 'react';
import { DashboardNav } from '@/features/dashboard';
import { useFiles } from '../hooks/useFiles';
import { FileItemCard } from './FileItemCard';
import { FileUploadCard } from './FileUploadCard';

export function FilesView() {
  const {
    passphrase,
    setPassphrase,
    files,
    notice,
    loading,
    handleFileUpload,
    handleDecryptFile,
  } = useFiles();

  return (
    <>
      <DashboardNav />
      <main
        style={{ maxWidth: 1020, margin: '0 auto', padding: '0 20px 48px' }}
      >
        <h1 style={{ marginBottom: 14 }}>
          📁 Enkripsi Berkas dengan ChaCha20-Poly1305
        </h1>

        {notice && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: '#1e293b',
              border: '1px solid #38bdf8',
              marginBottom: 16,
              color: '#e2e8f0',
            }}
          >
            {notice}
          </div>
        )}

        <FileUploadCard
          passphrase={passphrase}
          onPassphraseChange={setPassphrase}
          onFileUpload={handleFileUpload}
          loading={loading}
        />

        <h2 style={{ marginBottom: 12 }}>
          Daftar Berkas Terenkripsi di Server ({files.length})
        </h2>

        {files.map((f) => (
          <FileItemCard key={f.id} file={f} onDecrypt={handleDecryptFile} />
        ))}
      </main>
    </>
  );
}
