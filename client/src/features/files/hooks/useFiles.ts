'use client';

import { useEffect, useState } from 'react';
import { decryptFile, encryptFile, fetchFiles, reviewFile } from '../api/filesApi';
import { EncryptedFileRecord } from '../types/files.types';

export function useFiles() {
  const [passphrase, setPassphrase] = useState('KunciDemo2026');
  const [files, setFiles] = useState<EncryptedFileRecord[]>([]);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadFiles() {
    try {
      const data = await fetchFiles();
      setFiles(data);
    } catch (err: any) {
      setNotice(`Gagal memuat file: ${err.message}`);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNotice('');
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await encryptFile({
          originalName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileBase64: reader.result,
          passphrase,
        });
        setNotice(
          `File '${file.name}' berhasil dienkripsi dengan ChaCha20-Poly1305 di Server!`
        );
        await loadFiles();
      } catch (err: any) {
        setNotice(err.message || 'Gagal mengenkripsi file');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleDecryptFile(id: number) {
    setNotice('');
    try {
      const res = await decryptFile(id, passphrase);
      const link = document.createElement('a');
      link.href = `data:${res.mimeType};base64,${res.decryptedBase64}`;
      link.download = res.originalName;
      link.click();
      setNotice(`File '${res.originalName}' berhasil didekripsi & diunduh!`);
    } catch (err: any) {
      setNotice(err.message || 'Gagal mendekripsi file (Pastikan kunci ChaCha20 benar)');
    }
  }

  async function handleReviewFile(
    id: number,
    status: 'SUBMITTED' | 'REVISION' | 'APPROVED',
    reviewNote: string
  ) {
    setNotice('');
    try {
      await reviewFile(id, status, reviewNote);
      setNotice(`Status draf berhasil diperbarui menjadi ${status}!`);
      await loadFiles();
    } catch (err: any) {
      setNotice(`Gagal meninjau draf: ${err.message}`);
    }
  }

  useEffect(() => {
    loadFiles();
  }, []);

  return {
    passphrase,
    setPassphrase,
    files,
    notice,
    loading,
    handleFileUpload,
    handleDecryptFile,
    handleReviewFile,
    loadFiles,
  };
}
