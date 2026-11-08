'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { HashText, SecurityPill, type PillTone } from '@/components/ui';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { formatRole } from '../utils';

// Ref: DESIGN.md §4 (sidebar kanan: konteks akademik & keamanan), FR-AUTH-01
interface DongleStatusResponse {
  dongleDetected: boolean;
  activeDongle: { drivePath: string; username: string; dongleId: string; issuedAt: string } | null;
}

const LAYERS: { label: string; algo: string }[] = [
  { label: 'Pesan chat', algo: 'Vigenère → Transposisi → AES-256-GCM' },
  { label: 'Berkas draf', algo: 'ChaCha20-Poly1305 (per chunk)' },
  { label: 'Pesan penting', algo: 'AES-256-GCM (K_master_db)' },
  { label: 'Foto dokumen', algo: 'LSB PNG + AES-256-GCM' },
  { label: 'Aset akademik', algo: 'SHA-256 + RSA-PSS' },
];

const POLL_MS = 10_000;

interface ContextSecurityPanelProps {
  open: boolean;
  onClose: () => void;
  /** Slot untuk panel per fitur (mis. ringkasan draf aktif pada F2) */
  children?: React.ReactNode;
}

export function ContextSecurityPanel({ open, onClose, children }: ContextSecurityPanelProps) {
  const { user } = useCurrentUser();
  const [dongle, setDongle] = useState<DongleStatusResponse | null>(null);
  const [offline, setOffline] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setDongle(await apiRequest<DongleStatusResponse>('/api/auth/dongle/status'));
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [open, refresh]);

  if (!open) return null;

  let tone: PillTone = 'danger';
  let label = 'Dongle tidak terdeteksi';
  if (offline) {
    tone = 'warning';
    label = 'Server tidak terjangkau';
  } else if (dongle?.dongleDetected && dongle.activeDongle) {
    const mismatch = !!user?.dongleId && dongle.activeDongle.dongleId !== user.dongleId;
    tone = mismatch ? 'warning' : 'valid';
    label = mismatch ? 'Dongle akun lain terpasang' : 'Dongle terverifikasi';
  }

  return (
    <aside
      aria-label="Konteks dan keamanan"
      className="fixed xl:static right-0 top-14 bottom-0 z-30 w-80 shrink-0 bg-surface border-l border-sage-border flex flex-col overflow-y-auto shadow-lg xl:shadow-none"
    >
      <div className="flex items-center justify-between px-4 h-12 border-b border-sage-border shrink-0">
        <h2 className="font-display font-semibold text-xs text-text-dark">Konteks &amp; Keamanan</h2>
        <button type="button" onClick={onClose} aria-label="Tutup panel" className="text-text-muted hover:text-text-dark cursor-pointer">
          <span className="material-symbols-outlined text-lg" aria-hidden="true">close</span>
        </button>
      </div>

      <div className="p-4 flex flex-col gap-5">
        <section className="flex flex-col gap-2">
          <h3 className="text-[10px] font-medium tracking-wider uppercase text-text-muted">Hardware Dongle</h3>
          <SecurityPill tone={tone} icon="usb" className="self-start">{label}</SecurityPill>
          {dongle?.activeDongle && !offline && (
            <p className="text-[11px] text-text-secondary">
              {dongle.activeDongle.drivePath} • ID <HashText value={dongle.activeDongle.dongleId} head={6} tail={4} />
            </p>
          )}
        </section>

        <section className="flex flex-col gap-1">
          <h3 className="text-[10px] font-medium tracking-wider uppercase text-text-muted">Identitas Sesi</h3>
          <p className="text-xs font-semibold text-text-dark truncate">{user?.fullName || user?.username || '—'}</p>
          <p className="text-[11px] text-text-secondary">{formatRole(user?.role)}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-[10px] font-medium tracking-wider uppercase text-text-muted">Lapisan Enkripsi</h3>
          <ul className="flex flex-col gap-2">
            {LAYERS.map((l) => (
              <li key={l.label} className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-text-dark">{l.label}</span>
                <span className="text-[11px] font-mono text-text-secondary">{l.algo}</span>
              </li>
            ))}
          </ul>
        </section>

        {children}
      </div>
    </aside>
  );
}
