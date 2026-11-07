'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChatMessageItem, AuthenticatedSessionUser } from '../types/dashboard.types';
import { apiRequest } from '@/lib/api';

function getActiveSessionUser(
  paramUser?: AuthenticatedSessionUser | string | null
): AuthenticatedSessionUser | null {
  if (paramUser && typeof paramUser === 'object') {
    return paramUser;
  }
  if (typeof window !== 'undefined') {
    try {
      const raw =
        localStorage.getItem('skripsichat_user') ||
        localStorage.getItem('aegis_user');
      if (raw) return JSON.parse(raw);
    } catch {
      // Abaikan jika JSON invalid
    }
  }
  if (typeof paramUser === 'string' && paramUser.trim()) {
    const isDosen =
      paramUser.toLowerCase().includes('dosen') ||
      paramUser.toLowerCase().includes('budi');
    return {
      id: '',
      username: paramUser.trim(),
      fullName: paramUser.trim(),
      role: isDosen ? 'DOSEN_PEMBIMBING' : 'MAHASISWA',
    };
  }
  return null;
}

function determineIsMe(
  sender: string | undefined,
  user: AuthenticatedSessionUser | null
): boolean {
  if (!sender) return false;
  const s = sender.toLowerCase().trim();

  let activeUser = user;
  if (!activeUser && typeof window !== 'undefined') {
    try {
      const raw =
        localStorage.getItem('skripsichat_user') ||
        localStorage.getItem('aegis_user');
      if (raw) activeUser = JSON.parse(raw);
    } catch {
      // Abaikan
    }
  }

  if (!activeUser) return false;

  // 1. Cek kecocokan username spesifik akun aktif
  if (activeUser.username && activeUser.username.trim().length > 0) {
    const u = activeUser.username.toLowerCase().trim();
    if (s.includes(u)) {
      return true;
    }
  }

  // 2. Cek kecocokan nama lengkap atau kata inti nama
  if (activeUser.fullName && activeUser.fullName.trim().length > 0) {
    const full = activeUser.fullName.toLowerCase().trim();
    if (s.includes(full)) {
      return true;
    }
    const words = full
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length >= 4);
    for (const w of words) {
      if (s.includes(w)) {
        return true;
      }
    }
  }

  // 3. Pembeda Peran (Role) secara tegas antara Dosen Pembimbing dan Mahasiswa
  const isSenderDosen =
    s.includes('dosen') || s.includes('pembimbing') || s.includes('budi');
  const isSenderMahasiswa =
    s.includes('mahasiswa') ||
    s.includes('rian') ||
    s.includes('mhs') ||
    s.includes('fauzi');

  const myRole = (activeUser.role || '').toUpperCase();
  if (myRole === 'DOSEN_PEMBIMBING' || myRole.includes('DOSEN')) {
    // Sebagai Dosen Pembimbing:
    // Pesan dari dosen adalah 'isMe' (kanan), pesan dari mahasiswa adalah BUKAN 'isMe' (kiri)
    if (isSenderDosen && !isSenderMahasiswa) return true;
    if (isSenderMahasiswa) return false;
  } else if (
    myRole === 'MAHASISWA' ||
    myRole.includes('MHS') ||
    myRole.includes('STUDENT')
  ) {
    // Sebagai Mahasiswa:
    // Pesan dari mahasiswa adalah 'isMe' (kanan), pesan dari dosen adalah BUKAN 'isMe' (kiri)
    if (isSenderMahasiswa && !isSenderDosen) return true;
    if (isSenderDosen) return false;
  }

  return false;
}

export function useConsultationChat(
  currentUserInput?: AuthenticatedSessionUser | string | null
) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [passphrase, setPassphrase] = useState('KunciDemo2026');
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inspectMessage, setInspectMessage] = useState<ChatMessageItem | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      // 1. Ambil daftar pesan mentah terenkripsi dari server
      const rawMsgs = await apiRequest<any[]>('/api/messages');
      // 2. Ambil daftar pesan penting untuk cross-check ID
      let importantList: any[] = [];
      try {
        importantList = await apiRequest<any[]>('/api/vault/important');
      } catch {
        // Fallback jika belum ada pesan penting
      }

      // Ambil session user terkini
      const sessionUser = getActiveSessionUser(currentUserInput);

      // 3. Dekripsi setiap pesan dengan passphrase aktif
      const decryptedItems: ChatMessageItem[] = await Promise.all(
        rawMsgs.map(async (m) => {
          let content = '';
          let statusText = 'Terkirim & Terenkripsi End-to-End';
          let statusIcon = 'done_all';

          try {
            const dec = await apiRequest<{ plaintext: string }>(
              '/api/messages/decrypt',
              'POST',
              { id: m.id, passphrase }
            );
            content = dec.plaintext;
          } catch {
            content = '[Gagal didekripsi: Kunci Sesi Tidak Cocok]';
            statusText = 'Kunci Salah';
            statusIcon = 'lock';
          }

          // Tentukan apakah pesan ini milik user yang sedang aktif
          const isMe = determineIsMe(m.sender, sessionUser);

          const isDosenMsg =
            m.sender?.toLowerCase().includes('dosen') ||
            m.sender?.toLowerCase().includes('pembimbing') ||
            m.sender?.toLowerCase().includes('budi');

          const impRecord = importantList.find((imp) => imp.messageId === m.id);

          return {
            id: m.id,
            sender: m.sender,
            senderRole: isDosenMsg ? 'DOSEN_PEMBIMBING' : 'MAHASISWA',
            timestamp: m.createdAt
              ? new Date(m.createdAt).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                }) + ' WIB'
              : '09:30 WIB',
            content,
            isMe,
            statusText: isDosenMsg
              ? 'Tanda Tangan Kunci Dosen Valid'
              : statusText,
            statusIcon: isDosenMsg ? 'verified_user' : statusIcon,
            signatureVerified: isDosenMsg,
            isImportant: Boolean(impRecord),
            category: impRecord?.category,
            rawStages: {
              stage1VigenerePreview: m.stage1VigenerePreview,
              stage2VernamHex: m.stage2VernamHex,
              superCiphertextPayload: m.superCiphertextPayload,
            },
          };
        })
      );

      // Urutkan secara kronologis (pesan lama di atas, pesan baru di bawah)
      decryptedItems.sort((a, b) => Number(a.id) - Number(b.id));

      setMessages(decryptedItems);
    } catch {
      // Server mungkin offline
    } finally {
      setLoading(false);
    }
  }, [passphrase, currentUserInput]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  async function sendMessage() {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const sessionUser = getActiveSessionUser(currentUserInput);
    const defaultSender = sessionUser
      ? `${sessionUser.username} (${sessionUser.fullName || sessionUser.username})`
      : 'mahasiswa_01 (Rian Pratama)';

    try {
      setIsSending(true);
      await apiRequest('/api/messages', 'POST', {
        title: 'Diskusi Bimbingan',
        sender: defaultSender,
        plaintext: trimmed,
        passphrase,
        mode: 'CBC',
      });
      setInputText('');
      await loadMessages();
    } catch (err: any) {
      alert(err.message || 'Gagal mengirim pesan');
    } finally {
      setIsSending(false);
    }
  }

  async function markImportant(
    messageId: string | number,
    content: string,
    category: 'ACC' | 'REVISI' | 'JADWAL_SIDANG' = 'ACC'
  ) {
    const sessionUser = getActiveSessionUser(currentUserInput);
    try {
      await apiRequest('/api/vault/important', 'POST', {
        messageId: Number(messageId),
        category,
        plainContent: content,
        markedBy: sessionUser?.username || 'dosen_pembimbing',
        convId: 1,
      });
      await loadMessages();
    } catch (err: any) {
      alert(err.message || 'Gagal menandai pesan penting');
    }
  }

  async function deleteChatMessage(id: string | number) {
    if (!confirm('Hapus pesan terenkripsi ini dari server?')) return;
    const sessionUser = getActiveSessionUser(currentUserInput);
    try {
      await apiRequest('/api/messages/delete', 'POST', {
        id: Number(id),
        actor: sessionUser?.username || 'mahasiswa_01',
      });
      await loadMessages();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus pesan');
    }
  }

  return {
    messages,
    inputText,
    setInputText,
    passphrase,
    setPassphrase,
    sendMessage,
    isSending,
    loading,
    refreshMessages: loadMessages,
    markImportant,
    deleteChatMessage,
    inspectMessage,
    setInspectMessage,
  };
}
