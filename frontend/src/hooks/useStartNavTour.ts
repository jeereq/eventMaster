'use client';

import { useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTour } from '@/context/TourContext';
import { buildNavTourOptions } from '@/lib/buildNavProductTour';
import { resolveUserGuideRole } from '@/lib/resolveUserGuideRole';

/** Lance la visite guidée des onglets correspondant au profil de l'utilisateur connecté. */
export function useStartNavTour() {
  const { user, access, tenant, planQuota, planFeatures, planName } = useAuth();
  const { startTour, isActive } = useTour();

  const start = useCallback(() => {
    if (isActive) return;
    const { guideId } = resolveUserGuideRole({ role: user?.role, access, accountKind: tenant?.accountKind });
    startTour(
      guideId,
      access,
      buildNavTourOptions({
        accountKind: tenant?.accountKind,
        access,
        planQuota,
        planFeatures,
        planId: tenant?.plan,
        planName,
      }),
    );
  }, [isActive, user?.role, access, tenant?.accountKind, tenant?.plan, planQuota, planFeatures, planName, startTour]);

  return { startNavTour: start, isTourActive: isActive };
}
