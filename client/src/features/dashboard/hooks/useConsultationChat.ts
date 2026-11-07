'use client';

import { useState } from 'react';
import { ChatMessageItem } from '../types/dashboard.types';

const INITIAL_MESSAGES: ChatMessageItem[] = [
  {
    id: 1,
    sender: 'Rian Pratama',
    senderRole: 'MAHASISWA',
    timestamp: '09:32 WIB',
    isMe: true,
    content:
      'Selamat pagi, Pak Budi. Saya telah menyelesaikan pengujian performa algoritma gabungan ChaCha20-Poly1305 dan AES-GCM 256-bit pada draf Bab 4. Waktu latensi enkripsi untuk berkas di bawah 10 MB rata-rata 14.2 milidetik.\n\nBerikut saya lampirkan draf naskah Bab 4 revisi kedua beserta grafik perbandingan latensinya untuk ditinjau.',
    statusText: 'Terkirim & Terenkripsi End-to-End',
    statusIcon: 'done_all',
    attachment: {
      name: 'Draf_Bab4_Revisi2.docx',
      size: '2.4 MB',
      hash: 'SHA-256: 8f4a...9c2e',
      url: '/dashboard/files',
    },
  },
  {
    id: 2,
    sender: 'Dr. Ir. Budi Santoso, M.Kom',
    senderRole: 'DOSEN_PEMBIMBING',
    timestamp: '10:14 WIB',
    isMe: false,
    content:
      'Selamat pagi, Rian. Saya sudah memeriksa data tabel pengujian pada sub-bab 4.3 mengenai ketahanan terhadap serangan brute-force dan analisis avalanche effect. Hasil perhitungan sudah konsisten.\n\nCatatan revisi: Tambahkan sedikit penjelasan perbandingan konsumsi daya memori antara pengujian di server lokal Fasilkom dan pengujian pada klien berbasis ARM64. Jika bagian itu selesai, naskah Bab 4 siap saya berikan rekomendasi ACC.',
    signatureVerified: true,
    statusText: 'Tanda Tangan Kunci Dosen Valid',
    statusIcon: 'verified_user',
  },
  {
    id: 3,
    sender: 'Rian Pratama',
    senderRole: 'MAHASISWA',
    timestamp: '10:20 WIB',
    isMe: true,
    content:
      'Baik, Pak. Saya lengkapi bagian perbandingan konsumsi daya pada sub-bab 4.3.4 sore ini dan akan mengunggah versi perbaikannya.',
    statusText: 'Dibaca oleh Dosen',
    statusIcon: 'done_all',
  },
];

export function useConsultationChat(currentUserName?: string) {
  const [messages, setMessages] = useState<ChatMessageItem[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  function sendMessage() {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    setIsSending(true);

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';

    const newMsg: ChatMessageItem = {
      id: Date.now(),
      sender: currentUserName || 'Mahasiswa',
      senderRole: 'MAHASISWA',
      timestamp: timeStr,
      isMe: true,
      content: trimmed,
      statusText: 'Terkirim & Terenkripsi End-to-End',
      statusIcon: 'done_all',
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    setIsSending(false);
  }

  return {
    messages,
    inputText,
    setInputText,
    sendMessage,
    isSending,
  };
}
