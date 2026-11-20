'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useStartNavTour } from '@/hooks/useStartNavTour';

/** Ancienne page du guide : renvoie vers l'accueil et lance la visite guidée. */
export default function DashboardGuidePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { startNavTour } = useStartNavTour();
  const startedRef = useRef(false);

  useEffect(() => {
    if (loading || !user || startedRef.current) return;
    startedRef.current = true;
    router.replace('/dashboard');
    startNavTour();
  }, [loading, user, router, startNavTour]);

  return null;
}
