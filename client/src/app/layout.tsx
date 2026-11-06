import './globals.css';
import React from 'react';

export const metadata = {
  title: 'AegisVault — Aplikasi Kriptografi Tugas Akhir',
  description:
    'Platform Whistleblower & Bukti Investigasi dengan Biometrik, USB Dongle, Super Enkripsi, ChaCha20, Steganografi LSB, dan Blockchain SHA-256.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
