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
  appendCatalogueGeoParams,
  catalogueGeoChips,
  catalogueItemToMapMarker,
  clearCatalogueGeoChip,
  resolveCatalogueGeo,
  sortCatalogueByDistance,
  serviceToCatalogueItem,
  type CatalogueGeoState,
  type PublicService,
  type ServiceMobility,
} from '@/lib/marketplace';
import { EMPTY_CATALOGUE_EXTRAS, clearCatalogueExtraChip } from '@/lib/catalogueEntityFilters';

type ServiceFilters = CatalogueGeoState & { category: string; priceUnit: string; mobility: ServiceMobility };

const emptyFilters: ServiceFilters = {
  ...EMPTY_CATALOGUE_GEO,
  category: '',
  priceUnit: '',
  mobility: '',
};

const QUERY_OPTS = {
  extraKeys: ['category', 'priceUnit', 'mobility'],
  emptyExtra: { category: '', priceUnit: '', mobility: '' },
  merge: (geo: CatalogueGeoState, extra: Record<string, string>): ServiceFilters => ({
    ...geo,
    category: extra.category || '',
    priceUnit: extra.priceUnit || '',
    mobility: (extra.mobility as ServiceMobility) || '',
  }),
  split: (filters: ServiceFilters) => ({
    category: filters.category,
    priceUnit: filters.priceUnit,
    mobility: filters.mobility,
  }),
};

function MarketplaceServicesPageInner() {
  const { mode, setView, gridCols, setGridCols } = useCatalogueView();
  const { q, setQ, searchQ, applied, draft, setDraft, page, applyFilters, setPage } = useCatalogueQueryState(QUERY_OPTS);
  const [services, setServices] = useState<PublicService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterError, setFilterError] = useState('');
  const [pageSize, setPageSize] = usePageSize('marketplace-services', 8);

  const load = useCallback(async (filters: ServiceFilters, search: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      appendCatalogueGeoParams(params, filters);
      if (filters.category) params.set('category', filters.category);
      if (filters.priceUnit) params.set('priceUnit', filters.priceUnit);
      if (filters.mobility) params.set('mobility', filters.mobility);
      params.set('group', 'trade');
      const data = await api.get(`/public/services${params.toString() ? `?${params}` : ''}`);
      setServices(data.services || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les prestataires.');
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
        label: 'Catégorie',
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
    if (applied.mobility) {
      extra.push({
        id: 'mobility',
        label: 'Intervention',
        value: applied.mobility === 'on_site' ? 'Sur place' : 'Se déplace',
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
      activeNav="services"
      heroTitle="Trouvez un prestataire pour votre événement"
      heroDescription="Traiteur, photo, DJ, déco… Le matériel et les équipements (mobilier, véhicules, sono) ont leur propre onglet."
      mode={mode}
      onViewChange={setView}
      gridCols={gridCols}
      items={items}
      markers={markers}
      loading={loading}
      error={error}
      emptyTitle="Nous cherchons encore la perle rare..."
      emptyDescription="Aucun prestataire ne correspond exactement à vos critères. Élargissez votre recherche pour découvrir de nouveaux talents."
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      itemLabel="prestataires"
      searchCenter={searchCenter}
      radiusKm={searchCenter ? applied.radiusKm : 0}
      city={applied.city}
      searchOriginLabel={applied.proximity === 'around' ? 'Vous êtes ici' : 'Lieu de recherche'}
      cta={{
        title: 'Vous proposez un service ?',
        description: 'Publiez votre prestation avec zone d’intervention, médias et calendrier.',
        primaryHref: '/register',
        primaryLabel: 'Proposer mes services',
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
          searchPlaceholder="Nom, prestataire…"
          view={mode}
          onViewChange={setView}
          gridCols={gridCols}
          onGridColsChange={setGridCols}
          chips={chips}
          resultLabel={!loading ? `${items.length} prestataire${items.length > 1 ? 's' : ''}` : undefined}
          onRemoveChip={(id) => applyFilters(clearCatalogueExtraChip(clearCatalogueGeoChip(applied, id), id))}
          onClearChips={() => applyFilters(emptyFilters)}
          onOpen={() => {
            setDraft(applied);
            setFilterError('');
          }}
          onApply={async () => {
            try {
              const geo = await resolveCatalogueGeo(draft);
              applyFilters({ ...geo, category: draft.category, priceUnit: draft.priceUnit, mobility: draft.mobility });
            } catch (err: unknown) {
              setFilterError(err instanceof Error ? err.message : 'Filtre de proximité impossible.');
              throw err;
            }
          }}
          modalTitle="Filtrer les prestataires"
          filters={
            <CatalogueEntityFilterFields
              entity="service"
              value={draft}
              extras={{
                ...EMPTY_CATALOGUE_EXTRAS,
                kind: 'service',
                category: draft.category,
                priceUnit: draft.priceUnit,
                mobility: draft.mobility,
              }}
              error={filterError}
              onChange={(geo, extras) => setDraft({
                ...geo,
                category: extras.category,
                priceUnit: extras.priceUnit,
                mobility: extras.mobility,
              })}
            />
          }
        />
      )}
    />
  );
}

export default function MarketplaceServicesPage() {
  return (
    <Suspense fallback={<div className="page-container py-16 text-sm text-muted">Chargement des prestataires…</div>}>
      <MarketplaceServicesPageInner />
    </Suspense>
  );
}
