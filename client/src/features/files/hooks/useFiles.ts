'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiRequest } from '@/lib/api';
import { useToast } from '@/components/ui';
import { downloadFile, listFiles, reviewFile, uploadFile } from '../api/filesApi';
import {
  FileConversation,
  FileRecord,
  HashCheck,
  ReviewStatus,
} from '../types/files.types';

// Ref: FR-FILE-01 — batas yang sama dengan server (MAX_FILE_MB, ALLOWED_FILE_EXT)
const MAX_MB = 25;
const ALLOWED_EXT = ['pdf', 'docx'];

interface ServerConversation {
  id: number;
  topic: string;
  studentUsername: string | null;
  studentFullName: string;
  lecturerUsername: string | null;
  lecturerFullName: string;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Gagal membaca berkas dari perangkat'));
    reader.readAsDataURL(file);
  });
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

// Ref: FR-FILE-01..05 (UA-MHS-07..09, UA-DSN-04..05)
export function useFiles(username?: string) {
  const toast = useToast();
  const [conversations, setConversations] = useState<FileConversation[]>([]);
  const [convId, setConvId] = useState<number | null>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [checks, setChecks] = useState<Record<number, HashCheck>>({});
  const [error, setError] = useState('');

  // Sesi habis ditampilkan oleh SessionExpiredBanner (event dari lib/api); di sini cukup diam.
  const fail = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.code === 'ERR_SESSION_EXPIRED') return;
    setError(e instanceof Error ? e.message : 'Terjadi kesalahan');
  }, []);

  // Percakapan milik sesi (server yang menyaring berdasarkan token)
  useEffect(() => {
    if (!username) return;
    apiRequest<ServerConversation[]>('/api/chat/conversations')
      .then((list) => {
        const items = list.map((c): FileConversation => {
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

  const loadFiles = useCallback(async (id: number) => {
    setLoading(true);
    try {
      setFiles(await listFiles(id));
      setError('');
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }, [fail]);

  useEffect(() => {
    setFiles([]);
    setChecks({});
    if (convId) loadFiles(convId);
  }, [convId, loadFiles]);

  async function upload(file: File) {
    if (!convId || uploading) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXT.includes(ext)) return toast.show('Hanya berkas PDF atau DOCX yang diperbolehkan', 'error');
    if (file.size === 0) return toast.show('Berkas kosong', 'error');
    if (file.size > MAX_MB * 1024 * 1024) return toast.show(`Ukuran berkas melebihi ${MAX_MB} MB`, 'error');

    setUploading(true);
    try {
      const rec = await uploadFile({
        convId,
        originalName: file.name,
        fileBase64: await readAsDataUrl(file),
      });
      toast.show(`${rec.originalName} terunggah sebagai versi ${rec.version} (terenkripsi)`, 'success');
      await loadFiles(convId);
    } catch (e) {
      if (!(e instanceof ApiError && e.code === 'ERR_SESSION_EXPIRED')) {
        toast.show(e instanceof Error ? e.message : 'Gagal mengunggah berkas', 'error');
      }
    } finally {
      setUploading(false);
    }
  }

  // FR-FILE-04: server menolak bila tag/hash tidak cocok; klien membandingkan hash sekali lagi
  async function download(file: FileRecord) {
    setBusyId(file.id);
    try {
      const res = await downloadFile(file.id);
      const bytes = base64ToBytes(res.decryptedBase64);
      const localSha = globalThis.crypto?.subtle ? await sha256Hex(bytes) : res.decryptedSha256;
      if (localSha !== file.originalSha256) {
        setChecks((p) => ({ ...p, [file.id]: { ok: false, message: 'Hash hasil unduhan tidak cocok dengan catatan' } }));
        toast.show('Unduhan ditolak: hash tidak cocok', 'error');
        return;
      }
      const url = URL.createObjectURL(new Blob([bytes], { type: res.mimeType }));
      const a = document.createElement('a');
      a.href = url;
      a.download = res.originalName;
      a.click();
      URL.revokeObjectURL(url);
      setChecks((p) => ({ ...p, [file.id]: { ok: true, sha256: localSha } }));
    } catch (e) {
      if (e instanceof ApiError && e.code === 'ERR_SESSION_EXPIRED') return;
      const message = e instanceof Error ? e.message : 'Gagal mengunduh berkas';
      if (e instanceof ApiError && (e.code === 'ERR_DECRYPT_FAILED' || e.code === 'ERR_INTEGRITY_FAILED')) {
        setChecks((p) => ({ ...p, [file.id]: { ok: false, message } }));
      }
      toast.show(message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  // FR-FILE-05: hanya dosen; server menegakkan role & kepesertaan
  async function review(file: FileRecord, status: ReviewStatus, note: string): Promise<boolean> {
    try {
      await reviewFile(file.id, status, note);
      toast.show(status === 'APPROVED' ? 'Berkas disetujui' : 'Permintaan revisi terkirim', 'success');
      if (convId) await loadFiles(convId);
      return true;
    } catch (e) {
      if (!(e instanceof ApiError && e.code === 'ERR_SESSION_EXPIRED')) {
        toast.show(e instanceof Error ? e.message : 'Gagal menyimpan review', 'error');
      }
      return false;
    }
  }

  return {
    conversations,
    convId,
    selectConversation: setConvId,
    files,
    loading,
    uploading,
    busyId,
    checks,
    error,
    clearError: () => setError(''),
    reload: () => convId && loadFiles(convId),
    upload,
    download,
    review,
  };
}