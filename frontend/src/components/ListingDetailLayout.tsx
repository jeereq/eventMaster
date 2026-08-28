'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Skeleton, SkeletonListingDetail } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import { getCatalogueReturn, isCatalogueListPath } from '@/lib/catalogueQuery';
import { isVideoUrl, mediaPosterUrl } from '@/lib/marketplace';
import MarketplaceFormTabs, { type MarketplaceFormTab } from '@/components/MarketplaceFormTabs';
import { ArrowLeft, Play } from 'lucide-react';
import ShareButton from '@/components/ShareButton';
import { listingPublicUrl, listingShareTitle } from '@/lib/share';

function ListingPhotoThumbs({
  photos,
  photoIndex,
  onPhotoIndex,
}: {
  photos: string[];
  photoIndex: number;
  onPhotoIndex: (index: number) => void;
}) {
  if (photos.length < 2) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
      {photos.map((url, i) => (
        <button
          key={url}
          type="button"
          onClick={() => onPhotoIndex(i)}
          className={cn(
            'relative snap-start shrink-0 w-20 min-h-11 sm:w-28 aspect-[4/3] rounded-[var(--radius-button)] overflow-hidden border bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            i === photoIndex ? 'border-primary ring-2 ring-primary/30' : 'border-border',
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaPosterUrl(url)}
            alt={`Miniature ${i + 1}`}
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

function ListingMediaGrid({
  photos,
  photoIndex,
  onPhotoIndex,
  fallback,
}: {
  photos: string[];
  photoIndex: number;
  onPhotoIndex: (index: number) => void;
  fallback: React.ReactNode;
}) {
  if (!photos.length) {
    return (
      <div className="rounded-[var(--radius-card)] bg-surface-muted border border-border h-48 flex items-center justify-center text-muted">
        {fallback}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {photos.map((url, i) => (
        <button
          key={url}
          type="button"
          onClick={() => onPhotoIndex(i)}
          className={cn(
            'relative aspect-[4/3] rounded-[var(--radius-card)] overflow-hidden border bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            i === photoIndex ? 'border-primary ring-2 ring-primary/30' : 'border-border',
          )}
        >
          {isVideoUrl(url) ? (
            <video src={url} poster={mediaPosterUrl(url)} muted playsInline className="w-full h-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={`Média ${i + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
          )}
          {isVideoUrl(url) && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Play className="w-6 h-6 text-white fill-white" />
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
  priceFromFc,
  priceUnitLabel,
  quotaLabel,
  inquiry,
  booking,
  availability,
  preview,
  embedded,
  heroAction,
  inquireLabel = 'Demander un devis',
  bookLabel = 'Réserver',
  hideBooking = false,
  priceCaption,
  shareUrl,
  shareSlug,
  shareKind = 'venue',
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
  priceFromFc: number | null;
  priceUnitLabel?: string | null;
  quotaLabel?: string | null;
  inquiry?: React.ReactNode;
  booking?: React.ReactNode;
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
}) {
  const router = useRouter();
  const [mobileAction, setMobileAction] = useState<'inquire' | 'book'>('inquire');
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

  const scrollToContact = (action: 'inquire' | 'book') => {
    setMobileAction(action);
    document.getElementById('listing-contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const priceBlock = (
    <div className="space-y-1">
      <p className="text-2xl font-semibold text-foreground tracking-tight">{priceLabel}</p>
      {priceUnitLabel ? <p className="text-xs text-muted">{priceUnitLabel}</p> : null}
      {quotaLabel ? <p className="text-xs text-muted">{quotaLabel}</p> : null}
    </div>
  );

  const heroSrc = (photoIndex > 0 && photos[photoIndex]) || heroUrl || photos[0] || null;
  const cycleHero = () => {
    if (photos.length < 2) return;
    onPhotoIndex((photoIndex + 1) % photos.length);
  };

  return (
    <main
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
        className="inline-flex items-center gap-1.5 min-h-11 -ml-1 px-1.5 text-xs font-semibold text-muted hover:text-foreground mb-3"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {backLabel}
      </button>

      {loading ? (
        <SkeletonListingDetail />
      ) : error ? (
        <div className="max-w-md mx-auto text-center py-16 border border-border rounded-[var(--radius-card)] bg-surface">
          {errorIcon}
          <p className="text-sm text-muted">{error || errorMessage}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-6 lg:mb-8">
            <div className="relative em-listing-hero rounded-[var(--radius-card)] overflow-hidden bg-black/80 shadow-[var(--shadow-soft)]">
              {heroSrc ? (
                isVideoUrl(heroSrc) ? (
                  <video
                    src={heroSrc}
                    poster={mediaPosterUrl(heroSrc)}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    controls
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={heroSrc}
                    alt={title || "Visuel principal de l'établissement"}
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted bg-surface-muted">
                  {fallbackIcon}
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
              {photos.length > 1 && heroSrc && !isVideoUrl(heroSrc) ? (
                <button
                  type="button"
                  onClick={cycleHero}
                  className="absolute inset-0 z-[1] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80"
                  aria-label="Photo suivante"
                />
              ) : null}
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
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-7 text-white">
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-semibold tracking-tight drop-shadow leading-[1.1]">
                  {title}
                </h1>
                {(chip || subtitle) ? (
                  <p className="mt-1.5 text-sm sm:text-base text-white/85 truncate">
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
              />
            ) : null}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-10 items-start">
            <div className="lg:col-span-3 space-y-5 min-w-0">
              <div className={cn('sticky z-20 -mx-1 px-1 py-1 bg-background/95 backdrop-blur-md', embedded ? 'top-12' : 'top-14', 'md:top-16')}>
                <MarketplaceFormTabs value={tab} onChange={onTab} />
              </div>

              {tab === 'medias' ? (
                <ListingMediaGrid
                  photos={photos}
                  photoIndex={photoIndex}
                  onPhotoIndex={onPhotoIndex}
                  fallback={fallbackIcon}
                />
              ) : null}
              {tab === 'details' && details}
              {tab === 'map' && map}
            </div>

            <aside
              id="listing-contact"
              className={cn(
                'lg:col-span-2 space-y-5 lg:sticky lg:top-24',
                embedded ? 'scroll-mt-[9.5rem] md:scroll-mt-24' : 'scroll-mt-24',
              )}
            >
              <div className="hidden lg:block border border-border rounded-[var(--radius-card)] p-5 bg-surface">
                {priceBlock}
              </div>

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
              <div className="flex gap-1 p-1 rounded-[var(--radius-button)] bg-surface-muted border border-border">
                <button
                  type="button"
                  onClick={() => setMobileAction('inquire')}
                  className={cn(
                    'flex-1 min-h-11 px-3 rounded-[var(--radius-button)] text-xs font-semibold transition',
                    mobileAction === 'inquire'
                      ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
                      : 'text-muted',
                  )}
                >
                  {inquireLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileAction('book')}
                  className={cn(
                    'flex-1 min-h-11 px-3 rounded-[var(--radius-button)] text-xs font-semibold transition',
                    mobileAction === 'book'
                      ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
                      : 'text-muted',
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
            </aside>
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
          <div className="page-container pt-3 flex items-center gap-2">
            {loading ? (
              <>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-2 w-14" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-11 w-[4.75rem] rounded-[var(--radius-button)] shrink-0" />
                <Skeleton className="h-11 w-16 rounded-[var(--radius-button)] shrink-0" />
              </>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted leading-none">À partir de</p>
                  <p className="text-sm font-semibold truncate">{priceLabel}</p>
                </div>
                <Button size="md" className="shrink-0 min-h-11" onClick={() => scrollToContact('inquire')}>
                  {hideBooking ? inquireLabel : 'Devis'}
                </Button>
                {showBooking ? (
                <Button size="md" variant="secondary" className="shrink-0 min-h-11" onClick={() => scrollToContact('book')}>
                  {bookLabel}
                </Button>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
