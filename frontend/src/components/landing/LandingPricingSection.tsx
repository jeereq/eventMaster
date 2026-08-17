'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Minus, ChevronDown, ChevronUp, Sparkles, Tag } from 'lucide-react';
import {
 LANDING_PLANS,
 FEATURE_COMPARISON,
 B2B_PLAN_IDS,
 B2C_PLAN_IDS,
 VENDOR_PLAN_IDS,
 ANNUAL_DISCOUNT_PERCENT,
 getPlanDisplayPrice,
 getPlanCapabilityBadges,
 parsePriceFc,
 resolvePlanMonthlyFc,
 computePromoSavingsPercent,
 planTierLabel,
 isB2cPlanId,
 planPricePeriodSuffix,
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
 maxServices?: number;
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
 return <Minus className="w-4 h-4 text-muted dark:text-muted mx-auto" aria-label="Non inclus" />;
 }
 return <span className="text-xs font-medium text-foreground dark:text-foreground">{value}</span>;
}

const BADGE_TONE: Record<PlanCapabilityBadge['tone'], string> = {
 indigo: 'bg-surface-muted text-foreground border-border',
 violet: 'bg-surface-muted text-foreground border-border',
 emerald: 'bg-surface-muted text-foreground border-border',
 amber: 'bg-surface-muted text-foreground border-border',
 rose: 'bg-surface-muted text-foreground border-border',
};

const TIER_ACCENT: Record<string, string> = {
 essentials: 'bg-muted',
 personal: 'bg-foreground/50',
 business: 'bg-foreground/40',
 premium: 'bg-foreground/70',
 enterprise: 'bg-foreground',
 venue: 'bg-emerald-600',
 service: 'bg-sky-600',
 catalog: 'bg-violet-600',
};

export default function LandingPricingSection({ dbPlans }: LandingPricingSectionProps) {
 const [billing, setBilling] = useState<BillingCycle>('monthly');
 const [showComparison, setShowComparison] = useState(false);
 const [audience, setAudience] = useState<'B2B' | 'B2C' | 'VENDOR'>('B2B');

 const plans = useMemo(() => {
 return LANDING_PLANS.map((plan) => {
 const db = dbPlans?.[plan.id];
 const promoActive = Boolean(db?.promoActive && db?.promoMonthlyPriceFc != null && plan.id !== 'FREE');
 const catalogPrice = getPlanDisplayPrice(
 plan,
 isB2cPlanId(plan.id) ? 'monthly' : billing,
 db?.price,
 db?.monthlyPriceFc,
 );
 const promoPriceStr =
 db?.promoPrice ||
 (db?.promoMonthlyPriceFc != null ? `${db.promoMonthlyPriceFc.toLocaleString('fr-FR')} FC` : undefined);
 const promoPriceLabel =
 promoActive && promoPriceStr
 ? getPlanDisplayPrice(plan, isB2cPlanId(plan.id) ? 'monthly' : billing, promoPriceStr)
 : null;

 const catalogFc = resolvePlanMonthlyFc(plan, db);
 const promoFc = db?.promoMonthlyPriceFc ?? (promoPriceStr ? parsePriceFc(promoPriceStr) : 0);
 const promoSavingsPercent =
 promoActive && (billing === 'monthly' || isB2cPlanId(plan.id))
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
 services: db?.maxServices ?? parseComparisonQuota(plan.id, 'Prestations catalogue'),
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

 const tiers: Array<{ label: string; ids: PlanId[]; description?: string }> =
 audience === 'B2C'
  ? [
      {
        label: 'Particuliers (B2C)',
        ids: [...B2C_PLAN_IDS],
        description: 'Organisation complète, facturation trimestrielle (90 jours), sans publication catalogue',
      },
    ]
  : audience === 'VENDOR'
  ? [
      {
        label: 'Essai catalogue',
        ids: ['FREE'],
        description: '1 salle simple et 1 prestation pour tester la publication',
      },
      {
        label: 'Salles & prestataires',
        ids: [...VENDOR_PLAN_IDS],
        description: 'Forfaits adaptés aux gestionnaires de salles et aux prestataires — pas un abonnement organisateur',
      },
    ]
  : [
      {
        label: 'Essentials & Business (B2B)',
        ids: ['FREE', 'STANDARD'],
        description: 'Démarrer et professionnaliser vos premiers événements d’organisation',
      },
      {
        label: 'Business Premium (B2B)',
        ids: ['PREMIUM_1', 'PREMIUM_2'],
        description: 'Éditeur visuel, import maquette, RSVP analytique et salles 2D avancées',
      },
      {
        label: 'Business Enterprise (B2B)',
        ids: ['ENTERPRISE_1', 'ENTERPRISE_2', 'ENTERPRISE_3'],
        description: 'Volume, rapports, réseau commercial et accompagnement dédié',
      },
    ];

 const comparisonIds: PlanId[] =
 audience === 'B2C'
  ? ['FREE', ...B2C_PLAN_IDS]
  : audience === 'VENDOR'
    ? ['FREE', ...VENDOR_PLAN_IDS]
    : [...B2B_PLAN_IDS];

 return (
 <section
 id="tarifs"
 className="py-16 sm:py-20 bg-background border-t border-border"
 >
 <div className="page-container">
 <div className="max-w-2xl mb-10 space-y-2">
 <p className="text-xs font-medium text-muted uppercase tracking-wider">
 Forfaits
 </p>
 <h2 className="text-2xl font-semibold text-foreground tracking-tight">
 Organisations, particuliers, salles et prestataires
 </h2>
 <p className="text-sm text-muted leading-relaxed">
 Les forfaits Business sont destinés aux organisateurs. Les forfaits Particulier (B2C) se règlent par trimestre (90 jours), selon le palier d’invités (50, 100, 200 ou plus de 200), avec des salles de plan de table — pas un catalogue public.
 Les forfaits Salle, Prestataire (prestations illimitées dès l’abonnement payé) et Salle & presta sont pensés pour publier dans le catalogue — pas pour remplacer un abonnement d’organisation.
 Facturation annuelle (B2B et catalogue) avec {ANNUAL_DISCOUNT_PERCENT} % de réduction.
 </p>
 </div>

 {activePromos.length > 0 && (
 <div className="mb-8 max-w-2xl rounded-[var(--radius-card)] border border-border bg-surface-muted p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
 <Tag className="w-5 h-5 text-muted shrink-0" />
 <div className="min-w-0">
 <p className="text-sm font-semibold text-foreground">
 Promotions sur {activePromos.length} forfait{activePromos.length > 1 ? 's' : ''}
 </p>
 <p className="text-xs text-muted mt-0.5">
 {activePromos.map((p) => p.displayName).join(' · ')}
 </p>
 </div>
 </div>
 )}

 <div className="flex flex-col items-start gap-3 mb-10">
 <div className="inline-flex items-center p-0.5 rounded-[var(--radius-button)] bg-surface-muted border border-border">
 <button
 type="button"
 onClick={() => setAudience('B2B')}
 className={`px-4 py-2 rounded-md text-xs font-medium transition ${
 audience === 'B2B'
 ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
 : 'text-muted hover:text-foreground'
 }`}
 >
 Organisations (B2B)
 </button>
 <button
 type="button"
 onClick={() => setAudience('B2C')}
 className={`px-4 py-2 rounded-md text-xs font-medium transition ${
 audience === 'B2C'
 ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
 : 'text-muted hover:text-foreground'
 }`}
 >
 Particuliers (B2C)
 </button>
 <button
 type="button"
 onClick={() => setAudience('VENDOR')}
 className={`px-4 py-2 rounded-md text-xs font-medium transition ${
 audience === 'VENDOR'
 ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
 : 'text-muted hover:text-foreground'
 }`}
 >
 Salles & prestataires
 </button>
 </div>
 {audience === 'B2C' ? (
 <p className="text-xs text-muted">
 Facturation trimestrielle (90 jours) — le prix affiché est le montant du trimestre.
 </p>
 ) : (
 <>
 <div className="inline-flex items-center p-0.5 rounded-[var(--radius-button)] bg-surface-muted border border-border">
 <button
 type="button"
 onClick={() => setBilling('monthly')}
 className={`px-4 py-2 rounded-md text-xs font-medium transition ${
 billing === 'monthly'
 ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
 : 'text-muted hover:text-foreground'
 }`}
 >
 Mensuel
 </button>
 <button
 type="button"
 onClick={() => setBilling('annual')}
 className={`px-4 py-2 rounded-md text-xs font-medium transition flex items-center gap-2 ${
 billing === 'annual'
 ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
 : 'text-muted hover:text-foreground'
 }`}
 >
 Annuel
 <span className="text-[10px] font-semibold text-muted">
 −{ANNUAL_DISCOUNT_PERCENT} %
 </span>
 </button>
 </div>
 <p className="text-xs text-muted">
 {billing === 'annual'
 ? `Équivalent mensuel avec ${ANNUAL_DISCOUNT_PERCENT} % de réduction`
 : 'Activation après demande validée par la plateforme'}
 </p>
 </>
 )}
 </div>

 {tiers.map(({ label, ids, description }) => (
 <div key={label} className="mb-16 last:mb-10">
 <div className="text-center mb-6 space-y-1">
 <h3 className="text-sm font-bold uppercase tracking-widest text-muted">{label}</h3>
 {description && (
 <p className="text-xs text-muted dark:text-muted max-w-xl mx-auto">{description}</p>
 )}
 </div>
 <div
 className={`grid gap-5 items-stretch ${
 ids.length === 1
 ? 'max-w-md mx-auto'
 : ids.length === 2
 ? 'md:grid-cols-2'
 : ids.length === 3
 ? 'md:grid-cols-2 lg:grid-cols-3'
 : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
 }`}
 >
 {plans
 .filter((p) => ids.includes(p.id))
 .map((plan) => (
 <article
 key={plan.id}
 className={`relative flex flex-col rounded-[var(--radius-card)] border bg-surface overflow-hidden transition ${
 plan.highlighted
 ? 'border-foreground/30'
 : plan.promoActive
 ? 'border-border'
 : 'border-border'
 }`}
 >
 <div className={`h-1 w-full ${TIER_ACCENT[plan.tier]}`} />

 {plan.badge && (
 <div className="absolute top-4 right-4 bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
 <Sparkles className="w-3 h-3" />
 {plan.badge}
 </div>
 )}

 <div className="p-6 sm:p-7 flex-1 flex flex-col">
 <div className="space-y-1 pr-16">
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
 {plan.tierLabel}
 </span>
 <h3 className="text-xl font-bold text-foreground dark:text-foreground">{plan.displayName}</h3>
 </div>

 <p className="text-xs text-muted dark:text-muted mt-3 min-h-[36px] leading-relaxed">
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
 <span className="text-sm text-muted line-through">{plan.catalogPrice}</span>
 </div>
 )}
 <div className="flex items-baseline gap-1.5 flex-wrap">
 <span
 className={`text-3xl font-semibold tracking-tight ${
 plan.highlighted
 ? 'text-primary dark:text-primary'
 : plan.promoActive
 ? 'text-rose-600 dark:text-rose-400'
 : 'text-foreground dark:text-foreground'
 }`}
 >
 {plan.price}
 </span>
 {plan.id !== 'FREE' && (
 <span className="text-sm font-medium text-muted">{planPricePeriodSuffix(plan.id)}</span>
 )}
 </div>
 <p className="text-[11px] text-muted mt-1.5">{plan.monthlyNote}</p>
 {billing === 'annual' && plan.id !== 'FREE' && !isB2cPlanId(plan.id) && (
 <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
 Facturé annuellement · {ANNUAL_DISCOUNT_PERCENT} % d&apos;économie vs mensuel
 </p>
 )}
 </div>

 <ul className="space-y-2.5 text-xs text-muted dark:text-foreground flex-1">
 {plan.highlights.map((h) => (
 <li key={h} className="flex gap-2.5">
 <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
 <span className="leading-relaxed">{h}</span>
 </li>
 ))}
 </ul>

 {(plan.limits.events > 0 || plan.limits.templates > 0 || plan.limits.rooms > 0 || plan.limits.services > 0) && (
 <PlanQuotaLimits
 compact
 maxEvents={plan.limits.events}
 maxGuests={plan.limits.guests}
 maxTemplates={plan.limits.templates}
 maxRooms={plan.limits.rooms}
 maxServices={plan.limits.services}
 maxOrgManagers={plan.limits.orgManagers}
 />
 )}
 </div>

 <div className="px-6 sm:px-7 pb-6 sm:pb-7 pt-0">
 <Link
 href={plan.ctaHref}
 className={`block w-full text-center py-2.5 rounded-[var(--radius-button)] text-sm font-medium transition ${
 plan.ctaVariant === 'outline' || plan.ctaVariant === 'contact'
 ? 'border border-border text-foreground hover:bg-surface-muted'
 : plan.highlighted
 ? 'bg-foreground hover:opacity-90 text-background'
 : 'bg-surface-muted hover:bg-border text-foreground border border-border'
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

 <div className="border border-border dark:border-border rounded-2xl overflow-hidden bg-white dark:bg-background/80 shadow-sm">
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
 Modèles custom, OCR, RSVP analytique, protocole, commercial…
 </span>
 </div>
 {showComparison ? (
 <ChevronUp className="w-5 h-5 text-muted shrink-0" />
 ) : (
 <ChevronDown className="w-5 h-5 text-muted shrink-0" />
 )}
 </button>

 {showComparison && (
 <div className="overflow-x-auto border-t border-border dark:border-border">
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
 <span className="text-[10px] font-bold text-foreground dark:text-foreground block">
 {p?.displayName}
 </span>
 <span className="text-[9px] text-muted font-semibold block mt-0.5">
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
 className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-primary dark:text-primary"
 >
 {row.category}
 </td>
 </tr>
 )}
 <tr className="border-b border-border-subtle dark:border-border/80 hover:bg-surface-muted/50 dark:hover:bg-surface-muted/20">
 <td className="py-2.5 px-4 text-xs text-foreground dark:text-foreground sticky left-0 bg-white dark:bg-background/30">
 {row.label}
 </td>
 {comparisonIds.map((id) => (
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

 <p className="text-center text-xs text-muted mt-10 max-w-2xl mx-auto leading-relaxed">
 Réduction annuelle de {ANNUAL_DISCOUNT_PERCENT} % sur l&apos;équivalent mensuel. Promotions configurables
 par l&apos;administrateur. Tous les forfaits incluent l&apos;isolation multi-tenant et le portail RSVP invité.
 </p>
 </div>
 </section>
 );
}
