'use client';

import React from 'react';
import { PageShell } from '@/features/dashboard';
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
    <PageShell
      title="Studio Steganografi Gambar PNG"
      subtitle="LSB Embedding"
    >
      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-security-danger text-xs">
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
        <div className="p-3.5 rounded-lg bg-sage-tint border border-sage-border text-primary text-xs flex items-start gap-2">
          <span className="material-symbols-outlined text-lg shrink-0">
            check_circle
          </span>
          <span>
            Pesan Rahasia Terekstrak: <strong>{extractedText}</strong>
          </span>
        </div>
      )}

      <h2 className="text-xs font-semibold text-text-dark">
        Galeri Citra Steganografi di Server ({gallery.length})
      </h2>

      {gallery.map((item) => (
        <StegoGalleryItem
          key={item.id}
          item={item}
          onExtract={handleExtract}
        />
      ))}
    </PageShell>
  );
}
