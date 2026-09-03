'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import PublicPageShell from '@/components/PublicPageShell';
import MarketplaceInquiryForm from '@/components/MarketplaceInquiryForm';
import MarketplaceBookingForm from '@/components/MarketplaceBookingForm';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import type { MarketplaceMapHandle } from '@/components/MarketplaceLocationsMap';
import ListingPublicDetails from '@/components/ListingPublicDetails';
import ListingDetailLayout from '@/components/ListingDetailLayout';
import ListingMapPanel from '@/components/ListingMapPanel';
import ListingRelationStatus from '@/components/ListingRelationStatus';
import {
  catalogueItemToMapMarker,
  formatLocationLine,
  formatQuotaLabel,
  venueToCatalogueItem,
  type PublicVenue,
} from '@/lib/marketplace';
import { roomTypeLabels, type RoomLayoutBlueprint, type RoomType } from '@/lib/roomLayoutUtils';
import type { MarketplaceFormTab } from '@/components/MarketplaceFormTabs';
import { Building2 } from 'lucide-react';
import MarketplaceActivityFeed from '@/components/marketplace/MarketplaceActivityFeed';

const RoomLayoutPreview = dynamic(() => import('@/components/RoomLayoutPreview'), {
  loading: () => <div className="h-48 rounded-[var(--radius-card)] bg-surface-muted" aria-hidden />,
});

export default function MarketplaceVenueDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const mapRef = useRef<MarketplaceMapHandle>(null);
  const [venue, setVenue] = useState<PublicVenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [pickedDate, setPickedDate] = useState('');
  const [pickedEndDate, setPickedEndDate] = useState('');
  const [tab, setTab] = useState<MarketplaceFormTab>('details');
  const [wantRoute, setWantRoute] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!slug) return;
      setLoading(true);
      setError('');
      try {
        const data = await api.get(`/public/venues/${encodeURIComponent(slug)}`);
        if (!cancelled) setVenue(data);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Salle introuvable.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug, reloadNonce]);

  const startRoute = (itemId: string) => {
    setWantRoute(true);
    setTab('map');
    window.setTimeout(() => mapRef.current?.startDirectionsFor(itemId), 80);
  };

  const item = venue ? venueToCatalogueItem(venue) : null;
  const quotaLabel = venue ? formatQuotaLabel(venue.quotaMin, venue.quotaMax) : null;

  return (
    <PublicPageShell faqHref="/faq" mobileFooterPad>
      <ListingDetailLayout
        backHref="/marketplace/salles"
        backLabel="Toutes les salles"
        loading={loading}
        error={error || (!loading && !venue ? 'Salle introuvable.' : '')}
        errorIcon={<Building2 className="w-10 h-10 text-muted mx-auto mb-3" />}
        errorMessage="Salle introuvable."
        onRetry={() => setReloadNonce((n) => n + 1)}
        heroUrl={venue?.photos[0]}
        fallbackIcon={<Building2 className="w-12 h-12" />}
        chip={venue ? (roomTypeLabels[venue.roomType as RoomType] || venue.roomType) : ''}
        title={venue?.headline || ''}
        subtitle={venue?.orgName || ''}
        shareKind="venue"
        shareSlug={venue?.slug}
        photos={venue?.photos || []}
        photoIndex={photoIndex}
        onPhotoIndex={setPhotoIndex}
        tab={tab}
        onTab={setTab}
        priceFromFc={venue?.priceFromFc ?? null}
        priceUnitLabel={venue?.priceUnitLabel}
        quotaLabel={quotaLabel}
        activityPreview={venue?.activityPreview}
        relatedServices={venue?.relatedServices}
        relatedVenues={venue?.relatedVenues}
        details={venue && item ? (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3 max-w-prose">
            <p className="text-sm text-muted leading-relaxed">
              {[
                formatLocationLine(venue),
                venue.address,
                venue.capacity ? `${venue.capacity} places` : null,
              ].filter(Boolean).join(' · ')}
              {venue.latitude != null && venue.longitude != null ? (
                <>
                  {' · '}
                  <button type="button" onClick={() => startRoute(item.id)} className="font-semibold text-primary hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-sm">
                    Itinéraire
                  </button>
                </>
              ) : null}
            </p>
            {venue.description ? (
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{venue.description}</p>
            ) : null}
            </div>
            <ListingPublicDetails details={venue.details} kind="venue" />
            {venue.layoutPreview ? (
              <div>
                <h2 className="text-sm font-semibold mb-2">Plan de la salle</h2>
                <RoomLayoutPreview
                  blueprint={venue.layoutPreview as RoomLayoutBlueprint}
                  quality="showcase"
                />
              </div>
            ) : null}
          </div>
        ) : null}
        availability={venue ? (
          <AvailabilityCalendar
            compact
            title="Choisir vos dates"
            bookedDates={venue.bookedDates}
            blockedDates={venue.blockedDates}
            selectedDate={pickedDate}
            selectedEndDate={pickedEndDate}
            onSelectRange={(from, to) => {
              setPickedDate(from);
              setPickedEndDate(to);
            }}
          />
        ) : null}
        relationStatus={venue?.slug ? <ListingRelationStatus kind="venue" slug={venue.slug} /> : null}
        map={venue && item ? (
          venue.latitude != null && venue.longitude != null ? (
            <ListingMapPanel
              mapRef={mapRef}
              marker={catalogueItemToMapMarker(item)}
              city={venue.city}
              locationLine={formatLocationLine(venue)}
              address={venue.address}
              wantRoute={wantRoute}
              onStartRoute={() => {
                setWantRoute(true);
                mapRef.current?.startDirectionsFor(item.id);
              }}
            />
          ) : (
            <p className="text-sm text-muted">Aucune position n’a encore été indiquée pour cette salle.</p>
          )
        ) : null}
        activity={venue ? (
          <MarketplaceActivityFeed
            scope={{ kind: 'venue', slug: venue.slug }}
            authorLabel={venue.headline || venue.orgName || 'Cette salle'}
            className="max-w-2xl"
          />
        ) : null}
        inquiry={venue ? (
          <MarketplaceInquiryForm
            endpoint={`/public/venues/${encodeURIComponent(venue.slug)}/inquire`}
            successCopy="Demande transmise au propriétaire."
            eventDate={pickedDate}
            onEventDateChange={setPickedDate}
            eventEndDate={pickedEndDate}
            onEventEndDateChange={setPickedEndDate}
          />
        ) : null}
        booking={venue ? (
          <MarketplaceBookingForm
            listingSlug={venue.slug}
            unavailableDates={venue.unavailableDates}
            bookedDates={venue.bookedDates}
            blockedDates={venue.blockedDates}
            priceFromFc={venue.priceFromFc}
            priceUnit={venue.priceUnit}
            eventDate={pickedDate}
            eventEndDate={pickedEndDate}
            onEventDateChange={setPickedDate}
            onEventEndDateChange={setPickedEndDate}
            showCalendar={false}
          />
        ) : null}
      />
    </PublicPageShell>
  );
}
