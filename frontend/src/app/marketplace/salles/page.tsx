'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import PublicCtaBand from '@/components/PublicCtaBand';
import { Pagination, paginateItems } from '@/components/ui';
import {
  EMPTY_CATALOGUE_GEO,
  appendCatalogueGeoParams,
  catalogueGeoChips,
  catalogueItemToMapMarker,
  clearCatalogueGeoChip,
  isCatalogueMapView,
  resolveCatalogueGeo,
  venueToCatalogueItem,
  type CatalogueGeoState,
  type PublicVenue,
} from '@/lib/marketplace';
import { roomTypeLabels } from '@/lib/roomLayoutUtils';
import MarketplacePublicNav from '@/components/MarketplacePublicNav';
import MarketplaceLocationsMap from '@/components/MarketplaceLocationsMap';
import { useCatalogueView } from '@/components/CatalogueViewToggle';
import CatalogueResults, { CatalogueResultsSkeleton } from '@/components/CatalogueResults';
import CatalogueFilterBar, {
  CatalogueChoicePills,
  CatalogueFilterField,
  CatalogueGeoFields,
  type CatalogueFilterChip,
} from '@/components/CatalogueFilterBar';

const ROOM_FILTERS: Array<{ id: string; label: string }> = [
  { id: 'BANQUET', label: roomTypeLabels.BANQUET },
  { id: 'CONFERENCE', label: roomTypeLabels.CONFERENCE },
  { id: 'AMPHITHEATER', label: roomTypeLabels.AMPHITHEATER },
  { id: 'TENT', label: roomTypeLabels.TENT },
  { id: 'CUSTOM', label: roomTypeLabels.CUSTOM },
];

type VenueFilters = CatalogueGeoState & { roomType: string };

const emptyFilters: VenueFilters = {
  ...EMPTY_CATALOGUE_GEO,
  roomType: '',
};

export default function MarketplaceVenuesPage() {
  const { mode, setView } = useCatalogueView();
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [applied, setApplied] = useState<VenueFilters>(emptyFilters);
  const [draft, setDraft] = useState<VenueFilters>(emptyFilters);
  const [error, setError] = useState('');
  const [filterError, setFilterError] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

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
      setPage(1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les salles.');
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const items = useMemo(() => venues.map(venueToCatalogueItem), [venues]);
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
        value: ROOM_FILTERS.find((opt) => opt.id === applied.roomType)?.label || applied.roomType,
      });
    }
    return catalogueGeoChips(applied, extra);
  }, [applied]);

  const applyFilters = (next: VenueFilters) => {
    setFilterError('');
    setApplied(next);
    setDraft(next);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(applied, q);
    }, q.trim() ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [applied, q, load]);

  const mapMode = isCatalogueMapView(mode);
  const searchCenter = applied.proximity && applied.lat != null && applied.lng != null
    ? { lat: applied.lat, lng: applied.lng }
    : null;

  return (
    <PublicPageShell faqHref="/faq">
      {mode !== 'focus' && (
        <PublicPageHero
          compact
          chip="Catalogue"
          title="Trouvez une salle pour votre événement"
          description="Filtrez par ville, commune, quartier, prix ou autour de vous. Les choix restent visibles sous la recherche."
        >
          <MarketplacePublicNav active="venues" />
        </PublicPageHero>
      )}

      <main className="page-container py-6 sm:py-10 flex-1 space-y-4 sm:space-y-6">
        {mode === 'focus' && <MarketplacePublicNav active="venues" />}
        <CatalogueFilterBar
          search={q}
          onSearchChange={setQ}
          searchPlaceholder="Nom, organisation…"
          view={mode}
          onViewChange={setView}
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
            <>
              <CatalogueGeoFields
                value={draft}
                onChange={(next) => setDraft({ ...next, roomType: draft.roomType })}
                error={filterError}
              />
              <CatalogueFilterField label="Type de salle">
                <CatalogueChoicePills
                  options={ROOM_FILTERS}
                  value={draft.roomType}
                  onChange={(id) => setDraft((d) => ({ ...d, roomType: id }))}
                />
              </CatalogueFilterField>
            </>
          }
        />

        {error && <p className="text-sm text-rose-600">{error}</p>}

        {loading ? (
          <CatalogueResultsSkeleton mode={mode} count={PAGE_SIZE} />
        ) : mapMode ? (
            <MarketplaceLocationsMap
            markers={markers}
            listingSearch
            navigateOnClick={false}
            height={480}
            variant={mode === 'focus' ? 'focus' : 'default'}
            searchCenter={searchCenter}
            radiusKm={searchCenter ? applied.radiusKm : 0}
            city={applied.city}
          />
        ) : (
          <>
            <CatalogueResults
              items={paginateItems(items, page, PAGE_SIZE)}
              mode={mode}
              emptyTitle="Aucune salle pour ces filtres"
              emptyDescription="Élargissez la recherche, ou publiez une salle depuis Salles dans le tableau de bord."
            />
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={items.length}
              onPageChange={setPage}
              itemLabel="salles"
            />
          </>
        )}
      </main>

      {mode !== 'focus' && (
        <PublicCtaBand
          title="Vous avez une salle à proposer ?"
          description="Publiez votre fiche avec photos, vidéos, tarifs et calendrier."
          primaryHref="/register"
          primaryLabel="Publier une salle"
          secondaryHref="/contact"
          secondaryLabel="Nous contacter"
        />
      )}
    </PublicPageShell>
  );
}
