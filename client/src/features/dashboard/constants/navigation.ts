// Ref: Spesifikasi Bagian 5 (Aktor & Hak Akses), FR-AUTH-08
export type AppRole = 'student' | 'lecturer' | 'admin';

export interface NavItemConfig {
  label: string;
  href: string;
  icon: string;
  roles: AppRole[];
  badgeIcon?: string;
  /** Hanya tersedia saat pengembangan (disembunyikan & diblokir di production). */
  devOnly?: boolean;
}

const ALL: AppRole[] = ['student', 'lecturer', 'admin'];
const PARTICIPANT: AppRole[] = ['student', 'lecturer'];
const IS_PROD = process.env.NODE_ENV === 'production';

export const NAV_ITEMS: NavItemConfig[] = [
  { label: 'Ruang Bimbingan', href: '/dashboard', icon: 'chat_bubble', roles: PARTICIPANT },
  { label: 'Naskah & Berkas', href: '/dashboard/files', icon: 'folder_open', roles: PARTICIPANT },
  { label: 'Pesan Penting', href: '/dashboard/messages', icon: 'bookmark', roles: PARTICIPANT },
  { label: 'Buku Konsultasi & ACC', href: '/dashboard/blockchain', icon: 'verified', roles: ALL, badgeIcon: 'lock' },
  { label: 'Foto Dokumen', href: '/dashboard/stego', icon: 'image', roles: PARTICIPANT },
  { label: 'DB Inspector', href: '/dashboard/db-view', icon: 'storage', roles: ALL, devOnly: true },
];

// Admin tidak punya akses ke isi percakapan (tidak memegang private key peserta).
export const ROLE_HOME: Record<AppRole, string> = {
  student: '/dashboard',
  lecturer: '/dashboard',
  admin: '/dashboard/blockchain',
};

function matches(href: string, pathname: string): boolean {
  return href === '/dashboard' ? pathname === href : pathname.startsWith(href);
}

export function isNavActive(href: string, pathname: string): boolean {
  return matches(href, pathname);
}

export function navForRole(role: AppRole): NavItemConfig[] {
  return NAV_ITEMS.filter((i) => i.roles.includes(role) && !(i.devOnly && IS_PROD));
}

/** Rute yang tidak terdaftar dianggap boleh (404 ditangani Next.js). */
export function canAccess(role: AppRole, pathname: string): boolean {
  const item = NAV_ITEMS.find((i) => matches(i.href, pathname));
  if (!item) return true;
  if (item.devOnly && IS_PROD) return false;
  return item.roles.includes(role);
}
