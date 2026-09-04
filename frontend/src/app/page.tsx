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
import { Button, Skeleton } from '@/components/ui';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { ArrowRight } from 'lucide-react';

// Chargement différé des sections sous la ligne de flottaison
function LandingSectionFallback({ label }: { label: string }) {
  return (
    <div className="page-container py-14 sm:py-20" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="max-w-xl mx-auto space-y-3">
        <Skeleton className="h-5 w-36 mx-auto rounded-full" />
        <Skeleton className="h-8 w-4/5 mx-auto" />
        <Skeleton className="h-4 w-full max-w-md mx-auto" />
      </div>
      <div className="mt-10 grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Skeleton className="aspect-[16/10] rounded-[var(--radius-card)]" />
        <Skeleton className="aspect-[16/10] rounded-[var(--radius-card)]" />
        <Skeleton className="hidden lg:block aspect-[16/10] rounded-[var(--radius-card)]" />
      </div>
    </div>
  );
}

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
