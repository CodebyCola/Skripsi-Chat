'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { useToast } from '@/components/ui';
import {
  fetchBlockchain,
  restoreBlockchain,
  tamperBlockchainBlock,
} from '../api/blockchainApi';
import { BlockchainData } from '../types/blockchain.types';

// Ref: FR-CHAIN-04 (validasi rantai), FR-CHAIN-07 (tamper demo, admin)
export function useBlockchain() {
  const toast = useToast();
  const [data, setData] = useState<BlockchainData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sesi habis ditampilkan oleh SessionExpiredBanner (event dari lib/api); di sini cukup diam.
  const fail = useCallback((e: unknown, fallback: string) => {
    if (e instanceof ApiError && e.code === 'ERR_SESSION_EXPIRED') return;
    setErrorMsg(e instanceof Error ? e.message : fallback);
  }, []);

  const loadChain = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      setData(await fetchBlockchain());
    } catch (e) {
      fail(e, 'Gagal memuat rantai blockchain');
    } finally {
      setLoading(false);
    }
  }, [fail]);

  async function tamperBlock(index: number = 1) {
    setLoading(true);
    setErrorMsg('');
    try {
      setData(await tamperBlockchainBlock(index));
      toast.show(`Blok #${index} dimanipulasi (simulasi)`, 'info');
    } catch (e) {
      fail(e, 'Gagal mensimulasikan manipulasi blok');
    } finally {
      setLoading(false);
    }
  }

  async function restoreChain() {
    setLoading(true);
    setErrorMsg('');
    try {
      setData(await restoreBlockchain());
      toast.show('Integritas rantai dipulihkan', 'success');
    } catch (e) {
      fail(e, 'Gagal memulihkan integritas rantai');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChain();
  }, [loadChain]);

  return {
    data,
    loading,
    errorMsg,
    clearError: () => setErrorMsg(''),
    loadChain,
    tamperBlock,
    restoreChain,
  };
}