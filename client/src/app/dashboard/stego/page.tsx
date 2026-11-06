'use client';

import React, { useEffect, useState } from 'react';
import { DashboardNav } from '../../../components/DashboardNav';
import { apiRequest } from '../../../lib/api';

export default function StegoPage() {
  const [title, setTitle] = useState('Foto Bukti Lapangan');
  const [secretMessage, setSecretMessage] = useState('');
  const [passkey, setPasskey] = useState('KunciDemo2026');
  const [coverPngBase64, setCoverPngBase64] = useState<string | undefined>(
    undefined
  );
  const [gallery, setGallery] = useState<any[]>([]);
  const [extractedText, setExtractedText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  async function loadGallery() {
    const data = await apiRequest('/api/stego');
    setGallery(data);
  }

  function handleSelectCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setCoverPngBase64(undefined);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(img.width, 360);
        canvas.height = Math.min(img.height, 260);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setCoverPngBase64(canvas.toDataURL('image/png'));
        }
      };
      img.src = String(ev.target?.result || '');
    };
    reader.readAsDataURL(file);
  }

  async function handleEmbed(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    try {
      await apiRequest('/api/stego/embed', 'POST', {
        title,
        secretMessage,
        passkey,
        coverPngBase64,
      });
      setSecretMessage('');
      await loadGallery();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  async function handleExtract(id: number) {
    setErrorMsg('');
    try {
      const res = await apiRequest('/api/stego/extract', 'POST', {
        id,
        passkey,
      });
      setExtractedText(res.secretMessage);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  }

  useEffect(() => {
    loadGallery();
  }, []);

  return (
    <>
      <DashboardNav />
      <main style={{ maxWidth: 1020, margin: '0 auto', padding: '0 20px 48px' }}>
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

        <form
          onSubmit={handleEmbed}
          style={{
            background: '#111827',
            padding: 20,
            borderRadius: 12,
            border: '1px solid #334155',
            marginBottom: 24,
          }}
        >
          <label>Judul Bukti Gambar</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
          <label>Pilih Gambar Cover (Kosongkan untuk Gambar PNG Otomatis)</label>
          <input type="file" accept="image/*" onChange={handleSelectCover} />
          <label>Pesan Rahasia yang Disisipkan ke LSB</label>
          <textarea
            value={secretMessage}
            onChange={(e) => setSecretMessage(e.target.value)}
            placeholder="Ketik pesan rahasia..."
          />
          <label>Passkey Steganografi</label>
          <input value={passkey} onChange={(e) => setPasskey(e.target.value)} />
          <button type="submit">🧬 Tanamkan Pesan ke LSB PNG</button>
        </form>

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

        {gallery.map((s) => (
          <div
            key={s.id}
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
            {s.imageDataUrl && (
              <img
                src={s.imageDataUrl}
                alt={s.title}
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
                {s.title} — PSNR: {s.psnrDb} dB (MSE: {s.mse})
              </strong>
              <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 4 }}>
                Resolusi: {s.width}x{s.height} px | Bit Tertanam: {s.embeddedBitsCount} bit
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => handleExtract(s.id)}>
                  🔍 Ekstrak Pesan dari LSB
                </button>
                {s.imageDataUrl && (
                  <a href={s.imageDataUrl} download={s.storedPngName}>
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
        ))}
      </main>
    </>
  );
}
