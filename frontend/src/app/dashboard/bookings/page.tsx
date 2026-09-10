'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Breadcrumbs, Alert, Button, EmptyState, Card } from '@/components/ui';
import {
  dashboardServiceHref,
  dashboardVenueHref,
  isServiceRentalCategory,
  type MarketplaceBookingItem,
  type MarketplaceInquiryItem,
} from '@/lib/marketplace';
import { formatFc } from '@/config/landingPricing';
import MarketplaceBookingsPanel from '@/components/MarketplaceBookingsPanel';
import MarketplaceInquiriesPanel from '@/components/MarketplaceInquiriesPanel';
import { rememberCurrentCatalogueList, useRememberListReturn } from '@/lib/catalogueQuery';
import {
  Bookmark,
  Building2,
  CalendarCheck,
  FileText,
  Heart,
  Inbox,
  Loader2,
  Store,
  Trash2,
} from 'lucide-react';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { depositPercent } from '@/lib/platformRates';
import { useListingFavorites } from '@/lib/listingFavorites';
import type { SavedEventPack } from '@/lib/eventPlan';
import { eventTypeLabel } from '@/lib/listingDetails';
import { canPublishVenueCatalog } from '@/lib/planAccess';
import { cn } from '@/lib/cn';

type HubTab = 'quotes' | 'bookings' | 'packs' | 'favorites';

function OrganizerDemandesPage() {
  useRememberListReturn();
  const { access, tenant, planFeatures, planQuota } = useAuth();
  const { site } = usePlatformSite();
  const searchParams = useSearchParams();
  const router = useRouter();

  const canActAsVendor =
    Boolean(access?.canManageRooms) ||
    tenant?.accountKind === 'VENDOR' ||
    tenant?.accountKind === 'BOTH' ||
    planFeatures?.audience === 'B2B' ||
    planFeatures?.audience === 'VENUE' ||
    planFeatures?.audience === 'CATALOG' ||
    canPublishVenueCatalog(planFeatures, planQuota, tenant?.plan);

  const requestedRole = searchParams.get('role');
  const [role, setRole] = useState<'vendor' | 'organizer'>(
    canActAsVendor && (requestedRole === 'vendor' || (!requestedRole && (tenant?.accountKind === 'VENDOR' || planFeatures?.audience === 'VENUE')))
      ? 'vendor'
      : 'organizer',
  );

  const requestedTab = searchParams.get('tab');
  const eventFilter = searchParams.get('event') || 'all';
  const highlightInquiryId = searchParams.get('inquiryId');
  const highlightBookingId = searchParams.get('bookingId');
  const [tab, setTab] = useState<HubTab>(
    requestedTab === 'bookings' || requestedTab === 'packs' || requestedTab === 'favorites'
      ? requestedTab
      : 'quotes',
  );
  const [bookings, setBookings] = useState<MarketplaceBookingItem[]>([]);
  const [commissionDueFc, setCommissionDueFc] = useState(0);
  const [inquiries, setInquiries] = useState<MarketplaceInquiryItem[]>([]);
  const [packs, setPacks] = useState<SavedEventPack[]>([]);
  const [orgEvents, setOrgEvents] = useState<Array<{ id: string; title: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const favorites = useListingFavorites();
  const isClient = access?.level === 'client';
  const isProtocol = Boolean(access?.isProtocolOnly);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const activeRole = role;
      const [bookingData, inquiryData, packData, eventsData] = await Promise.all([
        api.get(`/marketplace/bookings?role=${activeRole}`),
        api.get(`/marketplace/inquiries?role=${activeRole}`),
        activeRole === 'organizer' && !isProtocol
          ? api.get('/marketplace/event-packs').catch(() => ({ packs: [] }))
          : Promise.resolve({ packs: [] }),
        api.get('/events').catch(() => ({ events: [] })),
      ]);
      setBookings(bookingData.bookings || []);
      setCommissionDueFc(bookingData.commissionDueFc || 0);
      setInquiries(inquiryData.inquiries || []);
      setPacks(Array.isArray(packData.packs) ? packData.packs : []);
      const eventRows = Array.isArray(eventsData) ? eventsData : eventsData.events || [];
      setOrgEvents(eventRows.map((row: { id: string; title: string }) => ({ id: row.id, title: row.title })));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger vos demandes.');
    } finally {
      setLoading(false);
    }
  }, [role, isProtocol]);

  useEffect(() => {
    if (tenant?.id) load();
    else setLoading(false);
  }, [tenant?.id, load]);

  useEffect(() => {
    if (requestedRole === 'vendor' && canActAsVendor && role !== 'vendor') {
      setRole('vendor');
    } else if (requestedRole === 'organizer' && role !== 'organizer') {
      setRole('organizer');
    }
  }, [requestedRole, canActAsVendor, role]);

  useEffect(() => {
    if (requestedTab === 'quotes' || requestedTab === 'bookings' || requestedTab === 'packs' || requestedTab === 'favorites') {
      setTab(requestedTab);
    }
  }, [requestedTab]);

  const setPerspectiveRole = (newRole: 'vendor' | 'organizer') => {
    setRole(newRole);
    if (newRole === 'vendor' && (tab === 'packs' || tab === 'favorites')) {
      setTab('quotes');
    }
    const params = new URLSearchParams(searchParams.toString());
    if (newRole === 'vendor') params.set('role', 'vendor');
    else params.delete('role');
    const qs = params.toString();
    router.replace(qs ? `/dashboard/bookings?${qs}` : '/dashboard/bookings', { scroll: false });
  };

  const eventOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of orgEvents) map.set(row.id, row.title);
    for (const item of inquiries) {
      if (item.event?.id) map.set(item.event.id, item.event.title);
    }
    for (const item of bookings) {
      if (item.event?.id) map.set(item.event.id, item.event.title);
    }
    return Array.from(map, ([id, title]) => ({ id, title }));
  }, [orgEvents, inquiries, bookings]);

  const visibleInquiries = eventFilter === 'all'
    ? inquiries
    : inquiries.filter((item) => item.event?.id === eventFilter);
  const visibleBookings = eventFilter === 'all'
    ? bookings
    : bookings.filter((item) => item.event?.id === eventFilter);

  const setEventFilter = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!id || id === 'all') params.delete('event');
    else params.set('event', id);
    const qs = params.toString();
    router.replace(qs ? `/dashboard/bookings?${qs}` : '/dashboard/bookings');
  };

  const setHubTab = (id: HubTab) => {
    setTab(id);
    const params = new URLSearchParams(searchParams.toString());
    if (id === 'quotes') params.delete('tab');
    else params.set('tab', id);
    const qs = params.toString();
    router.replace(qs ? `/dashboard/bookings?${qs}` : '/dashboard/bookings', { scroll: false });
  };

  const pendingQuotes = visibleInquiries.filter((item) => item.status === 'NEW' && !item.hasBooking).length;
  const openBookings = visibleBookings.filter((item) => item.status === 'REQUESTED' || item.status === 'ACCEPTED').length;

  useEffect(() => {
    if (!isProtocol) return;
    if (tab !== 'packs' && tab !== 'favorites') return;
    setTab('quotes');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('tab');
    const qs = params.toString();
    router.replace(qs ? `/dashboard/bookings?${qs}` : '/dashboard/bookings', { scroll: false });
  }, [isProtocol, tab, searchParams, router]);

  const showEventFilter = (tab === 'quotes' || tab === 'bookings') && eventOptions.length > 0;

  const pageTitle =
    role === 'vendor'
      ? tab === 'bookings'
        ? 'Réservations reçues'
        : 'Devis reçus'
      : tab === 'bookings'
        ? 'Réservations'
        : tab === 'quotes'
          ? 'Devis'
          : tab === 'packs'
            ? 'Mes packs'
            : tab === 'favorites'
              ? 'Favoris'
              : 'Devis & réservations';

  const pageDescription =
    role === 'vendor'
      ? tab === 'bookings'
        ? 'Réservations reçues pour vos salles ou prestations.'
        : 'Demandes de devis transmises par les organisateurs.'
      : isProtocol
        ? tab === 'bookings'
          ? 'Réservations liées aux événements accompagnés.'
          : 'Devis envoyés pour le protocole.'
        : tab === 'bookings'
          ? 'Vos dates confirmées et acomptes.'
          : tab === 'quotes'
            ? 'Vos demandes et devis en attente ou chiffrés.'
            : tab === 'packs'
              ? 'Vos sélections et briefs sauvegardés.'
              : tab === 'favorites'
                ? 'Vos fiches et prestataires enregistrés.'
                : 'Suivez vos devis et réservations en temps réel.';

  return (
    <div className="space-y-5 w-full">
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        breadcrumbs={
          <Breadcrumbs
            items={[
              {
                label: isProtocol ? 'Protocole' : isClient ? 'Marketplace' : 'Accueil',
                href: isProtocol ? '/dashboard' : isClient ? '/dashboard/catalogue' : '/dashboard',
              },
              { label: 'Devis & réservations' },
            ]}
          />
        }
        action={
          !isProtocol ? (
            <Link href="/dashboard/catalogue" className="inline-flex">
              <Button size="sm" leftIcon={<Store className="w-4 h-4" />}>
                Explorer
              </Button>
            </Link>
          ) : null
        }
      />

      {/* SÉLECTEUR DE PERSPECTIVE VENDEUR / ORGANISATEUR */}
      {canActAsVendor && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 rounded-2xl border border-border bg-surface-muted/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPerspectiveRole('vendor')}
              className={cn(
                'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition',
                role === 'vendor'
                  ? 'bg-surface text-foreground shadow-xs border border-border font-bold'
                  : 'text-muted hover:text-foreground hover:bg-surface/50',
              )}
            >
              <Store className="w-4 h-4 text-primary" />
              <span>Demandes reçues (Professionnel / Salle)</span>
              {role === 'vendor' && pendingQuotes > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white shadow-2xs">
                  {pendingQuotes}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setPerspectiveRole('organizer')}
              className={cn(
                'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition',
                role === 'organizer'
                  ? 'bg-surface text-foreground shadow-xs border border-border font-bold'
                  : 'text-muted hover:text-foreground hover:bg-surface/50',
              )}
            >
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span>Mes demandes (Organisateur)</span>
            </button>
          </div>

          <div className="text-[11px] text-muted px-2">
            {role === 'vendor' ? (
              <span>Vue dédiée aux prestataires et gestionnaires de salles</span>
            ) : (
              <span>Vue dédiée aux réservations que vous avez initiées</span>
            )}
          </div>
        </div>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Sections devis et réservations"
          className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-xl border border-border bg-muted/40 p-1 sm:flex-wrap"
        >
          {[
            {
              id: 'quotes' as const,
              label: role === 'vendor' ? 'Devis reçus' : 'Devis',
              count: pendingQuotes > 0 ? `${pendingQuotes} en attente` : visibleInquiries.length,
              icon: Inbox,
            },
            {
              id: 'bookings' as const,
              label: role === 'vendor' ? 'Réservations reçues' : 'Réservations',
              count: openBookings > 0 ? `${openBookings} ouvertes` : visibleBookings.length,
              icon: CalendarCheck,
            },
            ...(role === 'organizer' && !isProtocol
              ? [
                  { id: 'packs' as const, label: 'Packs', count: packs.length, icon: Bookmark },
                  { id: 'favorites' as const, label: 'Favoris', count: favorites.items.length, icon: Heart },
                ]
              : []),
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setHubTab(item.id)}
              className={cn(
                'inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition whitespace-nowrap shrink-0',
                tab === item.id
                  ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
                  : 'text-muted hover:bg-surface/70 hover:text-foreground',
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
              <span
                className={cn(
                  'ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold',
                  tab === item.id ? 'bg-primary/10 text-primary' : 'bg-surface text-muted',
                )}
              >
                {item.count}
              </span>
            </button>
          ))}
        </div>

        {showEventFilter ? (
          <div className="sm:w-64 shrink-0">
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              aria-label="Filtrer par événement"
              className="w-full h-10 px-3 rounded-xl border border-border bg-surface text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent transition"
            >
              <option value="all">Tous les événements</option>
              {eventOptions.map((event) => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : tab === 'quotes' ? (
        <MarketplaceInquiriesPanel
          inquiries={visibleInquiries}
          organizerView={role === 'organizer'}
          onChanged={load}
          highlightInquiryId={highlightInquiryId}
        />
      ) : tab === 'bookings' ? (
        <MarketplaceBookingsPanel
          bookings={visibleBookings}
          commissionDueFc={role === 'vendor' ? commissionDueFc : 0}
          onChanged={load}
          organizerView={role === 'organizer'}
          highlightBookingId={highlightBookingId}
        />
      ) : tab === 'packs' ? (
        packs.length === 0 ? (
          <EmptyState
            icon={<Bookmark className="w-5 h-5" />}
            title="Aucun pack enregistré"
            description="Explorez le catalogue, imaginez votre composition idéale et enregistrez votre projet ici."
            action={
              <Link href="/dashboard/catalogue?hub=plan">
                <Button size="sm">Préparer un pack</Button>
              </Link>
            }
          />
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {packs.map((pack) => (
              <li key={pack.id}>
                <Card interactive className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {eventTypeLabel(pack.eventType)}
                    {pack.city ? ` · ${pack.city}` : ''}
                  </p>
                  <h3 className="text-sm font-semibold tracking-tight">{pack.name}</h3>
                  <p className="text-xs text-muted">
                    {formatFc(pack.totalFc)}
                    {pack.venue ? ` · ${pack.venue.title}` : ''}
                    {pack.services.length ? ` · ${pack.services.length} fiche${pack.services.length > 1 ? 's' : ''}` : ''}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link href="/dashboard/catalogue?hub=plan" className="text-xs font-semibold text-primary hover:underline">
                      Ouvrir dans le catalogue
                    </Link>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )
      ) : favorites.items.length === 0 ? (
        <EmptyState
          icon={<Heart className="w-5 h-5" />}
          title="Aucun favori"
          description="Enregistrez des salles, prestataires ou équipements depuis le marketplace pour les retrouver ici."
          action={
            <Link href="/dashboard/catalogue">
              <Button size="sm">Parcourir le marketplace</Button>
            </Link>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {favorites.items.map((item) => {
            const href =
              item.href
              || (item.kind === 'venue'
                ? dashboardVenueHref(item.slug)
                : dashboardServiceHref(item.slug, item.category));
            return (
              <li key={`${item.kind}:${item.slug}`}>
                <Card className="flex items-center gap-3">
                  <Link
                    href={href}
                    className="flex items-center gap-3 min-w-0 flex-1"
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                      rememberCurrentCatalogueList();
                    }}
                  >
                    <div className="w-12 h-12 rounded-[var(--radius-card)] overflow-hidden bg-surface-muted shrink-0">
                      {item.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.coverUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted">
                          {item.kind === 'venue' ? <Store className="w-4 h-4" /> : <Inbox className="w-4 h-4" />}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={cn(
                        'text-[10px] font-semibold uppercase tracking-wider',
                        item.kind === 'venue'
                          ? 'text-primary'
                          : isServiceRentalCategory(item.category)
                            ? 'text-cyan-700 dark:text-cyan-400'
                            : 'text-[color:var(--festive-accent)]',
                      )}>
                        {item.kind === 'venue' ? 'Salle' : item.categoryLabel || (isServiceRentalCategory(item.category) ? 'Matériel' : 'Prestataire')}
                      </p>
                      <p className="text-sm font-semibold truncate">{item.title}</p>
                      <p className="text-[11px] text-muted truncate">
                        {[item.orgName, item.location, item.priceFromFc != null ? formatFc(item.priceFromFc) : 'Sur devis'].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    aria-label="Retirer des favoris"
                    className="shrink-0 min-h-10 min-w-10 inline-flex items-center justify-center rounded-xl border border-border text-muted hover:text-rose-600 hover:border-rose-300"
                    onClick={() => void favorites.toggleFavorite(item.kind, item.slug)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && (tab === 'quotes' || tab === 'bookings') && !isProtocol ? (
        <p className="text-[11px] text-muted flex items-center gap-1.5">
          {tab === 'quotes' ? <FileText className="w-3.5 h-3.5" /> : <CalendarCheck className="w-3.5 h-3.5" />}
          {role === 'vendor'
            ? 'Conseil : répondez rapidement aux devis pour maximiser vos réservations confirmées.'
            : 'Astuce : sélectionnez une période sur la fiche salle ou prestataire, puis envoyez le devis ou la réservation.'}
        </p>
      ) : null}
    </div>
  );
}

export default function ClientBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-muted">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      }
    >
      <OrganizerDemandesPage />
    </Suspense>
  );
}
