'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import CatalogueSearchLayout from '@/components/CatalogueSearchLayout';
import { usePageSize } from '@/components/ui';
import { useCatalogueView } from '@/components/CatalogueViewToggle';
import CatalogueFilterBar, {
  CatalogueChoicePills,
  CatalogueFilterField,
  CatalogueGeoFields,
} from '@/components/CatalogueFilterBar';
import { useCatalogueQueryState } from '@/lib/catalogueQuery';
import {
  EMPTY_CATALOGUE_GEO,
  SERVICE_MOBILITY_OPTIONS,
  appendCatalogueGeoParams,
  catalogueGeoChips,
  catalogueItemToMapMarker,
  clearCatalogueGeoChip,
  resolveCatalogueGeo,
  serviceToCatalogueItem,
  sortCatalogueByDistance,
  venueToCatalogueItem,
  type CatalogueGeoState,
  type PublicService,
  type PublicVenue,
  type ServiceMobility,
} from '@/lib/marketplace';

type HubFilters = CatalogueGeoState & { kind: 'all' | 'venue' | 'service'; mobility: ServiceMobility };

const emptyFilters: HubFilters = {
  ...EMPTY_CATALOGUE_GEO,
  kind: 'all',
  mobility: '',
};

const QUERY_OPTS = {
  extraKeys: ['kind', 'mobility'],
  emptyExtra: { kind: 'all', mobility: '' },
  merge: (geo: CatalogueGeoState, extra: Record<string, string>): HubFilters => ({
    ...geo,
    kind: extra.kind === 'venue' || extra.kind === 'service' ? extra.kind : 'all',
    mobility: (extra.mobility as ServiceMobility) || '',
  }),
  split: (filters: HubFilters) => ({
    kind: filters.kind,
    mobility: filters.mobility,
  }),
};

function MarketplaceHubPageInner() {
  const { mode, setView, gridCols, setGridCols } = useCatalogueView();
  const { q: query, setQ: setQuery, searchQ, applied, draft, setDraft, page, applyFilters, setPage } = useCatalogueQueryState(QUERY_OPTS);
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterError, setFilterError] = useState('');
  const [pageSize, setPageSize] = usePageSize('marketplace-hub', 12);

  const load = useCallback(async (filters: HubFilters, search: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      appendCatalogueGeoParams(params, filters);
      const venueQs = params.toString() ? `?${params}` : '';
      const serviceParams = new URLSearchParams(params);
      if (filters.mobility) serviceParams.set('mobility', filters.mobility);
      const serviceQs = serviceParams.toString() ? `?${serviceParams}` : '';
      const [venuesData, servicesData] = await Promise.all([
        api.get(`/public/venues${venueQs}`).catch(() => ({ venues: [] })),
        api.get(`/public/services${serviceQs}`).catch(() => ({ services: [] })),
      ]);
      setVenues(venuesData.venues || []);
      setServices(servicesData.services || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(applied, searchQ);
  }, [applied, searchQ, load]);

  const items = useMemo(
    () => sortCatalogueByDistance([
      ...venues.map(venueToCatalogueItem),
      ...services.map(serviceToCatalogueItem),
    ]),
    [venues, services],
  );

  const visible = useMemo(() => {
    if (applied.kind === 'all') return items;
    return items.filter((item) => item.kind === applied.kind);
  }, [items, applied.kind]);

  const markers = useMemo(
    () =>
      visible
        .filter((item) => item.latitude != null && item.longitude != null)
        .map(catalogueItemToMapMarker),
    [visible],
  );

  const searchCenter = applied.proximity && applied.lat != null && applied.lng != null
    ? { lat: applied.lat, lng: applied.lng }
    : null;

  const chips = catalogueGeoChips(
    applied,
    [
      ...(applied.kind === 'all' ? [] : [{ id: 'kind', label: 'Type', value: applied.kind === 'venue' ? 'Salles' : 'Prestataires' }]),
      ...(applied.mobility
        ? [{ id: 'mobility', label: 'Intervention', value: applied.mobility === 'on_site' ? 'Sur place' : 'Se déplace' }]
        : []),
    ],
  );

  return (
    <CatalogueSearchLayout
      activeNav="hub"
      heroTitle="Salles et prestataires près de chez vous"
      heroDescription="Explorez le marketplace EventMaster. Affinez par ville, commune, prix ou autour de vous."
      mode={mode}
      onViewChange={setView}
      gridCols={gridCols}
      items={visible}
      markers={markers}
      loading={loading}
      emptyTitle="Aucune fiche pour cette recherche"
      emptyDescription="Élargissez les mots-clés, ou publiez une salle / prestation depuis votre organisation."
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      itemLabel="fiches"
      searchCenter={searchCenter}
      radiusKm={searchCenter ? applied.radiusKm : 0}
      city={applied.city}
      searchOriginLabel={applied.proximity === 'around' ? 'Vous êtes ici' : 'Lieu de recherche'}
      showKindLegend
      cta={{
        title: 'Vous proposez une salle ou un service ?',
        description: 'Publiez une fiche depuis votre organisation EventMaster, avec photos, vidéos, carte et calendrier.',
        primaryHref: '/register',
        primaryLabel: 'Créer un compte',
        secondaryHref: '/contact',
        secondaryLabel: 'Nous contacter',
      }}
      renderFilters={(variant) => (
        <CatalogueFilterBar
          variant={variant}
          hideViewToggle={variant === 'float' && mode !== 'focus'}
          compactToggle={variant === 'float'}
          search={query}
          onSearchChange={setQuery}
          searchPlaceholder="Nom, organisation, ville…"
          view={mode}
          onViewChange={setView}
          gridCols={gridCols}
          onGridColsChange={setGridCols}
          resultLabel={!loading ? `${visible.length} fiche${visible.length > 1 ? 's' : ''}` : undefined}
          chips={chips}
          onRemoveChip={(id) => {
            if (id === 'kind') applyFilters({ ...applied, kind: 'all' });
            else if (id === 'mobility') applyFilters({ ...applied, mobility: '' });
            else applyFilters({ ...clearCatalogueGeoChip(applied, id), kind: applied.kind, mobility: applied.mobility });
          }}
          onClearChips={() => applyFilters(emptyFilters)}
          onOpen={() => {
            setDraft(applied);
            setFilterError('');
          }}
          onApply={async () => {
            try {
              const geo = await resolveCatalogueGeo(draft);
              applyFilters({ ...geo, kind: draft.kind, mobility: draft.mobility });
            } catch (err: unknown) {
              setFilterError(err instanceof Error ? err.message : 'Filtre de proximité impossible.');
              throw err;
            }
          }}
          modalTitle="Filtrer le marketplace"
          filters={
            <>
              <CatalogueFilterField label="Salles ou prestataires">
                <CatalogueChoicePills
                  options={[
                    { id: 'all', label: 'Tous' },
                    { id: 'venue', label: 'Salles' },
                    { id: 'service', label: 'Prestataires' },
                  ]}
                  value={draft.kind}
                  onChange={(id) => setDraft((d) => ({ ...d, kind: (id as HubFilters['kind']) || 'all' }))}
                />
              </CatalogueFilterField>
              <CatalogueGeoFields
                value={draft}
                onChange={(next) => setDraft({ ...next, kind: draft.kind, mobility: draft.mobility })}
                error={filterError}
                showCapacity={draft.kind !== 'service'}
              />
              <CatalogueFilterField label="Prestataires — intervention">
                <CatalogueChoicePills
                  options={SERVICE_MOBILITY_OPTIONS.filter((opt) => opt.id)}
                  value={draft.mobility}
                  onChange={(id) => setDraft((d) => ({ ...d, mobility: (id as ServiceMobility) || '' }))}
                />
              </CatalogueFilterField>
            </>
          }
        />
      )}
    />
  );
}

export default function MarketplaceHubPage() {
  return (
    <Suspense fallback={<div className="page-container py-16 text-sm text-muted">Chargement du marketplace…</div>}>
      <MarketplaceHubPageInner />
    </Suspense>
  );
}
