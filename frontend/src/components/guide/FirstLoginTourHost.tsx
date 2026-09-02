'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Map, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTour } from '@/context/TourContext';
import { Modal, Button } from '@/components/ui';
import { resolveUserGuideRole } from '@/lib/resolveUserGuideRole';
import { buildNavTourOptions, getProductTour } from '@/lib/buildNavProductTour';
import {
  getFirstLoginWelcome,
  getFirstTourStatus,
  getVendorOnboardingStatus,
  markGettingStartedGuideDone,
  setFirstTourStatus,
  setVendorOnboardingStatus,
  shouldAutoOfferFirstTour,
} from '@/lib/firstLoginTour';
import FirstLoginOnboardingModal from './FirstLoginOnboardingModal';

export default function FirstLoginTourHost() {
  const { user, access, tenant, planQuota, planFeatures, supportSession } = useAuth();
  const { startTour, isActive } = useTour();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const launchedRef = useRef(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const resolved = useMemo(
    () => resolveUserGuideRole({ role: user?.role, access }),
    [user?.role, access],
  );

  const tourOpts = useMemo(
    () => ({
      ...buildNavTourOptions({
        accountKind: tenant?.accountKind,
        access,
        planQuota,
        planFeatures,
        planId: tenant?.plan,
      }),
      variant: 'first-login' as const,
    }),
    [access, tenant?.accountKind, tenant?.plan, planQuota, planFeatures],
  );

  const welcome = useMemo(
    () =>
      getFirstLoginWelcome({
        guideId: resolved.guideId,
        firstName: user?.name,
        planName: tourOpts.planName,
      }),
    [resolved.guideId, user?.name, tourOpts.planName],
  );

  const stripTourParam = useCallback(() => {
    if (searchParams.get('tour') !== '1') return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('tour');
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!user?.id || supportSession || isActive) return;
    if (!shouldAutoOfferFirstTour(resolved.guideId)) {
      if (searchParams.get('tour') === '1') stripTourParam();
      return;
    }

    const status = getFirstTourStatus(user.id);
    const fromOtp = searchParams.get('tour') === '1';

    const isVendor = tenant?.accountKind === 'VENDOR' || tenant?.accountKind === 'BOTH';
    const onboardingDone = getVendorOnboardingStatus(user.id);

    if (isVendor && !onboardingDone) {
      setOnboardingOpen(true);
      if (fromOtp) stripTourParam();
      return;
    }

    if (status === 'seen' || status === 'skipped') {
      if (fromOtp) stripTourParam();
      return;
    }

    if (fromOtp || status === 'pending') {
      setFirstTourStatus(user.id, 'pending');
      setOfferOpen(true);
      if (fromOtp) stripTourParam();
    }
  }, [user?.id, supportSession, isActive, resolved.guideId, tenant?.accountKind, searchParams, stripTourParam]);

  useEffect(() => {
    const onStopped = (event: Event) => {
      if (!launchedRef.current || !user?.id) return;
      launchedRef.current = false;
      const reason = (event as CustomEvent<{ reason?: string }>).detail?.reason;
      setFirstTourStatus(user.id, 'seen');
      if (reason === 'done') markGettingStartedGuideDone();
    };
    window.addEventListener('em-tour-stopped', onStopped);
    return () => window.removeEventListener('em-tour-stopped', onStopped);
  }, [user?.id]);

  const skip = () => {
    if (user?.id) setFirstTourStatus(user.id, 'skipped');
    setOfferOpen(false);
  };

  const launch = () => {
    const steps = getProductTour(resolved.guideId, access, tourOpts);
    if (steps.length === 0) {
      skip();
      return;
    }
    if (user?.id) setFirstTourStatus(user.id, 'pending');
    setOfferOpen(false);
    launchedRef.current = true;
    window.setTimeout(() => startTour(resolved.guideId, access, tourOpts), 80);
  };

  const handleOnboardingComplete = () => {
    if (user?.id) {
      setVendorOnboardingStatus(user.id, true);
    }
    setOnboardingOpen(false);
    // Enchaîner sur la proposition de visite guidée
    setFirstTourStatus(user!.id, 'pending');
    setOfferOpen(true);
  };

  const handleOnboardingClose = () => {
    if (user?.id) {
      setVendorOnboardingStatus(user.id, true);
    }
    setOnboardingOpen(false);
  };

  return (
    <>
      <FirstLoginOnboardingModal
        open={onboardingOpen}
        onClose={handleOnboardingClose}
        onComplete={handleOnboardingComplete}
        tenantName={tenant?.name}
      />

      {offerOpen && (
        <Modal
          open={offerOpen}
          onClose={skip}
          title={welcome.title}
          description="Visite guidée de votre espace"
          size="sm"
          footer={
            <div className="flex w-full flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="secondary" onClick={skip}>
                Plus tard
              </Button>
              <Button type="button" onClick={launch} leftIcon={<Map className="w-4 h-4" />}>
                {welcome.cta}
              </Button>
            </div>
          }
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-[var(--radius-button)] border border-border bg-surface-muted flex items-center justify-center text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-sm text-muted leading-relaxed">{welcome.body}</p>
          </div>
          <p className="text-[11px] text-muted mt-4">
            Vous pourrez relancer la visite complète depuis{' '}
            <span className="font-medium text-foreground">Guide utilisateur</span>.
          </p>
        </Modal>
      )}
    </>
  );
}
