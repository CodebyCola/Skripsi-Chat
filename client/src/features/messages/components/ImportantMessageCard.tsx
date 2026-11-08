'use client';

import React from 'react';
import { SecurityPill } from '@/components/ui';
import { ImportantConversation, ImportantMessage } from '../types/messages.types';

// Ref: FR-VAULT-03/04 — kartu bernuansa amber (DESIGN.md: security-warning) + badge AES-256-GCM
const CATEGORY_LABEL: Record<ImportantMessage['category'], string> = {
  ACC: 'ACC',
  REVISI: 'Revisi',
  JADWAL_SIDANG: 'Jadwal Sidang',
  LAINNYA: 'Lainnya',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

interface ImportantMessageCardProps {
  message: ImportantMessage;
  conversation?: ImportantConversation;
  canUnmark: boolean;
  busy: boolean;
  onUnmark: (message: ImportantMessage) => void;
}

export function ImportantMessageCard({
  message,
  conversation,
  canUnmark,
  busy,
  onUnmark,
}: ImportantMessageCardProps) {
  // Server mengirim penanda ini bila tag AEAD gagal diverifikasi (data di DB diubah)
  const corrupted = message.contentPlain.startsWith('[CORRUPTED');

  return (
    <article className="bg-security-warning/5 border border-security-warning/30 rounded-xl p-4 shadow-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className="material-symbols-outlined text-base text-security-warning"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          star
        </span>
        <span className="text-xs font-semibold text-text-dark">{CATEGORY_LABEL[message.category]}</span>
        <SecurityPill tone="warning" icon="lock">AES-256-GCM</SecurityPill>
        {corrupted && <SecurityPill tone="danger" icon="gpp_bad">Terdeteksi dimanipulasi</SecurityPill>}
        <span className="flex-1" />
        {canUnmark && (
          <button
            type="button"
            onClick={() => onUnmark(message)}
            disabled={busy}
            className="h-7 px-2.5 rounded-lg border border-sage-border bg-surface text-[11px] font-semibold text-text-secondary hover:bg-canvas disabled:opacity-40 cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm" aria-hidden="true">bookmark_remove</span>
            Cabut tanda
          </button>
        )}
      </div>

      <p className={`mt-2.5 text-sm whitespace-pre-wrap break-words ${corrupted ? 'text-security-danger' : 'text-text-dark'}`}>
        {message.contentPlain}
      </p>

      <p className="mt-2.5 text-[11px] text-text-secondary">
        {conversation ? `${conversation.peerName} — ${conversation.topic} • ` : ''}
        ditandai oleh {message.markedBy} • {formatDate(message.markedAt)}
      </p>
    </article>
  );
}