'use client';

import React, { useEffect, useRef } from 'react';
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

  return (
    <PublicPageShell faqHref="/faq">
      {mode !== 'focus' && (
        <PublicPageHero compact chip="Catalogue" title={heroTitle} description={heroDescription}>
          <MarketplacePublicNav active={activeNav} />
        </PublicPageHero>
      )}

      <main className="page-container py-6 sm:py-10 flex-1 space-y-4 sm:space-y-6">
        {mode === 'focus' && <MarketplacePublicNav active={activeNav} />}
        {renderFilters('card')}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        {loading ? (
          <CatalogueResultsSkeleton mode={mode} count={pageSize} />
        ) : mapMode ? (
          <div className="space-y-3">
            {mode !== 'focus' && showKindLegend && (
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
            <MarketplaceLocationsMap
              markers={markers}
              listingSearch
              navigateOnClick={false}
              height={480}
              variant={mode === 'focus' ? 'focus' : 'default'}
              searchCenter={searchCenter}
              radiusKm={searchCenter ? radiusKm : 0}
              city={city}
              searchOriginLabel={searchOriginLabel}
            />
          </div>
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

      {mode !== 'focus' && (
        <PublicCtaBand
          title={cta.title}
          description={cta.description}
          primaryHref={cta.primaryHref}
          primaryLabel={cta.primaryLabel}
          secondaryHref={cta.secondaryHref}
          secondaryLabel={cta.secondaryLabel}
        />
      )}
    </PublicPageShell>
  );
}
