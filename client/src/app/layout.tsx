import './globals.css';
import React from 'react';

export const metadata = {
  title: 'SkripsiChat — Academic Advisory Shield',
  description:
    'Portal Bimbingan Skripsi Terenkripsi Multi-Faktor dengan Hardware USB Dongle, Biometrik Wajah, Super Enkripsi, ChaCha20, Steganografi LSB, dan Blockchain SHA-256.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@100..900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
