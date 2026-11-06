'use client';

import React, { useEffect, useState } from 'react';

export function DashboardNav() {
  const [user, setUser] = useState<{ username: string; fullName: string } | null>(
    null
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem('aegis_user');
      if (!raw) {
        window.location.href = '/';
        return;
      }
      setUser(JSON.parse(raw));
    } catch {
      window.location.href = '/';
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem('aegis_user');
    window.location.href = '/';
  }

  const navItems = [
    { href: '/dashboard', label: '🏠 Ringkasan' },
    { href: '/dashboard/messages', label: '✉️ Pesan Super Enkripsi' },
    { href: '/dashboard/files', label: '📁 File ChaCha20' },
    { href: '/dashboard/stego', label: '🖼️ Steganografi LSB' },
    { href: '/dashboard/db-view', label: '🗄️ DB Inspector' },
    { href: '/dashboard/blockchain', label: '⛓️ Blockchain SHA-256' },
  ];

  return (
    <header
      style={{
        background: '#111827',
        borderBottom: '1px solid #334155',
        padding: '12px 24px',
        marginBottom: 24,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <strong style={{ fontSize: 16, color: '#38bdf8' }}>
            🛡️ AegisVault Client Portal
          </strong>
          {user && (
            <span style={{ fontSize: 12.5, color: '#94a3b8', marginLeft: 10 }}>
              Login sebagai: <strong style={{ color: '#fff' }}>@{user.username}</strong> ({user.fullName})
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              style={{
                padding: '6px 11px',
                borderRadius: 8,
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#e2e8f0',
                textDecoration: 'none',
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              {item.label}
            </a>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: '#dc2626',
              padding: '6px 12px',
              fontSize: 12.5,
            }}
          >
            Keluar
          </button>
        </div>
      </div>
    </header>
  );
}
