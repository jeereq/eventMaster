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
import { Button } from '@/components/ui';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { ArrowRight } from 'lucide-react';

// Chargement différé des sections sous la ligne de flottaison
const LandingAiSimulationShowcase = dynamic(
  () => import('@/components/landing/LandingAiSimulationShowcase'),
  {
    loading: () => <div className="py-12 text-center text-xs text-muted">Chargement du simulateur IA…</div>,
  },
);

const LandingVitrineSection = dynamic(
  () => import('@/components/landing/LandingVitrineSection'),
  {
    loading: () => <div className="py-12 text-center text-xs text-muted">Chargement de la vitrine…</div>,
  },
);

const LandingVisualBanner = dynamic(
  () => import('@/components/landing/LandingVisualBanner'),
  {
    loading: () => <div className="py-12 text-center text-xs text-muted">Chargement des inspirations…</div>,
  },
);

export default function Home() {
  const { user } = useAuth();
  const { site } = usePlatformSite();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans antialiased pb-16 md:pb-0">
      <SiteHeader variant="landing" />

      <main id="main-content" className="flex-1 flex flex-col">
        <LandingHeroStreamlined />
        <LandingVisualBanner />
        <LandingVitrineSection />
        <Landing3DTeaserBand />
        <LandingAiSimulationShowcase />
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
                  className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-sm font-semibold"
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
