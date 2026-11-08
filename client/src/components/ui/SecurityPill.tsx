import React from 'react';

// Ref: DESIGN.md §2.2 (warna status & kriptografi)
export type PillTone = 'valid' | 'warning' | 'danger' | 'info' | 'neutral';

const TONE: Record<PillTone, string> = {
  valid: 'text-security-valid bg-security-valid/10 border-security-valid/30',
  warning: 'text-security-warning bg-security-warning/10 border-security-warning/30',
  danger: 'text-security-danger bg-security-danger/10 border-security-danger/30',
  info: 'text-security-info bg-security-info/10 border-security-info/30',
  neutral: 'text-text-secondary bg-canvas border-sage-border',
};

interface SecurityPillProps {
  tone?: PillTone;
  icon?: string;
  className?: string;
  children: React.ReactNode;
}

export function SecurityPill({ tone = 'neutral', icon, className = '', children }: SecurityPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold leading-none whitespace-nowrap ${TONE[tone]} ${className}`}
    >
      {icon && <span className="material-symbols-outlined text-[13px]" aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}
