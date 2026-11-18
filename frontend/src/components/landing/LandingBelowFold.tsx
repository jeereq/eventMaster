'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import LandingTrustPricingBand from '@/components/landing/LandingTrustPricingBand';
import PublicCtaBand from '@/components/PublicCtaBand';
import SiteFooter from '@/components/SiteFooter';
import LandingToolsGrid from '@/components/landing/LandingToolsGrid';
import LandingFeatureBlocks from '@/components/landing/LandingFeatureBlocks';
import LandingRoomEditorSection from '@/components/landing/LandingRoomEditorSection';
import LandingWhyCards from '@/components/landing/LandingWhyCards';
import LandingDashboardQuickAccess from '@/components/landing/LandingDashboardQuickAccess';
import { Button } from '@/components/ui';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { ArrowRight } from '@/components/icons';

/** Sous le haut de page : grille des outils, un bloc par outil, forfaits. */
export default function LandingBelowFold() {
  const { user } = useAuth();
  const { site } = usePlatformSite();

  return (
    <>
      <LandingToolsGrid />
      <LandingFeatureBlocks />
      <LandingRoomEditorSection />
      <LandingWhyCards />
      <LandingTrustPricingBand />
      <PublicCtaBand
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
                className="bg-transparent text-white border-[#6ee6b6] hover:bg-white/10 text-sm font-semibold"
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
