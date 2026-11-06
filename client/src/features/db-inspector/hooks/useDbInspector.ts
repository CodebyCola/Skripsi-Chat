'use client';

import { useEffect, useState } from 'react';
import { fetchDbInspectorData } from '../api/dbInspectorApi';
import { DbInspectorData } from '../types/dbInspector.types';

export function useDbInspector() {
  const [data, setData] = useState<DbInspectorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  async function loadData() {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetchDbInspectorData();
      setData(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat data database');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return { data, loading, errorMsg, reload: loadData };
}
