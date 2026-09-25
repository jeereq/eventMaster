'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import UserAvatar from '@/components/UserAvatar';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Sparkles,
  Ticket,
  Search,
  ArrowRight,
  Heart,
  Inbox,
  CalendarCheck,
  Utensils,
  Truck,
  Mail,
  ShieldCheck,
  Wand2,
  Bookmark,
  ChevronRight,
  HelpCircle,
  Crown,
  CheckCircle2,
  CreditCard,
  Smartphone,
  Check,
  Users,
  Percent,
  ScanLine,
  Zap,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { api } from '@/lib/api';
import { useListingFavorites } from '@/lib/listingFavorites';
import { Modal, Button } from '@/components/ui';
import SubscriptionFlexPayModal from '@/components/SubscriptionFlexPayModal';
import {
  formatFc,
  type BillingCycle,
  type PlanId,
  annualPayableFromPeriod,
  annualPromoPayableFromPeriod,
  computePromoSavingsPercent,
  isB2cPlanId,
} from '@/config/landingPricing';
import { cn } from '@/lib/cn';

interface UpgradePlanConfig {
  id: PlanId;
  name: string;
  badge?: string;
  popular?: boolean;
  basePriceFc: number;
  periodLabel: string;
  guestsMax: number;
  description: string;
  highlights: string[];
}

export interface DynamicPlanRow {
  name?: string;
  description?: string;
  price?: string;
  monthlyPriceFc?: number;
  promoActive?: boolean;
  promoPrice?: string;
  promoMonthlyPriceFc?: number | null;
  promoLabel?: string;
  [key: string]: unknown;
}

const UPGRADE_B2C_PLANS: UpgradePlanConfig[] = [
  {
    id: 'PERSONAL_50',
    name: 'Particulier 50',
    badge: '50 invités',
    basePriceFc: 60000,
    periodLabel: '90 jours (trimestre)',
    guestsMax: 50,
    description: 'Petite célébration ou fête intime.',
    highlights: ['3 événements · 50 invités', 'Invitations et réponses WhatsApp', 'Éditeur de salle 2D/3D', 'Scan QR smartphone Jour J'],
  },
  {
    id: 'PERSONAL_100',
    name: 'Particulier 100',
    badge: '100 invités',
    basePriceFc: 90000,
    periodLabel: '90 jours (trimestre)',
    guestsMax: 100,
    description: 'Anniversaire, baptême ou fiançailles.',
    highlights: ['3 événements · 100 invités', 'Invitations nominatives WhatsApp', 'Plans de table 2D/3D', 'Contrôle d’accès Jour J'],
  },
  {
    id: 'PERSONAL_200',
    name: 'Particulier 200',
    badge: 'Recommandé Mariage',
    popular: true,
    basePriceFc: 120000,
    periodLabel: '90 jours (trimestre)',
    guestsMax: 200,
    description: 'Formule préférée pour mariages et réceptions.',
    highlights: ['3 événements · 200 invités', 'Faire-part et réponses en direct', 'Placement 2D/3D jusqu’à 80 tables', 'Émargement QR en direct'],
  },
  {
    id: 'PERSONAL_PLUS',
    name: 'Particulier +200',
    badge: 'Grandes célébrations',
    basePriceFc: 180000,
    periodLabel: '90 jours (trimestre)',
    guestsMax: 500,
    description: 'Mariages d’envergure et fêtes communautaires.',
    highlights: ['Événements illimités · +200 invités', 'Pass d’accès QR individuels', 'Plan 2D/3D multi-tables', 'Scan smartphone rapide'],
  },
];

const UPGRADE_B2B_PLANS: Array<Omit<UpgradePlanConfig, 'basePriceFc' | 'periodLabel'> & {
  monthlyPriceFc: number;
}> = [
  {
    id: 'STANDARD',
    name: 'Business Standard',
    badge: 'Lancement Pro',
    monthlyPriceFc: 30000,
    guestsMax: 150,
    description: 'Organisateurs réguliers, associations et PME.',
    highlights: ['8 événements · 150 invités/évt', 'Billetterie & encaissements', 'Invitations & scan QR', 'Tableau de bord financier'],
  },
  {
    id: 'PREMIUM_1',
    name: 'Business Premium',
    badge: 'Recommandé Pro',
    popular: true,
    monthlyPriceFc: 55000,
    guestsMax: 500,
    description: 'Agences événementielles, galas et séminaires.',
    highlights: ['Multi-événements · 500 invités/évt', 'Billetterie & dons solidaires', 'Gestion d’équipe (Managers)', 'Scan QR anti-doublon illimité'],
  },
  {
    id: 'PREMIUM_2',
    name: 'Business Premium Plus',
    badge: 'Grand Public',
    monthlyPriceFc: 85000,
    guestsMax: 1000,
    description: 'Grands rassemblements, galas et concerts.',
    highlights: ['Multi-événements · 1 000 invités/évt', 'Multi-salles & plans avancés', 'Support prioritaire dédié', 'Rapports d’émargement complets'],
  },
  {
    id: 'ENTERPRISE_1',
    name: 'Enterprise Galas',
    badge: 'Grand Volume',
    monthlyPriceFc: 350000,
    guestsMax: 3500,
    description: 'Concerts, festivals, salons et foires d’envergure.',
    highlights: ['3 500 invités · Multi-agences', 'Multi-opérateurs de scan Jour J', 'SLA & assistance sur site', 'Export comptable & analytics'],
  },
];

const UPGRADE_VENDOR_PLANS: Array<Omit<UpgradePlanConfig, 'basePriceFc' | 'periodLabel'> & {
  monthlyPriceFc: number;
}> = [
  {
    id: 'VENUE',
    name: 'Salle',
    badge: 'Salles',
    monthlyPriceFc: 14900,
    guestsMax: 0,
    description: 'Publiez vos salles avec éditeur 2D/3D — sans événements.',
    highlights: ['Salles illimitées · éditeur complet', '4 essais IA · recharge de jetons', 'Sans événements ni invités'],
  },
  {
    id: 'SERVICE',
    name: 'Prestataire',
    badge: 'Métiers',
    monthlyPriceFc: 9900,
    guestsMax: 0,
    description: 'Prestations et Matériel & Équipements illimités — sans salles ni événements.',
    highlights: ['Prestations + matériel illimités', '4 essais IA · recharge de jetons', 'Sans salles ni événements'],
  },
  {
    id: 'CATALOG',
    name: 'Salle & presta',
    badge: 'Salle + métiers',
    popular: true,
    monthlyPriceFc: 19900,
    guestsMax: 0,
    description: 'Salles et métiers illimités (éditeur complet) — sans événements.',
    highlights: ['Salles ∞ + prestations / matériel ∞', 'Éditeur 2D/3D complet', '4 essais IA · recharge de jetons'],
  },
];

type UpgradeCategory = 'b2c' | 'b2b' | 'venue' | 'service' | 'catalog';

function isVendorUpgradeCategory(category: UpgradeCategory): boolean {
  return category === 'venue' || category === 'service' || category === 'catalog';
}

function defaultPlanForCategory(category: UpgradeCategory): PlanId {
  switch (category) {
    case 'b2c':
      return 'PERSONAL_200';
    case 'b2b':
      return 'PREMIUM_1';
    case 'venue':
      return 'VENUE';
    case 'service':
      return 'SERVICE';
    case 'catalog':
      return 'CATALOG';
  }
}

export default function ClientDashboardHome() {
  const { user, tenant } = useAuth();
  const { site } = usePlatformSite();
  const router = useRouter();
  const { items: favoriteItems } = useListingFavorites();

  const visibility = site?.studioVisibility ?? { budget: true, invite: true, room: true };
  const activeStudiosCount = (visibility.budget ? 1 : 0) + (visibility.invite ? 1 : 0) + (visibility.room ? 1 : 0);

  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    ticketsCount: 0,
    quotesCount: 0,
    bookingsCount: 0,
    packsCount: 0,
    loading: true,
  });

  // États pour l'évolution de compte (org ou catalogue) et paiement direct
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeCategory, setUpgradeCategory] = useState<UpgradeCategory>('b2c');
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>('PERSONAL_200');
  const [b2bBillingCycle, setB2bBillingCycle] = useState<BillingCycle>('monthly');
  const [orgName, setOrgName] = useState(tenant?.name || user?.name || '');
  const [savingOrgName, setSavingOrgName] = useState(false);
  const [flexPayOpen, setFlexPayOpen] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [dynamicPlans, setDynamicPlans] = useState<Record<string, DynamicPlanRow> | null>(null);

  useEffect(() => {
    if (tenant?.name) setOrgName(tenant.name);
    else if (user?.name) setOrgName(user.name);
  }, [tenant?.name, user?.name]);

  // Chargement des tarifs et promotions dynamiques depuis le catalogue SaaS
  useEffect(() => {
    let mounted = true;
    api
      .get('/subscriptions/plans')
      .then((catalog) => {
        if (!mounted || !catalog || typeof catalog !== 'object') return;
        const rows: Record<string, DynamicPlanRow> = {};
        for (const [key, val] of Object.entries(catalog)) {
          if (val && typeof val === 'object') {
            rows[key] = val as DynamicPlanRow;
          }
        }
        if (Object.keys(rows).length > 0) {
          setDynamicPlans(rows);
        }
      })
      .catch(() => {
        // Fallback silencieux sur les prix par défaut en cas d'erreur
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleOpenUpgrade = (category: UpgradeCategory) => {
    setUpgradeCategory(category);
    setSelectedPlanId(defaultPlanForCategory(category));
    setUpgradeModalOpen(true);
  };

  /** Résolution du prix effectif, des promotions et de l'économie sur un forfait donné */
  const resolvePlanPricing = useCallback(
    (planId: PlanId, defaultMonthlyFc: number, cycle: BillingCycle) => {
      const db = dynamicPlans?.[planId];
      const promoActive = Boolean(db?.promoActive && db?.promoMonthlyPriceFc != null && planId !== 'FREE');
      const promoFc = promoActive ? Number(db?.promoMonthlyPriceFc) : null;
      const catalogMonthlyFc =
        db?.monthlyPriceFc != null && Number.isFinite(db.monthlyPriceFc) && db.monthlyPriceFc > 0
          ? db.monthlyPriceFc
          : defaultMonthlyFc;

      const isB2c = isB2cPlanId(planId);
      const effectiveCycle = isB2c ? 'monthly' : cycle;

      let catalogPriceFc: number;
      let effectivePriceFc: number;

      if (effectiveCycle === 'annual') {
        catalogPriceFc = annualPayableFromPeriod(catalogMonthlyFc, planId);
        effectivePriceFc =
          promoFc != null
            ? annualPromoPayableFromPeriod(catalogMonthlyFc, promoFc, planId)
            : catalogPriceFc;
      } else {
        catalogPriceFc = catalogMonthlyFc;
        effectivePriceFc = promoFc != null ? promoFc : catalogMonthlyFc;
      }

      const promoSavingsPercent =
        promoActive && promoFc != null
          ? computePromoSavingsPercent(catalogPriceFc, effectivePriceFc)
          : effectiveCycle === 'annual'
            ? 10
            : null;

      return {
        catalogPriceFc,
        effectivePriceFc,
        priceLabel: formatFc(effectivePriceFc),
        catalogPriceLabel: formatFc(catalogPriceFc),
        promoActive,
        promoLabel: db?.promoLabel || 'Offre promotionnelle',
        promoSavingsPercent,
        displayName: db?.name?.replace('Plan ', '') || undefined,
        description: db?.description || undefined,
      };
    },
    [dynamicPlans],
  );

  const activePlanDetails = useMemo(() => {
    if (upgradeCategory === 'b2c') {
      const plan = UPGRADE_B2C_PLANS.find((p) => p.id === selectedPlanId) || UPGRADE_B2C_PLANS[2];
      const pricing = resolvePlanPricing(plan.id, plan.basePriceFc, 'monthly');
      return {
        id: plan.id,
        name: pricing.displayName || plan.name,
        priceFc: pricing.effectivePriceFc,
        priceLabel: pricing.priceLabel,
        catalogPriceLabel: pricing.catalogPriceLabel,
        promoActive: pricing.promoActive,
        promoLabel: pricing.promoLabel,
        promoSavingsPercent: pricing.promoSavingsPercent,
        durationLabel: '90 jours (trimestre)',
        description: pricing.description || plan.description,
      };
    }
    if (upgradeCategory === 'b2b') {
      const plan = UPGRADE_B2B_PLANS.find((p) => p.id === selectedPlanId) || UPGRADE_B2B_PLANS[1];
      const pricing = resolvePlanPricing(plan.id, plan.monthlyPriceFc, b2bBillingCycle);
      return {
        id: plan.id,
        name: pricing.displayName || plan.name,
        priceFc: pricing.effectivePriceFc,
        priceLabel: pricing.priceLabel,
        catalogPriceLabel: pricing.catalogPriceLabel,
        promoActive: pricing.promoActive,
        promoLabel: pricing.promoLabel,
        promoSavingsPercent: pricing.promoSavingsPercent,
        durationLabel:
          b2bBillingCycle === 'annual'
            ? '365 jours (annuel · −10 %)'
            : '30 jours (mensuel)',
        description: pricing.description || plan.description,
      };
    }
    const vendorPlan =
      UPGRADE_VENDOR_PLANS.find((p) => p.id === selectedPlanId) ||
      UPGRADE_VENDOR_PLANS.find((p) => p.id === defaultPlanForCategory(upgradeCategory)) ||
      UPGRADE_VENDOR_PLANS[0];
    const pricing = resolvePlanPricing(vendorPlan.id, vendorPlan.monthlyPriceFc, b2bBillingCycle);
    return {
      id: vendorPlan.id,
      name: pricing.displayName || vendorPlan.name,
      priceFc: pricing.effectivePriceFc,
      priceLabel: pricing.priceLabel,
      catalogPriceLabel: pricing.catalogPriceLabel,
      promoActive: pricing.promoActive,
      promoLabel: pricing.promoLabel,
      promoSavingsPercent: pricing.promoSavingsPercent,
      durationLabel:
        b2bBillingCycle === 'annual'
          ? '365 jours (annuel · −10 %)'
          : '30 jours (mensuel)',
      description: pricing.description || vendorPlan.description,
    };
  }, [upgradeCategory, selectedPlanId, b2bBillingCycle, resolvePlanPricing]);

  const upgradeModalTitle = useMemo(() => {
    switch (upgradeCategory) {
      case 'b2c':
        return 'Activer une Organisation Particulier (B2C)';
      case 'b2b':
        return 'Activer une Organisation Professionnelle (B2B)';
      case 'venue':
        return 'Publier des salles (forfait Salle)';
      case 'service':
        return 'Publier des prestations (forfait Prestataire)';
      case 'catalog':
        return 'Publier salles et métiers (Salle & presta)';
    }
  }, [upgradeCategory]);

  const upgradeSuccessTitle = isVendorUpgradeCategory(upgradeCategory)
    ? 'Compte catalogue activé !'
    : 'Organisation activée avec succès !';

  const handleProceedToPayment = async () => {
    const trimmed = orgName.trim();
    if (trimmed && trimmed !== tenant?.name) {
      setSavingOrgName(true);
      try {
        await api.put('/auth/profile', { tenantName: trimmed });
      } catch {
        // Poursuivre le checkout même si la mise à jour du nom échoue
      } finally {
        setSavingOrgName(false);
      }
    }
    setUpgradeModalOpen(false);
    setFlexPayOpen(true);
  };

  const handlePaidSuccess = async () => {
    setUpgradeSuccess(true);
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1500);
  };

  // Chargement des compteurs temps réel
  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      api.get('/marketplace/my-tickets'),
      api.get('/marketplace/bookings?role=organizer'),
      api.get('/marketplace/inquiries?role=organizer'),
      api.get('/marketplace/event-packs'),
    ]).then(([ticketsRes, bookingsRes, inquiriesRes, packsRes]) => {
      if (!mounted) return;
      let ticketsCount = 0;
      let quotesCount = 0;
      let bookingsCount = 0;
      let packsCount = 0;

      if (ticketsRes.status === 'fulfilled' && ticketsRes.value?.tickets) {
        ticketsCount = Array.isArray(ticketsRes.value.tickets)
          ? ticketsRes.value.tickets.length
          : 0;
      }
      if (inquiriesRes.status === 'fulfilled' && inquiriesRes.value?.inquiries) {
        quotesCount = Array.isArray(inquiriesRes.value.inquiries)
          ? inquiriesRes.value.inquiries.length
          : 0;
      }
      if (bookingsRes.status === 'fulfilled' && bookingsRes.value?.bookings) {
        bookingsCount = Array.isArray(bookingsRes.value.bookings)
          ? bookingsRes.value.bookings.length
          : 0;
      }
      if (packsRes.status === 'fulfilled') {
        const pVal = packsRes.value || {};
        if (Array.isArray(pVal.packs)) packsCount = pVal.packs.length;
        else if (Array.isArray(pVal)) packsCount = pVal.length;
      }

      setStats({
        ticketsCount,
        quotesCount,
        bookingsCount,
        packsCount,
        loading: false,
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      router.push('/dashboard/catalogue');
      return;
    }
    router.push(`/dashboard/catalogue?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const userName = user?.name ? user.name.split(' ')[0] : '';

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-7xl mx-auto">
      {/* ─── 1. EN-TÊTE HUMAIN & RECHERCHE ─── */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar name={user?.name} src={user?.avatarUrl} size="lg" className="w-12 h-12 text-base" />
            <div className="min-w-0">
              <p className="text-sm text-muted truncate">Bonjour{userName ? `, ${userName}` : ''}</p>
              <h1 className="font-display text-2xl sm:text-[1.75rem] font-semibold leading-tight text-foreground">
                Mon espace
              </h1>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-primary/15 dark:text-primary">
            <ShieldCheck className="w-3.5 h-3.5" />
            Gratuit · sans abonnement
          </span>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-4 sm:p-5 space-y-4">
          {/* Recherche directe */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="relative flex items-center rounded-2xl bg-background border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition">
              <Search className="w-5 h-5 text-muted absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Salle à la Gombe, traiteur, DJ, mobilier, pass QR…"
                aria-label="Rechercher une salle, un prestataire ou un équipement"
                className="w-full pl-12 pr-28 py-3.5 bg-transparent text-base sm:text-sm text-foreground placeholder:text-muted focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-1.5 min-h-10 px-4 py-2 rounded-xl bg-primary-solid text-primary-foreground text-xs font-bold hover:bg-primary-solid-hover transition flex items-center gap-1 touch-manipulation cursor-pointer"
              >
                <span>Chercher</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Raccourcis 1 clic */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link
              href="/dashboard/catalogue?kind=venue&q=Gombe"
              className="inline-flex items-center min-h-11 px-3.5 rounded-full bg-surface border border-border hover:border-primary/50 text-foreground font-medium transition"
            >
              Salles Gombe
            </Link>
            <Link
              href="/dashboard/catalogue?kind=service&cat=caterer"
              className="inline-flex items-center min-h-11 px-3.5 rounded-full bg-surface border border-border hover:border-primary/50 text-foreground font-medium transition"
            >
              Traiteurs
            </Link>
            <Link
              href="/dashboard/catalogue?kind=service&cat=dj"
              className="inline-flex items-center min-h-11 px-3.5 rounded-full bg-surface border border-border hover:border-primary/50 text-foreground font-medium transition"
            >
              DJ &amp; Sono
            </Link>
            {activeStudiosCount > 0 && (
              <Link
                href="/dashboard/catalogue?tab=plan&planView=ai"
                className="min-h-11 px-3.5 rounded-full bg-primary/10 border border-primary/25 hover:border-primary text-primary font-bold transition inline-flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Simulateur
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ─── 2. BAROMÈTRE D'ACTIVITÉ : CHIFFRES CLÉS (ULTRA-PURIFIÉ) ─── */}
      <section aria-label="Compteurs d'activité" className="rounded-3xl border border-border bg-surface p-1.5">
        <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-border/60">
          <Link
            href="/dashboard/bookings?tab=quotes"
            className="p-3 sm:p-4 hover:bg-surface-muted/50 rounded-xl transition group flex items-center justify-between gap-3"
          >
            <div>
              <span className="text-xs font-medium text-muted block">Devis</span>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                {stats.loading ? (
                  <span className="inline-block w-6 h-6 bg-foreground/10 rounded animate-pulse motion-reduce:animate-none" />
                ) : (
                  stats.quotesCount
                )}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Inbox className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/dashboard/bookings?tab=bookings"
            className="p-3 sm:p-4 hover:bg-surface-muted/50 rounded-xl transition group flex items-center justify-between gap-3"
          >
            <div>
              <span className="text-xs font-medium text-muted block">Réservations</span>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                {stats.loading ? (
                  <span className="inline-block w-6 h-6 bg-foreground/10 rounded animate-pulse motion-reduce:animate-none" />
                ) : (
                  stats.bookingsCount
                )}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/dashboard/tickets"
            className="p-3 sm:p-4 hover:bg-surface-muted/50 rounded-xl transition group flex items-center justify-between gap-3"
          >
            <div>
              <span className="text-xs font-medium text-muted block">Billets</span>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                {stats.loading ? (
                  <span className="inline-block w-6 h-6 bg-foreground/10 rounded animate-pulse motion-reduce:animate-none" />
                ) : (
                  stats.ticketsCount
                )}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Ticket className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/dashboard/catalogue?tab=packs"
            className="p-3 sm:p-4 hover:bg-surface-muted/50 rounded-xl transition group flex items-center justify-between gap-3"
          >
            <div>
              <span className="text-xs font-medium text-muted block">Packs</span>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                {stats.loading ? (
                  <span className="inline-block w-6 h-6 bg-foreground/10 rounded animate-pulse motion-reduce:animate-none" />
                ) : (
                  stats.packsCount
                )}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Bookmark className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/dashboard/catalogue?tab=favorites"
            className="p-3 sm:p-4 hover:bg-surface-muted/50 rounded-xl transition group flex items-center justify-between gap-3 col-span-2 md:col-span-1"
          >
            <div>
              <span className="text-xs font-medium text-muted block">Favoris</span>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                {stats.loading ? (
                  <span className="inline-block w-6 h-6 bg-foreground/10 rounded animate-pulse motion-reduce:animate-none" />
                ) : (
                  favoriteItems.length
                )}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Heart className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </section>

      {/* ─── CALL TO ACTION : ÉVOLUTION VERS ORGANISATION B2C OU B2B ─── */}
      <section
        aria-labelledby="upgrade-heading"
        className="relative overflow-hidden rounded-3xl border border-primary/25 bg-linear-to-br from-primary/10 via-surface to-surface-muted p-5 sm:p-7 shadow-xs space-y-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/15 text-primary border border-primary/25">
              <Crown className="w-3.5 h-3.5" />
              <span>Évolution de compte · Paiement direct</span>
            </div>
            <h2 id="upgrade-heading" className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              Passez organisateur ou publiez au catalogue
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Payez un abonnement Particulier, Entreprise, Salle, Prestataire ou Salle & presta : votre type de compte
              s’adapte automatiquement après validation du paiement.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Link
              href="/dashboard/billing?tab=plans"
              className="text-xs font-semibold text-muted hover:text-foreground transition underline underline-offset-4"
            >
              Grille tarifaire
            </Link>
          </div>
        </div>

        {/* Choix : org B2C / B2B + catalogue salle / presta / salle+presta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Carte 1 : Organisation Particulier (B2C) */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Choisir la formule Particulier : Mariages & Célébrations Privées"
            onClick={() => handleOpenUpgrade('b2c')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenUpgrade('b2c');
              }
            }}
            className="cursor-pointer group p-5 rounded-2xl border border-rose-500/25 bg-surface hover:border-rose-500/50 hover:shadow-md transition-all flex flex-col justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                  <Heart className="w-3.5 h-3.5" />
                  Organisation Particulier (B2C)
                </span>
                <span className="text-xs font-black text-foreground">Dès 60 000 FC / 90 j</span>
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground group-hover:text-rose-600 dark:group-hover:text-rose-400 transition">
                  Mariages & Célébrations Privées
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-1">
                  Mariages, anniversaires et fêtes privées sans engagement mensuel.
                </p>
              </div>

              <div className="space-y-1.5 pt-1 text-xs text-muted">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>3 événements inclus · 50 à 500 invités</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Faire-part WhatsApp nominatifs avec réponse à l’invitation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Plan de table 2D/3D & scan smartphone</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between gap-2 mt-auto">
              <span className="text-xs font-medium text-muted">Durée : 90 jours</span>
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenUpgrade('b2c');
                }}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                Choisir Particulier
              </Button>
            </div>
          </div>

          {/* Carte 2 : Organisation Professionnelle (B2B) */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Choisir la formule Entreprise : Entreprises, Galas & Agences Pro"
            onClick={() => handleOpenUpgrade('b2b')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenUpgrade('b2b');
              }
            }}
            className="cursor-pointer group p-5 rounded-2xl border border-primary/25 bg-surface hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  <Building2 className="w-3.5 h-3.5" />
                  Organisation Professionnelle (B2B)
                </span>
                <span className="text-xs font-black text-foreground">Dès 30 000 FC / mois</span>
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                  Entreprises, Galas & Agences Pro
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-1">
                  Concerts, conférences, galas et billetterie en ligne.
                </p>
              </div>

              <div className="space-y-1.5 pt-1 text-xs text-muted">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Multi-événements · 150 à 3 500+ invités</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Billetterie en ligne, dons solidaires et encaissements</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Gestion d’équipe (Managers) & scan QR illimité</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between gap-2 mt-auto">
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 font-semibold">
                −10 % en annuel (365 j)
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenUpgrade('b2b');
                }}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="shadow-xs shadow-primary/20"
              >
                Choisir Entreprise
              </Button>
            </div>
          </div>

          {/* Carte 3 : Salle */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Choisir la formule Salle : Mettre mes salles en ligne"
            onClick={() => handleOpenUpgrade('venue')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenUpgrade('venue');
              }
            }}
            className="cursor-pointer group p-5 rounded-2xl border border-amber-500/25 bg-surface hover:border-amber-500/50 hover:shadow-md transition-all flex flex-col justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                  <Utensils className="w-3.5 h-3.5" />
                  Catalogue · Salle
                </span>
                <span className="text-xs font-black text-foreground shrink-0">14 900 FC / mois</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-400 transition">
                  Mettre mes salles en ligne
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-1">
                  Salles illimitées, éditeur 2D/3D — sans organiser d’événements.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-border flex items-center justify-between gap-2 mt-auto">
              <span className="text-xs font-medium text-muted">Compte prestataire / salle</span>
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenUpgrade('venue');
                }}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
              >
                Choisir Salle
              </Button>
            </div>
          </div>

          {/* Carte 4 : Prestataire */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Choisir la formule Prestataire : Publier mes prestations"
            onClick={() => handleOpenUpgrade('service')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenUpgrade('service');
              }
            }}
            className="cursor-pointer group p-5 rounded-2xl border border-sky-500/25 bg-surface hover:border-sky-500/50 hover:shadow-md transition-all flex flex-col justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-800 dark:text-sky-300 border border-sky-500/20">
                  <Truck className="w-3.5 h-3.5" />
                  Catalogue · Prestataire
                </span>
                <span className="text-xs font-black text-foreground shrink-0">9 900 FC / mois</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground group-hover:text-sky-700 dark:group-hover:text-sky-400 transition">
                  Publier mes prestations
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-1">
                  Métiers et Matériel & Équipements illimités — sans salles ni événements.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-border flex items-center justify-between gap-2 mt-auto">
              <span className="text-xs font-medium text-muted">Compte prestataire</span>
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenUpgrade('service');
                }}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="bg-sky-600 hover:bg-sky-700 text-white shadow-xs"
              >
                Choisir Prestataire
              </Button>
            </div>
          </div>

          {/* Carte 5 : Salle & presta */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Choisir la formule Salle & presta : Vendre salles et métiers ensemble"
            onClick={() => handleOpenUpgrade('catalog')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenUpgrade('catalog');
              }
            }}
            className="cursor-pointer group p-5 rounded-2xl border border-primary/25 bg-surface hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between gap-4 md:col-span-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary-solid dark:text-emerald-300 border border-primary/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  Catalogue · Salle &amp; presta
                </span>
                <span className="text-xs font-black text-foreground">19 900 FC / mois</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                  Vendre salles et métiers ensemble
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-1 max-w-2xl">
                  Un seul forfait pour salles + prestations / matériel, sans organiser d’événements.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-border flex items-center justify-between gap-2 mt-auto">
              <span className="text-xs font-medium text-muted">−10 % en annuel</span>
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenUpgrade('catalog');
                }}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="shadow-xs shadow-primary/20"
              >
                Choisir Salle &amp; presta
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. LES STUDIOS ACTIFS (VISUEL · ZÉRO TEXTE PESANT) ─── */}
      {activeStudiosCount > 0 && (
        <section aria-labelledby="studios-heading" className="space-y-3.5">
          <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
            <h2 id="studios-heading" className="font-display text-lg sm:text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Studios Actifs
            </h2>
            <Link
              href="/dashboard/catalogue?tab=plan&planView=ai"
              className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>Simulateur complet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div
            className={cn(
              'grid grid-cols-1 gap-3.5',
              activeStudiosCount === 3
                ? 'md:grid-cols-3'
                : activeStudiosCount === 2
                  ? 'md:grid-cols-2'
                  : 'max-w-md',
            )}
          >
            {/* Studio 1 : Budget */}
            {visibility.budget && (
              <Link
                href="/dashboard/catalogue?tab=plan&planView=ai&studio=budget"
                className="rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/5 via-surface to-surface p-4 flex flex-col justify-between gap-3 transition hover:border-primary hover:shadow-xs group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition">
                      <Wand2 className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
                      Actif
                    </span>
                  </div>
                  <h3 className="font-display text-base font-semibold text-foreground group-hover:text-primary transition">
                    Simulateur Budget
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                      3 formules
                    </span>
                    <span className="text-xs font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                      CDF &amp; USD
                    </span>
                    <span className="text-xs font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                      Devis direct
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-border/70 flex items-center justify-between text-xs font-bold text-primary group-hover:translate-x-0.5 transition">
                  <span>Calculer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            )}

            {/* Studio 2 : Invitations */}
            {visibility.invite && (
              <Link
                href="/dashboard/catalogue?tab=plan&planView=ai&studio=invite"
                className="rounded-2xl border border-pink-500/30 bg-gradient-to-b from-pink-500/5 via-surface to-surface p-4 flex flex-col justify-between gap-3 transition hover:border-pink-500 hover:shadow-xs group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center group-hover:scale-105 transition">
                      <Mail className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
                      Actif
                    </span>
                  </div>
                  <h3 className="font-display text-base font-semibold text-foreground group-hover:text-pink-600 dark:group-hover:text-pink-400 transition">
                    Invitations &amp; Cartes
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                      Format 9:16
                    </span>
                    <span className="text-xs font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                      WhatsApp
                    </span>
                    <span className="text-xs font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                      Lien de réponse à l’invitation
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-border/70 flex items-center justify-between text-xs font-bold text-pink-600 dark:text-pink-400 group-hover:translate-x-0.5 transition">
                  <span>Créer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            )}

            {/* Studio 3 : Plans 3D */}
            {visibility.room && (
              <Link
                href="/dashboard/catalogue?tab=plan&planView=ai&studio=room"
                className="rounded-2xl border border-sky-500/30 bg-gradient-to-b from-sky-500/5 via-surface to-surface p-4 flex flex-col justify-between gap-3 transition hover:border-sky-500 hover:shadow-xs group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
                      Actif
                    </span>
                  </div>
                  <h3 className="font-display text-base font-semibold text-foreground group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
                    Plans de Salle 3D
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                      Visite WebGL
                    </span>
                    <span className="text-xs font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                      Tables &amp; Buffets
                    </span>
                    <span className="text-xs font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                      Immersion
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-border/70 flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400 group-hover:translate-x-0.5 transition">
                  <span>Agencer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ─── 4. EXPLORATION PAR UNIVERS (CHIPS DIRECTS) ─── */}
      <section aria-labelledby="marketplace-heading" className="space-y-3.5">
        <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
          <h2 id="marketplace-heading" className="font-display text-lg sm:text-xl font-semibold text-foreground tracking-tight">
            Explorer le Catalogue
          </h2>
          <Link
            href="/dashboard/catalogue"
            className="text-xs font-bold text-muted hover:text-foreground inline-flex items-center gap-1 transition"
          >
            <span>Tout voir</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Salles */}
          <Link
            href="/dashboard/catalogue?kind=venue"
            className="group rounded-2xl border border-border bg-surface p-4 hover:border-primary/50 transition hover:shadow-xs flex flex-col justify-between gap-3"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition">
                <Building2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition">
                Lieux &amp; Espaces
              </h3>
              <div className="flex flex-wrap gap-1">
                <span className="text-xs bg-surface-muted text-muted px-1.5 py-0.5 rounded">Salles</span>
                <span className="text-xs bg-surface-muted text-muted px-1.5 py-0.5 rounded">Jardins</span>
                <span className="text-xs bg-surface-muted text-muted px-1.5 py-0.5 rounded">Domaines</span>
              </div>
            </div>
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-foreground group-hover:text-primary transition">
              <span>Explorer</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          {/* Prestataires */}
          <Link
            href="/dashboard/catalogue?kind=service"
            className="group rounded-2xl border border-border bg-surface p-4 hover:border-primary/50 transition hover:shadow-xs flex flex-col justify-between gap-3"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition">
                <Utensils className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition">
                Prestataires
              </h3>
              <div className="flex flex-wrap gap-1">
                <span className="text-xs bg-surface-muted text-muted px-1.5 py-0.5 rounded">Traiteurs</span>
                <span className="text-xs bg-surface-muted text-muted px-1.5 py-0.5 rounded">DJ</span>
                <span className="text-xs bg-surface-muted text-muted px-1.5 py-0.5 rounded">Photo</span>
              </div>
            </div>
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-foreground group-hover:text-primary transition">
              <span>Explorer</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          {/* Mobilier & Cortèges */}
          <Link
            href="/dashboard/catalogue?kind=rental"
            className="group rounded-2xl border border-border bg-surface p-4 hover:border-primary/50 transition hover:shadow-xs flex flex-col justify-between gap-3"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition">
                <Truck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition">
                Mobilier &amp; Cortèges
              </h3>
              <div className="flex flex-wrap gap-1">
                <span className="text-xs bg-surface-muted text-muted px-1.5 py-0.5 rounded">Chaises</span>
                <span className="text-xs bg-surface-muted text-muted px-1.5 py-0.5 rounded">Tentes</span>
                <span className="text-xs bg-surface-muted text-muted px-1.5 py-0.5 rounded">Voitures</span>
              </div>
            </div>
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-foreground group-hover:text-primary transition">
              <span>Explorer</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          {/* Sorties & Billetterie */}
          <Link
            href="/dashboard/catalogue?kind=event"
            className="group rounded-2xl border border-border bg-surface p-4 hover:border-primary/50 transition hover:shadow-xs flex flex-col justify-between gap-3"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
                <Ticket className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition">
                Billetterie
              </h3>
              <div className="flex flex-wrap gap-1">
                <span className="text-xs bg-surface-muted text-muted px-1.5 py-0.5 rounded">Concerts</span>
                <span className="text-xs bg-surface-muted text-muted px-1.5 py-0.5 rounded">Galas</span>
                <span className="text-xs bg-surface-muted text-muted px-1.5 py-0.5 rounded">Pass QR</span>
              </div>
            </div>
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-foreground group-hover:text-primary transition">
              <span>Explorer</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:translate-x-0.5 transition" />
            </div>
          </Link>
        </div>
      </section>

      {/* ─── 5. ENGAGEMENTS DIRECTS (1 SEULE LIGNE ÉPURÉE) ─── */}
      <section className="rounded-2xl border border-border/80 bg-surface p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2 text-xs text-muted font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span>Devis gratuits et sans engagement · Acomptes versés directement aux prestataires</span>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Link
            href="/dashboard/guide"
            className="flex-1 sm:flex-none text-center px-3.5 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-muted text-xs font-semibold text-foreground transition min-h-[38px] inline-flex items-center justify-center"
          >
            Guide
          </Link>
          <Link
            href="/contact"
            className="flex-1 sm:flex-none text-center px-3.5 py-1.5 rounded-xl bg-primary-solid text-primary-foreground text-xs font-bold hover:bg-primary-solid-hover transition shadow-xs min-h-[38px] inline-flex items-center justify-center"
          >
            Assistance
          </Link>
        </div>
      </section>

      {/* ─── MODALE D'ÉVOLUTION DE COMPTE & SÉLECTION DE FORFAIT ─── */}
      <Modal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        size="lg"
        title={
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Crown className="w-5 h-5" />
            </span>
            <span>{upgradeModalTitle}</span>
          </div>
        }
        description="Le type de compte change après paiement."
      >
        <div className="space-y-6 pt-2">
          <div className="flex flex-wrap p-1 rounded-xl bg-surface-muted border border-border gap-1">
            {(
              [
                { id: 'b2c' as const, label: 'Particulier', icon: Heart, iconClass: 'text-rose-500' },
                { id: 'b2b' as const, label: 'Entreprise', icon: Building2, iconClass: 'text-primary' },
                { id: 'venue' as const, label: 'Salle', icon: Utensils, iconClass: 'text-amber-600' },
                { id: 'service' as const, label: 'Prestataire', icon: Truck, iconClass: 'text-sky-600' },
                { id: 'catalog' as const, label: 'Salle & presta', icon: Sparkles, iconClass: 'text-primary' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleOpenUpgrade(tab.id)}
                className={cn(
                  'flex-1 min-w-[7.5rem] min-h-11 py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5',
                  upgradeCategory === tab.id
                    ? 'bg-surface text-foreground shadow-xs border border-border'
                    : 'text-muted hover:text-foreground',
                )}
              >
                <tab.icon className={cn('w-4 h-4 shrink-0', tab.iconClass)} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {(upgradeCategory === 'b2b' || isVendorUpgradeCategory(upgradeCategory)) && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">Cycle de facturation</p>
                <p className="text-xs text-muted">Économisez 10 % en optant pour un engagement annuel (365 jours)</p>
              </div>
              <div className="flex items-center gap-1 bg-surface p-0.5 rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setB2bBillingCycle('monthly')}
                  className={cn(
                    'px-2.5 py-1 text-xs font-bold rounded-md transition',
                    b2bBillingCycle === 'monthly'
                      ? 'bg-primary-solid text-primary-foreground'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  Mensuel
                </button>
                <button
                  type="button"
                  onClick={() => setB2bBillingCycle('annual')}
                  className={cn(
                    'px-2.5 py-1 text-xs font-bold rounded-md transition flex items-center gap-1',
                    b2bBillingCycle === 'annual'
                      ? 'bg-primary-solid text-primary-foreground'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  <span>Annuel</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500 text-white font-black">−10%</span>
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="upgrade-org-name" className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>
                {isVendorUpgradeCategory(upgradeCategory)
                  ? 'Nom de votre activité ou enseigne'
                  : 'Nom de votre organisation ou événement'}
              </span>
              <span className="text-xs font-normal text-muted">(Modifiable à tout moment)</span>
            </label>
            <input
              id="upgrade-org-name"
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder={
                upgradeCategory === 'b2c'
                  ? 'ex: Mariage Sarah & Paul, Anniversaire 30 ans…'
                  : upgradeCategory === 'b2b'
                    ? 'ex: Agence Lumina, Event Corp Kinshasa…'
                    : upgradeCategory === 'venue'
                      ? 'ex: Villa Palmier, Salle Horizon…'
                      : upgradeCategory === 'service'
                        ? 'ex: Traiteur Mama, Sono Pro Kin…'
                        : 'ex: Maison des Fêtes & Traiteur…'
              }
              className="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            />
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-bold text-muted uppercase tracking-wider">
              {upgradeCategory === 'b2c'
                ? 'Sélectionnez votre formule Particulier (90 jours)'
                : upgradeCategory === 'b2b'
                  ? 'Sélectionnez votre formule Entreprise'
                  : 'Confirmez votre forfait catalogue'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {upgradeCategory === 'b2c'
                ? UPGRADE_B2C_PLANS.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    const pricing = resolvePlanPricing(plan.id, plan.basePriceFc, 'monthly');
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={cn(
                          'cursor-pointer p-4 rounded-xl border transition flex flex-col justify-between gap-3 text-left relative',
                          isSelected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                            : 'border-border bg-surface hover:border-primary/40',
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-1.5 absolute -top-2.5 right-3">
                          {pricing.promoActive ? (
                            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              {pricing.promoLabel}
                              {pricing.promoSavingsPercent ? ` (−${pricing.promoSavingsPercent} %)` : ''}
                            </span>
                          ) : plan.popular ? (
                            <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs">
                              Recommandé Mariage
                            </span>
                          ) : null}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-foreground">
                              {pricing.displayName || plan.name}
                            </span>
                            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                              {plan.badge}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-lg font-black text-foreground">
                              {pricing.priceLabel}
                            </span>
                            {pricing.promoActive && (
                              <span className="text-xs line-through text-muted font-normal">
                                {pricing.catalogPriceLabel}
                              </span>
                            )}
                            <span className="text-xs font-normal text-muted">/ 90 j</span>
                          </div>
                          <p className="text-xs text-muted leading-relaxed mt-1">
                            {pricing.description || plan.description}
                          </p>
                        </div>

                        <div className="space-y-1 pt-2 border-t border-border/60 text-xs text-muted">
                          {plan.highlights.map((h, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <Check className="w-3 h-3 text-rose-600 shrink-0" />
                              <span className="truncate">{h}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                : upgradeCategory === 'b2b'
                  ? UPGRADE_B2B_PLANS.map((plan) => {
                      const isSelected = selectedPlanId === plan.id;
                      const pricing = resolvePlanPricing(plan.id, plan.monthlyPriceFc, b2bBillingCycle);
                      return (
                        <div
                          key={plan.id}
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={cn(
                            'cursor-pointer p-4 rounded-xl border transition flex flex-col justify-between gap-3 text-left relative',
                            isSelected
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                              : 'border-border bg-surface hover:border-primary/40',
                          )}
                        >
                          <div className="flex flex-wrap items-center gap-1.5 absolute -top-2.5 right-3">
                            {pricing.promoActive ? (
                              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                {pricing.promoLabel}
                                {pricing.promoSavingsPercent ? ` (−${pricing.promoSavingsPercent} %)` : ''}
                              </span>
                            ) : plan.popular ? (
                              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-primary-solid text-primary-foreground shadow-xs">
                                Recommandé Pro
                              </span>
                            ) : null}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-foreground">
                                {pricing.displayName || plan.name}
                              </span>
                              <span className="text-xs font-semibold text-primary">
                                {plan.badge}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <span className="text-lg font-black text-foreground">
                                {pricing.priceLabel}
                              </span>
                              {pricing.promoActive && (
                                <span className="text-xs line-through text-muted font-normal">
                                  {pricing.catalogPriceLabel}
                                </span>
                              )}
                              <span className="text-xs font-normal text-muted">
                                {b2bBillingCycle === 'annual' ? '/ an' : '/ mois'}
                              </span>
                            </div>
                            <p className="text-xs text-muted leading-relaxed mt-1">
                              {pricing.description || plan.description}
                            </p>
                          </div>

                          <div className="space-y-1 pt-2 border-t border-border/60 text-xs text-muted">
                            {plan.highlights.map((h, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <Check className="w-3 h-3 text-primary shrink-0" />
                                <span className="truncate">{h}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  : UPGRADE_VENDOR_PLANS.filter((p) => p.id === defaultPlanForCategory(upgradeCategory)).map(
                      (plan) => {
                        const isSelected = selectedPlanId === plan.id;
                        const pricing = resolvePlanPricing(plan.id, plan.monthlyPriceFc, b2bBillingCycle);
                        return (
                          <div
                            key={plan.id}
                            onClick={() => setSelectedPlanId(plan.id)}
                            className={cn(
                              'cursor-pointer p-4 rounded-xl border transition flex flex-col justify-between gap-3 text-left relative sm:col-span-2',
                              isSelected
                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                                : 'border-border bg-surface hover:border-primary/40',
                            )}
                          >
                            <div className="flex flex-wrap items-center gap-1.5 absolute -top-2.5 right-3">
                              {pricing.promoActive ? (
                                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  {pricing.promoLabel}
                                  {pricing.promoSavingsPercent ? ` (−${pricing.promoSavingsPercent} %)` : ''}
                                </span>
                              ) : plan.popular ? (
                                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-primary-solid text-primary-foreground shadow-xs">
                                  Complet
                                </span>
                              ) : null}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-foreground">
                                  {pricing.displayName || plan.name}
                                </span>
                                <span className="text-xs font-semibold text-primary">{plan.badge}</span>
                              </div>
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className="text-lg font-black text-foreground">
                                  {pricing.priceLabel}
                                </span>
                                {pricing.promoActive && (
                                  <span className="text-xs line-through text-muted font-normal">
                                    {pricing.catalogPriceLabel}
                                  </span>
                                )}
                                <span className="text-xs font-normal text-muted">
                                  {b2bBillingCycle === 'annual' ? '/ an' : '/ mois'}
                                </span>
                              </div>
                              <p className="text-xs text-muted leading-relaxed mt-1">
                                {pricing.description || plan.description}
                              </p>
                            </div>
                            <div className="space-y-1 pt-2 border-t border-border/60 text-xs text-muted">
                              {plan.highlights.map((h, idx) => (
                                <div key={idx} className="flex items-center gap-1.5">
                                  <Check className="w-3 h-3 text-primary shrink-0" />
                                  <span className="truncate">{h}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      },
                    )}
            </div>

            {/* Lien direct pour consulter tous les forfaits ou demander une remise sur devis */}
            <div className="flex items-center justify-between px-1 text-xs text-muted">
              <span>Besoin d’un volume supérieur ou d’un devis spécifique ?</span>
              <Link
                href="/dashboard/billing?tab=plans"
                onClick={() => setUpgradeModalOpen(false)}
                className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                Voir tous les forfaits <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-muted border border-border space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-bold text-foreground">
                    Formule sélectionnée : <span className="text-primary">{activePlanDetails.name}</span>
                  </p>
                  {activePlanDetails.promoActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 font-extrabold border border-amber-500/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {activePlanDetails.promoLabel}
                      {activePlanDetails.promoSavingsPercent ? ` (−${activePlanDetails.promoSavingsPercent} %)` : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted">Durée de couverture : {activePlanDetails.durationLabel}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs text-muted block">Total à payer</span>
                <div className="flex items-baseline justify-end gap-1.5">
                  {activePlanDetails.promoActive && (
                    <span className="text-xs line-through text-muted font-normal">
                      {activePlanDetails.catalogPriceLabel}
                    </span>
                  )}
                  <span className="text-lg font-black text-foreground">{activePlanDetails.priceLabel}</span>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={savingOrgName}
              onClick={handleProceedToPayment}
              leftIcon={savingOrgName ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="font-bold shadow-md shadow-primary/20 min-h-12"
            >
              {savingOrgName
                ? 'Préparation…'
                : `Payer l’abonnement (${activePlanDetails.priceLabel}) & Activer`}
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-muted text-center pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Paiement sécurisé FlexPay via Mobile Money (Orange, M-Pesa, Airtel, Afrimoney) ou Carte</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* ─── MODALE FLEXPAY DE PAIEMENT DIRECT (MOBILE MONEY & CARTE) ─── */}
      <SubscriptionFlexPayModal
        open={flexPayOpen}
        onClose={() => setFlexPayOpen(false)}
        planId={activePlanDetails.id}
        planName={activePlanDetails.name}
        priceLabel={activePlanDetails.priceLabel}
        billingCycle={upgradeCategory === 'b2c' ? 'monthly' : b2bBillingCycle}
        onPaid={handlePaidSuccess}
      />

      {/* ─── FEEDBACK VISUEL DE CONFIRMATION D'UPGRADE ─── */}
      {upgradeSuccess && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border p-6 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-xl animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-foreground">{upgradeSuccessTitle}</h3>
              <p className="text-xs text-muted">
                Votre forfait {activePlanDetails.name} est actif. Ouverture de votre nouveau tableau de bord…
              </p>
            </div>
            <div className="flex justify-center pt-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
