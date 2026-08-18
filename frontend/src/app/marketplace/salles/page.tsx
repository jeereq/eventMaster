'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  EMPTY_CATALOGUE_GEO,
  appendCatalogueGeoParams,
  catalogueGeoChips,
  catalogueItemToMapMarker,
  clearCatalogueGeoChip,
  resolveCatalogueGeo,
  sortCatalogueByDistance,
  venueToCatalogueItem,
  type CatalogueGeoState,
  type PublicVenue,
} from '@/lib/marketplace';
import { useCatalogueQueryState } from '@/lib/catalogueQuery';
import { EMPTY_CATALOGUE_EXTRAS, ROOM_TYPE_FILTER_OPTIONS } from '@/lib/catalogueEntityFilters';
import { useCatalogueView } from '@/components/CatalogueViewToggle';
import CatalogueSearchLayout from '@/components/CatalogueSearchLayout';
import { usePageSize } from '@/components/ui';
import CatalogueFilterBar, {
  CatalogueEntityFilterFields,
  type CatalogueFilterChip,
} from '@/components/CatalogueFilterBar';

type VenueFilters = CatalogueGeoState & { roomType: string };

const emptyFilters: VenueFilters = {
  ...EMPTY_CATALOGUE_GEO,
  roomType: '',
};

const QUERY_OPTS = {
  extraKeys: ['roomType'],
  emptyExtra: { roomType: '' },
  merge: (geo: CatalogueGeoState, extra: Record<string, string>): VenueFilters => ({
    ...geo,
    roomType: extra.roomType || '',
  }),
  split: (filters: VenueFilters) => ({ roomType: filters.roomType }),
};

function MarketplaceVenuesPageInner() {
  const { mode, setView, gridCols, setGridCols } = useCatalogueView();
  const { q, setQ, searchQ, applied, draft, setDraft, page, applyFilters, setPage } = useCatalogueQueryState(QUERY_OPTS);
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterError, setFilterError] = useState('');
  const [pageSize, setPageSize] = usePageSize('marketplace-venues', 12);

  const load = useCallback(async (filters: VenueFilters, search: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      appendCatalogueGeoParams(params, filters);
      if (filters.roomType) params.set('roomType', filters.roomType);
      const data = await api.get(`/public/venues${params.toString() ? `?${params}` : ''}`);
      setVenues(data.venues || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les salles.');
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const items = useMemo(() => sortCatalogueByDistance(venues.map(venueToCatalogueItem)), [venues]);
  const markers = useMemo(
    () =>
      items
        .filter((item) => item.latitude != null && item.longitude != null)
        .map(catalogueItemToMapMarker),
    [items],
  );

  const chips: CatalogueFilterChip[] = useMemo(() => {
    const extra: CatalogueFilterChip[] = [];
    if (applied.roomType) {
      extra.push({
        id: 'roomType',
        label: 'Type',
        value: ROOM_TYPE_FILTER_OPTIONS.find((opt) => opt.id === applied.roomType)?.label || applied.roomType,
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
      activeNav="venues"
      heroTitle="Trouvez une salle pour votre événement"
      heroDescription="Parcourez les lieux publiés. Filtrez par ville, commune, quartier, prix ou autour de vous."
      mode={mode}
      onViewChange={setView}
      gridCols={gridCols}
      items={items}
      markers={markers}
      loading={loading}
      error={error}
      emptyTitle="Aucune salle pour ces filtres"
      emptyDescription="Élargissez la recherche, ou publiez une salle depuis Salles dans le tableau de bord."
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      itemLabel="salles"
      searchCenter={searchCenter}
      radiusKm={searchCenter ? applied.radiusKm : 0}
      city={applied.city}
      searchOriginLabel={applied.proximity === 'around' ? 'Vous êtes ici' : 'Lieu de recherche'}
      cta={{
        title: 'Vous avez une salle à proposer ?',
        description: 'Publiez votre fiche avec photos, vidéos, tarifs et calendrier.',
        primaryHref: '/register',
        primaryLabel: 'Publier une salle',
        secondaryHref: '/contact',
        secondaryLabel: 'Nous contacter',
      }}
      renderFilters={(variant) => (
        <CatalogueFilterBar
          variant={variant}
          hideViewToggle={variant === 'float' && mode !== 'focus'}
          compactToggle={variant === 'float'}
          search={q}
          onSearchChange={setQ}
          searchPlaceholder="Nom, organisation…"
          view={mode}
          onViewChange={setView}
          gridCols={gridCols}
          onGridColsChange={setGridCols}
          chips={chips}
          resultLabel={!loading ? `${items.length} salle${items.length > 1 ? 's' : ''}` : undefined}
          onRemoveChip={(id) => {
            if (id === 'roomType') applyFilters({ ...applied, roomType: '' });
            else applyFilters({ ...clearCatalogueGeoChip(applied, id), roomType: applied.roomType });
          }}
          onClearChips={() => applyFilters(emptyFilters)}
          onOpen={() => {
            setDraft(applied);
            setFilterError('');
          }}
          onApply={async () => {
            try {
              const next = { ...await resolveCatalogueGeo(draft), roomType: draft.roomType };
              applyFilters(next);
            } catch (err: unknown) {
              setFilterError(err instanceof Error ? err.message : 'Filtre de proximité impossible.');
              throw err;
            }
          }}
          modalTitle="Filtrer les salles"
          filters={
            <CatalogueEntityFilterFields
              entity="venue"
              value={draft}
              extras={{ ...EMPTY_CATALOGUE_EXTRAS, kind: 'venue', roomType: draft.roomType }}
              error={filterError}
              onChange={(geo, extras) => setDraft({ ...geo, roomType: extras.roomType })}
            />
          }
        />
      )}
    />
  );
}

export default function MarketplaceVenuesPage() {
  return (
    <Suspense fallback={<div className="page-container py-16 text-sm text-muted">Chargement des salles…</div>}>
      <MarketplaceVenuesPageInner />
    </Suspense>
  );
}
