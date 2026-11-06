import React from 'react';

export function AuthFooter() {
  return (
    <footer className="w-full bg-surface-container-low shadow-[0_-1px_8px_rgba(28,40,35,0.03)] py-space-lg">
      <div className="w-full px-margin md:px-margin-tablet lg:px-margin-desktop flex flex-col md:flex-row items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-sm">
          <div className="flex flex-col text-left">
            <span className="font-label-sm text-label-sm text-primary font-semibold">
              SkripsiChat
            </span>
            <span className="font-body-sm text-body-sm text-text-secondary">
              © 2026 SkripsiChat. Protokol Bimbingan Skripsi Berintegritas
              Tinggi.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
