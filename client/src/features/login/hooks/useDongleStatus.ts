"use client"

import { useCallback, useEffect, useState } from "react";
import { checkServerAuthStatus } from "../api/authApi";
import { ClientAuthCheckState } from "../types/auth.types";

export function useDongleStatus(username: string) {
  const [authStatus, setAuthStatus] = useState<ClientAuthCheckState | null>(
    null,
  );
  const [checking, setChecking] = useState(true);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await checkServerAuthStatus(username);
      setAuthStatus(res);
    } catch {
      setAuthStatus({
        serverOnline: false,
        dongleDetected: false,
        dongleMatchesUser: false,
        userExists: false,
        hasEnrolledFace: false,
        hasFacePhoto: false,
        activeDongle: null,
      });
    } finally {
      setChecking(false);
    }
  }, [username]);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 2000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  const isDongleActiveAndValid = Boolean(
    authStatus?.serverOnline &&
    authStatus?.dongleDetected &&
    authStatus?.dongleMatchesUser,
  );

  return {
    authStatus,
    checking,
    isDongleActiveAndValid,
    refreshStatus,
  };
}
