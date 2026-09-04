'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { ArrowRight, Building2, Calendar, KeyRound, RefreshCw, Sparkles, Store } from 'lucide-react';
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
  const [catalogError, setCatalogError] = useState('');
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
    setCatalogError('');
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
      const [venuesRes, servicesRes, eventsRes] = await Promise.allSettled([
        api.get(`/public/venues?${venueParams.toString()}`),
        fetchPublicServicesForCatalogue(serviceParams, 'all'),
        api.get(`/public/events?${eventParams.toString()}`),
      ]);
      setVenues(venuesRes.status === 'fulfilled' ? venuesRes.value.venues || [] : []);
      setServices(servicesRes.status === 'fulfilled' ? servicesRes.value : []);
      setEvents(eventsRes.status === 'fulfilled' ? eventsRes.value.events || [] : []);
      const failed = [venuesRes, eventsRes].filter((result) => result.status === 'rejected').length;
      if (failed === 2) {
        setCatalogError('Impossible de charger le catalogue. Vérifiez votre connexion, puis réessayez.');
      } else if (failed === 1) {
        setCatalogError('Une partie du catalogue n’a pas pu être chargée. Réessayez.');
      }
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
    { id: 'rentals', label: 'Matériel & Équipements', icon: KeyRound, hash: 'locations' },
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
              ? 'Rechercher du matériel ou équipement…'
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
              ? 'Matériel & Équipements EventMaster'
              : 'Événements EventMaster'
      }
      resultLabel={!loadingCatalog
        ? tab === 'venues'
          ? `${venueItems.length} salle${venueItems.length > 1 ? 's' : ''}`
          : tab === 'services'
            ? `${serviceItems.length} prestataire${serviceItems.length > 1 ? 's' : ''}`
            : tab === 'rentals'
              ? `${rentalItems.length} offre${rentalItems.length > 1 ? 's' : ''} de matériel`
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
              ? 'Filtrer le matériel & équipements'
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
    <section ref={revealRef} className="em-reveal em-landing-defer py-14 sm:py-16 border-t border-border bg-surface/80 dark:bg-background/80 em-landing-section-glow">
      <div id="catalogue" className="scroll-mt-16" />
      <div id="salles" className="scroll-mt-16" />
      <div id="prestataires" className="scroll-mt-16" />
      <div id="locations" className="scroll-mt-16" />
      <div id="evenements" className="scroll-mt-16" />
      <div className="page-container relative z-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="max-w-xl space-y-2.5">
            <span className="em-festive-chip">
              <Store className="w-3 h-3" />
              Catalogue & Marketplace
            </span>
            <h2 className="em-landing-heading text-2xl sm:text-3xl text-foreground">
              Lieux, prestataires et billetteries
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Explorez les espaces vérifiés avec visite 3D et contactez les professionnels en direct.
            </p>
          </div>
          <Button href="/marketplace" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Tout le marketplace
          </Button>
        </div>

        {/* Bannière d'appel au simulateur de pack IA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-[var(--radius-card)] bg-gradient-to-r from-primary/10 via-surface to-primary/5 border border-primary/25 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[var(--radius-button)] bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Besoin d’un pack complet selon votre budget ?</p>
              <p className="text-[11px] text-muted hidden sm:block">
                Laissez notre simulateur IA composer instantanément 3 formules (salle + traiteur + déco + DJ) adaptées à votre enveloppe.
              </p>
            </div>
          </div>
          <a
            href="#simulateur-ia"
            className="shrink-0 px-3.5 py-2 rounded-[var(--radius-button)] bg-primary-solid text-primary-foreground text-xs font-bold hover:bg-primary-solid-hover transition shadow-xs flex items-center gap-1.5 w-full sm:w-auto justify-center"
          >
            <span>Tester la simulation IA</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {catalogError ? (
          <div
            role="alert"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-[var(--radius-card)] border border-rose-500/30 bg-rose-500/10"
          >
            <p className="text-xs sm:text-sm text-foreground leading-relaxed">{catalogError}</p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shrink-0"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => void load(applied, query)}
            >
              Réessayer
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {tabs.map(({ id, label, icon: Icon, hash }) => (
            <button
              key={id}
              type="button"
              onClick={() => selectTab(id, hash)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary',
                tab === id
                  ? 'bg-primary-solid text-primary-foreground border border-primary/30 shadow-xs'
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
                  emptyTitle="Aucune offre de matériel ou équipement"
                  emptyDescription="Les matériels et équipements disponibles apparaîtront ici."
                />
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={rentalItems.length}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  itemLabel="offres"
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
