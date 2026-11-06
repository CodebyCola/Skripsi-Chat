'use client';

import React from 'react';
import { EncryptionStages } from '../types/messages.types';

interface MessageEncryptFormProps {
  title: string;
  onTitleChange: (val: string) => void;
  sender: string;
  onSenderChange: (val: string) => void;
  plaintext: string;
  onPlaintextChange: (val: string) => void;
  passphrase: string;
  onPassphraseChange: (val: string) => void;
  mode: 'CBC' | 'ECB';
  onModeChange: (val: 'CBC' | 'ECB') => void;
  loading: boolean;
  lastStages: EncryptionStages | null;
  onSubmit: (e: React.FormEvent) => void;
}

export function MessageEncryptForm({
  title,
  onTitleChange,
  sender,
  onSenderChange,
  plaintext,
  onPlaintextChange,
  passphrase,
  onPassphraseChange,
  mode,
  onModeChange,
  loading,
  lastStages,
  onSubmit,
}: MessageEncryptFormProps) {
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
      <label>Judul Catatan / Dokumen Bimbingan</label>
      <input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        required
      />

      <label>Identitas Pengirim (Dienkripsi AES-256-GCM di Database)</label>
      <input
        value={sender}
        onChange={(e) => onSenderChange(e.target.value)}
        required
      />

      <label>Isi Pesan Rahasia (Plaintext)</label>
      <textarea
        value={plaintext}
        onChange={(e) => onPlaintextChange(e.target.value)}
        placeholder="Ketik catatan bimbingan atau draf naskah..."
        rows={4}
        required
      />

      <label>Passphrase Super Enkripsi (Kunci Bersama)</label>
      <input
        value={passphrase}
        onChange={(e) => onPassphraseChange(e.target.value)}
        required
      />

      <label>Mode Blok AES</label>
      <select
        value={mode}
        onChange={(e) => onModeChange(e.target.value as 'CBC' | 'ECB')}
      >
        <option value="CBC">AES-256-CBC (Cipher Block Chaining)</option>
        <option value="ECB">AES-256-ECB (Electronic Codebook)</option>
      </select>

      <button type="submit" disabled={loading}>
        {loading
          ? 'Memproses Super Enkripsi...'
          : '🔒 Proses Super Enkripsi & Simpan ke Server'}
      </button>

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
            3. AES-256 Final Payload: <code>{lastStages.combinedPayload}</code>
          </div>
        </div>
      )}
    </form>
  );
}
