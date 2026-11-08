'use client';

import React, { useState } from 'react';

interface HashTextProps {
  value?: string | null;
  /** Jumlah karakter depan/belakang yang ditampilkan; 0 = tampilkan penuh */
  head?: number;
  tail?: number;
  copyable?: boolean;
  className?: string;
}

// Ref: DESIGN.md §3 (font mono untuk ID dongle, hash, signature, nonce)
export function HashText({ value, head = 8, tail = 6, copyable = true, className = '' }: HashTextProps) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="text-text-muted text-xs">—</span>;

  const short = head > 0 && value.length > head + tail + 1
    ? `${value.slice(0, head)}…${value.slice(-tail)}`
    : value;

  async function copy() {
    try {
      await navigator.clipboard.writeText(value!);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard bisa ditolak browser; abaikan */
    }
  }

  return (
    <span className={`inline-flex items-center gap-1 max-w-full font-mono text-[11px] px-1.5 py-0.5 rounded border border-sage-border bg-canvas text-text-secondary ${className}`}>
      <span title={value} className="truncate">{short}</span>
      {copyable && (
        <button
          type="button"
          onClick={copy}
          aria-label="Salin"
          className="shrink-0 text-text-muted hover:text-primary cursor-pointer"
        >
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
            {copied ? 'check' : 'content_copy'}
          </span>
        </button>
      )}
    </span>
  );
}
