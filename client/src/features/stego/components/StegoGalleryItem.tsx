'use client';

import React from 'react';
import { StegoImageRecord } from '../types/stego.types';

interface StegoGalleryItemProps {
  item: StegoImageRecord;
  onExtract: (id: number) => void;
}

export function StegoGalleryItem({ item, onExtract }: StegoGalleryItemProps) {
  return (
    <div className="bg-surface border border-sage-border rounded-xl p-4 shadow-xs flex gap-4 items-center flex-wrap">
      {item.imageDataUrl && (
        <img
          src={item.imageDataUrl}
          alt={item.title}
          className="w-[120px] h-[85px] object-cover rounded-lg border border-sage-border"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-text-dark">
          {item.title} — PSNR: {item.psnrDb} dB (MSE: {item.mse})
        </p>
        <p className="mt-1 text-[11px] font-mono text-text-secondary">
          Resolusi: {item.width}x{item.height} px | Bit Tertanam:{' '}
          {item.embeddedBitsCount} bit
        </p>
        <div className="mt-2.5 flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onExtract(item.id)}
            className="h-8 px-3 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition"
          >
            <span className="material-symbols-outlined text-base">search</span>
            <span>Ekstrak Pesan dari LSB</span>
          </button>
          {item.imageDataUrl && (
            <a
              href={item.imageDataUrl}
              download={item.storedPngName}
              className="h-8 px-3 rounded-lg border border-sage-border bg-surface hover:bg-canvas text-text-dark text-xs font-medium flex items-center gap-1.5 transition"
            >
              <span className="material-symbols-outlined text-base text-text-secondary">
                download
              </span>
              <span>Unduh PNG</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
