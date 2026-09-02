'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import PublicPageShell from '@/components/PublicPageShell';
import ListingDetailLayout from '@/components/ListingDetailLayout';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import type { MarketplaceMapHandle } from '@/components/MarketplaceLocationsMap';
import EventTicketCheckoutForm from '@/components/EventTicketCheckoutForm';
import ListingMapPanel from '@/components/ListingMapPanel';
import { SkeletonListingDetail } from '@/components/ui';
import {
  catalogueItemToMapMarker,
  eventToCatalogueItem,
  sizedMediaUrl,
  type PublicEventCard,
  type PublicEventPost,
} from '@/lib/marketplace';
import { eventPublicListHref } from '@/lib/safeAppPath';
import { catalogueReturnBackLabel, getCatalogueReturn } from '@/lib/catalogueQuery';
import { CLIENT_AGENDA_HREF } from '@/lib/marketplace';
import { useAuth } from '@/context/AuthContext';
import type { MarketplaceFormTab } from '@/components/MarketplaceFormTabs';
import { Ticket } from 'lucide-react';
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
              <video key={media.url} src={media.url} controls preload="metadata" className="w-full max-h-72 object-contain bg-black" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={media.url}
                src={sizedMediaUrl(media.url, 720)}
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

function MarketplaceEventDetailInner() {
  const params = useParams();
  const slug = params.slug as string;
  const { tenant, access } = useAuth();
  const isClient = tenant?.accountKind === 'CLIENT' || access?.level === 'client';
  const defaultBackHref = isClient ? CLIENT_AGENDA_HREF : eventPublicListHref();
  const returnScope = isClient ? '/dashboard' : '/marketplace';
  const [backHref, setBackHref] = useState(defaultBackHref);
  const mapRef = useRef<MarketplaceMapHandle>(null);
  const [event, setEvent] = useState<PublicEventCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [tab, setTab] = useState<MarketplaceFormTab>('details');
  const [wantRoute, setWantRoute] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    setBackHref(getCatalogueReturn(defaultBackHref, returnScope));
  }, [defaultBackHref, returnScope]);

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
    <PublicPageShell faqHref="/faq" mobileFooterPad>
      <ListingDetailLayout
        backHref={backHref}
        backLabel={catalogueReturnBackLabel(backHref)}
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
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3 max-w-prose">
            <p className="text-sm text-muted leading-relaxed">
              {[
                new Date(event.date).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' }),
                event.ticketsRemaining != null
                  ? (event.soldOut ? 'Complet' : `${event.ticketsRemaining} place${event.ticketsRemaining > 1 ? 's' : ''}`)
                  : null,
              ].filter(Boolean).join(' · ')}
              {item && event.latitude != null && event.longitude != null ? (
                <>
                  {' · '}
                  <button type="button" onClick={() => startRoute(item.id)} className="font-semibold text-primary hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-sm">
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
            </div>
            {posts.length > 0 && (
              <div className="flex flex-col gap-4">
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
            <ListingMapPanel
              mapRef={mapRef}
              marker={catalogueItemToMapMarker(item)}
              locationLine={event.location}
              wantRoute={wantRoute}
              onStartRoute={() => {
                setWantRoute(true);
                mapRef.current?.startDirectionsFor(item.id);
              }}
            />
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
