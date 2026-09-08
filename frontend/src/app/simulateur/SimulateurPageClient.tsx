'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import PublicCtaBand from '@/components/PublicCtaBand';
import EventPrepAiSimulator from '@/components/EventPrepAiSimulator';
import { api } from '@/lib/api';
import { claimAiTokenCheckoutReturn, syncDeviceAiTokensWithBackend } from '@/lib/aiTokens';
import { Store, Sparkles, Wallet } from 'lucide-react';

export default function SimulateurPageClient() {
  useEffect(() => {
    claimAiTokenCheckoutReturn();
    void syncDeviceAiTokensWithBackend(api);
  }, []);

  return (
    <PublicPageShell faqHref="/faq" mobileFooterPad>
      <PublicPageHero
        title="Trois formules budget, à partir du catalogue réel"
        description="Décrivez la fête : ville, invités, enveloppe. L’IA compose Éco, Équilibré et Confort avec des salles et prestataires EventMaster. Quatre simulations gratuites, sans compte."
        compact
      >
        <div className="pt-1 flex flex-wrap items-center gap-2.5">
          <Link
            href="#simulateur"
            className="inline-flex min-h-11 items-center gap-1.5 px-4 rounded-full bg-primary-solid text-primary-foreground text-xs font-semibold hover:bg-primary-solid-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden />
            Lancer une simulation
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex min-h-11 items-center gap-1.5 px-4 rounded-full bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Store className="w-3.5 h-3.5" aria-hidden />
            Explorer le marketplace
          </Link>
        </div>
      </PublicPageHero>

      <div className="page-container pb-10 sm:pb-14">
        <section
          id="simulateur"
          className="scroll-mt-24 max-w-5xl mx-auto rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-6"
        >
          <EventPrepAiSimulator embedded defaultOpen />
        </section>
      </div>

      <PublicCtaBand
        title="Retenez un pack, puis envoyez les devis"
        description="Un compte client gratuit enregistre vos formules, ouvre les fiches et envoie les demandes. Le paiement des acomptes se fait directement avec le professionnel."
        highlights={[
          { icon: Sparkles, label: '3 formules chiffrées en FC' },
          { icon: Store, label: 'Salles, métiers et matériel réels' },
          { icon: Wallet, label: 'Jetons rechargeables en Mobile Money' },
        ]}
        primaryHref="/register?kind=CLIENT&intent=seeker&action=ai_simulator"
        primaryLabel="Créer un compte client"
        secondaryHref="/marketplace"
        secondaryLabel="Voir le marketplace"
      />
    </PublicPageShell>
  );
}
