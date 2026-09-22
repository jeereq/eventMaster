'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Wine } from 'lucide-react';
import { api } from '@/lib/api';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import MarketplacePublicNav from '@/components/MarketplacePublicNav';
import PublicCtaBand from '@/components/PublicCtaBand';
import CatalogueFilterBar, {
  CatalogueChoicePills,
  CatalogueFilterField,
  type CatalogueFilterChip,
} from '@/components/CatalogueFilterBar';
import { useCatalogueView } from '@/components/CatalogueViewToggle';
import { CatalogueResultsSkeleton } from '@/components/CatalogueResults';
import MarketplaceCatalogueSkeleton from '@/components/MarketplaceCatalogueSkeleton';
import { Input, Pagination, usePageSize, usePaginateItems } from '@/components/ui';
import { useCatalogueQueryState } from '@/lib/catalogueQuery';
import {
  EMPTY_CATALOGUE_GEO,
  catalogueGeoChips,
  clearCatalogueGeoChip,
  type CatalogueGeoState,
} from '@/lib/marketplace';
import DrinkProposals from '@/components/DrinkProposals';
import {
  BEVERAGE_KINDS,
  BEVERAGE_KIND_LABELS,
  BEVERAGE_SALE_UNITS,
  BEVERAGE_SALE_UNIT_LABELS,
  type BeverageBrandRow,
  type BeverageKind,
  type BeverageSaleUnit,
  type PublicBeverageOffer,
} from '@/lib/beverageBrands';

type DrinkFilters = CatalogueGeoState & {
  kind: string;
  brand: string;
  unit: string;
};

const emptyFilters: DrinkFilters = {
  ...EMPTY_CATALOGUE_GEO,
  kind: '',
  brand: '',
  unit: '',
};

const QUERY_OPTS = {
  extraKeys: ['kind', 'brand', 'unit'],
  emptyExtra: { kind: '', brand: '', unit: '' },
  merge: (geo: CatalogueGeoState, extra: Record<string, string>): DrinkFilters => ({
    ...geo,
    kind: BEVERAGE_KINDS.includes(extra.kind as BeverageKind) ? extra.kind : '',
    brand: typeof extra.brand === 'string' ? extra.brand.trim() : '',
    unit: BEVERAGE_SALE_UNITS.includes(extra.unit as BeverageSaleUnit) ? extra.unit : '',
  }),
  split: (filters: DrinkFilters) => ({
    kind: filters.kind,
    brand: filters.brand,
    unit: filters.unit,
  }),
};

const GRID_CLASS = {
  2: 'grid grid-cols-2 gap-2.5 sm:gap-5',
  3: 'grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4',
  4: 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4',
  5: 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-4',
} as const;

function boundPrice(value: string): number | null {
  const amount = Number(value);
  if (!value.trim() || !Number.isFinite(amount) || amount < 0) return null;
  return amount;
}

function matchesOffer(offer: PublicBeverageOffer, filters: DrinkFilters, search: string): boolean {
  if (filters.kind && offer.kind !== filters.kind) return false;
  if (filters.brand && offer.brandId !== filters.brand) return false;
  if (filters.unit && offer.unitKind !== filters.unit) return false;
  const min = boundPrice(filters.minPrice);
  const max = boundPrice(filters.maxPrice);
  if (min != null && offer.payableFc < min) return false;
  if (max != null && offer.payableFc > max) return false;
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [offer.brandName, offer.kindLabel, offer.vendorName, offer.producer, offer.country, offer.unitLabel]
    .filter(Boolean)
    .some((part) => String(part).toLowerCase().includes(q));
}

function MarketplaceDrinksPageInner() {
  const { mode, setView, gridCols, setGridCols } = useCatalogueView('grid', 'em-catalogue-view-drinks', { respectMobileList: true });
  const browse = mode === 'list' ? 'list' : 'grid';
  const { q, setQ, searchQ, applied, draft, setDraft, page, applyFilters, setPage } = useCatalogueQueryState(QUERY_OPTS);
  const [brands, setBrands] = useState<BeverageBrandRow[]>([]);
  const [offers, setOffers] = useState<PublicBeverageOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pageSize, setPageSize] = usePageSize('marketplace-drinks', 8);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get('/public/beverage-brands'),
      api.get('/public/beverage-offers'),
    ])
      .then(([brandData, offerData]) => {
        if (cancelled) return;
        setBrands(Array.isArray(brandData.brands) ? brandData.brands : []);
        setOffers(Array.isArray(offerData.offers) ? offerData.offers : []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Impossible de charger les propositions.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const brandOptions = useMemo(() => {
    const source = brands.length
      ? brands
      : offers.map((offer) => ({ id: offer.brandId, name: offer.brandName, kind: offer.kind }));
    const seen = new Set<string>();
    return source
      .filter((brand) => {
        if (seen.has(brand.id)) return false;
        seen.add(brand.id);
        if (draft.kind && brand.kind !== draft.kind) return false;
        return Boolean(brand.name);
      })
      .sort((left, right) => left.name.localeCompare(right.name, 'fr'))
      .map((brand) => ({ id: brand.id, label: brand.name }));
  }, [brands, offers, draft.kind]);

  const visibleOffers = useMemo(
    () => offers.filter((offer) => matchesOffer(offer, applied, searchQ)),
    [offers, applied, searchQ],
  );
  const pageItems = usePaginateItems(visibleOffers, page, pageSize);
  const brandNameById = useMemo(() => {
    const names = new Map<string, string>();
    for (const brand of brands) names.set(brand.id, brand.name);
    for (const offer of offers) {
      if (!names.has(offer.brandId)) names.set(offer.brandId, offer.brandName);
    }
    return names;
  }, [brands, offers]);

  const chips: CatalogueFilterChip[] = useMemo(() => {
    const extra: CatalogueFilterChip[] = [];
    if (applied.kind && BEVERAGE_KINDS.includes(applied.kind as BeverageKind)) {
      extra.push({
        id: 'kind',
        label: 'Famille',
        value: BEVERAGE_KIND_LABELS[applied.kind as BeverageKind],
      });
    }
    if (applied.brand) {
      extra.push({ id: 'brand', label: 'Marque', value: brandNameById.get(applied.brand) || 'Marque' });
    }
    if (applied.unit && BEVERAGE_SALE_UNITS.includes(applied.unit as BeverageSaleUnit)) {
      extra.push({
        id: 'unit',
        label: 'Quantité',
        value: BEVERAGE_SALE_UNIT_LABELS[applied.unit as BeverageSaleUnit],
      });
    }
    return catalogueGeoChips(applied, extra);
  }, [applied, brandNameById]);

  const removeChip = (id: string) => {
    if (id === 'kind' || id === 'brand' || id === 'unit') {
      applyFilters({ ...applied, [id]: '' });
      return;
    }
    applyFilters(clearCatalogueGeoChip(applied, id));
  };

  return (
    <PublicPageShell faqHref="/faq">
      <PublicPageHero
        compact
        title="Boissons"
        description="Bières, vins, champagnes. Le prix le plus bas d’un prestataire."
      >
        <MarketplacePublicNav active="drinks" />
      </PublicPageHero>

      <div className="page-container py-3 md:py-10 flex-1 space-y-3 md:space-y-6">
        <div className="sticky top-[var(--em-site-header)] z-20 -mx-1 px-1 py-0 md:py-1 bg-background/90 backdrop-blur-md">
          <CatalogueFilterBar
            search={q}
            onSearchChange={setQ}
            searchPlaceholder="Prestataire, marque…"
            searchLabel="Rechercher une proposition"
            view={browse}
            onViewChange={setView}
            hideMap
            gridCols={gridCols}
            onGridColsChange={setGridCols}
            chips={chips}
            resultLabel={!loading ? `${visibleOffers.length} proposition${visibleOffers.length > 1 ? 's' : ''}` : undefined}
            onRemoveChip={removeChip}
            onClearChips={() => applyFilters(emptyFilters)}
            onOpen={() => setDraft(applied)}
            onApply={() => applyFilters(draft)}
            modalTitle="Filtrer les propositions"
            shareTitle="Boissons"
            filters={(
              <>
                <CatalogueFilterField label="Famille">
                  <CatalogueChoicePills
                    ariaLabel="Famille de boissons"
                    options={BEVERAGE_KINDS.map((id) => ({ id, label: BEVERAGE_KIND_LABELS[id] }))}
                    value={draft.kind}
                    onChange={(id) => {
                      const brandKind = brands.find((brand) => brand.id === draft.brand)?.kind
                        || offers.find((offer) => offer.brandId === draft.brand)?.kind;
                      const brandStillFits = !draft.brand || !id || brandKind === id;
                      setDraft({ ...draft, kind: id, brand: brandStillFits ? draft.brand : '' });
                    }}
                  />
                </CatalogueFilterField>
                <CatalogueFilterField
                  label="Marque"
                >
                  {brandOptions.length ? (
                    <CatalogueChoicePills
                      ariaLabel="Marque"
                      options={brandOptions}
                      value={draft.brand}
                      onChange={(id) => setDraft({ ...draft, brand: id })}
                    />
                  ) : (
                    <p className="text-sm text-muted">
                      {draft.kind ? 'Aucune marque pour cette famille.' : 'Aucune marque au catalogue.'}
                    </p>
                  )}
                </CatalogueFilterField>
                <CatalogueFilterField
                  label="Quantité"
                >
                  <CatalogueChoicePills
                    ariaLabel="Type de quantité"
                    options={BEVERAGE_SALE_UNITS.map((id) => ({ id, label: BEVERAGE_SALE_UNIT_LABELS[id] }))}
                    value={draft.unit}
                    onChange={(id) => setDraft({ ...draft, unit: BEVERAGE_SALE_UNITS.includes(id as BeverageSaleUnit) ? id : '' })}
                  />
                </CatalogueFilterField>
                <CatalogueFilterField label="Prix (FC)">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={draft.minPrice}
                      onChange={(e) => setDraft({ ...draft, minPrice: e.target.value })}
                      placeholder="Min"
                      aria-label="Prix minimum en francs"
                    />
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={draft.maxPrice}
                      onChange={(e) => setDraft({ ...draft, maxPrice: e.target.value })}
                      placeholder="Max"
                      aria-label="Prix maximum en francs"
                    />
                  </div>
                </CatalogueFilterField>
              </>
            )}
          />
        </div>

        {error ? (
          <p className="text-sm text-danger" role="alert">{error}</p>
        ) : null}

        {loading ? (
          <CatalogueResultsSkeleton
            mode={browse === 'list' ? 'list' : 'grid'}
            count={pageSize}
            gridCols={gridCols}
            label="Chargement des propositions"
          />
        ) : error && visibleOffers.length === 0 ? null : visibleOffers.length === 0 ? (
          <div className="text-center py-16 px-6 border border-dashed border-border rounded-[var(--radius-card)] bg-surface">
            <Wine className="w-10 h-10 text-muted mx-auto mb-3" aria-hidden="true" />
            <h2 className="font-semibold text-foreground">
              {offers.length === 0 ? 'Aucune proposition publiée' : 'Aucune proposition pour ces filtres'}
            </h2>
            <p className="text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">
              {offers.length === 0
                ? 'Les offres des prestataires apparaîtront ici.'
                : 'Élargissez la marque ou le prix.'}
            </p>
          </div>
        ) : (
          <DrinkProposals
            offers={pageItems}
            layout={browse === 'list' ? 'list' : 'grid'}
            gridClass={GRID_CLASS[gridCols]}
          />
        )}

        {!loading && !(error && visibleOffers.length === 0) && visibleOffers.length > 0 ? (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={visibleOffers.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="propositions"
          />
        ) : null}
      </div>

      <PublicCtaBand
        title="Vous vendez ces boissons ?"
        description="Publiez vos marques et vos prix."
        primaryHref="/register?kind=VENDOR&intent=vendor"
        primaryLabel="Devenir prestataire"
        secondaryHref="/contact"
        secondaryLabel="Nous contacter"
      />
    </PublicPageShell>
  );
}

export default function MarketplaceDrinksPage() {
  return (
    <Suspense fallback={(
      <MarketplaceCatalogueSkeleton
        active="drinks"
        title="Boissons"
        description="Bières, vins, champagnes. Le prix le plus bas d’un prestataire."
        label="Chargement des propositions"
      />
    )}>
      <MarketplaceDrinksPageInner />
    </Suspense>
  );
}
