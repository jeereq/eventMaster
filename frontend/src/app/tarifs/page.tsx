'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import LandingPricingSection from '@/components/landing/LandingPricingSection';
import FaqSection from '@/components/landing/FaqSection';
import PublicCtaBand from '@/components/PublicCtaBand';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, Sparkles, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui';

export default function TarifsPage() {
  const { user } = useAuth();
  const [dbPlans, setDbPlans] = useState<any>(null);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const plansData = await api.get('/public/plans');
        if (plansData) setDbPlans(plansData);
      } catch {
        /* offline — tarifs fallback configurés dans landingPricing.ts */
      }
    }
    void fetchPlans();
  }, []);

  return (
    <PublicPageShell
      faqHref="#faq"
      mobileFooterPad
    >
      <PublicPageHero
        chip="Tarification Transparente"
        title="Des forfaits clairs et adaptés à votre événement"
        description="Sans engagement, sans frais cachés. Paiement simplifié par Mobile Money (M-Pesa, Orange Money, Airtel Money) ou carte bancaire en Francs Congolais (FC)."
        compact
      >
        <div className="pt-1 flex flex-wrap items-center gap-2.5">
          <Link
            href={user ? '/dashboard/billing' : '/register'}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover active:scale-95 transition shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{user ? 'Gérer mon abonnement' : 'Commencer gratuitement'}</span>
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface border border-border text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Besoin d'un accompagnement sur-mesure ?</span>
          </Link>
        </div>
      </PublicPageHero>

      <div className="space-y-12">
        <LandingPricingSection
          dbPlans={dbPlans}
          defaultAudience="B2C"
          lead="Le compte client est 100% gratuit pour chercher des prestataires et créer des favoris. Choisissez un forfait ci-dessous pour débloquer la gestion d'invitations, le placement 2D/3D et le scan QR le jour J."
        />

        <div className="page-container py-4">
          <FaqSection
            id="faq"
            title="Questions fréquentes sur les tarifs"
            subtitle="Modalités de paiement, activation immédiate et conditions de résiliation."
            itemIds={['pricing', 'mobile-money', 'trial', 'upgrade', 'support']}
          />
        </div>

        <PublicCtaBand
          title="Une question avant de choisir votre forfait ?"
          description="Notre équipe à Kinshasa et Lubumbashi est disponible pour vous conseiller et vous guider."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/contact">
                <Button size="lg" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Contacter un conseiller
                </Button>
              </Link>
              <Link href="/marketplace">
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-sm font-semibold"
                >
                  Explorer le marketplace
                </Button>
              </Link>
            </div>
          }
        />
      </div>
    </PublicPageShell>
  );
}
