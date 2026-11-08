'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ImportantCategory } from '../types/dashboard.types';
import { CATEGORY_LABEL } from '../utils';

// Ref: FR-VAULT-01 (dosen menandai pesan penting: ACC / Revisi / Jadwal Sidang)
const OPTIONS: ImportantCategory[] = ['ACC', 'REVISI', 'JADWAL_SIDANG'];

interface MarkControlProps {
  category?: ImportantCategory;
  canMark: boolean;
  onSelect: (category: ImportantCategory) => void;
  align?: 'left' | 'right';
}

export function MarkControl({ category, canMark, onSelect, align = 'left' }: MarkControlProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (category) {
    return (
      <span className="inline-flex items-center gap-0.5 font-sans font-semibold text-security-warning">
        <span
          className="material-symbols-outlined text-sm"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          star
        </span>
        {CATEGORY_LABEL[category]}
      </span>
    );
  }
  if (!canMark) return null;

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        title="Tandai sebagai pesan penting"
        aria-label="Tandai sebagai pesan penting"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center text-text-muted hover:text-security-warning cursor-pointer"
      >
        <span className="material-symbols-outlined text-sm" aria-hidden="true">star</span>
      </button>
      {open && (
        <ul
          role="menu"
          className={`absolute bottom-full mb-1 z-10 min-w-32 py-1 rounded-lg bg-surface border border-sage-border shadow-md font-sans ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {OPTIONS.map((c) => (
            <li key={c} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onSelect(c);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-text-dark hover:bg-canvas cursor-pointer"
              >
                {CATEGORY_LABEL[c]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}