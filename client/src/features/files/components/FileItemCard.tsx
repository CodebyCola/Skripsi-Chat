'use client';

import React, { useState } from 'react';
import { EncryptedFileRecord } from '../types/files.types';

interface FileItemCardProps {
  file: EncryptedFileRecord;
  onDecrypt: (id: number) => void;
  onReview?: (id: number, status: 'SUBMITTED' | 'REVISION' | 'APPROVED', note: string) => void;
  isLecturer?: boolean;
}

export function FileItemCard({
  file,
  onDecrypt,
  onReview,
  isLecturer = false,
}: FileItemCardProps) {
  const [showReviewInput, setShowReviewInput] = useState(false);
  const [reviewNote, setReviewNote] = useState(file.reviewNote || '');

  const status = file.status || 'SUBMITTED';

  return (
    <div className="p-4 rounded-xl bg-surface border border-sage-border shadow-xs flex flex-col gap-3 mb-3 hover:border-primary/40 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-sage-tint border border-sage-border flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-2xl">description</span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-xs text-text-dark truncate">
                {file.originalName}
              </h3>
              <span className="text-[10px] font-mono text-text-muted px-1.5 py-0.2 rounded border border-sage-border bg-canvas">
                v{file.version || 1}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-text-secondary mt-0.5">
              <span>{(file.sizeBytes / 1024).toFixed(1)} KB</span>
              <span>&bull;</span>
              <span>{file.mimeType}</span>
              {file.createdAt && (
                <>
                  <span>&bull;</span>
                  <span>{new Date(file.createdAt).toLocaleDateString('id-ID')}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* STATUS BADGE */}
        <div className="flex items-center gap-1.5 shrink-0">
          {status === 'APPROVED' && (
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">verified</span>
              <span>Disetujui (ACC)</span>
            </span>
          )}
          {status === 'REVISION' && (
            <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">rate_review</span>
              <span>Perlu Revisi</span>
            </span>
          )}
          {status === 'SUBMITTED' && (
            <span className="text-[10px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">schedule</span>
              <span>Menunggu Review</span>
            </span>
          )}
        </div>
      </div>

      {/* CRYPTOGRAPHIC INTEGRITY METADATA */}
      <div className="p-2.5 rounded-lg bg-canvas border border-sage-border flex flex-col gap-1 text-[10px] font-mono text-text-secondary">
        <div className="flex items-center justify-between">
          <span>Integritas SHA-256 Asli:</span>
          <span className="text-text-dark font-medium">{file.originalSha256}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>ChaCha20 Nonce (96-bit) &amp; Poly1305 Tag:</span>
          <span>
            Nonce: {file.nonceHex?.slice(0, 16)}... | Tag: {file.authTagHex?.slice(0, 16)}...
          </span>
        </div>
      </div>

      {/* REVIEW NOTE (IF PRESENT) */}
      {file.reviewNote && (
        <div className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-200 text-xs text-text-dark flex items-start gap-2">
          <span className="material-symbols-outlined text-sm text-amber-800 mt-0.5">
            notes
          </span>
          <div>
            <span className="font-semibold text-amber-900 text-[11px]">
              Catatan Dosen Pembimbing ({file.reviewedBy || 'Dosen'}):
            </span>
            <p className="text-[11px] text-text-secondary mt-0.5">{file.reviewNote}</p>
          </div>
        </div>
      )}

      {/* REVIEW FORM COLLAPSIBLE */}
      {showReviewInput && onReview && (
        <div className="p-3 rounded-lg bg-canvas border border-sage-border flex flex-col gap-2">
          <textarea
            rows={2}
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Tulis catatan telaah draf skripsi..."
            className="w-full text-xs p-2 rounded border border-sage-border bg-surface text-text-dark focus:outline-none focus:border-primary"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowReviewInput(false)}
              className="h-7 px-2.5 rounded text-xs text-text-secondary hover:bg-surface border border-transparent"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                onReview(file.id, 'REVISION', reviewNote);
                setShowReviewInput(false);
              }}
              className="h-7 px-3 rounded text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100"
            >
              Minta Revisi
            </button>
            <button
              type="button"
              onClick={() => {
                onReview(file.id, 'APPROVED', reviewNote);
                setShowReviewInput(false);
              }}
              className="h-7 px-3 rounded text-xs font-medium text-white bg-primary hover:bg-primary-hover"
            >
              Setujui (ACC)
            </button>
          </div>
        </div>
      )}

      {/* ACTIONS */}
      <div className="flex items-center justify-between pt-1 border-t border-sage-border">
        <span className="text-[10px] font-mono text-text-muted">
          Penyimpanan: server/uploads/*.enc
        </span>

        <div className="flex items-center gap-2">
          {onReview && (
            <button
              type="button"
              onClick={() => setShowReviewInput((s) => !s)}
              className="h-8 px-3 rounded-lg border border-sage-border bg-surface hover:bg-canvas text-text-dark text-xs font-medium flex items-center gap-1.5 transition"
            >
              <span className="material-symbols-outlined text-sm">rate_review</span>
              <span>Telaah Dosen</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onDecrypt(file.id)}
            className="h-8 px-3 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span>Dekripsi &amp; Unduh</span>
          </button>
        </div>
      </div>
    </div>
  );
}
