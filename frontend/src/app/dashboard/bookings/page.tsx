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
import { useRememberListReturn } from '@/lib/catalogueQuery';
import { Bookmark, CalendarCheck, FileText, Heart, Inbox, Loader2, Store, Trash2 } from 'lucide-react';
import GettingStartedChecklist from '@/components/GettingStartedChecklist';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { depositPercent } from '@/lib/platformRates';
import { CatalogueChoicePills } from '@/components/CatalogueFilterBar';
import { useListingFavorites } from '@/lib/listingFavorites';
import type { SavedEventPack } from '@/lib/eventPlan';
import { eventTypeLabel } from '@/lib/listingDetails';
import { cn } from '@/lib/cn';

type HubTab = 'quotes' | 'bookings' | 'packs' | 'favorites';

function HubStat({
  label,
  value,
  hint,
  active,
  onClick,
}: {
  label: string;
  value: number;
  hint?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'text-left rounded-2xl border px-3.5 py-3 bg-surface transition',
        active ? 'border-primary/40 ring-1 ring-primary/25' : 'border-border',
        onClick && 'hover:border-primary/30 cursor-pointer',
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="text-xl font-semibold tracking-tight mt-0.5">{value}</p>
      {hint ? <p className="text-[11px] text-muted mt-0.5 leading-snug">{hint}</p> : null}
    </Comp>
  );
}

function OrganizerDemandesPage() {
  useRememberListReturn();
  const { access, tenant } = useAuth();
  const { site } = usePlatformSite();
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedTab = searchParams.get('tab');
  const eventFilter = searchParams.get('event') || 'all';
  const [tab, setTab] = useState<HubTab>(
    requestedTab === 'bookings' || requestedTab === 'packs' || requestedTab === 'favorites'
      ? requestedTab
      : 'quotes',
  );
  const [bookings, setBookings] = useState<MarketplaceBookingItem[]>([]);
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
      const [bookingData, inquiryData, packData, eventsData] = await Promise.all([
        api.get('/marketplace/bookings?role=organizer'),
        api.get('/marketplace/inquiries?role=organizer'),
        api.get('/marketplace/event-packs').catch(() => ({ packs: [] })),
        api.get('/events').catch(() => ({ events: [] })),
      ]);
      setBookings(bookingData.bookings || []);
      setInquiries(inquiryData.inquiries || []);
      setPacks(Array.isArray(packData.packs) ? packData.packs : []);
      const eventRows = Array.isArray(eventsData) ? eventsData : eventsData.events || [];
      setOrgEvents(eventRows.map((row: { id: string; title: string }) => ({ id: row.id, title: row.title })));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger vos demandes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tenant?.id) load();
    else setLoading(false);
  }, [tenant?.id, load]);

  useEffect(() => {
    if (requestedTab === 'quotes' || requestedTab === 'bookings' || requestedTab === 'packs' || requestedTab === 'favorites') {
      setTab(requestedTab);
    }
  }, [requestedTab]);

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
  const confirmedBookings = visibleBookings.filter((item) => item.status === 'CONFIRMED' || item.status === 'COMPLETED').length;

  const tabs = useMemo(
    () => [
      {
        id: 'quotes',
        label: pendingQuotes > 0
          ? `Devis · ${pendingQuotes} en attente`
          : `Devis · ${visibleInquiries.length}`,
      },
      {
        id: 'bookings',
        label: openBookings > 0
          ? `Réservations · ${openBookings} ouvertes`
          : `Réservations · ${visibleBookings.length}`,
      },
      ...(isProtocol ? [] : [
        { id: 'packs', label: `Packs · ${packs.length}` },
        { id: 'favorites', label: `Favoris · ${favorites.items.length}` },
      ]),
    ],
    [
      pendingQuotes,
      visibleInquiries.length,
      openBookings,
      visibleBookings.length,
      packs.length,
      favorites.items.length,
      isProtocol,
    ],
  );

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
    tab === 'bookings' ? 'Réservations'
      : tab === 'quotes' ? 'Demandes de devis'
        : tab === 'packs' ? 'Packs enregistrés'
          : tab === 'favorites' ? 'Favoris'
            : 'Devis & réservations';

  const pageDescription = isProtocol
    ? tab === 'bookings'
      ? 'Suivez les réservations liées aux événements que vous accompagnez.'
      : 'Suivez les devis envoyés aux salles et prestataires pour le protocole.'
    : tab === 'bookings'
      ? `Suivez les réservations de dates. L’acompte (${depositPercent(site)} %) se verse hors plateforme.`
      : tab === 'quotes'
        ? 'Suivez vos demandes de devis envoyées aux salles et prestataires.'
        : tab === 'packs'
          ? 'Retrouvez les compositions catalogue enregistrées pour votre projet.'
          : tab === 'favorites'
            ? 'Salles, métiers et locations que vous avez mises de côté.'
            : `Suivez devis, réservations, packs et favoris. L’acompte (${depositPercent(site)} %) se verse hors plateforme.`;

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

      {isClient && !isProtocol ? <GettingStartedChecklist variant="client" hasEvents={false} /> : null}

      {error && <Alert variant="error">{error}</Alert>}

      {!loading ? (
        <div className={cn('grid gap-2', isProtocol ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4')}>
          <HubStat
            label="Devis en attente"
            value={pendingQuotes}
            hint={`${visibleInquiries.length} au total`}
            active={tab === 'quotes'}
            onClick={() => setHubTab('quotes')}
          />
          <HubStat
            label="Résas ouvertes"
            value={openBookings}
            hint={`${confirmedBookings} confirmée${confirmedBookings > 1 ? 's' : ''}`}
            active={tab === 'bookings'}
            onClick={() => setHubTab('bookings')}
          />
          {!isProtocol ? (
            <>
              <HubStat
                label="Packs"
                value={packs.length}
                active={tab === 'packs'}
                onClick={() => setHubTab('packs')}
              />
              <HubStat
                label="Favoris"
                value={favorites.items.length}
                active={tab === 'favorites'}
                onClick={() => setHubTab('favorites')}
              />
            </>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <CatalogueChoicePills
          options={tabs}
          value={tab}
          onChange={(id) => setHubTab((id as HubTab) || 'quotes')}
        />
        {showEventFilter ? (
          <label className="flex flex-col gap-1.5 text-sm sm:min-w-[14rem]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Filtrer par événement</span>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface text-sm"
            >
              <option value="all">Tous les événements</option>
              {eventOptions.map((event) => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : tab === 'quotes' ? (
        <MarketplaceInquiriesPanel inquiries={visibleInquiries} organizerView />
      ) : tab === 'bookings' ? (
        <MarketplaceBookingsPanel
          bookings={visibleBookings}
          commissionDueFc={0}
          onChanged={load}
          organizerView
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
          description="Enregistrez des salles, métiers ou locations depuis le marketplace pour les retrouver ici."
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
                  <Link href={href} className="flex items-center gap-3 min-w-0 flex-1">
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
                        {item.kind === 'venue' ? 'Salle' : item.categoryLabel || (isServiceRentalCategory(item.category) ? 'Location' : 'Métier')}
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
          Astuce : sélectionnez une période sur la fiche salle ou prestataire, puis envoyez le devis ou la réservation.
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
