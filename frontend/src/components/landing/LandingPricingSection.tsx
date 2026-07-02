'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import {
  LANDING_PLANS,
  FEATURE_COMPARISON,
  type BillingCycle,
} from '@/config/landingPricing';

interface DbPlan {
  name?: string;
  price?: string;
  description?: string;
  maxEvents?: number;
  maxGuests?: number;
  maxTemplates?: number;
  customTemplates?: boolean;
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
        price: billing === 'monthly'
          ? (db?.price && plan.id !== 'FREE' ? db.price : plan.monthlyPrice)
          : plan.annualPrice,
        description: db?.description || plan.tagline,
        limits: db
          ? {
              events: db.maxEvents,
              guests: db.maxGuests,
              templates: db.maxTemplates,
              customTemplates: db.customTemplates,
            }
          : null,
      };
    });
  }, [dbPlans, billing]);

  const planIds = ['FREE', 'STANDARD', 'PREMIUM', 'ENTERPRISE'] as const;

  return (
    <section id="tarifs" className="py-24 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
      <div className="w-10/12 max-w-7xl mx-auto">
        {/* En-tête style Microsoft 365 */}
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-4">
          <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            Forfaits & abonnements
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            Choisissez le forfait EventMaster<br className="hidden sm:block" /> adapté à votre organisation
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
            Tarification transparente par organisation, inspirée des abonnements Microsoft 365 :
            commencez gratuitement, évoluez avec vos événements et débloquez le protocole QR et les salles 2D avancées.
          </p>
        </div>

        {/* Toggle Mensuel / Annuel — comme MS365 */}
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
                −17 %
              </span>
            </button>
          </div>
          <p className="text-xs text-slate-500">
            {billing === 'annual'
              ? 'Facturation annuelle — équivalent mensuel affiché. Contactez-nous pour Enterprise.'
              : 'Renouvellement mensuel · Licence 30 jours activée par le Super Admin'}
          </p>
        </div>

        {/* Cartes forfaits — grille MS365 */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5 items-stretch mb-8">
          {plans.map((plan) => (
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 min-h-[40px] leading-relaxed">{plan.description}</p>

                <div className="mt-6 mb-6">
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className={`text-3xl font-bold tracking-tight ${plan.highlighted ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                      {plan.price}
                    </span>
                    {plan.id !== 'FREE' && plan.id !== 'ENTERPRISE' && (
                      <span className="text-sm text-slate-500">/mois</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{plan.monthlyNote}</p>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 flex-1 border-t border-slate-100 dark:border-slate-800 pt-4">
                  {plan.limits && (
                    <>
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />{(plan.limits.events ?? 0) >= 9999 ? 'Événements illimités' : `${plan.limits.events} événements`}</li>
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />{(plan.limits.guests ?? 0) >= 9999 ? 'Invités illimités' : `${plan.limits.guests} invités`}</li>
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />{plan.limits.customTemplates ? 'Modèles custom' : `${plan.limits.templates} modèles`}</li>
                    </>
                  )}
                  {plan.id === 'STANDARD' && (
                    <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />Protocole QR & émargement</li>
                  )}
                  {plan.id === 'PREMIUM' && (
                    <>
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />Salles 2D avancées + thèmes</li>
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />Rôles manager & protocole</li>
                    </>
                  )}
                  {plan.id === 'ENTERPRISE' && (
                    <>
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />Réseau commercial intégré</li>
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />Support dédié & SLA</li>
                    </>
                  )}
                </ul>
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

        {/* Tableau comparatif — style MS365 "Compare plans" */}
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
              <table className="w-full text-left min-w-[640px]">
                <thead>
                  <tr className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase w-[40%]">Fonctionnalité</th>
                    {planIds.map((id) => (
                      <th key={id} className="py-3 px-3 text-xs font-bold text-slate-900 dark:text-white text-center">
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
                            <td colSpan={5} className="py-2 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              {row.category}
                            </td>
                          </tr>
                        )}
                        <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950/30">
                          <td className="py-2.5 px-4 text-xs text-slate-700 dark:text-slate-300">{row.label}</td>
                          {planIds.map((id) => (
                            <td key={id} className="py-2.5 px-3 text-center">
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
          Tous les forfaits incluent l&apos;isolation multi-tenant, le portail RSVP invité et les mises à jour de la plateforme.
          Les prix affichés proviennent de la configuration admin et peuvent être ajustés. Enterprise : devis sur mesure.
        </p>
      </div>
    </section>
  );
}
