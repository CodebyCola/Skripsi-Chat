'use client';

import React from 'react';
import { PageShell } from '@/features/dashboard';
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
    <PageShell
      title="Enkripsi Berkas dengan ChaCha20-Poly1305"
      subtitle="Naskah & Berkas"
    >
      {notice && (
        <div className="p-3 rounded-lg bg-surface border border-sage-border text-security-info text-xs">
          {notice}
        </div>
      )}

      <FileUploadCard
        passphrase={passphrase}
        onPassphraseChange={setPassphrase}
        onFileUpload={handleFileUpload}
        loading={loading}
      />

      <h2 className="text-xs font-semibold text-text-dark">
        Daftar Berkas Terenkripsi di Server ({files.length})
      </h2>

      {files.map((f) => (
        <FileItemCard key={f.id} file={f} onDecrypt={handleDecryptFile} />
      ))}
    </PageShell>
  );
}
