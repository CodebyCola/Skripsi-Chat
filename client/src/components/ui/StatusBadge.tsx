import React from 'react';
import { SecurityPill, type PillTone } from './SecurityPill';

// Ref: FR-FILE-05 (status review), FR-CHAIN-05 (hasil verifikasi dokumen)
const STATUS: Record<string, { label: string; tone: PillTone; icon: string }> = {
  SUBMITTED: { label: 'Diajukan', tone: 'info', icon: 'upload_file' },
  REVISION: { label: 'Perlu Revisi', tone: 'warning', icon: 'edit_note' },
  APPROVED: { label: 'Disetujui', tone: 'valid', icon: 'check_circle' },
  ASLI: { label: 'Asli', tone: 'valid', icon: 'verified' },
  TIDAK_COCOK: { label: 'Tidak Cocok', tone: 'danger', icon: 'gpp_bad' },
  CHAIN_RUSAK: { label: 'Chain Rusak', tone: 'danger', icon: 'link_off' },
};

export type StatusKey = keyof typeof STATUS;

export function StatusBadge({ status }: { status: string }) {
  const key = status.trim().toUpperCase().replace(/\s+/g, '_');
  const s = STATUS[key];
  if (!s) return <SecurityPill>{status}</SecurityPill>;
  return <SecurityPill tone={s.tone} icon={s.icon}>{s.label}</SecurityPill>;
}
