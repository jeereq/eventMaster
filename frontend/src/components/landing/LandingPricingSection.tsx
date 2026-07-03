'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Minus, ChevronDown, ChevronUp, Sparkles, Tag } from 'lucide-react';
import {
  LANDING_PLANS,
  FEATURE_COMPARISON,
  PLAN_IDS,
  ANNUAL_DISCOUNT_PERCENT,
  getPlanDisplayPrice,
  getPlanCapabilityBadges,
  parsePriceFc,
  computePromoSavingsPercent,
  planTierLabel,
  type BillingCycle,
  type PlanId,
  type PlanCapabilityBadge,
} from '@/config/landingPricing';
import { PlanQuotaLimits } from '@/components/QuotaUsagePanel';

interface DbPlan {
  name?: string;
  price?: string;
  monthlyPriceFc?: number;
  promoActive?: boolean;
  promoPrice?: string;
  promoMonthlyPriceFc?: number;
  promoLabel?: string;
  description?: string;
  maxEvents?: number;
  maxGuests?: number;
  maxTemplates?: number;
  maxRooms?: number;
  maxOrgManagers?: number;
  customTemplates?: boolean;
  mockupOcr?: boolean;
  commercialNetwork?: boolean;
}

function parseComparisonQuota(planId: PlanId, label: string): number {
  const row = FEATURE_COMPARISON.find((r) => r.label === label);
  const value = row?.values[planId];
  if (typeof value !== 'string') return 0;
  if (value === 'Illimité') return 9999;
  return parseInt(value.replace(/\s/g, ''), 10) || 0;
}

interface LandingPricingSectionProps {
  dbPlans: Record<string, DbPlan> | null;
}

function FeatureCell({ value }: { value: string | boolean }) {
  if (value === true) {
    return <Check className="w-4 h-4 text-emerald-600 mx-auto" aria-label="Inclus" />;
  }
  if (value === false) {
    return <Minus className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" aria-label="Non inclus" />;
  }
  return <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{value}</span>;
}

const BADGE_TONE: Record<PlanCapabilityBadge['tone'], string> = {
  indigo: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/50',
  violet: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-100 dark:border-violet-900/50',
  emerald: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/50',
  amber: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-100 dark:border-amber-900/50',
  rose: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-900/50',
};

const TIER_ACCENT: Record<string, string> = {
  essentials: 'from-slate-400 to-slate-500',
  business: 'from-blue-500 to-indigo-600',
  premium: 'from-indigo-500 to-violet-600',
  enterprise: 'from-violet-600 to-fuchsia-700',
};

export default function LandingPricingSection({ dbPlans }: LandingPricingSectionProps) {
  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [showComparison, setShowComparison] = useState(false);

  const plans = useMemo(() => {
    return LANDING_PLANS.map((plan) => {
      const db = dbPlans?.[plan.id];
      const promoActive = Boolean(db?.promoActive && db?.promoMonthlyPriceFc != null && plan.id !== 'FREE');
      const catalogPrice = getPlanDisplayPrice(plan, billing, db?.price);
      const promoPriceStr =
        db?.promoPrice ||
        (db?.promoMonthlyPriceFc != null ? `${db.promoMonthlyPriceFc.toLocaleString('fr-FR')} FC` : undefined);
      const promoPriceLabel =
        promoActive && promoPriceStr ? getPlanDisplayPrice(plan, billing, promoPriceStr) : null;

      const catalogFc =
        db?.monthlyPriceFc ??
        (db?.price ? parsePriceFc(db.price) : plan.monthlyPriceFc);
      const promoFc = db?.promoMonthlyPriceFc ?? (promoPriceStr ? parsePriceFc(promoPriceStr) : 0);
      const promoSavingsPercent =
        promoActive && billing === 'monthly'
          ? computePromoSavingsPercent(catalogFc, promoFc)
          : null;

      const badges = getPlanCapabilityBadges(plan.id);

      return {
        ...plan,
        displayName: db?.name?.replace('Plan ', '') || plan.ms365Name,
        tierLabel: planTierLabel(plan.tier),
        price: promoActive && promoPriceLabel ? promoPriceLabel : catalogPrice,
        catalogPrice: promoActive ? catalogPrice : null,
        promoActive,
        promoLabel: db?.promoLabel || 'Offre promotionnelle',
        promoSavingsPercent,
        description: db?.description || plan.tagline,
        badges,
        limits: {
          events: db?.maxEvents ?? parseComparisonQuota(plan.id, 'Événements actifs'),
          guests: db?.maxGuests ?? parseComparisonQuota(plan.id, 'Invités (quota org.)'),
          templates: db?.maxTemplates ?? parseComparisonQuota(plan.id, "Modèles d'invitation"),
          rooms: db?.maxRooms ?? parseComparisonQuota(plan.id, 'Salles organisation'),
          orgManagers: db?.maxOrgManagers ?? parseComparisonQuota(plan.id, 'Managers organisation'),
          customTemplates: db?.customTemplates,
        },
      };
    });
  }, [dbPlans, billing]);

  const activePromos = useMemo(
    () => plans.filter((p) => p.promoActive && p.id !== 'FREE'),
    [plans],
  );

  const tiers: Array<{ label: string; ids: PlanId[]; description?: string }> = [
    {
      label: 'Essentials & Business',
      ids: ['FREE', 'STANDARD'],
      description: 'Démarrer et professionnaliser vos premiers événements',
    },
    {
      label: 'Business Premium',
      ids: ['PREMIUM_1', 'PREMIUM_2'],
      description: 'Éditeur visuel, import maquette, RSVP analytique et salles 2D avancées',
    },
    {
      label: 'Business Enterprise',
      ids: ['ENTERPRISE_1', 'ENTERPRISE_2', 'ENTERPRISE_3'],
      description: 'Volume, rapports, réseau commercial et accompagnement dédié',
    },
  ];

  return (
    <section
      id="tarifs"
      className="py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 border-t border-slate-200 dark:border-slate-800"
    >
      <div className="w-10/12 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-4">
          <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            Forfaits & abonnements
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            Une offre calibrée sur vos ambitions événementielles
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
            De Essentials à Enterprise 3 : invitations personnalisées, protocole QR, salles 2D,
            formulaires RSVP exportables et réseau commercial. Facturation annuelle avec{' '}
            <strong className="text-emerald-600 dark:text-emerald-400">{ANNUAL_DISCOUNT_PERCENT} %</strong> de réduction.
          </p>
        </div>

        {activePromos.length > 0 && (
          <div className="mb-10 max-w-3xl mx-auto rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-gradient-to-r from-rose-50 via-white to-rose-50 dark:from-rose-950/30 dark:via-slate-900 dark:to-rose-950/20 p-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 shrink-0">
              <Tag className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-rose-800 dark:text-rose-200">
                Promotions en cours sur {activePromos.length} forfait{activePromos.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-rose-700/80 dark:text-rose-300/80 mt-1">
                {activePromos.map((p) => p.displayName).join(' · ')} — tarifs réduits affichés ci-dessous.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-3 mb-14">
          <div className="inline-flex items-center p-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition ${
                billing === 'monthly'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Mensuel
            </button>
            <button
              type="button"
              onClick={() => setBilling('annual')}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition flex items-center gap-2 ${
                billing === 'annual'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Annuel
              <span className="text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                −{ANNUAL_DISCOUNT_PERCENT} %
              </span>
            </button>
          </div>
          <p className="text-xs text-slate-500 max-w-md text-center">
            {billing === 'annual'
              ? `Équivalent mensuel avec ${ANNUAL_DISCOUNT_PERCENT} % de réduction · facturation annuelle`
              : 'Renouvellement mensuel · activation par le Super Admin après demande'}
          </p>
        </div>

        {tiers.map(({ label, ids, description }) => (
          <div key={label} className="mb-16 last:mb-10">
            <div className="text-center mb-6 space-y-1">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">{label}</h3>
              {description && (
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xl mx-auto">{description}</p>
              )}
            </div>
            <div
              className={`grid gap-5 items-stretch ${
                ids.length === 2
                  ? 'md:grid-cols-2 max-w-4xl mx-auto'
                  : ids.length === 3
                    ? 'md:grid-cols-2 lg:grid-cols-3'
                    : 'md:grid-cols-2 max-w-4xl mx-auto'
              }`}
            >
              {plans
                .filter((p) => ids.includes(p.id))
                .map((plan) => (
                  <article
                    key={plan.id}
                    className={`relative flex flex-col rounded-2xl border bg-white dark:bg-slate-900 overflow-hidden transition-all duration-300 ${
                      plan.highlighted
                        ? 'border-indigo-500 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/20 scale-[1.02] z-10'
                        : plan.promoActive
                          ? 'border-rose-200 dark:border-rose-900/40 shadow-md hover:shadow-lg'
                          : 'border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className={`h-1.5 w-full bg-gradient-to-r ${TIER_ACCENT[plan.tier]}`} />

                    {plan.badge && (
                      <div className="absolute top-4 right-4 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                        <Sparkles className="w-3 h-3" />
                        {plan.badge}
                      </div>
                    )}

                    <div className="p-6 sm:p-7 flex-1 flex flex-col">
                      <div className="space-y-1 pr-16">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {plan.tierLabel}
                        </span>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.displayName}</h3>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 min-h-[36px] leading-relaxed">
                        {plan.description}
                      </p>

                      {plan.badges.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-4">
                          {plan.badges.slice(0, 4).map((badge) => (
                            <span
                              key={badge.id}
                              className={`inline-flex text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${BADGE_TONE[badge.tone]}`}
                            >
                              {badge.label}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-6 mb-5">
                        {plan.promoActive && plan.catalogPrice && (
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 px-2.5 py-1 rounded-full">
                              {plan.promoLabel}
                            </span>
                            {plan.promoSavingsPercent != null && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                −{plan.promoSavingsPercent} %
                              </span>
                            )}
                            <span className="text-sm text-slate-400 line-through">{plan.catalogPrice}</span>
                          </div>
                        )}
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span
                            className={`text-4xl font-black tracking-tight ${
                              plan.highlighted
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : plan.promoActive
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {plan.price}
                          </span>
                          {plan.id !== 'FREE' && (
                            <span className="text-sm font-medium text-slate-500">/ mois</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5">{plan.monthlyNote}</p>
                        {billing === 'annual' && plan.id !== 'FREE' && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                            Facturé annuellement · {ANNUAL_DISCOUNT_PERCENT} % d&apos;économie vs mensuel
                          </p>
                        )}
                      </div>

                      <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 flex-1">
                        {plan.highlights.map((h) => (
                          <li key={h} className="flex gap-2.5">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{h}</span>
                          </li>
                        ))}
                      </ul>

                      {(plan.limits.events > 0 || plan.limits.templates > 0) && (
                        <PlanQuotaLimits
                          compact
                          maxEvents={plan.limits.events}
                          maxGuests={plan.limits.guests}
                          maxTemplates={plan.limits.templates}
                          maxRooms={plan.limits.rooms}
                          maxOrgManagers={plan.limits.orgManagers}
                        />
                      )}
                    </div>

                    <div className="px-6 sm:px-7 pb-6 sm:pb-7 pt-0">
                      <Link
                        href={plan.ctaHref}
                        className={`block w-full text-center py-3 rounded-xl text-sm font-bold transition ${
                          plan.ctaVariant === 'outline'
                            ? 'border-2 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                            : plan.ctaVariant === 'contact'
                              ? 'border-2 border-slate-800 dark:border-slate-500 text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                              : plan.highlighted
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20'
                                : plan.promoActive
                                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md'
                                  : 'bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900'
                        }`}
                      >
                        {plan.cta}
                      </Link>
                    </div>
                  </article>
                ))}
            </div>
          </div>
        ))}

        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/80 shadow-sm">
          <button
            type="button"
            onClick={() => setShowComparison(!showComparison)}
            className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
          >
            <div>
              <span className="font-bold text-slate-900 dark:text-white text-sm block">
                Comparer tous les forfaits EventMaster
              </span>
              <span className="text-xs text-slate-500 mt-0.5 block">
                Modèles custom, OCR, RSVP analytique, protocole, commercial…
              </span>
            </div>
            {showComparison ? (
              <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
            )}
          </button>

          {showComparison && (
            <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-800">
              <table className="w-full text-left min-w-[960px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase sticky left-0 bg-slate-50 dark:bg-slate-900 z-10">
                      Fonctionnalité
                    </th>
                    {PLAN_IDS.map((id) => {
                      const p = plans.find((x) => x.id === id);
                      return (
                        <th
                          key={id}
                          className="py-3 px-2 text-center min-w-[92px] align-bottom"
                        >
                          <span className="text-[10px] font-bold text-slate-900 dark:text-white block">
                            {p?.displayName}
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">
                            {p?.price}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_COMPARISON.map((row, idx) => {
                    const prevCategory = idx > 0 ? FEATURE_COMPARISON[idx - 1].category : null;
                    const showCategory = row.category !== prevCategory;
                    return (
                      <React.Fragment key={`${row.category}-${row.label}`}>
                        {showCategory && (
                          <tr className="bg-indigo-50/50 dark:bg-indigo-950/20">
                            <td
                              colSpan={PLAN_IDS.length + 1}
                              className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400"
                            >
                              {row.category}
                            </td>
                          </tr>
                        )}
                        <tr className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <td className="py-2.5 px-4 text-xs text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-950/30">
                            {row.label}
                          </td>
                          {PLAN_IDS.map((id) => (
                            <td key={id} className="py-2.5 px-2 text-center">
                              <FeatureCell value={row.values[id]} />
                            </td>
                          ))}
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-10 max-w-2xl mx-auto leading-relaxed">
          Réduction annuelle de {ANNUAL_DISCOUNT_PERCENT} % sur l&apos;équivalent mensuel. Promotions configurables
          par l&apos;administrateur. Tous les forfaits incluent l&apos;isolation multi-tenant et le portail RSVP invité.
        </p>
      </div>
    </section>
  );
}
