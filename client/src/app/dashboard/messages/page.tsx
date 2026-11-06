'use client';

import React, { useEffect, useState } from 'react';
import { DashboardNav } from '../../../components/DashboardNav';
import { apiRequest } from '../../../lib/api';

export default function MessagesPage() {
  const [title, setTitle] = useState('Laporan Investigasi Baru');
  const [sender, setSender] = useState('editor_aegis');
  const [plaintext, setPlaintext] = useState('');
  const [passphrase, setPassphrase] = useState('KunciDemo2026');
  const [mode, setMode] = useState<'CBC' | 'ECB'>('CBC');
  const [lastStages, setLastStages] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [decryptedMap, setDecryptedMap] = useState<Record<number, string>>({});
  const [errorMsg, setErrorMsg] = useState('');

  async function loadMessages() {
    const data = await apiRequest('/api/messages');
    setMessages(data);
  }

  async function handleEncrypt(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await apiRequest('/api/messages', 'POST', {
        title,
        sender,
        plaintext,
        passphrase,
        mode,
      });
      setLastStages(res.encryptionStages);
      setPlaintext('');
      await loadMessages();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleDecrypt(id: number) {
    setErrorMsg('');
    try {
      const res = await apiRequest('/api/messages/decrypt', 'POST', {
        id,
        passphrase,
      });
      setDecryptedMap((prev) => ({ ...prev, [id]: res.plaintext }));
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  useEffect(() => {
    loadMessages();
  }, []);

  return (
    <>
      <DashboardNav />
      <main style={{ maxWidth: 1020, margin: '0 auto', padding: '0 20px 48px' }}>
        <h1 style={{ marginBottom: 14 }}>
          ✉️ Super Enkripsi Pesan Teks (Vigenère + Vernam + AES-256)
        </h1>

        {errorMsg && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              marginBottom: 16,
            }}
          >
            {errorMsg}
          </div>
        )}

        <form
          onSubmit={handleEncrypt}
          style={{
            background: '#111827',
            padding: 20,
            borderRadius: 12,
            border: '1px solid #334155',
            marginBottom: 24,
          }}
        >
          <label>Judul Laporan</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
          <label>Identitas Pengirim (Dienkripsi AES-256-GCM di DB)</label>
          <input value={sender} onChange={(e) => setSender(e.target.value)} />
          <label>Isi Pesan Rahasia (Plaintext)</label>
          <textarea
            value={plaintext}
            onChange={(e) => setPlaintext(e.target.value)}
            placeholder="Ketik pesan rahasia..."
          />
          <label>Passphrase Super Enkripsi</label>
          <input
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
          />
          <label>Mode Blok AES</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'CBC' | 'ECB')}
          >
            <option value="CBC">AES-256-CBC</option>
            <option value="ECB">AES-256-ECB</option>
          </select>
          <button type="submit">🔒 Proses Super Enkripsi &amp; Simpan ke Server</button>

          {lastStages && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                background: '#070a12',
                borderRadius: 8,
                border: '1px solid #1e293b',
                fontSize: 12,
              }}
            >
              <strong style={{ color: '#34d399' }}>
                Tahapan Super Enkripsi di Server:
              </strong>
              <div style={{ marginTop: 6, color: '#cbd5e1' }}>
                1. Vigenère (Hex): <code>{lastStages.stage1VigenereHex}</code>
              </div>
              <div style={{ marginTop: 4, color: '#cbd5e1' }}>
                2. Vernam XOR (Hex): <code>{lastStages.stage2VernamHex}</code>
              </div>
              <div style={{ marginTop: 4, color: '#38bdf8' }}>
                3. AES-256 Final: <code>{lastStages.combinedPayload}</code>
              </div>
            </div>
          )}
        </form>

        <h2 style={{ marginBottom: 12 }}>Daftar Pesan Terenkripsi di Server</h2>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              background: '#111827',
              padding: 16,
              borderRadius: 10,
              border: '1px solid #334155',
              marginBottom: 12,
            }}
          >
            <strong>
              #{m.id} — {m.title} ({m.mode}) | Pengirim: {m.sender}
            </strong>
            <pre
              style={{
                background: '#070a12',
                padding: 10,
                borderRadius: 8,
                overflowX: 'auto',
                color: '#38bdf8',
                margin: '8px 0',
              }}
            >
              {m.superCiphertextPayload}
            </pre>
            <button type="button" onClick={() => handleDecrypt(m.id)}>
              🔓 Dekripsi dengan Passphrase di Atas
            </button>
            {decryptedMap[m.id] && (
              <p style={{ color: '#34d399', marginTop: 10 }}>
                Plaintext Hasil Dekripsi: <strong>{decryptedMap[m.id]}</strong>
              </p>
            )}
          </div>
        ))}
      </main>
    </>
  );
}
