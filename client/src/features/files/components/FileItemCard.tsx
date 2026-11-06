'use client';

import React from 'react';
import { EncryptedFileRecord } from '../types/files.types';

interface FileItemCardProps {
  file: EncryptedFileRecord;
  onDecrypt: (id: number) => void;
}

export function FileItemCard({ file, onDecrypt }: FileItemCardProps) {
  return (
    <div
      style={{
        background: '#111827',
        padding: 16,
        borderRadius: 10,
        border: '1px solid #334155',
        marginBottom: 12,
      }}
    >
      <strong>
        📄 {file.originalName} ({file.sizeBytes} bytes)
      </strong>
      <div style={{ fontSize: 12, color: '#94a3b8', margin: '6px 0' }}>
        Nonce: <code>{file.nonceHex}</code> | AuthTag:{' '}
        <code>{file.authTagHex}</code>
        <br />
        SHA-256: <code>{file.originalSha256}</code>
      </div>
      <button
        type="button"
        onClick={() => onDecrypt(file.id)}
        style={{ background: '#1e293b', border: '1px solid #334155' }}
      >
        🔓 Dekripsi ChaCha20 &amp; Unduh File Asli
      </button>
    </div>
  );
}
