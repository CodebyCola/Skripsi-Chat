'use client';

import React from 'react';
import { DashboardLayout } from './DashboardLayout';
import { DashboardWorkspace } from './DashboardWorkspace';

export function DashboardOverview() {
  return (
    <DashboardLayout>
      <DashboardWorkspace />
    </DashboardLayout>
  );
}
