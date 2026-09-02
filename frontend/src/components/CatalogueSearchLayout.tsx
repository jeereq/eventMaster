'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Minimize2, SlidersHorizontal } from 'lucide-react';
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
  const [filtersVisible, setFiltersVisible] = useState(true);

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
      <div className="absolute inset-x-0 top-0 z-30 p-2 sm:p-4 space-y-2 bg-gradient-to-b from-background/85 via-background/40 to-transparent pointer-events-none">
        <div className="pointer-events-auto flex items-start gap-2">
          {header ? <div className="min-w-0 flex-1">{header}</div> : null}
          {filters ? (
            <button
              type="button"
              onClick={() => setFiltersVisible((open) => !open)}
              aria-pressed={filtersVisible}
              aria-controls="catalogue-focus-filters"
              className="h-9 sm:h-10 shrink-0 inline-flex items-center gap-1.5 px-3 rounded-[var(--radius-button)] bg-surface/95 backdrop-blur-xl border border-white/25 dark:border-white/10 shadow-lg text-xs font-semibold text-foreground hover:bg-surface transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {filtersVisible ? 'Masquer' : 'Filtres'}
            </button>
          ) : null}
        </div>
        {filters && filtersVisible ? (
          <div id="catalogue-focus-filters" className="pointer-events-auto w-full max-w-3xl em-focus-filters">
            {filters}
          </div>
        ) : null}
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

/** Plein écran dans le dashboard : sidebar, header mobile et bottom bar restent visibles. */
export function CatalogueImmersiveStage({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById('em-dashboard-stage') || document.body);
  }, []);

  useEffect(() => {
    const main = document.getElementById('main-content');
    if (!main) return;
    const previous = main.style.overflow;
    main.style.overflow = 'hidden';
    return () => {
      main.style.overflow = previous;
    };
  }, []);

  if (!target) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Carte marketplace"
      className={cn(
        'fixed z-[25] bg-background overflow-hidden flex flex-col',
        'top-12 inset-x-0 bottom-[calc(3.85rem+env(safe-area-inset-bottom,0px))]',
        'md:inset-y-0 md:left-[var(--em-sidebar-width,16rem)] md:right-0 md:bottom-0',
      )}
    >
      <div className="relative flex-1 min-h-0 h-full">
        {children}
      </div>
    </div>,
    target,
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
  activeNav: 'hub' | 'venues' | 'services' | 'rentals' | 'events';
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
      <PublicPageShell faqHref="/faq" hideFooter hideHeader>
        <div className="flex-1 min-h-0">
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
          nav={
            <MarketplacePublicNav
              dense
              active={activeNav}
              className="bg-surface/90 backdrop-blur-xl border-white/25 dark:border-white/10 shadow-lg"
            />
          }
          filters={renderFilters('float')}
        />
        </div>
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
                className="h-9 shrink-0 inline-flex items-center gap-1.5 px-3 rounded-[var(--radius-button)] bg-surface/95 backdrop-blur-xl border border-white/25 dark:border-white/10 shadow-lg text-xs font-semibold text-foreground hover:bg-surface transition hover:scale-[1.02] active:scale-[0.98]"
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
        <div className="sticky top-14 z-20 -mx-1 px-1 py-1 bg-background/90 backdrop-blur-md">
          {renderFilters('card')}
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        {mapMode ? (
          <div className="relative isolate space-y-3">
            {showKindLegend && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-[3px] bg-primary" />
                  Salles
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--festive-accent)]" />
                  Prestataires
                  <span className="hidden sm:inline text-[11px]">(services)</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rotate-45 rounded-[1px] bg-cyan-700" />
                  Locations
                  <span className="hidden sm:inline text-[11px]">(matériel & équipements)</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
                  Événements
                </span>
                <span className="w-full sm:w-auto text-[11px] leading-relaxed">
                  Cercle orange = prestataire (DJ, photo, traiteur). Losange cyan = location (habits, véhicule, sono).
                </span>
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
