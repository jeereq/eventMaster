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
  Check,
  Loader2,
  BellRing,
  QrCode,
  Clock,
  Music,
  Store,
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

interface ClientTicketSummary {
  orderId: string;
  status?: string;
  guestId: string | null;
  event: { title: string; date: string; location: string };
}

interface ClientInquirySummary {
  id: string;
  title: string;
  status: string;
  quotedAmountFc: number | null;
  hasBooking: boolean;
  closedAt?: string | null;
}

const QUICK_SEARCHES = [
  { label: 'Salles Gombe', href: '/dashboard/catalogue?kind=venue&q=Gombe', icon: Building2 },
  { label: 'Traiteurs', href: '/dashboard/catalogue?kind=service&cat=caterer', icon: Utensils },
  { label: 'DJ & Sono', href: '/dashboard/catalogue?kind=service&cat=dj', icon: Music },
];

const FIRST_STEPS = [
  {
    title: 'Explorez le catalogue',
    detail: 'Salles, prestataires et matériel, avec photos, prix et visite 3D.',
    href: '/dashboard/catalogue',
  },
  {
    title: 'Demandez un devis gratuit',
    detail: 'Le prestataire vous répond ici, sans engagement.',
    href: '/dashboard/catalogue?kind=service',
  },
  {
    title: 'Confirmez et réservez',
    detail: 'Acceptez le devis qui vous convient, puis suivez votre réservation.',
    href: '/dashboard/bookings?tab=quotes',
  },
];

const CATALOGUE_UNIVERSES = [
  { title: 'Salles & espaces', detail: 'Salles, jardins, domaines', href: '/dashboard/catalogue?kind=venue', icon: Building2 },
  { title: 'Prestataires', detail: 'Traiteurs, DJ, photo, déco', href: '/dashboard/catalogue?kind=service', icon: Utensils },
  { title: 'Matériel & cortèges', detail: 'Chaises, tentes, voitures', href: '/dashboard/catalogue?kind=rental', icon: Truck },
  { title: 'Billetterie', detail: 'Concerts, galas, pass QR', href: '/dashboard/catalogue?kind=event', icon: Ticket },
];

const STUDIOS = [
  { id: 'budget' as const, title: 'Simulateur budget', detail: '3 formules en CDF et USD, devis direct', action: 'Calculer', icon: Wand2 },
  { id: 'invite' as const, title: 'Invitations & cartes', detail: 'Format 9:16, partage WhatsApp', action: 'Créer', icon: Mail },
  { id: 'room' as const, title: 'Plan de salle 3D', detail: 'Tables, buffets et visite immersive', action: 'Agencer', icon: Building2 },
];

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function FollowUpRow({
  href,
  icon,
  title,
  detail,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  detail?: string;
  tone: 'festive' | 'muted';
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-3 rounded-2xl border border-border p-3 hover:border-primary/50 hover:bg-surface-muted/40 transition"
      >
        <span
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            tone === 'festive' ? 'bg-festive-accent-soft text-festive-accent' : 'bg-surface-muted text-muted',
          )}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          {detail ? <span className="block text-xs text-muted truncate">{detail}</span> : null}
        </span>
        <ChevronRight className="w-4 h-4 text-muted group-hover:translate-x-0.5 transition shrink-0" aria-hidden />
      </Link>
    </li>
  );
}

function UpgradePathCard({
  icon,
  title,
  detail,
  features,
  options,
  onChoose,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  features?: string[];
  options: Array<{ id: UpgradeCategory; label: string; hint: string; price: string }>;
  onChoose: (category: UpgradeCategory) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">{icon}</span>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          <p className="text-sm text-muted leading-relaxed">{detail}</p>
        </div>
      </div>
      {features && features.length > 0 ? (
        <ul className="space-y-1.5 text-sm text-muted">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary shrink-0" aria-hidden />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="space-y-2 mt-auto">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChoose(option.id)}
            className="group w-full min-h-14 flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3.5 py-2.5 text-left hover:border-primary hover:bg-primary/5 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground group-hover:text-primary transition">{option.label}</span>
              <span className="block text-xs text-muted truncate">{option.hint}</span>
            </span>
            <span className="text-xs font-bold text-foreground tabular-nums shrink-0">{option.price}</span>
            <ChevronRight className="w-4 h-4 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition shrink-0" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
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
  const [activity, setActivity] = useState<{
    tickets: ClientTicketSummary[];
    inquiries: ClientInquirySummary[];
    loadedAt: number;
  }>({
    tickets: [],
    inquiries: [],
    loadedAt: 0,
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

  // Chargement des compteurs et des éléments à suivre
  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      api.get('/marketplace/my-tickets'),
      api.get('/marketplace/bookings?role=organizer'),
      api.get('/marketplace/inquiries?role=organizer'),
      api.get('/marketplace/event-packs'),
    ]).then(([ticketsRes, bookingsRes, inquiriesRes, packsRes]) => {
      if (!mounted) return;
      let tickets: ClientTicketSummary[] = [];
      let inquiries: ClientInquirySummary[] = [];
      let bookingsCount = 0;
      let packsCount = 0;

      if (ticketsRes.status === 'fulfilled' && Array.isArray(ticketsRes.value?.tickets)) {
        tickets = ticketsRes.value.tickets;
      }
      if (inquiriesRes.status === 'fulfilled' && Array.isArray(inquiriesRes.value?.inquiries)) {
        inquiries = inquiriesRes.value.inquiries;
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

      setActivity({ tickets, inquiries, loadedAt: Date.now() });
      setStats({
        ticketsCount: tickets.length,
        quotesCount: inquiries.length,
        bookingsCount,
        packsCount,
        loading: false,
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  /** Ce qui attend le client : devis reçus, paiements à finaliser, prochain billet. */
  const followUp = useMemo(() => {
    const now = activity.loadedAt;
    const openInquiries = activity.inquiries.filter((item) => !item.closedAt && !item.hasBooking);
    const quotesToReview = openInquiries.filter((item) => item.status === 'QUOTED');
    const awaitingReply = openInquiries.filter((item) => item.status === 'NEW' || item.status === 'CONTACTED');
    const pendingPayments = activity.tickets.filter((ticket) => ticket.status === 'PENDING');
    const nextTicket = activity.tickets
      .filter((ticket) => ticket.status !== 'PENDING' && new Date(ticket.event.date).getTime() >= now)
      .sort((a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime())[0] ?? null;
    return { quotesToReview, awaitingReply, pendingPayments, nextTicket };
  }, [activity]);

  const hasFollowUp =
    followUp.quotesToReview.length > 0
    || followUp.awaitingReply.length > 0
    || followUp.pendingPayments.length > 0
    || Boolean(followUp.nextTicket);

  /** Prix d'appel affichés sur les cartes d'évolution (tarifs dynamiques si disponibles). */
  const upgradeFromPrices = useMemo(() => {
    const vendorPrice = (id: PlanId) => {
      const plan = UPGRADE_VENDOR_PLANS.find((p) => p.id === id);
      return plan ? resolvePlanPricing(plan.id, plan.monthlyPriceFc, 'monthly').priceLabel : '';
    };
    return {
      b2c: resolvePlanPricing(UPGRADE_B2C_PLANS[0].id, UPGRADE_B2C_PLANS[0].basePriceFc, 'monthly').priceLabel,
      b2b: resolvePlanPricing(UPGRADE_B2B_PLANS[0].id, UPGRADE_B2B_PLANS[0].monthlyPriceFc, 'monthly').priceLabel,
      venue: vendorPrice('VENUE'),
      service: vendorPrice('SERVICE'),
      catalog: vendorPrice('CATALOG'),
    };
  }, [resolvePlanPricing]);

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
    <div className="space-y-8 pb-12 animate-fade-in max-w-7xl mx-auto">
      {/* ─── 1. EN-TÊTE ─── */}
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
            Compte gratuit · sans abonnement
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Recherche + raccourcis */}
          <div className="lg:col-span-3 rounded-3xl border border-border bg-surface p-4 sm:p-5 flex flex-col gap-4 shadow-2xs">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">Que préparez-vous ?</h2>
              <p className="text-sm text-muted">
                Trouvez une salle, un prestataire ou du matériel, puis demandez un devis gratuit.
              </p>
            </div>
            <form onSubmit={handleSearchSubmit} role="search">
              <div className="relative flex items-center rounded-2xl bg-background border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition">
                <Search className="w-5 h-5 text-muted absolute left-4 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Salle à la Gombe, traiteur, DJ…"
                  aria-label="Rechercher une salle, un prestataire ou un équipement"
                  className="w-full min-h-12 pl-12 pr-28 py-3 bg-transparent text-base sm:text-sm text-foreground placeholder:text-muted focus:outline-none"
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

            <div className="flex flex-wrap items-center gap-2 text-xs" aria-label="Recherches rapides">
              {QUICK_SEARCHES.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-full bg-surface border border-border hover:border-primary/50 hover:text-primary text-foreground font-medium transition"
                >
                  <item.icon className="w-3.5 h-3.5 text-primary" aria-hidden />
                  {item.label}
                </Link>
              ))}
              {activeStudiosCount > 0 && (
                <Link
                  href="/dashboard/catalogue?tab=plan&planView=ai"
                  className="min-h-11 px-3.5 rounded-full bg-primary/10 border border-primary/25 hover:border-primary text-primary font-bold transition inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" aria-hidden />
                  Simuler mon budget
                </Link>
              )}
            </div>

            <nav aria-labelledby="universes-heading" className="mt-auto pt-4 border-t border-border/70 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <h2 id="universes-heading" className="text-xs font-semibold text-muted">Parcourir par univers</h2>
                <Link
                  href="/dashboard/catalogue"
                  className="min-h-11 -my-3 text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  Tout le catalogue
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CATALOGUE_UNIVERSES.map((universe) => (
                  <Link
                    key={universe.href}
                    href={universe.href}
                    className="group rounded-2xl border border-border bg-background/60 p-3 hover:border-primary/50 hover:bg-primary/5 transition flex flex-col gap-2"
                  >
                    <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition">
                      <universe.icon className="w-4 h-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground group-hover:text-primary transition">{universe.title}</span>
                      <span className="block text-xs text-muted leading-snug">{universe.detail}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </nav>
          </div>

          {/* À suivre / premiers pas */}
          <div
            className={cn(
              'lg:col-span-2 rounded-3xl border border-border bg-surface p-4 sm:p-5 shadow-2xs flex flex-col',
              // Sur mobile, ce qui attend une action passe avant la recherche
              hasFollowUp && 'order-first lg:order-none',
            )}
          >
            {stats.loading ? (
              <div className="space-y-3" aria-busy="true" aria-label="Chargement de vos activités">
                <div className="h-5 w-32 rounded bg-foreground/10 animate-pulse motion-reduce:animate-none" />
                <div className="h-14 rounded-2xl bg-foreground/5 animate-pulse motion-reduce:animate-none" />
                <div className="h-14 rounded-2xl bg-foreground/5 animate-pulse motion-reduce:animate-none" />
              </div>
            ) : hasFollowUp ? (
              <>
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-festive-accent" aria-hidden />
                  À suivre
                </h2>
                <ul className="mt-3 space-y-2">
                  {followUp.nextTicket && (
                    <li>
                      <Link
                        href={followUp.nextTicket.guestId ? `/rsvp/${followUp.nextTicket.guestId}` : '/dashboard/tickets'}
                        className="group flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-3 hover:border-primary transition"
                      >
                        <span className="w-10 h-10 rounded-xl bg-primary-solid text-primary-foreground flex items-center justify-center shrink-0">
                          <QrCode className="w-5 h-5" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold text-primary">Prochain événement</span>
                          <span className="block text-sm font-semibold text-foreground truncate">{followUp.nextTicket.event.title}</span>
                          <span className="block text-xs text-muted truncate">
                            {formatShortDate(followUp.nextTicket.event.date)}
                            {followUp.nextTicket.event.location ? ` · ${followUp.nextTicket.event.location}` : ''}
                          </span>
                        </span>
                        <span className="text-xs font-bold text-primary shrink-0 hidden sm:inline">Mon pass</span>
                        <ChevronRight className="w-4 h-4 text-muted group-hover:translate-x-0.5 transition shrink-0" aria-hidden />
                      </Link>
                    </li>
                  )}
                  {followUp.quotesToReview.length > 0 && (
                    <FollowUpRow
                      href="/dashboard/bookings?tab=quotes"
                      icon={<Inbox className="w-4 h-4" aria-hidden />}
                      tone="festive"
                      title={
                        followUp.quotesToReview.length === 1
                          ? 'Un devis attend votre réponse'
                          : `${followUp.quotesToReview.length} devis attendent votre réponse`
                      }
                      detail={
                        followUp.quotesToReview.length === 1
                          ? [
                              followUp.quotesToReview[0].title,
                              followUp.quotesToReview[0].quotedAmountFc
                                ? formatFc(followUp.quotesToReview[0].quotedAmountFc)
                                : null,
                            ].filter(Boolean).join(' · ')
                          : 'Comparez-les et confirmez votre réservation.'
                      }
                    />
                  )}
                  {followUp.pendingPayments.length > 0 && (
                    <FollowUpRow
                      href="/dashboard/tickets"
                      icon={<CreditCard className="w-4 h-4" aria-hidden />}
                      tone="festive"
                      title={
                        followUp.pendingPayments.length === 1
                          ? 'Un paiement de billet à finaliser'
                          : `${followUp.pendingPayments.length} paiements de billets à finaliser`
                      }
                      detail={followUp.pendingPayments[0].event.title}
                    />
                  )}
                  {followUp.awaitingReply.length > 0 && (
                    <FollowUpRow
                      href="/dashboard/bookings?tab=quotes"
                      icon={<Clock className="w-4 h-4" aria-hidden />}
                      tone="muted"
                      title={
                        followUp.awaitingReply.length === 1
                          ? 'Une demande en attente du prestataire'
                          : `${followUp.awaitingReply.length} demandes en attente des prestataires`
                      }
                      detail="Vous serez notifié dès qu’un devis arrive."
                    />
                  )}
                </ul>
              </>
            ) : (
              <>
                <h2 className="text-base font-semibold text-foreground">Comment ça marche</h2>
                <ol className="mt-3 space-y-3">
                  {FIRST_STEPS.map((step, index) => (
                    <li key={step.title}>
                      <Link href={step.href} className="group flex items-start gap-3 rounded-2xl p-2 -m-2 hover:bg-surface-muted/60 transition">
                        <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                          {index + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-foreground group-hover:text-primary transition">{step.title}</span>
                          <span className="block text-xs text-muted leading-relaxed">{step.detail}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ─── 2. MES ACTIVITÉS ─── */}
      <section aria-labelledby="activity-heading" className="space-y-3">
        <h2 id="activity-heading" className="font-display text-lg sm:text-xl font-semibold text-foreground tracking-tight">
          Mes activités
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {[
            { label: 'Devis', value: stats.quotesCount, href: '/dashboard/bookings?tab=quotes', icon: Inbox },
            { label: 'Réservations', value: stats.bookingsCount, href: '/dashboard/bookings?tab=bookings', icon: CalendarCheck },
            { label: 'Billets', value: stats.ticketsCount, href: '/dashboard/tickets', icon: Ticket },
            { label: 'Packs', value: stats.packsCount, href: '/dashboard/catalogue?tab=packs', icon: Bookmark },
            { label: 'Favoris', value: favoriteItems.length, href: '/dashboard/catalogue?tab=favorites', icon: Heart },
          ].map((tile, index) => (
            <Link
              key={tile.href}
              href={tile.href}
              className={cn(
                'group rounded-2xl border border-border bg-surface p-3.5 sm:p-4 hover:border-primary/50 hover:shadow-xs transition flex items-center justify-between gap-3',
                index === 4 && 'col-span-2 sm:col-span-1',
              )}
            >
              <span className="min-w-0">
                <span className="text-xs font-medium text-muted block truncate">{tile.label}</span>
                <span className="block text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                  {stats.loading ? (
                    <span className="inline-block w-6 h-6 bg-foreground/10 rounded animate-pulse motion-reduce:animate-none" />
                  ) : (
                    tile.value
                  )}
                </span>
              </span>
              <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <tile.icon className="w-4 h-4" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── 3. STUDIOS ─── */}
      {activeStudiosCount > 0 && (
        <section aria-labelledby="studios-heading" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="studios-heading" className="font-display text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                Préparer avec les studios
              </h2>
              <p className="text-sm text-muted">Estimez, imaginez et visualisez avant de réserver.</p>
            </div>
            <Link
              href="/dashboard/catalogue?tab=plan&planView=ai"
              className="min-h-11 shrink-0 text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>Simulateur</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </Link>
          </div>

          <div
            className={cn(
              'grid grid-cols-1 gap-2.5 sm:gap-3.5',
              activeStudiosCount === 3
                ? 'sm:grid-cols-3'
                : activeStudiosCount === 2
                  ? 'sm:grid-cols-2'
                  : 'max-w-md',
            )}
          >
            {STUDIOS.filter((studio) => visibility[studio.id]).map((studio) => (
              <Link
                key={studio.id}
                href={`/dashboard/catalogue?tab=plan&planView=ai&studio=${studio.id}`}
                className="group rounded-2xl border border-border bg-surface p-4 flex items-center gap-3 transition hover:border-primary/50 hover:shadow-xs"
              >
                <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <studio.icon className="w-5 h-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-foreground group-hover:text-primary transition">{studio.title}</span>
                  <span className="block text-xs text-muted leading-relaxed">{studio.detail}</span>
                </span>
                <span className="text-xs font-bold text-primary shrink-0 inline-flex items-center gap-1">
                  {studio.action}
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── 4. ÉVOLUTION DE COMPTE ─── */}
      <section aria-labelledby="upgrade-heading" className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="upgrade-heading" className="font-display text-lg sm:text-xl font-semibold text-foreground tracking-tight">
              Vous organisez ou vous vendez ?
            </h2>
            <p className="text-sm text-muted max-w-2xl">
              Activez un forfait : votre compte s’adapte dès que le paiement est validé.
            </p>
          </div>
          <Link
            href="/dashboard/billing?tab=plans"
            className="min-h-11 shrink-0 text-xs font-semibold text-muted hover:text-foreground transition underline underline-offset-4 inline-flex items-center"
          >
            Comparer les forfaits
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <UpgradePathCard
            icon={<Crown className="w-5 h-5" aria-hidden />}
            title="Organiser mon événement"
            detail="Invitez, placez vos invités et accueillez-les le jour J."
            features={['Invitations nominatives et réponses WhatsApp', 'Plan de table 2D/3D', 'Scan QR des invités à l’entrée']}
            options={[
              {
                id: 'b2c',
                label: 'Particulier',
                hint: 'Mariage, anniversaire, fête privée',
                price: `Dès ${upgradeFromPrices.b2c} / 90 j`,
              },
              {
                id: 'b2b',
                label: 'Entreprise',
                hint: 'Galas, conférences, billetterie',
                price: `Dès ${upgradeFromPrices.b2b} / mois`,
              },
            ]}
            onChoose={handleOpenUpgrade}
          />
          <UpgradePathCard
            icon={<Store className="w-5 h-5" aria-hidden />}
            title="Publier au catalogue"
            detail="Recevez des demandes de devis et des réservations, sans organiser d’événement."
            options={[
              { id: 'venue', label: 'Salle', hint: 'Salles illimitées, éditeur 2D/3D', price: `${upgradeFromPrices.venue} / mois` },
              { id: 'service', label: 'Prestataire', hint: 'Prestations et matériel illimités', price: `${upgradeFromPrices.service} / mois` },
              { id: 'catalog', label: 'Salle & presta', hint: 'Les deux, un seul forfait', price: `${upgradeFromPrices.catalog} / mois` },
            ]}
            onChoose={handleOpenUpgrade}
          />
        </div>
      </section>

      {/* ─── 5. ENGAGEMENTS & AIDE ─── */}
      <section className="rounded-2xl border border-border/80 bg-surface p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2 text-sm text-muted">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" aria-hidden />
          <span>Devis gratuits et sans engagement. Les acomptes sont versés directement aux prestataires.</span>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Link
            href="/dashboard/guide"
            className="flex-1 sm:flex-none px-3.5 rounded-xl border border-border bg-surface hover:bg-surface-muted text-xs font-semibold text-foreground transition min-h-11 inline-flex items-center justify-center gap-1.5"
          >
            <HelpCircle className="w-4 h-4" aria-hidden />
            Guide
          </Link>
          <Link
            href="/contact"
            className="flex-1 sm:flex-none px-3.5 rounded-xl border border-border bg-surface hover:bg-surface-muted text-xs font-semibold text-foreground transition min-h-11 inline-flex items-center justify-center"
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
          <div className="grid grid-cols-2 sm:grid-cols-5 p-1 rounded-xl bg-surface-muted border border-border gap-1">
            {(
              [
                { id: 'b2c' as const, label: 'Particulier', icon: Heart, iconClass: 'text-primary' },
                { id: 'b2b' as const, label: 'Entreprise', icon: Building2, iconClass: 'text-primary' },
                { id: 'venue' as const, label: 'Salle', icon: Utensils, iconClass: 'text-primary' },
                { id: 'service' as const, label: 'Prestataire', icon: Truck, iconClass: 'text-primary' },
                { id: 'catalog' as const, label: 'Salle & presta', icon: Sparkles, iconClass: 'text-primary' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleOpenUpgrade(tab.id)}
                className={cn(
                  'min-h-11 py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 last:col-span-2 sm:last:col-span-1',
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
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        onClick={() => setSelectedPlanId(plan.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedPlanId(plan.id);
                          }
                        }}
                        className={cn(
                          'cursor-pointer p-4 rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex flex-col justify-between gap-3 text-left relative',
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
                              Recommandé Mariage
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
                            <span className="text-xs font-normal text-muted">/ 90 j</span>
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
                : upgradeCategory === 'b2b'
                  ? UPGRADE_B2B_PLANS.map((plan) => {
                      const isSelected = selectedPlanId === plan.id;
                      const pricing = resolvePlanPricing(plan.id, plan.monthlyPriceFc, b2bBillingCycle);
                      return (
                        <div
                          key={plan.id}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          onClick={() => setSelectedPlanId(plan.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedPlanId(plan.id);
                            }
                          }}
                          className={cn(
                            'cursor-pointer p-4 rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex flex-col justify-between gap-3 text-left relative',
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
                            role="button"
                            tabIndex={0}
                            aria-pressed={isSelected}
                            onClick={() => setSelectedPlanId(plan.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedPlanId(plan.id);
                              }
                            }}
                            className={cn(
                              'cursor-pointer p-4 rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex flex-col justify-between gap-3 text-left relative sm:col-span-2',
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
