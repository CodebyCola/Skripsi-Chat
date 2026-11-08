'use client';

import React, { useState } from 'react';
import { IssuableAssetType, StudentOption } from '../types/blockchain.types';
import { ASSET_TYPE_LABEL, MAX_DOC_MB } from '../utils';
import { IssueInput } from '../hooks/useAssets';

// Ref: FR-CHAIN-02/03 — dosen menerbitkan aset; penandatangan diambil server dari sesi
const TYPES: IssuableAssetType[] = ['THESIS_ACC', 'GRADE', 'CERTIFICATE', 'DIPLOMA'];

interface IssueAssetFormProps {
  students: StudentOption[];
  issuing: boolean;
  onSubmit: (input: IssueInput) => Promise<boolean>;
}

const FIELD =
  'h-9 w-full rounded-lg border border-sage-border bg-surface px-2.5 text-xs text-text-dark focus:border-primary focus:outline-none disabled:opacity-40';

export function IssueAssetForm({ students, issuing, onSubmit }: IssueAssetFormProps) {
  const [assetType, setAssetType] = useState<IssuableAssetType>('THESIS_ACC');
  const [studentId, setStudentId] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);

  const ready = !!studentId && title.trim().length > 0 && !!file && !issuing;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || !file) return;
    const ok = await onSubmit({ assetType, studentId, title, file });
    if (ok) {
      setTitle('');
      setFile(null);
      setFileKey((k) => k + 1); // kosongkan input berkas
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-sage-border rounded-xl p-5 shadow-xs space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="asset-type" className="block text-[11px] font-medium text-text-secondary mb-1">Tipe aset</label>
          <select id="asset-type" value={assetType} onChange={(e) => setAssetType(e.target.value as IssuableAssetType)} className={FIELD}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{ASSET_TYPE_LABEL[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="asset-student" className="block text-[11px] font-medium text-text-secondary mb-1">Mahasiswa bimbingan</label>
          <select id="asset-student" value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={students.length === 0} className={FIELD}>
            <option value="">{students.length === 0 ? 'Belum ada mahasiswa bimbingan' : 'Pilih mahasiswa…'}</option>
            {students.map((s) => (
              <option key={s.username} value={s.username}>{s.fullName} — {s.topic}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="asset-title" className="block text-[11px] font-medium text-text-secondary mb-1">Judul aset</label>
        <input
          id="asset-title"
          type="text"
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="mis. Lembar Pengesahan Sidang Skripsi"
          className={FIELD}
        />
      </div>

      <div>
        <label htmlFor="asset-file" className="block text-[11px] font-medium text-text-secondary mb-1">Dokumen</label>
        <input
          key={fileKey}
          id="asset-file"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-xs text-text-secondary file:mr-3 file:h-8 file:px-3 file:rounded-lg file:border file:border-sage-border file:bg-surface file:text-xs file:text-text-dark hover:file:bg-canvas"
        />
        <p className="mt-1 text-[11px] text-text-muted">
          Maksimal {MAX_DOC_MB} MB. Hanya hash SHA-256 dokumen yang dicatat di blockchain, bukan isinya.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!ready}
          className="h-8 px-3.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">draw</span>
          Terbitkan &amp; Tandatangani
        </button>
        {issuing && (
          <p role="status" className="flex items-center gap-1.5 text-xs text-security-info">
            <span className="material-symbols-outlined text-base" aria-hidden="true">hourglass_top</span>
            Menandatangani dan menambang blok…
          </p>
        )}
      </div>
    </form>
  );
}