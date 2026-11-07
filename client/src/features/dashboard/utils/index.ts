export function getInitials(name?: string): string {
  if (!name) return 'SC';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatRole(role?: string): string {
  if (!role) return 'Mahasiswa';
  const r = role.toUpperCase();
  if (r.includes('DOSEN')) return 'Dosen Pembimbing';
  if (r.includes('ADMIN')) return 'Administrator';
  return 'Mahasiswa';
}
