'use client';

import React from 'react';
import { SERVER_CONSOLE_URL } from '@/lib/api';
import { DongleStatusCard } from '../components/DongleStatusCard';
import { WebcamViewport } from '../components/WebcamViewport';
import { ClientAuthCheckState, FaceVerifyServerResult } from '../types/auth.types';

interface Step2BiometricVerificationProps {
  username: string;
  password: string;
  authStatus: ClientAuthCheckState | null;
  checkingDongle: boolean;
  isDongleActiveAndValid: boolean;
  onRefreshDongle: () => void;
  // Webcam & face states
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  cameraActive: boolean;
  verifyingFace: boolean;
  faceErrorText: string;
  capturedPreviewUrl: string | null;
  insecureOriginUrl: string | null;
  faceVerify: FaceVerifyServerResult | null;
  isFaceMatched: boolean;
  onStartCamera: () => void;
  onScanFace: () => void;
  onUploadPhoto: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // Submit & navigation
  loading: boolean;
  errorMsg: string;
  onGoBack: () => void;
  onValidateVault: () => void;
}

export function Step2BiometricVerification({
  username,
  authStatus,
  checkingDongle,
  isDongleActiveAndValid,
  onRefreshDongle,
  videoRef,
  canvasRef,
  cameraActive,
  verifyingFace,
  faceErrorText,
  capturedPreviewUrl,
  insecureOriginUrl,
  faceVerify,
  isFaceMatched,
  onStartCamera,
  onScanFace,
  onUploadPhoto,
  loading,
  errorMsg,
  onGoBack,
  onValidateVault,
}: Step2BiometricVerificationProps) {
  const similarityPct = faceVerify?.similarityPercent ?? 0;
  const ringDash = `${Math.max(0, Math.min(100, Math.round(similarityPct)))}, 100`;
  const canSubmit = isDongleActiveAndValid && isFaceMatched && !loading;

  return (
    <div>
      {/* Card Header Text */}
      <div className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
            Verifikasi Keamanan Fisik &amp; Biometrik
          </h2>
          <span className="px-2.5 py-1 rounded-full bg-surface-container-low text-primary font-code-sm text-code-sm font-semibold">
            @{username}
          </span>
        </div>
        <p className="font-body-md text-body-md text-text-secondary mt-1">
          Pastikan USB Key terpasang dan hadapkan wajah Anda ke kamera untuk
          mencocokkan biometrik.
        </p>
      </div>

      {/* Info jika akun belum merekam foto wajah di Server */}
      {authStatus?.serverOnline &&
        authStatus?.userExists &&
        !authStatus?.hasFacePhoto && (
          <div className="mb-4 p-3.5 rounded-2xl bg-surface-container-low border border-security-warning/40 flex items-start gap-3">
            <span className="material-symbols-outlined text-security-warning text-[20px] shrink-0 mt-0.5">
              warning
            </span>
            <div className="font-body-sm text-body-sm text-on-surface">
              <strong>Info Biometrik:</strong> Akun{' '}
              <code className="font-code-sm">@{username}</code> belum merekam
              foto wajah asli di Server. Silakan buka{' '}
              <a
                href={SERVER_CONSOLE_URL}
                target="_blank"
                rel="noreferrer"
                className="text-primary font-semibold underline"
              >
                Server Console ({SERVER_CONSOLE_URL})
              </a>{' '}
              untuk menyimpan wajah Anda terlebih dahulu.
            </div>
          </div>
        )}

      {/* Error Alert Banner */}
      {errorMsg && (
        <div className="mb-4 p-3.5 rounded-2xl bg-error-container border border-error/30 text-on-error-container flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">
              gpp_bad
            </span>
            <span className="font-body-sm text-body-sm font-medium">
              {errorMsg}
            </span>
          </div>
          {errorMsg.toLowerCase().includes('password') && (
            <button
              type="button"
              onClick={onGoBack}
              className="px-3 py-1.5 rounded-lg bg-surface text-on-error-container font-label-sm text-label-sm font-semibold shrink-0 cursor-pointer"
            >
              Ubah Sandi
            </button>
          )}
        </div>
      )}

      {/* VERIFICATION STATUS CARD 1: Hardware USB Dongle */}
      <DongleStatusCard
        authStatus={authStatus}
        checking={checkingDongle}
        username={username}
        isDongleActiveAndValid={isDongleActiveAndValid}
        onRefresh={onRefreshDongle}
      />

      {/* VERIFICATION STATUS CARD 2: Webcam Face Biometric */}
      <div className="bg-canvas p-5 rounded-2xl mb-7 border border-border-subtle">
        <div className="flex items-center justify-between mb-3">
          <span className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">
              videocam
            </span>
            Pemindai Wajah Enclave
          </span>
        </div>

        {insecureOriginUrl && (
          <div className="mb-3 p-2.5 rounded-xl bg-surface-container-low border border-security-warning/40 font-body-sm text-body-sm text-on-surface">
            Akses via IP jaringan menonaktifkan webcam langsung.{' '}
            <a
              href={insecureOriginUrl}
              className="text-primary font-semibold underline"
            >
              Beralih ke {insecureOriginUrl}
            </a>{' '}
            atau gunakan tombol <strong>Upload Foto</strong>.
          </div>
        )}

        {/* Hidden Canvas for 128-float biometric computation */}
        <canvas ref={canvasRef} width={320} height={220} className="hidden" />

        <WebcamViewport
          videoRef={videoRef}
          cameraActive={cameraActive}
          verifyingFace={verifyingFace}
          capturedPreviewUrl={capturedPreviewUrl}
          faceVerify={faceVerify}
          isFaceMatched={isFaceMatched}
        />

        {/* Interactive Webcam Controls */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onStartCamera}
            className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-container-low text-primary border border-border-subtle font-label-md text-label-md flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">
              videocam
            </span>
            <span>{cameraActive ? 'Restart Kamera' : '1. Buka Kamera'}</span>
          </button>

          <button
            type="button"
            disabled={!cameraActive || verifyingFace}
            onClick={onScanFace}
            className={`px-4 py-2 rounded-xl font-label-md text-label-md flex items-center gap-1.5 shadow-xs transition-colors ${
              cameraActive && !verifyingFace
                ? 'bg-primary-container hover:bg-primary text-on-primary cursor-pointer'
                : 'bg-surface-container text-text-muted cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">
              center_focus_strong
            </span>
            <span>
              {verifyingFace ? 'Memverifikasi...' : '2. Scan & Cek Wajah'}
            </span>
          </button>
        </div>

        {faceErrorText && (
          <div className="mt-3 p-2.5 rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] shrink-0">
              error
            </span>
            <span>{faceErrorText}</span>
          </div>
        )}

        {/* Detection Status Bar */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                faceVerify
                  ? faceVerify.matched
                    ? 'bg-surface-container-low text-tertiary'
                    : 'bg-error-container text-on-error-container'
                  : 'bg-surface-container text-text-secondary'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">
                {faceVerify
                  ? faceVerify.matched
                    ? 'check_circle'
                    : 'cancel'
                  : 'face'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-primary font-bold">
                {faceVerify
                  ? faceVerify.matched
                    ? `Wajah Terdeteksi - Kemiripan ${faceVerify.similarityPercent}%`
                    : `Biometrik Ditolak - Kemiripan ${faceVerify.similarityPercent}%`
                  : 'Menunggu Pemindaian Wajah ke Server'}
              </span>
              <span className="font-label-sm text-label-sm text-text-secondary">
                {faceVerify
                  ? `Jarak Euclidean: ${faceVerify.distance} (Batas ≤ ${faceVerify.threshold}) — ${faceVerify.message}`
                  : `Buka kamera lalu klik "Scan & Cek Wajah" atau unggah foto akun @${username}`}
              </span>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low text-primary self-start sm:self-auto shrink-0">
            <svg className="w-5 h-5 -rotate-90 text-primary" viewBox="0 0 36 36">
              <path
                className="text-surface-variant"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className={
                  faceVerify && !faceVerify.matched
                    ? 'text-security-danger'
                    : 'text-tertiary-container'
                }
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeDasharray={ringDash}
                strokeLinecap="round"
                strokeWidth="4"
              />
            </svg>
            <span className="font-code-sm text-code-sm font-bold text-primary">
              {faceVerify ? `${similarityPct}% MATCH` : '0% SCAN'}
            </span>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex flex-col-reverse sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={onGoBack}
          className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-surface text-text-secondary hover:bg-surface-container-low hover:text-primary border border-border-subtle transition-colors font-label-md text-label-md flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">
            arrow_back
          </span>
          <span>Kembali ke Akun</span>
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={onValidateVault}
          className={`w-full sm:flex-1 px-7 py-3.5 rounded-xl transition-all duration-200 font-label-md text-label-md font-semibold flex items-center justify-center gap-2.5 shadow-md ${
            canSubmit
              ? 'bg-primary-container hover:bg-primary text-on-primary hover:shadow-lg active:scale-[0.99] cursor-pointer'
              : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest cursor-pointer'
          }`}
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined text-[18px] animate-spin">
                progress_activity
              </span>
              <span>Melakukan Handshake Kriptografi...</span>
            </>
          ) : (
            <>
              <span>Validasi &amp; Buka Kunci Brankas</span>
              <span className="material-symbols-outlined text-[18px]">
                {canSubmit ? 'lock_open' : 'lock'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Bottom Micro Assurance */}
      <div className="mt-6 pt-4 border-t border-border-subtle flex items-center justify-between text-text-muted font-code-sm text-code-sm">
        <span className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isDongleActiveAndValid
                ? 'bg-tertiary-container'
                : 'bg-security-warning'
            }`}
          />
          HSM Slot: {authStatus?.activeDongle?.drivePath || 'UNPLUGGED'}
        </span>
        <span>
          DONGLE: {authStatus?.activeDongle?.dongleId || 'WAITING'}
        </span>
      </div>
    </div>
  );
}
