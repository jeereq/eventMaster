'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';
import LandingHeroStreamlined from '@/components/landing/LandingHeroStreamlined';
import Landing3DTeaserBand from '@/components/landing/Landing3DTeaserBand';
import FaqSection from '@/components/landing/FaqSection';
import PublicCtaBand from '@/components/PublicCtaBand';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import LandingDashboardQuickAccess from '@/components/landing/LandingDashboardQuickAccess';
import LandingLazyMount, { LandingSectionFallback } from '@/components/landing/LandingLazyMount';
import { Button } from '@/components/ui';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { ArrowRight } from 'lucide-react';

const LandingAiSimulationShowcase = dynamic(
  () => import('@/components/landing/LandingAiSimulationShowcase'),
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

export default function Home() {
  const { user } = useAuth();
  const { site } = usePlatformSite();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans antialiased em-public-bottom-pad">
      <SiteHeader variant="landing" />

      <main id="main-content" className="flex-1 flex flex-col">
        <LandingHeroStreamlined />
        <LandingLazyMount label="Chargement des inspirations…">
          <LandingVisualBanner />
        </LandingLazyMount>
        <LandingLazyMount label="Chargement de la vitrine…">
          <LandingVitrineSection />
        </LandingLazyMount>
        <Landing3DTeaserBand />
        <LandingLazyMount label="Chargement du simulateur IA…">
          <LandingAiSimulationShowcase />
        </LandingLazyMount>
        <FaqSection
          subtitle="Tout ce que vous devez savoir pour organiser votre événement en toute sérénité."
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
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Créer mon événement
                  </Button>
                )}
                <Button
                  href="/marketplace"
                  size="lg"
                  variant="secondary"
                  className="bg-stage-foreground/10 text-stage-foreground hover:bg-stage-foreground/20 border-stage-foreground/20 text-sm font-semibold"
                >
                  Explorer le marketplace
                </Button>
              </>
            )
          }
        />
      </main>

      <LandingDashboardQuickAccess />
      <SiteFooter faqHref="/#faq" />
    </div>
  );
}
