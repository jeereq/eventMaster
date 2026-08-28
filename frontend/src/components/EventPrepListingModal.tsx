'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, CalendarCheck, ExternalLink, KeyRound, Loader2, MapPin, Sparkles, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Modal, StatusPill } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import ListingPublicDetails from '@/components/ListingPublicDetails';
import MarketplaceInquiryForm from '@/components/MarketplaceInquiryForm';
import MarketplaceBookingForm from '@/components/MarketplaceBookingForm';
import {
  dashboardServiceHref,
  dashboardVenueHref,
  formatLocationLine,
  formatQuotaLabel,
  isServiceRentalCategory,
  prepListingCanBook,
  serviceMobilityLabel,
  type PrepListingPipeline,
  type PublicService,
  type PublicVenue,
} from '@/lib/marketplace';
import { roomTypeLabels, type RoomType } from '@/lib/roomLayoutUtils';

export type EventPrepPreviewTarget = {
  kind: 'venue' | 'service';
  slug: string;
};

export type EventPrepListingView = 'details' | 'inquire' | 'book';

function photosOf(listing: PublicVenue | PublicService): string[] {
  const urls = [...(listing.photos || [])];
  if (listing.coverUrl && !urls.includes(listing.coverUrl)) urls.unshift(listing.coverUrl);
  return urls.filter(Boolean);
}

function CoverFallback({ kind, rental }: { kind: 'venue' | 'service'; rental: boolean }) {
  const Icon = kind === 'venue' ? Building2 : rental ? KeyRound : Sparkles;
  return <Icon className="w-10 h-10" />;
}

export default function EventPrepListingModal({
  target,
  selected,
  dateKey,
  guestCount,
  eventTitle,
  eventId,
  initialView = 'details',
  pipeline,
  onClose,
  onRetainVenue,
  onRetainService,
  onRemove,
  onPipelineChange,
}: {
  target: EventPrepPreviewTarget | null;
  selected: boolean;
  dateKey: string;
  guestCount?: number;
  eventTitle?: string;
  eventId?: string;
  initialView?: EventPrepListingView;
  pipeline?: PrepListingPipeline | null;
  onClose: () => void;
  onRetainVenue?: (venue: PublicVenue) => void;
  onRetainService?: (service: PublicService) => void;
  onRemove?: () => void;
  onPipelineChange?: () => void;
}) {
  const [view, setView] = useState<EventPrepListingView>('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [venue, setVenue] = useState<PublicVenue | null>(null);
  const [service, setService] = useState<PublicService | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    if (!target) {
      setVenue(null);
      setService(null);
      setError('');
      setView('details');
      setPhotoIndex(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    setView(initialView);
    setPhotoIndex(0);
    (async () => {
      try {
        if (target.kind === 'venue') {
          const data = (await api.get(`/public/venues/${encodeURIComponent(target.slug)}`)) as PublicVenue;
          if (!cancelled) {
            setVenue(data);
            setService(null);
          }
        } else {
          const data = (await api.get(`/public/services/${encodeURIComponent(target.slug)}`)) as PublicService;
          if (!cancelled) {
            setService(data);
            setVenue(null);
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Impossible de charger la fiche.');
          setVenue(null);
          setService(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [target, initialView]);

  const listing = venue || service;
  const rental = Boolean(service && isServiceRentalCategory(service.category));
  const kindLabel = target?.kind === 'venue' ? 'Salle' : rental ? 'Location' : 'Métier';
  const title = venue?.headline || venue?.name || service?.title || 'Fiche';
  const photos = useMemo(() => (listing ? photosOf(listing) : []), [listing]);
  const location = listing
    ? [formatLocationLine(listing), venue?.address].filter(Boolean).join(' · ')
    : '';
  const busy = Boolean(
    dateKey && listing?.unavailableDates?.some((day) => String(day).slice(0, 10) === dateKey),
  );
  const href = venue
    ? dashboardVenueHref(venue.slug)
    : service
      ? dashboardServiceHref(service.slug, service.category)
      : '#';
  const canBook = prepListingCanBook(listing?.priceFromFc, pipeline);
  const followHref = eventId
    ? `/dashboard/bookings?tab=bookings&event=${encodeURIComponent(eventId)}`
    : '/dashboard/bookings?tab=bookings';

  useEffect(() => {
    if (view === 'book' && listing && listing.priceFromFc == null) {
      setView('inquire');
    }
  }, [view, listing]);

  const facts = [
    venue?.capacity ? `${venue.capacity} places` : null,
    venue ? (roomTypeLabels[venue.roomType as RoomType] || null) : null,
    formatQuotaLabel(listing?.quotaMin, listing?.quotaMax),
    service
      ? serviceMobilityLabel(
          Boolean(service.travels ?? (service.coverageRadiusKm && service.coverageRadiusKm > 0)),
          service.coverageRadiusKm,
        )
      : null,
    listing?.priceFromFc != null
      ? `Dès ${formatFc(listing.priceFromFc)}${listing.priceUnitLabel ? ` · ${listing.priceUnitLabel}` : ''}`
      : 'Sur devis',
  ].filter(Boolean) as string[];

  const modalTitle =
    view === 'inquire' ? `Devis — ${title}` : view === 'book' ? `Réserver — ${title}` : title;
  const modalDescription =
    view === 'inquire'
      ? 'Le professionnel reçoit votre message. Aucune réservation n’est créée.'
      : view === 'book'
        ? 'Demande de date avec acompte hors plateforme. Le professionnel doit encore accepter.'
        : `${kindLabel}${listing?.orgName ? ` · ${listing.orgName}` : ''}`;

  const canRetain = Boolean(onRetainVenue || onRetainService);
  const retainListing = () => {
    if (venue) onRetainVenue?.(venue);
    else if (service) onRetainService?.(service);
  };

  return (
    <Modal
      open={Boolean(target)}
      onClose={onClose}
      size="lg"
      title={modalTitle}
      description={modalDescription}
      footer={
        listing && view === 'details' ? (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 w-full">
            {selected && onRemove ? (
              <Button variant="secondary" onClick={onRemove}>
                Retirer de la préparation
              </Button>
            ) : canRetain ? (
              <Button onClick={retainListing}>Retenir pour l’événement</Button>
            ) : null}
            {pipeline?.stage === 'booking' ? (
              <Link href={followHref} className="inline-flex">
                <Button variant="secondary">Suivre la réservation</Button>
              </Link>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setView('inquire')}>
                  {pipeline?.stage === 'inquiry' ? 'Nouveau devis' : 'Demander un devis'}
                </Button>
                {canBook ? (
                  <Button leftIcon={<CalendarCheck className="w-3.5 h-3.5" />} onClick={() => setView('book')}>
                    Réserver
                  </Button>
                ) : null}
              </>
            )}
          </div>
        ) : view === 'inquire' || view === 'book' ? (
          <Button variant="ghost" onClick={() => setView('details')}>
            Retour à la fiche
          </Button>
        ) : null
      }
    >
      {view === 'inquire' && target ? (
        <MarketplaceInquiryForm
          key={`${target.kind}:${target.slug}:inquire`}
          endpoint={
            target.kind === 'venue'
              ? `/public/venues/${encodeURIComponent(target.slug)}/inquire`
              : `/public/services/${encodeURIComponent(target.slug)}/inquire`
          }
          eventDate={dateKey || undefined}
          defaultGuestCount={guestCount && guestCount > 0 ? guestCount : undefined}
          defaultMessage={eventTitle ? `Demande pour l’événement « ${eventTitle} ».` : undefined}
          eventId={eventId}
          onSent={() => {
            if (!selected && canRetain) retainListing();
            onPipelineChange?.();
          }}
        />
      ) : view === 'book' && target && listing ? (
        <MarketplaceBookingForm
          key={`${target.kind}:${target.slug}:book`}
          listingSlug={venue?.slug}
          offeringSlug={service?.slug}
          unavailableDates={listing.unavailableDates}
          bookedDates={listing.bookedDates}
          blockedDates={listing.blockedDates}
          priceFromFc={listing.priceFromFc}
          priceUnit={listing.priceUnit}
          eventDate={dateKey || undefined}
          eventId={eventId}
          onSent={() => {
            if (!selected && canRetain) retainListing();
            onPipelineChange?.();
          }}
        />
      ) : loading ? (
        <p className="text-sm text-muted inline-flex items-center gap-2 py-8 justify-center w-full">
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement de la fiche…
        </p>
      ) : error ? (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{error}</p>
      ) : listing ? (
        <div className="space-y-4">
          {pipeline && pipeline.stage !== 'none' ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-muted/50 px-3 py-2">
              <StatusPill tone={pipeline.tone}>{pipeline.label}</StatusPill>
              {pipeline.stage === 'booking' ? (
                <Link href={followHref} className="text-xs font-semibold text-primary hover:underline">
                  Ouvrir le suivi
                </Link>
              ) : null}
            </div>
          ) : null}

          <div className="relative overflow-hidden rounded-2xl bg-surface-muted aspect-[16/9]">
            {photos[photoIndex] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photos[photoIndex]} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted">
                <CoverFallback kind={target?.kind === 'venue' ? 'venue' : 'service'} rental={rental} />
              </div>
            )}
            <span className="absolute top-3 left-3 rounded-full bg-black/60 text-white text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1">
              {kindLabel}
            </span>
          </div>
          {photos.length > 1 ? (
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {photos.slice(0, 8).map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setPhotoIndex(index)}
                  className={cn(
                    'w-14 h-12 rounded-lg overflow-hidden border shrink-0',
                    index === photoIndex ? 'border-primary ring-2 ring-primary/30' : 'border-border',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}

          {busy ? (
            <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Indisponible à la date de l’événement. Vous pouvez quand même demander un devis.
            </p>
          ) : null}

          {location ? (
            <p className="text-sm text-muted inline-flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{location}</span>
            </p>
          ) : null}

          {facts.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {facts.map((fact) => (
                <span
                  key={fact}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-foreground"
                >
                  {fact.includes('places') ? <Users className="w-3 h-3" /> : null}
                  {fact}
                </span>
              ))}
            </div>
          ) : null}

          {listing.description ? (
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
              {listing.description}
            </p>
          ) : null}

          <ListingPublicDetails
            details={listing.details}
            kind={target?.kind === 'venue' ? 'venue' : 'service'}
          />

          <Link
            href={href}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            Ouvrir la fiche complète
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : null}
    </Modal>
  );
}
