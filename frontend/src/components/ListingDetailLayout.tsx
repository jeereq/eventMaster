'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ConfirmDialog, Modal, Skeleton, SkeletonListingDetail } from '@/components/ui';
import { useIsLgUp } from '@/hooks/useIsMobile';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import { getCatalogueReturn, isCatalogueListPath } from '@/lib/catalogueQuery';
import { CLOSE_PAYMENT_CONFIRM } from '@/lib/pendingTicketPayment';
import { isVideoUrl, listingSrcSet, sizedMediaUrl, type MarketplaceActivityPreviewItem, type PublicService, type PublicVenue } from '@/lib/marketplace';
import MarketplaceFormTabs, { listingTabPanelId, type MarketplaceFormTab } from '@/components/MarketplaceFormTabs';
import { ArrowLeft, Play } from 'lucide-react';
import ShareButton from '@/components/ShareButton';
import { listingPublicUrl, listingShareTitle } from '@/lib/share';
import ListingActivityHighlights from '@/components/marketplace/ListingActivityHighlights';
import { LISTING_INQUIRE_EVENT } from '@/lib/listingInquire';
import {
  RelatedOfferCard,
  RelatedOfferRow,
  RelatedOffersSection,
  relatedServiceHref,
  relatedVenueHref,
  splitRelatedServices,
} from '@/components/marketplace/ListingRelatedOffers';

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
            sizes="(min-width: 640px) 112px, 80px"
            alt={`${listingTitle}, photo ${i + 1}`}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
          {isVideoUrl(url) && (
            <span className="absolute inset-0 flex items-center justify-center bg-stage/50">
              <Play className="w-3.5 h-3.5 text-stage-foreground fill-stage-foreground" />
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
  paymentInProgress = false,
  listingKind = 'venue',
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
  paymentInProgress?: boolean;
  listingKind?: 'venue' | 'service' | 'rental' | 'event';
}) {
  const router = useRouter();
  const isLgUp = useIsLgUp();
  const [mobileAction, setMobileAction] = useState<'inquire' | 'book'>('inquire');
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const commerceTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
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

  const closeMobileCommerce = () => {
    if (paymentInProgress) {
      setLeaveConfirmOpen(true);
      return;
    }
    setMobileModalOpen(false);
  };

  const openMobileCommerce = (action: 'inquire' | 'book') => {
    setMobileAction(action);
    setMobileModalOpen(true);
  };

  useEffect(() => {
    const onInquire = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) return;
      if (showCommerce) {
        setMobileAction('inquire');
        setMobileModalOpen(true);
        return;
      }
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.getElementById('listing-contact')?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    };
    window.addEventListener(LISTING_INQUIRE_EVENT, onInquire);
    return () => window.removeEventListener(LISTING_INQUIRE_EVENT, onInquire);
  }, [showCommerce]);

  const scrollToContact = (action: 'inquire' | 'book') => {
    setMobileAction(action);
    const reduceMotion = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('listing-contact')?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  const commerceTabClass = (active: boolean) =>
    cn(
      'flex-1 min-h-11 px-3 rounded-[var(--radius-button)] text-xs font-semibold transition',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
      active ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]' : 'text-muted hover:text-foreground',
    );

  const commerceActions: Array<'inquire' | 'book'> = showBooking ? ['inquire', 'book'] : [];
  const onCommerceTabKey = (index: number, event: React.KeyboardEvent) => {
    if (!commerceActions.length) return;
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = index + 1;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = commerceActions.length - 1;
    else return;
    event.preventDefault();
    const wrapped = (next + commerceActions.length) % commerceActions.length;
    const action = commerceActions[wrapped];
    if (!action) return;
    setMobileAction(action);
    commerceTabRefs.current[wrapped]?.focus();
  };

  const commercePanel = showCommerce ? (
    <>
      {showBooking ? (
        <div className="flex gap-1 p-1 rounded-[var(--radius-button)] bg-surface-muted border border-border" role="tablist" aria-label="Devis ou réservation">
          {commerceActions.map((action, index) => (
            <button
              key={action}
              type="button"
              role="tab"
              id={`listing-commerce-tab-${action}`}
              aria-selected={mobileAction === action}
              aria-controls={`listing-commerce-panel-${action}`}
              tabIndex={mobileAction === action ? 0 : -1}
              ref={(node) => {
                commerceTabRefs.current[index] = node;
              }}
              onClick={() => setMobileAction(action)}
              onKeyDown={(event) => onCommerceTabKey(index, event)}
              className={commerceTabClass(mobileAction === action)}
            >
              {action === 'inquire' ? inquireLabel : bookLabel}
            </button>
          ))}
        </div>
      ) : null}
      <div
        id="listing-commerce-panel-inquire"
        role={showBooking ? 'tabpanel' : undefined}
        aria-labelledby={showBooking ? 'listing-commerce-tab-inquire' : undefined}
        hidden={showBooking && mobileAction !== 'inquire'}
        className={cn(!showBooking || mobileAction === 'inquire' ? 'block' : 'hidden')}
      >
        {inquiry}
      </div>
      {showBooking ? (
        <div
          id="listing-commerce-panel-book"
          role="tabpanel"
          aria-labelledby="listing-commerce-tab-book"
          hidden={mobileAction !== 'book'}
          className={cn(mobileAction === 'book' ? 'block' : 'hidden')}
        >
          {booking}
        </div>
      ) : null}
    </>
  ) : null;

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
  const { prestations, rentals } = splitRelatedServices(relatedServices);
  const hasPrestations = prestations.length > 0;
  const hasRentals = rentals.length > 0;
  const hasRelatedServices = hasPrestations || hasRentals;
  const hasRelatedVenues = Boolean(relatedVenues && relatedVenues.length > 0);
  const relatedOwner = subtitle || title || 'cet établissement';
  const servicesTabLabel = hasPrestations && hasRentals
    ? 'Offres'
    : hasRentals
      ? 'Matériel'
      : 'Prestations';
  const activityAuthor = title || (
    listingKind === 'rental'
      ? 'Cette location'
      : listingKind === 'service'
        ? 'Ce prestataire'
        : listingKind === 'event'
          ? 'Cet événement'
          : 'Cette salle'
  );

  const tabInclude: MarketplaceFormTab[] = [
    'details',
    ...(hasRelatedServices ? ['services' as const] : []),
    ...(hasRelatedVenues ? ['venues' as const] : []),
    ...(showActivity ? ['activity' as const] : []),
    'map',
  ];

  const resolvedActivityCount = activityCount ?? (activityPreview ? activityPreview.length : undefined);
  const tabBadges: Partial<Record<MarketplaceFormTab, number | string>> = {
    ...(hasRelatedServices ? { services: (relatedServices || []).length } : {}),
    ...(hasRelatedVenues ? { venues: relatedVenues!.length } : {}),
    ...(resolvedActivityCount != null && resolvedActivityCount > 0 ? { activity: resolvedActivityCount } : {}),
  };

  const offerGridClass = 'grid grid-cols-1 sm:grid-cols-2 gap-4';
  const offerRowClass = 'grid grid-cols-1 sm:grid-cols-2 gap-3';

  const servicesPanel = (
    <div className="space-y-10">
      {hasPrestations ? (
        <RelatedOffersSection
          title={`Prestations (${prestations.length})`}
          subtitle={`Métiers proposés par ${relatedOwner}.`}
        >
          <div className={offerGridClass}>
            {prestations.map((srv) => (
              <RelatedOfferCard
                key={srv.slug}
                href={relatedServiceHref(srv, embedded)}
                cover={srv.photos?.[0] || srv.coverUrl}
                title={srv.title}
                meta={[srv.categoryLabel, srv.city, srv.commune].filter(Boolean).join(' · ')}
                priceFromFc={srv.priceFromFc}
                priceUnitLabel={srv.priceUnitLabel}
                kind="service"
                cta="Voir l’offre"
              />
            ))}
          </div>
        </RelatedOffersSection>
      ) : null}
      {hasRentals ? (
        <RelatedOffersSection
          title={`Matériel & équipements (${rentals.length})`}
          subtitle={`Locations proposées par ${relatedOwner}.`}
        >
          <div className={offerGridClass}>
            {rentals.map((srv) => (
              <RelatedOfferCard
                key={srv.slug}
                href={relatedServiceHref(srv, embedded)}
                cover={srv.photos?.[0] || srv.coverUrl}
                title={srv.title}
                meta={[srv.categoryLabel, srv.city, srv.commune].filter(Boolean).join(' · ')}
                priceFromFc={srv.priceFromFc}
                priceUnitLabel={srv.priceUnitLabel}
                kind="rental"
                cta="Voir le matériel"
              />
            ))}
          </div>
        </RelatedOffersSection>
      ) : null}
    </div>
  );

  const venuesPanel = (
    <RelatedOffersSection
      title={`Salles (${relatedVenues?.length || 0})`}
      subtitle={`Espaces gérés par ${relatedOwner}.`}
    >
      <div className={offerGridClass}>
        {relatedVenues?.map((vn) => (
          <RelatedOfferCard
            key={vn.slug}
            href={relatedVenueHref(vn, embedded)}
            cover={vn.photos?.[0] || vn.coverUrl}
            title={vn.headline || vn.name}
            meta={[vn.capacity ? `${vn.capacity} places` : null, vn.city, vn.commune].filter(Boolean).join(' · ')}
            priceFromFc={vn.priceFromFc}
            priceUnitLabel={vn.priceUnitLabel}
            kind="venue"
            cta="Voir la salle"
          />
        ))}
      </div>
    </RelatedOffersSection>
  );

  const detailsPanel = (
    <div className="flex flex-col gap-8">
      {details}
      {hasPrestations ? (
        <RelatedOffersSection
          className="pt-4 border-t border-border"
          title="Prestations"
          subtitle={`Autres métiers de ${relatedOwner}.`}
          onViewAll={() => onTab('services')}
        >
          <div className={offerRowClass}>
            {prestations.slice(0, 4).map((srv) => (
              <RelatedOfferRow
                key={srv.slug}
                href={relatedServiceHref(srv, embedded)}
                cover={srv.photos?.[0] || srv.coverUrl}
                title={srv.title}
                meta={srv.categoryLabel}
                priceFromFc={srv.priceFromFc}
                kind="service"
              />
            ))}
          </div>
        </RelatedOffersSection>
      ) : null}
      {hasRentals ? (
        <RelatedOffersSection
          className="pt-4 border-t border-border"
          title="Matériel & équipements"
          subtitle={`Locations proposées par ${relatedOwner}.`}
          onViewAll={() => onTab('services')}
        >
          <div className={offerRowClass}>
            {rentals.slice(0, 4).map((srv) => (
              <RelatedOfferRow
                key={srv.slug}
                href={relatedServiceHref(srv, embedded)}
                cover={srv.photos?.[0] || srv.coverUrl}
                title={srv.title}
                meta={srv.categoryLabel}
                priceFromFc={srv.priceFromFc}
                kind="rental"
              />
            ))}
          </div>
        </RelatedOffersSection>
      ) : null}
      {hasRelatedVenues ? (
        <RelatedOffersSection
          className="pt-4 border-t border-border"
          title="Salles"
          subtitle={`Espaces gérés par ${relatedOwner}.`}
          onViewAll={() => onTab('venues')}
        >
          <div className={offerRowClass}>
            {relatedVenues!.slice(0, 4).map((vn) => (
              <RelatedOfferRow
                key={vn.slug}
                href={relatedVenueHref(vn, embedded)}
                cover={vn.photos?.[0] || vn.coverUrl}
                title={vn.headline || vn.name}
                meta={vn.capacity ? `${vn.capacity} places` : vn.city}
                priceFromFc={vn.priceFromFc}
                kind="venue"
              />
            ))}
          </div>
        </RelatedOffersSection>
      ) : null}
      {activityPreview && activityPreview.length > 0 ? (
        <ListingActivityHighlights
          activityPreview={activityPreview}
          authorLabel={activityAuthor}
          onViewAllActivity={showActivity ? () => onTab('activity') : undefined}
        />
      ) : null}
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
            : detailsPanel;

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
            <div className="relative em-listing-hero rounded-[var(--radius-card)] overflow-hidden bg-stage shadow-[var(--shadow-soft)]">
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
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stage via-stage/70 to-transparent" />
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
              <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-5 pt-16 sm:px-7 sm:pb-8 sm:pt-24 text-stage-foreground [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">
                <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.1] break-words line-clamp-3">
                  {title}
                </h1>
                {(chip || subtitle) ? (
                  <p className="mt-2 text-sm sm:text-base text-stage-foreground/90 line-clamp-2">
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

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-5 lg:gap-12">
            <div className="flex min-w-0 flex-col gap-4 lg:col-span-3">
              <div className={cn('sticky z-20 -mx-1 px-1 py-1 bg-background/95 backdrop-blur-md', embedded ? 'top-12' : 'top-[var(--em-site-header)]', 'md:top-16')}>
                <MarketplaceFormTabs
                  value={viewTab}
                  onChange={onTab}
                  include={tabInclude}
                  icons={false}
                  badges={tabBadges}
                  labels={{ services: servicesTabLabel }}
                  labelledPanels
                />
              </div>

              {relationStatus ? (
                <div className="lg:hidden">{relationStatus}</div>
              ) : null}

              <div
                role="tabpanel"
                id={listingTabPanelId(viewTab)}
                aria-labelledby={`listing-tab-${viewTab}`}
              >
                {mainPanel}
              </div>
            </div>

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

              {isLgUp && showCommerce ? (
                commercePanel
              ) : preview ? (
                <p className="text-xs text-muted leading-relaxed">
                  Aperçu interne — les demandes de devis et réservations restent sur la fiche publique.
                </p>
              ) : null}
                </div>
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

      {!isLgUp && showCommerce ? (
        <Modal
          open={mobileModalOpen}
          onClose={closeMobileCommerce}
          title={mobileAction === 'inquire' ? inquireLabel : bookLabel}
          description={title}
          size="lg"
          className="min-h-[88dvh] sm:min-h-0"
        >
          <div className="space-y-4 pt-1">{commercePanel}</div>
        </Modal>
      ) : null}

      <ConfirmDialog
        open={leaveConfirmOpen}
        onClose={() => setLeaveConfirmOpen(false)}
        onConfirm={() => {
          setLeaveConfirmOpen(false);
          setMobileModalOpen(false);
        }}
        title="Fermer sans annuler"
        description={CLOSE_PAYMENT_CONFIRM}
        confirmLabel="Fermer quand même"
        cancelLabel="Rester ici"
      />
    </div>
  );
}
