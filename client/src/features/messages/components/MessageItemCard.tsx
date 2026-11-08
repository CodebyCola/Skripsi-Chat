'use client';

import React from 'react';
import { EncryptedMessageRecord } from '../types/messages.types';

interface MessageItemCardProps {
  message: EncryptedMessageRecord;
  decryptedText?: string;
  onDecrypt: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function MessageItemCard({
  message,
  decryptedText,
  onDecrypt,
  onDelete,
}: MessageItemCardProps) {
  return (
    <div className="bg-surface border border-sage-border rounded-xl p-4 shadow-xs">
      <div className="flex justify-between flex-wrap gap-1.5">
        <p className="text-xs font-semibold text-text-dark">
          #{message.id} — {message.title} ({message.mode})
        </p>
        <span className="text-[11px] text-text-secondary">
          Pengirim:{' '}
          <strong className="text-text-dark">{message.sender}</strong>
        </span>
      </div>

      <pre className="mt-2 bg-canvas border border-sage-border rounded-lg p-2.5 font-mono text-[11px] text-security-info overflow-x-auto">
        {message.superCiphertextPayload}
      </pre>

      <div className="mt-2.5 flex gap-2 items-center flex-wrap">
        <button
          type="button"
          onClick={() => onDecrypt(message.id)}
          className="h-8 px-3 rounded-lg border border-sage-border bg-surface hover:bg-canvas text-text-dark text-xs font-medium flex items-center gap-1.5 transition"
        >
          <span className="material-symbols-outlined text-base text-text-secondary">
            lock_open
          </span>
          <span>Dekripsi Pesan</span>
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(message.id)}
            className="h-8 px-3 rounded-lg border border-red-200 bg-surface hover:bg-red-50 text-security-danger text-xs font-medium flex items-center gap-1.5 transition"
          >
            <span className="material-symbols-outlined text-base">delete</span>
            <span>Hapus Pesan</span>
          </button>
        )}
      </div>

      {decryptedText && (
        <div className="mt-2.5 p-2.5 rounded-lg bg-sage-tint border border-sage-border text-primary text-xs">
          Plaintext Hasil Dekripsi: <strong>{decryptedText}</strong>
        </div>
      )}
    </div>
  );
}
