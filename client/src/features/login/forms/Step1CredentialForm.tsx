'use client';

import React from 'react';
import { SERVER_CONSOLE_URL } from '@/lib/api';
import { AcademicRole, ClientAuthCheckState } from '../types/auth.types';

interface Step1CredentialFormProps {
  role: AcademicRole;
  onRoleChange: (role: AcademicRole) => void;
  username: string;
  onUsernameChange: (username: string) => void;
  password: string;
  onPasswordChange: (password: string) => void;
  showPassword: boolean;
  onToggleShowPassword: () => void;
  rememberDevice: boolean;
  onToggleRememberDevice: (remember: boolean) => void;
  authStatus: ClientAuthCheckState | null;
  errorMsg: string;
  onSubmit: (e: React.FormEvent) => void;
}

export function Step1CredentialForm({
  role,
  onRoleChange,
  username,
  onUsernameChange,
  password,
  onPasswordChange,
  showPassword,
  onToggleShowPassword,
  rememberDevice,
  onToggleRememberDevice,
  authStatus,
  errorMsg,
  onSubmit,
}: Step1CredentialFormProps) {
  return (
    <div>
      {/* Card Header */}
      <div className="mb-space-lg">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
            Masuk ke Ruang Bimbingan
          </h2>
        </div>
        <p className="font-body-md text-body-md text-text-secondary mt-1">
          Masukkan identitas akun dosen atau mahasiswa Anda untuk memulai sesi
          bimbingan terenkripsi.
        </p>
      </div>

      {/* Role Selector Toggle Tabs */}
      <div className="p-1 rounded-xl bg-surface-container-low border border-border-subtle inline-flex w-full mb-space-lg">
        <button
          type="button"
          onClick={() => onRoleChange('student')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-label-md text-label-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
            role === 'student'
              ? 'bg-primary-container text-on-primary shadow-sm'
              : 'text-text-secondary hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">school</span>
          <span>Mahasiswa</span>
        </button>
        <button
          type="button"
          onClick={() => onRoleChange('lecturer')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-label-md text-label-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
            role === 'lecturer'
              ? 'bg-primary-container text-on-primary shadow-sm'
              : 'text-text-secondary hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">badge</span>
          <span>Dosen Pembimbing</span>
        </button>
      </div>

      {errorMsg && (
        <div className="mb-space-md p-3.5 rounded-xl bg-error-container border border-error/30 text-on-error-container flex items-start gap-2.5">
          <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">
            error
          </span>
          <span className="font-body-sm text-body-sm font-medium">
            {errorMsg}
          </span>
        </div>
      )}

      {/* Authentication Form */}
      <form className="space-y-space-md" onSubmit={onSubmit}>
        {/* Input 1: Username / NIM / NIDN */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              className="font-label-md text-label-md text-on-surface font-semibold"
              htmlFor="identity-input"
            >
              {role === 'student'
                ? 'Username / NIM Terdaftar'
                : 'Username / NIDN Dosen Pembimbing'}
            </label>
            <span className="font-code-sm text-code-sm text-text-muted">
              {authStatus?.serverOnline
                ? authStatus?.userExists
                  ? 'Akun terdaftar di Server'
                  : 'Username belum ditemukan'
                : 'Menghubungkan Server :4000...'}
            </span>
          </div>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 text-text-muted pointer-events-none text-[20px]">
              account_circle
            </span>
            <input
              id="identity-input"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              placeholder={
                role === 'student'
                  ? 'Contoh: editor_aegis atau NIM'
                  : 'Contoh: editor_aegis atau NIDN'
              }
              required
              className="w-full pl-11 pr-10 py-3 bg-canvas text-on-surface font-body-md text-body-md rounded-xl border border-border-subtle focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-fixed transition-all placeholder:text-text-muted"
            />
            {authStatus?.serverOnline && (
              <span
                className={`absolute right-3.5 flex items-center ${
                  authStatus.userExists
                    ? 'text-tertiary-container'
                    : 'text-security-warning'
                }`}
                title={
                  authStatus.userExists
                    ? 'Akun ditemukan di database Server'
                    : 'Akun tidak ditemukan di Server'
                }
              >
                <span className="material-symbols-outlined text-[18px]">
                  {authStatus.userExists ? 'check_circle' : 'help'}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Input 2: Password with Eye Toggle */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              className="font-label-md text-label-md text-on-surface font-semibold"
              htmlFor="password-input"
            >
              Kata Sandi Brankas
            </label>
            <a
              href={SERVER_CONSOLE_URL}
              target="_blank"
              rel="noreferrer"
              className="font-label-sm text-label-sm text-text-secondary hover:text-primary transition-colors"
            >
              Kelola dongle &amp; wajah di Server?
            </a>
          </div>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 text-text-muted pointer-events-none text-[20px]">
              key
            </span>
            <input
              id="password-input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full pl-11 pr-11 py-3 bg-canvas text-on-surface font-body-md text-body-md rounded-xl border border-border-subtle focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-fixed transition-all placeholder:text-text-muted tracking-wider font-mono"
            />
            <button
              type="button"
              aria-label="Tampilkan atau sembunyikan kata sandi"
              onClick={onToggleShowPassword}
              className="absolute right-3 text-text-muted hover:text-on-surface p-1 focus:outline-none cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>      

        {/* Remember Device & Key Persistence Checkbox */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => onToggleRememberDevice(e.target.checked)}
              className="w-4 h-4 rounded text-primary border-border-subtle focus:ring-primary-fixed accent-primary"
            />
            <span className="font-body-sm text-body-sm text-text-secondary">
              Simpan identitas publik perangkat ini
            </span>
          </label>
          <div className="flex items-center gap-1 font-label-sm text-label-sm text-text-muted">
            <span className="material-symbols-outlined text-[15px]">timer</span>
            <span>Sesi 45 Menit</span>
          </div>
        </div>

        {/* Primary CTA Submit Button */}
        <div className="pt-space-sm">
          <button
            type="submit"
            className="w-full py-3.5 px-6 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Lanjut ke Verifikasi Perangkat &amp; Wajah</span>
            <span className="material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:translate-x-1">
              arrow_forward
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
