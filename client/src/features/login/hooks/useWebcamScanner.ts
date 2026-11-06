"use client"
import { useCallback, useEffect, useRef, useState } from 'react';
import { extractBiometricDescriptorFromCanvas } from '@/lib/biometric';
import { verifyFaceWithServer } from '../api/authApi';
import { FaceVerifyServerResult } from '../types/auth.types';

export function useWebcamScanner(username: string) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [verifyingFace, setVerifyingFace] = useState(false);
  const [faceErrorText, setFaceErrorText] = useState('');
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [insecureOriginUrl, setInsecureOriginUrl] = useState<string | null>(null);

  const [faceVerify, setFaceVerify] = useState<FaceVerifyServerResult | null>(null);
  const [verifiedDescriptor, setVerifiedDescriptor] = useState<number[] | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Deteksi bila URL dibuka via non-localhost tanpa HTTPS
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

  // Cleanup kamera saat unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Reset verifikasi bila username berganti
  useEffect(() => {
    setFaceVerify(null);
    setVerifiedDescriptor(null);
    setCapturedPreviewUrl(null);
    setFaceErrorText('');
  }, [username]);

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
        `Tidak bisa membuka webcam (${err.message}). Pastikan kamera tidak sedang dipakai tab Server atau gunakan Upload Foto.`
      );
    }
  }

  async function verifyCanvas(canvas: HTMLCanvasElement) {
    setFaceErrorText('');
    setVerifyingFace(true);
    try {
      const descriptor = extractBiometricDescriptorFromCanvas(canvas);
      const serverCheck = await verifyFaceWithServer(username, descriptor);

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

  async function scanFromWebcam() {
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
    await verifyCanvas(canvas);
  }

  function uploadPhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
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
        await verifyCanvas(canvas);
      };
      img.src = String(ev.target?.result || '');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return {
    videoRef,
    canvasRef,
    cameraActive,
    verifyingFace,
    faceErrorText,
    capturedPreviewUrl,
    insecureOriginUrl,
    faceVerify,
    verifiedDescriptor,
    isFaceMatched: Boolean(faceVerify?.matched && verifiedDescriptor),
    startCamera,
    stopCamera,
    scanFromWebcam,
    uploadPhotoFile,
  };
}
