"use client"
import { useEffect, useState } from 'react';
import { apiRequest, TOKEN_KEY } from '@/lib/api';
import { AuthenticatedSessionUser } from '../types/dashboard.types';

export function useCurrentUser() {
  const [user, setUser] = useState<AuthenticatedSessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem('skripsichat_user') ||
        localStorage.getItem('aegis_user');
      if (!raw || !localStorage.getItem(TOKEN_KEY)) {
        window.location.href = '/';
        return;
      }
      setUser(JSON.parse(raw));
    } catch {
      window.location.href = '/';
    } finally {
      setLoading(false);
    }
  }, []);

  async function logout() {
    // FR-AUTH-10: minta server menghapus sesi + kunci dari memori (best-effort)
    try {
      await apiRequest('/api/auth/logout', 'POST', {});
    } catch {
      /* sesi mungkin sudah habis; lanjut bersihkan sisi klien */
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('skripsichat_user');
    localStorage.removeItem('aegis_user');
    window.location.href = '/';
  }

  return { user, loading, logout };
}
