'use client';
import { ChannelText } from '@/components/ChannelText';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Minus, ChevronDown, ChevronUp, Tag, ShieldCheck, CreditCard, Smartphone } from '@/components/icons';
import PlanPricingRow, { planRowButtonClass } from '@/components/PlanPricingRow';
import {
 LANDING_PLANS,
 FEATURE_COMPARISON,
 B2B_PLAN_IDS,
 B2C_PLAN_IDS,
 VENDOR_PLAN_IDS,
 ANNUAL_DISCOUNT_PERCENT,
 getPlanDisplayPrice,
 resolvePlanMonthlyFc,
 computePromoSavingsPercent,
 annualPayableFromPeriod,
 annualPromoPayableFromPeriod,
 annualEquivalentNote,
 planTierLabel,
 isB2cPlanId,
 planPricePeriodSuffix,
 type BillingCycle,
 type PlanId,
} from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import { useAuth } from '@/context/AuthContext';
import {
 comparisonValueFromDb,
 guestsBadgeFromDb,
 highlightsFromDb,
 type DbPlanCatalogEntry,
} from '@/lib/planCatalogDb';

type DbPlan = DbPlanCatalogEntry;

function parseComparisonQuota(planId: PlanId, label: string): number {
 const row = FEATURE_COMPARISON.find((r) => r.label === label);
 const value = row?.values[planId];
 if (typeof value !== 'string') return 0;
 if (value === 'Illimité') return 9999;
 return parseInt(value.replace(/\s/g, ''), 10) || 0;
}

interface LandingPricingSectionProps {
 dbPlans: Record<string, DbPlan> | null;
 /** Catalogue en cours de chargement : les prix ne sont pas encore ceux de la base. */
 plansLoading?: boolean;
 defaultAudience?: 'B2B' | 'B2C' | 'VENDOR';
}

function FeatureCell({ value }: { value: string | boolean }) {
 if (value === true) {
 return <Check className="w-4 h-4 text-primary-solid mx-auto" aria-label="Inclus" />;
 }
 if (value === false) {
 return <Minus className="w-4 h-4 text-muted dark:text-muted mx-auto" aria-label="Non inclus" />;
 }
 return <span className="text-xs font-medium text-foreground dark:text-foreground">{value}</span>;
}

export default function LandingPricingSection({
 dbPlans,
 plansLoading = false,
 defaultAudience = 'B2B',
}: LandingPricingSectionProps) {
 const { user } = useAuth();
 const [billing, setBilling] = useState<BillingCycle>('monthly');
 const [showComparison, setShowComparison] = useState(false);
 const [audience, setAudience] = useState<'B2B' | 'B2C' | 'VENDOR'>(defaultAudience);

 useEffect(() => {
  setAudience(defaultAudience);
 }, [defaultAudience]);

 const plans = useMemo(() => {
 return LANDING_PLANS.map((plan) => {
 const db = dbPlans?.[plan.id];
 const promoActive = Boolean(db?.promoActive && db?.promoMonthlyPriceFc != null && plan.id !== 'FREE');
 const catalogFc = resolvePlanMonthlyFc(plan, db);
 const promoFc = db?.promoMonthlyPriceFc ?? 0;
 const catalogPrice = getPlanDisplayPrice(plan, billing, db?.price, db?.monthlyPriceFc);
 const promoPriceLabel =
  promoActive && promoFc > 0
   ? getPlanDisplayPrice(plan, billing, db?.price, db?.monthlyPriceFc, promoFc)
   : null;

 const displayedCatalogFc =
  billing === 'annual' ? annualPayableFromPeriod(catalogFc, plan.id) : catalogFc;
 const displayedPromoFc =
  promoActive && promoFc > 0
   ? billing === 'annual'
    ? annualPromoPayableFromPeriod(catalogFc, promoFc, plan.id)
    : promoFc
   : 0;
 const promoSavingsPercent =
  promoActive
   ? computePromoSavingsPercent(displayedCatalogFc, displayedPromoFc)
   : null;

 // Badge « N invités » : quota de la base ; masqué pendant le chargement, landing seulement si l'API a échoué.
 const isGuestsBadge = Boolean(plan.badge && /invités/i.test(plan.badge));
 const badge = isGuestsBadge
  ? db
   ? guestsBadgeFromDb(plan.id, db) ?? undefined
   : plansLoading
    ? undefined
    : plan.badge
  : plan.badge;

 return {
 ...plan,
 badge,
 displayName: db?.name?.replace('Plan ', '') || plan.ms365Name,
 tierLabel: planTierLabel(plan.tier),
 price: promoActive && promoPriceLabel ? promoPriceLabel : catalogPrice,
 catalogPrice: promoActive ? catalogPrice : null,
 promoActive,
 promoLabel: db?.promoLabel || 'Offre promotionnelle',
 promoSavingsPercent,
 description: db?.description || plan.tagline,
 highlights: highlightsFromDb(plan.id, plan.highlights, db),
 limits: {
 events: db?.maxEvents ?? parseComparisonQuota(plan.id, 'Événements actifs'),
 guests: db?.maxGuests ?? parseComparisonQuota(plan.id, 'Invités inclus par période payée (quota org.)'),
 templates: db?.maxTemplates ?? parseComparisonQuota(plan.id, "Modèles d'invitation"),
 rooms: db?.maxRooms ?? parseComparisonQuota(plan.id, 'Salles organisation'),
 services: db?.maxServices ?? parseComparisonQuota(plan.id, 'Prestations marketplace'),
 orgManagers: db?.maxOrgManagers ?? parseComparisonQuota(plan.id, 'Managers organisation'),
 customTemplates: db?.customTemplates,
 },
 };
 });
 }, [dbPlans, billing, plansLoading]);

 const activePromos = useMemo(
 () => plans.filter((p) => p.promoActive && p.id !== 'FREE'),
 [plans],
 );

 const tiers: Array<{ label: string; ids: PlanId[]; description?: string }> =
    audience === 'B2C'
      ? [
          {
            label: 'Particuliers',
            ids: [...B2C_PLAN_IDS],
            description: 'Pour une fête privée : mariage, anniversaire, baptême. Choisissez selon votre nombre d’invités.',
          },
        ]
      : audience === 'VENDOR'
        ? [
            {
              label: 'Essai gratuit',
              ids: ['FREE'],
              description: 'Pour tester votre vitrine sans engagement',
            },
            {
              label: 'Salles, métiers & matériel',
              ids: [...VENDOR_PLAN_IDS],
              description: 'Salle, prestations ou matériel : vitrine et éditeur complet, sans gestion d’événements',
            },
          ]
        : [
            {
              label: 'Essentiel & Business',
              ids: ['FREE', 'STANDARD'],
              description: 'Pour démarrer : dès Business, la vitrine salle et prestations est incluse',
            },
            {
              label: 'Premium & Premium Plus',
              ids: ['PREMIUM_1', 'PREMIUM_2'],
              description: 'Éditeur avancé, modèles sur mesure et lecture de listes (OCR), vitrine incluse',
            },
            {
              label: 'Agence & Enterprise',
              ids: ['AGENCY', 'ENTERPRISE_1', 'ENTERPRISE_2', 'ENTERPRISE_3', 'CUSTOM'],
              description: 'Gros volumes, plusieurs salles et accompagnement dédié, vitrine incluse',
            },
          ];

 const comparisonIds: PlanId[] =
 audience === 'B2C'
  ? ['FREE', ...B2C_PLAN_IDS]
  : audience === 'VENDOR'
    ? ['FREE', ...VENDOR_PLAN_IDS]
    : [...B2B_PLAN_IDS];

 return (
 <section id="tarifs" className="py-16 sm:py-20 bg-[#10291c] text-white scroll-mt-16">
 <div className="page-container relative z-10">
 <h2 className="em-landing-heading text-3xl sm:text-4xl text-white mb-8">
 {audience === 'B2C'
 ? 'Forfaits Particuliers'
 : audience === 'VENDOR'
 ? 'Forfaits Salles & prestataires'
 : 'Forfaits Organisations'}
 </h2>

 {activePromos.length > 0 && (
 <div className="mb-8 max-w-2xl rounded-2xl bg-white/10 p-4 flex items-center gap-3">
 <Tag className="w-5 h-5 text-[#b0eed5] shrink-0" />
 <p className="text-sm font-semibold">
 Promotion : {activePromos.map((p) => p.displayName).join(' · ')}
 </p>
 </div>
 )}

 <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-4">
 <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Type de compte">
 {([
 ['B2C', 'Particuliers'],
 ['B2B', 'Organisations'],
 ['VENDOR', 'Salles & prestataires'],
 ] as const).map(([id, label]) => (
 <button
 key={id}
 type="button"
 role="tab"
 aria-selected={audience === id}
 onClick={() => setAudience(id)}
 className={cn(
 'min-h-11 rounded-full px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b0eed5]',
 audience === id ? 'bg-[#b0eed5] text-[#10291c]' : 'border border-white/30 text-white hover:bg-white/10',
 )}
 >
 {label}
 </button>
 ))}
 </div>

 <div className="flex items-center gap-3">
 <button
 type="button"
 role="switch"
 aria-checked={billing === 'annual'}
 aria-label="Facturation annuelle"
 onClick={() => setBilling(billing === 'annual' ? 'monthly' : 'annual')}
 className={cn(
 'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b0eed5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#10291c]',
 billing === 'annual' ? 'bg-[#b0eed5]' : 'bg-white/30',
 )}
 >
 <span
 aria-hidden
 className={cn(
 'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
 billing === 'annual' ? 'translate-x-6' : 'translate-x-1',
 )}
 />
 </button>
 <span className="text-sm">Annuel</span>
 <span className="rounded-full bg-[#b0eed5] px-2.5 py-0.5 text-xs font-semibold text-[#10291c]">
 −{ANNUAL_DISCOUNT_PERCENT} %
 </span>
 </div>
 </div>

 {tiers.map(({ label, ids }) => (
 <div key={label} className="mb-10">
 {tiers.length > 1 ? <h3 className="mb-4 text-lg font-semibold text-white">{label}</h3> : null}
 <div className="space-y-5">
 {plans
 .filter((p) => ids.includes(p.id))
 .map((plan) => {
 const monthlyFc = resolvePlanMonthlyFc(plan, dbPlans?.[plan.id]);
 const notes: React.ReactNode[] = [];
 if (isB2cPlanId(plan.id) && billing === 'monthly' && !plansLoading && monthlyFc > 0) {
 notes.push(`soit ${Math.round(monthlyFc / 3).toLocaleString('fr-FR')} FC par mois`);
 } else if (plan.monthlyNote) {
 notes.push(plan.monthlyNote);
 }
 if (billing === 'annual' && plan.id !== 'FREE') {
 notes.push(`Facturé ${isB2cPlanId(plan.id) ? '4 trimestres' : '12 mois'} d’un coup`);
 notes.push(annualEquivalentNote(plan.id, monthlyFc));
 }
 return (
 <PlanPricingRow
 key={plan.id}
 name={plan.displayName}
 badge={plan.highlighted ? 'Le plus choisi' : plan.badge}
 description={plan.description}
 accent={plan.highlighted}
 price={
 plansLoading ? (
 <span className="inline-block h-10 w-36 animate-pulse rounded-lg bg-[#10291c]/10 align-middle" aria-label="Chargement du prix" />
 ) : (
 plan.price
 )
 }
 periodSuffix={plan.id !== 'FREE' ? planPricePeriodSuffix(plan.id, billing) : undefined}
 notes={notes}
 promo={
 plan.promoActive
 ? { label: plan.promoLabel, savingsPercent: plan.promoSavingsPercent, catalogPrice: plan.catalogPrice }
 : undefined
 }
 highlights={plan.highlights.map((h) => <ChannelText key={h} text={h} />)}
 cta={
 <Link
 href={user ? `/dashboard/billing?plan=${plan.id}&billing=${billing}` : plan.ctaHref}
 className={planRowButtonClass(plan.ctaVariant === 'outline' || plan.ctaVariant === 'contact' ? 'outline' : 'solid')}
 >
 {user ? (plan.id === 'FREE' ? 'Mon espace gratuit' : 'Choisir ce forfait') : plan.cta}
 <ArrowRight className="h-4 w-4" aria-hidden />
 </Link>
 }
 />
 );
 })}
 </div>
 </div>
 ))}

 <div className="border border-border rounded-2xl overflow-hidden bg-surface shadow-sm">
 <button
 type="button"
 onClick={() => setShowComparison(!showComparison)}
 className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-surface-muted hover:bg-surface-muted transition"
 >
 <div>
 <span className="font-bold text-foreground dark:text-foreground text-sm block">
 Comparer tous les forfaits EventMaster
 </span>
                <span className="text-xs text-muted mt-0.5 block">
                  Éditeur 2D/3D détaillé, modèles custom, OCR, protocole QR, multi-étages…
                </span>
 </div>
 {showComparison ? (
 <ChevronUp className="w-5 h-5 text-muted shrink-0" />
 ) : (
 <ChevronDown className="w-5 h-5 text-muted shrink-0" />
 )}
 </button>

 {showComparison && (
 <div className="border-t border-border dark:border-border">
   <div className="sm:hidden px-4 py-2 bg-primary/5 text-primary text-xs font-medium flex items-center justify-between border-b border-border/80">
     <span>↔ Faites glisser pour comparer tous les forfaits</span>
     <span className="font-mono text-xs bg-primary/10 px-1.5 py-0.5 rounded">9 forfaits</span>
   </div>
   <div className="overflow-x-auto overscroll-x-contain touch-pan-x">
     <table className="w-full text-left min-w-[960px]">
 <thead>
 <tr className="bg-surface-muted dark:bg-background border-b border-border dark:border-border">
 <th className="py-3 px-4 text-xs font-bold text-muted uppercase sticky left-0 bg-surface-muted dark:bg-background z-10">
 Fonctionnalité
 </th>
 {comparisonIds.map((id) => {
 const p = plans.find((x) => x.id === id);
 return (
 <th
 key={id}
 className="py-3 px-2 text-center min-w-[92px] align-bottom"
 >
 <span className="text-xs font-bold text-foreground dark:text-foreground block">
 {p?.displayName}
 </span>
 <span className="text-xs text-muted font-semibold block mt-0.5">
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
 <tr className="bg-primary/10 dark:bg-primary/10">
 <td
 colSpan={comparisonIds.length + 1}
 className="py-2.5 px-4 text-xs font-bold text-primary dark:text-primary"
 >
 {row.category}
 </td>
 </tr>
 )}
 <tr className="border-b border-border-subtle dark:border-border/80 hover:bg-surface-muted/50 dark:hover:bg-surface-muted/20">
 <td className="py-2.5 px-4 text-xs text-foreground sticky left-0 bg-surface">
 <ChannelText text={row.label} />
 </td>
 {comparisonIds.map((id) => (
 <td key={id} className="py-2.5 px-2 text-center">
 <FeatureCell value={comparisonValueFromDb(row.label, id, row.values[id], dbPlans?.[id])} />
 </td>
 ))}
 </tr>
 </React.Fragment>
 );
 })}
 </tbody>
 </table>
   </div>
 </div>
 )}
 </div>

 {/* Bandeau des moyens de paiement acceptés (Orange Money, M-Pesa, Airtel, Cartes) */}
 <div className="mt-8 p-4 rounded-2xl bg-surface/80 dark:bg-surface/80 border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
 <div className="flex items-center gap-2.5 text-xs text-muted">
 <ShieldCheck className="w-5 h-5 text-primary-solid shrink-0" />
 <div>
 <span className="font-bold text-foreground block">Paiements 100% sécurisés via FlexPay</span>
 <span className="text-xs text-muted">Activation instantanée de votre forfait ou billets en Francs Congolais (CDF) et USD</span>
 </div>
 </div>

 <div className="flex flex-wrap items-center justify-center gap-2">
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-xs border border-orange-500/25">
 <Smartphone className="w-3.5 h-3.5" /> Orange Money
 </span>
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-xs border border-red-500/25">
 <Smartphone className="w-3.5 h-3.5" /> M-Pesa
 </span>
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-danger/10 text-danger font-bold text-xs border border-danger/25">
 <Smartphone className="w-3.5 h-3.5" /> Airtel Money
 </span>
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs border border-blue-500/25">
 <CreditCard className="w-3.5 h-3.5" /> Visa & Mastercard
 </span>
 </div>
 </div>

 <p className="mt-8 text-sm text-white/70">
 Le quota d’invités repart à zéro à chaque période payée.
 </p>
 </div>
 </section>
 );
}
