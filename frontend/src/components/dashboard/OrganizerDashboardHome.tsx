'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Users,
  Sparkles,
  Search,
  ArrowRight,
  Building2,
  ScanLine,
  Mail,
  Compass,
  FileText,
  Award,
  PlusCircle,
  CalendarDays,
  Ticket,
  Utensils,
  Wallet,
  Zap,
  MapPin,
  ChevronRight,
  Shield,
  Clock,
  Briefcase,
  CheckCircle2,
  Crown,
  Layers,
  ArrowUpRight,
  CreditCard,
  Percent,
  Check,
  Smartphone,
  Sliders,
  Rss,
  TrendingUp,
  Heart,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Button,
  ViewModeToggle,
  ProjectCard,
  ListRowAction,
  Pagination,
  listStackClass,
  Card,
  type GridColumns,
} from '@/components/ui';
import GettingStartedChecklist from '@/components/GettingStartedChecklist';
import QuotaUsagePanel from '@/components/QuotaUsagePanel';
import type { QuotaSnapshot } from '@/lib/quotaDisplay';
import type { PlanId } from '@/config/landingPricing';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';

export interface OrganizerEventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
}

interface OrganizerDashboardHomeProps {
  events: OrganizerEventItem[];
  billing: {
    plan: PlanId;
    limits: QuotaSnapshot['limits'] & {
      customTemplates?: boolean;
    };
    usage?: QuotaSnapshot['usage'];
  } | null;
  orgQuota: QuotaSnapshot | null;
  homeEventsMode: 'grid' | 'list';
  setHomeEventsMode: (mode: 'grid' | 'list') => void;
  homeEventsColumns: GridColumns;
  setHomeEventsColumns: (cols: GridColumns) => void;
  homeEventsGridClass: string;
  homeEventsPage: number;
  setHomeEventsPage: (page: number) => void;
  homeEventsPageSize: number;
  setHomeEventsPageSize: (size: number) => void;
}

export default function OrganizerDashboardHome({
  events,
  billing,
  orgQuota,
  homeEventsMode,
  setHomeEventsMode,
  homeEventsColumns,
  setHomeEventsColumns,
  homeEventsGridClass,
  homeEventsPage,
  setHomeEventsPage,
  homeEventsPageSize,
  setHomeEventsPageSize,
}: OrganizerDashboardHomeProps) {
  const { user, tenant, planQuota, access } = useAuth();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');

  const isVendor = tenant?.accountKind === 'VENDOR';
  const isBoth = tenant?.accountKind === 'BOTH';
  const isOwner = Boolean(access?.isOwner) || (Boolean(user?.id) && user?.id === tenant?.managerId);
  const isManager = access?.level === 'manager' && !isOwner;

  const [ticketingSummary, setTicketingSummary] = useState<{
    totalRevenueFc: number;
    ticketsRevenueFc?: number;
    donationsRevenueFc?: number;
    paidTicketsCount: number;
    donationsCount?: number;
    pendingRevenueFc?: number;
    pendingTicketsCount?: number;
    paidOrdersCount: number;
    pendingOrdersCount: number;
    totalOrdersCount: number;
    checkedInGuestsCount: number;
  } | null>(null);

  useEffect(() => {
    if (isOwner || access?.canViewBilling) {
      let isMounted = true;
      api
        .get('/events/ticketing/summary')
        .then((res) => {
          if (isMounted && res?.summary) {
            setTicketingSummary(res.summary);
          }
        })
        .catch(() => {
          // Si l'organisation n'a pas encore de commandes
        });
      return () => {
        isMounted = false;
      };
    }
  }, [isOwner, access?.canViewBilling]);

  const licenseExpiresAt = tenant?.licenseExpiresAt;
  const daysUntilExpiry = licenseExpiresAt
    ? Math.ceil((new Date(licenseExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const usage = planQuota?.usage || billing?.usage;
  const limits = planQuota?.limits || billing?.limits;

  const formatQuota = (used: number | undefined, max: number | undefined) => {
    if (used == null) return '0';
    if (max == null || max < 0) return String(used);
    return `${used} / ${max}`;
  };

  const greetingHour = new Date().getHours();
  const greetingLabel =
    greetingHour < 12 ? 'Bonjour' : greetingHour < 18 ? 'Bon après-midi' : 'Bonsoir';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/dashboard/events?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  // Pagination des événements récents
  const startIdx = (homeEventsPage - 1) * homeEventsPageSize;
  const paginatedEvents = events.slice(startIdx, startIdx + homeEventsPageSize);

  return (
    <div className="space-y-10 pb-16 animate-fade-in em-dashboard-home">
      {/* ══════════════════════════════════════════════════════════════════════════
          THÉMATIQUE 1 : 🚀 PILOTAGE GLOBAL & ACTIONS DIRECTES
      ══════════════════════════════════════════════════════════════════════════ */}
      <section className="space-y-6">
        {/* Alerte proactive d'échéance de licence pour le Propriétaire */}
        {isOwner && daysUntilExpiry != null && daysUntilExpiry <= 15 && (
          <div
            className={cn(
              'p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm transition',
              daysUntilExpiry <= 0
                ? 'bg-danger/10 border-danger/30 text-danger'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'p-2 rounded-xl shrink-0',
                  daysUntilExpiry <= 0 ? 'bg-danger/20 text-danger' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                )}
              >
                {daysUntilExpiry <= 0 ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-bold">
                  {daysUntilExpiry <= 0
                    ? 'Abonnement expiré'
                    : `Expiration dans ${daysUntilExpiry} jour${daysUntilExpiry > 1 ? 's' : ''}`}
                </p>
                <p className="text-xs opacity-90 mt-0.5">
                  {daysUntilExpiry <= 0
                    ? 'Renouvelez votre formule pour réactiver vos services et quotas.'
                    : 'Renouvelez pour maintenir les invitations WhatsApp et le contrôle d’accès.'}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary-solid text-primary-foreground hover:bg-primary-solid-hover transition shrink-0"
            >
              <span>Renouveler</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Bannière Hero avec recherche intégrée */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border bg-linear-to-br from-primary/10 via-surface to-surface-muted p-5 sm:p-7 shadow-xs">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative space-y-4 max-w-3xl">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/15 text-primary border border-primary/25">
                  <Sparkles className="w-3.5 h-3.5" />
                  {isManager
                    ? 'Espace Manager'
                    : isVendor
                    ? 'Espace Prestataire / Salles'
                    : isBoth
                    ? 'Espace Mixte (Organisation & Vitrine)'
                    : isOwner
                    ? 'Espace Propriétaire · Direction'
                    : 'Espace Organisateur'}
                </span>
                {tenant?.name && (
                  <span className="text-xs font-semibold text-muted">
                    · {tenant.name}
                  </span>
                )}
                {tenant?.plan && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-surface border border-border text-foreground">
                    Forfait {tenant.plan}
                  </span>
                )}
                {isOwner && daysUntilExpiry != null && (
                  <span
                    className={cn(
                      'text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border',
                      daysUntilExpiry <= 0
                        ? 'bg-danger/10 border-danger/30 text-danger'
                        : daysUntilExpiry <= 15
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    )}
                  >
                    {daysUntilExpiry <= 0 ? 'Expiré' : `Licence · ${daysUntilExpiry}j restants`}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
                {greetingLabel}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
              </h1>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                {isOwner
                  ? 'Pilotage de votre organisation, finances et équipe.'
                  : isManager
                  ? 'Gestion opérationnelle de vos événements, équipe et devis.'
                  : isVendor
                  ? 'Gestion de vos prestations et réponses aux devis.'
                  : 'Créez vos événements, invitations et plans de table.'}
              </p>
            </div>

            {/* Barre de recherche avec actions directes */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="relative flex items-center">
                <Search className="w-5 h-5 text-muted absolute left-4 pointer-events-none" />
                <label htmlFor="org-home-search" className="sr-only">Rechercher</label>
                <input
                  id="org-home-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un événement, un invité, une salle…"
                  className="w-full min-h-11 pl-11 pr-32 py-3.5 rounded-xl border border-border bg-surface text-sm text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent shadow-xs transition"
                />
                <button
                  type="submit"
                  className="absolute right-2 min-h-11 px-4 py-2 rounded-lg bg-primary-solid text-primary-foreground text-xs font-bold hover:bg-primary-solid-hover transition flex items-center gap-1.5 touch-manipulation cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary-solid"
                >
                  <span>Rechercher</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {/* Raccourcis directs en 1 clic */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
              <span className="text-xs font-medium text-muted mr-1">Accès direct :</span>
              <Link
                href={isVendor ? '/dashboard/marketplace' : '/dashboard/events'}
                className="min-h-11 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 hover:border-primary text-xs font-bold text-primary transition inline-flex items-center gap-1"
              >
                <PlusCircle className="w-3 h-3" />
                {isVendor ? 'Nouvelle prestation' : 'Créer un événement'}
              </Link>
              <Link
                href="/dashboard/tickets"
                className="min-h-11 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 hover:border-primary text-xs font-bold text-primary transition inline-flex items-center gap-1"
              >
                <Ticket className="w-3.5 h-3.5" />
                Billetterie
              </Link>
              {isOwner ? (
                <>
                  <Link
                    href="/dashboard/team"
                    className="min-h-11 px-3 py-2 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-xs font-medium text-foreground transition inline-flex items-center gap-1"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-primary" />
                    Équipe
                  </Link>
                  <Link
                    href="/dashboard/billing"
                    className="min-h-11 px-3 py-2 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-xs font-medium text-foreground transition inline-flex items-center gap-1"
                  >
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    Abonnement
                  </Link>
                </>
              ) : null}
              <Link
                href="/dashboard/rooms"
                className="min-h-11 px-3 py-2 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-xs font-medium text-foreground transition inline-flex items-center"
              >
                Plan 2D/3D
              </Link>
              <Link
                href="/dashboard/protocol"
                className="min-h-11 px-3 py-2 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-xs font-medium text-foreground transition inline-flex items-center gap-1"
              >
                <ScanLine className="w-3 h-3 text-amber-500" />
                Scanner QR
              </Link>
              <Link
                href="/dashboard/catalogue"
                className="min-h-11 px-3 py-2 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-xs font-medium text-foreground transition inline-flex items-center"
              >
                Marketplace
              </Link>
              <Link
                href="/dashboard/catalogue?tab=plan&planView=ai"
                className="min-h-11 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 hover:border-primary text-xs font-bold text-primary transition inline-flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Simulateur IA
              </Link>
              {isManager ? (
                <>
                  <Link
                    href="/dashboard/publications"
                    className="min-h-11 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 hover:border-primary text-xs font-bold text-primary transition inline-flex items-center gap-1"
                  >
                    <Rss className="w-3 h-3" />
                    Réalisations
                  </Link>
                  <Link
                    href="/dashboard/team"
                    className="min-h-11 px-3 py-2 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-xs font-medium text-foreground transition inline-flex items-center"
                  >
                    Équipe
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Checklist de démarrage */}
        {user?.role === 'USER' && (
          <GettingStartedChecklist
            hasEvents={events.length > 0}
            hasGuests={(planQuota?.usage.guests ?? 0) > 0}
            firstEventId={events[0]?.id}
            variant={isVendor || (planQuota != null && (planQuota.limits.maxEvents ?? 0) <= 0) ? 'vendor' : 'organizer'}
            hasRooms={(planQuota?.usage.rooms ?? 0) > 0}
            hasServices={(planQuota?.usage.services ?? 0) > 0}
            preferServices={(planQuota?.limits.maxRooms ?? 1) <= 0}
          />
        )}

        {/* Indicateurs clés en temps réel (5 Cartes) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <Link
            href="/dashboard/events"
            className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-primary/50 hover:bg-primary/5 transition group flex flex-col justify-between h-full"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Événements</span>
              <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-foreground tracking-tight">
                {usage ? formatQuota(usage.events, limits?.maxEvents) : events.length}
              </p>
              <p className="text-xs text-muted mt-0.5">Total créés</p>
            </div>
          </Link>

          <Link
            href="/dashboard/events"
            className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-amber-500/40 hover:bg-amber-500/5 transition group flex flex-col justify-between h-full"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Invités</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-foreground tracking-tight">
                {usage ? formatQuota(usage.guests, limits?.maxGuests) : '—'}
              </p>
              <p className="text-xs text-muted mt-0.5">Total enregistrés</p>
            </div>
          </Link>

          {isOwner ? (
            <Link
              href="/dashboard/team"
              className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-blue-500/40 hover:bg-blue-500/5 transition group flex flex-col justify-between h-full"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">Équipe</span>
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-foreground tracking-tight">
                  {usage ? formatQuota(usage.orgManagers, limits?.maxOrgManagers) : '—'}
                </p>
                <p className="text-xs text-muted mt-0.5">Membres actifs</p>
              </div>
            </Link>
          ) : (
            <Link
              href={isVendor ? '/dashboard/marketplace' : '/dashboard/rooms'}
              className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-purple-500/40 hover:bg-purple-500/5 transition group flex flex-col justify-between h-full"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">
                  {isVendor ? 'Prestations' : 'Salles & Plans'}
                </span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition">
                  {isVendor ? <Briefcase className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-foreground tracking-tight">
                  {isVendor
                    ? (usage ? formatQuota(usage.services, limits?.maxServices) : '—')
                    : (usage ? formatQuota(usage.rooms, limits?.maxRooms) : '—')}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {isVendor ? 'Prestations' : 'Plans créés'}
                </p>
              </div>
            </Link>
          )}

          <Link
            href="/dashboard/bookings"
            className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition group flex flex-col justify-between h-full"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Devis & Packs</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-foreground tracking-tight flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                Actifs
              </p>
              <p className="text-xs text-muted mt-0.5">En cours</p>
            </div>
          </Link>

          <Link
            href={isManager ? '/dashboard/invoices' : '/dashboard/billing'}
            className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-primary/50 hover:bg-primary/5 transition group flex flex-col justify-between h-full col-span-2 md:col-span-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">
                {isManager ? 'Factures' : 'Mon Forfait'}
              </span>
              <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition">
                {isManager ? <FileText className="w-4 h-4" /> : <Award className="w-4 h-4" />}
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xl font-black text-foreground tracking-tight truncate">
                  {tenant?.plan || billing?.plan || 'Standard'}
                </p>
                {isOwner && daysUntilExpiry != null && (
                  <span
                    className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                      daysUntilExpiry <= 0
                        ? 'bg-danger/10 text-danger border border-danger/20'
                        : daysUntilExpiry <= 15
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    )}
                  >
                    {daysUntilExpiry <= 0 ? 'Expiré' : `${daysUntilExpiry}j`}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5 truncate">
                {isManager
                  ? 'Géré par le propriétaire'
                  : daysUntilExpiry != null
                  ? daysUntilExpiry <= 0
                    ? 'Renouvellement requis'
                    : `${daysUntilExpiry}j restants`
                  : 'Gérer l’abonnement'}
              </p>
            </div>
          </Link>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════
            PILOTAGE FINANCIER & ENCAISSEMENTS (PROPRIÉTAIRE & DIRECTION)
        ══════════════════════════════════════════════════════════════════════════ */}
        {(isOwner || access?.canViewBilling) && (
          <div className="space-y-3.5 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface p-4 sm:p-5 rounded-2xl border border-border shadow-2xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </span>
                  <h2 className="text-base font-bold text-foreground">
                    Finances & Billetterie
                  </h2>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    Direction
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Recettes de billetterie, dons et émargement en direct.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href="/dashboard/tickets"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15 transition inline-flex items-center gap-1.5"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Billetterie & Dons</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
                <Link
                  href="/dashboard/billing"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-surface-muted hover:bg-surface border border-border text-foreground transition inline-flex items-center gap-1.5"
                >
                  <Award className="w-3.5 h-3.5 text-primary" />
                  <span>Abonnement</span>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {/* 1. Revenus Globaux */}
              <div className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider">Recettes Globales</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                    {formatFc(ticketingSummary?.totalRevenueFc ?? 0)}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {ticketingSummary?.paidOrdersCount ?? 0} commande{(ticketingSummary?.paidOrdersCount ?? 0) > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* 2. Billetterie Commerciale */}
              <div className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-primary/50 hover:bg-primary/5 transition flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider">Ventes Billets</span>
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Ticket className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                    {formatFc(ticketingSummary?.ticketsRevenueFc ?? (ticketingSummary?.totalRevenueFc ?? 0))}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {ticketingSummary?.paidTicketsCount ?? 0} billet{(ticketingSummary?.paidTicketsCount ?? 0) > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* 3. Dons Solidaires */}
              <div className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-rose-500/50 hover:bg-rose-500/5 transition flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider">Dons Solidaires</span>
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <Heart className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                    {formatFc(ticketingSummary?.donationsRevenueFc ?? 0)}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {ticketingSummary?.donationsCount ?? 0} don{(ticketingSummary?.donationsCount ?? 0) > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* 4. Émargement Jour J */}
              <div className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-amber-500/50 hover:bg-amber-500/5 transition flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider">Émargement Jour J</span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <ScanLine className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                    {ticketingSummary?.checkedInGuestsCount ?? 0}
                    <span className="text-sm font-semibold text-muted ml-1">
                      / {ticketingSummary?.paidTicketsCount || ticketingSummary?.totalOrdersCount || 0}
                    </span>
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {(ticketingSummary?.paidTicketsCount ?? 0) > 0
                      ? `${Math.round(((ticketingSummary?.checkedInGuestsCount ?? 0) / (ticketingSummary?.paidTicketsCount || 1)) * 100)} % présents`
                      : 'Scannés'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          THÉMATIQUE 2 : 👥 INVITÉS, FAIRE-PART & ACCUEIL JOUR J
      ══════════════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold text-foreground">Invités & Accueil Jour J</h2>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Invitations WhatsApp, confirmations et émargement QR.
            </p>
          </div>
          <Link
            href="/dashboard/events"
            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Tous les événements <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Carte 1 : Faire-part & Invitations WhatsApp */}
          <div className="p-5 rounded-2xl border border-border bg-surface hover:border-blue-500/40 hover:shadow-xs transition group flex flex-col justify-between h-full gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                  Faire-part & RSVP
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                  Invitations & Faire-part
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-1">
                  Faire-part personnalisés, envois nominatifs WhatsApp et suivi des confirmations.
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Envois individuels WhatsApp et e-mail</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>RSVP et régimes alimentaires</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Pass d&apos;accès avec QR code</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between gap-2 mt-auto">
              <div className="flex items-center gap-1.5">
                <Link
                  href="/dashboard/templates"
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-surface-muted hover:bg-primary/10 hover:text-primary transition text-muted"
                >
                  Modèles
                </Link>
              </div>
              <Button
                size="sm"
                onClick={() => router.push(events.length > 0 ? `/dashboard/events/${events[0].id}` : '/dashboard/events')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Gérer les invités
              </Button>
            </div>
          </div>

          {/* Carte 2 : Protocole & Contrôle d'Accès QR */}
          <div className="p-5 rounded-2xl border border-border bg-surface hover:border-amber-500/40 hover:shadow-xs transition group flex flex-col justify-between h-full gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <ScanLine className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  Accueil Jour J
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                  Protocole & Contrôle d’Accès
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-1">
                  Scan smartphone rapide à l’entrée, détection des doublons et suivi en direct.
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Scan par caméra smartphone</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Checklist et affectation d’équipe</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Contrôle anti-doublon et table</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between gap-2 mt-auto">
              <div className="flex items-center gap-1.5">
                <Link
                  href="/dashboard/team"
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-surface-muted hover:bg-primary/10 hover:text-primary transition text-muted"
                >
                  Équipe
                </Link>
                <Link
                  href="/dashboard/protocol?view=tasks"
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-surface-muted hover:bg-primary/10 hover:text-primary transition text-muted"
                >
                  Tâches
                </Link>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push('/dashboard/protocol')}
                rightIcon={<ScanLine className="w-3.5 h-3.5" />}
              >
                Ouvrir le Protocole
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          THÉMATIQUE 3 : 🏛️ ESPACES, SCÉNOGRAPHIE & MARKETPLACE
      ══════════════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Building2 className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-foreground">Salles & Marketplace</h2>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Plans de table 2D/3D, simulateur IA et devis prestataires.
          </p>
        </div>

        <div className={cn('grid grid-cols-1 gap-4', isManager ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-3')}>
          {isManager ? (
            <div className="p-5 rounded-2xl border border-primary/25 bg-primary/5 hover:border-primary/50 hover:shadow-xs transition group flex flex-col justify-between h-full gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 text-primary flex items-center justify-center">
                    <Rss className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                    Réalisations
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                    Photos & Actualités
                  </h3>
                  <p className="text-xs text-muted leading-relaxed mt-1">
                    Partagez vos photos d&apos;événements et actualités.
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={() => router.push('/dashboard/publications')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="mt-auto"
              >
                Voir les réalisations
              </Button>
            </div>
          ) : null}
          {/* Carte 1 : Plan de Salle 2D/3D */}
          <div className="p-5 rounded-2xl border border-border bg-surface hover:border-purple-500/40 hover:shadow-xs transition group flex flex-col justify-between h-full gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                  Plan 2D/3D
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                  Plan de salle & Placement
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-1">
                  Disposition des tables, scène, buffet et placement des invités.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] px-2 py-0.5 rounded bg-surface-muted text-muted">Tables rondes & rect.</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-surface-muted text-muted">Scène & Buffet</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-surface-muted text-muted">Vue 3D</span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={() => router.push('/dashboard/rooms')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="mt-auto"
            >
              Éditeur 2D/3D
            </Button>
          </div>

          {/* Carte 2 : Trouver des prestataires & Packs IA */}
          <div className="p-5 rounded-2xl border border-primary/30 bg-primary/5 hover:border-primary hover:shadow-xs transition group flex flex-col justify-between h-full gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 text-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  Simulateur IA
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                  Simulateur IA & Packs
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-1">
                  3 combinaisons budgétaires instantanées (éco, confort, prestige) avec prestataires certifiés.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <Link
                  href="/dashboard/catalogue?tab=plan&planView=ai"
                  className="text-xs font-bold px-2.5 py-1 rounded-[var(--radius-button)] bg-primary-solid text-primary-foreground hover:bg-primary-solid-hover transition inline-flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Simuler 3 packs
                </Link>
                <Link
                  href="/dashboard/catalogue?kind=venue"
                  className="text-[10px] font-medium px-2 py-0.5 rounded bg-surface border border-border hover:bg-primary/10 hover:text-primary transition text-muted"
                >
                  Salles
                </Link>
                <Link
                  href="/dashboard/catalogue?kind=service"
                  className="text-[10px] font-medium px-2 py-0.5 rounded bg-surface border border-border hover:bg-primary/10 hover:text-primary transition text-muted"
                >
                  Prestataires
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-auto">
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={() => router.push('/dashboard/catalogue?tab=plan&planView=ai')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="shadow-xs shadow-primary/20"
              >
                Lancer la simulation
              </Button>
              {isManager ? (
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => router.push('/dashboard/catalogue?tab=plan&planView=ai&buyTokens=1')}
                >
                  Acheter des jetons
                </Button>
              ) : null}
            </div>
          </div>

          {/* Carte 3 : Devis, Réservations & Suivi */}
          <div className="p-5 rounded-2xl border border-border bg-surface hover:border-emerald-500/40 hover:shadow-xs transition group flex flex-col justify-between h-full gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  Devis & Contrats
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                  Devis & Réservations
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-1">
                  Suivi des demandes prestataires, dates confirmées et devis en cours.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <Link
                  href="/dashboard/bookings?tab=quotes"
                  className="text-[10px] font-medium px-2 py-0.5 rounded bg-surface-muted hover:bg-primary/10 hover:text-primary transition text-muted"
                >
                  Devis en cours
                </Link>
                <Link
                  href="/dashboard/bookings?tab=bookings"
                  className="text-[10px] font-medium px-2 py-0.5 rounded bg-surface-muted hover:bg-primary/10 hover:text-primary transition text-muted"
                >
                  Dates réservées
                </Link>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={() => router.push('/dashboard/bookings')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="mt-auto"
            >
              Gérer mes devis
            </Button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          THÉMATIQUE 4 : 📋 ÉVÉNEMENTS RÉCENTS & GESTION EN COURS
      ══════════════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="bg-surface border border-border rounded-[var(--radius-card)] p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Événements récents
              </h2>
              <p className="text-xs text-muted">
                Suivi et gestion de vos réceptions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <ViewModeToggle
                storageKey="em-view-home-events"
                value={homeEventsMode}
                onChange={setHomeEventsMode}
                columns={homeEventsColumns}
                onColumnsChange={setHomeEventsColumns}
                defaultMode="grid"
                defaultColumns={2}
              />
              <Link
                href="/dashboard/events"
                className="text-xs font-bold text-primary hover:text-primary-hover transition flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10"
              >
                Voir tout ({events.length})
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-12 bg-surface-muted border border-dashed border-border rounded-[var(--radius-card)]">
              <Calendar className="w-12 h-12 text-muted mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold text-foreground">Aucun événement pour le moment</h3>
              <p className="text-sm text-muted mt-1 max-w-xs mx-auto">
                Créez votre premier événement pour lancer vos invitations.
              </p>
              <Link
                href="/dashboard/events"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-solid hover:bg-primary-solid-hover text-primary-foreground font-semibold rounded-lg text-sm transition"
              >
                Créer un événement
              </Link>
            </div>
          ) : (
            <>
              <div className={homeEventsMode === 'list' ? listStackClass : homeEventsGridClass}>
                {paginatedEvents.map((event) => {
                  const dateLabel = new Date(event.date).toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });
                  return (
                    <ProjectCard
                      key={event.id}
                      id={event.id}
                      title={event.title}
                      layout={homeEventsMode}
                      icon={<Calendar className="w-4 h-4" />}
                      overlayMeta={dateLabel}
                      ctaLabel="Ouvrir"
                      meta={
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0 opacity-70" />
                          {event.location}
                        </span>
                      }
                      value={homeEventsMode === 'list' ? dateLabel : undefined}
                      description={homeEventsMode === 'grid' ? event.description : undefined}
                      onClick={() => router.push(`/dashboard/events/${event.id}`)}
                      actions={
                        homeEventsMode === 'list' ? (
                          <Link
                            href={`/dashboard/events/${event.id}`}
                            className="inline-flex items-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ListRowAction />
                          </Link>
                        ) : undefined
                      }
                    />
                  );
                })}
              </div>
              <Pagination
                page={homeEventsPage}
                pageSize={homeEventsPageSize}
                total={events.length}
                onPageChange={setHomeEventsPage}
                onPageSizeChange={setHomeEventsPageSize}
                itemLabel="événements"
              />
            </>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          THÉMATIQUE 5 : 💎 ABONNEMENTS, QUOTAS & ÉVOLUTION DE FORFAIT (UPGRADE)
      ══════════════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Award className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-foreground">
              {isManager ? 'Quotas de l’organisation' : 'Abonnement & Quotas'}
            </h2>
          </div>
          <p className="text-xs text-muted mt-0.5">
            {isManager
              ? 'Consultez vos quotas. Seul le propriétaire peut modifier le forfait.'
              : 'Suivi de vos quotas et gestion de votre formule.'}
          </p>
        </div>

        {/* Panneau de suivi des quotas actuels */}
        {orgQuota && (
          <div className="space-y-2">
            <QuotaUsagePanel quota={orgQuota} />
          </div>
        )}

        {isOwner && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Shield className="w-4 h-4" />
                </span>
                <p className="text-sm font-bold text-foreground">
                  Titulaire : Forfait {tenant?.plan || billing?.plan || 'actuel'}
                </p>
                {daysUntilExpiry != null && (
                  <span
                    className={cn(
                      'text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border',
                      daysUntilExpiry <= 0
                        ? 'bg-danger/10 border-danger/30 text-danger'
                        : daysUntilExpiry <= 15
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    )}
                  >
                    {daysUntilExpiry <= 0 ? 'Expiré' : `Échéance dans ${daysUntilExpiry} jours`}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted">
                Modifiez votre formule, renouvelez votre licence ou appliquez un code promo.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/dashboard/billing"
                className="px-4 py-2 rounded-xl bg-primary-solid hover:bg-primary-solid-hover text-primary-foreground text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <span>Gérer l’abonnement</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {isManager ? (
          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-bold text-foreground">Forfait {tenant?.plan || billing?.plan || 'actuel'}</p>
              <p className="text-xs text-muted leading-relaxed">
                Factures consultables. Le forfait est géré par le propriétaire.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => router.push('/dashboard/invoices')}
                leftIcon={<FileText className="w-3.5 h-3.5" />}
              >
                Factures
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => router.push('/dashboard/publications')}
                leftIcon={<Rss className="w-3.5 h-3.5" />}
              >
                Réalisations
              </Button>
            </div>
          </div>
        ) : (
        <div className="rounded-2xl sm:rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/5 via-surface to-surface-muted p-5 sm:p-7 space-y-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-border/80">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  <Crown className="w-3.5 h-3.5" />
                  Formules
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/40">
                  <Percent className="w-3 h-3" /> −10 % en paiement annuel
                </span>
                <span className="text-xs font-medium text-primary flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                  <Sparkles className="w-3 h-3" /> Codes promos acceptés
                </span>
              </div>
              <h3 className="text-xl font-bold text-foreground mt-1">
                Besoin de plus d’invités ou de quotas ?
              </h3>
              <p className="text-xs text-muted max-w-2xl leading-relaxed">
                Faites évoluer votre formule à tout moment pour augmenter vos quotas d&apos;invités, salles et accès équipe.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                href="/dashboard/billing"
                className="px-4 py-2.5 rounded-xl bg-primary-solid hover:bg-primary-solid-hover text-primary-foreground text-xs font-bold transition shadow-xs shadow-primary/20 flex items-center gap-1.5"
              >
                <span>Changer de formule</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Grille détaillée des 4 types d'abonnements */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
            {/* 1. Formules Particulier (B2C) */}
            <div className="p-4 rounded-xl border border-border bg-surface flex flex-col justify-between h-full gap-3 hover:border-emerald-500/40 transition">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    Particulier
                  </span>
                  <span className="text-xs font-bold text-foreground">Dès 60 000 FC</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Mariages & Célébrations</h4>
                  <p className="text-xs text-muted mt-0.5">Événements privés sans engagement mensuel.</p>
                </div>
                <div className="space-y-1 text-xs text-muted pt-1">
                  <p>• <strong>Particulier 50</strong> : 60 000 FC / trim.</p>
                  <p>• <strong>Particulier 100</strong> : 90 000 FC / trim.</p>
                  <p>• <strong>Particulier 200</strong> : 120 000 FC / trim.</p>
                  <p>• <strong>Particulier +200</strong> : 180 000 FC / trim.</p>
                </div>
              </div>
              <Link
                href="/dashboard/billing"
                className="text-xs font-bold text-emerald-600 hover:underline inline-flex items-center gap-1 pt-2 border-t border-border mt-auto"
              >
                Voir Particulier <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* 2. Formules Business & Professionnel */}
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex flex-col justify-between h-full gap-3 shadow-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/20 text-primary">
                    Populaire · B2B
                  </span>
                  <span className="text-xs font-bold text-foreground">Dès 30 000 FC</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Business & Premium</h4>
                  <p className="text-xs text-muted mt-0.5">Organisateurs réguliers, agences et PME.</p>
                </div>
                <div className="space-y-1 text-xs text-muted pt-1">
                  <p>• <strong>Business</strong> : 30 000 FC / mois (150 inv.)</p>
                  <p>• <strong>Premium</strong> : 55 000 FC / mois (500 inv.)</p>
                  <p>• <strong>Premium Plus</strong> : 85 000 FC / mois (1 000 inv.)</p>
                  <p>• <strong>Inclus</strong> : Scan QR, OCR, billetterie</p>
                </div>
              </div>
              <Link
                href="/dashboard/billing"
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 pt-2 border-t border-primary/20 mt-auto"
              >
                Voir Business <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* 3. Formules Enterprise */}
            <div className="p-4 rounded-xl border border-border bg-surface flex flex-col justify-between h-full gap-3 hover:border-amber-500/40 transition">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    Grand Volume
                  </span>
                  <span className="text-xs font-bold text-foreground">Dès 350 000 FC</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Enterprise & Salons</h4>
                  <p className="text-xs text-muted mt-0.5">Festivals, salons et grands événements.</p>
                </div>
                <div className="space-y-1 text-xs text-muted pt-1">
                  <p>• <strong>Enterprise</strong> : 350 000 FC / mois (3 500 inv.)</p>
                  <p>• <strong>Enterprise Pro</strong> : 525 000 FC / mois (5 000 inv.)</p>
                  <p>• <strong>Enterprise Unlimited</strong> : 700 000 FC / mois</p>
                  <p>• <strong>Inclus</strong> : Multi-salles, SLA & support dédié</p>
                </div>
              </div>
              <Link
                href="/dashboard/billing"
                className="text-xs font-bold text-amber-600 hover:underline inline-flex items-center gap-1 pt-2 border-t border-border mt-auto"
              >
                Voir Enterprise <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* 4. Formules Vitrine & Catalogue */}
            <div className="p-4 rounded-xl border border-border bg-surface flex flex-col justify-between h-full gap-3 hover:border-purple-500/40 transition">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300">
                    Vitrine Marketplace
                  </span>
                  <span className="text-xs font-bold text-foreground">Dès 9 900 FC</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Salles & Prestataires</h4>
                  <p className="text-xs text-muted mt-0.5">Visibilité directe sur le catalogue RDC.</p>
                </div>
                <div className="space-y-1 text-xs text-muted pt-1">
                  <p>• <strong>Forfait Prestataire</strong> : 9 900 FC / mois</p>
                  <p>• <strong>Forfait Salle</strong> : 14 900 FC / mois</p>
                  <p>• <strong>Forfait Catalogue Mixte</strong> : 19 900 FC / mois</p>
                  <p>• <strong>Inclus</strong> : Éditeur 2D/3D & devis directs</p>
                </div>
              </div>
              <Link
                href="/dashboard/billing"
                className="text-xs font-bold text-purple-600 hover:underline inline-flex items-center gap-1 pt-2 border-t border-border mt-auto"
              >
                Voir Vitrine <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          THÉMATIQUE 6 : 💡 CENTRE D'ASSISTANCE & CONSEILS
      ══════════════════════════════════════════════════════════════════════════ */}
      <section className="p-4 sm:p-5 rounded-2xl border border-border bg-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">
              {isManager ? 'Besoin d’aide sur votre espace ?' : 'Besoin d’aide ou de conseils ?'}
            </p>
            <p className="text-xs text-muted">
              {isManager
                ? 'Consultez le guide des fonctionnalités manager et de l’équipe.'
                : 'Consultez notre guide pratique étape par étape.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Link
            href="/dashboard/guide"
            className="flex-1 sm:flex-none min-h-11 inline-flex items-center justify-center text-center px-3.5 py-2 rounded-xl border border-border hover:bg-surface-muted text-xs font-semibold text-foreground transition"
          >
            Guide utilisateur
          </Link>
          <Link
            href={isManager ? '/dashboard/publications' : '/dashboard/catalogue'}
            className="flex-1 sm:flex-none min-h-11 inline-flex items-center justify-center text-center px-3.5 py-2 rounded-xl bg-primary-solid text-primary-foreground text-xs font-bold hover:bg-primary-solid-hover transition shadow-xs"
          >
            {isManager ? 'Réalisations' : 'Marketplace'}
          </Link>
        </div>
      </section>
    </div>
  );
}
