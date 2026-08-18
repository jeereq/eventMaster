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
  catalogueItemMatchesGeo,
  catalogueItemToMapMarker,
  catalogueKindFilterLabel,
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
  type ServiceMobility,
} from '@/lib/marketplace';

type HubFilters = CatalogueGeoState & { kind: 'all' | 'venue' | 'service' | 'event'; mobility: ServiceMobility };

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
    kind: extra.kind === 'venue' || extra.kind === 'service' || extra.kind === 'event' ? extra.kind : 'all',
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
      const venueQs = params.toString() ? `?${params}` : '';
      const serviceParams = new URLSearchParams(params);
      if (filters.mobility) serviceParams.set('mobility', filters.mobility);
      const serviceQs = serviceParams.toString() ? `?${serviceParams}` : '';
      const loadVenues = filters.kind !== 'service' && filters.kind !== 'event';
      const loadServices = filters.kind !== 'venue' && filters.kind !== 'event';
      const loadEvents = filters.kind !== 'venue' && filters.kind !== 'service';
      const eventParams = new URLSearchParams();
      if (search.trim()) eventParams.set('q', search.trim());
      const eventQs = eventParams.toString() ? `?${eventParams}` : '';
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
        .filter((item) => catalogueItemMatchesGeo(item, applied)),
    ]),
    [venues, services, events, applied],
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
      ...(applied.kind === 'all' ? [] : [{ id: 'kind', label: 'Type', value: catalogueKindFilterLabel(applied.kind) }]),
      ...(applied.mobility
        ? [{ id: 'mobility', label: 'Intervention', value: applied.mobility === 'on_site' ? 'Sur place' : 'Se déplace' }]
        : []),
    ],
  );

  return (
    <CatalogueSearchLayout
      activeNav={applied.kind === 'event' ? 'events' : 'hub'}
      heroTitle="Salles, prestataires et événements près de chez vous"
      heroDescription="Explorez le marketplace EventMaster : locations, prestations et événements publics. Affinez par ville, commune, prix ou autour de vous."
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
              <CatalogueFilterField label="Type">
                <CatalogueChoicePills
                  options={[
                    { id: 'all', label: 'Tous' },
                    { id: 'venue', label: 'Salles' },
                    { id: 'service', label: 'Prestataires' },
                    { id: 'event', label: 'Événements' },
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
              {draft.kind !== 'event' ? (
              <CatalogueFilterField label="Prestataires — intervention">
                <CatalogueChoicePills
                  options={SERVICE_MOBILITY_OPTIONS.filter((opt) => opt.id)}
                  value={draft.mobility}
                  onChange={(id) => setDraft((d) => ({ ...d, mobility: (id as ServiceMobility) || '' }))}
                />
              </CatalogueFilterField>
              ) : null}
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
