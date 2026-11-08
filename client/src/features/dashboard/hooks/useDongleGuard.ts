'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '@/lib/api';

interface DongleStatusResponse {
  dongleDetected: boolean;
  virtualUsbConnected: boolean;
  activeDongle: {
    drivePath: string;
    username: string;
    dongleId: string;
    issuedAt: string;
  } | null;
}

export function useDongleGuard() {
  const [isLocked, setIsLocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [activeDongle, setActiveDongle] = useState<DongleStatusResponse['activeDongle']>(null);

  const checkDongle = useCallback(async () => {
    try {
      setChecking(true);
      const res = await apiRequest<DongleStatusResponse>('/api/auth/dongle/status');
      if (!res.dongleDetected) {
        setIsLocked(true);
        setActiveDongle(null);
      } else {
        // Validasi kepemilikan dongle terhadap user yang sedang aktif di sesi
        if (typeof window !== 'undefined') {
          const raw =
            localStorage.getItem('skripsichat_user') ||
            localStorage.getItem('aegis_user');
          if (raw) {
            try {
              const currentUser = JSON.parse(raw);
              if (
                res.activeDongle?.username &&
                currentUser?.username &&
                res.activeDongle.username !== currentUser.username
              ) {
                setIsLocked(true);
                setActiveDongle(null);
                return;
              }
            } catch {
              // Abaikan kegagalan parse JSON
            }
          }
        }
        setIsLocked(false);
        setActiveDongle(res.activeDongle);
      }
    } catch {
      // Jika server offline atau error jaringan, kunci untuk keamanan
      setIsLocked(true);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    // Jalankan pemeriksaan awal
    checkDongle();

    // Polling setiap 4 detik untuk memastikan dongle tetap menancap di port
    const timer = setInterval(() => {
      checkDongle();
    }, 4000);

    return () => clearInterval(timer);
  }, [checkDongle]);

  return {
    isLocked,
    checking,
    recheck: checkDongle,
    activeDongle,
  };
}
