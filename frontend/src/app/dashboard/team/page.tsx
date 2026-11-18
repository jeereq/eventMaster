'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Alert } from '@/components/ui';
import TeamManagement from '../TeamManagement';

export default function DashboardTeamPage() {
  const { user, tenant, access } = useAuth();
  const router = useRouter();
  const canManage = Boolean(user?.role === 'USER' && tenant && access?.canManageTeam);

  useEffect(() => {
    if (access?.level === 'client') {
      router.replace('/dashboard/bookings');
    }
  }, [access?.level, router]);

  if (user?.role !== 'USER' || !tenant) return null;

  if (!canManage) {
    return (
      <Alert variant="error">
        Accès réservé au propriétaire et aux managers de l&apos;organisation.
      </Alert>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <TeamManagement />
    </div>
  );
}
