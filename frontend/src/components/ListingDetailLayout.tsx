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

function ListingMediaGallery({
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
  const current = photos[photoIndex];
  return (
    <div className="space-y-2">
      <div className="em-listing-hero rounded-[var(--radius-card)] overflow-hidden bg-black/80 border border-border">
        {current ? (
          isVideoUrl(current) ? (
            <video
              key={current}
              src={current}
              poster={mediaPosterUrl(current)}
              controls
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current} alt="" className="w-full h-full object-cover" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted bg-surface-muted">
            {fallback}
          </div>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
          {photos.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => onPhotoIndex(i)}
              className={cn(
                'relative snap-start shrink-0 w-[3.75rem] sm:w-[5.5rem] aspect-[4/3] rounded-[var(--radius-button)] overflow-hidden border bg-surface-muted',
                i === photoIndex ? 'border-primary ring-2 ring-primary/30' : 'border-border',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaPosterUrl(url)} alt="" className="w-full h-full object-cover" />
              {isVideoUrl(url) && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                  <Play className="w-3.5 h-3.5 text-white fill-white" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
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
    <div className="border border-border rounded-[var(--radius-card)] p-4 sm:p-5 bg-surface space-y-1">
      <p className="text-xs text-muted">À partir de</p>
      <p className="text-2xl font-semibold text-foreground">{priceLabel}</p>
      {priceUnitLabel ? <p className="text-xs text-muted">{priceUnitLabel}</p> : null}
      {quotaLabel ? <p className="text-xs text-muted">{quotaLabel}</p> : null}
    </div>
  );

  return (
    <main className={embedded ? 'pb-8 sm:pb-10 flex-1' : 'page-container pt-3 pb-20 sm:pt-6 lg:py-10 lg:pb-10 flex-1'}>
      <button
        type="button"
        onClick={goBack}
        className="inline-flex items-center gap-1.5 min-h-9 -ml-1 px-1 text-xs font-semibold text-muted hover:text-foreground mb-2 sm:mb-5"
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
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 lg:gap-8 items-start">
            <div className="lg:col-span-3 space-y-3 sm:space-y-5 min-w-0">
              <div className="relative em-listing-hero rounded-[var(--radius-card)] overflow-hidden bg-black/80 border border-border shadow-[var(--shadow-soft)]">
                {heroUrl ? (
                  isVideoUrl(heroUrl) ? (
                    <video src={heroUrl} poster={mediaPosterUrl(heroUrl)} className="w-full h-full object-cover" muted playsInline />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={heroUrl} alt="" className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted bg-surface-muted">
                    {fallbackIcon}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
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
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-6 text-white space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/80">{chip}</p>
                  <h1 className="text-lg sm:text-3xl font-semibold tracking-tight drop-shadow leading-tight">
                    {title}
                  </h1>
                  <p className="text-xs sm:text-sm text-white/85 truncate">{subtitle}</p>
                  <p className="lg:hidden text-sm font-semibold pt-1">
                    {priceLabel}
                    {priceUnitLabel ? <span className="text-[11px] font-normal text-white/75"> · {priceUnitLabel}</span> : null}
                  </p>
                </div>
              </div>

              <div className={cn('sticky z-20 -mx-1 px-1 py-1 bg-background/95 backdrop-blur-md', embedded ? 'top-12' : 'top-14', 'md:top-16')}>
                <MarketplaceFormTabs value={tab} onChange={onTab} />
              </div>

              {tab === 'medias' && (
                <ListingMediaGallery
                  photos={photos}
                  photoIndex={photoIndex}
                  onPhotoIndex={onPhotoIndex}
                  fallback={fallbackIcon}
                />
              )}
              {tab === 'details' && details}
              {tab === 'map' && map}
            </div>

            <aside
              id="listing-contact"
              className="lg:col-span-2 space-y-3 sm:space-y-4 lg:sticky lg:top-24 scroll-mt-24"
            >
              <div className="hidden lg:block">{priceBlock}</div>

              {availability ? (
                <div id="listing-availability" className="scroll-mt-24">
                  {availability}
                </div>
              ) : null}

              {showCommerce ? (
                <>
              {showBooking ? (
              <div className="lg:hidden flex gap-1 p-1 rounded-[var(--radius-button)] bg-surface-muted border border-border">
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

              <div className={cn(!showBooking || mobileAction === 'inquire' ? 'block' : 'hidden', 'lg:block')}>
                {inquiry}
              </div>
              {showBooking ? (
              <div className={cn(mobileAction === 'book' ? 'block' : 'hidden', 'lg:block')}>
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
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-md"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
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
                <Button size="sm" className="shrink-0 min-h-11" onClick={() => scrollToContact('inquire')}>
                  {hideBooking ? inquireLabel : 'Devis'}
                </Button>
                {showBooking ? (
                <Button size="sm" variant="secondary" className="shrink-0 min-h-11" onClick={() => scrollToContact('book')}>
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
