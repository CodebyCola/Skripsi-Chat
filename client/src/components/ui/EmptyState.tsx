import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-2 py-10 px-6">
      <span className="material-symbols-outlined text-3xl text-text-muted" aria-hidden="true">{icon}</span>
      <p className="text-sm font-semibold text-text-dark">{title}</p>
      {description && <p className="text-xs text-text-secondary max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
