'use client';

import React, { useEffect, useState } from 'react';
import { AUTH_DEFAULTS } from '../constants/auth.constants';
import {
  ClientAuthCheckState,
  FaceVerifyServerResult,
  LoginResponseData,
} from '../types/auth.types';

interface Step3VerifiedCardProps {
  loginResponse: LoginResponseData | null;
  authStatus: ClientAuthCheckState | null;
  faceVerify: FaceVerifyServerResult | null;
  usernameFallback: string;
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => !p.includes('.'));
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || 'SC';
}

export function Step3VerifiedCard({
  loginResponse,
  authStatus,
  faceVerify,
  usernameFallback,
}: Step3VerifiedCardProps) {
  const [countdown, setCountdown] = useState(
    AUTH_DEFAULTS.redirectCountdownSeconds
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = '/dashboard';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const user = loginResponse?.user;
  const displayName = user?.fullName || usernameFallback;
  const displayUsername = user?.username || usernameFallback;

  return (
    <div className="bg-surface rounded-3xl p-8 md:p-10 shadow-sm border border-border-subtle text-center flex flex-col justify-center relative overflow-hidden self-stretch">
      <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-surface-container rounded-full blur-3xl pointer-events-none opacity-40" />

      {/* Top Stepper Progress Bar (All Completed) */}
      <div className="w-full max-w-lg mx-auto mb-8 relative z-10">
        <div className="flex items-center justify-between relative">
          <div className="flex flex-col items-center gap-1.5 relative z-10">
            <div className="w-9 h-9 rounded-full bg-tertiary-container text-on-tertiary flex items-center justify-center font-bold text-sm shadow-sm">
              <span className="material-symbols-outlined text-[18px]">
                check
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-text-secondary font-medium">
              Kredensial
            </span>
          </div>

          <div className="flex-1 h-0.5 bg-tertiary-container mx-2 -mt-5 transition-all duration-500" />

          <div className="flex flex-col items-center gap-1.5 relative z-10">
            <div className="w-9 h-9 rounded-full bg-tertiary-container text-on-tertiary flex items-center justify-center font-bold text-sm shadow-sm">
              <span className="material-symbols-outlined text-[18px]">
                check
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-text-secondary font-medium">
              Hardware &amp; Bio
            </span>
          </div>

          <div className="flex-1 h-0.5 bg-tertiary-container mx-2 -mt-5 transition-all duration-500" />

          <div className="flex flex-col items-center gap-1.5 relative z-10">
            <div className="w-9 h-9 rounded-full bg-tertiary-container text-on-tertiary flex items-center justify-center font-bold text-sm shadow-md ring-4 ring-surface-container-low">
              <span className="material-symbols-outlined text-[18px]">
                check
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-primary font-bold">
              Terverifikasi
            </span>
          </div>
        </div>
      </div>

      {/* Success Celebration Icon & Header */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative my-2">
          <div className="absolute inset-0 rounded-full bg-surface-container-low scale-150 animate-pulse" />
          <div className="w-20 h-20 rounded-full bg-tertiary-container text-on-tertiary shadow-xl flex items-center justify-center relative z-10 transition-transform duration-300 hover:scale-105">
            <span className="material-symbols-outlined text-[44px]">
              task_alt
            </span>
          </div>
        </div>
        <h2 className="font-headline-xl text-headline-xl text-primary font-bold mt-4 tracking-tight">
          Identitas Terverifikasi Penuh!
        </h2>
        <p className="font-body-md text-body-md text-text-secondary mt-1.5 max-w-md mx-auto leading-relaxed">
          Akses ke ruang bimbingan skripsi aman telah disetujui oleh sistem
          gerbang kriptografi institusi.
        </p>
      </div>

      {/* User Account & Clearance Profile Card */}
      <div className="relative z-10 bg-surface-container-low rounded-2xl p-5 my-6 text-left flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-sm">
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold font-headline-sm text-headline-sm shadow-sm ring-2 ring-primary-fixed">
            {getInitials(displayName)}
          </div>
          <span className="absolute bottom-0 right-0 w-4 h-4 bg-tertiary-container rounded-full ring-2 ring-surface flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[10px]">
              check
            </span>
          </span>
        </div>
        <div className="flex flex-col flex-1 text-center sm:text-left min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-between gap-2">
            <h3 className="font-headline-sm text-headline-sm text-primary font-bold truncate">
              {displayName}
            </h3>
          </div>
          <p className="font-body-sm text-body-sm text-text-secondary mt-0.5 truncate">
            Akun: @{displayUsername}
          </p>
        </div>
      </div>


      {/* Action Section & Redirect Timer */}
      <div className="relative z-10 flex flex-col items-center">
        <a
          href="/dashboard"
          className={`w-full py-4 px-8 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg shadow-lg flex items-center justify-center gap-3 transition-all transform active:scale-95 duration-200 group cursor-pointer ${
            countdown <= 1 ? 'ring-4 ring-tertiary-fixed' : ''
          }`}
        >
          <span>Masuk ke Dashboard Bimbingan</span>
          <span className="material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:translate-x-1.5">
            arrow_forward
          </span>
        </a>
        <div className="flex items-center justify-center gap-2 mt-3.5">
          <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-ping" />
          <p className="font-body-sm text-body-sm text-text-muted">
            Mengarahkan otomatis dalam{' '}
            <span className="font-semibold text-primary font-code-sm">
              {countdown}
            </span>{' '}
            detik...
          </p>
        </div>
      </div>
    </div>
  );
}
