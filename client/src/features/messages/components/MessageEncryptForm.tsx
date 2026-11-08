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

const labelCls = 'block text-[11px] font-medium text-text-secondary mb-1';
const inputCls =
  'w-full rounded-lg border border-sage-border bg-canvas px-3 py-2 text-xs text-text-dark placeholder-text-muted focus:border-primary focus:bg-surface focus:outline-none transition';

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
      className="bg-surface border border-sage-border rounded-xl p-5 shadow-xs space-y-3.5"
    >
      <div>
        <label className={labelCls}>Judul Catatan / Dokumen Bimbingan</label>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          required
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>
          Identitas Pengirim (Dienkripsi AES-256-GCM di Database)
        </label>
        <input
          value={sender}
          onChange={(e) => onSenderChange(e.target.value)}
          required
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Isi Pesan Rahasia (Plaintext)</label>
        <textarea
          value={plaintext}
          onChange={(e) => onPlaintextChange(e.target.value)}
          placeholder="Ketik catatan bimbingan atau draf naskah..."
          rows={4}
          required
          className={`${inputCls} resize-none leading-relaxed`}
        />
      </div>

      <div>
        <label className={labelCls}>
          Passphrase Super Enkripsi (Kunci Bersama)
        </label>
        <input
          value={passphrase}
          onChange={(e) => onPassphraseChange(e.target.value)}
          required
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>Mode Blok AES</label>
        <select
          value={mode}
          onChange={(e) => onModeChange(e.target.value as 'CBC' | 'ECB')}
          className={inputCls}
        >
          <option value="CBC">AES-256-CBC (Cipher Block Chaining)</option>
          <option value="ECB">AES-256-ECB (Electronic Codebook)</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="h-8 px-3.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined text-base">lock</span>
        <span>
          {loading
            ? 'Memproses Super Enkripsi...'
            : 'Proses Super Enkripsi & Simpan ke Server'}
        </span>
      </button>

      {lastStages && (
        <div className="p-3 bg-canvas border border-sage-border rounded-lg text-[11px] space-y-1.5">
          <p className="font-semibold text-primary">
            Tahapan Super Enkripsi di Server:
          </p>
          <div className="text-text-secondary break-all">
            1. Vigenère (Hex):{' '}
            <code className="font-mono text-text-dark">
              {lastStages.stage1VigenereHex}
            </code>
          </div>
          <div className="text-text-secondary break-all">
            2. Vernam XOR (Hex):{' '}
            <code className="font-mono text-text-dark">
              {lastStages.stage2VernamHex}
            </code>
          </div>
          <div className="text-security-info break-all">
            3. AES-256 Final Payload:{' '}
            <code className="font-mono">{lastStages.combinedPayload}</code>
          </div>
        </div>
      )}
    </form>
  );
}
