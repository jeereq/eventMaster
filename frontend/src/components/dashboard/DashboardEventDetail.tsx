'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import ListingDetailLayout from '@/components/ListingDetailLayout';
import type { MarketplaceMapHandle } from '@/components/MarketplaceLocationsMap';
import EventTicketCheckoutForm from '@/components/EventTicketCheckoutForm';
import ListingMapPanel from '@/components/ListingMapPanel';
import EventDetailOverview from '@/components/marketplace/EventDetailOverview';
import {
  catalogueItemToMapMarker,
  CLIENT_AGENDA_HREF,
  eventToCatalogueItem,
  sizedMediaUrl,
  type PublicEventCard,
  type PublicEventPost,
} from '@/lib/marketplace';
import { catalogueReturnBackLabel, getCatalogueReturn } from '@/lib/catalogueQuery';
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
  const [paymentInProgress, setPaymentInProgress] = useState(false);
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

  const scrollToCheckout = (modeTab?: 'ticket' | 'donation') => {
    const el = document.getElementById('listing-contact');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    if (modeTab === 'donation') {
      const donationTabBtn = document.getElementById('checkout-tab-donation');
      donationTabBtn?.click();
    } else if (modeTab === 'ticket') {
      const ticketTabBtn = document.getElementById('checkout-tab-ticket');
      ticketTabBtn?.click();
    }
  };

  const hasDonations = Boolean(event?.donations && event.donations.enabled);
  const inquireLabel = (() => {
    if (event?.soldOut) return 'Complet';
    if (!event?.ticketingEnabled && hasDonations) return 'Faire un don solidaire';
    if (event?.ticketingEnabled && hasDonations) return 'Billet / Don';
    if (event?.paid) return 'Payer le billet';
    return 'Prendre mon billet';
  })();

  const formattedEventDate = event?.date
    ? new Date(event.date).toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';
  const heroSubtitle = [formattedEventDate, event?.location].filter(Boolean).join(' · ');

  return (
    <ListingDetailLayout
      backHref={backHref}
      backLabel={catalogueReturnBackLabel(backHref)}
      embedded
      paymentInProgress={paymentInProgress}
      loading={loading}
      error={error || (!loading && !event ? 'Événement introuvable ou privé.' : '')}
      errorIcon={<Ticket className="w-10 h-10 text-muted mx-auto mb-3" />}
      errorMessage="Événement introuvable ou privé."
      onRetry={() => setReloadNonce((n) => n + 1)}
      heroUrl={heroUrl}
      fallbackIcon={<Ticket className="w-12 h-12" />}
      chip={event?.orgName || 'Événement'}
      title={event?.title || ''}
      subtitle={heroSubtitle}
      shareKind="event"
      shareSlug={event?.slug ?? undefined}
      photos={photos}
      photoIndex={photoIndex}
      onPhotoIndex={setPhotoIndex}
      tab={tab}
      onTab={setTab}
      priceFromFc={event?.paid ? event.ticketPriceFc : null}
      priceUnitLabel={event?.paid ? '/ personne' : null}
      priceCaption={event && !event.paid ? (hasDonations ? 'Entrée libre & Dons' : 'Entrée libre') : undefined}
      hideBooking
      listingKind="event"
      inquireLabel={inquireLabel}
      details={event ? (
        <EventDetailOverview
          event={event}
          onStartRoute={item ? () => startRoute(item.id) : undefined}
          onGoToCheckout={scrollToCheckout}
          posts={posts}
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
          <EventTicketCheckoutForm event={event} onPaymentActivityChange={setPaymentInProgress} />
        </Suspense>
      ) : null}
    />
  );
}
