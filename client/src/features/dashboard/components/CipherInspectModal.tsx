'use client';

import React from 'react';
import { ChatMessageItem } from '../types/dashboard.types';

interface CipherInspectModalProps {
  message: ChatMessageItem | null;
  onClose: () => void;
}

export function CipherInspectModal({
  message,
  onClose,
}: CipherInspectModalProps) {
  if (!message) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#121E19]/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-sage-border rounded-2xl max-w-xl w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        
        {/* HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-sage-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sage-tint border border-sage-border text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">data_object</span>
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-text-dark">
                Inspektur Super Enkripsi 3-Lapis
              </h3>
              <p className="text-[11px] text-text-secondary font-mono">
                Pesan ID #{message.id} &bull; Pengirim: {message.sender}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:text-text-dark hover:bg-canvas transition"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* PLAINTEXT */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-text-dark uppercase tracking-wider">
            Teks Asli (Plaintext)
          </span>
          <div className="p-3 rounded-lg bg-canvas border border-sage-border text-xs text-text-dark font-sans leading-relaxed">
            {message.content}
          </div>
        </div>

        {/* TAHAP 1: VIGENERE (KLASIK SUBSTITUSI) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-text-dark">
              Lapis 1: Extended Vigenère Cipher (Substitusi Byte Klasik)
            </span>
            <span className="text-[10px] font-mono text-text-muted">Modulo 256</span>
          </div>
          <div className="p-2.5 rounded-lg bg-canvas border border-sage-border font-mono text-[11px] text-text-secondary break-all">
            {message.rawStages?.stage1VigenerePreview || '[Vigenère Encrypted Byte Stream]'}
          </div>
        </div>

        {/* TAHAP 2: VERNAM / TRANSPOSISI (KLASIK PERMUTASI) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-text-dark">
              Lapis 2: Vernam XOR / Columnar Transposition (Permutasi Klasik)
            </span>
            <span className="text-[10px] font-mono text-text-muted">Hex Representation</span>
          </div>
          <div className="p-2.5 rounded-lg bg-canvas border border-sage-border font-mono text-[11px] text-text-secondary break-all">
            {message.rawStages?.stage2VernamHex || '[Vernam / Transposition Intermediate Hex]'}
          </div>
        </div>

        {/* TAHAP 3: AES-256 (MODERN AEAD CIPHER) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-text-dark">
              Lapis 3: AES-256 Modern Block Cipher (Disimpan di SQLite)
            </span>
            <span className="text-[10px] font-mono text-primary font-semibold">
              AES-256-GCM / CBC
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-canvas border border-sage-border font-mono text-[11px] text-text-dark break-all leading-normal">
            {message.rawStages?.superCiphertextPayload || '[Payload Ciphertext AES-256 tersimpan di database]'}
          </div>
        </div>

        <div className="pt-2 border-t border-sage-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium transition"
          >
            Tutup Inspektur
          </button>
        </div>

      </div>
    </div>
  );
}
