'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Mail, MessageCircle, MessageSquare, ShieldCheck, Wallet } from 'lucide-react';
import { FLEXPAY_MOBILE_OPERATORS } from '@/lib/flexPayOperators';
import { usePlanCatalog, type PlanCatalog } from '@/hooks/usePlanCatalog';
import {
  LANDING_PLANS,
  formatFc,
  resolvePlanMonthlyFc,
  type PlanAudience,
} from '@/config/landingPricing';

const PAYMENT_METHODS: string[] = [...FLEXPAY_MOBILE_OPERATORS, 'Visa', 'Mastercard'];

const INVITATION_CHANNELS = [
  { label: 'WhatsApp', icon: MessageCircle },
  { label: 'SMS', icon: MessageSquare },
  { label: 'E-mail', icon: Mail },
];

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
 * Bandeau de confiance de l’accueil : prix d’entrée par profil, moyens de paiement
 * et canaux d’invitation. Répond aux deux questions posées avant l’inscription :
 * « combien ça coûte ? » et « comment je paie / j’invite ? ».
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
      className="em-landing-defer scroll-mt-16 md:scroll-mt-24 py-8 sm:py-14 border-t border-border bg-surface/80 dark:bg-background/80"
    >
      <div className="page-container grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <h2 id="landing-trust-title" className="em-landing-heading text-xl sm:text-2xl text-foreground">
                Des forfaits clairs, en francs congolais
              </h2>
              <p className="text-sm text-muted">Commencez gratuitement, passez au forfait adapté quand vous êtes prêt.</p>
            </div>
            <Link
              href="/tarifs"
              className="inline-flex items-center gap-1.5 min-h-11 text-sm font-semibold text-primary hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Comparer les forfaits
              <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
          <ul className="grid grid-cols-2 lg:grid-cols-4 gap-2.5" role="list">
            {offers.map((offer) => (
              <li
                key={offer.label}
                className="rounded-[var(--radius-card)] border border-border bg-background p-3.5 space-y-1"
              >
                <p className="text-xs font-semibold text-primary">{offer.label}</p>
                {offer.price == null ? (
                  <span className="block h-5 w-24 rounded bg-border/60 animate-pulse" aria-label="Chargement du prix" />
                ) : (
                  <p className="text-base font-bold text-foreground tabular-nums leading-tight">{offer.price}</p>
                )}
                <p className="text-xs text-muted">{offer.note}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-6 space-y-5">
          <div className="space-y-2.5">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Wallet className="w-4 h-4 text-primary shrink-0" aria-hidden />
              Paiement sécurisé via FlexPay
            </p>
            <ul className="flex flex-wrap gap-2" role="list">
              {PAYMENT_METHODS.map((method) => (
                <li
                  key={method}
                  className="inline-flex items-center min-h-8 px-2.5 rounded-full border border-border bg-background text-xs font-semibold text-foreground"
                >
                  {method}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2.5">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" aria-hidden />
              Invitations et billets envoyés par
            </p>
            <ul className="flex flex-wrap gap-2" role="list">
              {INVITATION_CHANNELS.map(({ label, icon: Icon }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-1.5 min-h-8 px-2.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary"
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
