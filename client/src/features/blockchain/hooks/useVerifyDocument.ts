'use client';

import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { verifyDocument } from '../api/blockchainApi';
import { VerificationResult } from '../types/blockchain.types';
import { readAsDataUrl, validateDocument } from '../utils';

// Ref: FR-CHAIN-05 — semua peran dapat memverifikasi dokumen dengan mengunggahnya
export function useVerifyDocument() {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  async function verify(file: File) {
    setResult(null);
    setError('');
    setFileName(file.name);
    const invalid = validateDocument(file);
    if (invalid) return setError(invalid);

    setVerifying(true);
    try {
      setResult(await verifyDocument(await readAsDataUrl(file)));
    } catch (e) {
      if (!(e instanceof ApiError && e.code === 'ERR_SESSION_EXPIRED')) {
        setError(e instanceof Error ? e.message : 'Gagal memverifikasi dokumen');
      }
    } finally {
      setVerifying(false);
    }
  }

  return { result, fileName, verifying, error, verify, clearError: () => setError('') };
}