"use client"
import { useEffect, useState } from 'react';
import { AuthenticatedSessionUser } from '../types/dashboard.types';

export function useCurrentUser() {
  const [user, setUser] = useState<AuthenticatedSessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem('skripsichat_user') ||
        localStorage.getItem('aegis_user');
      if (!raw) {
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

  function logout() {
    localStorage.removeItem('skripsichat_user');
    localStorage.removeItem('aegis_user');
    window.location.href = '/';
  }

  return { user, loading, logout };
}
