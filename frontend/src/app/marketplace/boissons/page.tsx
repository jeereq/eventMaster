'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Wine } from 'lucide-react';
import { api } from '@/lib/api';
import { formatFc } from '@/config/landingPricing';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import MarketplacePublicNav from '@/components/MarketplacePublicNav';
import PublicCtaBand from '@/components/PublicCtaBand';
import CatalogueFilterBar, {
  CatalogueChoicePills,
  CatalogueFilterField,
  type CatalogueFilterChip,
} from '@/components/CatalogueFilterBar';
import { useCatalogueView } from '@/components/CatalogueViewToggle';
import { Input, Pagination, usePageSize, usePaginateItems } from '@/components/ui';
import { useCatalogueQueryState } from '@/lib/catalogueQuery';
import {
  EMPTY_CATALOGUE_GEO,
  catalogueGeoChips,
  clearCatalogueGeoChip,
  type CatalogueGeoState,
} from '@/lib/marketplace';
import { cn } from '@/lib/cn';
import {
  BEVERAGE_KINDS,
  BEVERAGE_KIND_LABELS,
  type BeverageBrandRow,
  type BeverageKind,
} from '@/lib/beverageBrands';

type DrinkFilters = CatalogueGeoState & {
  kind: string;
  priced: string;
};

const emptyFilters: DrinkFilters = {
  ...EMPTY_CATALOGUE_GEO,
  kind: '',
  priced: '',
};

const QUERY_OPTS = {
  extraKeys: ['kind', 'priced'],
  emptyExtra: { kind: '', priced: '' },
  merge: (geo: CatalogueGeoState, extra: Record<string, string>): DrinkFilters => ({
    ...geo,
    kind: BEVERAGE_KINDS.includes(extra.kind as BeverageKind) ? extra.kind : '',
    priced: extra.priced === 'yes' || extra.priced === 'no' ? extra.priced : '',
  }),
  split: (filters: DrinkFilters) => ({
    kind: filters.kind,
    priced: filters.priced,
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

function matchesDrinks(brand: BeverageBrandRow, filters: DrinkFilters, search: string): boolean {
  if (filters.kind && brand.kind !== filters.kind) return false;
  if (filters.priced === 'yes' && brand.priceFromFc == null) return false;
  if (filters.priced === 'no' && brand.priceFromFc != null) return false;
  const min = boundPrice(filters.minPrice);
  const max = boundPrice(filters.maxPrice);
  if (min != null || max != null) {
    if (brand.priceFromFc == null) return false;
    if (min != null && brand.priceFromFc < min) return false;
    if (max != null && brand.priceFromFc > max) return false;
  }
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [brand.name, brand.kindLabel, brand.producer, brand.country, brand.volumeLabel]
    .filter(Boolean)
    .some((part) => String(part).toLowerCase().includes(q));
}

function MarketplaceDrinksPageInner() {
  const { mode, setView, gridCols, setGridCols } = useCatalogueView('grid', 'em-catalogue-view-drinks', { respectMobileList: true });
  const browse = mode === 'list' ? 'list' : 'grid';
  const { q, setQ, searchQ, applied, draft, setDraft, page, applyFilters, setPage } = useCatalogueQueryState(QUERY_OPTS);
  const [brands, setBrands] = useState<BeverageBrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pageSize, setPageSize] = usePageSize('marketplace-drinks', 8);

  useEffect(() => {
    let cancelled = false;
    api.get('/public/beverage-brands')
      .then((data) => {
        if (!cancelled) setBrands(Array.isArray(data.brands) ? data.brands : []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Impossible de charger les boissons.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(
    () => brands.filter((brand) => matchesDrinks(brand, applied, searchQ)),
    [brands, applied, searchQ],
  );
  const pageItems = usePaginateItems(visible, page, pageSize);

  const chips: CatalogueFilterChip[] = useMemo(() => {
    const extra: CatalogueFilterChip[] = [];
    if (applied.kind && BEVERAGE_KINDS.includes(applied.kind as BeverageKind)) {
      extra.push({
        id: 'kind',
        label: 'Famille',
        value: BEVERAGE_KIND_LABELS[applied.kind as BeverageKind],
      });
    }
    if (applied.priced === 'yes' || applied.priced === 'no') {
      extra.push({
        id: 'priced',
        label: 'Tarif',
        value: applied.priced === 'yes' ? 'Avec tarif' : 'Tarif à venir',
      });
    }
    return catalogueGeoChips(applied, extra);
  }, [applied]);

  const removeChip = (id: string) => {
    if (id === 'kind' || id === 'priced') {
      applyFilters({ ...applied, [id]: '' });
      return;
    }
    applyFilters(clearCatalogueGeoChip(applied, id));
  };

  return (
    <PublicPageShell faqHref="/faq">
      <PublicPageHero
        compact
        title="Boissons et prix"
        description="Bières, boissons, vins et champagnes du catalogue EventMaster. Le prix affiché est le plus bas publié par un prestataire. Une promotion en cours remplace le tarif normal jusqu’à sa date de fin."
      >
        <MarketplacePublicNav active="drinks" />
      </PublicPageHero>

      <div className="page-container py-3 md:py-10 flex-1 space-y-3 md:space-y-6">
        <div className="sticky top-[var(--em-site-header)] z-20 -mx-1 px-1 py-0 md:py-1 bg-background/90 backdrop-blur-md">
          <CatalogueFilterBar
            search={q}
            onSearchChange={setQ}
            searchPlaceholder="Nom, producteur, volume…"
            searchLabel="Rechercher une boisson"
            view={browse}
            onViewChange={setView}
            hideMap
            gridCols={gridCols}
            onGridColsChange={setGridCols}
            chips={chips}
            resultLabel={!loading ? `${visible.length} boisson${visible.length > 1 ? 's' : ''}` : undefined}
            onRemoveChip={removeChip}
            onClearChips={() => applyFilters(emptyFilters)}
            onOpen={() => setDraft(applied)}
            onApply={() => applyFilters(draft)}
            modalTitle="Filtrer les boissons"
            shareTitle="Boissons et prix"
            filters={(
              <>
                <CatalogueFilterField
                  label="Famille"
                  hint="Bière, boisson, vin ou champagne. Un second clic retire le choix."
                >
                  <CatalogueChoicePills
                    ariaLabel="Famille de boissons"
                    options={BEVERAGE_KINDS.map((id) => ({ id, label: BEVERAGE_KIND_LABELS[id] }))}
                    value={draft.kind}
                    onChange={(id) => setDraft({ ...draft, kind: id })}
                  />
                </CatalogueFilterField>
                <CatalogueFilterField
                  label="Tarif publié"
                  hint="Le montant est le plus bas d’un prestataire, promotion en cours comprise."
                >
                  <CatalogueChoicePills
                    ariaLabel="Tarif publié"
                    options={[
                      { id: 'yes', label: 'Avec tarif' },
                      { id: 'no', label: 'Tarif à venir' },
                    ]}
                    value={draft.priced}
                    onChange={(id) => setDraft({ ...draft, priced: id === 'yes' || id === 'no' ? id : '' })}
                  />
                </CatalogueFilterField>
                <CatalogueFilterField label="Prix (FC)" hint="Compare le prix le plus bas déjà publié.">
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
          <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">{error}</p>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted" role="status">Chargement des boissons…</p>
        ) : error && visible.length === 0 ? null : visible.length === 0 ? (
          <div className="text-center py-16 px-6 border border-dashed border-border rounded-[var(--radius-card)] bg-surface">
            <Wine className="w-10 h-10 text-muted mx-auto mb-3" aria-hidden="true" />
            <h2 className="font-semibold text-foreground">
              {brands.length === 0 ? 'Aucune boisson au catalogue' : 'Aucune boisson pour ces filtres'}
            </h2>
            <p className="text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">
              {brands.length === 0
                ? 'Les boissons ajoutées par EventMaster apparaîtront ici, avec le prix prestataire dès qu’il est publié.'
                : 'Élargissez la famille, le prix ou le nom recherché.'}
            </p>
          </div>
        ) : browse === 'list' ? (
          <ul className="space-y-2">
            {pageItems.map((brand) => (
              <li key={brand.id}>
                <DrinkRow brand={brand} />
              </li>
            ))}
          </ul>
        ) : (
          <ul className={GRID_CLASS[gridCols]}>
            {pageItems.map((brand) => (
              <li key={brand.id}>
                <DrinkCard brand={brand} />
              </li>
            ))}
          </ul>
        )}

        {!loading && !(error && visible.length === 0) && visible.length > 0 ? (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={visible.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="boissons"
          />
        ) : null}
      </div>

      <PublicCtaBand
        title="Vous vendez ces boissons ?"
        description="Indiquez vos marques, le conditionnement (bouteille, casier, pack) et le prix, promotion comprise."
        primaryHref="/register?kind=VENDOR&intent=vendor"
        primaryLabel="Devenir prestataire"
        secondaryHref="/contact"
        secondaryLabel="Nous contacter"
      />
    </PublicPageShell>
  );
}

function DrinkCover({ brand, className }: { brand: BeverageBrandRow; className?: string }) {
  if (brand.imageUrl) {
    return (
      <img
        src={brand.imageUrl}
        alt={`Visuel de ${brand.name}`}
        loading="lazy"
        decoding="async"
        className={cn('w-full h-full object-cover', className)}
      />
    );
  }
  return (
    <div className={cn('w-full h-full flex items-center justify-center text-muted', className)}>
      <Wine className="w-8 h-8" aria-hidden="true" />
    </div>
  );
}

function DrinkCard({ brand }: { brand: BeverageBrandRow }) {
  const meta = [brand.volumeLabel, brand.producer, brand.country].filter(Boolean).join(' · ');
  return (
    <article className="h-full rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden">
      <div className="aspect-[4/3] bg-surface-muted">
        <DrinkCover brand={brand} />
      </div>
      <div className="p-3 space-y-1">
        <p className="text-xs font-semibold text-muted">{brand.kindLabel}</p>
        <h2 className="text-sm font-bold text-foreground leading-snug">{brand.name}</h2>
        <p className="text-xs text-muted truncate">{meta || 'Catalogue EventMaster'}</p>
        <p className="text-sm font-semibold text-foreground tabular-nums pt-1">
          {brand.priceFromFc != null ? `Dès ${formatFc(brand.priceFromFc)}` : 'Tarif à venir'}
        </p>
        <p className="text-xs text-muted">
          {brand.vendorCount
            ? `${brand.vendorCount} prestataire${brand.vendorCount > 1 ? 's' : ''}`
            : 'Aucun tarif publié'}
        </p>
      </div>
    </article>
  );
}

function DrinkRow({ brand }: { brand: BeverageBrandRow }) {
  const meta = [brand.kindLabel, brand.volumeLabel, brand.producer, brand.country].filter(Boolean).join(' · ');
  return (
    <article className="flex items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-2.5 sm:p-3">
      <div className="w-20 h-16 sm:w-28 sm:h-20 rounded-md overflow-hidden bg-surface-muted shrink-0">
        <DrinkCover brand={brand} />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-foreground truncate">{brand.name}</h2>
        <p className="text-xs text-muted truncate">{meta || 'Catalogue EventMaster'}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-foreground tabular-nums">
          {brand.priceFromFc != null ? `Dès ${formatFc(brand.priceFromFc)}` : 'Tarif à venir'}
        </p>
        <p className="text-xs text-muted">
          {brand.vendorCount
            ? `${brand.vendorCount} prestataire${brand.vendorCount > 1 ? 's' : ''}`
            : 'Aucun tarif publié'}
        </p>
      </div>
    </article>
  );
}

export default function MarketplaceDrinksPage() {
  return (
    <Suspense fallback={<div className="page-container py-16 text-sm text-muted">Chargement des boissons…</div>}>
      <MarketplaceDrinksPageInner />
    </Suspense>
  );
}
