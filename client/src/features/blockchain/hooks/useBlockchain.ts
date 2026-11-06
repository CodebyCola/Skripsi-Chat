'use client';

import { useEffect, useState } from 'react';
import {
  fetchBlockchain,
  restoreBlockchain,
  tamperBlockchainBlock,
} from '../api/blockchainApi';
import { BlockchainData } from '../types/blockchain.types';

export function useBlockchain() {
  const [data, setData] = useState<BlockchainData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function loadChain() {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetchBlockchain();
      setData(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat rantai blockchain');
    } finally {
      setLoading(false);
    }
  }

  async function tamperBlock(index: number = 1) {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await tamperBlockchainBlock(index);
      setData(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mensimulasikan manipulasi blok');
    } finally {
      setLoading(false);
    }
  }

  async function restoreChain() {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await restoreBlockchain();
      setData(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memulihkan integritas rantai');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChain();
  }, []);

  return {
    data,
    loading,
    errorMsg,
    loadChain,
    tamperBlock,
    restoreChain,
  };
}
