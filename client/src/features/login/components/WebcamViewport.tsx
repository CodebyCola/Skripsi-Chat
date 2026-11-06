'use client';

import React from 'react';
import { FaceVerifyServerResult } from '../types/auth.types';

interface WebcamViewportProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraActive: boolean;
  verifyingFace: boolean;
  capturedPreviewUrl: string | null;
  faceVerify: FaceVerifyServerResult | null;
  isFaceMatched: boolean;
}

export function WebcamViewport({
  videoRef,
  cameraActive,
  verifyingFace,
  capturedPreviewUrl,
  faceVerify,
  isFaceMatched,
}: WebcamViewportProps) {
  return (
    <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-[#101915] flex items-center justify-center shadow-inner">
      {/* Live Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          cameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Snapshot Preview */}
      {!cameraActive && capturedPreviewUrl && (
        <img
          src={capturedPreviewUrl}
          alt="Frame wajah yang dipindai"
          className="absolute inset-0 w-full h-full object-cover opacity-75"
        />
      )}

      {/* Grid Overlay */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#88d6af 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />

      {/* Scanning Ray Animation */}
      <div
        className="absolute left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-transparent via-tertiary-fixed-dim to-transparent z-10 shadow-[0_0_12px_#88d6af] pointer-events-none"
        style={{ animation: 'scanRay 2.8s ease-in-out infinite' }}
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
            cameraActive || capturedPreviewUrl ? 'opacity-30' : 'opacity-75'
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          viewBox="0 0 100 120"
        >
          <ellipse cx="50" cy="58" rx="34" ry="46" strokeDasharray="3 3" />
          <path d="M30 46 C36 44 42 45 46 47" strokeWidth="1.5" />
          <path d="M54 47 C58 45 64 44 70 46" strokeWidth="1.5" />
          <circle cx="38" cy="52" fill="currentColor" r="3" />
          <circle cx="62" cy="52" fill="currentColor" r="3" />
          <path d="M50 52 L50 68 L45 72 L55 72" />
          <path d="M36 84 C43 90 57 90 64 84" strokeWidth="1.5" />
          <circle cx="50" cy="22" fill="#a4f3ca" r="1.5" />
          <circle cx="50" cy="98" fill="#a4f3ca" r="1.5" />
          <circle cx="20" cy="58" fill="#a4f3ca" r="1.5" />
          <circle cx="80" cy="58" fill="#a4f3ca" r="1.5" />
        </svg>
      </div>

      {/* Bottom HUD Coordinates */}
      <div className="absolute bottom-2.5 left-3 right-3 z-20 flex items-center justify-between font-code-sm text-code-sm text-primary-fixed-dim/85 px-1 pointer-events-none">
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
  );
}
