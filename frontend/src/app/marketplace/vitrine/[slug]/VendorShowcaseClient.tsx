'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowDown, ArrowLeft, Check, MapPin, Share2, Store, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
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

/** Initiales du prestataire pour son monogramme (« Studio Agenda » → « SA »). */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = (words.length > 1 ? [words[0], words[words.length - 1]] : words).map((w) => w.charAt(0));
  return letters.join('').toUpperCase() || '·';
}

/** Une offre seule s’affiche en carte large ; sinon grille de 2 ou 3 colonnes. */
function OfferGrid({ count, children }: { count: number; children: React.ReactNode }) {
  return (
    <div className={cn('grid grid-cols-1 gap-4', count === 1 ? 'lg:max-w-4xl' : 'sm:grid-cols-2 lg:grid-cols-3')}>
      {children}
    </div>
  );
}

function StatTile({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 px-3.5 py-3">
      <p className="font-display text-xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

/** Vitrine publique : toutes les salles, prestations, réalisations et avis d'un prestataire. */
export default function VendorShowcaseClient() {
  const params = useParams();
  const slug = String(params.slug || '');
  const [vendor, setVendor] = useState<PublicVendor | null>(null);
  const [rating, setRating] = useState<RatingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

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
  const offerCount = venues.length + prestations.length + rentals.length;
  // Métiers d'abord, location de matériel ensuite.
  const trades = Array.from(new Set([...prestations, ...rentals].map((s) => s.categoryLabel).filter(Boolean)));
  const maxCapacity = venues.reduce((max, v) => Math.max(max, v.capacity || 0), 0);
  const hasRating = Boolean(rating?.count && rating.average != null);

  async function share() {
    if (typeof window === 'undefined' || !vendor) return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${vendor.displayName} sur EventMaster`, url });
        return;
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Presse-papier indisponible : rien à faire, le lien reste dans la barre d’adresse.
    }
  }

  const sections = [
    offerCount ? { id: 'offres', label: 'Offres', count: offerCount } : null,
    { id: 'avis', label: 'Avis', count: rating?.count || undefined },
    { id: 'realisations', label: 'Réalisations' },
  ].filter(Boolean) as Array<{ id: string; label: string; count?: number }>;

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
          <div className="space-y-6" role="status" aria-label="Chargement de la vitrine">
            <Skeleton className="h-64 w-full rounded-[1.75rem]" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <header className="relative overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-[var(--shadow-soft)]">
              <div aria-hidden className="h-24 bg-gradient-to-b from-primary/25 via-primary/10 to-transparent sm:h-28" />
              <div className="space-y-5 px-5 pb-6 sm:px-8 sm:pb-8">
                <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
                    <span
                      aria-hidden
                      className="inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary-solid font-display text-2xl font-semibold text-primary-foreground shadow-[var(--shadow-soft)] ring-4 ring-surface sm:h-24 sm:w-24 sm:text-3xl"
                    >
                      {initialsOf(vendor.displayName)}
                    </span>
                    <div className="min-w-0 space-y-1.5">
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
                        {maxCapacity > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-4 w-4" aria-hidden />
                            Jusqu’à {maxCapacity.toLocaleString('fr-FR')} invités
                          </span>
                        ) : null}
                        {hasRating ? (
                          <a href="#avis" className="inline-flex items-center gap-1.5 hover:text-foreground">
                            <ReviewStars rating={rating!.average!} />
                            {ratingLabel(rating)}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 min-[420px]:flex-row">
                    {offerCount ? (
                      <Button href="#offres" leftIcon={<ArrowDown className="h-4 w-4" aria-hidden />}>
                        Voir les offres
                      </Button>
                    ) : null}
                    <Button
                      variant="secondary"
                      onClick={() => void share()}
                      leftIcon={copied ? <Check className="h-4 w-4 text-primary" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />}
                      aria-live="polite"
                    >
                      {copied ? 'Lien copié' : 'Partager'}
                    </Button>
                  </div>
                </div>

                {vendor.bio ? <p className="max-w-3xl whitespace-pre-line text-sm leading-relaxed text-foreground/85">{vendor.bio}</p> : null}

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                  {venues.length ? <StatTile value={venues.length} label={venues.length > 1 ? 'Salles' : 'Salle'} /> : null}
                  {prestations.length ? <StatTile value={prestations.length} label={prestations.length > 1 ? 'Prestations' : 'Prestation'} /> : null}
                  {rentals.length ? <StatTile value={rentals.length} label="Matériel à louer" /> : null}
                  <StatTile
                    value={hasRating ? `${rating!.average!.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}/5` : 'Nouveau'}
                    label={hasRating ? `${rating!.count} avis vérifiés` : 'Pas encore d’avis'}
                  />
                </div>
              </div>
            </header>

            <nav
              aria-label="Sections de la vitrine"
              className="sticky top-[var(--em-site-header)] z-20 -mx-4 border-b border-border bg-background/90 px-4 backdrop-blur-md sm:-mx-6 sm:px-6"
            >
              <ul className="flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold text-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    >
                      {s.label}
                      {s.count ? <span className="text-xs font-medium tabular-nums text-primary">{s.count}</span> : null}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {offerCount ? (
              <div id="offres" className="scroll-mt-32 space-y-10">
                {venues.length ? (
                  <RelatedOffersSection title="Salles" count={venues.length} prominent>
                    <OfferGrid count={venues.length}>
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
                          wide={venues.length === 1}
                        />
                      ))}
                    </OfferGrid>
                  </RelatedOffersSection>
                ) : null}

                {prestations.length ? (
                  <RelatedOffersSection title="Prestations" count={prestations.length} prominent>
                    <OfferGrid count={prestations.length}>
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
                          wide={prestations.length === 1}
                        />
                      ))}
                    </OfferGrid>
                  </RelatedOffersSection>
                ) : null}

                {rentals.length ? (
                  <RelatedOffersSection title="Matériel & équipements" count={rentals.length} prominent>
                    <OfferGrid count={rentals.length}>
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
                          wide={rentals.length === 1}
                        />
                      ))}
                    </OfferGrid>
                  </RelatedOffersSection>
                ) : null}
              </div>
            ) : (
              <EmptyState
                icon={<Store className="h-7 w-7" />}
                title="Aucune offre publiée pour le moment"
                description={`${vendor.displayName} n’a pas encore mis de salle ni de prestation en ligne. Revenez bientôt ou parcourez le catalogue.`}
                action={<Button href="/marketplace" variant="secondary">Parcourir le catalogue</Button>}
              />
            )}

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-8">
              <ListingReviews kind="vendor" slug={vendor.slug} vendorName={vendor.displayName} showSubject prominent id="avis" />
              <section id="realisations" aria-labelledby="realisations-title" className="scroll-mt-32 space-y-3">
                <h2 id="realisations-title" className="font-display text-lg font-semibold text-foreground sm:text-xl">
                  Réalisations
                </h2>
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
