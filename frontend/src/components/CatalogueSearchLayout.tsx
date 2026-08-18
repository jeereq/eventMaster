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
  itemLabel,
  mode,
  onViewChange,
  searchCenter,
  radiusKm,
  city,
  searchOriginLabel,
  showKindLegend = false,
}: {
  activeNav: 'hub' | 'venues' | 'services';
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
  itemLabel: string;
  mode: CatalogueViewMode;
  onViewChange: (mode: CatalogueViewMode) => void;
  searchCenter?: { lat: number; lng: number } | null;
  radiusKm?: number;
  city?: string | null;
  searchOriginLabel?: string;
  showKindLegend?: boolean;
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
        <div className="relative isolate flex-1 min-h-0">
          <div className="absolute inset-0 z-0">
            <MarketplaceLocationsMap
              className="h-full"
              markers={markers}
              listingSearch={false}
              navigateOnClick={false}
              height={480}
              variant="focus"
              searchCenter={searchCenter}
              radiusKm={searchCenter ? radiusKm : 0}
              city={city}
              searchOriginLabel={searchOriginLabel}
            />
          </div>
          <div className="absolute inset-x-0 top-0 z-10 p-3 sm:p-4 space-y-2 bg-gradient-to-b from-background via-background/70 to-transparent pointer-events-none">
            <div className="pointer-events-auto flex items-start gap-2">
              <MarketplacePublicNav
                active={activeNav}
                className="flex-1 min-w-0 bg-surface/95 backdrop-blur-xl border-white/25 dark:border-white/10 shadow-lg"
              />
              <button
                type="button"
                onClick={exitMap}
                className="h-9 shrink-0 inline-flex items-center gap-1.5 px-3 rounded-full bg-surface/95 backdrop-blur-xl border border-white/25 dark:border-white/10 shadow-lg text-xs font-semibold text-foreground hover:bg-surface"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                Quitter
              </button>
            </div>
            <div className="pointer-events-auto max-w-2xl">
              {renderFilters('float')}
            </div>
            {error ? <p className="pointer-events-auto text-sm text-rose-600 bg-surface/95 rounded-lg px-3 py-2 shadow-lg">{error}</p> : null}
            {loading ? (
              <p className="pointer-events-none text-[11px] font-medium text-muted bg-surface/95 rounded-full px-3 py-1.5 w-fit shadow-lg">
                Mise à jour de la carte…
              </p>
            ) : null}
          </div>
        </div>
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
                <span>Bâtiment = salle, étoile = prestataire. Survolez pour le tarif, le lieu et la distance.</span>
              </div>
            )}
            {loading && markers.length === 0 ? (
              <CatalogueResultsSkeleton mode={mode} count={pageSize} />
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
          <CatalogueResultsSkeleton mode={mode} count={pageSize} />
        ) : (
          <>
            <CatalogueResults
              items={paginateItems(items, page, pageSize)}
              mode={mode === 'list' ? 'list' : 'grid'}
              emptyTitle={emptyTitle}
              emptyDescription={emptyDescription}
            />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={items.length}
              onPageChange={onPageChange}
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
