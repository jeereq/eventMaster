'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, MapPin, Store } from 'lucide-react';
import { api } from '@/lib/api';
import PublicPageShell from '@/components/PublicPageShell';
import { Button, EmptyState, Skeleton } from '@/components/ui';
import MarketplaceActivityFeed from '@/components/marketplace/MarketplaceActivityFeed';
import ListingReviews from '@/components/marketplace/ListingReviews';
import { ReviewStars } from '@/components/marketplace/ReviewStars';
import {
  RelatedOfferCard,
  RelatedOffersSection,
  relatedServiceHref,
  relatedVenueHref,
  splitRelatedServices,
} from '@/components/marketplace/ListingRelatedOffers';
import { ratingLabel, type RatingSummary } from '@/lib/marketplaceReviews';
import type { PublicService, PublicVenue } from '@/lib/marketplace';

type PublicVendor = {
  id: string;
  slug: string;
  displayName: string;
  city: string | null;
  bio: string | null;
  services: PublicService[];
  venues: PublicVenue[];
};

/** Vitrine publique : toutes les salles, prestations, réalisations et avis d'un prestataire. */
export default function VendorShowcaseClient() {
  const params = useParams();
  const slug = String(params.slug || '');
  const [vendor, setVendor] = useState<PublicVendor | null>(null);
  const [rating, setRating] = useState<RatingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!slug) return;
      setLoading(true);
      setError('');
      try {
        const [data, reviews] = await Promise.all([
          api.get(`/public/vendors/${encodeURIComponent(slug)}`),
          api.get(`/public/reviews?kind=vendor&slug=${encodeURIComponent(slug)}`).catch(() => null),
        ]);
        if (cancelled) return;
        setVendor(data as PublicVendor);
        setRating((reviews as { summary?: RatingSummary } | null)?.summary ?? null);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Prestataire introuvable.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const { prestations, rentals } = splitRelatedServices(vendor?.services);
  const venues = vendor?.venues || [];
  // Métiers d'abord, location de matériel ensuite.
  const trades = Array.from(new Set([...prestations, ...rentals].map((s) => s.categoryLabel).filter(Boolean)));
  const grid = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <PublicPageShell faqHref="/faq" mobileFooterPad>
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/marketplace"
          className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-[var(--radius-button)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Tout le catalogue
        </Link>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 max-w-full" />
            <div className={grid}>
              {[0, 1, 2].map((n) => <Skeleton key={n} className="h-64" />)}
            </div>
          </div>
        ) : error || !vendor ? (
          <EmptyState
            icon={<Store className="h-7 w-7" />}
            title="Prestataire introuvable"
            description={error || 'Cette vitrine n’existe pas ou n’est plus en ligne.'}
            action={<Button href="/marketplace">Voir le catalogue</Button>}
          />
        ) : (
          <>
            <header className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {trades.length ? trades.slice(0, 3).join(' · ') : venues.length ? 'Salle de réception' : 'Prestataire'}
              </p>
              <h1 className="font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
                {vendor.displayName}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                {vendor.city ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4" aria-hidden />
                    {vendor.city}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  {rating?.average != null ? <ReviewStars rating={rating.average} /> : null}
                  {ratingLabel(rating)}
                </span>
              </div>
              {vendor.bio ? <p className="max-w-3xl whitespace-pre-line text-sm text-foreground/85">{vendor.bio}</p> : null}
            </header>

            {venues.length ? (
              <RelatedOffersSection title={`Salles (${venues.length})`}>
                <div className={grid}>
                  {venues.map((venue) => (
                    <RelatedOfferCard
                      key={venue.slug}
                      href={relatedVenueHref(venue)}
                      cover={venue.photos?.[0] || venue.coverUrl}
                      title={venue.headline || venue.name}
                      meta={[venue.capacity ? `${venue.capacity} places` : null, venue.commune, venue.city].filter(Boolean).join(' · ')}
                      priceFromFc={venue.priceFromFc}
                      priceUnitLabel={venue.priceUnitLabel}
                      kind="venue"
                      cta="Voir la salle"
                    />
                  ))}
                </div>
              </RelatedOffersSection>
            ) : null}

            {prestations.length ? (
              <RelatedOffersSection title={`Prestations (${prestations.length})`}>
                <div className={grid}>
                  {prestations.map((srv) => (
                    <RelatedOfferCard
                      key={srv.slug}
                      href={relatedServiceHref(srv)}
                      cover={srv.photos?.[0] || srv.coverUrl}
                      title={srv.title}
                      meta={[srv.categoryLabel, srv.commune, srv.city].filter(Boolean).join(' · ')}
                      priceFromFc={srv.promoActive && srv.promoPriceFc != null ? srv.promoPriceFc : srv.priceFromFc}
                      priceUnitLabel={srv.priceUnitLabel}
                      kind="service"
                      cta="Voir l’offre"
                    />
                  ))}
                </div>
              </RelatedOffersSection>
            ) : null}

            {rentals.length ? (
              <RelatedOffersSection title={`Matériel & équipements (${rentals.length})`}>
                <div className={grid}>
                  {rentals.map((srv) => (
                    <RelatedOfferCard
                      key={srv.slug}
                      href={relatedServiceHref(srv)}
                      cover={srv.photos?.[0] || srv.coverUrl}
                      title={srv.title}
                      meta={[srv.categoryLabel, srv.commune, srv.city].filter(Boolean).join(' · ')}
                      priceFromFc={srv.promoActive && srv.promoPriceFc != null ? srv.promoPriceFc : srv.priceFromFc}
                      priceUnitLabel={srv.priceUnitLabel}
                      kind="rental"
                      cta="Voir le matériel"
                    />
                  ))}
                </div>
              </RelatedOffersSection>
            ) : null}

            {!venues.length && !prestations.length && !rentals.length ? (
              <p className="text-sm text-muted">Aucune offre publiée pour le moment.</p>
            ) : null}

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <ListingReviews kind="vendor" slug={vendor.slug} vendorName={vendor.displayName} showSubject />
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-foreground">Réalisations</h2>
                <MarketplaceActivityFeed
                  scope={{ kind: 'vendor', slug: vendor.slug }}
                  authorLabel={vendor.displayName}
                />
              </section>
            </div>
          </>
        )}
      </div>
    </PublicPageShell>
  );
}
