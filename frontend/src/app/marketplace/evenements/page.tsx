'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  EMPTY_CATALOGUE_GEO,
  appendCatalogueGeoParams,
  catalogueGeoChips,
  catalogueItemMatchesGeo,
  catalogueItemToMapMarker,
  clearCatalogueGeoChip,
  eventToCatalogueItem,
  resolveCatalogueGeo,
  sortCatalogueByDistance,
  withCatalogueDistance,
  type CatalogueGeoState,
  type PublicEventCard,
} from '@/lib/marketplace';
import { useCatalogueQueryState } from '@/lib/catalogueQuery';
import { EMPTY_CATALOGUE_EXTRAS, appendCatalogueEntityParams, clearCatalogueExtraChip } from '@/lib/catalogueEntityFilters';
import { useCatalogueView } from '@/components/CatalogueViewToggle';
import CatalogueSearchLayout from '@/components/CatalogueSearchLayout';
import MarketplaceCatalogueSkeleton from '@/components/MarketplaceCatalogueSkeleton';
import { usePageSize } from '@/components/ui';
import CatalogueFilterBar, {
  CatalogueEntityFilterFields,
  type CatalogueFilterChip,
} from '@/components/CatalogueFilterBar';

type EventFilters = CatalogueGeoState & { entry: '' | 'paid' | 'free' };

const emptyFilters: EventFilters = {
  ...EMPTY_CATALOGUE_GEO,
  entry: '',
};

const QUERY_OPTS = {
  extraKeys: ['entry'],
  emptyExtra: { entry: '' },
  merge: (geo: CatalogueGeoState, extra: Record<string, string>): EventFilters => ({
    ...geo,
    entry: extra.entry === 'paid' || extra.entry === 'free' ? extra.entry : '',
  }),
  split: (filters: EventFilters) => ({ entry: filters.entry }),
};

function MarketplaceEventsPageInner() {
  const { mode, setView, gridCols, setGridCols } = useCatalogueView();
  const { q, setQ, searchQ, applied, draft, setDraft, page, applyFilters, setPage } = useCatalogueQueryState(QUERY_OPTS);
  const [events, setEvents] = useState<PublicEventCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterError, setFilterError] = useState('');
  const [pageSize, setPageSize] = usePageSize('marketplace-events', 8);

  const load = useCallback(async (filters: EventFilters, search: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      appendCatalogueGeoParams(params, filters);
      appendCatalogueEntityParams(params, { ...EMPTY_CATALOGUE_EXTRAS, entry: filters.entry }, 'event');
      const data = await api.get(`/public/events${params.toString() ? `?${params}` : ''}`);
      setEvents(data.events || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les événements.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const items = useMemo(
    () =>
      sortCatalogueByDistance(
        events
          .map(eventToCatalogueItem)
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
          .filter((item) => {
            if (applied.entry === 'paid') return item.priceFromFc != null;
            if (applied.entry === 'free') return item.priceFromFc == null;
            return true;
          })
          .map((item) => withCatalogueDistance(item, applied.lat, applied.lng))
          .filter((item) => catalogueItemMatchesGeo(item, applied)),
      ),
    [events, applied],
  );

  const markers = useMemo(
    () =>
      items
        .filter((item) => item.latitude != null && item.longitude != null)
        .map(catalogueItemToMapMarker),
    [items],
  );

  const chips: CatalogueFilterChip[] = useMemo(() => {
    const extra: CatalogueFilterChip[] = [];
    if (applied.entry === 'paid') extra.push({ id: 'entry', label: 'Entrée', value: 'Payant' });
    if (applied.entry === 'free') extra.push({ id: 'entry', label: 'Entrée', value: 'Libre' });
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
      activeNav="events"
      heroTitle="Événements publics"
      heroDescription="Places pour concerts et conférences."
      mode={mode}
      onViewChange={setView}
      gridCols={gridCols}
      items={items}
      markers={markers}
      loading={loading}
      error={error}
      emptyTitle="Aucun événement"
      emptyDescription="Élargissez la ville ou la date."
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      itemLabel="événements"
      searchCenter={searchCenter}
      radiusKm={searchCenter ? applied.radiusKm : 0}
      city={applied.city}
      searchOriginLabel={applied.proximity === 'around' ? 'Vous êtes ici' : 'Lieu de recherche'}
      cta={{
        title: 'Vous organisez un événement public ?',
        description: 'Publiez la fiche et les billets.',
        primaryHref: '/register?kind=ORGANIZER&intent=pro',
        primaryLabel: 'Créer un compte organisateur',
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
          searchPlaceholder="Titre, lieu, organisateur…"
          view={mode}
          onViewChange={setView}
          gridCols={gridCols}
          onGridColsChange={setGridCols}
          chips={chips}
          resultLabel={!loading ? `${items.length} événement${items.length > 1 ? 's' : ''}` : undefined}
          onRemoveChip={(id) => applyFilters(clearCatalogueExtraChip(clearCatalogueGeoChip(applied, id), id))}
          onClearChips={() => applyFilters(emptyFilters)}
          onOpen={() => {
            setDraft(applied);
            setFilterError('');
          }}
          onApply={async () => {
            try {
              const next = { ...await resolveCatalogueGeo(draft), entry: draft.entry };
              applyFilters(next);
            } catch (err: unknown) {
              setFilterError(err instanceof Error ? err.message : 'Filtre de proximité impossible.');
              throw err;
            }
          }}
          modalTitle="Filtrer les événements"
          filters={
            <CatalogueEntityFilterFields
              entity="event"
              value={draft}
              extras={{ ...EMPTY_CATALOGUE_EXTRAS, kind: 'event', entry: draft.entry }}
              error={filterError}
              onChange={(geo, extras) => setDraft({ ...geo, entry: extras.entry })}
            />
          }
        />
      )}
    />
  );
}

export default function MarketplaceEventsPage() {
  return (
    <Suspense fallback={(
      <MarketplaceCatalogueSkeleton
        active="events"
        title="Événements ouverts au public"
        description="Concerts, galas, conférences… Inscrivez-vous ou achetez un billet. Vue grille, liste ou carte — comme les salles et prestataires."
        label="Chargement des événements"
      />
    )}>
      <MarketplaceEventsPageInner />
    </Suspense>
  );
}
