'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import ListingDetailLayout from '@/components/ListingDetailLayout';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import MarketplaceLocationsMap, { type MarketplaceMapHandle } from '@/components/MarketplaceLocationsMap';
import EventTicketCheckoutForm from '@/components/EventTicketCheckoutForm';
import { Button } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import {
  catalogueItemToMapMarker,
  CLIENT_AGENDA_HREF,
  eventToCatalogueItem,
  type PublicEventCard,
  type PublicEventPost,
} from '@/lib/marketplace';
import { catalogueReturnBackLabel, getCatalogueReturn } from '@/lib/catalogueQuery';
import type { MarketplaceFormTab } from '@/components/MarketplaceFormTabs';
import { Navigation, Ticket } from 'lucide-react';
import { cn } from '@/lib/cn';

function eventDateKey(iso: string) {
  return String(iso || '').slice(0, 10);
}

function PublicFeedPost({ post }: { post: PublicEventPost }) {
  return (
    <article className="rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        {new Date(post.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
      </p>
      {post.content && <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{post.content}</p>}
      {post.media.length > 0 && (
        <div className={cn('grid gap-1 rounded-[var(--radius-button)] overflow-hidden', post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
          {post.media.map((media, mIdx) =>
            media.type === 'VIDEO' ? (
              <video key={media.url} src={media.url} controls className="w-full max-h-72 object-contain bg-black" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={media.url}
                src={media.url}
                alt={`Média publication ${mIdx + 1}`}
                loading="lazy"
                decoding="async"
                className="w-full max-h-72 object-cover"
              />
            ),
          )}
        </div>
      )}
    </article>
  );
}

export default function DashboardEventDetail() {
  const params = useParams();
  const slug = params.slug as string;
  const mapRef = useRef<MarketplaceMapHandle>(null);
  const [event, setEvent] = useState<PublicEventCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [tab, setTab] = useState<MarketplaceFormTab>('details');
  const [wantRoute, setWantRoute] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const defaultBackHref = CLIENT_AGENDA_HREF;
  const [backHref, setBackHref] = useState(defaultBackHref);

  useEffect(() => {
    setBackHref(getCatalogueReturn(defaultBackHref, '/dashboard'));
  }, [defaultBackHref]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) return;
      setLoading(true);
      setError('');
      try {
        const data = await api.get(`/public/events/${encodeURIComponent(slug)}`);
        if (!cancelled) setEvent(data.event);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Événement introuvable.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug, reloadNonce]);

  const item = event ? eventToCatalogueItem(event) : null;
  const photos = event?.photos?.filter(Boolean) || [];
  const posts = event?.posts || [];
  const heroUrl = event?.coverUrl || photos[0] || null;

  const startRoute = (itemId: string) => {
    setWantRoute(true);
    setTab('map');
    window.setTimeout(() => mapRef.current?.startDirectionsFor(itemId), 80);
  };

  return (
    <ListingDetailLayout
      backHref={backHref}
      backLabel={catalogueReturnBackLabel(backHref)}
      embedded
      loading={loading}
      error={error || (!loading && !event ? 'Événement introuvable ou privé.' : '')}
      errorIcon={<Ticket className="w-10 h-10 text-muted mx-auto mb-3" />}
      errorMessage="Événement introuvable ou privé."
      onRetry={() => setReloadNonce((n) => n + 1)}
      heroUrl={heroUrl}
      fallbackIcon={<Ticket className="w-12 h-12" />}
      chip={event?.orgName || 'Événement'}
      title={event?.title || ''}
      subtitle={event?.location || ''}
      shareKind="event"
      shareSlug={event?.slug ?? undefined}
      photos={photos}
      photoIndex={photoIndex}
      onPhotoIndex={setPhotoIndex}
      tab={tab}
      onTab={setTab}
      priceFromFc={event?.paid ? event.ticketPriceFc : null}
      priceUnitLabel={event?.paid ? '/ personne' : null}
      priceCaption={event && !event.paid ? 'Entrée libre' : undefined}
      hideBooking
      inquireLabel={event?.paid ? 'Billet' : 'S’inscrire'}
      details={event ? (
        <div className="space-y-6">
          <p className="text-sm text-muted leading-relaxed">
            {[
              new Date(event.date).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' }),
              event.location,
              event.ticketsRemaining != null
                ? (event.soldOut ? 'Complet' : `${event.ticketsRemaining} place${event.ticketsRemaining > 1 ? 's' : ''}`)
                : null,
            ].filter(Boolean).join(' · ')}
            {item && event.latitude != null && event.longitude != null ? (
              <>
                {' · '}
                <button type="button" onClick={() => startRoute(item.id)} className="font-semibold text-primary hover:underline">
                  Itinéraire
                </button>
              </>
            ) : null}
          </p>
          {event.description ? (
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{event.description}</p>
          ) : (
            <p className="text-sm text-muted">Inscription ouverte au public.</p>
          )}
          <p className="text-sm text-muted">
            {event.paid
              ? `Billet : ${formatFc(event.ticketPriceFc)} · paiement en ligne (carte).`
              : 'Entrée libre : inscrivez-vous pour recevoir votre badge QR.'}
          </p>
          {posts.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-foreground text-sm">Actualités</h2>
              {posts.map((post) => (
                <PublicFeedPost key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      ) : null}
      availability={event ? (
        <AvailabilityCalendar
          compact
          title="Date de l’événement"
          selectedDate={eventDateKey(event.date)}
          minDate="1970-01-01"
        />
      ) : null}
      map={event && item ? (
        event.latitude != null && event.longitude != null ? (
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
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Aucune position n’a encore été indiquée pour cet événement.</p>
        )
      ) : null}
      inquiry={event ? (
        <Suspense fallback={<div className="border border-border rounded-[var(--radius-card)] p-5 bg-surface h-48 animate-pulse" />}>
          <EventTicketCheckoutForm event={event} />
        </Suspense>
      ) : null}
    />
  );
}
