'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Minus, ChevronDown, ChevronUp, Sparkles, Tag, ShieldCheck, CreditCard, Smartphone, Wallet } from 'lucide-react';
import {
 LANDING_PLANS,
 FEATURE_COMPARISON,
 B2B_PLAN_IDS,
 B2C_PLAN_IDS,
 VENDOR_PLAN_IDS,
 ANNUAL_DISCOUNT_PERCENT,
 getPlanDisplayPrice,
 getPlanCapabilityBadges,
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
 type PlanCapabilityBadge,
} from '@/config/landingPricing';
import { PlanQuotaLimits } from '@/components/QuotaUsagePanel';
import { cn } from '@/lib/cn';
import { useAuth } from '@/context/AuthContext';

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
 defaultAudience?: 'B2B' | 'B2C' | 'VENDOR';
 lead?: string;
}

function FeatureCell({ value }: { value: string | boolean }) {
 if (value === true) {
 return <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" aria-label="Inclus" />;
 }
 if (value === false) {
 return <Minus className="w-4 h-4 text-muted dark:text-muted mx-auto" aria-label="Non inclus" />;
 }
 return <span className="text-xs font-medium text-foreground dark:text-foreground">{value}</span>;
}

const BADGE_TONE: Record<PlanCapabilityBadge['tone'], string> = {
 indigo: 'bg-primary/10 text-primary border-primary/20',
 violet: 'bg-primary/10 text-primary border-primary/20',
 emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
 amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
 rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
};

const TIER_ACCENT: Record<string, string> = {
 essentials: 'bg-muted',
 personal: 'bg-foreground/50',
 business: 'bg-foreground/40',
 premium: 'bg-foreground/70',
 enterprise: 'bg-foreground',
 venue: 'bg-primary',
 service: 'bg-[color:var(--festive-accent)]',
 catalog: 'bg-foreground',
};

export default function LandingPricingSection({
 dbPlans,
 defaultAudience = 'B2B',
 lead,
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
 services: db?.maxServices ?? parseComparisonQuota(plan.id, 'Prestations marketplace'),
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
            label: 'Particuliers',
            ids: [...B2C_PLAN_IDS],
            description: 'La tranquillité absolue pour votre fête avec éditeur 2D/3D complet inclus, facturation sur 90 jours ou annuel (−10 %).',
          },
        ]
      : audience === 'VENDOR'
        ? [
            {
              label: 'Essai gratuit',
              ids: ['FREE'],
              description: '1 salle simple et 1 prestation pour tester la publication sans engagement',
            },
            {
              label: 'Salles & prestataires',
              ids: [...VENDOR_PLAN_IDS],
              description: 'Salles ou prestations illimitées avec éditeur complet — pas de frais d’organisation événement',
            },
          ]
        : [
            {
              label: 'Essentiel & Business',
              ids: ['FREE', 'STANDARD'],
              description: 'Démarrage gratuit ou 150 invités avec protocole QR et éditeur Business',
            },
            {
              label: 'Premium & Premium Plus',
              ids: ['PREMIUM_1', 'PREMIUM_2'],
              description: 'Éditeur avancé (thèmes, scènes, escaliers), modèles sur-mesure, OCR maquette et protocole',
            },
            {
              label: 'Enterprise',
              ids: ['ENTERPRISE_1', 'ENTERPRISE_2', 'ENTERPRISE_3'],
              description: 'Volume élevé, éditeur complet, multi-salles, rapports et accompagnement dédié',
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
 className="py-16 sm:py-20 bg-background/80 border-t border-border scroll-mt-16 em-landing-section-glow-alt"
 >
 <div className="page-container relative z-10">
        <div className="max-w-2xl mb-10 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="em-festive-chip">
              <Sparkles className="w-3 h-3" />
              Tarification Transparente
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Sans frais cachés
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
            {audience === 'B2C'
              ? 'Forfaits Particuliers'
              : audience === 'VENDOR'
                ? 'Forfaits Salles & Prestataires'
                : 'Forfaits Organisations'}
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            {lead ||
              (audience === 'B2C'
                ? `Forfaits clairs selon votre nombre d'invités. Éditeur de salle complet inclus. −${ANNUAL_DISCOUNT_PERCENT} % en annuel.`
                : audience === 'VENDOR'
                  ? `Publiez votre vitrine avec plan 3D et recevez des demandes directes sans commission. −${ANNUAL_DISCOUNT_PERCENT} % en annuel.`
                  : `Billetterie par zone, gestion d’équipe, scan jour J et multi-événements. −${ANNUAL_DISCOUNT_PERCENT} % en annuel.`)}
          </p>
        </div>

 {activePromos.length > 0 && (
 <div className="mb-8 max-w-2xl rounded-[var(--radius-card)] em-hud-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
 <Tag className="w-5 h-5 text-primary shrink-0" />
 <div className="min-w-0">
 <p className="text-sm font-bold text-foreground">
 Promotions sur {activePromos.length} forfait{activePromos.length > 1 ? 's' : ''}
 </p>
 <p className="text-xs text-muted mt-0.5">
 {activePromos.map((p) => p.displayName).join(' · ')}
 </p>
 </div>
 </div>
 )}

 <div className="flex flex-col items-start gap-3 mb-10">
 <div className="flex flex-wrap items-center gap-3">
 <div className="inline-flex items-center p-1 rounded-full bg-surface-muted/80 dark:bg-surface border border-border">
 <button
 type="button"
 onClick={() => setAudience('B2B')}
 className={cn(
   'px-4 py-1.5 rounded-full text-xs font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary',
   audience === 'B2B'
     ? 'bg-primary text-primary-foreground shadow-xs'
     : 'text-muted hover:text-foreground',
 )}
 >
 Organisations (B2B)
 </button>
 <button
 type="button"
 onClick={() => setAudience('B2C')}
 className={cn(
   'px-4 py-1.5 rounded-full text-xs font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary',
   audience === 'B2C'
     ? 'bg-primary text-primary-foreground shadow-xs'
     : 'text-muted hover:text-foreground',
 )}
 >
 Particuliers (B2C)
 </button>
 <button
 type="button"
 onClick={() => setAudience('VENDOR')}
 className={cn(
   'px-4 py-1.5 rounded-full text-xs font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary',
   audience === 'VENDOR'
     ? 'bg-primary text-primary-foreground shadow-xs'
     : 'text-muted hover:text-foreground',
 )}
 >
 Salles & prestataires
 </button>
 </div>

 <div className="inline-flex items-center p-1 rounded-full bg-surface-muted/80 dark:bg-surface border border-border">
 <button
 type="button"
 onClick={() => setBilling('monthly')}
 className={cn(
   'px-4 py-1.5 rounded-full text-xs font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary',
   billing === 'monthly'
     ? 'bg-surface text-foreground shadow-xs border border-border/80'
     : 'text-muted hover:text-foreground',
 )}
 >
 {audience === 'B2C' ? 'Trimestriel' : 'Mensuel'}
 </button>
 <button
 type="button"
 onClick={() => setBilling('annual')}
 className={cn(
   'px-4 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary',
   billing === 'annual'
     ? 'bg-surface text-foreground shadow-xs border border-border/80'
     : 'text-muted hover:text-foreground',
 )}
 >
 <span>Annuel</span>
 <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-full">
 −{ANNUAL_DISCOUNT_PERCENT} %
 </span>
 </button>
 </div>
 </div>

 <p className="text-xs text-muted">
 {billing === 'annual'
 ? audience === 'B2C'
 ? `Total pour 4 trimestres (365 jours), −${ANNUAL_DISCOUNT_PERCENT} % sur le prix catalogue`
 : `Total pour 12 mois (365 jours), −${ANNUAL_DISCOUNT_PERCENT} % sur le prix catalogue`
 : audience === 'B2C'
 ? 'Prix du trimestre (90 jours). Annuel : 4 trimestres d’un coup à −10 %.'
 : 'Activation après demande validée par la plateforme'}
 </p>
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
 className={`flex sm:grid gap-5 items-stretch overflow-x-auto pb-4 sm:pb-0 no-scrollbar snap-x snap-mandatory ${
 ids.length === 1
 ? 'max-w-md mx-auto'
 : ids.length === 2
 ? 'sm:grid-cols-2'
 : ids.length === 3
 ? 'sm:grid-cols-2 lg:grid-cols-3'
 : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
 }`}
 >
 {plans
 .filter((p) => ids.includes(p.id))
 .map((plan) => (
 <article
 key={plan.id}
 className={`relative flex flex-col rounded-[var(--radius-card)] overflow-hidden transition-all duration-300 min-w-[17.5rem] sm:min-w-0 shrink-0 snap-start flex-1 ${
 plan.highlighted
 ? 'border-2 border-primary bg-surface dark:bg-surface shadow-xl shadow-primary/25 ring-2 ring-primary/30 sm:scale-[1.02] z-10'
 : plan.promoActive
 ? 'border border-rose-500/40 bg-surface dark:bg-surface shadow-md'
 : 'em-hud-card border-border'
 }`}
 >
 <div className={`h-1.5 w-full ${plan.highlighted ? 'bg-gradient-to-r from-primary via-brand-accent to-festive-accent' : TIER_ACCENT[plan.tier]}`} />

 {plan.highlighted && (
 <div className="em-ribbon-badge">
 Recommandé
 </div>
 )}

 {plan.badge && !plan.highlighted && (
 <div className="absolute top-4 right-4 bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
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
 <span className="text-sm font-medium text-muted">{planPricePeriodSuffix(plan.id, billing)}</span>
 )}
 </div>
 <p className="text-[11px] text-muted mt-1.5">{plan.monthlyNote}</p>
 {billing === 'annual' && plan.id !== 'FREE' && (
 <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
 Facturé {isB2cPlanId(plan.id) ? '4 trimestres' : '12 mois'} d’un coup · {ANNUAL_DISCOUNT_PERCENT} % d&apos;économie vs {isB2cPlanId(plan.id) ? 'trimestre' : 'mois'}
 </p>
 )}
 {billing === 'annual' && plan.id !== 'FREE' && (
 <p className="text-[10px] text-muted mt-0.5">
 {annualEquivalentNote(plan.id, resolvePlanMonthlyFc(plan, dbPlans?.[plan.id]))}
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
 href={user ? `/dashboard/billing?plan=${plan.id}&billing=${billing}` : plan.ctaHref}
 className={`block w-full text-center py-2.5 rounded-[var(--radius-button)] text-sm font-medium transition ${
 plan.ctaVariant === 'outline' || plan.ctaVariant === 'contact'
 ? 'border border-border text-foreground hover:bg-surface-muted'
 : plan.highlighted
 ? 'bg-foreground hover:opacity-90 text-background'
 : 'bg-surface-muted hover:bg-border text-foreground border border-border'
 }`}
 >
 {user ? (plan.id === 'FREE' ? 'Mon espace gratuit' : 'Choisir ce forfait') : plan.cta}
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
     <span className="font-mono text-[10px] bg-primary/10 px-1.5 py-0.5 rounded">9 forfaits</span>
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
 </div>
 )}
 </div>

 {/* Bandeau des moyens de paiement acceptés (Orange Money, M-Pesa, Airtel, Cartes) */}
 <div className="mt-8 p-4 rounded-2xl bg-surface/80 dark:bg-surface/80 border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
 <div className="flex items-center gap-2.5 text-xs text-muted">
 <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
 <div>
 <span className="font-bold text-foreground block">Paiements 100% sécurisés via FlexPay</span>
 <span className="text-[11px] text-muted">Activation instantanée de votre forfait ou billets en Francs Congolais (CDF) et USD</span>
 </div>
 </div>

 <div className="flex flex-wrap items-center justify-center gap-2">
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-xs border border-orange-500/25">
 <Smartphone className="w-3.5 h-3.5" /> Orange Money
 </span>
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-xs border border-red-500/25">
 <Smartphone className="w-3.5 h-3.5" /> M-Pesa
 </span>
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-500/25">
 <Smartphone className="w-3.5 h-3.5" /> Airtel Money
 </span>
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs border border-blue-500/25">
 <CreditCard className="w-3.5 h-3.5" /> Visa & Mastercard
 </span>
 </div>
 </div>

 <p className="text-center text-xs text-muted mt-8 max-w-2xl mx-auto leading-relaxed">
 Réduction annuelle de {ANNUAL_DISCOUNT_PERCENT} % sur le total (12 mois ou 4 trimestres). Promotions configurables
 par l&apos;administrateur. Tous les forfaits incluent l&apos;isolation multi-tenant et le portail RSVP invité.
 </p>
 </div>
 </section>
 );
}
