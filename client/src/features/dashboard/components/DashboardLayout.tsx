'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSidebar } from './DashboardSidebar';
import { ContextSecurityPanel } from './ContextSecurityPanel';
import { ToastProvider } from '@/components/ui';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { canAccess, ROLE_HOME } from '../constants/navigation';
import { normalizeRole } from '../utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading } = useCurrentUser();
  const pathname = usePathname();
  const router = useRouter();
  const [contextOpen, setContextOpen] = useState(false);

  const role = normalizeRole(user?.role);
  const allowed = !!user && canAccess(role, pathname);

  // Guard sisi UI (FR-AUTH-08). Penegakan hak akses yang sebenarnya tetap harus di server.
  useEffect(() => {
    if (user && !allowed) router.replace(ROLE_HOME[role]);
  }, [user, allowed, role, router]);

  return (
    <ToastProvider>
      <div className="skripsichat-app bg-canvas text-text-dark font-sans h-screen w-screen overflow-hidden flex flex-col antialiased selection:bg-sage-tint selection:text-primary">
        {/* 1. Header Global */}
        <DashboardHeader contextOpen={contextOpen} onToggleContext={() => setContextOpen((v) => !v)} />

        {/* 2. Sidebar kiri + konten tengah; panel kanan opsional (tertutup default, dibuka dari header) */}
        <div className="flex flex-1 min-h-0 w-full overflow-hidden">
          <DashboardSidebar />
          <main className="flex-1 bg-canvas flex flex-col min-w-0 overflow-hidden">
            {loading || !allowed ? (
              <div className="flex-1 flex items-center justify-center text-xs text-text-secondary">
                Memuat sesi…
              </div>
            ) : (
              children
            )}
          </main>
          <ContextSecurityPanel open={contextOpen} onClose={() => setContextOpen(false)} />
        </div>
      </div>
    </ToastProvider>
  );
}
