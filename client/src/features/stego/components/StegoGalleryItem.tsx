'use client';

import React from 'react';
import { StegoImageRecord } from '../types/stego.types';

interface StegoGalleryItemProps {
  item: StegoImageRecord;
  onExtract: (id: number) => void;
}

export function StegoGalleryItem({ item, onExtract }: StegoGalleryItemProps) {
  return (
    <div className="p-4 rounded-xl bg-surface border border-sage-border shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-3 hover:border-primary/40 transition">
      <div className="flex items-center gap-3.5 min-w-0">
        {item.imageDataUrl ? (
          <img
            src={item.imageDataUrl}
            alt={item.title}
            className="w-20 h-16 object-cover rounded-lg border border-sage-border shrink-0 bg-canvas"
          />
        ) : (
          <div className="w-20 h-16 rounded-lg bg-sage-tint border border-sage-border flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-2xl">image</span>
          </div>
        )}

        <div className="min-w-0">
          <h3 className="font-semibold text-xs text-text-dark truncate">
            {item.title}
          </h3>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-text-secondary mt-1">
            <span>Dimensi: {item.width}x{item.height} px</span>
            <span>&bull;</span>
            <span>Bit Tersembunyi: {item.embeddedBitsCount} bit</span>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              PSNR: {item.psnrDb} dB
            </span>
            <span className="text-[10px] font-mono text-text-muted">
              MSE: {item.mse}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
        {item.imageDataUrl && (
          <a
            href={item.imageDataUrl}
            download={item.storedPngName || 'stego_image.png'}
            className="h-8 px-3 rounded-lg border border-sage-border bg-surface hover:bg-canvas text-text-dark text-xs font-medium flex items-center gap-1.5 transition"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span>Unduh PNG</span>
          </a>
        )}

        <button
          type="button"
          onClick={() => onExtract(item.id)}
          className="h-8 px-3.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition"
        >
          <span className="material-symbols-outlined text-sm">lock_open</span>
          <span>Ekstrak Pesan</span>
        </button>
      </div>
    </div>
  );
}
