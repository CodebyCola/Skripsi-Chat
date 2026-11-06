import React from 'react';
import { DashboardModule } from '../types/dashboard.types';
import { DashboardNav } from './DashboardNav';
import { ModuleCard } from './ModuleCard';

const DASHBOARD_MODULES: DashboardModule[] = [
  {
    href: '/dashboard/messages',
    title: '✉️ 1. Pesan Teks (Super Enkripsi)',
    desc: 'Enkripsi 3 lapis berurutan: Extended Vigenère Cipher -> Vernam XOR -> AES-256-CBC/ECB.',
  },
  {
    href: '/dashboard/files',
    title: '📁 2. Transfer Berkas (ChaCha20-Poly1305)',
    desc: 'Enkripsi & dekripsi dokumen draf skripsi menggunakan stream cipher ChaCha20-Poly1305.',
  },
  {
    href: '/dashboard/stego',
    title: '🖼️ 3. Steganografi Citra (LSB PNG)',
    desc: 'Sembunyikan & ekstrak catatan rahasia di bit LSB kanal RGB gambar PNG Lossless.',
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

export function DashboardOverview() {
  return (
    <>
      <DashboardNav />
      <main
        style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 48px' }}
      >
        <h1 style={{ marginBottom: 6 }}>
          🛡️ Brankas Utama SkripsiChat
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: 14 }}>
          Otentikasi Hardware Dongle + Biometrik Wajah berhasil. Seluruh modul di
          bawah terhubung langsung ke Server Kriptografi.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {DASHBOARD_MODULES.map((m) => (
            <ModuleCard key={m.href} module={m} />
          ))}
        </div>
      </main>
    </>
  );
}
