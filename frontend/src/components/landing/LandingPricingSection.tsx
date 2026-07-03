'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import {
  LANDING_PLANS,
  FEATURE_COMPARISON,
  PLAN_IDS,
  ANNUAL_DISCOUNT_PERCENT,
  getPlanDisplayPrice,
  type BillingCycle,
  type PlanId,
} from '@/config/landingPricing';
import { PlanQuotaLimits } from '@/components/QuotaUsagePanel';

interface DbPlan {
  name?: string;
  price?: string;
  description?: string;
  maxEvents?: number;
  maxGuests?: number;
  maxTemplates?: number;
  maxRooms?: number;
  maxOrgManagers?: number;
  customTemplates?: boolean;
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

export default function LandingPricingSection({ dbPlans }: LandingPricingSectionProps) {
  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [showComparison, setShowComparison] = useState(false);

  const plans = useMemo(() => {
    return LANDING_PLANS.map((plan) => {
      const db = dbPlans?.[plan.id];
      return {
        ...plan,
        displayName: db?.name?.replace('Plan ', '') || plan.ms365Name,
        price: getPlanDisplayPrice(plan, billing, db?.price),
        description: db?.description || plan.tagline,
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

  const tiers: Array<{ label: string; ids: PlanId[] }> = [
    { label: 'Essentials & Business', ids: ['FREE', 'STANDARD'] },
    { label: 'Business Premium', ids: ['PREMIUM_1', 'PREMIUM_2'] },
    { label: 'Business Enterprise', ids: ['ENTERPRISE_1', 'ENTERPRISE_2', 'ENTERPRISE_3'] },
  ];

  return (
    <section id="tarifs" className="py-24 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
      <div className="w-10/12 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-4">
          <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            Forfaits & abonnements
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            Business Premium & Enterprise — une offre pour chaque ambition
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
            De Essentials à Business Enterprise 3 : événements, salles 2D, protocole QR et réseau commercial.
            Facturation annuelle avec <strong>{ANNUAL_DISCOUNT_PERCENT} %</strong> de réduction.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 mb-12">
          <div className="inline-flex items-center p-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
                billing === 'monthly'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Payer mensuellement
            </button>
            <button
              type="button"
              onClick={() => setBilling('annual')}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition flex items-center gap-2 ${
                billing === 'annual'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Payer annuellement
              <span className="text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                −{ANNUAL_DISCOUNT_PERCENT} %
              </span>
            </button>
          </div>
          <p className="text-xs text-slate-500">
            {billing === 'annual'
              ? `Équivalent mensuel avec ${ANNUAL_DISCOUNT_PERCENT} % de réduction · facturation annuelle`
              : 'Renouvellement mensuel · Licence activée par le Super Admin'}
          </p>
        </div>

        {tiers.map(({ label, ids }) => (
          <div key={label} className="mb-12 last:mb-8">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 text-center">
              {label}
            </h3>
            <div
              className={`grid gap-4 items-stretch ${
                ids.length === 2
                  ? 'md:grid-cols-2 max-w-3xl mx-auto'
                  : ids.length === 3
                    ? 'md:grid-cols-3'
                    : 'md:grid-cols-2 max-w-4xl mx-auto'
              }`}
            >
              {plans
                .filter((p) => ids.includes(p.id))
                .map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-lg border bg-white dark:bg-slate-900 transition-shadow ${
                      plan.highlighted
                        ? 'border-indigo-600 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-600/20'
                        : 'border-slate-200 dark:border-slate-800 hover:shadow-md'
                    }`}
                  >
                    {plan.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-sm whitespace-nowrap">
                        {plan.badge}
                      </div>
                    )}

                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{plan.displayName}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 min-h-[40px] leading-relaxed">
                        {plan.description}
                      </p>

                      <div className="mt-6 mb-6">
                        <div className="flex items-baseline gap-1 flex-wrap">
                          <span
                            className={`text-3xl font-bold tracking-tight ${
                              plan.highlighted ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {plan.price}
                          </span>
                          {plan.id !== 'FREE' && <span className="text-sm text-slate-500">/mois</span>}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{plan.monthlyNote}</p>
                      </div>

                      <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 flex-1 border-t border-slate-100 dark:border-slate-800 pt-4">
                        {plan.highlights.map((h) => (
                          <li key={h} className="flex gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            {h}
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

                    <div className="p-6 pt-0">
                      <Link
                        href={plan.ctaHref}
                        className={`block w-full text-center py-2.5 rounded-md text-sm font-semibold transition ${
                          plan.ctaVariant === 'outline'
                            ? 'border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                            : plan.ctaVariant === 'contact'
                              ? 'border border-slate-800 dark:border-slate-600 text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                              : plan.highlighted
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                : 'bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900'
                        }`}
                      >
                        {plan.cta}
                      </Link>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}

        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={() => setShowComparison(!showComparison)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-100/80 dark:hover:bg-slate-800/50 transition"
          >
            <span className="font-semibold text-slate-900 dark:text-white text-sm">
              Comparer tous les forfaits EventMaster
            </span>
            {showComparison ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {showComparison && (
            <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-800">
              <table className="w-full text-left min-w-[960px]">
                <thead>
                  <tr className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase sticky left-0 bg-white dark:bg-slate-900 z-10">
                      Fonctionnalité
                    </th>
                    {PLAN_IDS.map((id) => (
                      <th key={id} className="py-3 px-2 text-[10px] font-bold text-slate-900 dark:text-white text-center min-w-[88px]">
                        {LANDING_PLANS.find((p) => p.id === id)?.ms365Name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_COMPARISON.map((row, idx) => {
                    const prevCategory = idx > 0 ? FEATURE_COMPARISON[idx - 1].category : null;
                    const showCategory = row.category !== prevCategory;
                    return (
                      <React.Fragment key={`${row.category}-${row.label}`}>
                        {showCategory && (
                          <tr className="bg-slate-100/80 dark:bg-slate-800/40">
                            <td colSpan={PLAN_IDS.length + 1} className="py-2 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              {row.category}
                            </td>
                          </tr>
                        )}
                        <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950/30">
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

        <p className="text-center text-xs text-slate-400 mt-8 max-w-2xl mx-auto leading-relaxed">
          Réduction annuelle de {ANNUAL_DISCOUNT_PERCENT} % sur l&apos;équivalent mensuel. Tous les forfaits incluent
          l&apos;isolation multi-tenant et le portail RSVP invité.
        </p>
      </div>
    </section>
  );
}
