'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Modal, Skeleton, SkeletonListingDetail } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import { getCatalogueReturn, isCatalogueListPath } from '@/lib/catalogueQuery';
import { isVideoUrl, listingSrcSet, sizedMediaUrl, type MarketplaceActivityPreviewItem, type PublicService, type PublicVenue } from '@/lib/marketplace';
import MarketplaceFormTabs, { type MarketplaceFormTab } from '@/components/MarketplaceFormTabs';
import { ArrowLeft, Play, Sparkles, Building2, ArrowRight, MapPin, Users } from 'lucide-react';
import ShareButton from '@/components/ShareButton';
import { listingPublicUrl, listingShareTitle } from '@/lib/share';
import ListingActivityHighlights from '@/components/marketplace/ListingActivityHighlights';

function ListingPhotoThumbs({
  photos,
  photoIndex,
  onPhotoIndex,
  listingTitle,
}: {
  photos: string[];
  photoIndex: number;
  onPhotoIndex: (index: number) => void;
  listingTitle: string;
}) {
  if (photos.length < 2) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
      {photos.map((url, i) => (
        <button
          key={url}
          type="button"
          onClick={() => onPhotoIndex(i)}
          aria-label={`Photo ${i + 1} sur ${photos.length}${listingTitle ? ` — ${listingTitle}` : ''}`}
          aria-pressed={i === photoIndex}
          className={cn(
            'relative snap-start shrink-0 w-20 min-h-11 sm:w-28 aspect-[4/3] rounded-[var(--radius-button)] overflow-hidden border bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            i === photoIndex ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/40',
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sizedMediaUrl(url, 160)}
            srcSet={listingSrcSet(url, [160, 280])}
            sizes="80px"
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
          {isVideoUrl(url) && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/35">
              <Play className="w-3.5 h-3.5 text-white fill-white" />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export default function ListingDetailLayout({
  backHref,
  backLabel,
  loading,
  error,
  errorIcon,
  errorMessage,
  heroUrl,
  fallbackIcon,
  chip,
  title,
  subtitle,
  photos,
  photoIndex,
  onPhotoIndex,
  tab,
  onTab,
  details,
  map,
  activity,
  activityPreview,
  activityCount,
  priceFromFc,
  priceUnitLabel,
  quotaLabel,
  inquiry,
  booking,
  relationStatus,
  availability,
  preview,
  embedded,
  heroAction,
  inquireLabel = 'Devis',
  bookLabel = 'Réserver',
  hideBooking = false,
  priceCaption,
  shareUrl,
  shareSlug,
  shareKind = 'venue',
  relatedServices,
  relatedVenues,
  onRetry,
}: {
  backHref: string;
  backLabel: string;
  loading: boolean;
  error?: string;
  errorIcon: React.ReactNode;
  errorMessage: string;
  heroUrl?: string | null;
  fallbackIcon: React.ReactNode;
  chip: string;
  title: string;
  subtitle: string;
  photos: string[];
  photoIndex: number;
  onPhotoIndex: (index: number) => void;
  tab: MarketplaceFormTab;
  onTab: (tab: MarketplaceFormTab) => void;
  details: React.ReactNode;
  map: React.ReactNode;
  activity?: React.ReactNode;
  activityPreview?: MarketplaceActivityPreviewItem[] | null;
  activityCount?: number;
  relatedServices?: PublicService[];
  relatedVenues?: PublicVenue[];
  priceFromFc: number | null;
  priceUnitLabel?: string | null;
  quotaLabel?: string | null;
  inquiry?: React.ReactNode;
  booking?: React.ReactNode;
  relationStatus?: React.ReactNode;
  /** Calendrier collé aux CTA devis / réservation (colonne contact). */
  availability?: React.ReactNode;
  preview?: boolean;
  /** Dans le dashboard : pas de second `main.page-container`. */
  embedded?: boolean;
  heroAction?: React.ReactNode;
  inquireLabel?: string;
  bookLabel?: string;
  hideBooking?: boolean;
  priceCaption?: string;
  shareUrl?: string;
  shareSlug?: string;
  shareKind?: 'venue' | 'service' | 'event' | 'rental';
  onRetry?: () => void;
}) {
  const router = useRouter();
  const [mobileAction, setMobileAction] = useState<'inquire' | 'book'>('inquire');
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const shareHref = shareUrl || (shareSlug ? listingPublicUrl(shareKind, shareSlug) : undefined);
  const priceLabel = priceCaption ?? (priceFromFc != null ? formatFc(priceFromFc) : 'Sur devis');
  const showCommerce = !preview && Boolean(inquiry || booking);
  const showBooking = Boolean(booking) && !hideBooking;
  const returnScope = backHref.startsWith('/dashboard') ? '/dashboard' : '/marketplace';

  const goBack = (e: React.MouseEvent) => {
    e.preventDefault();
    const stored = getCatalogueReturn(backHref, returnScope);
    const storedPath = stored.split('?')[0] || stored;
    const fallbackPath = backHref.split('?')[0] || backHref;
    const storedIsList = isCatalogueListPath(storedPath) && stored.startsWith(returnScope);
    const storedHasState = stored.includes('?') || storedPath !== fallbackPath;

    if (storedIsList && (storedHasState || stored !== backHref)) {
      router.push(stored);
      return;
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      try {
        const ref = document.referrer ? new URL(document.referrer) : null;
        if (
          ref
          && ref.origin === window.location.origin
          && isCatalogueListPath(ref.pathname)
          && ref.pathname.startsWith(returnScope)
        ) {
          router.back();
          return;
        }
      } catch {
        /* ignore */
      }
    }
    router.push(stored);
  };

  const openMobileCommerce = (action: 'inquire' | 'book') => {
    setMobileAction(action);
    setMobileModalOpen(true);
  };

  const scrollToContact = (action: 'inquire' | 'book') => {
    setMobileAction(action);
    const reduceMotion = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('listing-contact')?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  const priceBlock = (
    <div className="space-y-1">
      <p className="text-2xl font-semibold text-foreground tracking-tight tabular-nums">{priceLabel}</p>
      {priceUnitLabel ? <p className="text-xs text-muted">{priceUnitLabel}</p> : null}
      {quotaLabel ? <p className="text-xs text-muted">{quotaLabel}</p> : null}
    </div>
  );

  const heroSrc = (photoIndex > 0 && photos[photoIndex]) || heroUrl || photos[0] || null;
  const viewTab = tab === 'medias' ? 'details' : tab;
  const showActivity = Boolean(activity);
  const hasRelatedServices = Boolean(relatedServices && relatedServices.length > 0);
  const hasRelatedVenues = Boolean(relatedVenues && relatedVenues.length > 0);

  const tabInclude: MarketplaceFormTab[] = [
    'details',
    ...(hasRelatedServices ? ['services' as const] : []),
    ...(hasRelatedVenues ? ['venues' as const] : []),
    ...(showActivity ? ['activity' as const] : []),
    'map',
  ];

  const resolvedActivityCount = activityCount ?? (activityPreview ? activityPreview.length : undefined);
  const tabBadges: Partial<Record<MarketplaceFormTab, number | string>> = {
    ...(hasRelatedServices ? { services: relatedServices!.length } : {}),
    ...(hasRelatedVenues ? { venues: relatedVenues!.length } : {}),
    ...(resolvedActivityCount != null && resolvedActivityCount > 0 ? { activity: resolvedActivityCount } : {}),
  };

  const isWideTab = viewTab === 'map' || viewTab === 'activity' || viewTab === 'services' || viewTab === 'venues';

  const servicesPanel = (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>Prestations & Métiers ({relatedServices?.length || 0})</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted">
            Découvrez toutes les offres et spécialités proposées par {subtitle || title || 'ce prestataire'}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {relatedServices?.map((srv) => {
          const cover = srv.photos?.[0] || srv.coverUrl;
          const href = srv.category?.startsWith('RENTAL_')
            ? (embedded ? `/dashboard/catalogue/locations/${srv.slug}` : `/marketplace/locations/${srv.slug}`)
            : (embedded ? `/dashboard/catalogue/prestataires/${srv.slug}` : `/marketplace/prestataires/${srv.slug}`);

          return (
            <article
              key={srv.slug}
              className="group rounded-xl border border-border/80 bg-surface shadow-xs hover:shadow-md hover:border-primary/40 transition-all duration-200 overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sizedMediaUrl(cover, 360)}
                      alt={srv.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted">
                      <Sparkles className="w-8 h-8 text-amber-500/50" />
                    </div>
                  )}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-white border border-white/20">
                    {srv.categoryLabel || 'Prestation'}
                  </span>
                </div>
                <div className="p-3 sm:p-4 space-y-1.5">
                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {srv.title}
                  </h3>
                  {srv.city && (
                    <p className="text-xs text-muted flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted shrink-0" />
                      <span className="truncate">{[srv.city, srv.commune].filter(Boolean).join(' · ')}</span>
                    </p>
                  )}
                  {srv.description && (
                    <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                      {srv.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3 sm:p-4 pt-0 border-t border-border/60 mt-2 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-foreground tabular-nums">
                  {srv.priceFromFc != null ? formatFc(srv.priceFromFc) : 'Sur devis'}
                  {srv.priceUnitLabel ? <span className="text-[10px] font-normal text-muted"> {srv.priceUnitLabel}</span> : null}
                </span>
                <Link
                  href={href}
                  className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover active:scale-95 transition inline-flex items-center gap-1 shadow-2xs"
                >
                  <span>Voir l'offre</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );

  const venuesPanel = (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-500" />
            <span>Salles & Espaces de réception ({relatedVenues?.length || 0})</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted">
            Découvrez les salles d'événements et lieux gérés par {subtitle || title || 'cette organisation'}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {relatedVenues?.map((vn) => {
          const cover = vn.photos?.[0] || vn.coverUrl;
          const href = embedded ? `/dashboard/catalogue/salles/${vn.slug}` : `/marketplace/salles/${vn.slug}`;

          return (
            <article
              key={vn.slug}
              className="group rounded-xl border border-border/80 bg-surface shadow-xs hover:shadow-md hover:border-primary/40 transition-all duration-200 overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sizedMediaUrl(cover, 360)}
                      alt={vn.headline || vn.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted">
                      <Building2 className="w-8 h-8 text-emerald-500/50" />
                    </div>
                  )}
                  {vn.capacity ? (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-white border border-white/20 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{vn.capacity} places</span>
                    </span>
                  ) : null}
                </div>
                <div className="p-3 sm:p-4 space-y-1.5">
                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {vn.headline || vn.name}
                  </h3>
                  {vn.city && (
                    <p className="text-xs text-muted flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted shrink-0" />
                      <span className="truncate">{[vn.city, vn.commune].filter(Boolean).join(' · ')}</span>
                    </p>
                  )}
                  {vn.description && (
                    <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                      {vn.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3 sm:p-4 pt-0 border-t border-border/60 mt-2 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-foreground tabular-nums">
                  {vn.priceFromFc != null ? formatFc(vn.priceFromFc) : 'Sur devis'}
                  {vn.priceUnitLabel ? <span className="text-[10px] font-normal text-muted"> {vn.priceUnitLabel}</span> : null}
                </span>
                <Link
                  href={href}
                  className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary-hover active:scale-95 transition inline-flex items-center gap-1 shadow-2xs"
                >
                  <span>Voir la salle</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );

  const mainPanel =
    viewTab === 'map'
      ? map
      : viewTab === 'activity' && activity
        ? activity
        : viewTab === 'services' && hasRelatedServices
          ? servicesPanel
          : viewTab === 'venues' && hasRelatedVenues
            ? venuesPanel
            : (
              <div className="flex flex-col gap-8">
                {details}

                {/* Bloc d'aperçu des autres prestations du prestataire */}
                {hasRelatedServices && (
                  <section className="space-y-3 pt-4 border-t border-border/70">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <span>Autres prestations proposées ({relatedServices!.length})</span>
                        </h2>
                        <p className="text-xs text-muted">
                          Services complémentaires proposés par {subtitle || 'ce prestataire'}.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onTab('services')}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 focus-visible:outline-none"
                      >
                        <span>Tout voir</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {relatedServices!.slice(0, 4).map((srv) => {
                        const cover = srv.photos?.[0] || srv.coverUrl;
                        const href = srv.category?.startsWith('RENTAL_')
                          ? (embedded ? `/dashboard/catalogue/locations/${srv.slug}` : `/marketplace/locations/${srv.slug}`)
                          : (embedded ? `/dashboard/catalogue/prestataires/${srv.slug}` : `/marketplace/prestataires/${srv.slug}`);

                        return (
                          <Link
                            key={srv.slug}
                            href={href}
                            className="group p-2.5 rounded-xl border border-border/80 bg-surface hover:border-primary/40 hover:shadow-xs transition flex gap-3 items-center"
                          >
                            <div className="w-14 h-14 rounded-lg bg-surface-muted overflow-hidden shrink-0 relative">
                              {cover ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={sizedMediaUrl(cover, 160)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted">
                                  <Sparkles className="w-5 h-5 text-amber-500/60" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block truncate">
                                {srv.categoryLabel}
                              </span>
                              <h3 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                {srv.title}
                              </h3>
                              <p className="text-[11px] font-semibold text-muted tabular-nums">
                                {srv.priceFromFc != null ? formatFc(srv.priceFromFc) : 'Sur devis'}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Bloc d'aperçu des salles selon les rôles de l'organisation */}
                {hasRelatedVenues && (
                  <section className="space-y-3 pt-4 border-t border-border/70">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-emerald-500" />
                          <span>Salles & Lieux de réception ({relatedVenues!.length})</span>
                        </h2>
                        <p className="text-xs text-muted">
                          Espaces et salles gérés par {subtitle || 'cet établissement'}.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onTab('venues')}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 focus-visible:outline-none"
                      >
                        <span>Tout voir</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {relatedVenues!.slice(0, 4).map((vn) => {
                        const cover = vn.photos?.[0] || vn.coverUrl;
                        const href = embedded ? `/dashboard/catalogue/salles/${vn.slug}` : `/marketplace/salles/${vn.slug}`;

                        return (
                          <Link
                            key={vn.slug}
                            href={href}
                            className="group p-2.5 rounded-xl border border-border/80 bg-surface hover:border-primary/40 hover:shadow-xs transition flex gap-3 items-center"
                          >
                            <div className="w-14 h-14 rounded-lg bg-surface-muted overflow-hidden shrink-0 relative">
                              {cover ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={sizedMediaUrl(cover, 160)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted">
                                  <Building2 className="w-5 h-5 text-emerald-500/60" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              {vn.capacity && (
                                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block truncate">
                                  {vn.capacity} places
                                </span>
                              )}
                              <h3 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                {vn.headline || vn.name}
                              </h3>
                              <p className="text-[11px] font-semibold text-muted tabular-nums">
                                {vn.priceFromFc != null ? formatFc(vn.priceFromFc) : 'Sur devis'}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Réalisations & Stories récentes */}
                {activityPreview && activityPreview.length > 0 ? (
                  <ListingActivityHighlights
                    activityPreview={activityPreview}
                    authorLabel={title || 'Cette salle'}
                    onViewAllActivity={showActivity ? () => onTab('activity') : undefined}
                  />
                ) : null}
              </div>
            );

  return (
    <div
      className={cn(
        'flex-1',
        embedded
          ? showCommerce
            ? 'pb-[calc(var(--em-listing-dock)+0.75rem)] md:pb-16 lg:pb-10'
            : 'pb-8 sm:pb-10'
          : 'page-container pt-3 pb-20 sm:pt-5 lg:py-8 lg:pb-10',
      )}
    >
      <button
        type="button"
        onClick={goBack}
        className="inline-flex items-center gap-1.5 min-h-11 -ml-1 px-1.5 text-xs font-semibold text-muted hover:text-foreground mb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-[var(--radius-button)]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {backLabel}
      </button>

      {loading ? (
        <SkeletonListingDetail />
      ) : error ? (
        <div
          role="alert"
          className="max-w-md mx-auto text-center py-16 px-5 border border-border rounded-[var(--radius-card)] bg-surface"
        >
          {errorIcon}
          <p className="text-sm font-semibold text-foreground">{errorMessage}</p>
          {error && error !== errorMessage ? (
            <p className="text-sm text-muted mt-2 break-words">{error}</p>
          ) : null}
          {onRetry ? (
            <Button className="mt-5 min-h-11" onClick={onRetry}>
              Réessayer
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 mb-8 lg:mb-10">
            <div className="relative em-listing-hero rounded-[var(--radius-card)] overflow-hidden bg-black/80 shadow-[var(--shadow-soft)]">
              {heroSrc ? (
                isVideoUrl(heroSrc) ? (
                  <video
                    src={heroSrc}
                    poster={sizedMediaUrl(heroSrc, 1280)}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    controls
                    preload="metadata"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sizedMediaUrl(heroSrc, 1280)}
                    srcSet={listingSrcSet(heroSrc, [640, 960, 1280, 1920])}
                    sizes="(min-width: 1280px) 1440px, 100vw"
                    alt={title || "Visuel principal de l'établissement"}
                    fetchPriority="high"
                    loading="eager"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted bg-surface-muted">
                  {fallbackIcon}
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
              {heroAction || title ? (
                <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                  {heroAction}
                  {title ? (
                    <ShareButton
                      title={listingShareTitle(shareKind, title)}
                      text={subtitle ? `${chip ? `${chip} · ` : ''}${subtitle}` : chip}
                      url={shareHref}
                      variant="icon"
                    />
                  ) : null}
                </div>
              ) : null}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-5 pt-16 sm:px-7 sm:pb-8 sm:pt-24 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">
                <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.1] break-words line-clamp-3">
                  {title}
                </h1>
                {(chip || subtitle) ? (
                  <p className="mt-2 text-sm sm:text-base text-white line-clamp-2">
                    {[chip, subtitle].filter(Boolean).join(' · ')}
                  </p>
                ) : null}
              </div>
            </div>
            {photos.length > 1 ? (
              <ListingPhotoThumbs
                photos={photos}
                photoIndex={photoIndex}
                onPhotoIndex={onPhotoIndex}
                listingTitle={title}
              />
            ) : null}
          </div>

          <div className={cn(
            'grid grid-cols-1 items-start gap-8 lg:gap-12',
            isWideTab ? 'lg:grid-cols-1' : 'lg:grid-cols-5',
          )}>
            <div className={cn('flex flex-col gap-4 min-w-0', isWideTab ? '' : 'lg:col-span-3')}>
              <div className={cn('sticky z-20 -mx-1 px-1 py-1 bg-background/95 backdrop-blur-md', embedded ? 'top-12' : 'top-[var(--em-site-header)]', 'md:top-16')}>
                <MarketplaceFormTabs
                  value={viewTab}
                  onChange={onTab}
                  include={tabInclude}
                  icons={false}
                  badges={tabBadges}
                />
              </div>

              {viewTab === 'details' && relationStatus ? (
                <div className="lg:hidden">{relationStatus}</div>
              ) : null}

              {mainPanel}
            </div>

            {isWideTab ? null : (
            <aside
              id="listing-contact"
              className={cn(
                'lg:col-span-2 flex flex-col gap-6 min-w-0 lg:sticky lg:top-24',
                embedded ? 'scroll-mt-[9.5rem] md:scroll-mt-24' : 'scroll-mt-24',
              )}
            >
              <div className="hidden lg:block">
                {priceBlock}
              </div>

              {relationStatus ? (
                <div className="hidden lg:block">{relationStatus}</div>
              ) : null}

              {showCommerce || availability || preview ? (
                <div className="flex flex-col gap-3">
              {availability ? (
                <div
                  id="listing-availability"
                  className={embedded ? 'scroll-mt-[9.5rem] md:scroll-mt-24' : 'scroll-mt-24'}
                >
                  {availability}
                </div>
              ) : null}

              {showCommerce ? (
                <>
              {showBooking ? (
              <div className="flex gap-1 p-1 rounded-[var(--radius-button)] bg-surface-muted border border-border" role="tablist" aria-label="Devis ou réservation">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mobileAction === 'inquire'}
                  onClick={() => setMobileAction('inquire')}
                  className={cn(
                    'flex-1 min-h-11 px-3 rounded-[var(--radius-button)] text-xs font-semibold transition',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    mobileAction === 'inquire'
                      ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  {inquireLabel}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mobileAction === 'book'}
                  onClick={() => setMobileAction('book')}
                  className={cn(
                    'flex-1 min-h-11 px-3 rounded-[var(--radius-button)] text-xs font-semibold transition',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    mobileAction === 'book'
                      ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  {bookLabel}
                </button>
              </div>
              ) : null}

              <div className={cn(!showBooking || mobileAction === 'inquire' ? 'block' : 'hidden')}>
                {inquiry}
              </div>
              {showBooking ? (
              <div className={cn(mobileAction === 'book' ? 'block' : 'hidden')}>
                {booking}
              </div>
              ) : null}
                </>
              ) : preview ? (
                <p className="text-xs text-muted leading-relaxed">
                  Aperçu interne — les demandes de devis et réservations restent sur la fiche publique.
                </p>
              ) : null}
                </div>
              ) : null}
            </aside>
            )}
          </div>
        </>
      )}

      {!error && showCommerce && (
        <div
          className={cn(
            'lg:hidden fixed inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur-md',
            embedded
              ? 'bottom-[var(--em-dash-bottom-nav)] pb-3 md:bottom-0 md:pb-[max(0.75rem,env(safe-area-inset-bottom))]'
              : 'bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
          )}
        >
          <div className="page-container pt-3 flex items-center gap-3">
            {loading ? (
              <>
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-11 w-[4.75rem] rounded-[var(--radius-button)] shrink-0" />
                <Skeleton className="h-11 w-16 rounded-[var(--radius-button)] shrink-0" />
              </>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate tabular-nums">{priceLabel}</p>
                </div>
                <Button size="md" className="shrink-0 min-h-11" onClick={() => openMobileCommerce('inquire')}>
                  {inquireLabel}
                </Button>
                {showBooking ? (
                <Button size="md" variant="secondary" className="shrink-0 min-h-11" onClick={() => openMobileCommerce('book')}>
                  {bookLabel}
                </Button>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal / Tiroir d'action directe sur mobile */}
      {showCommerce && (
        <Modal
          open={mobileModalOpen}
          onClose={() => setMobileModalOpen(false)}
          title={mobileAction === 'inquire' ? inquireLabel : bookLabel}
          description={title}
          size="md"
        >
          <div className="space-y-4 pt-1">
            {showBooking && (
              <div className="flex gap-1 p-1 rounded-[var(--radius-button)] bg-surface-muted border border-border" role="tablist" aria-label="Devis ou réservation">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mobileAction === 'inquire'}
                  onClick={() => setMobileAction('inquire')}
                  className={cn(
                    'flex-1 min-h-10 px-3 rounded-[var(--radius-button)] text-xs font-semibold transition',
                    mobileAction === 'inquire'
                      ? 'bg-surface text-foreground shadow-xs'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  {inquireLabel}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mobileAction === 'book'}
                  onClick={() => setMobileAction('book')}
                  className={cn(
                    'flex-1 min-h-10 px-3 rounded-[var(--radius-button)] text-xs font-semibold transition',
                    mobileAction === 'book'
                      ? 'bg-surface text-foreground shadow-xs'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  {bookLabel}
                </button>
              </div>
            )}

            <div>
              {mobileAction === 'inquire' ? inquiry : booking}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
