'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight } from '@/components/icons';
import { usePlanCatalog, type PlanCatalog } from '@/hooks/usePlanCatalog';
import {
  LANDING_PLANS,
  formatFc,
  resolvePlanMonthlyFc,
  type PlanAudience,
} from '@/config/landingPricing';

/**
 * Prix d’entrée d’une famille de forfaits : le moins cher des forfaits payants.
 * Prix et audience viennent de la base ; landingPricing.ts sert uniquement si l’API a échoué.
 */
function entryPrice(audiences: PlanAudience[], dbPlans: PlanCatalog | null): number | null {
  const candidates: Array<{ audience?: string; amountFc: number }> = dbPlans
    ? Object.entries(dbPlans)
        .filter(([id]) => id !== 'FREE')
        .map(([id, db]) => ({
          audience: db.audience ?? LANDING_PLANS.find((plan) => plan.id === id)?.audience,
          amountFc: resolvePlanMonthlyFc({ monthlyPriceFc: 0 }, db),
        }))
    : LANDING_PLANS.filter((plan) => plan.id !== 'FREE').map((plan) => ({
        audience: plan.audience,
        amountFc: plan.monthlyPriceFc,
      }));
  let best: number | null = null;
  for (const { audience, amountFc } of candidates) {
    if (!audience || !audiences.includes(audience as PlanAudience) || amountFc <= 0) continue;
    if (best == null || amountFc < best) best = amountFc;
  }
  return best;
}

/**
 * Forfaits de l’accueil : prix d’entrée par profil, en francs congolais.
 * Les moyens de paiement et canaux d’envoi sont dans LandingWhyCards.
 */
export default function LandingTrustPricingBand() {
  const { plans: dbPlans, loading } = usePlanCatalog();

  const offers = useMemo(() => {
    const rows: Array<{ label: string; price: string | null; note: string }> = [
      { label: 'Découverte', price: 'Gratuit', note: 'sans carte bancaire' },
    ];
    const families: Array<{ label: string; audiences: PlanAudience[]; note: string }> = [
      { label: 'Particulier', audiences: ['B2C'], note: 'par trimestre' },
      { label: 'Business', audiences: ['B2B'], note: 'par mois' },
      { label: 'Salle ou métier', audiences: ['VENUE', 'SERVICE', 'CATALOG'], note: 'par mois' },
    ];
    for (const family of families) {
      // Catalogue en cours de chargement : squelette plutôt que des prix codés en dur.
      if (loading) {
        rows.push({ label: family.label, price: null, note: family.note });
        continue;
      }
      const amountFc = entryPrice(family.audiences, dbPlans);
      if (amountFc == null) continue;
      // Forfaits Particulier facturés au trimestre : on donne aussi l’équivalent mensuel pour comparer avec les autres.
      const note = family.audiences.includes('B2C')
        ? `par trimestre, soit ${formatFc(Math.round(amountFc / 3))}/mois`
        : family.note;
      rows.push({ label: family.label, price: `dès ${formatFc(amountFc)}`, note });
    }
    return rows;
  }, [dbPlans, loading]);

  return (
    <section
      id="tarifs"
      aria-labelledby="landing-trust-title"
      className="em-landing-defer scroll-mt-16 md:scroll-mt-24 py-14 sm:py-20 bg-surface border-y border-border"
    >
      <div className="page-container space-y-6 sm:space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="landing-trust-title" data-reveal className="em-landing-heading text-3xl sm:text-4xl text-foreground max-w-[20ch]">
            <span className="font-normal">Des forfaits clairs,</span> en francs congolais
          </h2>
          <Link
            href="/tarifs"
            className="inline-flex items-center gap-1.5 min-h-11 text-sm font-semibold text-primary hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Comparer les forfaits
            <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </div>
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" role="list">
          {offers.map((offer, index) => (
            <li
              key={offer.label}
              data-reveal
              style={{ '--i': index } as React.CSSProperties}
              className="rounded-[1.5rem] border border-border bg-background p-5 sm:p-6 space-y-1.5"
            >
              <p className="text-sm font-semibold text-primary">{offer.label}</p>
              {offer.price == null ? (
                <span className="block h-7 w-28 rounded bg-border/60 animate-pulse" aria-label="Chargement du prix" />
              ) : (
                <p className="font-display text-2xl font-semibold tabular-nums leading-tight text-foreground">{offer.price}</p>
              )}
              <p className="text-sm text-muted">{offer.note}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
