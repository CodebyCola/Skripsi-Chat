import React from 'react';
import { DashboardLayout } from '@/features/dashboard';

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
