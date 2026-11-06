'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

export interface ClientAuthCheckState {
  serverOnline: boolean;
  dongleDetected: boolean;
  dongleMatchesUser: boolean;
  userExists: boolean;
  hasEnrolledFace: boolean;
  hasFacePhoto: boolean;
  expectedDongleId?: string;
  matchedDrivePath?: string | null;
  activeDongle: {
    drivePath: string;
    username: string;
    dongleId: string;
    issuedAt: string;
  } | null;
}

export function DongleStatus({
  username,
  onStatusChange,
}: {
  username: string;
  onStatusChange?: (status: ClientAuthCheckState) => void;
}) {
  const [status, setStatus] = useState<ClientAuthCheckState | null>(null);
  const [checking, setChecking] = useState(true);

  const checkServerStatus = useCallback(async () => {
    try {
      const q = encodeURIComponent((username || '').trim());
      const res = await apiRequest<Omit<ClientAuthCheckState, 'serverOnline'>>(
        `/api/auth/check-status?username=${q}`
      );
      const nextState: ClientAuthCheckState = {
        ...res,
        serverOnline: true,
      };
      setStatus(nextState);
      onStatusChange?.(nextState);
    } catch {
      const offlineState: ClientAuthCheckState = {
        serverOnline: false,
        dongleDetected: false,
        dongleMatchesUser: false,
        userExists: false,
        hasEnrolledFace: false,
        hasFacePhoto: false,
        activeDongle: null,
      };
      setStatus(offlineState);
      onStatusChange?.(offlineState);
    } finally {
      setChecking(false);
    }
  }, [username, onStatusChange]);

  useEffect(() => {
    checkServerStatus();
    const timer = setInterval(checkServerStatus, 2000);
    return () => clearInterval(timer);
  }, [checkServerStatus]);

  const serverOnline = Boolean(status?.serverOnline);
  const dongleActive = Boolean(status?.dongleDetected);
  const dongleValidForUser = Boolean(
    status?.dongleDetected && status?.dongleMatchesUser
  );

  let borderColor = '#ef4444';
  let bgColor = 'rgba(239,68,68,0.09)';
  let dotColor = '#ef4444';
  let titleText = 'Memeriksa koneksi Hardware Dongle ke Server...';
  let descText = '';

  if (!checking) {
    if (!serverOnline) {
      titleText = 'Server Backend (:4000) Belum Terhubung';
      descText =
        'Pastikan terminal server sudah menyala (`npm start` di folder server).';
    } else if (!dongleActive) {
      titleText = 'Hardware USB Dongle: NON-AKTIF';
      descText =
        'Dongle belum diaktifkan / dicolokkan di Server. Aktifkan dongle melalui Server Console (http://localhost:4000) atau colokkan USB.';
    } else if (!status?.userExists) {
      borderColor = '#f59e0b';
      bgColor = 'rgba(245,158,11,0.09)';
      dotColor = '#f59e0b';
      titleText = `USB Dongle Aktif, tetapi Username '${username}' Tidak Ditemukan`;
      descText = `Dongle saat ini terdaftar untuk '${status?.activeDongle?.username}'. Periksa penulisan username Anda.`;
    } else if (!dongleValidForUser) {
      borderColor = '#f59e0b';
      bgColor = 'rgba(245,158,11,0.09)';
      dotColor = '#f59e0b';
      titleText = 'USB Dongle Aktif Milik Akun Lain';
      descText = `Dongle yang terpasang di Server adalah milik '${status?.activeDongle?.username}', bukan milik '${username}'.`;
    } else {
      borderColor = '#10b981';
      bgColor = 'rgba(16,185,129,0.1)';
      dotColor = '#10b981';
      titleText = `Hardware USB Dongle: AKTIF & SESUAI (@${username})`;
      descText = `Drive: ${status?.activeDongle?.drivePath} | Serial ID: ${status?.activeDongle?.dongleId}`;
    }
  }

  return (
    <div
      style={{
        padding: '15px 18px',
        borderRadius: 12,
        border: `1px solid ${borderColor}`,
        background: bgColor,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: dotColor,
            }}
          />
          <strong style={{ color: '#f8fafc', fontSize: 14 }}>{titleText}</strong>
        </div>
        {descText && (
          <p style={{ fontSize: 12.5, color: '#cbd5e1', marginTop: 4 }}>
            {descText}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={checkServerStatus}
        style={{
          background: '#1e293b',
          border: '1px solid #334155',
          color: '#e2e8f0',
          fontSize: 12,
          padding: '7px 12px',
        }}
      >
        🔄 Cek Ulang Dongle
      </button>
    </div>
  );
}
