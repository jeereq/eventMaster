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
import { cn } from '@/lib/cn';

export interface OrganizerEventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
}

interface OrganizerIntentConfig {
  id: string;
  title: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  ctaLabel: string;
  ctaHref: string;
  quickFilters: Array<{ label: string; href: string }>;
  features?: string[];
  isHighlight?: boolean;
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

  const ORGANIZER_INTENTS: OrganizerIntentConfig[] = [
    {
      id: 'create-event',
      title: isVendor ? 'Créer une nouvelle prestation' : 'Créer & Planifier un événement',
      badge: isVendor ? 'Vitrine & Offre' : 'Événements & Billetterie',
      description: isVendor
        ? 'Publiez une nouvelle prestation ou une salle sur le catalogue, fixez vos tarifs et gérez votre calendrier.'
        : 'Créez vos mariages, galas, concerts ou réceptions privées, activez la billetterie en ligne et générez les accès.',
      icon: isVendor ? Briefcase : CalendarDays,
      accentColor: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
      ctaLabel: isVendor ? 'Gérer mes offres' : 'Créer un événement',
      ctaHref: isVendor ? '/dashboard/marketplace' : '/dashboard/events',
      quickFilters: isVendor
        ? [
            { label: 'Mes prestations', href: '/dashboard/marketplace?tab=services' },
            { label: 'Mes salles', href: '/dashboard/rooms' },
            { label: 'Demandes reçues', href: '/dashboard/marketplace?tab=inquiries' },
          ]
        : [
            { label: 'Tous mes événements', href: '/dashboard/events' },
            { label: 'Billetterie en ligne', href: '/dashboard/events' },
            { label: 'Modèles de faire-part', href: '/dashboard/templates' },
          ],
      isHighlight: true,
    },
    {
      id: 'guests-rsvp',
      title: 'Invités & Faire-part WhatsApp',
      badge: 'Invitations & RSVP',
      description:
        'Envoyez des faire-part personnalisés nominatifs par WhatsApp, collectez les confirmations RSVP en direct et suivez les présences.',
      icon: Users,
      accentColor: 'from-blue-500/10 to-indigo-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
      ctaLabel: 'Gérer mes invités',
      ctaHref: events.length > 0 ? `/dashboard/events/${events[0].id}` : '/dashboard/events',
      quickFilters: [
        { label: 'Liste des invités', href: '/dashboard/events' },
        { label: 'Envois WhatsApp', href: '/dashboard/events' },
        { label: 'Réponses RSVP', href: '/dashboard/events' },
      ],
    },
    {
      id: 'room-editor',
      title: 'Plan de salle & Placement 2D/3D',
      badge: 'Disposition & Sièges',
      description:
        'Concevez vos espaces de réception, disposez les tables rondes, rectangulaires, podium et attribuez les places à vos invités.',
      icon: Building2,
      accentColor: 'from-purple-500/10 to-violet-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400',
      ctaLabel: 'Concevoir un plan',
      ctaHref: '/dashboard/rooms',
      quickFilters: [
        { label: 'Mes salles créées', href: '/dashboard/rooms' },
        { label: 'Ajouter une salle', href: '/dashboard/rooms' },
        { label: 'Éditeur 2D/3D', href: '/dashboard/rooms' },
      ],
    },
    {
      id: 'protocol-desk',
      title: 'Accueil & Contrôle d’Accès QR',
      badge: 'Protocole Jour J',
      description:
        'Scannez les QR codes des invités avec votre smartphone à l’entrée, contrôlez les accès anti-fraude et suivez les tâches d’accueil.',
      icon: ScanLine,
      accentColor: 'from-amber-500/10 to-orange-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
      ctaLabel: 'Ouvrir le desk Protocole',
      ctaHref: '/dashboard/protocol',
      quickFilters: [
        { label: 'Scanner QR invité', href: '/dashboard/protocol' },
        { label: 'Checklist des tâches', href: '/dashboard/protocol?view=tasks' },
        { label: 'Équipe d’accueil', href: '/dashboard/team' },
      ],
    },
    {
      id: 'marketplace-explore',
      title: 'Trouver des Prestataires & Salles',
      badge: 'Marketplace & Devis',
      description:
        'Découvrez les meilleures salles, traiteurs, photographes et loueurs de matériel en RDC ou composez un pack budget clé en main.',
      icon: Compass,
      accentColor: 'from-cyan-500/10 to-teal-500/10 border-cyan-500/30 text-cyan-700 dark:text-cyan-400',
      ctaLabel: 'Explorer le catalogue',
      ctaHref: '/dashboard/catalogue',
      quickFilters: [
        { label: 'Salles de fête', href: '/dashboard/catalogue?kind=venue' },
        { label: 'Traiteurs & DJ', href: '/dashboard/catalogue?kind=service' },
        { label: 'Simulateur de pack', href: '/dashboard/catalogue?tab=plan&planView=ai' },
      ],
    },
    {
      id: 'bookings-quotes',
      title: 'Devis, Réservations & Packs',
      badge: 'Suivi & Contrats',
      description:
        'Gérez vos demandes de devis avec les prestataires, validez vos dates de réservation et retrouvez vos sélections de packs enregistrées.',
      icon: Wallet,
      accentColor: 'from-rose-500/10 to-pink-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400',
      ctaLabel: 'Consulter mes devis',
      ctaHref: '/dashboard/bookings',
      quickFilters: [
        { label: 'Devis en cours', href: '/dashboard/bookings?tab=quotes' },
        { label: 'Réservations confirmées', href: '/dashboard/bookings?tab=bookings' },
        { label: 'Mes packs favoris', href: '/dashboard/bookings?tab=packs' },
      ],
    },
  ];

  // Pagination des événements récents
  const startIdx = (homeEventsPage - 1) * homeEventsPageSize;
  const paginatedEvents = events.slice(startIdx, startIdx + homeEventsPageSize);

  return (
    <div className="space-y-6 pb-12 animate-fade-in em-dashboard-home">
      {/* ─── BANNIÈRE D'ACCUEIL & RECHERCHE INTÉGRÉE ─── */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border bg-linear-to-br from-primary/10 via-surface to-surface-muted p-5 sm:p-7 shadow-xs">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative space-y-4 max-w-3xl">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/15 text-primary border border-primary/25">
                <Sparkles className="w-3.5 h-3.5" />
                {isVendor ? 'Espace Prestataire / Salles' : isBoth ? 'Espace Mixte (Organisation & Vitrine)' : 'Espace Organisateur'}
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
                ? 'Pilotez votre vitrine en ligne, vos disponibilités et répondez rapidement aux demandes de devis des organisateurs.'
                : 'Planifiez vos événements, gérez vos invitations nominatives sur WhatsApp, concevez vos plans de table et contrôlez les accès le jour J.'}
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

          {/* Raccourcis en 1 clic */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
            <span className="text-[11px] font-medium text-muted mr-1">Accès directs :</span>
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
              Marketplace
            </Link>
          </div>
        </div>
      </div>

      {/* ─── GUIDE DE DÉMARRAGE RAPIDE (CHECKLIST) ─── */}
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

      {/* ─── INDICATEURS CLÉS D'ACTIVITÉ & QUOTAS (5 CARTES) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* 1. Événements */}
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
            <p className="text-[11px] text-muted mt-0.5">Vos événements gérés</p>
          </div>
        </Link>

        {/* 2. Invités */}
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
            <p className="text-[11px] text-muted mt-0.5">Sur votre forfait actif</p>
          </div>
        </Link>

        {/* 3. Salles & Modèles */}
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

        {/* 4. Devis & Réservations */}
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

        {/* 5. Forfait & Abonnement */}
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

      {/* ─── PÔLES D'ACTION MÉTIER ("QUE SOUHAITEZ-VOUS FAIRE AUJOURD'HUI ?") ─── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" />
            Que souhaitez-vous gérer aujourd’hui ?
          </h2>
          <p className="text-xs text-muted">
            Accédez directement aux modules clés pour préparer et réussir vos réceptions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {ORGANIZER_INTENTS.map((intent) => {
            const Icon = intent.icon;
            return (
              <div
                key={intent.id}
                className={cn(
                  'p-4 sm:p-5 rounded-2xl border bg-surface transition-all flex flex-col justify-between gap-3 relative hover:border-primary/50 hover:shadow-xs group',
                  intent.isHighlight
                    ? 'border-primary/40 bg-linear-to-br from-primary/5 via-surface to-emerald-500/5'
                    : 'border-border',
                )}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', intent.accentColor)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-muted text-muted border border-border">
                      {intent.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition">
                      {intent.title}
                    </h3>
                    <p className="text-xs text-muted leading-relaxed mt-1 line-clamp-2">
                      {intent.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-border/70">
                  <div className="flex flex-wrap gap-1">
                    {intent.quickFilters.map((qf, idx) => (
                      <Link
                        key={idx}
                        href={qf.href}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-muted hover:bg-primary/10 hover:text-primary transition text-muted truncate max-w-full"
                      >
                        {qf.label}
                      </Link>
                    ))}
                  </div>

                  <Button
                    variant={intent.isHighlight ? 'primary' : 'secondary'}
                    size="sm"
                    fullWidth
                    onClick={() => router.push(intent.ctaHref)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    className={cn('font-bold text-xs', intent.isHighlight ? 'shadow-xs shadow-primary/20' : '')}
                  >
                    {intent.ctaLabel}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── PANNEAU DES QUOTAS DU FORFAIT ─── */}
      {orgQuota && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-muted uppercase tracking-wider">
            Consommation de vos quotas ({tenant?.plan || billing?.plan})
          </h2>
          <QuotaUsagePanel quota={orgQuota} />
        </div>
      )}

      {/* ─── SECTION ÉVÉNEMENTS RÉCENTS & ABONNEMENT ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Liste des événements */}
        <div className="space-y-6 lg:col-span-2">
          <div className="bg-surface border border-border rounded-[var(--radius-card)] p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">Événements récents</h2>
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
                  className="text-sm font-semibold text-primary hover:text-primary-hover transition flex items-center gap-1"
                >
                  Voir tout
                  <ChevronRight className="w-4 h-4" />
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
        </div>

        {/* Récapitulatif de formule / abonnement */}
        <div className="bg-surface border border-border rounded-[var(--radius-card)] p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Votre formule active</h2>

            {billing && (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-2xl flex items-center gap-4">
                  <div className="bg-primary text-white p-2.5 rounded-xl shadow-md">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-muted font-semibold uppercase tracking-wider">Formule</div>
                    <div className="text-xl font-black text-foreground mt-0.5">{billing.plan}</div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Invitations &amp; RSVP WhatsApp en direct</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Badges d&apos;accès QR anti-fraude</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Éditeur de plan de salle 2D/3D</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8">
            <Link
              href="/dashboard/billing"
              className="w-full flex items-center justify-center gap-2 py-3 bg-foreground hover:opacity-90 text-background font-semibold rounded-xl text-sm transition"
            >
              <Award className="w-4.5 h-4.5" />
              Gérer mon abonnement &amp; options
            </Link>
          </div>
        </div>
      </div>

      {/* ─── BANNIÈRE ASSISTANCE & GUIDE PRATIQUE ─── */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
      </div>
    </div>
  );
}
