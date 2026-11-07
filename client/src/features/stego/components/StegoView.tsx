'use client';

import React from 'react';
import { DashboardLayout } from '@/features/dashboard';
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
    <DashboardLayout>
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-canvas p-6 md:p-8">
        <div className="max-w-5xl mx-auto w-full">
          {/* HEADER */}
          <div className="flex flex-col gap-1 mb-6">
            <span className="text-[11px] font-mono text-primary font-semibold uppercase tracking-wider">
              Kriteria #6: Pesan Gambar Diamankan dengan Konsep Steganografi
            </span>
            <h1 className="font-display font-bold text-lg text-text-dark">
              Steganografi Citra PNG (Spatial Domain LSB)
            </h1>
            <p className="text-xs text-text-secondary leading-relaxed">
              Menyisipkan catatan bimbingan atau instruksi rahasia ke dalam bit LSB kanal warna RGB citra PNG tanpa degradasi visual yang kasat mata. Kualitas citra diukur melalui nilai Peak Signal-to-Noise Ratio (PSNR) dan Mean Squared Error (MSE).
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* EXTRACTED MESSAGE SUCCESS BANNER */}
          {extractedText && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 mb-6 flex flex-col gap-1 shadow-xs">
              <div className="flex items-center gap-2 font-semibold text-emerald-900">
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>Pesan Rahasia Berhasil Diekstrak dari Bit LSB:</span>
              </div>
              <p className="font-mono text-xs bg-white p-2.5 rounded-lg border border-emerald-200/60 mt-1 whitespace-pre-wrap">
                {extractedText}
              </p>
            </div>
          )}

          {/* EMBED FORM */}
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

          {/* GALLERY LIST */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-xs uppercase tracking-wider text-text-dark">
              Galeri Citra Steganografi di Server ({gallery.length})
            </h2>
            <span className="text-[10px] font-mono text-text-muted">
              Format: PNG Lossless RGB (Bit Depth: 8bpc)
            </span>
          </div>

          {gallery.length === 0 ? (
            <div className="p-8 rounded-xl bg-surface border border-sage-border text-center text-xs text-text-secondary">
              Belum ada citra steganografi. Silakan sisipkan pesan rahasia pada form di atas.
            </div>
          ) : (
            gallery.map((item) => (
              <StegoGalleryItem
                key={item.id}
                item={item}
                onExtract={handleExtract}
              />
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
