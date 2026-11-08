'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiRequest } from '@/lib/api';
import { useToast } from '@/components/ui';
import {
  embedSecretMessage,
  extractSecretMessage,
  fetchStegoGallery,
} from '../api/stegoApi';
import {
  ExtractedStegoData,
  StegoConversation,
  StegoImageRecord,
} from '../types/stego.types';

interface ServerConversation {
  id: number;
  topic: string;
  studentUsername: string | null;
  studentFullName: string;
  lecturerUsername: string | null;
  lecturerFullName: string;
}

// Perkiraan overhead JSON kanonik ({v, conv_id, sender_id, sent_at, cover_sha256}) + AES-GCM (nonce + tag)
const ESTIMATED_OVERHEAD_BYTES = 160;
const DEFAULT_COVER_WIDTH = 320;
const DEFAULT_COVER_HEIGHT = 240;
const calcCapacity = (w: number, h: number) => Math.max(0, Math.floor((w * h * 3) / 8) - 9);

export function useStego(username?: string) {
  const toast = useToast();

  const [conversations, setConversations] = useState<StegoConversation[]>([]);
  const [convId, setConvId] = useState<number | null>(null);

  const [title, setTitle] = useState('Foto Bukti Lapangan');
  const [note, setNote] = useState('');
  const [coverPngBase64, setCoverPngBase64] = useState<string | undefined>(undefined);
  const [coverDimensions, setCoverDimensions] = useState<{ width: number; height: number }>({
    width: DEFAULT_COVER_WIDTH,
    height: DEFAULT_COVER_HEIGHT,
  });

  const [gallery, setGallery] = useState<StegoImageRecord[]>([]);
  const [extractedData, setExtractedData] = useState<Record<number, ExtractedStegoData>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [extractingId, setExtractingId] = useState<number | null>(null);

  const fail = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.code === 'ERR_SESSION_EXPIRED') return;
    setError(e instanceof Error ? e.message : 'Terjadi kesalahan sistem');
  }, []);

  // Muat daftar percakapan pengguna
  useEffect(() => {
    if (!username) return;
    apiRequest<ServerConversation[]>('/api/chat/conversations')
      .then((list) => {
        const items = list.map((c): StegoConversation => {
          const iAmStudent = c.studentUsername === username;
          const peerUsername = (iAmStudent ? c.lecturerUsername : c.studentUsername) ?? '';
          const peerName = (iAmStudent ? c.lecturerFullName : c.studentFullName) || peerUsername;
          return { id: c.id, topic: c.topic, peerName };
        });
        setConversations(items);
        setConvId((cur) => cur ?? items[0]?.id ?? null);
        if (!items.length) setLoading(false);
      })
      .catch((e) => {
        fail(e);
        setLoading(false);
      });
  }, [username, fail]);

  // Muat galeri gambar steganografi sesuai percakapan aktif
  const loadGallery = useCallback(
    async (targetConvId: number) => {
      setLoading(true);
      try {
        const data = await fetchStegoGallery(targetConvId);
        setGallery(data);
        setError('');
      } catch (err) {
        fail(err);
      } finally {
        setLoading(false);
      }
    },
    [fail]
  );

  useEffect(() => {
    setGallery([]);
    setExtractedData({});
    if (convId) loadGallery(convId);
  }, [convId, loadGallery]);

  // Penanganan pemilihan cover gambar oleh pengguna (dikonversi ke PNG Lossless via Canvas)
  function handleSelectCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setCoverPngBase64(undefined);
      setCoverDimensions({ width: DEFAULT_COVER_WIDTH, height: DEFAULT_COVER_HEIGHT });
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // Konversi ke canvas resolusi proporsional (maks 640x480 agar efisien memori)
        const maxW = 640;
        const maxH = 480;
        let w = img.width;
        let h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const pngUrl = canvas.toDataURL('image/png');
          setCoverPngBase64(pngUrl);
          setCoverDimensions({ width: w, height: h });
        }
      };
      img.src = String(ev.target?.result || '');
    };
    reader.readAsDataURL(file);
  }

  function handleResetCover() {
    setCoverPngBase64(undefined);
    setCoverDimensions({ width: DEFAULT_COVER_WIDTH, height: DEFAULT_COVER_HEIGHT });
  }

  // Kapasitas muat maksimum citra penampung
  const maxCapacityBytes = calcCapacity(coverDimensions.width, coverDimensions.height);
  const notePayloadBytes = new TextEncoder().encode(note).length + ESTIMATED_OVERHEAD_BYTES;
  const isCapacityExceeded = notePayloadBytes > maxCapacityBytes;

  // FR-IMG-01, 02, 04 — Menyisipkan catatan tersembunyi ke LSB PNG
  async function handleEmbed(e: React.FormEvent) {
    e.preventDefault();
    if (!convId || uploading) return;

    if (!note.trim()) {
      return toast.show('Catatan rahasia yang disembunyikan wajib diisi', 'error');
    }

    if (isCapacityExceeded) {
      return toast.show(
        `Catatan (${notePayloadBytes} byte) melebihi kapasitas citra (${maxCapacityBytes} byte). Kurangi catatan atau gunakan citra lebih besar.`,
        'error'
      );
    }

    setError('');
    setUploading(true);
    try {
      const result = await embedSecretMessage({
        convId,
        title: title.trim() || 'Foto Bukti Lapangan',
        note: note.trim(),
        coverPngBase64,
      });

      toast.show(
        `Foto "${result.title}" berhasil disematkan ke LSB PNG (PSNR: ${result.psnrDb} dB)`,
        'success'
      );
      setNote('');
      await loadGallery(convId);
    } catch (err: any) {
      fail(err);
      toast.show(err.message || 'Gagal menyematkan catatan ke LSB', 'error');
    } finally {
      setUploading(false);
    }
  }

  // FR-IMG-03 — Mengekstrak dan mendekripsi catatan dari LSB PNG
  async function handleExtract(id: number) {
    setError('');
    setExtractingId(id);
    try {
      const res = await extractSecretMessage({ id });
      setExtractedData((prev) => ({ ...prev, [id]: res }));
      toast.show('Catatan rahasia berhasil didekripsi dengan subkey k_stego', 'success');
    } catch (err: any) {
      fail(err);
      toast.show(err.message || 'Gagal mengekstrak catatan dari LSB', 'error');
    } finally {
      setExtractingId(null);
    }
  }

  return {
    conversations,
    convId,
    selectConversation: setConvId,
    title,
    setTitle,
    note,
    setNote,
    coverPngBase64,
    coverDimensions,
    maxCapacityBytes,
    notePayloadBytes,
    isCapacityExceeded,
    gallery,
    extractedData,
    error,
    clearError: () => setError(''),
    loading,
    uploading,
    extractingId,
    handleSelectCover,
    handleResetCover,
    handleEmbed,
    handleExtract,
    reload: () => convId && loadGallery(convId),
  };
}
