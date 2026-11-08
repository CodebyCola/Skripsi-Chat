'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem { id: number; tone: ToastTone; message: string }
interface ToastApi { show: (message: string, tone?: ToastTone) => void }

const ToastContext = createContext<ToastApi | null>(null);

const TONE_CLS: Record<ToastTone, string> = {
  success: 'border-security-valid/40 text-security-valid',
  error: 'border-security-danger/40 text-security-danger',
  info: 'border-security-info/40 text-security-info',
};
const TONE_ICON: Record<ToastTone, string> = { success: 'check_circle', error: 'error', info: 'info' };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const show = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = nextId.current++;
    setItems((prev) => [...prev, { id, tone, message }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
        {items.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2 px-3 py-2 rounded-lg bg-surface border shadow-sm text-xs ${TONE_CLS[t.tone]}`}
          >
            <span className="material-symbols-outlined text-base shrink-0" aria-hidden="true">{TONE_ICON[t.tone]}</span>
            <span className="text-text-dark">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast harus dipakai di dalam <ToastProvider>');
  return ctx;
}
