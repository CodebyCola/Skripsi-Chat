'use client';

import React from 'react';
import Link from 'next/link';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useConsultationChat } from '../hooks/useConsultationChat';
import { ChatStream } from './ChatStream';
import { ChatInputDock } from './ChatInputDock';
import { CipherInspectModal } from './CipherInspectModal';
import { ChatMessageItem } from '../types/dashboard.types';

export function DashboardWorkspace() {
  const { user } = useCurrentUser();
  const {
    messages,
    inputText,
    setInputText,
    passphrase,
    setPassphrase,
    sendMessage,
    isSending,
    markImportant,
    deleteChatMessage,
    inspectMessage,
    setInspectMessage,
  } = useConsultationChat(user);

  function handleMarkImportantPrompt(msg: ChatMessageItem) {
    const choice = prompt(
      'Pilih Kategori Pesan Penting:\n1. ACC (Persetujuan Sidang)\n2. REVISI (Catatan Revisi Mayor)\n3. JADWAL_SIDANG (Batas Waktu/Jadwal)\n\nKetik: ACC / REVISI / JADWAL_SIDANG',
      'ACC'
    );
    if (!choice) return;

    const raw = choice.trim().toUpperCase();
    let cat: 'ACC' | 'REVISI' | 'JADWAL_SIDANG' = 'ACC';
    if (raw === '1' || raw === 'ACC') {
      cat = 'ACC';
    } else if (raw === '2' || raw.includes('REVISI')) {
      cat = 'REVISI';
    } else if (raw === '3' || raw.includes('JADWAL')) {
      cat = 'JADWAL_SIDANG';
    }
    markImportant(msg.id, msg.content, cat);
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-canvas">
      {/* WORKSPACE HEADER: Per ketentuan #8 (ID bimbingan dihilangkan & aksi diselaraskan dengan database) */}
      <div className="h-16 px-6 bg-surface border-b border-sage-border flex items-center justify-between shrink-0 flex-wrap gap-2">
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] text-text-secondary">
            Sesi Diskusi Bimbingan Skripsi
          </span>
          <h1 className="font-display font-semibold text-sm text-text-dark truncate">
            Bab 4: Pengujian Super Enkripsi &amp; Hasil Evaluasi
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {/* INTERACTIVE SESSION KEY CONTROL (UNTUK PEMBUKTIAN SIDANG) */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-sage-border bg-canvas text-xs">
            <span className="material-symbols-outlined text-sm text-text-muted">key</span>
            <span className="text-[11px] font-mono text-text-secondary">Kunci Sesi:</span>
            <input
              type="text"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Kunci Sesi..."
              title="Kunci Super Enkripsi Teks (Ubah untuk menguji dekripsi kunci benar vs salah)"
              className="bg-transparent border-0 p-0 text-xs font-mono font-semibold text-text-dark w-28 focus:ring-0 focus:outline-none"
            />
          </div>

          <Link
            href="/dashboard/messages"
            className="h-8 px-3 rounded-lg border border-sage-border bg-surface hover:bg-canvas text-text-dark text-xs font-medium flex items-center gap-1.5 transition"
          >
            <span className="material-symbols-outlined text-base text-text-secondary">
              bookmark
            </span>
            <span>Pesan Penting</span>
          </Link>

          <Link
            href="/dashboard/files"
            className="h-8 px-3.5 rounded-lg border border-primary bg-primary text-white hover:bg-primary-hover text-xs font-medium flex items-center gap-1.5 shadow-xs transition"
          >
            <span className="material-symbols-outlined text-base">
              folder_open
            </span>
            <span>Naskah &amp; Berkas</span>
          </Link>
        </div>
      </div>

      {/* CHAT STREAM (SCROLLABLE MESSAGE LIST) */}
      <ChatStream
        messages={messages}
        onInspect={(msg) => setInspectMessage(msg)}
        onMarkImportant={handleMarkImportantPrompt}
        onDelete={deleteChatMessage}
      />

      {/* CHAT INPUT DOCK (BOTTOM ATTACH & SEND) */}
      <ChatInputDock
        inputText={inputText}
        onChangeText={setInputText}
        onSend={sendMessage}
        isSending={isSending}
      />

      {/* MODAL INSPEKTUR SUPER ENKRIPSI 3-LAPIS (KRITERIA #3) */}
      <CipherInspectModal
        message={inspectMessage}
        onClose={() => setInspectMessage(null)}
      />
    </div>
  );
}
