'use client';

import React from 'react';
import { SERVER_CONSOLE_URL } from '../../lib/api';

export default function RegisterRedirectPage() {
  return (
    <main style={{ maxWidth: 680, margin: '48px auto', padding: '0 20px' }}>
      <div
        style={{
          background: '#111827',
          padding: 24,
          borderRadius: 14,
          border: '1px solid #334155',
        }}
      >
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>
          🖥️ Pendaftaran Akun, USB Dongle &amp; Biometrik Wajah
        </h1>
        <p style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 }}>
          Sesuai arsitektur keamanan <strong>AegisVault</strong>, pembuatan akun
          investigator, penanaman kunci <code>.aegis_key</code> ke Hardware USB
          Dongle, serta perekaman referensi <strong>Biometrik Wajah</strong>{' '}
          dilakukan melalui <strong>Server Administration Console</strong>.
        </p>

        <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
          <a
            href={SERVER_CONSOLE_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              background: '#0284c7',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 13.5,
            }}
          >
            🖥️ Buka Server Console ({SERVER_CONSOLE_URL})
          </a>
          <a
            href="/"
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#e2e8f0',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 13.5,
            }}
          >
            &larr; Kembali ke Halaman Login Client
          </a>
        </div>
      </div>
    </main>
  );
}
