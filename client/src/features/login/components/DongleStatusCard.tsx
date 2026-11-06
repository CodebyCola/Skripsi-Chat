'use client';

import React from 'react';
import { SERVER_CONSOLE_URL } from '@/lib/api';
import { ClientAuthCheckState } from '../types/auth.types';

interface DongleStatusCardProps {
  authStatus: ClientAuthCheckState | null;
  checking: boolean;
  username: string;
  isDongleActiveAndValid: boolean;
  onRefresh: () => void;
}

export function DongleStatusCard({
  authStatus,
  checking,
  username,
  isDongleActiveAndValid,
  onRefresh,
}: DongleStatusCardProps) {
  let title = 'Memeriksa Koneksi Hardware Dongle...';
  let subtitle = 'Sinkronisasi status token fisik dengan Server (:4000)';

  if (!checking) {
    if (!authStatus?.serverOnline) {
      title = 'Server Backend (:4000) Belum Terhubung';
      subtitle = 'Pastikan server kriptografi menyala (`npm start` di folder server)';
    } else if (!authStatus?.dongleDetected) {
      title = 'Hardware USB Dongle Belum Aktif';
      subtitle = 'Colokkan USB Key atau aktifkan melalui Server Console (:4000)';
    } else if (!authStatus?.userExists) {
      title = `Username "@${username}" Tidak Ditemukan`;
      subtitle = `Dongle aktif terdaftar untuk @${authStatus?.activeDongle?.username}`;
    } else if (!authStatus?.dongleMatchesUser) {
      title = 'USB Dongle Aktif Milik Akun Lain';
      subtitle = `Terpasang milik @${authStatus?.activeDongle?.username} • Bukan milik @${username}`;
    } else {
      title = 'USB Dongle Terdeteksi';
      subtitle = `Drive ${authStatus?.activeDongle?.drivePath} • Serial: ${authStatus?.activeDongle?.dongleId} • Kunci AES-256 Aktif`;
    }
  }

  return (
    <div
      className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 transition-all border ${
        isDongleActiveAndValid
          ? 'bg-surface-container-low border-tertiary-container/25'
          : 'bg-canvas border-security-warning/40'
      }`}
    >
      <div className="flex items-center gap-3.5">
        <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-surface shadow-sm shrink-0">
          <span
            className={`material-symbols-outlined text-[24px] ${
              isDongleActiveAndValid ? 'text-primary' : 'text-security-warning'
            }`}
          >
            usb
          </span>
          <span
            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse ${
              isDongleActiveAndValid ? 'bg-tertiary-container' : 'bg-security-danger'
            }`}
          />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-label-md text-label-md text-primary font-bold">
              {title}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                isDongleActiveAndValid
                  ? 'bg-tertiary-container'
                  : 'bg-security-warning'
              }`}
            />
          </div>
          <span className="font-code-sm text-code-sm text-text-secondary mt-0.5">
            {subtitle}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
        {isDongleActiveAndValid ? (
          <span className="font-label-sm text-label-sm font-bold bg-surface text-tertiary px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-tertiary">
              verified_user
            </span>
            VERIFIKASI VALID
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={onRefresh}
              className="font-label-sm text-label-sm font-semibold bg-surface hover:bg-surface-container text-primary px-3 py-1.5 rounded-lg border border-border-subtle shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">refresh</span>
              Cek Ulang
            </button>
            <a
              href={SERVER_CONSOLE_URL}
              target="_blank"
              rel="noreferrer"
              className="font-label-sm text-label-sm font-semibold bg-primary-container text-on-primary px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
              Server :4000
            </a>
          </>
        )}
      </div>
    </div>
  );
}
