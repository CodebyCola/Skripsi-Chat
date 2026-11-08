'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, apiRequest } from '@/lib/api';
import { useToast } from '@/components/ui';
import { listImportant, unmarkImportant } from '../api/messagesApi';
import {
  CategoryFilter,
  ImportantConversation,
  ImportantMessage,
} from '../types/messages.types';

interface ServerConversation {
  id: number;
  topic: string;
  studentUsername: string | null;
  studentFullName: string;
  lecturerUsername: string | null;
  lecturerFullName: string;
}

// Ref: FR-VAULT-03 (daftar), FR-VAULT-04 (cabut tanda, dosen)
export function useImportantMessages(username?: string) {
  const toast = useToast();
  const [items, setItems] = useState<ImportantMessage[]>([]);
  const [conversations, setConversations] = useState<ImportantConversation[]>([]);
  const [category, setCategory] = useState<CategoryFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');

  // Sesi habis ditampilkan oleh SessionExpiredBanner (event dari lib/api); di sini cukup diam.
  const fail = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.code === 'ERR_SESSION_EXPIRED') return;
    setError(e instanceof Error ? e.message : 'Terjadi kesalahan');
  }, []);

  const load = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    try {
      const [rows, convs] = await Promise.all([
        listImportant(),
        apiRequest<ServerConversation[]>('/api/chat/conversations'),
      ]);
      setItems(rows);
      setConversations(
        convs.map((c): ImportantConversation => {
          const iAmStudent = c.studentUsername === username;
          const peerUsername = (iAmStudent ? c.lecturerUsername : c.studentUsername) ?? '';
          const peerName = (iAmStudent ? c.lecturerFullName : c.studentFullName) || peerUsername;
          return { id: c.id, topic: c.topic, peerName };
        })
      );
      setError('');
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }, [username, fail]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => (category === 'ALL' ? items : items.filter((m) => m.category === category)),
    [items, category]
  );

  const counts = useMemo(() => {
    const c: Record<CategoryFilter, number> = {
      ALL: items.length, ACC: 0, REVISI: 0, JADWAL_SIDANG: 0, LAINNYA: 0,
    };
    for (const m of items) c[m.category] += 1;
    return c;
  }, [items]);

  // FR-VAULT-04: server menegakkan role dosen & kepesertaan percakapan
  async function unmark(message: ImportantMessage): Promise<boolean> {
    setBusyId(message.messageId);
    try {
      await unmarkImportant(message.messageId);
      setItems((prev) => prev.filter((m) => m.messageId !== message.messageId));
      toast.show('Tanda penting dicabut', 'success');
      return true;
    } catch (e) {
      if (!(e instanceof ApiError && e.code === 'ERR_SESSION_EXPIRED')) {
        toast.show(e instanceof Error ? e.message : 'Gagal mencabut tanda', 'error');
      }
      return false;
    } finally {
      setBusyId(null);
    }
  }

  return {
    items: visible,
    total: items.length,
    counts,
    conversations,
    category,
    setCategory,
    loading,
    busyId,
    error,
    clearError: () => setError(''),
    reload: load,
    unmark,
  };
}