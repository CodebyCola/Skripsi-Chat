'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { type ClientAuthCheckState } from '../components/DongleStatus';
import { type FaceVerifyServerResult } from '../components/WebcamCapture';
import { apiRequest, SERVER_CONSOLE_URL } from '../lib/api';
import { extractBiometricDescriptorFromCanvas } from '../lib/biometric';

type AuthStep = 1 | 2 | 3;
type AcademicRole = 'student' | 'lecturer';

interface LoginResponseData {
  success: boolean;
  user: {
    id: string;
    username: string;
    fullName: string;
    role: string;
    dongleId: string;
    secretNote?: string;
  };
  securityVerification: {
    dongleStatus: string;
    passwordAlgorithm: string;
    biometricDistance: number;
    biometricSimilarityPercent: number;
  };
}

const LOGO_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1WQQTGMsy0Lsx1OAfcugyRfpSSlnFcOweZCb9v_GRfivc0wsjldUUCpT1RrEkKfkvob94qKMtQzSo7CzohojX_mHrt2XQpqlN7-YynYfPWEyqSVKweDVWSOXE2dUXKFsnEQcvprhHG__l-AeJrkj7q1-BJITu6HfXt94Q6V9RnLKZtmBbF8MMjUYDZPb3fnth6Rtdw5RsTG4qpo-TQK6NgkdpnAkcGfAqBnU89hMLWY';

const STEP_1_ARTWORK =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC59KeP5toXEWImBE7HV3AP8Fpab7bAT8hpcC43EnoVmxrTqkgY1-VgAxZs2yk9jkXP6W4bRX_tOAHoOwg_al4tu3hr_mq3C6cB6bDqgPKc4B07DWYuy8GXyaMMVqQmUEWIbDFRGT03YOwkSLZGJgQXdl-fh4a6kRnJB3n-JJXP1ZiQcOITnPIlE-2eMYcb8tZzwKJWf4XfAIZHsIK2BD5hMHhTO3gDPtFdnzOqMfQ';

const STEP_2_ARTWORK =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBH29mWmLazgpJU4lNrSwXVWSJ6l8QiuSj9Z5pTG7-0eS7CREd0A-F0jK0dYW1Bm6Z8OgU1MW5rwpD897hKYpkUwrtJW4_J786Eu8vzmPpRxWqL6SkwUzRQcnxrztE-SHApQaSkgjnL56aStittARBtZDAZ_XHt984OHVZOtfsJBsuY7rrKlQeAEtO6y4-MARsy9FyQcxYRJgANPeMSJYbPQRb_kVXk27SAOeRhkMs';

const STEP_3_ARTWORK =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCUhrbJoYbuZyHhM7mFsuKAcYwjQ-eG2Z3Ok7FGyyQc__DCjDgg59X_ddESXkUibRg1GzBCCMElUvUXpyushDfz9DhabcKN85Lzxw4T3ZWdjvrrhy5gOgmkmCGwpyCEvsgIlf1mHpWUDk1WSy2ZpSeSZurm9NsQd-lCPlJJW66UPuoh3RmVg-aABGkZ-JiUL6lXtkYDVBly2d7z54STxHx8YsANGIUsRO-dk3mAMtg';

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

export default function LoginPage() {
  const [step, setStep] = useState<AuthStep>(1);
  const [role, setRole] = useState<AcademicRole>('student');

  // State kredensial & integrasi server (dipertahankan identik dengan kontrak backend)
  const [username, setUsername] = useState('editor_aegis');
  const [password, setPassword] = useState('Aegis2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

  const [authStatus, setAuthStatus] = useState<ClientAuthCheckState | null>(null);
  const [checkingDongle, setCheckingDongle] = useState(true);

  const [faceVerify, setFaceVerify] = useState<FaceVerifyServerResult | null>(
    null
  );
  const [verifiedDescriptor, setVerifiedDescriptor] = useState<number[] | null>(
    null
  );

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successInfo, setSuccessInfo] = useState<LoginResponseData | null>(null);
  const [countdown, setCountdown] = useState(5);

  // Refs & state kamera biometrik (Step 2)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [verifyingFace, setVerifyingFace] = useState(false);
  const [faceErrorText, setFaceErrorText] = useState('');
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(
    null
  );
  const [insecureOriginUrl, setInsecureOriginUrl] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Deteksi origin non-localhost (misal 192.168.x.x tanpa HTTPS)
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1' &&
      !window.isSecureContext
    ) {
      setInsecureOriginUrl(
        `http://localhost:${window.location.port || '3000'}${window.location.pathname}`
      );
    }
  }, []);

  // Bersihkan kamera saat komponen unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Reset hasil verifikasi biometrik bila username diubah
  useEffect(() => {
    setFaceVerify(null);
    setVerifiedDescriptor(null);
    setCapturedPreviewUrl(null);
    setFaceErrorText('');
  }, [username]);

  // Polling real-time status Hardware Dongle & user dari Server (:4000)
  const checkServerStatus = useCallback(async () => {
    try {
      const q = encodeURIComponent((username || '').trim());
      const res = await apiRequest<Omit<ClientAuthCheckState, 'serverOnline'>>(
        `/api/auth/check-status?username=${q}`
      );
      setAuthStatus({
        ...res,
        serverOnline: true,
      });
    } catch {
      setAuthStatus({
        serverOnline: false,
        dongleDetected: false,
        dongleMatchesUser: false,
        userExists: false,
        hasEnrolledFace: false,
        hasFacePhoto: false,
        activeDongle: null,
      });
    } finally {
      setCheckingDongle(false);
    }
  }, [username]);

  useEffect(() => {
    checkServerStatus();
    const timer = setInterval(checkServerStatus, 2000);
    return () => clearInterval(timer);
  }, [checkServerStatus]);

  // Countdown otomatis 5 detik di Step 3 menuju /dashboard
  useEffect(() => {
    if (step !== 3) return;
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          window.location.href = '/dashboard';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const isDongleActiveAndValid = Boolean(
    authStatus?.serverOnline &&
      authStatus?.dongleDetected &&
      authStatus?.dongleMatchesUser
  );
  const isFaceMatched = Boolean(faceVerify?.matched && verifiedDescriptor);
  const canSubmitLogin =
    isDongleActiveAndValid && isFaceMatched && Boolean(password) && !loading;

  function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password) {
      setErrorMsg('Harap lengkapi identitas akun dan kata sandi brankas.');
      return;
    }

    if (authStatus?.serverOnline && !authStatus?.userExists) {
      setErrorMsg(
        `Akun "@${username.trim()}" tidak ditemukan di Server. Gunakan username terdaftar (contoh: editor_aegis) atau daftar terlebih dahulu.`
      );
      return;
    }

    setStep(2);
  }

  function goBackToStep1() {
    stopCamera();
    setErrorMsg('');
    setStep(1);
  }

  async function startCamera() {
    setFaceErrorText('');
    setCapturedPreviewUrl(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'Browser memblokir akses kamera pada alamat IP ini. Buka melalui http://localhost:3000 atau gunakan tombol Upload Foto.'
        );
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      setFaceErrorText(
        `Tidak bisa membuka webcam (${err.message}). Pastikan kamera tidak sedang dipakai tab Server (:4000) atau gunakan Upload Foto.`
      );
    }
  }

  async function verifyCanvasAgainstServer(canvas: HTMLCanvasElement) {
    setFaceErrorText('');
    setVerifyingFace(true);
    try {
      const descriptor = extractBiometricDescriptorFromCanvas(canvas);
      const serverCheck = await apiRequest<FaceVerifyServerResult>(
        '/api/auth/verify-face',
        'POST',
        {
          username: username.trim(),
          faceDescriptor: descriptor,
        }
      );

      setCapturedPreviewUrl(canvas.toDataURL('image/jpeg', 0.85));
      setFaceVerify(serverCheck);
      setVerifiedDescriptor(serverCheck.matched ? descriptor : null);
    } catch (err: any) {
      setFaceVerify(null);
      setVerifiedDescriptor(null);
      setFaceErrorText(err.message || 'Gagal memverifikasi wajah ke Server');
    } finally {
      setVerifyingFace(false);
    }
  }

  async function scanAndVerifyFromCamera() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (!cameraActive || video.videoWidth === 0) {
      setFaceErrorText(
        'Nyalakan kamera terlebih dahulu dan tunggu gambar video muncul!'
      );
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    await verifyCanvasAgainstServer(canvas);
  }

  function handleUploadFaceFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        await verifyCanvasAgainstServer(canvas);
      };
      img.src = String(ev.target?.result || '');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleValidateVault() {
    setErrorMsg('');

    if (!isDongleActiveAndValid) {
      setErrorMsg(
        'AKSES DITOLAK: Hardware USB Dongle belum aktif atau tidak sesuai dengan username ini! Silakan aktifkan di Server Console (:4000).'
      );
      return;
    }

    if (!isFaceMatched || !verifiedDescriptor) {
      setErrorMsg(
        'AKSES DITOLAK: Biometrik wajah belum diverifikasi atau tidak sesuai dengan data di Server!'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest<LoginResponseData>('/api/auth/login', 'POST', {
        username: username.trim(),
        password,
        faceDescriptor: verifiedDescriptor,
      });

      setSuccessInfo(res);
      localStorage.setItem('aegis_user', JSON.stringify(res.user));
      stopCamera();
      setStep(3);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login gagal.');
    } finally {
      setLoading(false);
    }
  }

  // Helper teks status Dongle dinamis dari Server
  let dongleTitle = 'Memeriksa Koneksi Hardware Dongle...';
  let dongleSubtitle = 'Sinkronisasi status token fisik dengan Server (:4000)';
  if (!checkingDongle) {
    if (!authStatus?.serverOnline) {
      dongleTitle = 'Server Backend (:4000) Belum Terhubung';
      dongleSubtitle =
        'Pastikan server kriptografi menyala (`npm start` di folder server)';
    } else if (!authStatus?.dongleDetected) {
      dongleTitle = 'Hardware USB Dongle Belum Aktif';
      dongleSubtitle =
        'Colokkan USB Key atau aktifkan melalui Server Console (:4000)';
    } else if (!authStatus?.userExists) {
      dongleTitle = `Username "@${username}" Tidak Ditemukan`;
      dongleSubtitle = `Dongle aktif saat ini terdaftar untuk @${authStatus?.activeDongle?.username}`;
    } else if (!authStatus?.dongleMatchesUser) {
      dongleTitle = 'USB Dongle Aktif Milik Akun Lain';
      dongleSubtitle = `Terpasang milik @${authStatus?.activeDongle?.username} • Bukan milik @${username}`;
    } else {
      dongleTitle = 'USB Dongle Terdeteksi';
      dongleSubtitle = `Drive ${authStatus?.activeDongle?.drivePath} • Serial: ${authStatus?.activeDongle?.dongleId} • Kunci AES-256 Aktif`;
    }
  }

  const similarityPct = faceVerify?.similarityPercent ?? 0;
  const ringDash = `${Math.max(0, Math.min(100, Math.round(similarityPct)))}, 100`;

  return (
    <div className="skripsichat-auth bg-canvas font-body-md text-on-surface antialiased min-h-screen flex flex-col">
      {/* TOP HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(28,40,35,0.04)]">
        <div className="h-16 w-full px-margin md:px-margin-tablet lg:px-margin-desktop flex items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-md shrink-0">
            <img
              alt="SkripsiChat Logo Emblem"
              className="h-8 w-auto object-contain"
              src={LOGO_URL}
            />
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-primary tracking-tight leading-none">
                SkripsiChat
              </span>
              <span className="font-label-sm text-label-sm text-text-secondary mt-0.5">
                Academic Advisory Shield
              </span>
            </div>
            <div className="hidden xl:flex items-center gap-space-xs ml-space-sm pl-space-md py-space-xs bg-surface-container-low rounded-full px-space-md">
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  authStatus?.serverOnline
                    ? 'bg-tertiary-container'
                    : 'bg-security-warning'
                }`}
              />
              <span className="font-label-sm text-label-sm text-primary">
                Portal Akademik Terenkripsi
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-space-xs">
            <button
              type="button"
              onClick={() => {
                if (step === 2) goBackToStep1();
              }}
              className="px-space-md py-space-sm transition-colors bg-primary-container text-on-primary font-label-md text-label-md rounded-lg cursor-pointer"
            >
              Portal Otentikasi
            </button>
            <a
              href={SERVER_CONSOLE_URL}
              target="_blank"
              rel="noreferrer"
              className="px-space-md py-space-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded-lg transition-colors font-label-md text-label-md"
            >
              Server Token &amp; Biometrik (:4000)
            </a>
            <a
              href="/register"
              className="px-space-md py-space-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded-lg transition-colors font-label-md text-label-md"
            >
              Registrasi Akun
            </a>
          </nav>

          <div className="flex items-center gap-space-sm shrink-0">
            <div className="hidden sm:flex items-center gap-space-xs px-space-sm py-1 rounded bg-surface-container text-text-secondary font-code-sm text-code-sm">
              <span className="font-label-sm text-label-sm text-text-muted">
                SERVER:
              </span>
              <span>
                {authStatus?.serverOnline ? 'ONLINE :4000' : 'OFFLINE'}
              </span>
            </div>
            <div className="flex items-center gap-space-xs px-space-sm py-1.5 rounded-lg bg-surface-container-low text-primary font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[16px]">
                account_balance
              </span>
              <span className="hidden md:inline font-label-sm text-label-sm">
                Univ. Indonesia
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-primary text-[18px]">
                person
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="w-full pt-16 bg-canvas flex-1 flex flex-col">
        {/* ==================== STEP 1: KREDENSIAL LOGIN ==================== */}
        {step === 1 && (
          <div className="w-full max-w-7xl mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop py-space-xl">
            {/* Breadcrumb / Session Security Pill Bar */}
            <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-lg">
              <div className="flex items-center gap-space-xs text-text-secondary font-label-md text-label-md">
                <span className="material-symbols-outlined text-[18px] text-primary">
                  security
                </span>
                <span>Otentikasi Multi-Faktor Institusi</span>
                <span className="text-text-muted">/</span>
                <span className="text-primary font-semibold">
                  Gerbang Kredensial FIPS-140-2
                </span>
              </div>
              <div className="flex items-center gap-2 bg-surface-container-low px-space-md py-1 rounded-full border border-border-subtle shadow-sm">
                <span
                  className={`w-2 h-2 rounded-full animate-ping ${
                    authStatus?.serverOnline
                      ? 'bg-tertiary-container'
                      : 'bg-security-danger'
                  }`}
                />
                <span className="font-code-sm text-code-sm text-primary font-medium">
                  {authStatus?.serverOnline
                    ? 'HSM NODE: LOCALHOST:4000 READY'
                    : 'HSM NODE: SERVER :4000 OFFLINE'}
                </span>
              </div>
            </div>

            {/* Main Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-stretch">
              {/* LEFT COLUMN (cols 5 / 12) */}
              <aside className="lg:col-span-5 flex flex-col justify-between bg-surface rounded-3xl p-space-lg md:p-space-xl border border-border-subtle shadow-[0_1px_3px_0_rgba(28,40,35,0.04)] relative overflow-hidden">
                <div className="absolute -top-24 -left-24 w-72 h-72 bg-surface-container-low rounded-full blur-3xl opacity-60 pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-primary-fixed/30 rounded-full blur-3xl opacity-40 pointer-events-none" />

                <div className="relative z-10 flex flex-col">
                  {/* Brand Badge Header */}
                  <div className="flex items-center justify-between gap-space-sm pb-space-md">
                    <div className="flex items-center gap-space-sm">
                      <img
                        alt="SkripsiChat Logo Emblem"
                        className="w-10 h-10 object-contain rounded-xl p-1 bg-surface-container-low shadow-sm"
                        src={LOGO_URL}
                      />
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm text-primary leading-none tracking-tight">
                          SkripsiChat
                        </span>
                        <span className="font-label-sm text-label-sm text-text-secondary mt-0.5">
                          Secure Advisory Network
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-label-sm font-label-sm bg-surface-container text-primary font-semibold tracking-wide">
                      v2.4 Academic Shield
                    </span>
                  </div>

                  {/* Academic Consultation Illustration */}
                  <div className="mt-space-md group relative rounded-2xl overflow-hidden border border-border-subtle shadow-sm aspect-[4/3] bg-surface-container-lowest">
                    <img
                      alt="Ilustrasi konsultasi bimbingan skripsi aman"
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                      src={STEP_1_ARTWORK}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-transparent opacity-40 pointer-events-none" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-1.5 rounded-lg bg-surface/90 backdrop-blur-md border border-border-subtle">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-tertiary-container" />
                        <span className="font-label-sm text-label-sm text-on-surface font-medium">
                          Bimbingan Bab IV &amp; V Terenkripsi
                        </span>
                      </div>
                      <span className="font-code-sm text-code-sm text-text-secondary">
                        UID: 8812-B
                      </span>
                    </div>
                  </div>

                  {/* Core Academic Value Proposition */}
                  <div className="mt-space-lg">
                    <h1 className="font-headline-lg text-headline-lg text-on-surface leading-tight tracking-tight">
                      Bimbingan Skripsi Aman &amp; Terenkripsi Multi-Faktor
                    </h1>
                    <p className="font-body-md text-body-md text-text-secondary leading-relaxed mt-space-sm">
                      Ruang kolaborasi draf karya ilmiah antara dosen pembimbing
                      dan mahasiswa dengan proteksi hardware key dan biometrik
                      terdesentralisasi, mencegah plagiasi dan kebocoran draf
                      intelektual.
                    </p>
                  </div>
                </div>

                {/* Security Proof Chips Grid */}
                <div className="relative z-10 pt-space-lg mt-space-lg border-t border-border-subtle">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low/70 border border-border-subtle text-primary">
                      <span className="material-symbols-outlined text-[18px] text-tertiary">
                        lock_reset
                      </span>
                      <span className="font-label-sm text-label-sm font-medium">
                        AES-256-GCM Enclave
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low/70 border border-border-subtle text-primary">
                      <span className="material-symbols-outlined text-[18px] text-primary-container">
                        usb
                      </span>
                      <span className="font-label-sm text-label-sm font-medium">
                        Hardware USB Key Gate
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low/70 border border-border-subtle text-primary">
                      <span className="material-symbols-outlined text-[18px] text-security-info">
                        face
                      </span>
                      <span className="font-label-sm text-label-sm font-medium">
                        Biometric Verified
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container-low/70 border border-border-subtle text-primary">
                      <span className="material-symbols-outlined text-[18px] text-tertiary-container">
                        hub
                      </span>
                      <span className="font-label-sm text-label-sm font-medium">
                        Blockchain Ledger ACC
                      </span>
                    </div>
                  </div>
                  <div className="mt-space-md p-space-sm rounded-xl bg-surface-container-high/40 flex items-start gap-space-sm">
                    <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
                      verified
                    </span>
                    <p className="font-body-sm text-body-sm text-text-secondary italic">
                      &ldquo;Integritas orisinalitas riset terjaga penuh melalui
                      verifikasi multi-tingkat institusi.&rdquo;
                    </p>
                  </div>
                </div>
              </aside>

              {/* RIGHT COLUMN (cols 7 / 12) - STEP 1 CARD */}
              <section className="lg:col-span-7 flex flex-col justify-between bg-surface rounded-3xl p-space-lg md:p-space-xl border border-border-subtle shadow-[0_1px_3px_0_rgba(28,40,35,0.04)] relative">
                <div>
                  {/* Stepper Progress Header */}
                  <div className="mb-space-lg">
                    <div className="flex items-center justify-between relative">
                      <div className="absolute left-6 right-6 top-5 h-0.5 bg-border-subtle z-0" />
                      <div className="absolute left-6 top-5 h-0.5 bg-primary transition-all duration-500 w-[15%] z-0" />

                      <div className="relative z-10 flex flex-col items-center text-left">
                        <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary font-headline-sm text-headline-sm flex items-center justify-center shadow-md transition-all ring-4 ring-primary-fixed">
                          1
                        </div>
                        <span className="font-label-md text-label-md text-on-surface font-semibold mt-2">
                          Kredensial Akun
                        </span>
                        <span className="font-label-sm text-label-sm text-text-secondary">
                          Username &amp; Sandi
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (username.trim() && password) setStep(2);
                        }}
                        className="relative z-10 flex flex-col items-center group cursor-pointer focus:outline-none text-center"
                      >
                        <div className="w-10 h-10 rounded-full bg-surface-container text-text-secondary font-headline-sm text-headline-sm flex items-center justify-center transition-all group-hover:bg-surface-container-high">
                          2
                        </div>
                        <span className="font-label-md text-label-md text-text-muted font-medium mt-2">
                          Dongle &amp; Biometrik
                        </span>
                        <span className="font-label-sm text-label-sm text-text-muted">
                          USB Key &amp; Wajah
                        </span>
                      </button>

                      <div className="relative z-10 flex flex-col items-center text-right">
                        <div className="w-10 h-10 rounded-full bg-surface-container text-text-secondary font-headline-sm text-headline-sm flex items-center justify-center">
                          3
                        </div>
                        <span className="font-label-md text-label-md text-text-muted font-medium mt-2">
                          Terverifikasi
                        </span>
                        <span className="font-label-sm text-label-sm text-text-muted">
                          Akses Dashboard
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Header */}
                  <div className="mb-space-lg">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                        Masuk ke Ruang Bimbingan
                      </h2>
                      <span className="px-2.5 py-1 rounded bg-surface-container text-primary font-code-sm text-code-sm shrink-0">
                        SCRYPT + SALT
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-text-secondary mt-1">
                      Masukkan identitas akun dosen atau mahasiswa Anda untuk
                      memulai sesi bimbingan terenkripsi.
                    </p>
                  </div>

                  {/* Role Selector Toggle Tabs */}
                  <div className="p-1 rounded-xl bg-surface-container-low border border-border-subtle inline-flex w-full mb-space-lg">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`flex-1 py-2.5 px-4 rounded-lg font-label-md text-label-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        role === 'student'
                          ? 'bg-primary-container text-on-primary shadow-sm'
                          : 'text-text-secondary hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        school
                      </span>
                      <span>Mahasiswa (NIM)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('lecturer')}
                      className={`flex-1 py-2.5 px-4 rounded-lg font-label-md text-label-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        role === 'lecturer'
                          ? 'bg-primary-container text-on-primary shadow-sm'
                          : 'text-text-secondary hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        badge
                      </span>
                      <span>Dosen Pembimbing (NIDN)</span>
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
                  <form
                    className="space-y-space-md"
                    onSubmit={handleStep1Submit}
                  >
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
                          onChange={(e) => setUsername(e.target.value)}
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
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          required
                          className="w-full pl-11 pr-11 py-3 bg-canvas text-on-surface font-body-md text-body-md rounded-xl border border-border-subtle focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-fixed transition-all placeholder:text-text-muted tracking-wider font-mono"
                        />
                        <button
                          type="button"
                          aria-label="Tampilkan atau sembunyikan kata sandi"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 text-text-muted hover:text-on-surface p-1 focus:outline-none cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {showPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Security Information Note */}
                    <div className="p-3.5 rounded-xl bg-surface-container-low border border-secondary-fixed flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">
                        info
                      </span>
                      <div className="flex flex-col text-left">
                        <span className="font-label-sm text-label-sm text-primary font-semibold">
                          Protokol Keamanan Langkah 2
                        </span>
                        <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                          Sesi ini memerlukan{' '}
                          <strong>Hardware USB Token</strong> aktif di Server
                          dan pencocokan{' '}
                          <strong>Biometrik Wajah (Euclidean 128-D)</strong>{' '}
                          pada tahap berikutnya.
                        </p>
                      </div>
                    </div>

                    {/* Remember Device & Key Persistence Checkbox */}
                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberDevice}
                          onChange={(e) => setRememberDevice(e.target.checked)}
                          className="w-4 h-4 rounded text-primary border-border-subtle focus:ring-primary-fixed accent-primary"
                        />
                        <span className="font-body-sm text-body-sm text-text-secondary">
                          Simpan identitas publik perangkat ini
                        </span>
                      </label>
                      <div className="flex items-center gap-1 font-label-sm text-label-sm text-text-muted">
                        <span className="material-symbols-outlined text-[15px]">
                          timer
                        </span>
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

                {/* Footer Card Meta & Assistance Links */}
                <div className="pt-space-lg mt-space-lg border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-space-sm">
                  <div className="flex items-center gap-space-md">
                    <a
                      href={SERVER_CONSOLE_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="font-label-sm text-label-sm text-text-secondary hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        dns
                      </span>
                      <span>Server Console ({SERVER_CONSOLE_URL})</span>
                    </a>
                    <span className="text-text-muted">•</span>
                    <a
                      href="/register"
                      className="font-label-sm text-label-sm text-text-secondary hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        person_add
                      </span>
                      <span>Daftar Akun Baru</span>
                    </a>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-low">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isDongleActiveAndValid
                          ? 'bg-tertiary-container'
                          : 'bg-security-warning'
                      }`}
                    />
                    <span className="font-code-sm text-code-sm text-primary">
                      {isDongleActiveAndValid
                        ? 'Dongle Siap'
                        : 'Cek Dongle di Tahap 2'}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            {/* Quick Academic Trust Bar below main card */}
            <div className="mt-space-lg grid grid-cols-1 md:grid-cols-3 gap-space-md text-center md:text-left">
              <div className="flex items-center gap-space-md p-space-md rounded-2xl bg-surface border border-border-subtle shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-surface-container-low text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">
                    policy
                  </span>
                </div>
                <div>
                  <span className="font-label-md text-label-md text-on-surface font-semibold block">
                    Sertifikasi PD-DIKTI
                  </span>
                  <span className="font-body-sm text-body-sm text-text-secondary">
                    Sinkronisasi nomor induk &amp; status aktif mahasiswa secara
                    real-time.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-space-md p-space-md rounded-2xl bg-surface border border-border-subtle shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-surface-container-low text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">
                    encrypted
                  </span>
                </div>
                <div>
                  <span className="font-label-md text-label-md text-on-surface font-semibold block">
                    Zero-Knowledge Storage
                  </span>
                  <span className="font-body-sm text-body-sm text-text-secondary">
                    Draf skripsi dienkripsi lokal sebelum dikirim ke repositori
                    kampus.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-space-md p-space-md rounded-2xl bg-surface border border-border-subtle shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-surface-container-low text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">
                    history_edu
                  </span>
                </div>
                <div>
                  <span className="font-label-md text-label-md text-on-surface font-semibold block">
                    Jejak Audit Sah Pengujian
                  </span>
                  <span className="font-body-sm text-body-sm text-text-secondary">
                    Setiap persetujuan bab mengikat stempel waktu kriptografis
                    otentik.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================ STEP 2: VERIFIKASI DONGLE & BIOMETRIK ================ */}
        {step === 2 && (
          <div className="w-full max-w-7xl mx-auto py-8 px-6 min-h-[calc(100vh-140px)] flex items-center justify-center">
            <div className="w-full grid grid-cols-12 gap-8 items-start lg:items-center">
              {/* LEFT COLUMN (cols 5/12) */}
              <div className="col-span-12 lg:col-span-5">
                <div
                  className="rounded-3xl bg-surface p-8 relative overflow-hidden flex flex-col justify-between border border-border-subtle"
                  style={{
                    boxShadow:
                      '0 4px 20px -2px rgba(28, 40, 35, 0.05), 0 1px 3px 0 rgba(28, 40, 35, 0.04)',
                  }}
                >
                  <div className="flex items-center justify-between gap-space-sm mb-6">
                    <div className="flex items-center gap-2.5">
                      <img
                        alt="SkripsiChat Logo Emblem"
                        className="w-9 h-9 object-contain rounded-md"
                        src={LOGO_URL}
                      />
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm text-primary leading-tight font-bold">
                          SkripsiChat
                        </span>
                        <span className="font-code-sm text-code-sm text-text-secondary tracking-tight">
                          CRYPTO-GUARD v2.6
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low text-primary">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-ping" />
                      <span className="font-label-sm text-label-sm font-semibold">
                        Tahap 2 dari 3
                      </span>
                    </div>
                  </div>

                  {/* Academic Editorial Illustration */}
                  <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-sm bg-surface-container">
                    <img
                      alt="Ilustrasi verifikasi enclave akademik"
                      className="w-full h-full object-cover"
                      src={STEP_2_ARTWORK}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-3 left-3 right-3 px-3 py-2 rounded-xl bg-surface/85 backdrop-blur-md flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[18px]">
                          verified
                        </span>
                        <span className="font-label-sm text-label-sm text-primary font-medium">
                          Bimbingan Terverifikasi Enclave
                        </span>
                      </div>
                      <span className="font-code-sm text-code-sm text-text-secondary">
                        @{username}
                      </span>
                    </div>
                  </div>

                  {/* Copywriting Details */}
                  <div className="mt-6">
                    <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                      Bimbingan Skripsi Aman &amp; Terenkripsi Multi-Faktor
                    </h1>
                    <p className="font-body-md text-body-md text-text-secondary mt-3 leading-relaxed">
                      Verifikasi fisik kriptografi memastikan brankas sesi hanya
                      dapat dibuka saat fisik USB Token di Server dan biometrik
                      wajah terkonfirmasi serentak.
                    </p>
                  </div>

                  {/* Micro Security Pills */}
                  <div className="mt-6 pt-5 bg-surface flex flex-wrap gap-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm">
                      <span className="material-symbols-outlined text-[15px] text-tertiary-container">
                        token
                      </span>
                      <span>
                        {isDongleActiveAndValid
                          ? 'Hardware Token Attached'
                          : 'Waiting USB Token'}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm">
                      <span className="material-symbols-outlined text-[15px] text-security-info">
                        face_unlock
                      </span>
                      <span>
                        {isFaceMatched
                          ? `Face Matched (${similarityPct}%)`
                          : 'Biometric Scanner Ready'}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm">
                      <span className="material-symbols-outlined text-[15px] text-primary">
                        lock_clock
                      </span>
                      <span>Zero-Knowledge Handshake</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN (cols 7/12) - STEP 2 CARD */}
              <div className="col-span-12 lg:col-span-7">
                <div
                  className="bg-surface rounded-3xl p-8 md:p-10 relative border border-border-subtle"
                  style={{
                    boxShadow:
                      '0 8px 30px -4px rgba(28, 40, 35, 0.06), 0 2px 6px -1px rgba(28, 40, 35, 0.03)',
                  }}
                >
                  {/* Stepper Progress Bar (Step 2 Active, Step 1 Done, Step 3 Inactive) */}
                  <div className="w-full pb-6 mb-6">
                    <div className="flex items-center justify-between relative">
                      <div className="absolute left-6 right-6 top-5 h-1 bg-surface-container rounded-full z-0">
                        <div className="h-full bg-primary-container rounded-full w-1/2 transition-all duration-500" />
                      </div>

                      <button
                        type="button"
                        onClick={goBackToStep1}
                        className="relative z-10 flex flex-col items-center group cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-full bg-tertiary-container text-on-tertiary flex items-center justify-center font-label-md text-label-md shadow-sm">
                          <span className="material-symbols-outlined text-[20px]">
                            check
                          </span>
                        </div>
                        <span className="font-label-sm text-label-sm text-text-secondary mt-2 font-medium">
                          Kredensial Akun
                        </span>
                      </button>

                      <div className="relative z-10 flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary ring-4 ring-surface-container-low flex items-center justify-center font-headline-sm text-headline-sm font-bold shadow-sm">
                          2
                        </div>
                        <span className="font-label-md text-label-md text-on-surface mt-2 font-bold">
                          Dongle &amp; Biometrik
                        </span>
                      </div>

                      <div className="relative z-10 flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-surface-container-low text-text-secondary flex items-center justify-center font-label-md text-label-md">
                          3
                        </div>
                        <span className="font-label-sm text-label-sm text-text-muted mt-2">
                          Terverifikasi
                        </span>
                      </div>
                    </div>
                  </div>

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
                      Pastikan USB Key terpasang dan hadapkan wajah Anda ke
                      kamera untuk mencocokkan biometrik.
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
                          <code className="font-code-sm">@{username}</code> belum
                          merekam foto wajah asli di Server. Silakan buka{' '}
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
                          onClick={goBackToStep1}
                          className="px-3 py-1.5 rounded-lg bg-surface text-on-error-container font-label-sm text-label-sm font-semibold shrink-0 cursor-pointer"
                        >
                          Ubah Sandi
                        </button>
                      )}
                    </div>
                  )}

                  {/* VERIFICATION STATUS CARD 1: Hardware USB Dongle */}
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
                            isDongleActiveAndValid
                              ? 'text-primary'
                              : 'text-security-warning'
                          }`}
                        >
                          usb
                        </span>
                        <span
                          className={`absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse ${
                            isDongleActiveAndValid
                              ? 'bg-tertiary-container'
                              : 'bg-security-danger'
                          }`}
                        />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-label-md text-label-md text-primary font-bold">
                            {dongleTitle}
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
                          {dongleSubtitle}
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
                            onClick={checkServerStatus}
                            className="font-label-sm text-label-sm font-semibold bg-surface hover:bg-surface-container text-primary px-3 py-1.5 rounded-lg border border-border-subtle shadow-sm flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              refresh
                            </span>
                            Cek Ulang
                          </button>
                          <a
                            href={SERVER_CONSOLE_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="font-label-sm text-label-sm font-semibold bg-primary-container text-on-primary px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              open_in_new
                            </span>
                            Server :4000
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* VERIFICATION STATUS CARD 2: Webcam Face Biometric */}
                  <div className="bg-canvas p-5 rounded-2xl mb-7 border border-border-subtle">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-primary">
                          videocam
                        </span>
                        Pemindai Wajah Enclave (Webcam Real-time)
                      </span>
                      <span className="font-code-sm text-code-sm text-text-secondary flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            cameraActive
                              ? 'bg-tertiary-container animate-ping'
                              : 'bg-security-info'
                          }`}
                        />
                        {cameraActive ? 'LIVE • 640x480' : 'STANDBY • 128-D'}
                      </span>
                    </div>

                    {insecureOriginUrl && (
                      <div className="mb-3 p-2.5 rounded-xl bg-surface-container-low border border-security-warning/40 font-body-sm text-body-sm text-on-surface">
                        ⚠️ Akses via IP jaringan menonaktifkan webcam langsung.{' '}
                        <a
                          href={insecureOriginUrl}
                          className="text-primary font-semibold underline"
                        >
                          Beralih ke {insecureOriginUrl}
                        </a>{' '}
                        atau gunakan tombol <strong>Upload Foto</strong>.
                      </div>
                    )}

                    {/* Hidden 320x220 Canvas for Server-Matched 128-Float Extraction */}
                    <canvas
                      ref={canvasRef}
                      width={320}
                      height={220}
                      className="hidden"
                    />

                    {/* Stylized Camera Viewport */}
                    <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-[#101915] flex items-center justify-center shadow-inner">
                      {/* Live Webcam Video */}
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                          cameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                      />

                      {/* Preview foto hasil upload/scan bila kamera sedang mati */}
                      {!cameraActive && capturedPreviewUrl && (
                        <img
                          src={capturedPreviewUrl}
                          alt="Frame wajah yang dipindai"
                          className="absolute inset-0 w-full h-full object-cover opacity-75"
                        />
                      )}

                      {/* Grid Matrix Overlay */}
                      <div
                        className="absolute inset-0 opacity-15 pointer-events-none"
                        style={{
                          backgroundImage:
                            'radial-gradient(#88d6af 1px, transparent 1px)',
                          backgroundSize: '16px 16px',
                        }}
                      />

                      {/* Real Webcam HUD Metadata */}
                      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            cameraActive
                              ? 'bg-security-danger animate-pulse'
                              : 'bg-text-muted'
                          }`}
                        />
                        <span className="font-code-sm text-code-sm text-white font-medium">
                          {cameraActive
                            ? 'LIVE WEBCAM • ENCRYPTED'
                            : capturedPreviewUrl
                            ? 'FRAME CAPTURED'
                            : 'CAMERA STANDBY'}
                        </span>
                      </div>

                      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full">
                        <span className="material-symbols-outlined text-[13px] text-tertiary-fixed-dim">
                          neurology
                        </span>
                        <span className="font-code-sm text-code-sm text-tertiary-fixed font-medium">
                          Euclidean 128-D
                        </span>
                      </div>

                      {/* Scanning Ray Animation */}
                      <div
                        className="absolute left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-transparent via-tertiary-fixed-dim to-transparent z-10 shadow-[0_0_12px_#88d6af] pointer-events-none"
                        style={{
                          animation: 'scanRay 2.8s ease-in-out infinite',
                        }}
                      />

                      {/* Face Oval Guide and Crosshairs */}
                      <div
                        className="relative z-10 w-36 h-44 rounded-[50%] flex items-center justify-center shadow-[0_0_24px_rgba(45,90,70,0.4)] pointer-events-none"
                        style={{
                          background:
                            'radial-gradient(circle, rgba(45,90,70,0.15) 0%, transparent 70%)',
                        }}
                      >
                        <div
                          className={`absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 ${
                            faceVerify
                              ? faceVerify.matched
                                ? 'border-tertiary-fixed'
                                : 'border-security-danger'
                              : 'border-primary-fixed'
                          }`}
                        />
                        <div
                          className={`absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 ${
                            faceVerify
                              ? faceVerify.matched
                                ? 'border-tertiary-fixed'
                                : 'border-security-danger'
                              : 'border-primary-fixed'
                          }`}
                        />
                        <div
                          className={`absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 ${
                            faceVerify
                              ? faceVerify.matched
                                ? 'border-tertiary-fixed'
                                : 'border-security-danger'
                              : 'border-primary-fixed'
                          }`}
                        />
                        <div
                          className={`absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 ${
                            faceVerify
                              ? faceVerify.matched
                                ? 'border-tertiary-fixed'
                                : 'border-security-danger'
                              : 'border-primary-fixed'
                          }`}
                        />

                        <svg
                          className={`w-24 h-28 text-primary-fixed transition-opacity ${
                            cameraActive || capturedPreviewUrl
                              ? 'opacity-30'
                              : 'opacity-75'
                          }`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          viewBox="0 0 100 120"
                        >
                          <ellipse
                            cx="50"
                            cy="58"
                            rx="34"
                            ry="46"
                            strokeDasharray="3 3"
                          />
                          <path
                            d="M30 46 C36 44 42 45 46 47"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M54 47 C58 45 64 44 70 46"
                            strokeWidth="1.5"
                          />
                          <circle cx="38" cy="52" fill="currentColor" r="3" />
                          <circle cx="62" cy="52" fill="currentColor" r="3" />
                          <path d="M50 52 L50 68 L45 72 L55 72" />
                          <path
                            d="M36 84 C43 90 57 90 64 84"
                            strokeWidth="1.5"
                          />
                          <circle cx="50" cy="22" fill="#a4f3ca" r="1.5" />
                          <circle cx="50" cy="98" fill="#a4f3ca" r="1.5" />
                          <circle cx="20" cy="58" fill="#a4f3ca" r="1.5" />
                          <circle cx="80" cy="58" fill="#a4f3ca" r="1.5" />
                        </svg>
                      </div>

                      {/* Bottom HUD Coordinate */}
                      <div className="absolute bottom-2.5 left-3 right-3 z-20 flex items-center justify-between font-code-sm text-code-sm text-primary-fixed-dim/85 px-1 pointer-events-none">
                        <span>ROI: [80..240, 22..198] • GRID 8x8</span>
                        <span className="flex items-center gap-1">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isFaceMatched
                                ? 'bg-tertiary-fixed'
                                : 'bg-primary-fixed-dim'
                            }`}
                          />
                          {isFaceMatched
                            ? 'BIOMETRIC CONFIRMED'
                            : verifyingFace
                            ? 'VERIFYING...'
                            : 'AWAITING SCAN'}
                        </span>
                      </div>
                    </div>

                    {/* Interactive Webcam Controls */}
                    <div className="mt-3.5 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-container-low text-primary border border-border-subtle font-label-md text-label-md flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[17px]">
                          videocam
                        </span>
                        <span>
                          {cameraActive ? 'Restart Kamera' : '1. Buka Kamera'}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={!cameraActive || verifyingFace}
                        onClick={scanAndVerifyFromCamera}
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
                          {verifyingFace
                            ? 'Memverifikasi...'
                            : '2. Scan & Cek Wajah'}
                        </span>
                      </button>

                      <label className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-container-low text-text-secondary hover:text-primary border border-border-subtle font-label-md text-label-md flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-[17px]">
                          upload_file
                        </span>
                        <span>Upload Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadFaceFile}
                          className="hidden"
                        />
                      </label>
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
                                ? `Wajah Terdeteksi • Kemiripan ${faceVerify.similarityPercent}%`
                                : `Biometrik Ditolak • Kemiripan ${faceVerify.similarityPercent}%`
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
                        <svg
                          className="w-5 h-5 -rotate-90 text-primary"
                          viewBox="0 0 36 36"
                        >
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

                    <div className="mt-3.5 flex items-start gap-2 bg-surface p-2.5 rounded-xl border border-border-subtle">
                      <span className="material-symbols-outlined text-[16px] text-text-secondary shrink-0 mt-0.5">
                        lock
                      </span>
                      <p className="font-body-sm text-body-sm text-text-secondary">
                        Ekstraksi vektor 128-dimensi Z-Score dieksekusi di
                        browser; hanya deskriptor numerik yang dikirim untuk
                        dicocokkan di Server.
                      </p>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex flex-col-reverse sm:flex-row items-center gap-3">
                    <button
                      type="button"
                      onClick={goBackToStep1}
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
                      onClick={handleValidateVault}
                      className={`w-full sm:flex-1 px-7 py-3.5 rounded-xl transition-all duration-200 font-label-md text-label-md font-semibold flex items-center justify-center gap-2.5 shadow-md ${
                        canSubmitLogin
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
                            {canSubmitLogin ? 'lock_open' : 'lock'}
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
                      HSM Slot:{' '}
                      {authStatus?.activeDongle?.drivePath || 'UNPLUGGED'}
                    </span>
                    <span>
                      DONGLE:{' '}
                      {authStatus?.activeDongle?.dongleId || 'WAITING'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== STEP 3: AKSES DIBERIKAN & TERVERIFIKASI ========== */}
        {step === 3 && (
          <section className="max-w-7xl mx-auto py-8 px-6 grid grid-cols-12 gap-8 items-center min-h-[calc(100vh-140px)] w-full">
            {/* LEFT COLUMN (cols 5/12) */}
            <div className="col-span-12 lg:col-span-5 bg-surface rounded-3xl p-8 shadow-sm border border-border-subtle relative overflow-hidden flex flex-col justify-between self-stretch">
              <div className="absolute -top-16 -left-16 w-56 h-56 bg-surface-container-low rounded-full blur-3xl pointer-events-none opacity-60" />

              <div className="relative z-10">
                {/* Logo & Status Header */}
                <div className="flex items-center justify-between gap-space-sm mb-6">
                  <div className="flex items-center gap-space-sm">
                    <img
                      alt="SkripsiChat Logo Emblem"
                      className="h-10 w-10 object-contain rounded-md"
                      src={LOGO_URL}
                    />
                    <div className="flex flex-col">
                      <span className="font-headline-sm text-headline-sm text-primary font-bold tracking-tight leading-none">
                        SkripsiChat
                      </span>
                      <span className="font-label-sm text-label-sm text-text-secondary mt-0.5">
                        Academic Advisory Shield
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low text-tertiary font-label-sm text-label-sm">
                    <span className="w-2 h-2 rounded-full bg-tertiary-container animate-ping" />
                    Autentikasi Berhasil
                  </span>
                </div>

                {/* Academic Consultation Artwork Showcase */}
                <div className="relative w-full rounded-2xl overflow-hidden aspect-[4/3] bg-surface-container shadow-sm group">
                  <img
                    alt="Sesi bimbingan terverifikasi"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    src={STEP_3_ARTWORK}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-2 bg-surface/90 backdrop-blur-md rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">
                        verified
                      </span>
                      <span className="font-label-sm text-label-sm text-primary font-medium">
                        Bimbingan Terverifikasi FIPS-140-2
                      </span>
                    </div>
                    <span className="font-code-sm text-code-sm text-text-secondary">
                      E2EE • ACTIVE
                    </span>
                  </div>
                </div>

                {/* Headline & Academic Synopsis */}
                <div className="mt-6">
                  <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">
                    Bimbingan Skripsi Aman &amp; Terenkripsi Multi-Faktor
                  </h1>
                  <p className="font-body-md text-body-md text-text-secondary mt-2 leading-relaxed">
                    Brankas percakapan akademik dan dokumen bukti telah berhasil
                    dibuka melalui validasi tiga faktor (Kredensial Scrypt, USB
                    Dongle, dan Biometrik Wajah).
                  </p>
                </div>
              </div>

              {/* Cryptographic Trust Badges */}
              <div className="relative z-10 pt-6 mt-6 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm shadow-sm">
                  <span className="material-symbols-outlined text-[15px] text-tertiary-container">
                    shield
                  </span>
                  Enkripsi End-to-End Aktif
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm shadow-sm">
                  <span className="material-symbols-outlined text-[15px] text-tertiary-container">
                    vpn_key
                  </span>
                  AES-256 &amp; ChaCha20 Ready
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm shadow-sm">
                  <span className="material-symbols-outlined text-[15px] text-tertiary-container">
                    history_edu
                  </span>
                  Ledger Hash Sinkron
                </span>
              </div>
            </div>

            {/* RIGHT COLUMN (cols 7/12) - STEP 3 SUCCESS */}
            <div className="col-span-12 lg:col-span-7 bg-surface rounded-3xl p-8 md:p-10 shadow-sm border border-border-subtle text-center flex flex-col justify-center relative overflow-hidden self-stretch">
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-surface-container rounded-full blur-3xl pointer-events-none opacity-40" />

              {/* Top Stepper Progress Bar (All 3 Steps Completed) */}
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
                  Akses ke ruang bimbingan skripsi aman telah disetujui oleh
                  sistem gerbang kriptografi institusi.
                </p>
              </div>

              {/* User Account & Clearance Profile Card */}
              <div className="relative z-10 bg-surface-container-low rounded-2xl p-5 my-6 text-left flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-sm">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold font-headline-sm text-headline-sm shadow-sm ring-2 ring-primary-fixed">
                    {getInitials(successInfo?.user?.fullName || username)}
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
                      {successInfo?.user?.fullName || username}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-surface text-primary font-code-sm text-code-sm font-semibold shadow-xs">
                      ROLE: {(successInfo?.user?.role || role).toUpperCase()}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-text-secondary mt-0.5 truncate">
                    Akun: @{successInfo?.user?.username || username} • Dongle:{' '}
                    {successInfo?.user?.dongleId ||
                      authStatus?.activeDongle?.dongleId ||
                      'VERIFIED'}
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 pt-2">
                    <span className="w-2 h-2 rounded-full bg-tertiary-container" />
                    <span className="font-code-sm text-code-sm text-tertiary-container font-semibold">
                      Sesi Enkripsi Aktif
                    </span>
                    <span className="text-text-muted">•</span>
                    <span className="font-code-sm text-code-sm text-text-muted">
                      Kanal SkripsiChat Vault
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Audit Summary (Cryptographic Proof Matrix) */}
              <div className="relative z-10 bg-surface-bright rounded-2xl p-4 sm:p-5 text-left mb-6 shadow-sm border border-border-subtle">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">
                      verified_user
                    </span>
                    <span className="font-label-md text-label-md text-primary font-semibold">
                      Ringkasan Validasi Hardware Enclave
                    </span>
                  </div>
                  <span className="font-code-sm text-code-sm px-2 py-0.5 rounded bg-surface text-text-secondary">
                    AES-256-GCM / ChaCha20-Poly1305
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {/* Dongle Item */}
                  <div className="p-2.5 rounded-xl bg-surface flex flex-col justify-center shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm text-text-secondary flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-tertiary-container">
                          token
                        </span>
                        Dongle Serial Verified
                      </span>
                      <span className="font-code-sm text-code-sm text-tertiary-container font-semibold">
                        PASS
                      </span>
                    </div>
                    <p className="font-code-sm text-code-sm text-primary mt-1 truncate">
                      {successInfo?.user?.dongleId ||
                        authStatus?.activeDongle?.dongleId}{' '}
                      ({successInfo?.securityVerification?.dongleStatus || 'Valid'})
                    </p>
                  </div>

                  {/* Biometric Item */}
                  <div className="p-2.5 rounded-xl bg-surface flex flex-col justify-center shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm text-text-secondary flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-security-info">
                          face
                        </span>
                        Biometric Euclidean Dist.
                      </span>
                      <span className="font-code-sm text-code-sm text-security-info font-semibold">
                        {successInfo?.securityVerification
                          ?.biometricSimilarityPercent ?? similarityPct}
                        % MATCH
                      </span>
                    </div>
                    <p className="font-code-sm text-code-sm text-primary mt-1 truncate">
                      {successInfo?.securityVerification?.biometricDistance ??
                        faceVerify?.distance}{' '}
                      (Confidence acceptable)
                    </p>
                  </div>

                  {/* Password Hash Item */}
                  <div className="p-2.5 rounded-xl bg-surface flex flex-col justify-center shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm text-text-secondary flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-tertiary-container">
                          key
                        </span>
                        Password KDF Verification
                      </span>
                      <span className="font-code-sm text-code-sm text-tertiary-container font-semibold">
                        VERIFIED
                      </span>
                    </div>
                    <p className="font-code-sm text-code-sm text-tertiary font-medium mt-1 truncate">
                      {successInfo?.securityVerification?.passwordAlgorithm ||
                        'Scrypt + Salt 16-Byte'}
                    </p>
                  </div>

                  {/* Blockchain Session Hash */}
                  <div className="p-2.5 rounded-xl bg-surface flex flex-col justify-center shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm text-text-secondary flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-text-secondary">
                          hub
                        </span>
                        Blockchain Audit Ledger
                      </span>
                      <span className="font-code-sm text-code-sm text-tertiary-container font-semibold">
                        SYNCED
                      </span>
                    </div>
                    <p className="font-code-sm text-code-sm text-text-secondary mt-1 truncate font-mono">
                      SHA-256 PoW Chain Active
                    </p>
                  </div>
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
          </section>
        )}
      </main>

      {/* BOTTOM FOOTER */}
      <footer className="w-full bg-surface-container-low shadow-[0_-1px_8px_rgba(28,40,35,0.03)] py-space-lg">
        <div className="w-full px-margin md:px-margin-tablet lg:px-margin-desktop flex flex-col md:flex-row items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-primary text-[20px]">
              verified_user
            </span>
            <div className="flex flex-col text-left">
              <span className="font-label-sm text-label-sm text-primary font-semibold">
                SkripsiChat Cryptographic Boundary Active
              </span>
              <span className="font-body-sm text-body-sm text-text-secondary">
                © 2026 SkripsiChat. Protokol Bimbingan Skripsi Berintegritas
                Tinggi.
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-space-sm">
            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-surface text-text-secondary font-code-sm text-code-sm shadow-[0_1px_3px_0_rgba(28,40,35,0.04)]">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container" />
              <span>AES-256-GCM</span>
            </div>
            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-surface text-text-secondary font-code-sm text-code-sm shadow-[0_1px_3px_0_rgba(28,40,35,0.04)]">
              <span className="w-1.5 h-1.5 rounded-full bg-security-info" />
              <span>FIPS-140-2 Level 3</span>
            </div>
            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-surface text-text-secondary font-code-sm text-code-sm shadow-[0_1px_3px_0_rgba(28,40,35,0.04)]">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>ISO/IEC 27001 Certified</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
