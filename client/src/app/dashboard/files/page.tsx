'use client';

import React, { useEffect, useState } from 'react';
import { DashboardNav } from '../../../components/DashboardNav';
import { apiRequest } from '../../../lib/api';

export default function FilesPage() {
  const [passphrase, setPassphrase] = useState('KunciDemo2026');
  const [files, setFiles] = useState<any[]>([]);
  const [notice, setNotice] = useState('');

  async function loadFiles() {
    const data = await apiRequest('/api/files');
    setFiles(data);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNotice('');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await apiRequest('/api/files/encrypt', 'POST', {
          originalName: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileBase64: reader.result,
          passphrase,
        });
        setNotice(`✅ File '${file.name}' berhasil dienkripsi dengan ChaCha20-Poly1305 di Server!`);
        await loadFiles();
      } catch (err: any) {
        setNotice(`❌ ${err.message}`);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleDecryptFile(id: number) {
    setNotice('');
    try {
      const res = await apiRequest('/api/files/decrypt', 'POST', {
        id,
        passphrase,
      });
      const link = document.createElement('a');
      link.href = `data:${res.mimeType};base64,${res.decryptedBase64}`;
      link.download = res.originalName;
      link.click();
      setNotice(`✅ File '${res.originalName}' berhasil didekripsi & diunduh!`);
    } catch (err: any) {
      setNotice(`❌ ${err.message}`);
    }
  }

  useEffect(() => {
    loadFiles();
  }, []);

  return (
    <>
      <DashboardNav />
      <main style={{ maxWidth: 1020, margin: '0 auto', padding: '0 20px 48px' }}>
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
            }}
          >
            {notice}
          </div>
        )}

        <div
          style={{
            background: '#111827',
            padding: 20,
            borderRadius: 12,
            border: '1px solid #334155',
            marginBottom: 24,
          }}
        >
          <label>Passphrase Enkripsi / Dekripsi ChaCha20</label>
          <input
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
          />
          <label>Pilih File Dokumen Bukti untuk Dienkripsi</label>
          <input type="file" onChange={handleFileUpload} />
        </div>

        {files.map((f) => (
          <div
            key={f.id}
            style={{
              background: '#111827',
              padding: 16,
              borderRadius: 10,
              border: '1px solid #334155',
              marginBottom: 12,
            }}
          >
            <strong>
              📄 {f.originalName} ({f.sizeBytes} bytes)
            </strong>
            <div style={{ fontSize: 12, color: '#94a3b8', margin: '6px 0' }}>
              Nonce: <code>{f.nonceHex}</code> | AuthTag: <code>{f.authTagHex}</code>
              <br />
              SHA-256: <code>{f.originalSha256}</code>
            </div>
            <button type="button" onClick={() => handleDecryptFile(f.id)}>
              🔓 Dekripsi ChaCha20 &amp; Unduh File Asli
            </button>
          </div>
        ))}
      </main>
    </>
  );
}
