import type { AppRole } from '../constants/navigation';

import type { ImportantCategory } from '../types/dashboard.types';

export const CATEGORY_LABEL: Record<ImportantCategory, string> = {
  ACC: 'ACC',
  REVISI: 'Revisi',
  JADWAL_SIDANG: 'Jadwal Sidang',
  LAINNYA: 'Lainnya',
};

export function getInitials(name?: string): string {
  if (!name) return 'SC';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Menerima nilai role dari server (MAHASISWA/DOSEN/ADMIN) maupun padanan Inggrisnya. */
export function normalizeRole(role?: string): AppRole {
  const r = (role || '').toUpperCase();
  if (r.includes('ADMIN')) return 'admin';
  if (r.includes('DOSEN') || r.includes('LECTURER')) return 'lecturer';
  return 'student';
}

export function formatRole(role?: string): string {
  const r = normalizeRole(role);
  if (r === 'lecturer') return 'Dosen Pembimbing';
  if (r === 'admin') return 'Administrator';
  return 'Mahasiswa';
}

