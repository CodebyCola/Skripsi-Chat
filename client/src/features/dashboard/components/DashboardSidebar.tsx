'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { getInitials, formatRole } from '../utils';

interface NavItemConfig {
  label: string;
  href: string;
  icon: string;
  badge?: string | number;
  badgeIcon?: string;
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    label: 'Ruang Bimbingan',
    href: '/dashboard',
    icon: 'chat_bubble',
  },
  {
    label: 'Naskah & Berkas',
    href: '/dashboard/files',
    icon: 'folder_open',
  },
  {
    label: 'Pesan Penting',
    href: '/dashboard/messages',
    icon: 'bookmark',
  },
  {
    label: 'Steganografi Citra',
    href: '/dashboard/stego',
    icon: 'image',
  },
  {
    label: 'Buku Konsultasi & ACC',
    href: '/dashboard/blockchain',
    icon: 'verified',
    badgeIcon: 'lock',
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout } = useCurrentUser();

  const initials = getInitials(user?.fullName || user?.username);
  const userRole = formatRole(user?.role);

  return (
    <aside className="w-64 bg-surface border-r border-sage-border flex flex-col justify-between shrink-0 select-none">
      <div className="p-4 flex flex-col gap-4 overflow-y-auto">
        
        {/* CARD PROFIL USER: Nama, Role, & Icon Initial (Per ketentuan #5) */}
        <div className="p-3.5 rounded-xl border border-sage-border bg-canvas flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-sage-tint border border-sage-border text-primary font-display font-semibold text-xs flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text-dark truncate">
                {user?.fullName || 'Pengguna'}
              </p>
              <p className="text-[11px] text-text-secondary truncate">
                {userRole}
              </p>
              {user?.username && (
                <p className="text-[10px] font-mono text-text-muted truncate">
                  @{user.username}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* NAVIGASI KERJA: Per ketentuan #6 (Pembedaan status aktif & non-aktif) */}
        <nav className="flex flex-col gap-1">
          <span className="text-[10px] font-medium tracking-wider uppercase text-text-muted px-2.5 mb-1">
            Navigasi Kerja
          </span>

          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-lg font-medium text-xs transition border ${
                  isActive
                    ? 'bg-sage-tint text-primary border-sage-border font-semibold shadow-xs'
                    : 'text-text-secondary hover:text-text-dark hover:bg-canvas border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`material-symbols-outlined text-lg ${
                      isActive ? 'text-primary' : 'text-text-secondary'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge !== undefined && (
                    <span className="text-[10px] font-mono text-text-muted px-1.5 py-0.5 rounded bg-canvas border border-sage-border">
                      {item.badge}
                    </span>
                  )}
                  {item.badgeIcon && (
                    <span className="material-symbols-outlined text-sm text-text-muted">
                      {item.badgeIcon}
                    </span>
                  )}
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* FOOTER ACTION: Logout / Keluar Sesi */}
      <div className="p-3 border-t border-sage-border bg-surface flex items-center justify-between">
        <span className="text-[11px] text-text-muted font-mono">
          SESI AMAN
        </span>
        <button
          type="button"
          onClick={logout}
          title="Keluar / Akhiri Sesi"
          className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-xs text-text-secondary hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition"
        >
          <span className="material-symbols-outlined text-base">logout</span>
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
