'use client';

import React from 'react';
import { HashText, StatusBadge } from '@/components/ui';
import { ExtractedStegoData, StegoImageRecord } from '../types/stego.types';

interface StegoGalleryItemProps {
  item: StegoImageRecord;
  extracted?: ExtractedStegoData;
  isExtracting?: boolean;
  onExtract: (id: number) => void;
}

export function StegoGalleryItem({
  item,
  extracted,
  isExtracting,
  onExtract,
}: StegoGalleryItemProps) {
  const formattedDate = new Date(item.createdAt).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="bg-surface border border-sage-border rounded-xl p-4 shadow-xs space-y-3 transition hover:border-primary/40">
      <div className="flex gap-4 items-start flex-wrap sm:flex-nowrap">
        {/* Gambar Steganografi Preview */}
        {item.imageDataUrl ? (
          <img
            src={item.imageDataUrl}
            alt={item.title}
            className="w-full sm:w-[150px] h-[105px] object-cover rounded-lg border border-sage-border bg-canvas shrink-0"
          />
        ) : (
          <div className="w-full sm:w-[150px] h-[105px] rounded-lg border border-sage-border bg-canvas flex items-center justify-center text-text-muted shrink-0">
            <span className="material-symbols-outlined text-3xl">image</span>
          </div>
        )}

        {/* Informasi Metadata & Kualitas Citra */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-xs font-semibold text-text-dark truncate">
              {item.title}
            </h3>
            <span className="text-[11px] text-text-muted">{formattedDate}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <span className="text-text-secondary">
              Oleh: <strong className="text-text-dark">@{item.uploader}</strong>
            </span>
            <span className="text-text-muted">•</span>
            <span className="font-mono text-text-secondary">
              {item.width} x {item.height} px
            </span>
            <span className="text-text-muted">•</span>
            <span className="text-text-secondary">
              LSB: <span className="font-mono">{item.embeddedBitsCount} bit</span>
            </span>
          </div>

          {/* Metrik Kualitas Citra: PSNR & MSE */}
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="material-symbols-outlined text-[13px]">analytics</span>
              PSNR: {item.psnrDb} dB
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-canvas text-text-secondary border border-sage-border">
              MSE: {item.mse}
            </span>
          </div>

          {/* Aksi: Buka/Dekripsi & Unduh PNG */}
          <div className="mt-2.5 flex gap-2 flex-wrap items-center pt-1">
            <button
              type="button"
              onClick={() => onExtract(item.id)}
              disabled={isExtracting}
              className="h-7 px-3 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">
                {isExtracting ? 'progress_activity' : 'lock_open'}
              </span>
              <span>{isExtracting ? 'Mendekripsi...' : 'Buka Catatan Tersembunyi'}</span>
            </button>

            {item.imageDataUrl && (
              <a
                href={item.imageDataUrl}
                download={item.storedPngName}
                className="h-7 px-2.5 rounded-lg border border-sage-border bg-surface hover:bg-canvas text-text-dark text-xs font-medium flex items-center gap-1 transition"
              >
                <span className="material-symbols-outlined text-sm text-text-secondary">
                  download
                </span>
                <span>Unduh PNG Lossless</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Bagian Hasil Ekstraksi Catatan Tersembunyi */}
      {extracted && (
        <div className="mt-2 rounded-lg bg-emerald-50/70 border border-emerald-200 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-emerald-200/80 pb-2">
            <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
              <span className="material-symbols-outlined text-base">verified</span>
              <span>Catatan Rahasia Terdekripsi (AES-256-GCM)</span>
            </div>
            <StatusBadge status="ASLI" />
          </div>

          <div className="bg-surface/80 rounded-md p-2.5 border border-emerald-100 text-text-dark whitespace-pre-wrap font-sans text-xs leading-relaxed">
            {extracted.note}
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] text-text-secondary pt-1">
            <span>
              Pengirim: <strong className="text-text-dark">@{extracted.senderUsername}</strong>
            </span>
            <div className="flex items-center gap-1">
              <span>SHA-256 Cover:</span>
              <HashText value={extracted.coverSha256} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
