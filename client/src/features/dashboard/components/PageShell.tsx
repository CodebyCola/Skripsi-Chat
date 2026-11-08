export function PageShell({ title, subtitle, actions, children }: {
  title: string; subtitle: string; actions?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-canvas">
      <div className="h-16 px-6 bg-surface border-b border-sage-border flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <span className="text-[11px] text-text-secondary">{subtitle}</span>
          <h1 className="font-display font-semibold text-sm text-text-dark truncate">{title}</h1>
        </div>
        {actions}
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">{children}</div>
      </div>
    </div>
  );
}