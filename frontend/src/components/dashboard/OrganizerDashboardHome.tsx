'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
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
  const { user, tenant, planQuota } = useAuth();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');

  const isVendor = tenant?.accountKind === 'VENDOR';
  const isBoth = tenant?.accountKind === 'BOTH';

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
        {/* Bannière Hero avec recherche intégrée */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border bg-linear-to-br from-primary/10 via-surface to-surface-muted p-5 sm:p-7 shadow-xs">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative space-y-4 max-w-3xl">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/15 text-primary border border-primary/25">
                  <Sparkles className="w-3.5 h-3.5" />
                  {isVendor
                    ? 'Espace Prestataire / Salles'
                    : isBoth
                    ? 'Espace Mixte (Organisation & Vitrine)'
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
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
                {greetingLabel}{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
              </h1>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                {isVendor
                  ? 'Gérez vos prestations, vos disponibilités et répondez rapidement aux demandes de devis des organisateurs.'
                  : 'Créez vos événements, envoyez vos invitations par WhatsApp, concevez vos plans de table et contrôlez les accès avec fluidité.'}
              </p>
            </div>

            {/* Barre de recherche avec actions directes */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="relative flex items-center">
                <Search className="w-5 h-5 text-muted absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher parmi vos événements, un invité, une salle…"
                  className="w-full pl-11 pr-32 py-3.5 rounded-xl border border-border bg-surface text-sm text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent shadow-xs transition"
                />
                <button
                  type="submit"
                  className="absolute right-2 px-4 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition flex items-center gap-1.5 touch-manipulation cursor-pointer"
                >
                  <span>Rechercher</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {/* Raccourcis directs en 1 clic */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
              <span className="text-[11px] font-medium text-muted mr-1">Raccourcis :</span>
              <Link
                href={isVendor ? '/dashboard/marketplace' : '/dashboard/events'}
                className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 hover:border-primary text-[11px] font-bold text-primary transition inline-flex items-center gap-1"
              >
                <PlusCircle className="w-3 h-3" />
                {isVendor ? 'Nouvelle prestation' : 'Créer un événement'}
              </Link>
              <Link
                href="/dashboard/rooms"
                className="px-2.5 py-1 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-[11px] font-medium text-foreground transition"
              >
                Plan de table 2D/3D
              </Link>
              <Link
                href="/dashboard/protocol"
                className="px-2.5 py-1 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-[11px] font-medium text-foreground transition inline-flex items-center gap-1"
              >
                <ScanLine className="w-3 h-3 text-amber-500" />
                Scanner QR Protocole
              </Link>
                  <Link
                    href="/dashboard/catalogue"
                    className="px-2.5 py-1 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-[11px] font-medium text-foreground transition"
                  >
                    Marketplace & Devis
                  </Link>
                  <Link
                    href="/dashboard/catalogue?tab=plan&planView=ai"
                    className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 hover:border-primary text-[11px] font-bold text-primary transition inline-flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Simulateur IA (3 Packs)
                  </Link>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <Link
            href="/dashboard/events"
            className="p-4 rounded-2xl border border-border/80 bg-surface/90 dark:bg-slate-900/80 hover:border-primary/50 hover:bg-primary/5 transition group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Événements</span>
              <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-foreground tracking-tight">
                {usage ? formatQuota(usage.events, limits?.maxEvents) : events.length}
              </p>
              <p className="text-[11px] text-muted mt-0.5">Événements créés</p>
            </div>
          </Link>

          <Link
            href="/dashboard/events"
            className="p-4 rounded-2xl border border-border/80 bg-surface/90 dark:bg-slate-900/80 hover:border-amber-500/40 hover:bg-amber-500/5 transition group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Invités</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-foreground tracking-tight">
                {usage ? formatQuota(usage.guests, limits?.maxGuests) : '—'}
              </p>
              <p className="text-[11px] text-muted mt-0.5">Invités enregistrés</p>
            </div>
          </Link>

          <Link
            href={isVendor ? '/dashboard/marketplace' : '/dashboard/rooms'}
            className="p-4 rounded-2xl border border-border/80 bg-surface/90 dark:bg-slate-900/80 hover:border-purple-500/40 hover:bg-purple-500/5 transition group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
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
              <p className="text-[11px] text-muted mt-0.5">
                {isVendor ? 'Prestations vitrine' : 'Plans 2D/3D créés'}
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/bookings"
            className="p-4 rounded-2xl border border-border/80 bg-surface/90 dark:bg-slate-900/80 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Devis & Packs</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-foreground tracking-tight flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                Actifs
              </p>
              <p className="text-[11px] text-muted mt-0.5">Demandes & réservations</p>
            </div>
          </Link>

          <Link
            href="/dashboard/billing"
            className="p-4 rounded-2xl border border-border/80 bg-surface/90 dark:bg-slate-900/80 hover:border-primary/50 hover:bg-primary/5 transition group flex flex-col justify-between col-span-2 sm:col-span-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Mon Forfait</span>
              <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xl font-black text-foreground tracking-tight truncate">
                {tenant?.plan || billing?.plan || 'Standard'}
              </p>
              <p className="text-[11px] text-muted mt-0.5">Gérer mon abonnement</p>
            </div>
          </Link>
        </div>
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
              <h2 className="text-lg font-bold text-foreground">Invités, Faire-part & Protocole</h2>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Générez vos faire-part, envoyez vos invitations par WhatsApp et assurez l’accueil fluide le jour J.
            </p>
          </div>
          <Link
            href="/dashboard/events"
            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Voir tous mes événements <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Carte 1 : Faire-part & Invitations WhatsApp */}
          <div className="p-5 rounded-2xl border border-border bg-surface hover:border-blue-500/40 hover:shadow-xs transition group flex flex-col justify-between gap-4">
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
                  Invitations & Faire-part WhatsApp
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-1">
                  Personnalisez vos faire-part numériques, envoyez des messages nominatifs directs sur WhatsApp et suivez les confirmations en temps réel.
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Envois individuels nominatifs par WhatsApp & e-mail</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Collecte automatique des présences & régimes alimentaires</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Pass d&apos;accès numériques avec QR code personnel</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Link
                  href="/dashboard/templates"
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-surface-muted hover:bg-primary/10 hover:text-primary transition text-muted"
                >
                  Modèles de faire-part
                </Link>
              </div>
              <Button
                size="sm"
                onClick={() => router.push(events.length > 0 ? `/dashboard/events/${events[0].id}` : '/dashboard/events')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Gérer mes invités
              </Button>
            </div>
          </div>

          {/* Carte 2 : Protocole & Contrôle d'Accès QR */}
          <div className="p-5 rounded-2xl border border-border bg-surface hover:border-amber-500/40 hover:shadow-xs transition group flex flex-col justify-between gap-4">
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
                  Protocole & Contrôle d’Accès QR
                </h3>
                <p className="text-xs text-muted leading-relaxed mt-1">
                  Scannez les billets et badges d’invités avec votre smartphone à l’entrée, contrôlez les fraudes et suivez l’émargement en direct.
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Scan QR instantané par caméra smartphone (sans matériel coûteux)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Checklist et tâches assignées à votre équipe d’accueil</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Validation anti-doublon et affichage immédiat de la table</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Link
                  href="/dashboard/team"
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-surface-muted hover:bg-primary/10 hover:text-primary transition text-muted"
                >
                  Comptes équipe
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
                Ouvrir le desk Protocole
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
            <h2 className="text-lg font-bold text-foreground">Espaces, Plans & Marketplace</h2>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Agencement 2D/3D de vos réceptions, devis et réservations auprès des prestataires certifiés.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Carte 1 : Plan de Salle 2D/3D */}
          <div className="p-5 rounded-2xl border border-border bg-surface hover:border-purple-500/40 hover:shadow-xs transition group flex flex-col justify-between gap-4">
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
                  Concevez vos espaces de réception, disposez les tables rondes, rectangulaires, podium et placez vos invités avec précision.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] px-2 py-0.5 rounded bg-surface-muted text-muted">Tables rondes & rect.</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-surface-muted text-muted">Scène & Buffet</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-surface-muted text-muted">Vue 3D immersive</span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={() => router.push('/dashboard/rooms')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Éditeur de salle 2D/3D
            </Button>
          </div>

              {/* Carte 2 : Trouver des prestataires & Packs IA */}
              <div className="p-5 rounded-2xl border border-primary/30 bg-primary/5 hover:border-primary hover:shadow-xs transition group flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 text-primary flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                      Simulateur IA & Marketplace
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                      Simulateur IA & Packs Clés en Main
                    </h3>
                    <p className="text-xs text-muted leading-relaxed mt-1">
                      Calculez instantanément 3 combinaisons (éco, équilibré, confort) dans votre enveloppe budgétaire avec salle et prestataires certifiés.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Link
                      href="/dashboard/catalogue?tab=plan&planView=ai"
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary text-white hover:bg-primary-hover transition"
                    >
                      ✨ Simuler 3 Packs IA
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
                      Traiteurs & DJ
                    </Link>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={() => router.push('/dashboard/catalogue?tab=plan&planView=ai')}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="shadow-xs shadow-primary/20"
                >
                  Lancer une simulation IA
                </Button>
              </div>

          {/* Carte 3 : Devis, Réservations & Suivi */}
          <div className="p-5 rounded-2xl border border-border bg-surface hover:border-emerald-500/40 hover:shadow-xs transition group flex flex-col justify-between gap-4">
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
                  Suivez vos demandes envoyées aux prestataires, confirmez vos dates et accédez à vos packs enregistrés en un clic.
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
            >
              Suivre mes réservations
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
                Vos événements récents
              </h2>
              <p className="text-xs text-muted">
                Consultez, modifiez et suivez l’avancement de vos réceptions.
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
                Créez votre premier événement pour envoyer vos faire-part et suivre les confirmations de vos invités.
              </p>
              <Link
                href="/dashboard/events"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg text-sm transition"
              >
                Créer mon premier événement
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
            <h2 className="text-lg font-bold text-foreground">Formules, Quotas & Abonnements disponibles</h2>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Suivez l’utilisation de vos quotas et découvrez les formules d’abonnement adaptées à la taille de vos projets.
          </p>
        </div>

        {/* Panneau de suivi des quotas actuels */}
        {orgQuota && (
          <div className="space-y-2">
            <QuotaUsagePanel quota={orgQuota} />
          </div>
        )}

        {/* Grande carte explicative des abonnements & upgrade */}
        <div className="rounded-2xl sm:rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/5 via-surface to-surface-muted p-5 sm:p-7 space-y-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-border/80">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  <Crown className="w-3.5 h-3.5" />
                  Formules & Tarification transparente
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/40">
                  <Percent className="w-3 h-3" /> −10 % immédiat en paiement annuel (365 jours)
                </span>
                <span className="text-xs font-medium text-primary flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                  <Sparkles className="w-3 h-3" /> Codes promos & parrainages déductibles à l&apos;activation
                </span>
              </div>
              <h3 className="text-xl font-bold text-foreground mt-1">
                Besoin d’invités supplémentaires ou de fonctionnalités avancées ?
              </h3>
              <p className="text-xs text-muted max-w-2xl leading-relaxed">
                EventMaster propose des abonnements conçus pour chaque besoin : de la fête privée au grand gala d’entreprise. Les réductions annuelles (−10 %) et vos remises commerciales sont appliquées directement lors du passage de commande.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                href="/dashboard/billing"
                className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition shadow-xs shadow-primary/20 flex items-center gap-1.5"
              >
                <span>Changer de formule</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Grille détaillée des 4 types d'abonnements */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
            {/* 1. Formules Particulier (B2C) */}
            <div className="p-4 rounded-xl border border-border bg-surface flex flex-col justify-between gap-3 hover:border-emerald-500/40 transition">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    Particulier
                  </span>
                  <span className="text-[11px] font-bold text-foreground">Dès 60 000 FC</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Mariages & Célébrations</h4>
                  <p className="text-[11px] text-muted mt-0.5">Pour événements privés sans abonnement mensuel contraignant.</p>
                </div>
                <div className="space-y-1 text-[11px] text-muted pt-1">
                  <p>• <strong>Particulier 50</strong> : 60 000 FC / trim.</p>
                  <p>• <strong>Particulier 100</strong> : 90 000 FC / trim.</p>
                  <p>• <strong>Particulier 200</strong> : 120 000 FC / trim.</p>
                  <p>• <strong>Particulier +200</strong> : 180 000 FC / trim.</p>
                </div>
              </div>
              <Link
                href="/dashboard/billing"
                className="text-[11px] font-bold text-emerald-600 hover:underline inline-flex items-center gap-1 pt-2 border-t border-border"
              >
                Découvrir Particulier <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* 2. Formules Business & Professionnel */}
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex flex-col justify-between gap-3 shadow-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/20 text-primary">
                    Populaire · B2B
                  </span>
                  <span className="text-[11px] font-bold text-foreground">Dès 30 000 FC</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Business & Premium</h4>
                  <p className="text-[11px] text-muted mt-0.5">Pour organisateurs réguliers, entreprises & agences.</p>
                </div>
                <div className="space-y-1 text-[11px] text-muted pt-1">
                  <p>• <strong>Business</strong> : 30 000 FC / mois (150 inv.)</p>
                  <p>• <strong>Premium</strong> : 55 000 FC / mois (500 inv.)</p>
                  <p>• <strong>Premium Plus</strong> : 85 000 FC / mois (1 000 inv.)</p>
                  <p>• <strong>Inclus</strong> : Scan QR, OCR, billetterie</p>
                </div>
              </div>
              <Link
                href="/dashboard/billing"
                className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1 pt-2 border-t border-primary/20"
              >
                Passer en Business <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* 3. Formules Enterprise */}
            <div className="p-4 rounded-xl border border-border bg-surface flex flex-col justify-between gap-3 hover:border-amber-500/40 transition">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    Grand Volume
                  </span>
                  <span className="text-[11px] font-bold text-foreground">Dès 350 000 FC</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Enterprise & Salons</h4>
                  <p className="text-[11px] text-muted mt-0.5">Concerts, salons, festivals et gestion multi-agences.</p>
                </div>
                <div className="space-y-1 text-[11px] text-muted pt-1">
                  <p>• <strong>Enterprise</strong> : 350 000 FC / mois (3 500 inv.)</p>
                  <p>• <strong>Enterprise Pro</strong> : 525 000 FC / mois (5 000 inv.)</p>
                  <p>• <strong>Enterprise Unlimited</strong> : 700 000 FC / mois</p>
                  <p>• <strong>Inclus</strong> : Multi-salles, SLA & support dédié</p>
                </div>
              </div>
              <Link
                href="/dashboard/billing"
                className="text-[11px] font-bold text-amber-600 hover:underline inline-flex items-center gap-1 pt-2 border-t border-border"
              >
                Voir Enterprise <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* 4. Formules Vitrine & Catalogue */}
            <div className="p-4 rounded-xl border border-border bg-surface flex flex-col justify-between gap-3 hover:border-purple-500/40 transition">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300">
                    Vitrine Marketplace
                  </span>
                  <span className="text-[11px] font-bold text-foreground">Dès 9 900 FC</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Salles & Prestataires</h4>
                  <p className="text-[11px] text-muted mt-0.5">Visibilité maximale sur le catalogue en RDC.</p>
                </div>
                <div className="space-y-1 text-[11px] text-muted pt-1">
                  <p>• <strong>Forfait Prestataire</strong> : 9 900 FC / mois</p>
                  <p>• <strong>Forfait Salle</strong> : 14 900 FC / mois</p>
                  <p>• <strong>Forfait Catalogue Mixte</strong> : 19 900 FC / mois</p>
                  <p>• <strong>Inclus</strong> : Éditeur 2D/3D & devis directs</p>
                </div>
              </div>
              <Link
                href="/dashboard/billing"
                className="text-[11px] font-bold text-purple-600 hover:underline inline-flex items-center gap-1 pt-2 border-t border-border"
              >
                Découvrir Vitrine <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
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
            <p className="text-xs font-bold text-foreground">Une question sur la gestion de vos événements ?</p>
            <p className="text-[11px] text-muted">
              Consultez notre guide complet avec vidéos et conseils étape par étape pour réussir vos réceptions.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Link
            href="/dashboard/guide"
            className="flex-1 sm:flex-none text-center px-3.5 py-1.5 rounded-xl border border-border hover:bg-surface-muted text-xs font-semibold text-foreground transition"
          >
            Guide utilisateur
          </Link>
          <Link
            href="/dashboard/catalogue"
            className="flex-1 sm:flex-none text-center px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition shadow-xs"
          >
            Explorer le marketplace
          </Link>
        </div>
      </section>
    </div>
  );
}
