'use client';

import React from 'react';
import Link from 'next/link';

interface ChatInputDockProps {
  inputText: string;
  onChangeText: (val: string) => void;
  onSend: () => void;
  isSending?: boolean;
}

export function ChatInputDock({
  inputText,
  onChangeText,
  onSend,
  isSending = false,
}: ChatInputDockProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }'use client';

import React from 'react';
import Link from 'next/link';

interface ChatInputDockProps {
  inputText: string;
  onChangeText: (val: string) => void;
  onSend: () => void;
  isSending?: boolean;
  disabled?: boolean;
}

export function ChatInputDock({
  inputText,
  onChangeText,
  onSend,
  isSending = false,
  disabled = false,
}: ChatInputDockProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="p-4 bg-surface border-t border-sage-border shrink-0">
      <div className="rounded-xl border border-sage-border bg-canvas p-2.5 focus-within:border-primary focus-within:bg-surface transition">
        <textarea
          rows={2}
          disabled={disabled}
          value={inputText}
          onChange={(e) => onChangeText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tulis pesan bimbingan untuk Dosen Pembimbing..."
          className="w-full bg-transparent border-0 resize-none

  return (
    <div className="p-4 bg-surface border-t border-sage-border shrink-0">
      <div className="rounded-xl border border-sage-border bg-canvas p-2.5 focus-within:border-primary focus-within:bg-surface transition">
        <textarea
          rows={2}
          value={inputText}
          onChange={(e) => onChangeText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tulis pesan bimbingan untuk Dosen Pembimbing..."
          className="w-full bg-transparent border-0 resize-none text-xs text-text-dark placeholder-text-muted focus:ring-0 focus:outline-none leading-relaxed"
        />

        <div className="flex items-center justify-between pt-2 border-t border-sage-border mt-1">
          {/* ACTION TOOLS */}
          <div className="flex items-center gap-1">
            <Link
              href="/dashboard/files"
              title="Lampirkan Dokumen Naskah"
              className="p-1.5 rounded-md text-text-secondary hover:text-text-dark hover:bg-sage-tint transition flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-lg">attach_file</span>
            </Link>

            <Link
              href="/dashboard/stego"
              title="Sisipkan Gambar Steganografi / Diagram"
              className="p-1.5 rounded-md text-text-secondary hover:text-text-dark hover:bg-sage-tint transition flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-lg">image</span>
            </Link>

            <Link
              href="/dashboard/messages"
              title="Kunci Pesan Tambahan"
              className="p-1.5 rounded-md text-text-secondary hover:text-text-dark hover:bg-sage-tint transition flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-lg">code</span>
            </Link>
          </div>

          {/* SEND BUTTON */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-text-muted hidden sm:inline">
              Tekan Enter untuk kirim
            </span>
            <button
              type="button"
              onClick={onSend}
              disabled={isSending || !inputText.trim()}
              className="h-8 px-3.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Kirim</span>
              <span className="material-symbols-outlined text-base">send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
