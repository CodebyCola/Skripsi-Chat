'use client';

import React, { useState } from 'react';
import { ConfirmDialog } from '@/components/ui';
import { ReviewStatus } from '../types/files.types';

// Ref: FR-FILE-05 — panel review khusus dosen (REVISION wajib catatan; APPROVED butuh konfirmasi)
interface ReviewPanelProps {
  initialNote?: string;
  onSubmit: (status: ReviewStatus, note: string) => Promise<boolean>;
}

export function ReviewPanel({ initialNote = '', onSubmit }: ReviewPanelProps) {
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);

  async function submit(status: ReviewStatus) {
    setSaving(true);
    await onSubmit(status, note.trim());
    setSaving(false);
    setConfirmApprove(false);
  }

  const needNote = !note.trim();
  const btn = 'h-8 px-3 rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition';

  return (
    <div className="mt-3 pt-3 border-t border-sage-border space-y-2">
      <label className="block text-[11px] font-medium text-text-secondary">
        Catatan review
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="Contoh: perbaiki sitasi pada Bab 4…"
          className="mt-1 w-full rounded-lg border border-sage-border bg-canvas px-3 py-2 text-xs text-text-dark placeholder-text-muted focus:border-primary focus:bg-surface focus:outline-none transition"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving || needNote}
          onClick={() => submit('REVISION')}
          title={needNote ? 'Isi catatan untuk meminta revisi' : undefined}
          className={`${btn} border border-security-warning/40 text-security-warning hover:bg-security-warning/10`}
        >
          Minta Revisi
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => setConfirmApprove(true)}
          className={`${btn} bg-primary text-white hover:opacity-90`}
        >
          Setujui
        </button>
      </div>

      <ConfirmDialog
        open={confirmApprove}
        title="Setujui berkas ini?"
        description="Mahasiswa akan melihat status Disetujui beserta catatan Anda."
        confirmLabel="Ya, setujui"
        onConfirm={() => submit('APPROVED')}
        onCancel={() => setConfirmApprove(false)}
      />
    </div>
  );
}
