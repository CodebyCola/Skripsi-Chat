'use client';

import React, { useCallback, useState } from 'react';
import {
  DongleStatus,
  type ClientAuthCheckState,
} from '../components/DongleStatus';
import {
  WebcamCapture,
  type FaceVerifyServerResult,
} from '../components/WebcamCapture';
import { apiRequest, SERVER_CONSOLE_URL } from '../lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('editor_aegis');
  const [password, setPassword] = useState('Aegis2026!');
  const [authStatus, setAuthStatus] = useState<ClientAuthCheckState | null>(null);
  const [faceVerify, setFaceVerify] = useState<FaceVerifyServerResult | null>(
    null
  );
  const [verifiedDescriptor, setVerifiedDescriptor] = useState<number[] | null>(
    null
  );

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successInfo, setSuccessInfo] = useState<any>(null);

  const handleStatusChange = useCallback((nextState: ClientAuthCheckState) => {
    setAuthStatus(nextState);
  }, []);

  const handleFaceVerified = useCallback(
    (res: FaceVerifyServerResult | null, desc: number[] | null) => {
      setFaceVerify(res);
      setVerifiedDescriptor(desc);
    },
    []
  );

  const isDongleActiveAndValid = Boolean(
    authStatus?.serverOnline &&
      authStatus?.dongleDetected &&
      authStatus?.dongleMatchesUser
  );
  const isFaceMatched = Boolean(faceVerify?.matched && verifiedDescriptor);
  const canSubmitLogin =
    isDongleActiveAndValid && isFaceMatched && Boolean(password) && !loading;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessInfo(null);

    if (!isDongleActiveAndValid) {
      setErrorMsg(
        'AKSES DITOLAK: Hardware Dongle belum aktif atau tidak sesuai dengan username ini!'
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
      const res = await apiRequest('/api/auth/login', 'POST', {
        username,
        password,
        faceDescriptor: verifiedDescriptor,
      });

      setSuccessInfo(res);
      localStorage.setItem('aegis_user', JSON.stringify(res.user));

      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login gagal.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 820, margin: '36px auto', padding: '0 20px 48px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 25, fontWeight: 800, marginBottom: 6 }}>
          🛡️ AegisVault — Portal Login Multi-Faktor Kriptografi
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 13.5 }}>
          Client mengecek status <strong>Hardware Dongle</strong> &amp;{' '}
          <strong>Kecocokan Biometrik Wajah</strong> secara langsung ke Server.
          Pengaturan aktivasi dongle &amp; perekaman wajah dilakukan di{' '}
          <a
            href={SERVER_CONSOLE_URL}
            target="_blank"
            rel="noreferrer"
            style={{ color: '#38bdf8', fontWeight: 600 }}
          >
            Server Console ({SERVER_CONSOLE_URL})
          </a>
          .
        </p>
      </div>

      {/* 1. PENGECEKAN DONGLE DARI SERVER */}
      <div style={{ marginBottom: 18 }}>
        <DongleStatus username={username} onStatusChange={handleStatusChange} />
      </div>

      {authStatus?.serverOnline &&
        authStatus?.userExists &&
        !authStatus?.hasFacePhoto && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid #f59e0b',
              color: '#fde68a',
              fontSize: 13,
              marginBottom: 18,
            }}
          >
            💡 <strong>Info Biometrik:</strong> Akun{' '}
            <code>@{username}</code> belum merekam foto wajah asli di Server.
            Silakan buka{' '}
            <a
              href={SERVER_CONSOLE_URL}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#38bdf8', fontWeight: 700 }}
            >
              Server Console ({SERVER_CONSOLE_URL})
            </a>{' '}
            untuk merekam &amp; menyimpan wajah Anda terlebih dahulu!
          </div>
        )}

      {errorMsg && (
        <div
          style={{
            padding: '13px 16px',
            borderRadius: 10,
            background: 'rgba(239,68,68,0.14)',
            border: '1px solid #ef4444',
            color: '#fca5a5',
            fontSize: 13.5,
            marginBottom: 18,
          }}
        >
          🚨 {errorMsg}
        </div>
      )}

      {successInfo && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 10,
            background: 'rgba(16,185,129,0.14)',
            border: '1px solid #10b981',
            color: '#6ee7b7',
            fontSize: 13.5,
            marginBottom: 18,
          }}
        >
          ✅ <strong>Otentikasi Berhasil! Masuk ke Dashboard Vault...</strong>
          <div style={{ fontSize: 12.5, marginTop: 4, color: '#d1fae5' }}>
            • Dongle: {successInfo.securityVerification.dongleStatus} | Wajah:{' '}
            {successInfo.securityVerification.biometricSimilarityPercent}% | Hash:{' '}
            {successInfo.securityVerification.passwordAlgorithm}
          </div>
        </div>
      )}

      <form
        onSubmit={handleLogin}
        style={{
          background: '#111827',
          padding: 24,
          borderRadius: 14,
          border: '1px solid #334155',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 14,
          }}
        >
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: '#cbd5e1' }}>
              Username Akun Investigator
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="editor_aegis"
              required
            />
          </div>
          <div>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: '#cbd5e1' }}>
              Password (Scrypt + Salt 16-Byte)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password akun"
              required
            />
          </div>
        </div>

        {/* 2. VERIFIKASI WAJAH KE SERVER */}
        <div style={{ marginTop: 10 }}>
          <label
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: '#cbd5e1',
              display: 'block',
              marginBottom: 6,
            }}
          >
            Verifikasi Biometrik Wajah terhadap Data Wajah di Server
          </label>
          <WebcamCapture
            username={username}
            onFaceVerified={handleFaceVerified}
          />
        </div>

        {/* 3. RINGKASAN SYARAT OTENTIKASI DARI SERVER */}
        <div
          style={{
            margin: '18px 0',
            padding: 14,
            borderRadius: 10,
            background: '#090d16',
            border: '1px solid #1e293b',
            fontSize: 13,
          }}
        >
          <strong style={{ display: 'block', marginBottom: 6, color: '#e2e8f0' }}>
            Status Verifikasi Multi-Faktor (Client &harr; Server):
          </strong>
          <div
            style={{
              color: isDongleActiveAndValid ? '#34d399' : '#f87171',
              marginBottom: 4,
            }}
          >
            {isDongleActiveAndValid
              ? `✔ 1. USB Hardware Dongle: AKTIF & Milik @${username}`
              : '✖ 1. USB Hardware Dongle: Belum Aktif / Tidak Sesuai'}
          </div>
          <div
            style={{
              color: isFaceMatched ? '#34d399' : '#f87171',
              marginBottom: 4,
            }}
          >
            {isFaceMatched
              ? `✔ 2. Biometrik Wajah: SESUAI (${faceVerify?.similarityPercent}% Match)`
              : '✖ 2. Biometrik Wajah: Belum Diverifikasi / Tidak Sesuai'}
          </div>
          <div style={{ color: password ? '#34d399' : '#f87171' }}>
            {password
              ? '✔ 3. Kredensial Password: Siap Diverifikasi (Scrypt + Salt)'
              : '✖ 3. Kredensial Password: Wajib Diisi'}
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmitLogin}
          style={{
            width: '100%',
            padding: 13,
            fontSize: 14.5,
            fontWeight: 700,
            borderRadius: 10,
            background: canSubmitLogin ? '#059669' : '#334155',
            cursor: canSubmitLogin ? 'pointer' : 'not-allowed',
          }}
        >
          {loading
            ? 'Memproses Login ke Server...'
            : !isDongleActiveAndValid
            ? '🔒 TERKUNCI: AKTIFKAN USB DONGLE DI SERVER DAHULU'
            : !isFaceMatched
            ? '🔒 TERKUNCI: SCAN & COCOKKAN WAJAH KE SERVER DAHULU'
            : '🚀 LOGIN SEKARANG (DONGLE AKTIF + WAJAH SESUAI)'}
        </button>
      </form>
    </main>
  );
}
