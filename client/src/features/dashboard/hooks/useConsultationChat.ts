'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiRequest } from '@/lib/api';
import { useToast } from '@/components/ui';
import { ChatConversation, ChatMessageItem, ImportantCategory } from '../types/dashboard.types';
import { CATEGORY_LABEL } from '../utils';

interface ServerConversation {
  id: number; topic: string;
  studentUsername: string | null; studentFullName: string;
  lecturerUsername: string | null; lecturerFullName: string;
}
interface ServerMessage {
  id: number; sender: string; plaintext?: string;
  status: 'DELIVERED' | 'CORRUPTED'; createdAt: string;
}
interface ServerImportant { messageId: number; category: ImportantCategory }

const POLL_MS = 3000;

function toItem(m: ServerMessage, me: string): ChatMessageItem {
  const corrupted = m.status === 'CORRUPTED';
  const time = new Date(m.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return {
    id: m.id,
    sender: m.sender,
    timestamp: `${time} WIB`,
    content: m.plaintext ?? '',
    isMe: m.sender === me,
    statusText: corrupted ? 'Pesan rusak / terdeteksi dimanipulasi' : `Super Encrypted • ${time}`,
    statusIcon: corrupted ? 'gpp_bad' : 'lock',
  };
}

// Ref: FR-CHAT-01..05, FR-VAULT-01
export function useConsultationChat(username?: string) {
  const toast = useToast();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [convId, setConvId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [marks, setMarks] = useState<Record<number, ImportantCategory>>({});
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const lastId = useRef(0);
  const activeConv = useRef<number | null>(null);

  // Sesi habis ditampilkan oleh SessionExpiredBanner; di sini cukup hentikan polling.
  const fail = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.code === 'ERR_SESSION_EXPIRED') return setExpired(true);
    setError(e instanceof Error ? e.message : 'Terjadi kesalahan');
  }, []);

  // Identitas pengguna diambil server dari token sesi (header Authorization)
  useEffect(() => {
    if (!username) return;
    apiRequest<ServerConversation[]>('/api/chat/conversations')
      .then((list) => {
        const items = list.map((c): ChatConversation => {
          const iAmStudent = c.studentUsername === username;
          const peerUsername = (iAmStudent ? c.lecturerUsername : c.studentUsername) ?? '';
          const peerName = (iAmStudent ? c.lecturerFullName : c.studentFullName) || peerUsername;
          return { id: c.id, topic: c.topic, peerName, peerUsername };
        });
        setConversations(items);
        setConvId((cur) => cur ?? items[0]?.id ?? null);
      })
      .catch(fail)
      .finally(() => setLoaded(true));
  }, [username, fail]);

  // Ganti percakapan: reset aliran pesan & muat tanda penting
  useEffect(() => {
    activeConv.current = convId;
    lastId.current = 0;
    setMessages([]);
    setMarks({});
    setError('');
    if (!convId) return;
    apiRequest<ServerImportant[]>(`/api/vault/important?convId=${convId}`)
      .then((rows) => {
        if (activeConv.current !== convId) return;
        setMarks(Object.fromEntries(rows.map((r) => [r.messageId, r.category])));
      })
      .catch(() => { /* tanda penting hanya pelengkap tampilan */ });
  }, [convId]);

  const poll = useCallback(async () => {
    const id = convId;
    if (!id || !username || expired) return;
    try {
      const fresh = await apiRequest<ServerMessage[]>('/api/chat/fetch', 'POST', {
        convId: id,
        afterId: lastId.current,
      });
      if (activeConv.current !== id || !fresh.length) return;
      lastId.current = fresh[fresh.length - 1].id;
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...prev, ...fresh.filter((m) => !seen.has(m.id)).map((m) => toItem(m, username))];
      });
      setError('');
    } catch (e) {
      fail(e);
    }
  }, [convId, username, expired, fail]);

  useEffect(() => {
    if (!convId) return;
    poll();
    const t = setInterval(() => { if (!document.hidden) poll(); }, POLL_MS);
    return () => clearInterval(t);
  }, [convId, poll]);

  async function sendMessage() {
    const text = inputText.trim();
    if (!text || !convId || !username || isSending || expired) return;
    setIsSending(true);
    try {
      await apiRequest('/api/chat/send', 'POST', { convId, plaintext: text });
      setInputText('');
      await poll();
    } catch (e) {
      fail(e);
    } finally {
      setIsSending(false);
    }
  }

  // FR-VAULT-01: server memverifikasi role dosen & kepesertaan, lalu mengambil isi pesan sendiri
  const markImportant = useCallback(
    async (messageId: number, category: ImportantCategory) => {
      if (!convId) return;
      try {
        const rec = await apiRequest<{ category: ImportantCategory }>('/api/vault/important', 'POST', {
          convId,
          messageId,
          category,
        });
        setMarks((prev) => ({ ...prev, [messageId]: rec.category }));
        toast.show(`Pesan ditandai: ${CATEGORY_LABEL[rec.category]}`, 'success');
      } catch (e) {
        if (e instanceof ApiError && e.code === 'ERR_SESSION_EXPIRED') return setExpired(true);
        toast.show(e instanceof Error ? e.message : 'Gagal menandai pesan', 'error');
      }
    },
    [convId, toast]
  );

  return {
    conversations,
    convId,
    selectConversation: setConvId,
    activeConversation: conversations.find((c) => c.id === convId) ?? null,
    loaded,
    messages,
    marks,
    inputText,
    setInputText,
    sendMessage,
    isSending,
    error,
    clearError: () => setError(''),
    expired,
    markImportant,
  };
}