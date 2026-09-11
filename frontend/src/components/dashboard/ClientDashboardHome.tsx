'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
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
import { api } from '@/lib/api';
import { useListingFavorites } from '@/lib/listingFavorites';
import { Modal, Button } from '@/components/ui';
import SubscriptionFlexPayModal from '@/components/SubscriptionFlexPayModal';
import { formatFc, type BillingCycle, type PlanId } from '@/config/landingPricing';
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

const UPGRADE_B2C_PLANS: UpgradePlanConfig[] = [
  {
    id: 'PERSONAL_50',
    name: 'Particulier 50',
    badge: '50 invités',
    basePriceFc: 60000,
    periodLabel: '90 jours (trimestre)',
    guestsMax: 50,
    description: 'Petite célébration ou fête intime.',
    highlights: ['3 événements · 50 invités', 'Invitations & RSVP WhatsApp', 'Éditeur de salle 2D/3D', 'Scan QR smartphone Jour J'],
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
    highlights: ['3 événements · 200 invités', 'Faire-part & RSVP en direct', 'Placement 2D/3D jusqu’à 80 tables', 'Émargement QR en direct'],
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
    highlights: ['10 événements · 150 invités/évt', 'Billetterie & encaissements', 'Invitations & scan QR', 'Tableau de bord financier'],
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

export default function ClientDashboardHome() {
  const { user, tenant } = useAuth();
  const router = useRouter();
  const { items: favoriteItems } = useListingFavorites();

  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    ticketsCount: 0,
    quotesCount: 0,
    bookingsCount: 0,
    packsCount: 0,
    loading: true,
  });

  // États pour l'évolution vers organisation et paiement direct
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeCategory, setUpgradeCategory] = useState<'b2c' | 'b2b'>('b2c');
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>('PERSONAL_200');
  const [b2bBillingCycle, setB2bBillingCycle] = useState<BillingCycle>('monthly');
  const [orgName, setOrgName] = useState(tenant?.name || user?.name || '');
  const [savingOrgName, setSavingOrgName] = useState(false);
  const [flexPayOpen, setFlexPayOpen] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  useEffect(() => {
    if (tenant?.name) setOrgName(tenant.name);
    else if (user?.name) setOrgName(user.name);
  }, [tenant?.name, user?.name]);

  const handleOpenUpgrade = (category: 'b2c' | 'b2b') => {
    setUpgradeCategory(category);
    if (category === 'b2c') {
      setSelectedPlanId('PERSONAL_200');
    } else {
      setSelectedPlanId('PREMIUM_1');
    }
    setUpgradeModalOpen(true);
  };

  const activePlanDetails = useMemo(() => {
    if (upgradeCategory === 'b2c') {
      const plan = UPGRADE_B2C_PLANS.find((p) => p.id === selectedPlanId) || UPGRADE_B2C_PLANS[2];
      return {
        id: plan.id,
        name: plan.name,
        priceFc: plan.basePriceFc,
        priceLabel: formatFc(plan.basePriceFc),
        durationLabel: '90 jours (trimestre)',
        description: plan.description,
      };
    } else {
      const plan = UPGRADE_B2B_PLANS.find((p) => p.id === selectedPlanId) || UPGRADE_B2B_PLANS[1];
      const priceFc =
        b2bBillingCycle === 'annual'
          ? Math.round(plan.monthlyPriceFc * 12 * 0.9)
          : plan.monthlyPriceFc;
      return {
        id: plan.id,
        name: plan.name,
        priceFc,
        priceLabel: formatFc(priceFc),
        durationLabel:
          b2bBillingCycle === 'annual'
            ? '365 jours (annuel · −10 %)'
            : '30 jours (mensuel)',
        description: plan.description,
      };
    }
  }, [upgradeCategory, selectedPlanId, b2bBillingCycle]);

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
      {/* ─── 1. HERO COMPACT & RECHERCHE (ZERO TEXTE SUPERFLU) ─── */}
      <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-surface via-surface to-primary/5 p-5 sm:p-7 shadow-xs">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative space-y-4 max-w-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Bonjour{userName ? `, ${userName}` : ''} 👋
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              100 % gratuit · Sans abonnement
            </span>
          </div>

          {/* Recherche directe */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="relative flex items-center rounded-2xl bg-surface border border-border shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition">
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
                className="absolute right-2 px-4 py-2 rounded-xl bg-primary-solid text-primary-foreground text-xs font-bold hover:bg-primary-solid-hover transition flex items-center gap-1 touch-manipulation cursor-pointer"
              >
                <span>Chercher</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Raccourcis 1 clic */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <Link
              href="/dashboard/catalogue?kind=venue&q=Gombe"
              className="px-2.5 py-1 rounded-lg bg-surface border border-border/80 hover:border-primary/50 text-foreground font-medium transition hover:bg-surface-muted"
            >
              🏛️ Salles Gombe
            </Link>
            <Link
              href="/dashboard/catalogue?kind=service&cat=caterer"
              className="px-2.5 py-1 rounded-lg bg-surface border border-border/80 hover:border-primary/50 text-foreground font-medium transition hover:bg-surface-muted"
            >
              🍽️ Traiteurs
            </Link>
            <Link
              href="/dashboard/catalogue?kind=service&cat=dj"
              className="px-2.5 py-1 rounded-lg bg-surface border border-border/80 hover:border-primary/50 text-foreground font-medium transition hover:bg-surface-muted"
            >
              🎵 DJ &amp; Sono
            </Link>
            <Link
              href="/dashboard/catalogue?tab=plan&planView=ai"
              className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/25 hover:border-primary text-primary font-bold transition inline-flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Simulateur
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 2. BAROMÈTRE D'ACTIVITÉ : CHIFFRES CLÉS (ULTRA-PURIFIÉ) ─── */}
      <section aria-label="Compteurs d'activité" className="rounded-2xl border border-border bg-surface p-1.5 shadow-2xs">
        <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-border/60">
          <Link
            href="/dashboard/bookings?tab=quotes"
            className="p-3 sm:p-4 hover:bg-surface-muted/50 rounded-xl transition group flex items-center justify-between gap-3"
          >
            <div>
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">Devis</span>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                {stats.loading ? (
                  <span className="inline-block w-6 h-6 bg-foreground/10 rounded animate-pulse motion-reduce:animate-none" />
                ) : (
                  stats.quotesCount
                )}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Inbox className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/dashboard/bookings?tab=bookings"
            className="p-3 sm:p-4 hover:bg-surface-muted/50 rounded-xl transition group flex items-center justify-between gap-3"
          >
            <div>
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">Réservations</span>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                {stats.loading ? (
                  <span className="inline-block w-6 h-6 bg-foreground/10 rounded animate-pulse motion-reduce:animate-none" />
                ) : (
                  stats.bookingsCount
                )}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/dashboard/tickets"
            className="p-3 sm:p-4 hover:bg-surface-muted/50 rounded-xl transition group flex items-center justify-between gap-3"
          >
            <div>
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">Billets</span>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                {stats.loading ? (
                  <span className="inline-block w-6 h-6 bg-foreground/10 rounded animate-pulse motion-reduce:animate-none" />
                ) : (
                  stats.ticketsCount
                )}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Ticket className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/dashboard/catalogue?tab=packs"
            className="p-3 sm:p-4 hover:bg-surface-muted/50 rounded-xl transition group flex items-center justify-between gap-3"
          >
            <div>
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">Packs</span>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                {stats.loading ? (
                  <span className="inline-block w-6 h-6 bg-foreground/10 rounded animate-pulse motion-reduce:animate-none" />
                ) : (
                  stats.packsCount
                )}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Bookmark className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/dashboard/catalogue?tab=favorites"
            className="p-3 sm:p-4 hover:bg-surface-muted/50 rounded-xl transition group flex items-center justify-between gap-3 col-span-2 md:col-span-1"
          >
            <div>
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">Favoris</span>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                {stats.loading ? (
                  <span className="inline-block w-6 h-6 bg-foreground/10 rounded animate-pulse motion-reduce:animate-none" />
                ) : (
                  favoriteItems.length
                )}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
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
              <span>Évolution de compte · Créez votre Organisation</span>
            </div>
            <h2 id="upgrade-heading" className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              Organisez vos événements privés ou professionnels
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Débloquez la création d’événements, l’envoi de faire-part WhatsApp nominatifs avec RSVP, la conception de plans de table 2D/3D et le contrôle d’accès par QR code Jour J. Choisissez votre orientation pour régler directement votre premier abonnement et activer votre compte.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Link
              href="/dashboard/billing?tab=plans"
              className="text-xs font-semibold text-muted hover:text-foreground transition underline underline-offset-4"
            >
              Consulter la grille tarifaire complète
            </Link>
          </div>
        </div>

        {/* 2 Cartes de choix interactives : B2C vs B2B */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Carte 1 : Organisation Particulier (B2C) */}
          <div
            onClick={() => handleOpenUpgrade('b2c')}
            className="cursor-pointer group p-5 rounded-2xl border border-rose-500/25 bg-surface hover:border-rose-500/50 hover:shadow-md transition-all flex flex-col justify-between gap-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
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
                  Pour mariages, anniversaires, fêtes familiales ou cérémonies privées sans abonnement mensuel contraignant.
                </p>
              </div>

              <div className="space-y-1.5 pt-1 text-xs text-muted">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>3 événements inclus · 50 à 500 invités</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Faire-part WhatsApp nominatifs avec confirmation RSVP</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Plan de table 2D/3D & scan smartphone Jour J</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between gap-2 mt-auto">
              <span className="text-[11px] font-medium text-muted">Durée : 90 jours (trimestre)</span>
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
                Choisir Particulier & Payer
              </Button>
            </div>
          </div>

          {/* Carte 2 : Organisation Professionnelle (B2B) */}
          <div
            onClick={() => handleOpenUpgrade('b2b')}
            className="cursor-pointer group p-5 rounded-2xl border border-primary/25 bg-surface hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between gap-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
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
                  Pour entreprises, agences événementielles, institutions, séminaires, concerts et organisateurs réguliers.
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
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 font-semibold">
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
                Choisir Entreprise & Payer
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. LES 3 STUDIOS ACTIFS (VISUEL · ZÉRO TEXTE PESANT) ─── */}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Studio 1 : Budget */}
          <Link
            href="/dashboard/catalogue?tab=plan&planView=ai&studio=budget"
            className="rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/5 via-surface to-surface p-4 flex flex-col justify-between gap-3 transition hover:border-primary hover:shadow-xs group"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition">
                  <Wand2 className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
                  Actif
                </span>
              </div>
              <h3 className="font-display text-base font-semibold text-foreground group-hover:text-primary transition">
                Simulateur Budget
              </h3>
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  3 formules
                </span>
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  CDF &amp; USD
                </span>
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  Devis direct
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-border/70 flex items-center justify-between text-xs font-bold text-primary group-hover:translate-x-0.5 transition">
              <span>Calculer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Studio 2 : Invitations */}
          <Link
            href="/dashboard/catalogue?tab=plan&planView=ai&studio=invite"
            className="rounded-2xl border border-pink-500/30 bg-gradient-to-b from-pink-500/5 via-surface to-surface p-4 flex flex-col justify-between gap-3 transition hover:border-pink-500 hover:shadow-xs group"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center group-hover:scale-105 transition">
                  <Mail className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
                  Actif
                </span>
              </div>
              <h3 className="font-display text-base font-semibold text-foreground group-hover:text-pink-600 dark:group-hover:text-pink-400 transition">
                Invitations &amp; Cartes
              </h3>
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  Format 9:16
                </span>
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  WhatsApp
                </span>
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  Lien RSVP
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-border/70 flex items-center justify-between text-xs font-bold text-pink-600 dark:text-pink-400 group-hover:translate-x-0.5 transition">
              <span>Créer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Studio 3 : Plans 3D */}
          <Link
            href="/dashboard/catalogue?tab=plan&planView=ai&studio=room"
            className="rounded-2xl border border-sky-500/30 bg-gradient-to-b from-sky-500/5 via-surface to-surface p-4 flex flex-col justify-between gap-3 transition hover:border-sky-500 hover:shadow-xs group"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
                  Actif
                </span>
              </div>
              <h3 className="font-display text-base font-semibold text-foreground group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
                Plans de Salle 3D
              </h3>
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  Visite WebGL
                </span>
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  Tables &amp; Buffets
                </span>
                <span className="text-[10px] font-medium bg-surface-muted text-muted px-2 py-0.5 rounded-md">
                  Immersion
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-border/70 flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400 group-hover:translate-x-0.5 transition">
              <span>Agencer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </section>

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
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">Salles</span>
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">Jardins</span>
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">Domaines</span>
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
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">Traiteurs</span>
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">DJ</span>
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">Photo</span>
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
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-105 transition">
                <Truck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition">
                Mobilier &amp; Cortèges
              </h3>
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">Chaises</span>
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">Tentes</span>
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">Voitures</span>
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
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">Concerts</span>
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">Galas</span>
                <span className="text-[10px] bg-surface-muted text-muted px-1.5 py-0.5 rounded">Pass QR</span>
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

      {/* ─── MODALE D'ÉVOLUTION VERS ORGANISATION & SÉLECTION DE FORFAIT ─── */}
      <Modal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        size="lg"
        title={
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Crown className="w-5 h-5" />
            </span>
            <span>
              {upgradeCategory === 'b2c'
                ? 'Activer une Organisation Particulier (B2C)'
                : 'Activer une Organisation Professionnelle (B2B)'}
            </span>
          </div>
        }
        description="Choisissez votre formule et réglez directement votre abonnement pour débloquer votre organisation."
      >
        <div className="space-y-6 pt-2">
          {/* Commutateur de catégorie (B2C vs B2B) */}
          <div className="flex p-1 rounded-xl bg-surface-muted border border-border gap-1">
            <button
              type="button"
              onClick={() => handleOpenUpgrade('b2c')}
              className={cn(
                'flex-1 min-h-11 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2',
                upgradeCategory === 'b2c'
                  ? 'bg-surface text-foreground shadow-xs border border-border'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <Heart className="w-4 h-4 text-rose-500" />
              <span>Particulier & Privé (B2C)</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenUpgrade('b2b')}
              className={cn(
                'flex-1 min-h-11 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2',
                upgradeCategory === 'b2b'
                  ? 'bg-surface text-foreground shadow-xs border border-border'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <Building2 className="w-4 h-4 text-primary" />
              <span>Entreprise & Agence (B2B)</span>
            </button>
          </div>

          {/* Commutateur mensuel / annuel si B2B */}
          {upgradeCategory === 'b2b' && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">Cycle de facturation B2B</p>
                <p className="text-[11px] text-muted">Économisez 10 % en optant pour un engagement annuel (365 jours)</p>
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
                  <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500 text-white font-black">−10%</span>
                </button>
              </div>
            </div>
          )}

          {/* Champ optionnel : Nom de l'organisation ou de l'événement */}
          <div className="space-y-1.5">
            <label htmlFor="upgrade-org-name" className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>Nom de votre organisation ou événement</span>
              <span className="text-[11px] font-normal text-muted">(Modifiable à tout moment)</span>
            </label>
            <input
              id="upgrade-org-name"
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder={upgradeCategory === 'b2c' ? 'ex: Mariage Sarah & Paul, Anniversaire 30 ans…' : 'ex: Agence Lumina, Event Corp Kinshasa…'}
              className="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            />
          </div>

          {/* Grille des formules disponibles */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-muted uppercase tracking-wider">
              Sélectionnez votre formule {upgradeCategory === 'b2c' ? 'Particulier (90 jours)' : 'Entreprise'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {upgradeCategory === 'b2c'
                ? UPGRADE_B2C_PLANS.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
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
                        {plan.popular && (
                          <span className="absolute -top-2.5 right-3 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs">
                            Recommandé Mariage
                          </span>
                        )}

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-foreground">{plan.name}</span>
                            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                              {plan.badge}
                            </span>
                          </div>
                          <p className="text-lg font-black text-foreground">
                            {formatFc(plan.basePriceFc)}
                            <span className="text-xs font-normal text-muted ml-1">/ 90 j</span>
                          </p>
                          <p className="text-xs text-muted leading-relaxed mt-1">{plan.description}</p>
                        </div>

                        <div className="space-y-1 pt-2 border-t border-border/60 text-[11px] text-muted">
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
                : UPGRADE_B2B_PLANS.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    const priceFc =
                      b2bBillingCycle === 'annual'
                        ? Math.round(plan.monthlyPriceFc * 12 * 0.9)
                        : plan.monthlyPriceFc;
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
                        {plan.popular && (
                          <span className="absolute -top-2.5 right-3 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary-solid text-primary-foreground shadow-xs">
                            Recommandé Pro
                          </span>
                        )}

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-foreground">{plan.name}</span>
                            <span className="text-[11px] font-semibold text-primary">
                              {plan.badge}
                            </span>
                          </div>
                          <p className="text-lg font-black text-foreground">
                            {formatFc(priceFc)}
                            <span className="text-xs font-normal text-muted ml-1">
                              {b2bBillingCycle === 'annual' ? '/ an' : '/ mois'}
                            </span>
                          </p>
                          <p className="text-xs text-muted leading-relaxed mt-1">{plan.description}</p>
                        </div>

                        <div className="space-y-1 pt-2 border-t border-border/60 text-[11px] text-muted">
                          {plan.highlights.map((h, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <Check className="w-3 h-3 text-primary shrink-0" />
                              <span className="truncate">{h}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
            </div>
          </div>

          {/* Récapitulatif et bouton de paiement direct */}
          <div className="p-4 rounded-2xl bg-surface-muted border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">
                  Formule sélectionnée : <span className="text-primary">{activePlanDetails.name}</span>
                </p>
                <p className="text-[11px] text-muted">Durée de couverture : {activePlanDetails.durationLabel}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted block">Total à payer</span>
                <span className="text-lg font-black text-foreground">{activePlanDetails.priceLabel}</span>
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
                ? 'Préparation de l’organisation…'
                : `Payer l’abonnement (${activePlanDetails.priceLabel}) & Activer`}
            </Button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-muted text-center pt-1">
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
              <h3 className="text-lg font-extrabold text-foreground">Organisation activée avec succès !</h3>
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
