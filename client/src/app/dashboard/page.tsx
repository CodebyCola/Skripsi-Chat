'use client';

import React from 'react';
import { DashboardNav } from '../../components/DashboardNav';

export default function DashboardHomePage() {
  const cards = [
    {
      href: '/dashboard/messages',
      title: '✉️ 1. Pesan Teks (Super Enkripsi)',
      desc: 'Enkripsi 3 lapis berurutan: Extended Vigenère Cipher -> Vernam XOR -> AES-256-CBC/ECB.',
    },
    {
      href: '/dashboard/files',
      title: '📁 2. Transfer Berkas (ChaCha20-Poly1305)',
      desc: 'Enkripsi & dekripsi dokumen bukti menggunakan stream cipher ChaCha20-Poly1305.',
    },
    {
      href: '/dashboard/stego',
      title: '🖼️ 3. Steganografi Citra (LSB PNG)',
      desc: 'Sembunyikan & ekstrak pesan rahasia di bit LSB kanal RGB gambar PNG Lossless.',
    },
    {
      href: '/dashboard/db-view',
      title: '🗄️ 4. Keamanan Database (AES-256-GCM)',
      desc: 'Inspeksi perbandingan isi mentah ciphertext tabel SQLite vs hasil dekripsi aplikasi.',
    },
    {
      href: '/dashboard/blockchain',
      title: '⛓️ 5. Integritas Aset Blockchain (SHA-256)',
      desc: 'Buku besar audit berantai SHA-256, Proof-of-Work, dan simulasi deteksi manipulasi data.',
    },
  ];

  return (
    <>
      <DashboardNav />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 48px' }}>
        <h1 style={{ marginBottom: 6 }}>🛡️ Brankas Utama AegisVault</h1>
        <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: 14 }}>
          Otentikasi Hardware Dongle + Biometrik Wajah berhasil. Seluruh modul di bawah terhubung langsung ke Server Kriptografi.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {cards.map((c) => (
            <a
              key={c.href}
              href={c.href}
              style={{
                padding: 20,
                background: '#111827',
                borderRadius: 12,
                border: '1px solid #334155',
                color: '#fff',
                textDecoration: 'none',
              }}
            >
              <h3 style={{ marginBottom: 8, color: '#38bdf8' }}>{c.title}</h3>
              <p style={{ fontSize: 13.5, color: '#cbd5e1', lineHeight: 1.5 }}>
                {c.desc}
              </p>
            </a>
          ))}
        </div>
      </main>
    </>
  );
}
