'use client';

import React from 'react';

export function DashboardHeader() {
  return (
    <header className="h-14 bg-surface border-b border-sage-border flex items-center justify-between px-6 shrink-0 z-20">
      {/* BRAND (Tanpa icon per ketentuan #1 & #2) */}
      <div className="flex items-center gap-3">
        <span className="font-display font-bold text-base text-primary tracking-tight">
          SkripsiChat
        </span>
        <span className="text-[11px] font-mono text-text-muted px-1.5 py-0.5 rounded border border-sage-border bg-canvas">
          v2.4-ENC
        </span>
      </div>

      {/* UTILITY ACTIONS (Per ketentuan #3 & #4: tanpa badge sesi, lonceng & help tetap) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          title="Pemberitahuan Sistem"
          className="w-8 h-8 rounded-md flex items-center justify-center text-text-secondary hover:text-text-dark hover:bg-canvas border border-transparent hover:border-sage-border transition"
        >
          <span className="material-symbols-outlined text-xl">notifications</span>
        </button>

        <button
          type="button"
          title="Bantuan & Panduan"
          className="w-8 h-8 rounded-md flex items-center justify-center text-text-secondary hover:text-text-dark hover:bg-canvas border border-transparent hover:border-sage-border transition"
        >
          <span className="material-symbols-outlined text-xl">help_outline</span>
        </button>
      </div>
    </header>
  );
}
