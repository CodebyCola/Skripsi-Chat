import React from 'react';
import { DashboardModule } from '../types/dashboard.types';

interface ModuleCardProps {
  module: DashboardModule;
}

export function ModuleCard({ module }: ModuleCardProps) {
  return (
    <a
      href={module.href}
      style={{
        padding: 20,
        background: '#111827',
        borderRadius: 12,
        border: '1px solid #334155',
        color: '#fff',
        textDecoration: 'none',
        display: 'block',
        transition: 'transform 0.15s ease, border-color 0.15s ease',
      }}
    >
      <h3 style={{ marginBottom: 8, color: '#38bdf8' }}>{module.title}</h3>
      <p style={{ fontSize: 13.5, color: '#cbd5e1', lineHeight: 1.5 }}>
        {module.desc}
      </p>
    </a>
  );
}
