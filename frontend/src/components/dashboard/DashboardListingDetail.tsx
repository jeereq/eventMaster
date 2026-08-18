'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getCatalogueReturn } from '@/lib/catalogueQuery';
import RoomLayoutPreview from '@/components/RoomLayoutPreview';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import MarketplaceLocationsMap, { type MarketplaceMapHandle } from '@/components/MarketplaceLocationsMap';
import ListingPublicDetails from '@/components/ListingPublicDetails';
import ListingDetailLayout from '@/components/ListingDetailLayout';
import { Badge, Button } from '@/components/ui';
import {
  catalogueItemToMapMarker,
  formatLocationLine,
  formatQuotaLabel,
  serviceMobilityLabel,
  withDashboardListingHref,
  serviceToCatalogueItem,
  venueToCatalogueItem,
  type PublicService,
  type PublicVenue,
} from '@/lib/marketplace';
import { roomTypeLabels, type RoomLayoutBlueprint, type RoomType } from '@/lib/roomLayoutUtils';
import type { MarketplaceFormTab } from '@/components/MarketplaceFormTabs';
import MarketplaceInquiryForm from '@/components/MarketplaceInquiryForm';
import MarketplaceBookingForm from '@/components/MarketplaceBookingForm';
import FavoriteHeart from '@/components/FavoriteHeart';
import { listingPublicUrl } from '@/lib/share';
import { useListingFavorites } from '@/lib/listingFavorites';
import { Building2, MapPin, Navigation, Sparkles, Users } from 'lucide-react';

export default function DashboardListingDetail({ kind }: { kind: 'venue' | 'service' }) {
  const params = useParams();
  const slug = params.slug as string;
  const { user, tenant, access } = useAuth();
  const { isFavorite, toggleFavorite } = useListingFavorites();
  const mapRef = useRef<MarketplaceMapHandle>(null);
  const [venue, setVenue] = useState<PublicVenue | null>(null);
  const [service, setService] = useState<PublicService | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [pickedDate, setPickedDate] = useState('');
  const [pickedEndDate, setPickedEndDate] = useState('');
  const [tab, setTab] = useState<MarketplaceFormTab>('details');
  const [wantRoute, setWantRoute] = useState(false);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      setLoading(true);
      setError('');
      try {
        if (kind === 'venue') {
          setVenue(await api.get(`/public/venues/${encodeURIComponent(slug)}`));
          setService(null);
        } else {
          setService(await api.get(`/public/services/${encodeURIComponent(slug)}`));
          setVenue(null);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Fiche introuvable.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [kind, slug]);

  const startRoute = (itemId: string) => {
    setWantRoute(true);
    setTab('map');
    window.setTimeout(() => mapRef.current?.startDirectionsFor(itemId), 80);
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isClient = tenant?.accountKind === 'CLIENT' || access?.level === 'client';
  const defaultBackHref = isSuperAdmin
    ? '/dashboard/admin/catalogue'
    : isClient
      ? '/dashboard/catalogue'
      : kind === 'venue'
        ? '/dashboard/rooms'
        : '/dashboard/marketplace';
  const [backHref, setBackHref] = useState(defaultBackHref);

  useEffect(() => {
    setBackHref(getCatalogueReturn(defaultBackHref, '/dashboard'));
  }, [defaultBackHref]);
  const backLabel = backHref.startsWith('/dashboard/admin/catalogue')
    ? 'Catalogue'
    : backHref.startsWith('/dashboard/catalogue')
      ? 'Marketplace'
      : backHref.startsWith('/dashboard/rooms')
        ? 'Salles'
        : backHref.startsWith('/dashboard/bookings')
          ? 'Réservations'
          : backHref.startsWith('/dashboard/marketplace')
            ? 'Prestations'
            : 'Retour';

  const item = venue
    ? withDashboardListingHref(venueToCatalogueItem(venue))
    : service
      ? withDashboardListingHref(serviceToCatalogueItem(service))
      : null;
  const quotaLabel = venue
    ? formatQuotaLabel(venue.quotaMin, venue.quotaMax)
    : service
      ? formatQuotaLabel(service.quotaMin, service.quotaMax)
      : null;
  const isPublic = venue?.isPublic ?? service?.isPublic ?? true;
  const lat = venue?.latitude ?? service?.latitude ?? null;
  const lng = venue?.longitude ?? service?.longitude ?? null;

  return (
    <ListingDetailLayout
      backHref={backHref}
      backLabel={backLabel}
      embedded
      loading={loading}
      error={error || (!loading && !venue && !service ? 'Fiche introuvable.' : '')}
      errorIcon={
        kind === 'venue'
          ? <Building2 className="w-10 h-10 text-muted mx-auto mb-3" />
          : <Sparkles className="w-10 h-10 text-muted mx-auto mb-3" />
      }
      errorMessage={kind === 'venue' ? 'Salle introuvable.' : 'Prestation introuvable.'}
      heroUrl={(venue?.photos || service?.photos || [])[0]}
      fallbackIcon={kind === 'venue' ? <Building2 className="w-12 h-12" /> : <Sparkles className="w-12 h-12" />}
      chip={
        venue
          ? (roomTypeLabels[venue.roomType as RoomType] || venue.roomType)
          : (service?.categoryLabel || '')
      }
      title={venue?.headline || service?.title || ''}
      subtitle={[venue?.orgName || service?.orgName, isPublic ? null : 'Brouillon'].filter(Boolean).join(' · ')}
      photos={venue?.photos || service?.photos || []}
      photoIndex={photoIndex}
      onPhotoIndex={setPhotoIndex}
      tab={tab}
      onTab={setTab}
      priceFromFc={(venue?.priceFromFc ?? service?.priceFromFc) ?? null}
      priceUnitLabel={venue?.priceUnitLabel || service?.priceUnitLabel}
      quotaLabel={quotaLabel}
      preview={!isClient}
      shareKind={kind}
      shareUrl={slug ? listingPublicUrl(kind, slug) : undefined}
      heroAction={isClient && slug ? (
        <FavoriteHeart
          active={isFavorite(kind, slug)}
          onToggle={() => void toggleFavorite(kind, slug)}
          className="h-10 w-10 bg-white/95"
        />
      ) : undefined}
      details={item ? (
        <div className="space-y-5">
          {!isPublic && (
            <Badge variant="default">Brouillon — non visible sur le marketplace public</Badge>
          )}
          <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {venue && formatLocationLine(venue) && (
              <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-2 min-h-9 rounded-full bg-surface-muted border border-border text-xs text-muted whitespace-nowrap">
                <MapPin className="w-3.5 h-3.5" /> {formatLocationLine(venue)}
                {venue.address ? ` · ${venue.address}` : ''}
              </span>
            )}
            {service && formatLocationLine(service) && (
              <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-2 min-h-9 rounded-full bg-surface-muted border border-border text-xs text-muted whitespace-nowrap">
                <MapPin className="w-3.5 h-3.5" />
                {formatLocationLine(service)}
                {` · ${serviceMobilityLabel(service.travels ?? Boolean(service.coverageRadiusKm), service.coverageRadiusKm)}`}
              </span>
            )}
            {venue?.capacity ? (
              <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-2 min-h-9 rounded-full bg-surface-muted border border-border text-xs text-muted whitespace-nowrap">
                <Users className="w-3.5 h-3.5" /> {venue.capacity} places
              </span>
            ) : null}
            {quotaLabel && (
              <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-2 min-h-9 rounded-full bg-surface-muted border border-border text-xs text-muted whitespace-nowrap">
                {quotaLabel}
              </span>
            )}
            {lat != null && lng != null && (
              <button
                type="button"
                onClick={() => startRoute(item.id)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 min-h-9 rounded-full bg-primary text-white text-xs font-semibold hover:opacity-95"
              >
                <Navigation className="w-3.5 h-3.5" />
                Itinéraire
              </button>
            )}
          </div>

          {(venue?.description || service?.description) && (
            <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
              {venue?.description || service?.description}
            </p>
          )}

          <ListingPublicDetails details={venue?.details || service?.details} kind={kind === 'venue' ? 'venue' : 'service'} />

          {venue?.layoutPreview ? (
            <div className="border border-border rounded-[var(--radius-card)] p-3.5 sm:p-4 bg-surface">
              <h2 className="text-sm font-semibold mb-3">Plan 2D</h2>
              <RoomLayoutPreview blueprint={venue.layoutPreview as RoomLayoutBlueprint} />
            </div>
          ) : null}

          <AvailabilityCalendar
            title="Calendrier des disponibilités"
            bookedDates={venue?.bookedDates || service?.bookedDates}
            blockedDates={venue?.blockedDates || service?.blockedDates}
            selectedDate={pickedDate}
            selectedEndDate={pickedEndDate}
            onSelectRange={(from, to) => {
              setPickedDate(from);
              setPickedEndDate(to);
            }}
          />
        </div>
      ) : null}
      map={item ? (
        lat != null && lng != null ? (
          <div className="rounded-[1.35rem] border border-border overflow-hidden bg-surface shadow-[var(--shadow-soft)]">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 border-b border-border">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Carte</p>
                <p className="text-xs text-muted">Position de la fiche, sans quitter le tableau de bord.</p>
              </div>
              <Button
                size="sm"
                className="min-h-11 sm:min-h-0"
                onClick={() => {
                  setWantRoute(true);
                  mapRef.current?.startDirectionsFor(item.id);
                }}
                leftIcon={<Navigation className="w-3.5 h-3.5" />}
              >
                Itinéraire
              </Button>
            </div>
            <div className="h-[16.5rem] sm:h-[26.25rem]">
              <MarketplaceLocationsMap
                ref={mapRef}
                markers={[catalogueItemToMapMarker(item)]}
                height="100%"
                navigateOnClick={false}
                autoDirections={wantRoute}
                city={venue?.city || service?.city}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Aucune position n’a encore été indiquée pour cette fiche.</p>
        )
      ) : null}
      inquiry={isClient && venue ? (
        <MarketplaceInquiryForm
          endpoint={`/public/venues/${encodeURIComponent(venue.slug)}/inquire`}
          successCopy="Demande transmise au propriétaire."
          eventDate={pickedDate}
          onEventDateChange={(value) => {
            setPickedDate(value);
            setPickedEndDate(value);
          }}
        />
      ) : isClient && service ? (
        <MarketplaceInquiryForm
          endpoint={`/public/services/${encodeURIComponent(service.slug)}/inquire`}
          successCopy="Demande transmise au prestataire."
          eventDate={pickedDate}
          onEventDateChange={(value) => {
            setPickedDate(value);
            setPickedEndDate(value);
          }}
        />
      ) : null}
      booking={isClient && venue ? (
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
      ) : isClient && service ? (
        <MarketplaceBookingForm
          offeringSlug={service.slug}
          unavailableDates={service.unavailableDates}
          bookedDates={service.bookedDates}
          blockedDates={service.blockedDates}
          priceFromFc={service.priceFromFc}
          priceUnit={service.priceUnit}
          eventDate={pickedDate}
          eventEndDate={pickedEndDate}
          onEventDateChange={setPickedDate}
          onEventEndDateChange={setPickedEndDate}
          showCalendar={false}
        />
      ) : null}
    />
  );
}
