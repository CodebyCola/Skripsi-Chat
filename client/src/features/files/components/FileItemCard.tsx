'use client';

import React from 'react';
import { EncryptedFileRecord } from '../types/files.types';

interface FileItemCardProps {
  file: EncryptedFileRecord;
  onDecrypt: (id: number) => void;
}

export function FileItemCard({ file, onDecrypt }: FileItemCardProps) {
  return (
    <div className="bg-surface border border-sage-border rounded-xl p-4 shadow-xs">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-sage-tint border border-sage-border flex items-center justify-center text-primary shrink-0">
          <span className="material-symbols-outlined text-xl">description</span>
        </div>
        <p className="text-xs font-semibold text-text-dark min-w-0 truncate">
          {file.originalName} ({file.sizeBytes} bytes)
        </p>
      </div>
      <div className="mt-2.5 bg-canvas border border-sage-border rounded-lg p-2.5 font-mono text-[11px] text-text-secondary break-all leading-relaxed">
        Nonce: {file.nonceHex} | AuthTag: {file.authTagHex}
        <br />
        SHA-256: {file.originalSha256}
      </div>
      <button
        type="button"
        onClick={() => onDecrypt(file.id)}
        className="mt-3 h-8 px-3 rounded-lg border border-sage-border bg-surface hover:bg-canvas text-text-dark text-xs font-medium flex items-center gap-1.5 transition"
      >
        <span className="material-symbols-outlined text-base text-text-secondary">
          lock_open
        </span>
        <span>Dekripsi ChaCha20 &amp; Unduh File Asli</span>
      </button>
    </div>
  );
}
