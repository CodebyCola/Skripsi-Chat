'use client';

import React from 'react';
import { SERVER_CONSOLE_URL } from '@/lib/api';
import { ClientAuthCheckState } from '../types/auth.types';
import { switchVirtualDongle } from '../api/authApi';

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
  let subtitle = 'Sinkronisasi status token fisik dengan Server';

  if (!checking) {
    if (!authStatus?.serverOnline) {
      title = 'Server Backend Belum Terhubung';
      subtitle = 'Pastikan server kriptografi menyala (`npm start` di folder server)';
    } else if (!authStatus?.dongleDetected) {
      title = 'Hardware USB Dongle Tidak Terdeteksi';
      subtitle = 'Colokkan USB Hardware Key (.skripsi_key) atau aktifkan melalui Server Console';
    } else if (!authStatus?.userExists) {
      title = 'Username Belum Terdaftar';
      subtitle = 'Periksa kembali penulisan username Anda atau hubungi administrator';
    } else if (!authStatus?.dongleMatchesUser) {
      title = 'Hardware USB Dongle Tidak Cocok';
      subtitle = 'Hardware USB Dongle tidak terdeteksi atau tidak cocok untuk akun ini';
    } else {
      title = 'Hardware USB Dongle Terverifikasi';
      subtitle = `Slot HSM: ${authStatus?.activeDongle?.drivePath || 'VIRTUAL'} • Kunci AES-256 Valid`;
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
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-label-md text-label-md text-primary font-bold">
              {title}
            </span>
          </div>
          <span className="font-code-sm text-code-sm text-text-secondary mt-0.5">
            {subtitle}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
        {isDongleActiveAndValid ? (
          <span className="font-label-sm text-label-sm font-bold bg-surface text-tertiary px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-tertiary">
              verified_user
            </span>
            VERIFIKASI VALID
          </span>
        ) : (
          <>
            {authStatus?.serverOnline && username && !authStatus?.dongleMatchesUser && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await switchVirtualDongle(username);
                    onRefresh();
                  } catch (e) {
                    console.error('Gagal switch dongle:', e);
                  }
                }}
                className="font-label-sm text-label-sm font-semibold bg-primary hover:bg-primary-hover text-on-primary px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1 cursor-pointer transition-colors"
                title={`Pasang virtual dongle untuk akun ${username}`}
              >
                <span className="material-symbols-outlined text-[15px]">usb</span>
                Pasang Dongle Akun Ini
              </button>
            )}
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
              className="font-label-sm text-label-sm font-semibold bg-surface-container text-primary px-3 py-1.5 rounded-lg border border-border-subtle shadow-sm flex items-center gap-1"
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
