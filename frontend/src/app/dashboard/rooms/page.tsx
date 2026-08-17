'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Breadcrumbs, Alert } from '@/components/ui';
import { canPublishVenueCatalog } from '@/lib/planAccess';
import RoomsManagement from '../RoomsManagement';

export default function DashboardRoomsPage() {
  const { user, tenant, access, planFeatures, planQuota } = useAuth();
  const router = useRouter();
  const canManage = Boolean(user?.role === 'USER' && tenant && access?.canManageRooms);
  const catalogPublish = canPublishVenueCatalog(planFeatures, planQuota, tenant?.plan);

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
      <PageHeader
        title="Salles"
        description={
          catalogPublish
            ? 'Plans 2D, staff, publication catalogue et disponibilités.'
            : 'Plans 2D et staff pour vos événements — sans publication au catalogue.'
        }
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Accueil', href: '/dashboard' },
              { label: 'Salles' },
            ]}
          />
        }
      />
      <RoomsManagement />
    </div>
  );
}
