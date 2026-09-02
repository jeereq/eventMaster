'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, ExternalLink, KeyRound, Loader2, Play, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Modal, StatusPill, Alert } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import MarketplaceInquiryForm from '@/components/MarketplaceInquiryForm';
import MarketplaceBookingForm from '@/components/MarketplaceBookingForm';
import {
  dashboardServiceHref,
  dashboardVenueHref,
  formatLocationLine,
  formatQuotaLabel,
  isServiceRentalCategory,
  isVideoUrl,
  listingSrcSet,
  serviceMobilityLabel,
  sizedMediaUrl,
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
  const [reloadNonce, setReloadNonce] = useState(0);

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
  }, [target, initialView, reloadNonce]);

  const listing = venue || service;
  const rental = Boolean(service && isServiceRentalCategory(service.category));
  const kindLabel = target?.kind === 'venue' ? 'Salle' : rental ? 'Matériel & Équipements' : 'Prestataire';
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
  const followHref = eventId
    ? `/dashboard/bookings?tab=bookings&event=${encodeURIComponent(eventId)}`
    : '/dashboard/bookings?tab=bookings';

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
      ? `${formatFc(listing.priceFromFc)}${listing.priceUnitLabel ? ` · ${listing.priceUnitLabel}` : ''}`
      : 'Sur devis',
  ].filter(Boolean) as string[];

  const modalTitle =
    view === 'inquire' ? `Devis — ${title}` : view === 'book' ? `Réserver — ${title}` : title;
  const modalDescription =
    view === 'inquire'
      ? 'Le professionnel reçoit votre message. Aucune réservation n’est créée.'
      : view === 'book'
        ? 'Demande de date avec acompte hors plateforme. Le professionnel doit encore accepter.'
        : listing?.orgName || kindLabel;

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
        target ? (
          <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2 order-2 sm:order-1">
              {view !== 'details' ? (
                <Button variant="ghost" className="min-h-11" onClick={() => setView('details')}>
                  Fiche
                </Button>
              ) : selected && onRemove ? (
                <Button variant="secondary" className="min-h-11" onClick={onRemove} disabled={loading || !listing}>
                  Retirer
                </Button>
              ) : canRetain ? (
                <Button variant="secondary" className="min-h-11" onClick={retainListing} disabled={loading || !listing}>
                  Retenir
                </Button>
              ) : null}
              {pipeline?.stage === 'booking' ? (
                <Link href={followHref} className="inline-flex">
                  <Button variant="ghost" className="min-h-11">Suivre la réservation</Button>
                </Link>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex order-1 sm:order-2">
              <Button
                variant={view === 'inquire' ? 'primary' : 'secondary'}
                className="min-h-11"
                onClick={() => setView('inquire')}
                disabled={loading || Boolean(error)}
              >
                {pipeline?.stage === 'inquiry' ? 'Nouveau devis' : 'Devis'}
              </Button>
              <Button
                variant={view === 'book' ? 'primary' : 'secondary'}
                className="min-h-11"
                onClick={() => setView('book')}
                disabled={loading || !listing}
              >
                Réserver
              </Button>
            </div>
          </div>
        ) : null
      }
    >
      {loading ? (
        <div className="flex flex-col gap-3 py-2" aria-busy="true" aria-live="polite">
          <div className="aspect-[16/9] rounded-[var(--radius-card)] bg-surface-muted animate-pulse" />
          <p className="text-sm text-muted inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Chargement de la fiche…
          </p>
        </div>
      ) : error ? (
        <Alert variant="error" title="Fiche indisponible">
          <div className="space-y-3">
            <p className="break-words">{error}</p>
            <Button size="sm" className="min-h-11" onClick={() => setReloadNonce((n) => n + 1)}>
              Réessayer
            </Button>
          </div>
        </Alert>
      ) : view === 'inquire' && target ? (
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
          flush
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
          flush
          onSent={() => {
            if (!selected && canRetain) retainListing();
            onPipelineChange?.();
          }}
        />
      ) : listing ? (
        <div className="flex flex-col gap-6">
          {pipeline && pipeline.stage !== 'none' ? (
            <StatusPill tone={pipeline.tone}>{pipeline.label}</StatusPill>
          ) : null}

          <div className="flex flex-col gap-2">
          <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-surface-muted aspect-[16/9]">
            {photos[photoIndex] ? (
              isVideoUrl(photos[photoIndex]) ? (
                <video
                  src={photos[photoIndex]}
                  poster={sizedMediaUrl(photos[photoIndex], 960)}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  controls
                  preload="metadata"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sizedMediaUrl(photos[photoIndex], 960)}
                  srcSet={listingSrcSet(photos[photoIndex], [480, 720, 960])}
                  sizes="(min-width: 640px) 42rem, 100vw"
                  alt={`Visuel de ${title}`}
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted">
                <CoverFallback kind={target?.kind === 'venue' ? 'venue' : 'service'} rental={rental} />
              </div>
            )}
          </div>
          {photos.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {photos.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setPhotoIndex(index)}
                  aria-label={`Photo ${index + 1} sur ${photos.length} — ${title}`}
                  aria-pressed={index === photoIndex}
                  className={cn(
                    'relative snap-start shrink-0 w-20 min-h-11 aspect-[4/3] rounded-[var(--radius-button)] overflow-hidden border bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    index === photoIndex ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/40',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sizedMediaUrl(url, 160)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                  {isVideoUrl(url) ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                      <Play className="w-3.5 h-3.5 text-white fill-white" />
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
          </div>

          {busy ? (
            <Alert variant="warning">
              Indisponible à la date de l’événement. Vous pouvez quand même demander un devis.
            </Alert>
          ) : null}

          {(location || facts.length > 0) ? (
            <p className="text-sm text-muted leading-relaxed">
              {[location, ...facts].filter(Boolean).join(' · ')}
            </p>
          ) : null}

          {listing.description ? (
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line break-words max-w-prose">
              {listing.description}
            </p>
          ) : null}

          <Link
            href={href}
            className="inline-flex items-center gap-1.5 min-h-11 text-xs font-semibold text-primary hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-[var(--radius-button)]"
          >
            Ouvrir la fiche complète
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : null}
    </Modal>
  );
}
