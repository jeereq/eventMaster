'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import PublicPageShell from '@/components/PublicPageShell';
import MarketplaceInquiryForm from '@/components/MarketplaceInquiryForm';
import MarketplaceBookingForm from '@/components/MarketplaceBookingForm';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import MarketplaceLocationsMap, { type MarketplaceMapHandle } from '@/components/MarketplaceLocationsMap';
import ListingPublicDetails from '@/components/ListingPublicDetails';
import ListingDetailLayout from '@/components/ListingDetailLayout';
import { Button } from '@/components/ui';
import {
  catalogueItemToMapMarker,
  formatLocationLine,
  formatQuotaLabel,
  serviceMobilityLabel,
  serviceToCatalogueItem,
  isServiceRentalCategory,
  type PublicService,
} from '@/lib/marketplace';
import type { MarketplaceFormTab } from '@/components/MarketplaceFormTabs';
import { MapPin, Navigation, Sparkles, KeyRound } from 'lucide-react';

export default function MarketplaceServiceDetailPage() {
  const params = useParams();
  const pathname = usePathname();
  const slug = params.slug as string;
  const mapRef = useRef<MarketplaceMapHandle>(null);
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
      try {
        const data = await api.get(`/public/services/${encodeURIComponent(slug)}`);
        setService(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Prestation introuvable.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const startRoute = (itemId: string) => {
    setWantRoute(true);
    setTab('map');
    window.setTimeout(() => mapRef.current?.startDirectionsFor(itemId), 80);
  };

  const item = service ? serviceToCatalogueItem(service) : null;
  const quotaLabel = service ? formatQuotaLabel(service.quotaMin, service.quotaMax) : null;
  const isRental = pathname.includes('/locations') || isServiceRentalCategory(service?.category);

  return (
    <PublicPageShell faqHref="/faq" mobileFooterPad>
      <ListingDetailLayout
        backHref={isRental ? '/marketplace/locations' : '/marketplace/prestataires'}
        backLabel={isRental ? 'Toutes les locations' : 'Tous les prestataires'}
        loading={loading}
        error={error || (!loading && !service ? (isRental ? 'Location introuvable.' : 'Prestation introuvable.') : '')}
        errorIcon={isRental ? <KeyRound className="w-10 h-10 text-muted mx-auto mb-3" /> : <Sparkles className="w-10 h-10 text-muted mx-auto mb-3" />}
        errorMessage={isRental ? 'Location introuvable.' : 'Prestation introuvable.'}
        heroUrl={service?.photos[0]}
        fallbackIcon={isRental ? <KeyRound className="w-12 h-12" /> : <Sparkles className="w-12 h-12" />}
        chip={service?.categoryLabel || ''}
        title={service?.title || ''}
        subtitle={service?.orgName || ''}
        shareKind={isRental ? 'rental' : 'service'}
        shareSlug={service?.slug}
        photos={service?.photos || []}
        photoIndex={photoIndex}
        onPhotoIndex={setPhotoIndex}
        tab={tab}
        onTab={setTab}
        priceFromFc={service?.priceFromFc ?? null}
        priceUnitLabel={service?.priceUnitLabel}
        quotaLabel={quotaLabel}
        details={service && item ? (
          <div className="space-y-5">
            <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {formatLocationLine(service) && (
                <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-2 min-h-9 rounded-[var(--radius-button)] bg-surface-muted border border-border text-xs text-muted whitespace-nowrap">
                  <MapPin className="w-3.5 h-3.5" />
                  {formatLocationLine(service)}
                  {` · ${serviceMobilityLabel(service.travels ?? Boolean(service.coverageRadiusKm), service.coverageRadiusKm)}`}
                </span>
              )}
              {quotaLabel && (
                <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-2 min-h-9 rounded-[var(--radius-button)] bg-surface-muted border border-border text-xs text-muted whitespace-nowrap">
                  {quotaLabel}
                </span>
              )}
              {service.latitude != null && service.longitude != null && (
                <button
                  type="button"
                  onClick={() => startRoute(item.id)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 min-h-9 rounded-[var(--radius-button)] bg-primary text-white text-xs font-semibold hover:opacity-95"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Itinéraire
                </button>
              )}
            </div>
            {service.description && (
              <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{service.description}</p>
            )}
            <ListingPublicDetails details={service.details} kind="service" />
            <AvailabilityCalendar
              title="Calendrier des disponibilités"
              bookedDates={service.bookedDates}
              blockedDates={service.blockedDates}
              selectedDate={pickedDate}
              selectedEndDate={pickedEndDate}
              onSelectRange={(from, to) => {
                setPickedDate(from);
                setPickedEndDate(to);
              }}
            />
          </div>
        ) : null}
        map={service && item ? (
          service.latitude != null && service.longitude != null ? (
            <div className="rounded-[var(--radius-card)] border border-border overflow-hidden bg-surface shadow-[var(--shadow-soft)]">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 border-b border-border">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Mode itinéraire</p>
                  <p className="text-xs text-muted">
                    Une voix féminine lit le guidage. Autorisez la localisation, ou cliquez la carte pour le départ.
                  </p>
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
                  Démarrer
                </Button>
              </div>
              <div className="h-[16.5rem] sm:h-[26.25rem]">
                <MarketplaceLocationsMap
                  ref={mapRef}
                  markers={[catalogueItemToMapMarker(item)]}
                  height="100%"
                  navigateOnClick={false}
                  autoDirections={wantRoute}
                  city={service.city}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">Aucune position n’a encore été indiquée pour cette prestation.</p>
          )
        ) : null}
        inquiry={service ? (
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
        booking={service ? (
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
    </PublicPageShell>
  );
}
