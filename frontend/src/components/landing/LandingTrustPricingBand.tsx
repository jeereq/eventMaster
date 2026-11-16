'use client';
import { useMessagingChannels } from '@/hooks/useMessagingChannels';

import React, { useMemo, useRef } from 'react';
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
import { useHideAiFabWhileVisible } from '@/components/landing/useHideAiFabWhileVisible';

const PAYMENT_METHODS: string[] = [...FLEXPAY_MOBILE_OPERATORS, 'Visa', 'Mastercard'];

const INVITATION_CHANNELS = [
  { id: 'WHATSAPP' as const, label: 'WhatsApp', icon: MessageCircle },
  { id: 'SMS' as const, label: 'SMS', icon: MessageSquare },
  { id: 'EMAIL' as const, label: 'E-mail', icon: Mail },
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
  const messaging = useMessagingChannels();
  const { plans: dbPlans, loading } = usePlanCatalog();
  const sectionRef = useRef<HTMLElement>(null);
  useHideAiFabWhileVisible(sectionRef);

  const offers = useMemo(() => {
    const rows: Array<{ label: string; price: string | null; note: string; hint?: string; highlight?: boolean }> = [
      { label: 'Découverte', price: 'Gratuit', note: 'sans carte bancaire', highlight: true },
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
      const hint = family.audiences.includes('B2C')
        ? `soit ${formatFc(Math.round(amountFc / 3))}/mois`
        : undefined;
      rows.push({ label: family.label, price: `dès ${formatFc(amountFc)}`, note: family.note, hint });
    }
    return rows;
  }, [dbPlans, loading]);

  const channels = INVITATION_CHANNELS.filter(({ id }) => messaging.has(id));

  return (
    <section
      ref={sectionRef}
      id="tarifs"
      aria-labelledby="landing-trust-title"
      className="em-landing-defer scroll-mt-16 md:scroll-mt-24 py-8 sm:py-14 border-t border-border bg-surface/80 dark:bg-background/80"
    >
      <div className="page-container">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden">
          <div className="p-5 sm:p-8 space-y-5 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div className="space-y-1.5">
                <h2 id="landing-trust-title" className="em-landing-heading text-xl sm:text-3xl text-foreground text-balance">
                  Des forfaits clairs, en francs congolais
                </h2>
                <p className="text-sm sm:text-base text-muted text-pretty">
                  Commencez gratuitement, passez au forfait adapté quand vous êtes prêt.
                </p>
              </div>
              <Link
                href="/tarifs"
                className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 min-h-11 px-4 rounded-[var(--radius-button)] border border-primary/30 bg-primary/5 text-sm font-semibold text-primary hover:bg-primary/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Comparer les forfaits
                <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </div>

            <ul className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3" role="list">
              {offers.map((offer) => (
                <li
                  key={offer.label}
                  className={`flex flex-col gap-1.5 rounded-[var(--radius-card)] border p-3.5 sm:p-5 ${
                    offer.highlight
                      ? 'border-primary/30 bg-primary/5 dark:bg-primary/10'
                      : 'border-border bg-background'
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">{offer.label}</p>
                  {offer.price == null ? (
                    <span className="block h-7 w-28 rounded bg-border/60 animate-pulse" aria-label="Chargement du prix" />
                  ) : (
                    <p className="text-lg sm:text-2xl font-bold text-foreground tabular-nums leading-tight tracking-tight">
                      {offer.price}
                    </p>
                  )}
                  <p className="text-xs sm:text-sm text-muted">{offer.note}</p>
                  {offer.hint ? (
                    <p className="mt-auto pt-1 text-xs font-medium text-foreground/70 tabular-nums">{offer.hint}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <div
            className={`grid gap-5 border-t border-border bg-surface-muted/40 dark:bg-surface-muted/20 p-5 sm:px-8 sm:py-6 ${
              messaging.any && channels.length > 0 ? 'md:grid-cols-[minmax(0,1fr)_auto] md:gap-8' : ''
            }`}
          >
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Wallet className="w-4 h-4 text-primary shrink-0" aria-hidden />
                Paiement sécurisé via FlexPay
              </p>
              <ul className="flex flex-wrap gap-2" role="list">
                {PAYMENT_METHODS.map((method) => (
                  <li
                    key={method}
                    className="inline-flex items-center min-h-8 px-3 rounded-full border border-border bg-surface text-xs font-semibold text-foreground"
                  >
                    {method}
                  </li>
                ))}
              </ul>
            </div>
            {messaging.any && channels.length > 0 && (
              <div className="space-y-3 md:border-l md:border-border md:pl-8">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0" aria-hidden />
                  Invitations et billets envoyés par
                </p>
                <ul className="flex flex-wrap gap-2" role="list">
                  {channels.map(({ label, icon: Icon }) => (
                    <li
                      key={label}
                      className="inline-flex items-center gap-1.5 min-h-8 px-3 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary"
                    >
                      <Icon className="w-3.5 h-3.5" aria-hidden />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
