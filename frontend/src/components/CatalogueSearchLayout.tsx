'use client';

import React, { useEffect, useRef } from 'react';
import { Minimize2 } from 'lucide-react';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import PublicCtaBand from '@/components/PublicCtaBand';
import MarketplacePublicNav from '@/components/MarketplacePublicNav';
import MarketplaceLocationsMap, { type MarketplaceMapMarker } from '@/components/MarketplaceLocationsMap';
import CatalogueResults, { CatalogueResultsSkeleton } from '@/components/CatalogueResults';
import CatalogueMobileExplore from '@/components/CatalogueMobileExplore';
import { Pagination, paginateItems } from '@/components/ui';
import useIsMobile from '@/hooks/useIsMobile';
import {
  isCatalogueMapView,
  type CatalogueItem,
  type CatalogueViewMode,
} from '@/lib/marketplace';
import { cn } from '@/lib/cn';
import type { CatalogueGridCols } from '@/components/CatalogueViewToggle';

export function CatalogueFocusStage({
  markers,
  header,
  filters,
  error,
  loading,
  searchCenter,
  radiusKm,
  city,
  searchOriginLabel,
  listingSearch = false,
  navigateOnClick = false,
  className,
}: {
  markers: MarketplaceMapMarker[];
  header?: React.ReactNode;
  filters?: React.ReactNode;
  error?: string;
  loading?: boolean;
  searchCenter?: { lat: number; lng: number } | null;
  radiusKm?: number;
  city?: string | null;
  searchOriginLabel?: string;
  listingSearch?: boolean;
  navigateOnClick?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('relative isolate flex-1 min-h-0', className)}>
      <div className="absolute inset-0 z-0">
        <MarketplaceLocationsMap
          className="h-full"
          markers={markers}
          listingSearch={listingSearch}
          navigateOnClick={navigateOnClick}
          height="100%"
          variant="focus"
          searchCenter={searchCenter}
          radiusKm={searchCenter ? radiusKm : 0}
          city={city}
          searchOriginLabel={searchOriginLabel}
        />
      </div>
      <div className="absolute inset-x-0 top-0 z-10 p-3 sm:p-4 space-y-2 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none">
        {header ? <div className="pointer-events-auto">{header}</div> : null}
        {filters ? <div className="pointer-events-auto max-w-2xl em-focus-filters">{filters}</div> : null}
        {error ? (
          <p className="pointer-events-auto text-sm text-rose-600 bg-surface/95 rounded-lg px-3 py-2 shadow-lg">
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="pointer-events-none text-[11px] font-medium text-muted bg-surface/95 rounded-full px-3 py-1.5 w-fit shadow-lg">
            Mise à jour de la carte…
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function CatalogueSearchLayout({
  activeNav,
  heroTitle,
  heroDescription,
  cta,
  renderFilters,
  items,
  markers,
  loading,
  error,
  emptyTitle,
  emptyDescription,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemLabel,
  mode,
  onViewChange,
  searchCenter,
  radiusKm,
  city,
  searchOriginLabel,
  showKindLegend = false,
  gridCols = 4,
}: {
  activeNav: 'hub' | 'venues' | 'services' | 'events';
  heroTitle: string;
  heroDescription: string;
  cta: {
    title: string;
    description: string;
    primaryHref: string;
    primaryLabel: string;
    secondaryHref?: string;
    secondaryLabel?: string;
  };
  renderFilters: (variant: 'card' | 'float') => React.ReactNode;
  items: CatalogueItem[];
  markers: MarketplaceMapMarker[];
  loading: boolean;
  error?: string;
  emptyTitle: string;
  emptyDescription: string;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  itemLabel: string;
  mode: CatalogueViewMode;
  onViewChange: (mode: CatalogueViewMode) => void;
  searchCenter?: { lat: number; lng: number } | null;
  radiusKm?: number;
  city?: string | null;
  searchOriginLabel?: string;
  showKindLegend?: boolean;
  gridCols?: CatalogueGridCols;
}) {
  const isMobile = useIsMobile();
  const mapMode = isCatalogueMapView(mode);
  const lastBrowseRef = useRef<Exclude<CatalogueViewMode, 'map' | 'focus'>>('grid');

  useEffect(() => {
    if (mode === 'grid' || mode === 'list') lastBrowseRef.current = mode;
  }, [mode]);

  const exitMap = () => onViewChange(lastBrowseRef.current);

  if (isMobile && mapMode) {
    return (
      <PublicPageShell faqHref="/faq" hideFooter>
        <CatalogueMobileExplore
          items={items}
          markers={markers}
          loading={loading}
          error={error}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          searchCenter={searchCenter}
          radiusKm={radiusKm}
          city={city}
          searchOriginLabel={searchOriginLabel}
          onExit={exitMap}
          header={
            <>
              <MarketplacePublicNav
                active={activeNav}
                className="bg-surface/90 backdrop-blur-xl border-white/25 dark:border-white/10 shadow-lg"
              />
              {renderFilters('float')}
            </>
          }
        />
      </PublicPageShell>
    );
  }

  if (mode === 'focus') {
    return (
      <PublicPageShell faqHref="/faq" hideFooter>
        <CatalogueFocusStage
          markers={markers}
          loading={loading}
          error={error}
          searchCenter={searchCenter}
          radiusKm={radiusKm}
          city={city}
          searchOriginLabel={searchOriginLabel}
          header={
            <div className="flex items-start gap-2">
              <MarketplacePublicNav
                active={activeNav}
                className="flex-1 min-w-0 bg-surface/95 backdrop-blur-xl border-white/25 dark:border-white/10 shadow-lg"
              />
              <button
                type="button"
                onClick={exitMap}
                className="h-9 shrink-0 inline-flex items-center gap-1.5 px-3 rounded-full bg-surface/95 backdrop-blur-xl border border-white/25 dark:border-white/10 shadow-lg text-xs font-semibold text-foreground hover:bg-surface transition hover:scale-[1.02] active:scale-[0.98]"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                Quitter
              </button>
            </div>
          }
          filters={renderFilters('float')}
        />
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell faqHref="/faq">
      <PublicPageHero compact chip="Marketplace" title={heroTitle} description={heroDescription}>
        <MarketplacePublicNav active={activeNav} />
      </PublicPageHero>

      <main className="page-container py-6 sm:py-10 flex-1 space-y-4 sm:space-y-6">
        {mapMode ? (
          <div className="sticky top-14 z-20 -mx-1 px-1 py-1 bg-background/90 backdrop-blur-md">
            {renderFilters('card')}
          </div>
        ) : (
          renderFilters('card')
        )}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        {mapMode ? (
          <div className="relative isolate space-y-3">
            {showKindLegend && (
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  Salles
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--festive-accent)]" />
                  Prestataires
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
                  Événements
                </span>
                <span>Bâtiment = salle, étoile = prestataire, calendrier = événement.</span>
              </div>
            )}
            {loading && markers.length === 0 ? (
          <CatalogueResultsSkeleton mode={mode} count={pageSize} gridCols={gridCols} />
            ) : (
              <MarketplaceLocationsMap
                markers={markers}
                listingSearch
                navigateOnClick={false}
                height={480}
                searchCenter={searchCenter}
                radiusKm={searchCenter ? radiusKm : 0}
                city={city}
                searchOriginLabel={searchOriginLabel}
              />
            )}
          </div>
        ) : loading ? (
          <CatalogueResultsSkeleton mode={mode} count={pageSize} gridCols={gridCols} />
        ) : (
          <>
            <CatalogueResults
              items={paginateItems(items, page, pageSize)}
              mode={mode === 'list' ? 'list' : 'grid'}
              gridCols={gridCols}
              emptyTitle={emptyTitle}
              emptyDescription={emptyDescription}
            />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={items.length}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              itemLabel={itemLabel}
            />
          </>
        )}
      </main>

      <PublicCtaBand
        title={cta.title}
        description={cta.description}
        primaryHref={cta.primaryHref}
        primaryLabel={cta.primaryLabel}
        secondaryHref={cta.secondaryHref}
        secondaryLabel={cta.secondaryLabel}
      />
    </PublicPageShell>
  );
}
