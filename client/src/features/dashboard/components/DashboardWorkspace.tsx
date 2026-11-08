'use client';

import React from 'react';
import Link from 'next/link';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useConsultationChat } from '../hooks/useConsultationChat';
import { ChatStream } from './ChatStream';
import { ChatInputDock } from './ChatInputDock';

export function DashboardWorkspace() {
  const { user } = useCurrentUser();
  const { messages, inputText, setInputText, sendMessage, isSending, topic, error } =
    useConsultationChat(user?.username);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-canvas">
      {/* WORKSPACE HEADER: Per ketentuan #8 (ID bimbingan dihilangkan & aksi diselaraskan dengan database) */}
      <div className="h-16 px-6 bg-surface border-b border-sage-border flex items-center justify-between shrink-0">
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] text-text-secondary">
            Sesi Diskusi Bimbingan
          </span>
          <h1 className="font-display font-semibold text-sm text-text-dark truncate">
            {topic || 'Memuat sesi bimbingan...'}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/messages"
            className="h-8 px-3 rounded-lg border border-sage-border bg-surface hover:bg-canvas text-text-dark text-xs font-medium flex items-center gap-1.5 transition"
          >
            <span className="material-symbols-outlined text-base text-text-secondary">
              bookmark_add
            </span>
            <span>Catat Penting</span>
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

      {error && <div className="px-6 py-2 text-xs text-red-700 bg-red-50">{error}</div>}

      {/* CHAT STREAM (SCROLLABLE MESSAGE LIST) */}
      <ChatStream messages={messages} />

      {/* CHAT INPUT DOCK (BOTTOM ATTACH & SEND) */}
      <ChatInputDock
        inputText={inputText}
        onChangeText={setInputText}
        onSend={sendMessage}
        isSending={isSending}
      />
    </div>
  );
}
