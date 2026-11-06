'use client';

import React from 'react';
import { SERVER_CONSOLE_URL } from '@/lib/api';
import { AUTH_ASSETS } from '../constants/auth.constants';

interface AuthHeaderProps {
  serverOnline?: boolean;
  onGoToStep1?: () => void;
}

export function AuthHeader({ serverOnline, onGoToStep1 }: AuthHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(28,40,35,0.04)]">
      <div className="h-16 w-full px-margin md:px-margin-tablet lg:px-margin-desktop flex items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md shrink-0">
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm text-primary tracking-tight leading-none">
              SkripsiChat
            </span>
            <span className="font-label-sm text-label-sm text-text-secondary mt-0.5">
              Academic Advisory Shield
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
