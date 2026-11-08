'use client';

import React from 'react';
import { ChatConversation } from '../types/dashboard.types';
import { getInitials } from '../utils';

// Ref: FR-CHAT-01 (daftar percakapan aktif milik user)
interface ConversationListProps {
  conversations: ChatConversation[];
  activeId: number | null;
  onSelect: (id: number) => void;
}

export function ConversationList({ conversations, activeId, onSelect }: ConversationListProps) {
  return (
    <aside
      aria-label="Daftar percakapan"
      className="hidden md:flex w-64 shrink-0 flex-col bg-surface border-r border-sage-border overflow-y-auto"
    >
      <h2 className="px-4 h-12 flex items-center shrink-0 border-b border-sage-border text-[10px] font-medium tracking-wider uppercase text-text-muted">
        Percakapan
      </h2>
      <ul className="flex flex-col gap-1 p-2">
        {conversations.map((c) => {
          const active = c.id === activeId;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                aria-current={active ? 'true' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition cursor-pointer ${
                  active ? 'bg-sage-tint border-sage-border' : 'border-transparent hover:bg-canvas'
                }`}
              >
                <span className="w-8 h-8 shrink-0 rounded-full bg-sage-tint border border-sage-border text-primary text-[11px] font-semibold flex items-center justify-center">
                  {getInitials(c.peerName)}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-text-dark truncate">{c.peerName}</span>
                  <span className="block text-[11px] text-text-secondary truncate">{c.topic}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}