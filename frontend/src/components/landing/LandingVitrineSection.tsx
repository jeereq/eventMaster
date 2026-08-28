'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button, Pagination, paginateItems, usePageSize } from '@/components/ui';
import { cn } from '@/lib/cn';
import CatalogueResults, { CatalogueResultsSkeleton } from '@/components/CatalogueResults';
import CatalogueFilterBar, { CatalogueEntityFilterFields } from '@/components/CatalogueFilterBar';
import {
  EMPTY_CATALOGUE_GEO,
  appendCatalogueGeoParams,
  catalogueGeoChips,
  catalogueItemMatchesGeo,
  clearCatalogueGeoChip,
  eventToCatalogueItem,
  filterCatalogueItems,
  resolveCatalogueGeo,
  serviceToCatalogueItem,
  venueToCatalogueItem,
  type CatalogueGeoState,
  type PublicEventCard,
  type PublicService,
  type PublicVenue,
} from '@/lib/marketplace';
import {
  EMPTY_CATALOGUE_EXTRAS,
  appendCatalogueEntityParams,
  catalogueEntityExtraChips,
  catalogueItemMatchesExtras,
  clearCatalogueExtraChip,
  mergeGeoAndExtras,
  type CatalogueEntityExtras,
} from '@/lib/catalogueEntityFilters';
import { fetchPublicServicesForCatalogue } from '@/lib/catalogueFetch';
import { ArrowRight, Building2, Calendar, KeyRound, Sparkles, Store } from 'lucide-react';
import { useCatalogueGridCols, type CatalogueGridCols } from '@/components/CatalogueViewToggle';
import { marketplaceSectionUrl } from '@/lib/share';
import { useLandingReveal } from '@/components/landing/useLandingReveal';

type VitrineTab = 'venues' | 'services' | 'rentals' | 'events';
type EntityFilters = CatalogueGeoState & CatalogueEntityExtras;

const emptyFilters: EntityFilters = { ...EMPTY_CATALOGUE_GEO, ...EMPTY_CATALOGUE_EXTRAS };

export default function LandingVitrineSection() {
  const revealRef = useLandingReveal<HTMLElement>();
  const [tab, setTab] = useState<VitrineTab>('venues');
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [events, setEvents] = useState<PublicEventCard[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [query, setQuery] = useState('');
  const [applied, setApplied] = useState<EntityFilters>(emptyFilters);
  const [draft, setDraft] = useState<EntityFilters>(emptyFilters);
  const [filterError, setFilterError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('landing-vitrine', 8);
  const { gridCols, setGridCols } = useCatalogueGridCols();
  const vitrineCols: CatalogueGridCols = gridCols === 5 ? 4 : gridCols === 2 || gridCols === 3 || gridCols === 4 ? gridCols : 3;

  const entity = tab === 'venues' ? 'venue' : tab === 'services' ? 'service' : tab === 'rentals' ? 'rental' : 'event';

  const load = useCallback(async (filters: EntityFilters, search: string) => {
    setLoadingCatalog(true);
    try {
      const venueParams = new URLSearchParams();
      const serviceParams = new URLSearchParams();
      const eventParams = new URLSearchParams();
      if (search.trim()) {
        venueParams.set('q', search.trim());
        serviceParams.set('q', search.trim());
        eventParams.set('q', search.trim());
      }
      appendCatalogueGeoParams(venueParams, filters);
      appendCatalogueGeoParams(serviceParams, filters);
      appendCatalogueGeoParams(eventParams, filters);
      appendCatalogueEntityParams(venueParams, { ...filters, kind: 'venue' }, 'venue');
      appendCatalogueEntityParams(serviceParams, filters, 'service');
      appendCatalogueEntityParams(eventParams, { ...filters, kind: 'event' }, 'event');
      const [venuesData, servicesData, eventsData] = await Promise.all([
        api.get(`/public/venues?${venueParams.toString()}`).catch(() => ({ venues: [] })),
        fetchPublicServicesForCatalogue(serviceParams, 'all'),
        api.get(`/public/events?${eventParams.toString()}`).catch(() => ({ events: [] })),
      ]);
      setVenues(venuesData.venues || []);
      setServices(servicesData);
      setEvents(eventsData.events || []);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => load(applied, query), 280);
    return () => window.clearTimeout(t);
  }, [applied, query, load]);

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'salles' || hash === 'catalogue' || hash === 'marketplace') setTab('venues');
      if (hash === 'prestataires') setTab('services');
      if (hash === 'locations') setTab('rentals');
      if (hash === 'evenements') setTab('events');
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [tab, query, applied]);

  useEffect(() => {
    const prune = (filters: EntityFilters): EntityFilters => ({
      ...filters,
      kind: entity,
      roomType: entity === 'service' || entity === 'rental' || entity === 'event' ? '' : filters.roomType,
      category: entity === 'venue' || entity === 'event' ? '' : filters.category,
      mobility: entity === 'venue' || entity === 'event' ? '' : filters.mobility,
      priceUnit: entity === 'venue' || entity === 'event' ? '' : filters.priceUnit,
      entry: entity === 'venue' || entity === 'service' || entity === 'rental' ? '' : filters.entry,
    });
    setApplied(prune);
    setDraft(prune);
  }, [entity]);

  const venueItems = useMemo(
    () =>
      filterCatalogueItems(venues.map(venueToCatalogueItem), query).filter(
        (item) => catalogueItemMatchesGeo(item, applied) && catalogueItemMatchesExtras(item, { ...applied, kind: 'venue' }),
      ),
    [venues, query, applied],
  );
  const serviceItems = useMemo(
    () =>
      filterCatalogueItems(services.map(serviceToCatalogueItem), query).filter(
        (item) => catalogueItemMatchesGeo(item, applied) && catalogueItemMatchesExtras(item, { ...applied, kind: 'service' }),
      ),
    [services, query, applied],
  );
  const rentalItems = useMemo(
    () =>
      filterCatalogueItems(services.map(serviceToCatalogueItem), query).filter(
        (item) => catalogueItemMatchesGeo(item, applied) && catalogueItemMatchesExtras(item, { ...applied, kind: 'rental' }),
      ),
    [services, query, applied],
  );
  const eventItems = useMemo(
    () =>
      filterCatalogueItems(
        events
          .map(eventToCatalogueItem)
          .filter((item): item is NonNullable<typeof item> => Boolean(item)),
        query,
      ).filter(
        (item) => catalogueItemMatchesGeo(item, applied) && catalogueItemMatchesExtras(item, { ...applied, kind: 'event' }),
      ),
    [events, query, applied],
  );

  const tabs: Array<{ id: VitrineTab; label: string; icon: typeof Building2; hash: string }> = [
    { id: 'venues', label: 'Salles', icon: Building2, hash: 'salles' },
    { id: 'services', label: 'Prestataires', icon: Sparkles, hash: 'prestataires' },
    { id: 'rentals', label: 'Locations', icon: KeyRound, hash: 'locations' },
    { id: 'events', label: 'Événements', icon: Calendar, hash: 'evenements' },
  ];

  const selectTab = (next: VitrineTab, hash: string) => {
    setTab(next);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/#${hash}`);
    }
  };

  const pagedVenues = paginateItems(venueItems, page, pageSize);
  const pagedServices = paginateItems(serviceItems, page, pageSize);
  const pagedRentals = paginateItems(rentalItems, page, pageSize);
  const pagedEvents = paginateItems(eventItems, page, pageSize);
  const chips = catalogueGeoChips(applied, catalogueEntityExtraChips({ ...applied, kind: entity }));

  const catalogFilters = (
    <CatalogueFilterBar
      search={query}
      onSearchChange={setQuery}
      searchPlaceholder={
        tab === 'venues'
          ? 'Rechercher une salle…'
          : tab === 'services'
            ? 'Rechercher un prestataire…'
            : tab === 'rentals'
              ? 'Rechercher une location…'
              : 'Rechercher un événement…'
      }
      view="grid"
      onViewChange={() => undefined}
      hideViewToggle
      gridCols={vitrineCols}
      onGridColsChange={(cols) => setGridCols(cols === 5 ? 4 : cols)}
      gridColOptions={[2, 3, 4]}
      shareUrl={marketplaceSectionUrl(tab === 'venues' ? 'venues' : tab === 'services' ? 'services' : tab === 'rentals' ? 'rentals' : 'events', query)}
      shareTitle={
        tab === 'venues'
          ? 'Salles EventMaster'
          : tab === 'services'
            ? 'Prestataires EventMaster'
            : tab === 'rentals'
              ? 'Locations EventMaster'
              : 'Événements EventMaster'
      }
      resultLabel={!loadingCatalog
        ? tab === 'venues'
          ? `${venueItems.length} salle${venueItems.length > 1 ? 's' : ''}`
          : tab === 'services'
            ? `${serviceItems.length} prestataire${serviceItems.length > 1 ? 's' : ''}`
            : tab === 'rentals'
              ? `${rentalItems.length} location${rentalItems.length > 1 ? 's' : ''}`
              : `${eventItems.length} événement${eventItems.length > 1 ? 's' : ''}`
        : undefined}
      chips={chips}
      onRemoveChip={(id) => {
        const next = clearCatalogueExtraChip(clearCatalogueGeoChip(applied, id), id);
        setApplied(next);
        setDraft(next);
      }}
      onClearChips={() => {
        setQuery('');
        setApplied(emptyFilters);
        setDraft(emptyFilters);
      }}
      onOpen={() => {
        setDraft(applied);
        setFilterError('');
      }}
      onApply={async () => {
        try {
          const geo = await resolveCatalogueGeo(draft);
          setApplied({ ...draft, ...geo });
        } catch (err: unknown) {
          setFilterError(err instanceof Error ? err.message : 'Filtre de proximité impossible.');
          throw err;
        }
      }}
      modalTitle={
        tab === 'venues'
          ? 'Filtrer les salles'
          : tab === 'services'
            ? 'Filtrer les prestataires'
            : tab === 'rentals'
              ? 'Filtrer les locations'
              : 'Filtrer les événements'
      }
      filters={
        <CatalogueEntityFilterFields
          entity={entity}
          value={draft}
          extras={{ ...draft, kind: entity }}
          error={filterError}
          onChange={(geo, extras) => setDraft({ ...mergeGeoAndExtras(geo, extras), kind: entity })}
        />
      }
    />
  );

  return (
    <section ref={revealRef} className="em-reveal py-14 sm:py-16 border-t border-border bg-surface">
      <div id="catalogue" className="scroll-mt-16" />
      <div id="salles" className="scroll-mt-16" />
      <div id="prestataires" className="scroll-mt-16" />
      <div id="locations" className="scroll-mt-16" />
      <div id="evenements" className="scroll-mt-16" />
      <div className="page-container space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="max-w-xl space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="em-festive-chip">
                <Store className="w-3 h-3" />
                Catalogue & Marketplace
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Espaces & Talents
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Lieux, prestataires et billetteries
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Explorez les espaces vérifiés avec visite 3D et contactez les professionnels en direct.
            </p>
          </div>
          <Link href="/marketplace">
            <Button rightIcon={<ArrowRight className="w-4 h-4" />}>
              Tout le marketplace
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map(({ id, label, icon: Icon, hash }) => (
            <button
              key={id}
              type="button"
              onClick={() => selectTab(id, hash)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary',
                tab === id
                  ? 'bg-primary text-primary-foreground border border-primary/30 shadow-xs'
                  : 'bg-surface text-muted hover:text-foreground border border-border hover:bg-surface-muted/60',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'venues' && (
          <div className="space-y-4">
            {catalogFilters}
            {loadingCatalog ? (
              <CatalogueResultsSkeleton mode="grid" count={pageSize} gridCols={vitrineCols} />
            ) : (
              <>
                <CatalogueResults
                  items={pagedVenues}
                  mode="grid"
                  gridCols={vitrineCols}
                  emptyTitle="Aucune salle publiée"
                  emptyDescription="Les salles enregistrées sur EventMaster apparaîtront ici."
                />
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={venueItems.length}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  itemLabel="salles"
                />
              </>
            )}
          </div>
        )}

        {tab === 'services' && (
          <div className="space-y-4">
            {catalogFilters}
            {loadingCatalog ? (
              <CatalogueResultsSkeleton mode="grid" count={pageSize} gridCols={vitrineCols} />
            ) : (
              <>
                <CatalogueResults
                  items={pagedServices}
                  mode="grid"
                  gridCols={vitrineCols}
                  emptyTitle="Aucun prestataire publié"
                  emptyDescription="Les prestataires enregistrés apparaîtront ici."
                />
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={serviceItems.length}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  itemLabel="prestataires"
                />
              </>
            )}
          </div>
        )}

        {tab === 'rentals' && (
          <div className="space-y-4">
            {catalogFilters}
            {loadingCatalog ? (
              <CatalogueResultsSkeleton mode="grid" count={pageSize} gridCols={vitrineCols} />
            ) : (
              <>
                <CatalogueResults
                  items={pagedRentals}
                  mode="grid"
                  gridCols={vitrineCols}
                  emptyTitle="Aucune offre de location"
                  emptyDescription="Les matériels et équipements en location apparaîtront ici."
                />
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={rentalItems.length}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  itemLabel="locations"
                />
              </>
            )}
          </div>
        )}

        {tab === 'events' && (
          <div className="space-y-4">
            {catalogFilters}
            {loadingCatalog ? (
              <CatalogueResultsSkeleton mode="grid" count={pageSize} gridCols={vitrineCols} />
            ) : (
              <>
                <CatalogueResults
                  items={pagedEvents}
                  mode="grid"
                  gridCols={vitrineCols}
                  emptyTitle="Aucun événement public"
                  emptyDescription="Les événements publiés sur EventMaster apparaîtront ici."
                />
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={eventItems.length}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  itemLabel="événements"
                />
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
