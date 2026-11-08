'use client';

import React from 'react';

// Ref: FR-FILE-01 — hanya PDF/DOCX; kunci enkripsi diturunkan server dari kunci percakapan
interface FileUploadCardProps {
  disabled?: boolean;
  uploading: boolean;
  onSelect: (file: File) => void;
}

export function FileUploadCard({ disabled, uploading, onSelect }: FileUploadCardProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // izinkan memilih berkas yang sama lagi
    if (file) onSelect(file);
  }

  return (
    <div className="bg-surface border border-sage-border rounded-xl p-5 shadow-xs space-y-3">
      <div>
        <label htmlFor="file-upload" className="block text-[11px] font-medium text-text-secondary mb-1">
          Unggah naskah atau berkas bimbingan
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".pdf,.docx"
          onChange={handleChange}
          disabled={disabled || uploading}
          className="block w-full text-xs text-text-secondary file:mr-3 file:h-8 file:px-3 file:rounded-lg file:border file:border-sage-border file:bg-surface file:text-xs file:text-text-dark hover:file:bg-canvas disabled:opacity-40"
        />
      </div>
      <p className="text-[11px] text-text-muted">
        PDF atau DOCX, maksimal 25 MB. Berkas dienkripsi ChaCha20-Poly1305 sebelum disimpan; nama yang sama
        otomatis menjadi versi berikutnya.
      </p>
      {uploading && (
        <p role="status" className="flex items-center gap-1.5 text-xs text-security-info">
          <span className="material-symbols-outlined text-base" aria-hidden="true">hourglass_top</span>
          Mengenkripsi dan menyimpan berkas…
        </p>
      )}
    </div>
  );
}
