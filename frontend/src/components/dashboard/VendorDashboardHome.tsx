'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  ImageOff,
  Inbox,
  PlusCircle,
  RefreshCw,
  Rss,
  Sparkles,
  Store,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import {
  BOOKING_STATUS_LABELS,
  publicServiceHref,
  type MarketplaceBookingItem,
  type MarketplaceInquiryItem,
} from '@/lib/marketplace';
import { LANDING_PLANS, formatFc } from '@/config/landingPricing';
import GettingStartedChecklist from '@/components/GettingStartedChecklist';
import UserAvatar from '@/components/UserAvatar';
import { StatusPill, type StatusPillTone } from '@/components/ui';
import { cn } from '@/lib/cn';

/**
 * Accueil des comptes « Salle ou prestataire » (accountKind VENDOR).
 * Une seule question : qu’est-ce qui attend une réponse de ma part aujourd’hui ?
 * Les écrans détaillés (devis, réservations, salles, offres, statistiques…) vivent
 * sur leurs pages dédiées ; les anciens liens `/dashboard?tab=…` y redirigent.
 */

interface VendorRoom {
  id: string;
  name: string;
  capacity?: number | null;
  location?: string | null;
  venueListing?: {
    slug: string;
    isPublic?: boolean;
    isBlockedByAdmin?: boolean;
    photos?: unknown;
    priceFromFc?: number | null;
  } | null;
}

interface VendorService {
  id: string;
  slug: string;
  title: string;
  category?: string | null;
  city?: string | null;
  isPublic: boolean;
  photos?: unknown;
  priceFromFc?: number | null;
}

interface ShowcaseRow {
  id: string;
  title: string;
  subtitle: string;
  cover: string | null;
  isPublic: boolean;
  hasListing: boolean;
  photoCount: number;
  blocked: boolean;
  publicHref: string | null;
  manageHref: string;
}

const LEGACY_TAB_ROUTES: Record<string, (venue: boolean) => string> = {
  quotes: () => '/dashboard/bookings?tab=quotes',
  devis: () => '/dashboard/bookings?tab=quotes',
  inquiries: () => '/dashboard/bookings?tab=quotes',
  reservations: () => '/dashboard/bookings?tab=bookings',
  bookings: () => '/dashboard/bookings?tab=bookings',
  spaces: (venue) => (venue ? '/dashboard/rooms' : '/dashboard/marketplace'),
  salles: () => '/dashboard/rooms',
  rooms: () => '/dashboard/rooms',
  prestations: () => '/dashboard/marketplace',
  offres: () => '/dashboard/marketplace',
  analytics: () => '/dashboard/analytics',
  analyses: () => '/dashboard/analytics',
  stats: () => '/dashboard/analytics',
  explore: () => '/dashboard/catalogue',
  catalogue: () => '/dashboard/catalogue',
  marketplace: () => '/dashboard/catalogue',
  billing: () => '/dashboard/billing',
  abonnement: () => '/dashboard/billing',
  quotas: () => '/dashboard/billing',
  team: () => '/dashboard/team',
  equipe: () => '/dashboard/team',
  events: () => '/dashboard/events',
  evenements: () => '/dashboard/events',
  guests: () => '/dashboard/events',
  invites: () => '/dashboard/events',
};

function photoList(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((p): p is string => typeof p === 'string' && p.length > 0) : [];
}

/** « Palais Kinshasa 1 — Rooftop 5 » → « Rooftop 5 » : le nom de l’organisation est déjà affiché. */
function shortListingTitle(title: string, orgName?: string | null) {
  const sep = title.indexOf(' — ');
  if (sep > 0 && (!orgName || title.slice(0, sep).trim() === orgName.trim())) return title.slice(sep + 3);
  return title;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatDay(iso: string | null | undefined) {
  if (!iso) return 'Date à préciser';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Date à préciser';
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function daysFromNow(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.round((t - startOfToday()) / 86_400_000);
}

function relativeDayLabel(iso: string | null | undefined) {
  const days = daysFromNow(iso);
  if (days == null) return null;
  if (days === 0) return 'aujourd’hui';
  if (days === 1) return 'demain';
  if (days > 1) return `dans ${days} j`;
  return null;
}

function receivedLabel(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const hours = Math.floor((Date.now() - t) / 3_600_000);
  if (hours < 1) return 'reçue à l’instant';
  if (hours < 24) return `reçue il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `reçue il y a ${days} j`;
}

const BOOKING_TONES: Record<string, StatusPillTone> = {
  REQUESTED: 'amber',
  ACCEPTED: 'sky',
  CONFIRMED: 'emerald',
  COMPLETED: 'slate',
  CANCELLED: 'rose',
};

function bookingActionLabel(b: MarketplaceBookingItem): string {
  if (b.status === 'REQUESTED') return 'À accepter ou refuser';
  if (b.status === 'ACCEPTED' && !b.depositMarkedAt) return 'Acompte à encaisser';
  if (b.status === 'ACCEPTED') return 'À confirmer';
  return BOOKING_STATUS_LABELS[b.status];
}

function SectionCard({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('min-w-0 rounded-2xl border border-border bg-surface', className)}>
      <header className="flex items-center justify-between gap-3 px-4 sm:px-5 pt-4 pb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="w-4 h-4 text-primary" />
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function SeeAllLink({ href, label = 'Tout voir' }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary hover:bg-primary/10 transition"
    >
      {label}
      <ArrowRight className="w-3.5 h-3.5" />
    </Link>
  );
}

function EmptyRow({ icon: Icon, title, hint }: { icon: React.ComponentType<{ className?: string }>; title: string; hint: string }) {
  return (
    <div className="mx-4 sm:mx-5 mb-4 flex items-center gap-3 rounded-xl border border-dashed border-border bg-background/60 px-4 py-5">
      <Icon className="w-5 h-5 shrink-0 text-muted" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
    </div>
  );
}

export default function VendorDashboardHome() {
  const { user, tenant, access, planQuota } = useAuth();
  const { site } = usePlatformSite();
  const router = useRouter();
  const searchParams = useSearchParams();

  const limits = planQuota?.limits;
  const usage = planQuota?.usage;
  const isVenue = Boolean(access?.canManageRooms) && (limits?.maxRooms ?? 0) > 0;
  const hasServices = (limits?.maxServices ?? 0) > 0 || (usage?.services ?? 0) > 0;
  const hasEvents = (limits?.maxEvents ?? 0) > 0;
  const isOwner = Boolean(access?.isOwner) || (Boolean(user?.id) && user?.id === tenant?.managerId);
  const canManageTeam = isOwner || Boolean(access?.canManageTeam);
  const canViewBilling = isOwner || Boolean(access?.canViewBilling);
  const visibility = site?.studioVisibility ?? { budget: true, invite: true, room: true };
  const showSimulator = visibility.budget || visibility.invite || visibility.room;

  // Anciens liens `/dashboard?tab=…` (favoris, notifications, guide) → page dédiée.
  const legacyTab = searchParams.get('tab');
  const legacyTarget = legacyTab && legacyTab !== 'overview' ? LEGACY_TAB_ROUTES[legacyTab.toLowerCase()]?.(isVenue) : null;
  useEffect(() => {
    if (legacyTarget) router.replace(legacyTarget);
  }, [legacyTarget, router]);

  const [inquiries, setInquiries] = useState<MarketplaceInquiryItem[]>([]);
  const [bookings, setBookings] = useState<MarketplaceBookingItem[]>([]);
  const [commissionDueFc, setCommissionDueFc] = useState(0);
  const [rooms, setRooms] = useState<VendorRoom[]>([]);
  const [services, setServices] = useState<VendorService[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    setLoadError(false);
    let failed = false;
    const fail = <T,>(fallback: T) => () => {
      failed = true;
      return fallback;
    };
    const [iData, bData, rData, sData] = await Promise.all([
      api.get('/marketplace/inquiries?role=vendor').catch(fail({ inquiries: [] })),
      api.get('/marketplace/bookings?role=vendor').catch(fail({ bookings: [], commissionDueFc: 0 })),
      isVenue ? api.get('/rooms').catch(fail([])) : Promise.resolve([]),
      hasServices ? api.get('/marketplace/services').catch(fail([])) : Promise.resolve([]),
    ]);
    setInquiries(Array.isArray(iData?.inquiries) ? iData.inquiries : []);
    setBookings(Array.isArray(bData?.bookings) ? bData.bookings : []);
    setCommissionDueFc(Number(bData?.commissionDueFc) || 0);
    setRooms(Array.isArray(rData) ? rData : Array.isArray(rData?.rooms) ? rData.rooms : []);
    setServices(Array.isArray(sData) ? sData : Array.isArray(sData?.services) ? sData.services : []);
    setLoadError(failed);
    setLoading(false);
  }, [tenant?.id, isVenue, hasServices]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial des données
    if (!legacyTarget) void load();
  }, [load, legacyTarget]);

  // ── Files « à traiter » ──────────────────────────────────────────────────
  const quotesToAnswer = useMemo(
    () =>
      inquiries
        .filter((i) => (i.status === 'NEW' || i.status === 'CONTACTED') && !i.closedAt && !i.hasBooking)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [inquiries],
  );
  const newQuotesCount = quotesToAnswer.filter((i) => i.status === 'NEW').length;

  const bookingsToHandle = useMemo(
    () =>
      bookings
        .filter((b) => b.status === 'REQUESTED' || b.status === 'ACCEPTED')
        .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()),
    [bookings],
  );

  const upcoming = useMemo(() => {
    const today = startOfToday();
    return bookings
      .filter((b) => b.status !== 'CANCELLED' && new Date(b.eventDate).getTime() >= today)
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  }, [bookings]);

  const confirmedRevenueFc = useMemo(
    () =>
      bookings
        .filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
        .reduce((sum, b) => sum + (Number(b.amountFc) || 0), 0),
    [bookings],
  );
  const pipelineFc = useMemo(
    () => bookingsToHandle.reduce((sum, b) => sum + (Number(b.amountFc) || 0), 0),
    [bookingsToHandle],
  );

  // ── Vitrine : salles + offres, avec ce qui manque pour bien vendre ───────
  const showcase: ShowcaseRow[] = useMemo(() => {
    const roomRows: ShowcaseRow[] = rooms.map((room) => {
      const listing = room.venueListing;
      const photos = photoList(listing?.photos);
      return {
        id: `room-${room.id}`,
        title: room.name,
        subtitle: [room.capacity ? `${room.capacity} places` : null, room.location].filter(Boolean).join(' · '),
        cover: photos[0] ?? null,
        isPublic: Boolean(listing?.isPublic),
        hasListing: Boolean(listing),
        photoCount: photos.length,
        blocked: Boolean(listing?.isBlockedByAdmin),
        publicHref: listing?.slug && listing.isPublic ? `/marketplace/salles/${listing.slug}` : null,
        manageHref: '/dashboard/rooms',
      };
    });
    const serviceRows: ShowcaseRow[] = services.map((svc) => {
      const photos = photoList(svc.photos);
      return {
        id: `svc-${svc.id}`,
        title: svc.title,
        subtitle: [svc.priceFromFc ? `dès ${formatFc(svc.priceFromFc)}` : null, svc.city].filter(Boolean).join(' · '),
        cover: photos[0] ?? null,
        isPublic: svc.isPublic,
        hasListing: true,
        photoCount: photos.length,
        blocked: false,
        publicHref: svc.isPublic ? publicServiceHref(svc.slug, svc.category) : null,
        manageHref: '/dashboard/marketplace',
      };
    });
    return [...roomRows, ...serviceRows];
  }, [rooms, services]);

  const showcaseIssues = showcase.filter((row) => !row.isPublic || row.photoCount === 0 || row.blocked);
  const publishedCount = showcase.filter((row) => row.isPublic && !row.blocked).length;

  const actionCount = quotesToAnswer.length + bookingsToHandle.length + showcaseIssues.length;

  // ── Abonnement ───────────────────────────────────────────────────────────
  const planMeta = LANDING_PLANS.find((p) => p.id === tenant?.plan);
  const planName = planMeta?.ms365Name || tenant?.plan || 'Forfait';
  const licenseExpiresAt = tenant?.licenseExpiresAt;
  const daysUntilExpiry = useMemo(() => {
    const expires = licenseExpiresAt ? new Date(licenseExpiresAt).getTime() : NaN;
    return Number.isNaN(expires) ? null : Math.ceil((expires - startOfToday()) / 86_400_000);
  }, [licenseExpiresAt]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const firstName = user?.name?.split(' ')[0];

  const title = isVenue && services.length > 0 ? 'Mes salles & prestations' : isVenue ? 'Mes salles' : 'Mes prestations';
  const listingNoun = isVenue ? 'salle' : 'offre';
  const primaryCta = isVenue
    ? { href: '/dashboard/rooms', label: 'Ajouter une salle', icon: Building2 }
    : { href: '/dashboard/marketplace?new=1', label: 'Nouvelle offre', icon: PlusCircle };

  if (legacyTarget) return null;

  const kpis = [
    {
      id: 'quotes',
      label: 'Devis à répondre',
      value: String(quotesToAnswer.length),
      hint: newQuotesCount > 0 ? `${newQuotesCount} nouveau${newQuotesCount > 1 ? 'x' : ''}` : 'Rien en attente',
      href: '/dashboard/bookings?tab=quotes',
      icon: Inbox,
      urgent: quotesToAnswer.length > 0,
    },
    {
      id: 'bookings',
      label: 'Réservations à suivre',
      value: String(bookingsToHandle.length),
      hint: pipelineFc > 0 ? `${formatFc(pipelineFc)} en jeu` : 'Rien en attente',
      href: '/dashboard/bookings?tab=bookings',
      icon: CalendarCheck,
      urgent: bookingsToHandle.length > 0,
    },
    {
      id: 'showcase',
      label: isVenue ? 'Salles en ligne' : 'Offres en ligne',
      value: `${publishedCount}/${showcase.length}`,
      hint: showcaseIssues.length > 0 ? `${showcaseIssues.length} à compléter` : showcase.length > 0 ? 'Vitrine complète' : `Aucune ${listingNoun}`,
      href: isVenue ? '/dashboard/rooms' : '/dashboard/marketplace',
      icon: isVenue ? Building2 : Briefcase,
      urgent: showcaseIssues.length > 0,
    },
    {
      id: 'revenue',
      label: 'Chiffre confirmé',
      value: formatFc(confirmedRevenueFc),
      hint: commissionDueFc > 0 ? `Commission due : ${formatFc(commissionDueFc)}` : 'Réservations confirmées',
      href: '/dashboard/analytics',
      icon: Wallet,
      urgent: false,
    },
  ];

  const quickLinks = [
    isVenue ? { href: '/dashboard/rooms', label: 'Mes salles', hint: 'Fiches, plans 2D/3D, staff', icon: Building2 } : null,
    hasServices || !isVenue ? { href: '/dashboard/marketplace', label: 'Mes offres', hint: 'Prestations et locations', icon: Briefcase } : null,
    { href: '/dashboard/publications', label: 'Réalisations', hint: 'Photos de vos derniers événements', icon: Rss },
    { href: '/dashboard/analytics', label: 'Statistiques', hint: 'Demandes, conversion, revenus', icon: BarChart3 },
    hasEvents ? { href: '/dashboard/events', label: 'Événements', hint: 'Vos propres réceptions', icon: Calendar } : null,
    { href: '/dashboard/catalogue', label: 'Explorer', hint: 'Salles et confrères du réseau', icon: Store },
    showSimulator ? { href: '/dashboard/catalogue?tab=plan&planView=ai', label: 'Simulateur IA', hint: 'Packs et budgets clients', icon: Sparkles } : null,
    canManageTeam ? { href: '/dashboard/team', label: 'Équipe', hint: 'Membres et accès', icon: Users } : null,
    canViewBilling ? { href: '/dashboard/billing', label: 'Abonnement', hint: `Forfait ${planName}`, icon: CreditCard } : null,
  ].filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <div className="space-y-6 pb-16 animate-fade-in em-dashboard-home">
      {/* Échéance de licence */}
      {isOwner && daysUntilExpiry != null && daysUntilExpiry <= 15 && (
        <div
          role="alert"
          className={cn(
            'flex flex-col gap-3 rounded-2xl border p-4 text-sm sm:flex-row sm:items-center sm:justify-between',
            daysUntilExpiry <= 0
              ? 'border-danger/30 bg-danger/10 text-danger'
              : 'border-festive-accent/30 bg-festive-accent-soft text-festive-accent',
          )}
        >
          <div className="flex items-center gap-3">
            {daysUntilExpiry <= 0 ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <Clock className="w-5 h-5 shrink-0" />}
            <div>
              <p className="font-semibold">
                {daysUntilExpiry <= 0
                  ? 'Abonnement expiré : votre vitrine n’est plus visible'
                  : `Votre abonnement expire dans ${daysUntilExpiry} jour${daysUntilExpiry > 1 ? 's' : ''}`}
              </p>
              <p className="text-xs opacity-90">Renouvelez pour continuer à recevoir des demandes de devis.</p>
            </div>
          </div>
          <Link
            href="/dashboard/billing"
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary-solid px-4 text-xs font-semibold text-primary-foreground hover:bg-primary-solid-hover transition"
          >
            Renouveler
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* En-tête : qui, quoi, action principale */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar name={user?.name} src={user?.avatarUrl} size="lg" className="w-12 h-12 text-base" />
          <div className="min-w-0">
            <p className="truncate text-sm text-muted">
              {greeting}
              {firstName ? `, ${firstName}` : ''}
              {tenant?.name ? ` · ${tenant.name}` : ''}
            </p>
            <h1 className="truncate text-2xl font-semibold leading-tight text-foreground sm:text-[1.75rem]">{title}</h1>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Link
            href="/dashboard/bookings?tab=quotes"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:border-primary/40 transition"
          >
            <Inbox className="w-4 h-4 text-primary" />
            <span className="truncate sm:hidden">Devis reçus</span>
            <span className="hidden truncate sm:inline">Répondre aux devis</span>
            {quotesToAnswer.length > 0 && (
              <span className="rounded-full bg-festive-accent px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-primary-foreground">
                {quotesToAnswer.length}
              </span>
            )}
          </Link>
          <Link
            href={primaryCta.href}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary-solid px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-solid-hover transition"
          >
            <primaryCta.icon className="w-4 h-4" />
            {primaryCta.label}
          </Link>
        </div>
      </header>

      {/* Bandeau d’état : ce qui attend une action */}
      <div
        className={cn(
          'flex flex-col gap-2 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
          loading
            ? 'border-border bg-surface'
            : actionCount > 0
              ? 'border-festive-accent/30 bg-festive-accent-soft'
              : 'border-primary/25 bg-primary/5',
        )}
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          {loading ? (
            <RefreshCw className="w-5 h-5 shrink-0 animate-spin text-muted" />
          ) : actionCount > 0 ? (
            <AlertTriangle className="w-5 h-5 shrink-0 text-festive-accent" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-primary" />
          )}
          <p className="text-sm text-foreground">
            {loading ? (
              'Chargement de votre activité…'
            ) : actionCount > 0 ? (
              <>
                <span className="font-semibold">
                  {actionCount} action{actionCount > 1 ? 's' : ''} en attente
                </span>
                <span className="text-muted">
                  {' · '}
                  {[
                    quotesToAnswer.length ? `${quotesToAnswer.length} devis` : null,
                    bookingsToHandle.length ? `${bookingsToHandle.length} réservation${bookingsToHandle.length > 1 ? 's' : ''}` : null,
                    showcaseIssues.length ? `${showcaseIssues.length} fiche${showcaseIssues.length > 1 ? 's' : ''} à compléter` : null,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold">Tout est à jour.</span>
                <span className="text-muted"> Aucune demande n’attend de réponse.</span>
              </>
            )}
          </p>
        </div>
        {loadError && !loading ? (
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-9 items-center gap-1.5 self-start rounded-lg px-2 text-xs font-semibold text-danger hover:bg-danger/10 sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Données incomplètes, réessayer
          </button>
        ) : null}
      </div>

      {/* Indicateurs cliquables */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Link
            key={kpi.id}
            href={kpi.href}
            className={cn(
              'group flex flex-col justify-between gap-3 rounded-2xl border bg-surface p-4 transition hover:shadow-xs',
              kpi.urgent && !loading ? 'border-festive-accent/40 hover:border-festive-accent' : 'border-border hover:border-primary/40',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-muted">{kpi.label}</span>
              <span
                className={cn(
                  'rounded-lg p-1.5',
                  kpi.urgent && !loading ? 'bg-festive-accent-soft text-festive-accent' : 'bg-primary/10 text-primary',
                )}
              >
                <kpi.icon className="w-4 h-4" />
              </span>
            </div>
            <div>
              <p className="truncate text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {loading ? '—' : kpi.value}
              </p>
              <p className="truncate text-xs text-muted">{loading ? ' ' : kpi.hint}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Files de travail */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Demandes de devis à traiter"
          icon={Inbox}
          action={<SeeAllLink href="/dashboard/bookings?tab=quotes" />}
        >
          {!loading && quotesToAnswer.length === 0 ? (
            <EmptyRow
              icon={CheckCircle2}
              title="Aucune demande en attente"
              hint={publishedCount > 0 ? 'Les nouvelles demandes de vos clients apparaîtront ici.' : `Publiez une ${listingNoun} pour recevoir des demandes.`}
            />
          ) : (
            <ul className="divide-y divide-border-subtle border-t border-border-subtle">
              {(loading ? [] : quotesToAnswer.slice(0, 5)).map((q) => (
                <li key={q.id}>
                  <Link
                    href={`/dashboard/bookings?tab=quotes&inquiryId=${q.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted/60 transition sm:px-5"
                  >
                    <span
                      className={cn(
                        'mt-0.5 h-2 w-2 shrink-0 rounded-full',
                        q.status === 'NEW' ? 'bg-festive-accent' : 'bg-border',
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {q.fromName}
                        <span className="font-normal text-muted"> · {shortListingTitle(q.title, tenant?.name)}</span>
                      </p>
                      <p className="truncate text-xs text-muted">
                        {formatDay(q.eventDate)}
                        {q.guestCount ? ` · ${q.guestCount} pers.` : ''}
                        {' · '}
                        {receivedLabel(q.createdAt)}
                      </p>
                    </div>
                    <StatusPill tone={q.status === 'NEW' ? 'amber' : 'slate'} className="shrink-0">
                      {q.status === 'NEW' ? 'Nouveau' : 'En discussion'}
                    </StatusPill>
                  </Link>
                </li>
              ))}
              {loading && (
                <li className="px-5 py-6 text-center text-xs text-muted">Chargement…</li>
              )}
            </ul>
          )}
          {quotesToAnswer.length > 5 && (
            <p className="border-t border-border-subtle px-5 py-2.5 text-xs text-muted">
              + {quotesToAnswer.length - 5} autre{quotesToAnswer.length - 5 > 1 ? 's' : ''} demande{quotesToAnswer.length - 5 > 1 ? 's' : ''}
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Prochaines dates"
          icon={CalendarCheck}
          action={<SeeAllLink href="/dashboard/bookings?tab=bookings" label="Planning" />}
        >
          {!loading && upcoming.length === 0 ? (
            <EmptyRow
              icon={Calendar}
              title="Aucune réservation à venir"
              hint="Transformez un devis accepté en réservation pour bloquer la date."
            />
          ) : (
            <ul className="divide-y divide-border-subtle border-t border-border-subtle">
              {(loading ? [] : upcoming.slice(0, 5)).map((b) => {
                const d = new Date(b.eventDate);
                const rel = relativeDayLabel(b.eventDate);
                const needsAction = b.status === 'REQUESTED' || b.status === 'ACCEPTED';
                return (
                  <li key={b.id}>
                    <Link
                      href={`/dashboard/bookings?tab=bookings&bookingId=${b.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted/60 transition sm:px-5"
                    >
                      <div className="flex w-11 shrink-0 flex-col items-center rounded-xl border border-border bg-background py-1">
                        <span className="text-[10px] font-semibold uppercase text-muted">
                          {d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}
                        </span>
                        <span className="text-base font-semibold leading-none tabular-nums text-foreground">{d.getDate()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {b.organizerName || 'Client'}
                          <span className="font-normal text-muted"> · {shortListingTitle(b.title, tenant?.name)}</span>
                        </p>
                        <p className="truncate text-xs text-muted">
                          {rel ? `${rel} · ` : ''}
                          {formatFc(b.amountFc)}
                          {b.guestCount ? ` · ${b.guestCount} pers.` : ''}
                        </p>
                      </div>
                      <StatusPill tone={BOOKING_TONES[b.status] ?? 'slate'} className="shrink-0">
                        {needsAction ? bookingActionLabel(b) : BOOKING_STATUS_LABELS[b.status]}
                      </StatusPill>
                    </Link>
                  </li>
                );
              })}
              {loading && <li className="px-5 py-6 text-center text-xs text-muted">Chargement…</li>}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* Vitrine */}
      <SectionCard
        title={isVenue ? 'Ma vitrine : salles publiées' : 'Ma vitrine : offres publiées'}
        icon={Eye}
        action={<SeeAllLink href={isVenue ? '/dashboard/rooms' : '/dashboard/marketplace'} label="Gérer" />}
      >
        {!loading && showcase.length === 0 ? (
          <div className="px-4 pb-4 sm:px-5">
            <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border bg-background/60 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isVenue ? 'Votre première salle vous attend' : 'Votre première offre vous attend'}
                </p>
                <p className="text-xs text-muted">
                  Photos, prix et localisation suffisent pour apparaître dans le catalogue et recevoir des devis.
                </p>
              </div>
              <Link
                href={primaryCta.href}
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary-solid px-4 text-xs font-semibold text-primary-foreground hover:bg-primary-solid-hover transition"
              >
                <primaryCta.icon className="w-4 h-4" />
                {primaryCta.label}
              </Link>
            </div>
          </div>
        ) : (
          <ul className="grid gap-3 px-4 pb-4 sm:grid-cols-2 sm:px-5 xl:grid-cols-3">
            {showcase.slice(0, 6).map((row) => {
              const issue = row.blocked
                ? { label: 'Suspendue par la plateforme', icon: AlertTriangle, tone: 'text-danger' }
                : !row.hasListing
                  ? { label: 'Fiche catalogue à créer', icon: EyeOff, tone: 'text-festive-accent' }
                  : !row.isPublic
                    ? { label: 'Masquée du catalogue', icon: EyeOff, tone: 'text-festive-accent' }
                    : row.photoCount === 0
                      ? { label: 'Ajoutez des photos', icon: ImageOff, tone: 'text-festive-accent' }
                      : null;
              return (
                <li key={row.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-background/60 p-2.5">
                  <div className="h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                    {row.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.cover}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.visibility = 'hidden';
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted">
                        {isVenue ? <Building2 className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{row.title}</p>
                    {issue ? (
                      <p className={cn('flex items-center gap-1 truncate text-xs font-medium', issue.tone)}>
                        <issue.icon className="w-3.5 h-3.5 shrink-0" />
                        {issue.label}
                      </p>
                    ) : (
                      <p className="flex items-center gap-1 truncate text-xs text-muted">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-primary" />
                        En ligne{row.subtitle ? ` · ${row.subtitle}` : ''}
                      </p>
                    )}
                  </div>
                  <Link
                    href={issue ? row.manageHref : row.publicHref ?? row.manageHref}
                    className="inline-flex min-h-9 shrink-0 items-center rounded-lg px-2.5 text-xs font-semibold text-primary hover:bg-primary/10 transition"
                    aria-label={issue ? `Compléter ${row.title}` : `Voir la fiche publique de ${row.title}`}
                  >
                    {issue ? 'Compléter' : 'Voir'}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {showcase.length > 6 && (
          <p className="border-t border-border-subtle px-5 py-2.5 text-xs text-muted">
            {showcase.length - 6} autre{showcase.length - 6 > 1 ? 's' : ''} fiche{showcase.length - 6 > 1 ? 's' : ''} dans la gestion.
          </p>
        )}
      </SectionCard>

      {/* Premiers pas (masquable) */}
      {user?.role === 'USER' && (
        <GettingStartedChecklist
          hasEvents={false}
          variant="vendor"
          hasRooms={(usage?.rooms ?? 0) > 0}
          hasServices={(usage?.services ?? 0) > 0}
          preferServices={!isVenue}
        />
      )}

      {/* Accès rapides */}
      <section aria-labelledby="vendor-quick-links">
        <h2 id="vendor-quick-links" className="mb-2 text-sm font-semibold text-foreground">
          Accès rapides
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 hover:border-primary/40 transition"
            >
              <span className="rounded-lg bg-primary/10 p-2 text-primary">
                <link.icon className="w-4 h-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">{link.label}</span>
                <span className="block truncate text-xs text-muted">{link.hint}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {tenant?.plan && (
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <UserCheck className="w-3.5 h-3.5" />
          Forfait {planName}
          {daysUntilExpiry != null && daysUntilExpiry > 0 ? ` · licence valable encore ${daysUntilExpiry} j` : ''}
        </p>
      )}
    </div>
  );
}
