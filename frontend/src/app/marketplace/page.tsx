'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import PublicCtaBand from '@/components/PublicCtaBand';
import MarketplacePublicNav from '@/components/MarketplacePublicNav';
import MarketplaceLocationsMap from '@/components/MarketplaceLocationsMap';
import { useCatalogueView } from '@/components/CatalogueViewToggle';
import CatalogueResults, { CatalogueResultsSkeleton } from '@/components/CatalogueResults';
import CatalogueFilterBar, {
  CatalogueChoicePills,
  CatalogueFilterField,
  CatalogueGeoFields,
} from '@/components/CatalogueFilterBar';
import { Pagination, paginateItems } from '@/components/ui';
import {
  EMPTY_CATALOGUE_GEO,
  appendCatalogueGeoParams,
  catalogueGeoChips,
  catalogueItemToMapMarker,
  clearCatalogueGeoChip,
  isCatalogueMapView,
  resolveCatalogueGeo,
  serviceToCatalogueItem,
  venueToCatalogueItem,
  type CatalogueGeoState,
  type CatalogueItem,
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
  const PAGE_SIZE = 9;

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

  const items: CatalogueItem[] = useMemo(
    () => [
      ...venues.map(venueToCatalogueItem),
      ...services.map(serviceToCatalogueItem),
    ],
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

  const mapMode = isCatalogueMapView(mode);
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
    <PublicPageShell faqHref="/faq">
      {mode !== 'focus' && (
        <PublicPageHero
          compact
          chip="Catalogue"
          title="Salles et prestataires pour vos événements"
          description="Trouvez un lieu ou un professionnel enregistré sur EventMaster. Affinez par ville, commune, prix ou autour de vous."
        >
          <MarketplacePublicNav active="hub" />
        </PublicPageHero>
      )}

      <main className="page-container py-6 sm:py-10 flex-1 space-y-4 sm:space-y-6">
        {mode === 'focus' && <MarketplacePublicNav active="hub" />}
        <CatalogueFilterBar
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

        {loading ? (
          <CatalogueResultsSkeleton mode={mode} count={PAGE_SIZE} />
        ) : mapMode ? (
          <div className="space-y-3">
            {mode !== 'focus' && (
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  Salles
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--festive-accent)]" />
                  Prestataires
                </span>
                <span>Survolez un prestataire pour voir son rayon d’action.</span>
              </div>
            )}
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
          </div>
        ) : (
          <>
            <CatalogueResults
              items={paginateItems(visible, page, PAGE_SIZE)}
              mode={mode}
              emptyTitle="Aucune fiche pour cette recherche"
              emptyDescription="Élargissez les mots-clés, ou publiez une salle / prestation depuis votre organisation."
            />
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={visible.length}
              onPageChange={setPage}
              itemLabel="fiches"
            />
          </>
        )}
      </main>

      {mode !== 'focus' && (
        <PublicCtaBand
          title="Vous proposez une salle ou un service ?"
          description="Publiez une fiche depuis votre organisation EventMaster, avec photos, vidéos, carte et calendrier."
          primaryHref="/register"
          primaryLabel="Créer un compte"
          secondaryHref="/contact"
          secondaryLabel="Nous contacter"
        />
      )}
    </PublicPageShell>
  );
}
