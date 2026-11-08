'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiRequest } from '@/lib/api';
import { useToast } from '@/components/ui';
import { issueAsset, listIssuerAssets, listStudentAssets } from '../api/blockchainApi';
import {
  AcademicAsset,
  IssuableAssetType,
  StudentOption,
} from '../types/blockchain.types';
import { readAsDataUrl, validateDocument } from '../utils';

interface ServerConversation {
  topic: string;
  studentUsername: string | null;
  studentFullName: string;
}

export interface IssueInput {
  assetType: IssuableAssetType;
  studentId: string;
  title: string;
  file: File;
}

// Ref: FR-CHAIN-02 (terbit, dosen), FR-CHAIN-06 (aset mahasiswa), UA-DSN-09 (riwayat penerbitan)
// Admin tidak memanggil apa pun di sini (server menolak 403).
export function useAssets(role: 'student' | 'lecturer' | 'admin', enabled: boolean) {
  const toast = useToast();
  const [assets, setAssets] = useState<AcademicAsset[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState('');

  const fail = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.code === 'ERR_SESSION_EXPIRED') return;
    setError(e instanceof Error ? e.message : 'Terjadi kesalahan');
  }, []);

  const load = useCallback(async () => {
    if (!enabled || role === 'admin') return;
    setLoading(true);
    try {
      if (role === 'student') {
        setAssets(await listStudentAssets());
      } else {
        const [rows, convs] = await Promise.all([
          listIssuerAssets(),
          apiRequest<ServerConversation[]>('/api/chat/conversations'),
        ]);
        setAssets(rows);
        setStudents(
          convs
            .filter((c) => !!c.studentUsername)
            .map((c) => ({
              username: c.studentUsername as string,
              fullName: c.studentFullName || (c.studentUsername as string),
              topic: c.topic,
            }))
        );
      }
      setError('');
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }, [enabled, role, fail]);

  useEffect(() => {
    load();
  }, [load]);

  // Penerbit & private key diambil server dari sesi dosen; klien hanya mengirim data aset
  async function issue(input: IssueInput): Promise<boolean> {
    const invalid = validateDocument(input.file);
    if (invalid) {
      toast.show(invalid, 'error');
      return false;
    }
    setIssuing(true);
    try {
      const res = await issueAsset({
        assetType: input.assetType,
        studentId: input.studentId,
        title: input.title.trim(),
        documentBase64: await readAsDataUrl(input.file),
      });
      toast.show(
        res.isDuplicate
          ? `Dokumen ini sudah pernah diterbitkan (Blok #${res.blockIndex})`
          : `Aset diterbitkan dan ditandatangani (Blok #${res.blockIndex})`,
        res.isDuplicate ? 'info' : 'success'
      );
      await load();
      return true;
    } catch (e) {
      if (!(e instanceof ApiError && e.code === 'ERR_SESSION_EXPIRED')) {
        toast.show(e instanceof Error ? e.message : 'Gagal menerbitkan aset', 'error');
      }
      return false;
    } finally {
      setIssuing(false);
    }
  }

  return {
    assets,
    students,
    loading,
    issuing,
    error,
    clearError: () => setError(''),
    reload: load,
    issue,
  };
}