'use client';

import React from 'react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSidebar } from './DashboardSidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="skripsichat-app bg-canvas text-text-dark font-sans h-screen w-screen overflow-hidden flex flex-col antialiased selection:bg-sage-tint selection:text-primary">
      {/* 1. Header Global */}
      <DashboardHeader />

      {/* 2. Container 2-Kolom (Sidebar Kiri & Konten Utama Tengah; Sidebar Kanan Dihapus per ketentuan #9) */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        <DashboardSidebar />
        <main className="flex-1 bg-canvas flex flex-col min-w-0 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
