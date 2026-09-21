'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useCatalogueView } from '@/components/CatalogueViewToggle';
import CatalogueSearchLayout from '@/components/CatalogueSearchLayout';
import { usePageSize } from '@/components/ui';
import CatalogueFilterBar, {
  CatalogueEntityFilterFields,
  type CatalogueFilterChip,
} from '@/components/CatalogueFilterBar';
import { useCatalogueQueryState } from '@/lib/catalogueQuery';
import {
  EMPTY_CATALOGUE_GEO,
  PRICE_UNIT_OPTIONS,
  SERVICE_CATEGORY_LABELS,
  rentalDeliveryFilterLabel,
  appendCatalogueGeoParams,
  catalogueGeoChips,
  catalogueItemToMapMarker,
  clearCatalogueGeoChip,
  resolveCatalogueGeo,
  sortCatalogueByDistance,
  serviceToCatalogueItem,
  type CatalogueGeoState,
  type PublicService,
  type RentalDeliveryFilter,
} from '@/lib/marketplace';
import { EMPTY_CATALOGUE_EXTRAS, clearCatalogueExtraChip } from '@/lib/catalogueEntityFilters';

type ServiceFilters = CatalogueGeoState & { category: string; priceUnit: string; delivery: RentalDeliveryFilter };

const emptyFilters: ServiceFilters = {
  ...EMPTY_CATALOGUE_GEO,
  category: '',
  priceUnit: '',
  delivery: '',
};

const QUERY_OPTS = {
  extraKeys: ['category', 'priceUnit', 'delivery'],
  emptyExtra: { category: '', priceUnit: '', delivery: '' },
  merge: (geo: CatalogueGeoState, extra: Record<string, string>): ServiceFilters => ({
    ...geo,
    category: extra.category || '',
    priceUnit: extra.priceUnit || '',
    delivery: extra.delivery === 'included' || extra.delivery === 'extra_fee' || extra.delivery === 'pickup' ? extra.delivery : '',
  }),
  split: (filters: ServiceFilters) => ({
    category: filters.category,
    priceUnit: filters.priceUnit,
    delivery: filters.delivery,
  }),
};

function MarketplaceRentalsPageInner() {
  const { mode, setView, gridCols, setGridCols } = useCatalogueView();
  const { q, setQ, searchQ, applied, draft, setDraft, page, applyFilters, setPage } = useCatalogueQueryState(QUERY_OPTS);
  const [services, setServices] = useState<PublicService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterError, setFilterError] = useState('');
  const [pageSize, setPageSize] = usePageSize('marketplace-rentals', 8);

  const load = useCallback(async (filters: ServiceFilters, search: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      appendCatalogueGeoParams(params, filters);
      if (filters.category) params.set('category', filters.category);
      if (filters.priceUnit) params.set('priceUnit', filters.priceUnit);
      if (filters.delivery) params.set('delivery', filters.delivery);
      params.set('group', 'rental');
      const data = await api.get(`/public/services${params.toString() ? `?${params}` : ''}`);
      setServices(data.services || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le matériel & équipements.');
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const items = useMemo(() => sortCatalogueByDistance(services.map(serviceToCatalogueItem)), [services]);
  const markers = useMemo(
    () =>
      items
        .filter((item) => item.latitude != null && item.longitude != null)
        .map(catalogueItemToMapMarker),
    [items],
  );

  const chips: CatalogueFilterChip[] = useMemo(() => {
    const extra: CatalogueFilterChip[] = [];
    if (applied.category) {
      extra.push({
        id: 'category',
        label: 'Matériel & Équipement',
        value: SERVICE_CATEGORY_LABELS[applied.category as keyof typeof SERVICE_CATEGORY_LABELS] || applied.category,
      });
    }
    if (applied.priceUnit) {
      extra.push({
        id: 'priceUnit',
        label: 'Tarif',
        value: PRICE_UNIT_OPTIONS.find((opt) => opt.id === applied.priceUnit)?.label || applied.priceUnit,
      });
    }
    if (applied.delivery) {
      extra.push({
        id: 'delivery',
        label: 'Livraison',
        value: rentalDeliveryFilterLabel(applied.delivery),
      });
    }
    return catalogueGeoChips(applied, extra);
  }, [applied]);

  useEffect(() => {
    void load(applied, searchQ);
  }, [applied, searchQ, load]);

  const searchCenter = applied.proximity && applied.lat != null && applied.lng != null
    ? { lat: applied.lat, lng: applied.lng }
    : null;

  return (
    <CatalogueSearchLayout
      activeNav="rentals"
      heroTitle="Matériel, chaises, équipements et véhicules"
      heroDescription="Chaises, mobilier, sonorisation, tentes, véhicules, tenues de cérémonie. Chaque fiche indique le retrait sur place, la livraison déjà comprise dans le tarif, ou la livraison en supplément."
      mode={mode}
      onViewChange={setView}
      gridCols={gridCols}
      items={items}
      markers={markers}
      loading={loading}
      error={error}
      emptyTitle="Nous cherchons encore la perle rare..."
      emptyDescription="Aucun équipement ou matériel ne correspond exactement à vos critères. Élargissez votre recherche pour découvrir d'autres options."
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      itemLabel="équipements"
      searchCenter={searchCenter}
      radiusKm={searchCenter ? applied.radiusKm : 0}
      city={applied.city}
      searchOriginLabel={applied.proximity === 'around' ? 'Vous êtes ici' : 'Lieu de recherche'}
      cta={{
        title: 'Vous proposez du Matériel & Équipements ?',
        description: 'Compte pro → métier de service : habits, véhicules, sono, tentes… photos, caution et calendrier.',
        primaryHref: '/register?kind=VENDOR&intent=vendor&action=rentals',
        primaryLabel: 'Proposer du matériel',
        secondaryHref: '/contact',
        secondaryLabel: 'Nous contacter',
      }}
      renderFilters={(variant) => (
        <CatalogueFilterBar
          variant={variant}
          hideViewToggle={variant === 'float'}
          compactToggle={variant === 'float'}
          search={q}
          onSearchChange={setQ}
          searchPlaceholder="Mobilier, sono, véhicule, tente…"
          view={mode}
          onViewChange={setView}
          gridCols={gridCols}
          onGridColsChange={setGridCols}
          chips={chips}
          resultLabel={!loading ? `${items.length} offre${items.length > 1 ? 's' : ''}` : undefined}
          onRemoveChip={(id) => applyFilters(clearCatalogueExtraChip(clearCatalogueGeoChip(applied, id), id))}
          onClearChips={() => applyFilters(emptyFilters)}
          onOpen={() => {
            setDraft(applied);
            setFilterError('');
          }}
          onApply={async () => {
            try {
              const geo = await resolveCatalogueGeo(draft);
              applyFilters({ ...geo, category: draft.category, priceUnit: draft.priceUnit, delivery: draft.delivery });
            } catch (err: unknown) {
              setFilterError(err instanceof Error ? err.message : 'Filtre de proximité impossible.');
              throw err;
            }
          }}
          modalTitle="Filtrer le matériel & équipements"
          filters={
            <CatalogueEntityFilterFields
              entity="rental"
              value={draft}
              extras={{
                ...EMPTY_CATALOGUE_EXTRAS,
                kind: 'rental',
                category: draft.category,
                priceUnit: draft.priceUnit,
                delivery: draft.delivery,
              }}
              error={filterError}
              onChange={(geo, extras) => setDraft({
                ...geo,
                category: extras.category,
                priceUnit: extras.priceUnit,
                delivery: extras.delivery,
              })}
            />
          }
        />
      )}
    />
  );
}

export default function MarketplaceRentalsPage() {
  return (
    <Suspense fallback={<div className="page-container py-16 text-sm text-muted">Chargement du matériel & équipements…</div>}>
      <MarketplaceRentalsPageInner />
    </Suspense>
  );
}
