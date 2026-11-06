'use client';

import React, { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../lib/api';
import { extractBiometricDescriptorFromCanvas } from '../lib/biometric';

export interface FaceVerifyServerResult {
  username: string;
  matched: boolean;
  distance: number;
  similarityPercent: number;
  threshold: number;
  hasCustomFacePhoto: boolean;
  message: string;
}

export function WebcamCapture({
  username,
  onFaceVerified,
}: {
  username: string;
  onFaceVerified: (
    result: FaceVerifyServerResult | null,
    descriptor: number[] | null
  ) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [insecureOriginUrl, setInsecureOriginUrl] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<FaceVerifyServerResult | null>(
    null
  );
  const [errorText, setErrorText] = useState('');

  // Cek apakah dibuka melalui IP non-localhost (misal 192.168.x.x) yang memblokir kamera browser
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

  // Reset status verifikasi wajah apabila username diganti
  useEffect(() => {
    setVerifyResult(null);
    onFaceVerified(null, null);
  }, [username]);

  // Bersihkan kamera saat pindah halaman
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  async function startCamera() {
    setErrorText('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'Browser memblokir akses kamera pada alamat IP ini. Buka melalui http://localhost:3000 atau gunakan tombol Upload Foto Wajah.'
        );
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      setErrorText(
        `Tidak bisa membuka webcam (${err.message}). Pastikan kamera tidak sedang dipakai tab Server (:4000) atau gunakan Upload Foto.`
      );
    }
  }

  async function verifyCanvasAgainstServer(canvas: HTMLCanvasElement) {
    setErrorText('');
    setVerifying(true);
    try {
      const descriptor = extractBiometricDescriptorFromCanvas(canvas);
      const ctx = canvas.getContext('2d');

      const serverCheck = await apiRequest<FaceVerifyServerResult>(
        '/api/auth/verify-face',
        'POST',
        {
          username,
          faceDescriptor: descriptor,
        }
      );

      if (ctx) {
        ctx.strokeStyle = serverCheck.matched ? '#10b981' : '#ef4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(80, 22, 160, 176);
      }

      setVerifyResult(serverCheck);
      onFaceVerified(serverCheck, serverCheck.matched ? descriptor : null);
    } catch (err: any) {
      setVerifyResult(null);
      onFaceVerified(null, null);
      setErrorText(err.message || 'Gagal memverifikasi wajah ke Server');
    } finally {
      setVerifying(false);
    }
  }

  async function scanAndVerifyFromCamera() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (!cameraActive || video.videoWidth === 0) {
      setErrorText('Nyalakan kamera terlebih dahulu dan tunggu gambar video muncul!');
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
  }

  return (
    <div
      style={{
        border: '1px solid #334155',
        borderRadius: 12,
        padding: 16,
        background: '#070b14',
      }}
    >
      {insecureOriginUrl && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: 'rgba(245,158,11,0.14)',
            border: '1px solid #f59e0b',
            color: '#fde68a',
            fontSize: 12.5,
            marginBottom: 12,
          }}
        >
          ⚠️ Anda membuka Client melalui IP jaringan sehingga browser menonaktifkan akses Webcam langsung.{' '}
          <a
            href={insecureOriginUrl}
            style={{ color: '#38bdf8', fontWeight: 700, textDecoration: 'underline' }}
          >
            Klik di sini untuk beralih ke {insecureOriginUrl}
          </a>{' '}
          atau gunakan tombol <strong>Upload Foto Wajah</strong> di bawah.
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        {/* LIVE WEBCAM FEED DENGAN KOTAK PANDUAN */}
        <div
          style={{
            position: 'relative',
            width: 260,
            height: 185,
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid #334155',
            background: '#000',
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: cameraActive ? 1 : 0.25,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '25%',
              top: '10%',
              width: '50%',
              height: '80%',
              border: '2px dashed #38bdf8',
              borderRadius: 14,
              pointerEvents: 'none',
            }}
          />
          {!cameraActive && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: '#94a3b8',
                padding: 12,
                textAlign: 'center',
              }}
            >
              Kamera Belum Aktif
            </div>
          )}
        </div>

        {/* HASIL TANGKAPAN FRAME YANG DIKIRIM KE SERVER */}
        <canvas
          ref={canvasRef}
          width={320}
          height={220}
          style={{
            width: 260,
            height: 185,
            borderRadius: 8,
            border: '1px solid #334155',
            background: '#090d16',
          }}
        />
      </div>

      {/* TOMBOL AKSI SCAN WAJAH */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginTop: 14,
        }}
      >
        <button
          type="button"
          onClick={startCamera}
          style={{ background: '#1e293b', border: '1px solid #334155' }}
        >
          🎥 {cameraActive ? 'Restart Kamera' : '1. Buka Kamera Client'}
        </button>

        <button
          type="button"
          disabled={!cameraActive || verifying}
          onClick={scanAndVerifyFromCamera}
          style={{ background: '#0284c7' }}
        >
          {verifying
            ? '⏳ Memverifikasi ke Server...'
            : '📸 2. Scan & Cek Wajah ke Server'}
        </button>

        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '9px 14px',
            borderRadius: 8,
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#e2e8f0',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🖼️ Upload Foto Wajah
          <input
            type="file"
            accept="image/*"
            onChange={handleUploadFaceFile}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* HASIL VERIFIKASI DARI SERVER */}
      {errorText && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 12px',
            borderRadius: 8,
            background: 'rgba(239,68,68,0.14)',
            border: '1px solid #ef4444',
            color: '#fca5a5',
            fontSize: 12.5,
          }}
        >
          ❌ {errorText}
        </div>
      )}

      {verifyResult && (
        <div
          style={{
            marginTop: 12,
            padding: '11px 14px',
            borderRadius: 8,
            background: verifyResult.matched
              ? 'rgba(16,185,129,0.14)'
              : 'rgba(239,68,68,0.14)',
            border: `1px solid ${verifyResult.matched ? '#10b981' : '#ef4444'}`,
            color: verifyResult.matched ? '#6ee7b7' : '#fca5a5',
            fontSize: 12.5,
          }}
        >
          <strong>
            {verifyResult.matched
              ? `✅ BIOMETRIK COCOK (${verifyResult.similarityPercent}% | Jarak Euclidean: ${verifyResult.distance})`
              : `❌ BIOMETRIK DITOLAK (${verifyResult.similarityPercent}% | Jarak Euclidean: ${verifyResult.distance} > ${verifyResult.threshold})`}
          </strong>
          <div style={{ marginTop: 3, color: '#e2e8f0' }}>
            {verifyResult.message}
          </div>
        </div>
      )}
    </div>
  );
}
