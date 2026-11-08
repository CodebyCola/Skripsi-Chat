'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { ChatMessageItem } from '../types/dashboard.types';

interface Conversation { id: number; topic: string }
interface ServerMessage {
  id: number; sender: string; plaintext?: string;
  status: 'DELIVERED' | 'CORRUPTED'; createdAt: string;
}

const POLL_MS = 3000;

function toItem(m: ServerMessage, me: string): ChatMessageItem {
  const corrupted = m.status === 'CORRUPTED';
  return {
    id: m.id,
    sender: m.sender,
    timestamp:
      new Date(m.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
    content: m.plaintext ?? '',
    isMe: m.sender === me,
    statusText: corrupted ? 'Pesan rusak / terdeteksi dimanipulasi' : 'Terkirim & Terenkripsi End-to-End',
    statusIcon: corrupted ? 'gpp_bad' : 'done_all',
  };
}

export function useConsultationChat(username?: string) {
  const [convId, setConvId] = useState<number | null>(null);
  const [topic, setTopic] = useState('');
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const lastId = useRef(0);

  // Identitas pengguna diambil server dari token sesi (header Authorization)
  useEffect(() => {
    if (!username) return;
    apiRequest<Conversation[]>('/api/chat/conversations')
      .then((list) => {
        if (!list[0]) return setError('Belum ada percakapan bimbingan.');
        setConvId(list[0].id);
        setTopic(list[0].topic);
      })
      .catch((e) => setError(e.message));
  }, [username]);

  const poll = useCallback(async () => {
    if (!convId || !username) return;
    try {
      const fresh = await apiRequest<ServerMessage[]>('/api/chat/fetch', 'POST', {
        convId,
        afterId: lastId.current,
      });
      if (!fresh.length) return;
      lastId.current = fresh[fresh.length - 1].id;
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        return [...prev, ...fresh.filter((m) => !seen.has(m.id)).map((m) => toItem(m, username))];
      });
      setError('');
    } catch (e: any) {
      setError(e.message);
    }
  }, [convId, username]);

  useEffect(() => {
    if (!convId) return;
    poll();
    const t = setInterval(() => { if (!document.hidden) poll(); }, POLL_MS);
    return () => clearInterval(t);
  }, [convId, poll]);

  async function sendMessage() {
    const text = inputText.trim();
    if (!text || !convId || !username || isSending) return;
    setIsSending(true);
    try {
      await apiRequest('/api/chat/send', 'POST', { convId, plaintext: text });
      setInputText('');
      await poll();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSending(false);
    }
  }

  return { messages, inputText, setInputText, sendMessage, isSending, topic, error };
}
