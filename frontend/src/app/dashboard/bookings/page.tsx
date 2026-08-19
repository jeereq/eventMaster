'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
import { Bookmark, Heart, Inbox, Loader2, Store } from 'lucide-react';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { depositPercent } from '@/lib/platformRates';
import { CatalogueChoicePills } from '@/components/CatalogueFilterBar';
import { useListingFavorites } from '@/lib/listingFavorites';
import type { SavedEventPack } from '@/lib/eventPlan';
import { eventTypeLabel } from '@/lib/listingDetails';
import { cn } from '@/lib/cn';

type HubTab = 'quotes' | 'bookings' | 'packs' | 'favorites';

function OrganizerDemandesPage() {
  useRememberListReturn();
  const { access, tenant } = useAuth();
  const { site } = usePlatformSite();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [tab, setTab] = useState<HubTab>(
    requestedTab === 'bookings' || requestedTab === 'packs' || requestedTab === 'favorites'
      ? requestedTab
      : 'quotes',
  );
  const [bookings, setBookings] = useState<MarketplaceBookingItem[]>([]);
  const [inquiries, setInquiries] = useState<MarketplaceInquiryItem[]>([]);
  const [packs, setPacks] = useState<SavedEventPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const favorites = useListingFavorites();
  const isClient = access?.level === 'client';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [bookingData, inquiryData, packData] = await Promise.all([
        api.get('/marketplace/bookings?role=organizer'),
        api.get('/marketplace/inquiries?role=organizer'),
        api.get('/marketplace/event-packs').catch(() => ({ packs: [] })),
      ]);
      setBookings(bookingData.bookings || []);
      setInquiries(inquiryData.inquiries || []);
      setPacks(Array.isArray(packData.packs) ? packData.packs : []);
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

  const pendingQuotes = inquiries.filter((item) => item.status === 'NEW' && !item.hasBooking).length;
  const openBookings = bookings.filter((item) => item.status === 'REQUESTED' || item.status === 'ACCEPTED').length;

  const tabs = useMemo(
    () => [
      { id: 'quotes', label: pendingQuotes ? `Devis (${pendingQuotes})` : `Devis (${inquiries.length})` },
      { id: 'bookings', label: openBookings ? `Réservations (${openBookings})` : `Réservations (${bookings.length})` },
      { id: 'packs', label: `Packs (${packs.length})` },
      { id: 'favorites', label: `Favoris (${favorites.items.length})` },
    ],
    [pendingQuotes, inquiries.length, openBookings, bookings.length, packs.length, favorites.items.length],
  );

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Devis & réservations"
        description={`Suivez vos demandes de devis, les réservations envoyées, vos packs et favoris. L’acompte (${depositPercent(site)} %) se verse hors plateforme.`}
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: isClient ? 'Marketplace' : 'Accueil', href: isClient ? '/dashboard/catalogue' : '/dashboard' },
              { label: 'Devis & réservations' },
            ]}
          />
        }
        action={
          <Link href="/dashboard/catalogue" className="inline-flex">
            <Button size="sm" leftIcon={<Store className="w-4 h-4" />}>
              Marketplace
            </Button>
          </Link>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      <CatalogueChoicePills
        options={tabs}
        value={tab}
        onChange={(id) => setTab((id as HubTab) || 'quotes')}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : tab === 'quotes' ? (
        <MarketplaceInquiriesPanel inquiries={inquiries} organizerView />
      ) : tab === 'bookings' ? (
        <MarketplaceBookingsPanel
          bookings={bookings}
          commissionDueFc={0}
          onChanged={load}
          organizerView
        />
      ) : tab === 'packs' ? (
        packs.length === 0 ? (
          <EmptyState
            icon={<Bookmark className="w-5 h-5" />}
            title="Aucun pack enregistré"
            description="Composez un mix salle / métiers / locations depuis le marketplace, puis enregistrez-le ici."
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
                  <Link href="/dashboard/catalogue?hub=plan" className="text-xs font-semibold text-primary hover:underline">
                    Ouvrir la préparation
                  </Link>
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
          {favorites.items.map((item) => (
            <li key={`${item.kind}:${item.slug}`}>
              <Link
                href={
                  item.href
                  || (item.kind === 'venue'
                    ? dashboardVenueHref(item.slug)
                    : dashboardServiceHref(item.slug, item.category))
                }
                className="block"
              >
                <Card interactive className="flex items-center gap-3">
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
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
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
