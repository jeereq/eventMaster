'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import FaqSection from '@/components/landing/FaqSection';
import LandingTrustPricingBand from '@/components/landing/LandingTrustPricingBand';
import PublicCtaBand from '@/components/PublicCtaBand';
import SiteFooter from '@/components/SiteFooter';
import LandingStepsBento from '@/components/landing/LandingStepsBento';
import LandingDashboardQuickAccess from '@/components/landing/LandingDashboardQuickAccess';
import LandingLazyMount, { LandingSectionFallback } from '@/components/landing/LandingLazyMount';
import { Button } from '@/components/ui';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { ArrowRight } from 'lucide-react';

const LandingSimulatorTeaser = dynamic(
  () => import('@/components/landing/LandingSimulatorTeaser'),
  { loading: () => <LandingSectionFallback label="Chargement du simulateur IA…" /> },
);

const LandingVitrineSection = dynamic(
  () => import('@/components/landing/LandingVitrineSection'),
  { loading: () => <LandingSectionFallback label="Chargement de la vitrine…" /> },
);


/** FAQ courte de l’accueil : la liste complète reste sur /faq. */
const LANDING_FAQ_IDS = [
  'what-is-eventmaster',
  'free-trial',
  'plans-quotas',
  'marketplace-venues',
  'protocol-qr',
  'support',
];

export default function LandingBelowFold() {
  const { user } = useAuth();
  const { site } = usePlatformSite();

  return (
    <>
      <LandingStepsBento
        stepsAction={
          user ? (
            <Button href="/dashboard/events" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Voir mes événements
            </Button>
          ) : site.allowRegistration ? (
            <>
              <Button
                href="/register?kind=ORGANIZER&intent=personal&action=event"
                size="lg"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Créer mon événement
              </Button>
              <Button href="/simulateur" size="lg" variant="secondary">
                Estimer mon budget
              </Button>
            </>
          ) : null
        }
      />
      <LandingLazyMount label="Chargement de la vitrine…" eagerHash="catalogue">
        <LandingVitrineSection />
      </LandingLazyMount>
      <LandingLazyMount label="Chargement du simulateur IA…" eagerHash="simulateur-ia">
        <LandingSimulatorTeaser />
      </LandingLazyMount>
      <LandingTrustPricingBand />
      <FaqSection
        subtitle="Les questions les plus posées avant de se lancer."
        itemIds={LANDING_FAQ_IDS}
        moreHref="/faq"
        split
      />
      <PublicCtaBand
        title="Prêt à organiser votre événement ?"
        description="Créez votre compte gratuit en 1 minute. Sans carte bancaire."
        actions={
          user ? (
            <Button href="/dashboard" size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Ouvrir mon espace
            </Button>
          ) : (
            <>
              {site.allowRegistration && (
                <Button
                  href="/register?kind=ORGANIZER&intent=personal&action=event"
                  size="lg"
                  variant="primary"
                  aria-label="Créer mon événement"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  <span className="sm:hidden">Créer l’événement</span>
                  <span className="hidden sm:inline">Créer mon événement</span>
                </Button>
              )}
              <Button
                href="/marketplace"
                size="lg"
                variant="secondary"
                className="bg-transparent text-white border-[#6ee7b7] hover:bg-white/10 text-sm font-semibold"
                aria-label="Explorer le marketplace"
              >
                <span className="sm:hidden">Marketplace</span>
                <span className="hidden sm:inline">Explorer le marketplace</span>
              </Button>
            </>
          )
        }
      />
      <LandingDashboardQuickAccess />
      <SiteFooter faqHref="/#faq" />
    </>
  );
}
