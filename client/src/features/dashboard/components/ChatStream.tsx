'use client';

import React from 'react';
import Link from 'next/link';
import { ChatMessageItem } from '../types/dashboard.types';

interface ChatStreamProps {
  messages: ChatMessageItem[];
  onInspect?: (msg: ChatMessageItem) => void;
  onMarkImportant?: (msg: ChatMessageItem) => void;
  onDelete?: (id: string | number) => void;
}

export function ChatStream({
  messages,
  onInspect,
  onMarkImportant,
  onDelete,
}: ChatStreamProps) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-sage-tint border border-sage-border text-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-2xl">chat_bubble</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-text-dark">
            Belum Ada Pesan Bimbingan
          </p>
          <p className="text-[11px] text-text-secondary max-w-sm mt-0.5">
            Mulai diskusi bimbingan skripsi. Setiap pesan yang dikirim otomatis diamankan dengan Extended Vigenère + Transposisi/Vernam + AES-256.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* SYSTEM TIME ANCHOR */}
      <div className="flex items-center justify-center my-2">
        <div className="text-[11px] font-mono text-text-muted px-3 py-1 rounded bg-surface border border-sage-border shadow-xs">
          Sesi Terverifikasi Dimulai &bull; Hari ini
        </div>
      </div>

      {messages.map((msg) => {
        const isMe = msg.isMe;

        return (
          <div
            key={msg.id}
            className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
          >
            <div
              className={`max-w-xl flex flex-col ${
                isMe ? 'items-end' : 'items-start'
              } gap-1`}
            >
              {/* SENDER & TIMESTAMP */}
              <div className="flex items-center gap-2 text-[11px] text-text-secondary px-1">
                <span className="font-medium text-text-dark">{msg.sender}</span>
                <span className="font-mono">{msg.timestamp}</span>
                {msg.isImportant && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[11px]">bookmark</span>
                    <span>{msg.category || 'PENTING'}</span>
                  </span>
                )}
              </div>

              {/* MESSAGE CARD CONTAINER */}
              <div
                className={`p-4 rounded-2xl ${
                  isMe
                    ? 'rounded-tr-sm bg-sage-tint border border-sage-border'
                    : 'rounded-tl-sm bg-surface border border-sage-border'
                } text-xs leading-relaxed text-text-dark shadow-xs relative`}
              >
                <p className="whitespace-pre-line">{msg.content}</p>

                {/* ATTACHMENT CARD (IF PRESENT) */}
                {msg.attachment && (
                  <div className="mt-3.5 p-3 rounded-xl bg-surface border border-sage-border flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-sage-tint border border-sage-border flex items-center justify-center text-primary shrink-0">
                        <span className="material-symbols-outlined text-xl">
                          description
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-xs text-text-dark truncate">
                          {msg.attachment.name}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-text-secondary">
                          <span>{msg.attachment.size}</span>
                          <span>&bull;</span>
                          <span>{msg.attachment.hash}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        href={msg.attachment.url || '/dashboard/files'}
                        title="Lihat Berkas"
                        className="w-7 h-7 rounded flex items-center justify-center text-text-secondary hover:text-text-dark hover:bg-canvas transition"
                      >
                        <span className="material-symbols-outlined text-base">
                          visibility
                        </span>
                      </Link>
                      <Link
                        href={msg.attachment.url || '/dashboard/files'}
                        title="Unduh Berkas"
                        className="w-7 h-7 rounded flex items-center justify-center text-primary hover:bg-canvas transition"
                      >
                        <span className="material-symbols-outlined text-base">
                          download
                        </span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* FOOTER: STATUS & ACTION ICONS */}
              <div className="flex items-center justify-between w-full px-1 text-[10px] font-mono text-text-muted gap-3">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`material-symbols-outlined text-xs ${
                      msg.signatureVerified ? 'text-primary' : 'text-text-secondary'
                    }`}
                  >
                    {msg.statusIcon || 'done_all'}
                  </span>
                  <span>{msg.statusText}</span>
                </div>

                {/* ACTION BUTTONS (SUBTLE, APPEAR ON HOVER OR ALWAYS) */}
                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
                  <button
                    type="button"
                    onClick={() => onInspect?.(msg)}
                    title="Inspeksi Ciphertext 3-Lapis (Vigenère, Transposisi, AES-256)"
                    className="p-1 rounded hover:bg-canvas hover:text-primary transition flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-xs">data_object</span>
                    <span className="hidden sm:inline">Kripto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onMarkImportant?.(msg)}
                    title="Tandai Sebagai Pesan Penting (Enkripsi AES-256-GCM ke Kolom DB)"
                    className={`p-1 rounded hover:bg-canvas transition flex items-center gap-0.5 ${
                      msg.isImportant ? 'text-amber-700 font-semibold' : 'hover:text-amber-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">
                      {msg.isImportant ? 'bookmark' : 'bookmark_add'}
                    </span>
                    <span className="hidden sm:inline">Penting</span>
                  </button>

                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(msg.id)}
                      title="Hapus Pesan"
                      className="p-1 rounded hover:bg-canvas hover:text-red-600 transition flex items-center"
                    >
                      <span className="material-symbols-outlined text-xs">delete</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
}
