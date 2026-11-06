'use client';

import { useEffect, useState } from 'react';
import {
  embedSecretMessage,
  extractSecretMessage,
  fetchStegoGallery,
} from '../api/stegoApi';
import { StegoImageRecord } from '../types/stego.types';

export function useStego() {
  const [title, setTitle] = useState('Foto Bukti Lapangan');
  const [secretMessage, setSecretMessage] = useState('');
  const [passkey, setPasskey] = useState('KunciDemo2026');
  const [coverPngBase64, setCoverPngBase64] = useState<string | undefined>(
    undefined
  );
  const [gallery, setGallery] = useState<StegoImageRecord[]>([]);
  const [extractedText, setExtractedText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadGallery() {
    try {
      const data = await fetchStegoGallery();
      setGallery(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat galeri steganografi');
    }
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
    setLoading(true);
    try {
      await embedSecretMessage({
        title,
        secretMessage,
        passkey,
        coverPngBase64,
      });
      setSecretMessage('');
      await loadGallery();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menanamkan pesan ke LSB');
    } finally {
      setLoading(false);
    }
  }

  async function handleExtract(id: number) {
    setErrorMsg('');
    try {
      const res = await extractSecretMessage(id, passkey);
      setExtractedText(res.secretMessage);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengekstrak pesan');
    }
  }

  useEffect(() => {
    loadGallery();
  }, []);

  return {
    title,
    setTitle,
    secretMessage,
    setSecretMessage,
    passkey,
    setPasskey,
    coverPngBase64,
    gallery,
    extractedText,
    errorMsg,
    loading,
    handleSelectCover,
    handleEmbed,
    handleExtract,
    loadGallery,
  };
}
