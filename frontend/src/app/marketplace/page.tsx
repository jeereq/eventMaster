'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import CatalogueSearchLayout from '@/components/CatalogueSearchLayout';
import { useCatalogueView } from '@/components/CatalogueViewToggle';
import CatalogueFilterBar, {
  CatalogueChoicePills,
  CatalogueFilterField,
  CatalogueGeoFields,
} from '@/components/CatalogueFilterBar';
import {
  EMPTY_CATALOGUE_GEO,
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
} from '@/lib/marketplace';

type HubFilters = CatalogueGeoState & { kind: 'all' | 'venue' | 'service' };

const emptyFilters: HubFilters = {
  ...EMPTY_CATALOGUE_GEO,
  kind: 'all',
};

export default function MarketplaceHubPage() {
  const { mode, setView } = useCatalogueView();
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [applied, setApplied] = useState<HubFilters>(emptyFilters);
  const [draft, setDraft] = useState<HubFilters>(emptyFilters);
  const [filterError, setFilterError] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const load = useCallback(async (filters: HubFilters, search: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      appendCatalogueGeoParams(params, filters);
      const qs = params.toString() ? `?${params}` : '';
      const [venuesData, servicesData] = await Promise.all([
        api.get(`/public/venues${qs}`).catch(() => ({ venues: [] })),
        api.get(`/public/services${qs}`).catch(() => ({ services: [] })),
      ]);
      setVenues(venuesData.venues || []);
      setServices(servicesData.services || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(applied, query);
    }, query.trim() ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [applied, query, load]);

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

  useEffect(() => {
    setPage(1);
  }, [query, mode, applied]);

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

  const applyFilters = (next: HubFilters) => {
    setFilterError('');
    setApplied(next);
    setDraft(next);
  };

  const chips = catalogueGeoChips(
    applied,
    applied.kind === 'all'
      ? []
      : [{ id: 'kind', label: 'Type', value: applied.kind === 'venue' ? 'Salles' : 'Prestataires' }],
  );

  return (
    <CatalogueSearchLayout
      activeNav="hub"
      heroTitle="Salles et prestataires pour vos événements"
      heroDescription="Trouvez un lieu ou un professionnel enregistré sur EventMaster. Affinez par ville, commune, prix ou autour de vous."
      mode={mode}
      items={visible}
      markers={markers}
      loading={loading}
      emptyTitle="Aucune fiche pour cette recherche"
      emptyDescription="Élargissez les mots-clés, ou publiez une salle / prestation depuis votre organisation."
      page={page}
      pageSize={PAGE_SIZE}
      onPageChange={setPage}
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
          hideViewToggle={variant === 'float'}
          search={query}
          onSearchChange={setQuery}
          searchPlaceholder="Nom, organisation, ville…"
          view={mode}
          onViewChange={setView}
          resultLabel={!loading ? `${visible.length} fiche${visible.length > 1 ? 's' : ''}` : undefined}
          chips={chips}
          onRemoveChip={(id) => {
            if (id === 'kind') applyFilters({ ...applied, kind: 'all' });
            else applyFilters({ ...clearCatalogueGeoChip(applied, id), kind: applied.kind });
          }}
          onClearChips={() => applyFilters(emptyFilters)}
          onOpen={() => {
            setDraft(applied);
            setFilterError('');
          }}
          onApply={async () => {
            try {
              const geo = await resolveCatalogueGeo(draft);
              applyFilters({ ...geo, kind: draft.kind });
            } catch (err: unknown) {
              setFilterError(err instanceof Error ? err.message : 'Filtre de proximité impossible.');
              throw err;
            }
          }}
          modalTitle="Filtrer le catalogue"
          filters={
            <>
              <CatalogueFilterField label="Type de fiche">
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
                onChange={(next) => setDraft({ ...next, kind: draft.kind })}
                error={filterError}
              />
            </>
          }
        />
      )}
    />
  );
}
