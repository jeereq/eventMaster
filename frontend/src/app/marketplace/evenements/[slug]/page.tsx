'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import PublicPageShell from '@/components/PublicPageShell';
import ListingDetailLayout from '@/components/ListingDetailLayout';
import MarketplaceLocationsMap, { type MarketplaceMapHandle } from '@/components/MarketplaceLocationsMap';
import EventTicketCheckoutForm from '@/components/EventTicketCheckoutForm';
import { Button, SkeletonListingDetail } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import {
  catalogueItemToMapMarker,
  eventToCatalogueItem,
  type PublicEventCard,
  type PublicEventPost,
} from '@/lib/marketplace';
import { eventPublicListHref } from '@/lib/safeAppPath';
import type { MarketplaceFormTab } from '@/components/MarketplaceFormTabs';
import { Calendar, MapPin, Navigation, Rss, Ticket } from 'lucide-react';
import { cn } from '@/lib/cn';

function PublicFeedPost({ post }: { post: PublicEventPost }) {
  return (
    <article className="rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        {new Date(post.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
      </p>
      {post.content && <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{post.content}</p>}
      {post.media.length > 0 && (
        <div className={cn('grid gap-1 rounded-[var(--radius-button)] overflow-hidden', post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
          {post.media.map((media) =>
            media.type === 'VIDEO' ? (
              <video key={media.url} src={media.url} controls className="w-full max-h-72 object-contain bg-black" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={media.url} src={media.url} alt="" className="w-full max-h-72 object-cover" />
            ),
          )}
        </div>
      )}
    </article>
  );
}

function MarketplaceEventDetailInner() {
  const params = useParams();
  const slug = params.slug as string;
  const mapRef = useRef<MarketplaceMapHandle>(null);
  const [event, setEvent] = useState<PublicEventCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [tab, setTab] = useState<MarketplaceFormTab>('details');
  const [wantRoute, setWantRoute] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) return;
      setLoading(true);
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
  }, [slug]);

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
    <PublicPageShell faqHref="/faq" mobileFooterPad>
      <ListingDetailLayout
        backHref={eventPublicListHref()}
        backLabel="Tous les événements"
        loading={loading}
        error={error || (!loading && !event ? 'Événement introuvable ou privé.' : '')}
        errorIcon={<Ticket className="w-10 h-10 text-muted mx-auto mb-3" />}
        errorMessage="Événement introuvable ou privé."
        heroUrl={heroUrl}
        fallbackIcon={<Ticket className="w-12 h-12" />}
        chip={event?.orgName || 'Événement'}
        title={event?.title || ''}
        subtitle={event?.location || ''}
        shareKind="event"
        shareSlug={event?.slug}
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
          <div className="space-y-5">
            <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-2 min-h-9 rounded-[var(--radius-button)] bg-surface-muted border border-border text-xs text-muted whitespace-nowrap">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(event.date).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}
              </span>
              {event.location ? (
                <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-2 min-h-9 rounded-[var(--radius-button)] bg-surface-muted border border-border text-xs text-muted whitespace-nowrap">
                  <MapPin className="w-3.5 h-3.5" /> {event.location}
                </span>
              ) : null}
              {event.ticketsRemaining != null ? (
                <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-2 min-h-9 rounded-[var(--radius-button)] bg-surface-muted border border-border text-xs text-muted whitespace-nowrap">
                  {event.soldOut ? 'Complet' : `${event.ticketsRemaining} place${event.ticketsRemaining > 1 ? 's' : ''}`}
                </span>
              ) : null}
              {item && event.latitude != null && event.longitude != null && (
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
            {event.description ? (
              <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{event.description}</p>
            ) : (
              <p className="text-sm text-muted">Inscription ouverte au public.</p>
            )}
            <p className="text-sm text-muted">
              {event.paid
                ? `Billet : ${formatFc(event.ticketPriceFc)} · paiement en ligne (carte).`
                : 'Entrée libre : inscrivez-vous pour recevoir votre badge QR.'}
            </p>
            {posts.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold text-foreground inline-flex items-center gap-2 text-sm">
                  <Rss className="w-4 h-4" />
                  Actualités
                </h2>
                {posts.map((post) => (
                  <PublicFeedPost key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
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
    </PublicPageShell>
  );
}

export default function MarketplaceEventDetailPage() {
  return (
    <Suspense
      fallback={
        <PublicPageShell faqHref="/faq" mobileFooterPad>
          <main className="page-container pt-4 pb-24 sm:pt-8 lg:py-10">
            <SkeletonListingDetail />
          </main>
        </PublicPageShell>
      }
    >
      <MarketplaceEventDetailInner />
    </Suspense>
  );
}
