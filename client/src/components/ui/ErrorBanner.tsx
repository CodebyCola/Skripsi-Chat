import React from 'react';

interface ErrorBannerProps {
  message?: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onRetry, onDismiss }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 px-4 py-2.5 text-xs text-security-danger bg-security-danger/10 border-b border-security-danger/20"
    >
      <span className="material-symbols-outlined text-base shrink-0" aria-hidden="true">error</span>
      <span className="flex-1 min-w-0">{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-semibold underline cursor-pointer">
          Coba lagi
        </button>
      )}
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Tutup" className="cursor-pointer">
          <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
        </button>
      )}
    </div>
  );
}
