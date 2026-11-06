'use client';

import React from 'react';
import { DashboardNav } from '@/features/dashboard';
import { useStego } from '../hooks/useStego';
import { StegoEmbedForm } from './StegoEmbedForm';
import { StegoGalleryItem } from './StegoGalleryItem';

export function StegoView() {
  const {
    title,
    setTitle,
    secretMessage,
    setSecretMessage,
    passkey,
    setPasskey,
    gallery,
    extractedText,
    errorMsg,
    loading,
    handleSelectCover,
    handleEmbed,
    handleExtract,
  } = useStego();

  return (
    <>
      <DashboardNav />
      <main
        style={{ maxWidth: 1020, margin: '0 auto', padding: '0 20px 48px' }}
      >
        <h1 style={{ marginBottom: 14 }}>
          🖼️ Studio Steganografi Gambar PNG (LSB Embedding)
        </h1>

        {errorMsg && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              marginBottom: 16,
            }}
          >
            {errorMsg}
          </div>
        )}

        <StegoEmbedForm
          title={title}
          onTitleChange={setTitle}
          secretMessage={secretMessage}
          onSecretMessageChange={setSecretMessage}
          passkey={passkey}
          onPasskeyChange={setPasskey}
          onSelectCover={handleSelectCover}
          loading={loading}
          onSubmit={handleEmbed}
        />

        {extractedText && (
          <div
            style={{
              padding: 14,
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid #10b981',
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            ✅ Pesan Rahasia Terekstrak: <strong>{extractedText}</strong>
          </div>
        )}

        <h2 style={{ marginBottom: 12 }}>
          Galeri Citra Steganografi di Server ({gallery.length})
        </h2>

        {gallery.map((item) => (
          <StegoGalleryItem
            key={item.id}
            item={item}
            onExtract={handleExtract}
          />
        ))}
      </main>
    </>
  );
}
