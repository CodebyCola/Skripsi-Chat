'use client';

import React from 'react';
import Link from 'next/link';
import { EmptyState, ErrorBanner } from '@/components/ui';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useConsultationChat } from '../hooks/useConsultationChat';
import { normalizeRole } from '../utils';
import { ChatStream } from './ChatStream';
import { ChatInputDock } from './ChatInputDock';
import { ConversationList } from './ConversationList';

export function DashboardWorkspace() {
  const { user } = useCurrentUser();
  const isLecturer = normalizeRole(user?.role) === 'lecturer';
  const chat = useConsultationChat(user?.username);
  const { conversations, activeConversation: active } = chat;
  const showList = conversations.length > 1 || (isLecturer && conversations.length > 0);

  return (
    <div className="flex-1 flex min-w-0 overflow-hidden bg-canvas">
      {showList && (
        <ConversationList
          conversations={conversations}
          activeId={chat.convId}
          onSelect={chat.selectConversation}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* WORKSPACE HEADER: Per ketentuan #8 (ID bimbingan dihilangkan & aksi diselaraskan dengan database) */}
        <div className="h-16 px-6 bg-surface border-b border-sage-border flex items-center justify-between shrink-0">
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] text-text-secondary truncate">
              {active ? `Bimbingan dengan ${active.peerName}` : 'Sesi Diskusi Bimbingan'}
            </span>
            <h1 className="font-display font-semibold text-sm text-text-dark truncate">
              {active?.topic || (chat.loaded ? 'Belum ada sesi' : 'Memuat sesi bimbingan...')}
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

        <ErrorBanner message={chat.error} onDismiss={chat.clearError} />

        {chat.loaded && !chat.convId ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon="forum"
              title="Belum ada percakapan bimbingan"
              description={
                isLecturer
                  ? 'Belum ada mahasiswa yang ditetapkan kepada Anda. Hubungi admin.'
                  : 'Admin belum menetapkan dosen pembimbing untuk akun Anda.'
              }
            />
          </div>
        ) : (
          <ChatStream
            messages={chat.messages}
            marks={chat.marks}
            canMark={isLecturer}
            onMark={chat.markImportant}
          />
        )}

        <ChatInputDock
          inputText={chat.inputText}
          onChangeText={chat.setInputText}
          onSend={chat.sendMessage}
          isSending={chat.isSending}
          disabled={!chat.convId || chat.expired}
        />
      </div>
    </div>
  );
}