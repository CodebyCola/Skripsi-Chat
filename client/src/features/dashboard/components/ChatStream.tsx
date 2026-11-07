'use client';

import React from 'react';
import Link from 'next/link';
import { ChatMessageItem } from '../types/dashboard.types';

interface ChatStreamProps {
  messages: ChatMessageItem[];
}

export function ChatStream({ messages }: ChatStreamProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* SYSTEM TIME ANCHOR */}
      <div className="flex items-center justify-center my-2">
        <div className="text-[11px] font-mono text-text-muted px-3 py-1 rounded bg-surface border border-sage-border shadow-xs">
          Sesi Terverifikasi Dimulai &bull; Hari ini
        </div>
      </div>

      {messages.map((msg) => {
        if (msg.isMe) {
          // MAHASISWA BUBBLE (RIGHT ALIGNED, TINTED)
          return (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-xl flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 text-[11px] text-text-secondary px-1">
                  <span className="font-mono">{msg.timestamp}</span>
                  <span className="font-medium text-text-dark">{msg.sender}</span>
                </div>

                <div className="p-4 rounded-2xl rounded-tr-sm bg-sage-tint border border-sage-border text-xs leading-relaxed text-text-dark shadow-xs">
                  <p className="whitespace-pre-line">{msg.content}</p>

                  {/* EMBEDDED ATTACHMENT CARD */}
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

                {msg.statusText && (
                  <div className="flex items-center gap-1 text-[10px] font-mono text-text-muted px-1">
                    <span className="material-symbols-outlined text-xs text-primary">
                      {msg.statusIcon || 'done_all'}
                    </span>
                    <span>{msg.statusText}</span>
                  </div>
                )}
              </div>
            </div>
          );
        }

        // DOSEN PEMBIMBING BUBBLE (LEFT ALIGNED, WHITE SURFACE)
        return (
          <div key={msg.id} className="flex justify-start">
            <div className="max-w-xl flex flex-col items-start gap-1">
              <div className="flex items-center gap-2 text-[11px] text-text-secondary px-1">
                <span className="font-semibold text-text-dark">{msg.sender}</span>
                <span className="font-mono">{msg.timestamp}</span>
              </div>

              <div className="p-4 rounded-2xl rounded-tl-sm bg-surface border border-sage-border text-xs leading-relaxed text-text-dark shadow-xs">
                <p className="whitespace-pre-line">{msg.content}</p>
              </div>

              {msg.signatureVerified && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted px-1">
                  <span className="flex items-center gap-1 text-primary">
                    <span className="material-symbols-outlined text-xs">
                      verified_user
                    </span>
                    <span>{msg.statusText || 'Tanda Tangan Kunci Dosen Valid'}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
