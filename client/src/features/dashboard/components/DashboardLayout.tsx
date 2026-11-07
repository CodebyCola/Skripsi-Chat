'use client';

import React from 'react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSidebar } from './DashboardSidebar';
import { DongleLockModal } from './DongleLockModal';
import { useDongleGuard } from '../hooks/useDongleGuard';
import { useCurrentUser } from '../hooks/useCurrentUser';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isLocked, checking, recheck } = useDongleGuard();
  const { logout } = useCurrentUser();

  return (
    <div className="skripsichat-app bg-canvas text-text-dark font-sans h-screen w-screen overflow-hidden flex flex-col antialiased selection:bg-sage-tint selection:text-primary relative">
      {/* 1. Header Global */}
      <DashboardHeader />

      {/* 2. Container 2-Kolom (Sidebar Kiri & Konten Utama Tengah; Sidebar Kanan Dihapus per ketentuan #9) */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        <DashboardSidebar />
        <main className="flex-1 bg-canvas flex flex-col min-w-0 overflow-hidden">
          {children}
        </main>
      </div>

      {/* 3. Hardware Dongle Runtime Lockout Overlay (Kriteria #1) */}
      {isLocked && (
        <DongleLockModal
          onRecheck={recheck}
          onLogout={logout}
          checking={checking}
        />
      )}
    </div>
  );
}
