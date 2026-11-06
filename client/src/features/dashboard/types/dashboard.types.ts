export interface AuthenticatedSessionUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  dongleId?: string;
}

export interface DashboardModule {
  href: string;
  title: string;
  desc: string;
  badge?: string;
}
