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
    <div
      style={{
        background: '#111827',
        padding: 16,
        borderRadius: 10,
        border: '1px solid #334155',
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <strong>
          #{message.id} — {message.title} ({message.mode})
        </strong>
        <span style={{ fontSize: 12.5, color: '#94a3b8' }}>
          Pengirim: <strong style={{ color: '#e2e8f0' }}>{message.sender}</strong>
        </span>
      </div>

      <pre
        style={{
          background: '#070a12',
          padding: 10,
          borderRadius: 8,
          overflowX: 'auto',
          color: '#38bdf8',
          margin: '8px 0',
          fontSize: 12,
        }}
      >
        {message.superCiphertextPayload}
      </pre>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => onDecrypt(message.id)}
          style={{ background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', cursor: 'pointer', padding: '6px 12px', borderRadius: 6 }}
        >
          Dekripsi Pesan
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(message.id)}
            style={{
              background: 'transparent',
              border: '1px solid #ef4444',
              color: '#f87171',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            Hapus Pesan
          </button>
        )}
      </div>

      {decryptedText && (
        <div
          style={{
            marginTop: 10,
            padding: 10,
            background: 'rgba(16,185,129,0.1)',
            borderRadius: 8,
            border: '1px solid #10b981',
            color: '#34d399',
            fontSize: 13,
          }}
        >
          Plaintext Hasil Dekripsi: <strong>{decryptedText}</strong>
        </div>
      )}
    </div>
  );
}
