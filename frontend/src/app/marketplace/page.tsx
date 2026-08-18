'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import CatalogueSearchLayout from '@/components/CatalogueSearchLayout';
import { usePageSize } from '@/components/ui';
import { useCatalogueView } from '@/components/CatalogueViewToggle';
import CatalogueFilterBar, {
  CatalogueEntityFilterFields,
} from '@/components/CatalogueFilterBar';
import { useCatalogueQueryState } from '@/lib/catalogueQuery';
import {
  EMPTY_CATALOGUE_GEO,
  appendCatalogueGeoParams,
  catalogueGeoChips,
  catalogueItemMatchesGeo,
  catalogueItemToMapMarker,
  clearCatalogueGeoChip,
  eventToCatalogueItem,
  resolveCatalogueGeo,
  serviceToCatalogueItem,
  sortCatalogueByDistance,
  venueToCatalogueItem,
  withCatalogueDistance,
  type CatalogueGeoState,
  type PublicEventCard,
  type PublicService,
  type PublicVenue,
} from '@/lib/marketplace';
import {
  EMPTY_CATALOGUE_EXTRAS,
  HUB_FILTER_EXTRA_KEYS,
  appendCatalogueEntityParams,
  catalogueEntityExtraChips,
  catalogueItemMatchesExtras,
  clearCatalogueExtraChip,
  mergeCatalogueExtras,
  mergeGeoAndExtras,
  splitCatalogueExtras,
  type CatalogueEntityExtras,
} from '@/lib/catalogueEntityFilters';

type HubFilters = CatalogueGeoState & CatalogueEntityExtras;

const emptyFilters: HubFilters = {
  ...EMPTY_CATALOGUE_GEO,
  ...EMPTY_CATALOGUE_EXTRAS,
};

const QUERY_OPTS = {
  extraKeys: [...HUB_FILTER_EXTRA_KEYS],
  emptyExtra: { ...splitCatalogueExtras(EMPTY_CATALOGUE_EXTRAS) },
  merge: (geo: CatalogueGeoState, extra: Record<string, string>): HubFilters => ({
    ...geo,
    ...mergeCatalogueExtras(extra),
  }),
  split: (filters: HubFilters) => splitCatalogueExtras(filters),
};

function MarketplaceHubPageInner() {
  const { mode, setView, gridCols, setGridCols } = useCatalogueView();
  const { q: query, setQ: setQuery, searchQ, applied, draft, setDraft, page, applyFilters, setPage } = useCatalogueQueryState(QUERY_OPTS);
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [events, setEvents] = useState<PublicEventCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterError, setFilterError] = useState('');
  const [pageSize, setPageSize] = usePageSize('marketplace-hub', 12);

  const load = useCallback(async (filters: HubFilters, search: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      appendCatalogueGeoParams(params, filters);
      const venueParams = new URLSearchParams(params);
      appendCatalogueEntityParams(venueParams, filters, 'venue');
      const serviceParams = new URLSearchParams(params);
      appendCatalogueEntityParams(serviceParams, filters, 'service');
      const eventParams = new URLSearchParams();
      if (search.trim()) eventParams.set('q', search.trim());
      appendCatalogueGeoParams(eventParams, filters);
      appendCatalogueEntityParams(eventParams, filters, 'event');
      const venueQs = venueParams.toString() ? `?${venueParams}` : '';
      const serviceQs = serviceParams.toString() ? `?${serviceParams}` : '';
      const eventQs = eventParams.toString() ? `?${eventParams}` : '';
      const loadVenues = filters.kind === 'all' || filters.kind === 'venue';
      const loadServices = filters.kind === 'all' || filters.kind === 'service' || filters.kind === 'rental';
      const loadEvents = filters.kind === 'all' || filters.kind === 'event';
      const [venuesData, servicesData, eventsData] = await Promise.all([
        loadVenues ? api.get(`/public/venues${venueQs}`).catch(() => ({ venues: [] })) : Promise.resolve({ venues: [] }),
        loadServices ? api.get(`/public/services${serviceQs}`).catch(() => ({ services: [] })) : Promise.resolve({ services: [] }),
        loadEvents ? api.get(`/public/events${eventQs}`).catch(() => ({ events: [] })) : Promise.resolve({ events: [] }),
      ]);
      setVenues(venuesData.venues || []);
      setServices(servicesData.services || []);
      setEvents(eventsData.events || []);
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
      ...events
        .map(eventToCatalogueItem)
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .map((item) => withCatalogueDistance(item, applied.lat, applied.lng))
        .filter((item) => catalogueItemMatchesGeo(item, applied) && catalogueItemMatchesExtras(item, applied)),
    ]),
    [venues, services, events, applied],
  );

  const visible = useMemo(
    () => items.filter((item) => catalogueItemMatchesExtras(item, applied)),
    [items, applied],
  );

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

  const chips = catalogueGeoChips(applied, catalogueEntityExtraChips(applied));

  return (
    <CatalogueSearchLayout
      activeNav={
        applied.kind === 'event' ? 'events'
          : applied.kind === 'service' ? 'services'
            : applied.kind === 'rental' ? 'rentals'
              : applied.kind === 'venue' ? 'venues'
                : 'hub'
      }
      heroTitle="Salles, prestataires, locations et événements près de chez vous"
      heroDescription="Explorez le marketplace EventMaster : salles, métiers, locations (habits, véhicules, matériel) et événements publics. Affinez par ville, commune, prix ou autour de vous."
      mode={mode}
      onViewChange={setView}
      gridCols={gridCols}
      items={visible}
      markers={markers}
      loading={loading}
      emptyTitle="Aucune fiche pour cette recherche"
      emptyDescription="Élargissez les mots-clés, ou publiez une salle, une prestation ou un événement public."
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
        title: 'Vous proposez une salle, un métier ou une location ?',
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
            applyFilters(clearCatalogueExtraChip(clearCatalogueGeoChip(applied, id), id));
          }}
          onClearChips={() => applyFilters(emptyFilters)}
          onOpen={() => {
            setDraft(applied);
            setFilterError('');
          }}
          onApply={async () => {
            try {
              const geo = await resolveCatalogueGeo(draft);
              applyFilters({ ...draft, ...geo });
            } catch (err: unknown) {
              setFilterError(err instanceof Error ? err.message : 'Filtre de proximité impossible.');
              throw err;
            }
          }}
          modalTitle="Filtrer le marketplace"
          filters={
            <CatalogueEntityFilterFields
              showKind
              value={draft}
              extras={draft}
              error={filterError}
              onChange={(geo, extras) => setDraft(mergeGeoAndExtras(geo, extras))}
            />
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
