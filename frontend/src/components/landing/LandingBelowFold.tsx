'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import FaqSection from '@/components/landing/FaqSection';
import LandingTrustPricingBand from '@/components/landing/LandingTrustPricingBand';
import PublicCtaBand from '@/components/PublicCtaBand';
import SiteFooter from '@/components/SiteFooter';
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

const LandingVisualBanner = dynamic(
  () => import('@/components/landing/LandingVisualBanner'),
  { loading: () => <LandingSectionFallback label="Chargement des inspirations…" /> },
);

const Landing3DTeaserBand = dynamic(
  () => import('@/components/landing/Landing3DTeaserBand'),
  { ssr: false, loading: () => <LandingSectionFallback label="Chargement de la salle 3D…" /> },
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
      <LandingLazyMount label="Chargement des inspirations…">
        <LandingVisualBanner />
      </LandingLazyMount>
      <LandingLazyMount label="Chargement de la vitrine…">
        <LandingVitrineSection />
      </LandingLazyMount>
      <LandingLazyMount label="Chargement de la salle 3D…">
        <Landing3DTeaserBand />
      </LandingLazyMount>
      <LandingLazyMount label="Chargement du simulateur IA…" eagerHash="simulateur-ia">
        <LandingSimulatorTeaser />
      </LandingLazyMount>
      <LandingTrustPricingBand />
      <FaqSection
        subtitle="Les questions les plus posées avant de se lancer."
        itemIds={LANDING_FAQ_IDS}
        moreHref="/faq"
      />
      <PublicCtaBand
        title="Prêt à lancer votre événement ?"
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
                className="bg-stage-foreground/10 text-stage-foreground hover:bg-stage-foreground/20 border-stage-foreground/20 text-sm font-semibold"
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
