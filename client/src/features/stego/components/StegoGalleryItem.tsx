'use client';

import React from 'react';
import { StegoImageRecord } from '../types/stego.types';

interface StegoGalleryItemProps {
  item: StegoImageRecord;
  onExtract: (id: number) => void;
}

export function StegoGalleryItem({ item, onExtract }: StegoGalleryItemProps) {
  return (
    <div
      style={{
        background: '#111827',
        padding: 16,
        borderRadius: 10,
        border: '1px solid #334155',
        marginBottom: 12,
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      {item.imageDataUrl && (
        <img
          src={item.imageDataUrl}
          alt={item.title}
          style={{
            width: 120,
            height: 85,
            objectFit: 'cover',
            borderRadius: 8,
            border: '1px solid #334155',
          }}
        />
      )}
      <div style={{ flex: 1 }}>
        <strong>
          {item.title} — PSNR: {item.psnrDb} dB (MSE: {item.mse})
        </strong>
        <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 4 }}>
          Resolusi: {item.width}x{item.height} px | Bit Tertanam:{' '}
          {item.embeddedBitsCount} bit
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => onExtract(item.id)}>
            🔍 Ekstrak Pesan dari LSB
          </button>
          {item.imageDataUrl && (
            <a href={item.imageDataUrl} download={item.storedPngName}>
              <button
                type="button"
                style={{ background: '#1e293b', border: '1px solid #334155' }}
              >
                ⬇️ Unduh PNG
              </button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
