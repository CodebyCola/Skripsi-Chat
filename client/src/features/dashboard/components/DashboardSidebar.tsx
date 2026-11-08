'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { getInitials, formatRole, normalizeRole } from '../utils';
import { isNavActive, navForRole } from '../constants/navigation';

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout } = useCurrentUser();

  const initials = getInitials(user?.fullName || user?.username);
  const items = navForRole(normalizeRole(user?.role));

  return (
    <aside className="w-64 bg-surface border-r border-sage-border flex flex-col justify-between shrink-0 select-none">
      <div className="p-4 flex flex-col gap-4 overflow-y-auto">
        <div className="p-3.5 rounded-xl border border-sage-border bg-canvas flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-sage-tint border border-sage-border text-primary font-display font-semibold text-xs flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-dark truncate">{user?.fullName || 'Pengguna'}</p>
            <p className="text-[11px] text-text-secondary truncate">{formatRole(user?.role)}</p>
            {user?.username && (
              <p className="text-[10px] font-mono text-text-muted truncate">@{user.username}</p>
            )}
          </div>
        </div>

        <nav className="flex flex-col gap-1" aria-label="Navigasi kerja">
          <span className="text-[10px] font-medium tracking-wider uppercase text-text-muted px-2.5 mb-1">
            Navigasi Kerja
          </span>

          {items.map((item) => {
            const active = isNavActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center justify-between px-3 py-2 rounded-lg font-medium text-xs transition border ${
                  active
                    ? 'bg-sage-tint text-primary border-sage-border font-semibold shadow-xs'
                    : 'text-text-secondary hover:text-text-dark hover:bg-canvas border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className={`material-symbols-outlined text-lg ${active ? 'text-primary' : 'text-text-secondary'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  {item.badgeIcon && (
                    <span className="material-symbols-outlined text-sm text-text-muted">{item.badgeIcon}</span>
                  )}
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-sage-border bg-surface flex items-center justify-between">
        <span className="text-[11px] text-text-muted font-mono">SESI AMAN</span>
        <button
          type="button"
          onClick={logout}
          title="Keluar / Akhiri Sesi"
          className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-xs text-text-secondary hover:text-security-danger hover:bg-security-danger/10 border border-transparent transition cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">logout</span>
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
