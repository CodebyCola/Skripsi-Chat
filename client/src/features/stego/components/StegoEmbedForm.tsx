'use client';

import React from 'react';
import { SecurityPill } from '@/components/ui';

interface StegoEmbedFormProps {
  title: string;
  onTitleChange: (val: string) => void;
  note: string;
  onNoteChange: (val: string) => void;
  coverPngBase64?: string;
  coverDimensions: { width: number; height: number };
  maxCapacityBytes: number;
  notePayloadBytes: number;
  isCapacityExceeded: boolean;
  onSelectCover: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetCover: () => void;
  loading: boolean;
  disabled?: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

const labelCls = 'block text-[11px] font-medium text-text-secondary mb-1.5';
const inputCls =
  'w-full rounded-lg border border-sage-border bg-canvas px-3 py-2 text-xs text-text-dark placeholder-text-muted focus:border-primary focus:bg-surface focus:outline-none transition';

export function StegoEmbedForm({
  title,
  onTitleChange,
  note,
  onNoteChange,
  coverPngBase64,
  coverDimensions,
  maxCapacityBytes,
  notePayloadBytes,
  isCapacityExceeded,
  onSelectCover,
  onResetCover,
  loading,
  disabled,
  onSubmit,
}: StegoEmbedFormProps) {
  const percentUsed = Math.min(
    100,
    Math.round((notePayloadBytes / Math.max(1, maxCapacityBytes)) * 100)
  );

  return (
    <form
      onSubmit={onSubmit}
      className="bg-surface border border-sage-border rounded-xl p-5 shadow-xs space-y-4"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-sage-border pb-3">
        <div>
          <h2 className="text-xs font-semibold text-text-dark">Unggah Foto Dokumen & Sisipkan Catatan</h2>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Penyisipan LSB (Least Significant Bit) pada kanal RGB citra PNG lossless.
          </p>
        </div>
        <SecurityPill tone="valid" icon="enhanced_encryption">
          Subkey k_stego (HKDF + AES-256-GCM)
        </SecurityPill>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Kolom Kiri: Judul dan Gambar Cover */}
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Judul Foto Dokumen / Bukti</label>
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Contoh: Scan Bukti Observasi 01"
              required
              disabled={disabled || loading}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>
              Gambar Penampung (Cover Image)
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={onSelectCover}
                disabled={disabled || loading}
                className="block flex-1 text-xs text-text-secondary file:mr-2.5 file:h-8 file:px-3 file:rounded-lg file:border file:border-sage-border file:bg-surface file:text-xs file:font-medium file:text-text-dark hover:file:bg-canvas file:cursor-pointer"
              />
              {coverPngBase64 && (
                <button
                  type="button"
                  onClick={onResetCover}
                  disabled={disabled || loading}
                  className="h-8 px-2.5 rounded-lg border border-sage-border text-[11px] text-text-secondary hover:text-text-dark hover:bg-canvas transition"
                >
                  Reset Cover
                </button>
              )}
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              {coverPngBase64
                ? 'Gambar khusus dipilih (dikonversi ke PNG Lossless)'
                : 'Kosongkan untuk menggunakan sampel citra PNG otomatis (320x240 px)'}
            </p>
          </div>

          {/* Kapasitas Citra Meter */}
          <div className="rounded-lg border border-sage-border bg-canvas/70 p-3 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-text-secondary font-medium">Resolusi Cover:</span>
              <span className="font-mono text-text-dark font-semibold">
                {coverDimensions.width} x {coverDimensions.height} px
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-text-secondary font-medium">Kapasitas Maksimum LSB:</span>
              <span className="font-mono text-text-dark font-semibold">
                {maxCapacityBytes.toLocaleString('id-ID')} byte
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-text-secondary font-medium">Ukuran Payload Terenkripsi:</span>
              <span
                className={`font-mono font-semibold ${
                  isCapacityExceeded ? 'text-red-600' : 'text-primary'
                }`}
              >
                {notePayloadBytes.toLocaleString('id-ID')} byte ({percentUsed}%)
              </span>
            </div>

            {/* Progress bar kapasitas */}
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isCapacityExceeded ? 'bg-red-500' : 'bg-primary'
                }`}
                style={{ width: `${percentUsed}%` }}
              />
            </div>

            {isCapacityExceeded && (
              <p className="text-[11px] text-red-600 font-medium">
                Peringatan: Ukuran catatan melebihi batas kapasitas LSB citra. Harap ringkas catatan atau gunakan citra dengan resolusi lebih tinggi.
              </p>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Catatan Rahasia yang Disisipkan */}
        <div className="space-y-3 flex flex-col justify-between">
          <div>
            <label className={labelCls}>
              Catatan Rahasia yang Disematkan ke LSB (AES-256-GCM)
            </label>
            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Tuliskan catatan rahasia bimbingan, koordinat riset, atau keterangan dokumen yang hanya dapat dibaca oleh pembimbing/mahasiswa..."
              rows={6}
              required
              disabled={disabled || loading}
              className={`${inputCls} resize-none leading-relaxed`}
            />
          </div>

          <div className="rounded-lg bg-sage-tint/40 border border-sage-border p-3 text-[11px] text-text-secondary space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-text-dark">
              <span className="material-symbols-outlined text-sm text-primary">lock</span>
              <span>Proteksi Kriptografi Otomatis</span>
            </div>
            <p>
              Kunci enkripsi diturunkan langsung dari percakapan bimbingan aktif (<code className="font-mono text-text-dark">k_stego</code>). Tidak memerlukan kata sandi manual, dan pihak di luar percakapan tidak dapat mengekstrak pesan.
            </p>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={disabled || loading || isCapacityExceeded || !note.trim()}
              className="w-full h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-base">
                {loading ? 'hourglass_top' : 'enhanced_encryption'}
              </span>
              <span>
                {loading ? 'Memproses Penyisipan LSB...' : 'Sisipkan ke LSB PNG & Kirim'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
