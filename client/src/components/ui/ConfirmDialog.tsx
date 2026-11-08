'use client';

import React, { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  tone = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmCls =
    tone === 'danger'
      ? 'bg-security-danger text-white hover:opacity-90'
      : 'bg-primary text-white hover:opacity-90';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-dark/40 px-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm rounded-2xl bg-surface border border-sage-border p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="font-display font-semibold text-sm text-text-dark">{title}</h2>
        {description && <p className="mt-1.5 text-xs text-text-secondary">{description}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="h-8 px-3 rounded-lg text-xs font-semibold border border-sage-border text-text-secondary hover:bg-canvas cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer ${confirmCls}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
