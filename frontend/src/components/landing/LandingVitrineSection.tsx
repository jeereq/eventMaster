'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button, Pagination, usePaginateItems, usePageSize } from '@/components/ui';
import { cn } from '@/lib/cn';
import CatalogueResults, { CatalogueResultsSkeleton } from '@/components/CatalogueResults';
import CatalogueFilterBar, { CatalogueEntityFilterFields } from '@/components/CatalogueFilterBar';
import {
  EMPTY_CATALOGUE_GEO,
  appendCatalogueGeoParams,
  catalogueGeoChips,
  catalogueItemMatchesEnabledCities,
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
import { ArrowRight, Building2, Calendar, KeyRound, RefreshCw, Sparkles, Clock, Wine } from 'lucide-react';
import { useCatalogueGridCols, type CatalogueGridCols } from '@/components/CatalogueViewToggle';
import { marketplaceSectionUrl } from '@/lib/share';
import { useLandingReveal } from '@/components/landing/useLandingReveal';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { enabledMarketplaceCities } from '@/lib/platformCities';

type VitrineTab = 'venues' | 'services' | 'rentals' | 'events';
type EntityFilters = CatalogueGeoState & CatalogueEntityExtras;

const emptyFilters: EntityFilters = { ...EMPTY_CATALOGUE_GEO, ...EMPTY_CATALOGUE_EXTRAS };

export default function LandingVitrineSection() {
  const revealRef = useLandingReveal<HTMLElement>();
  const { site } = usePlatformSite();
  const isBudgetBlocked = site?.studioVisibility?.budget === false;
  const marketplaceCities = enabledMarketplaceCities(site);
  const [tab, setTab] = useState<VitrineTab>('venues');
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [events, setEvents] = useState<PublicEventCard[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
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

  const load = useCallback(async (filters: EntityFilters, search: string, entityTab: VitrineTab) => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setCatalogError('Vous semblez hors ligne. Vérifiez votre connexion Internet puis réessayez.');
      setLoadingCatalog(false);
      return;
    }
    setLoadingCatalog(true);
    setCatalogError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      appendCatalogueGeoParams(params, filters);

      if (entityTab === 'venues') {
        appendCatalogueEntityParams(params, { ...filters, kind: 'venue' }, 'venue');
        const venuesRes = await api.get(`/public/venues?${params.toString()}`);
        setVenues(venuesRes.venues || []);
      } else if (entityTab === 'services' || entityTab === 'rentals') {
        appendCatalogueEntityParams(params, filters, 'service');
        const servicesRes = await fetchPublicServicesForCatalogue(params, 'all');
        setServices(servicesRes);
      } else {
        appendCatalogueEntityParams(params, { ...filters, kind: 'event' }, 'event');
        const eventsRes = await api.get(`/public/events?${params.toString()}`);
        setEvents(eventsRes.events || []);
      }
    } catch {
      if (entityTab === 'venues') setVenues([]);
      if (entityTab === 'services' || entityTab === 'rentals') setServices([]);
      if (entityTab === 'events') setEvents([]);
      setCatalogError('Impossible de charger le catalogue. Vérifiez votre connexion, puis réessayez.');
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => load(applied, query, tab), 280);
    return () => window.clearTimeout(t);
  }, [applied, query, tab, load]);

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
        (item) =>
          catalogueItemMatchesEnabledCities(item, marketplaceCities)
          && catalogueItemMatchesGeo(item, applied)
          && catalogueItemMatchesExtras(item, { ...applied, kind: 'venue' }),
      ),
    [venues, query, applied, marketplaceCities],
  );
  const serviceItems = useMemo(
    () =>
      filterCatalogueItems(services.map(serviceToCatalogueItem), query).filter(
        (item) =>
          catalogueItemMatchesEnabledCities(item, marketplaceCities)
          && catalogueItemMatchesGeo(item, applied)
          && catalogueItemMatchesExtras(item, { ...applied, kind: 'service' }),
      ),
    [services, query, applied, marketplaceCities],
  );
  const rentalItems = useMemo(
    () =>
      filterCatalogueItems(services.map(serviceToCatalogueItem), query).filter(
        (item) =>
          catalogueItemMatchesEnabledCities(item, marketplaceCities)
          && catalogueItemMatchesGeo(item, applied)
          && catalogueItemMatchesExtras(item, { ...applied, kind: 'rental' }),
      ),
    [services, query, applied, marketplaceCities],
  );
  const eventItems = useMemo(
    () =>
      filterCatalogueItems(
        events
          .map(eventToCatalogueItem)
          .filter((item): item is NonNullable<typeof item> => Boolean(item)),
        query,
      ).filter(
        (item) =>
          catalogueItemMatchesEnabledCities(item, marketplaceCities)
          && catalogueItemMatchesGeo(item, applied)
          && catalogueItemMatchesExtras(item, { ...applied, kind: 'event' }),
      ),
    [events, query, applied, marketplaceCities],
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

  const pagedVenues = usePaginateItems(venueItems, page, pageSize);
  const pagedServices = usePaginateItems(serviceItems, page, pageSize);
  const pagedRentals = usePaginateItems(rentalItems, page, pageSize);
  const pagedEvents = usePaginateItems(eventItems, page, pageSize);
  const chips = catalogueGeoChips(applied, catalogueEntityExtraChips({ ...applied, kind: entity }));
  const hasFilterOrSearch = Boolean(query.trim() || chips.length > 0);

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
    <section ref={revealRef} className="em-reveal em-landing-defer py-8 sm:py-16 border-t border-border bg-surface/80 dark:bg-background/80 em-landing-section-glow">
      <div id="catalogue" className="scroll-mt-16" />
      <div id="salles" className="scroll-mt-16" />
      <div id="prestataires" className="scroll-mt-16" />
      <div id="locations" className="scroll-mt-16" />
      <div id="evenements" className="scroll-mt-16" />
      <div className="page-container relative z-10 space-y-5 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-6">
          <div className="max-w-xl space-y-2.5">
            <h2 className="em-landing-heading text-xl sm:text-3xl text-foreground">
              Salles, métiers, matériel et billetteries
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Salles, prestataires, matériel, boissons et événements.
            </p>
          </div>
          <Button href="/marketplace" className="w-full sm:w-auto" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Tout le marketplace
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-start" role="group" aria-label="Catégories du catalogue">
          {tabs.map(({ id, label, icon: Icon, hash }) => (
            <button
              key={id}
              id={`vitrine-tab-${id}`}
              type="button"
              aria-pressed={tab === id}
              aria-controls={`vitrine-panel-${id}`}
              onClick={() => selectTab(id, hash)}
              className={cn(
                'min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2 rounded-[var(--radius-button)] sm:rounded-full text-sm font-semibold leading-tight text-center transition cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                tab === id
                  ? 'bg-primary-solid text-primary-foreground border border-primary/30 shadow-xs'
                  : 'bg-surface text-muted hover:text-foreground border border-border hover:bg-surface-muted/60',
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
              {id === 'rentals' ? (
                <>
                  <span className="sm:hidden">Matériel</span>
                  <span className="hidden sm:inline">{label}</span>
                </>
              ) : (
                label
              )}
            </button>
          ))}
          <Link
            href="/marketplace/boissons"
            className="col-span-2 sm:col-auto min-h-[44px] inline-flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2 rounded-[var(--radius-button)] sm:rounded-full text-sm font-semibold leading-tight bg-surface text-muted hover:text-foreground border border-border hover:bg-surface-muted/60 transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Wine className="w-3.5 h-3.5 shrink-0" aria-hidden />
            Boissons
          </Link>
        </div>

        <div
          className={`flex items-center justify-between gap-3 p-3 sm:p-4 rounded-[var(--radius-card)] border shadow-xs ${
            isBudgetBlocked
              ? 'bg-festive-accent/10 border-festive-accent/30'
              : 'bg-gradient-to-r from-primary/10 via-surface to-primary/5 border-primary/25'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-[var(--radius-button)] flex items-center justify-center shrink-0 ${
                isBudgetBlocked
                  ? 'bg-festive-accent/15 text-foreground'
                  : 'bg-primary/15 text-primary'
              }`}
            >
              {isBudgetBlocked ? <Clock className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <span className="sm:hidden">
                  {isBudgetBlocked ? 'Pack budget IA' : 'Pack budget'}
                </span>
                <span className="hidden sm:inline">
                  {isBudgetBlocked
                    ? 'Simulateur de pack budget IA'
                    : 'Besoin d’un pack complet selon votre budget ?'}
                </span>
                {isBudgetBlocked && (
                  <span className="px-1.5 py-0.5 text-sm font-bold rounded-full bg-festive-accent/15 text-foreground border border-festive-accent/30">
                    À venir
                  </span>
                )}
              </p>
              <p className="text-sm text-foreground hidden sm:block">
                {isBudgetBlocked
                  ? 'Bientôt. En attendant, composez le panier depuis les fiches.'
                  : '3 formules : salle, traiteur, déco et DJ.'}
              </p>
            </div>
          </div>
          <Button
            href="/simulateur"
            size="sm"
            variant={isBudgetBlocked ? 'secondary' : 'primary'}
            className="shrink-0"
            aria-label={isBudgetBlocked ? 'En savoir plus sur la fonctionnalité à venir' : 'Tester la simulation IA'}
            rightIcon={isBudgetBlocked ? <Clock className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          >
            <span className="sm:hidden">{isBudgetBlocked ? 'À venir' : 'Simuler'}</span>
            <span className="hidden sm:inline">
              {isBudgetBlocked ? 'Fonctionnalité à venir' : 'Tester la simulation IA'}
            </span>
          </Button>
        </div>

        {catalogError ? (
          <div
            role="alert"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-[var(--radius-card)] border border-danger/30 bg-danger/10"
          >
            <p className="text-sm text-foreground leading-relaxed">{catalogError}</p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shrink-0"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => void load(applied, query, tab)}
            >
              Réessayer
            </Button>
          </div>
        ) : null}

        {tab === 'venues' && (
          <div
            id="vitrine-panel-venues"
            className="space-y-4"
            role="region"
            aria-labelledby="vitrine-tab-venues"
            aria-busy={loadingCatalog}
            aria-live="polite"
          >
            {catalogFilters}
            {loadingCatalog ? (
              <CatalogueResultsSkeleton mode="grid" count={pageSize} gridCols={vitrineCols} />
            ) : (
              <>
                <CatalogueResults
                  items={pagedVenues}
                  mode="grid"
                  gridCols={vitrineCols}
                  emptyTitle={hasFilterOrSearch ? 'Aucune salle trouvée' : 'Aucune salle publiée'}
                  emptyDescription={
                    hasFilterOrSearch
                      ? 'Élargissez la ville ou le prix.'
                      : 'Les salles publiées apparaîtront ici.'
                  }
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
          <div
            id="vitrine-panel-services"
            className="space-y-4"
            role="region"
            aria-labelledby="vitrine-tab-services"
            aria-busy={loadingCatalog}
            aria-live="polite"
          >
            {catalogFilters}
            {loadingCatalog ? (
              <CatalogueResultsSkeleton mode="grid" count={pageSize} gridCols={vitrineCols} />
            ) : (
              <>
                <CatalogueResults
                  items={pagedServices}
                  mode="grid"
                  gridCols={vitrineCols}
                  emptyTitle={hasFilterOrSearch ? 'Aucun prestataire trouvé' : 'Aucun prestataire publié'}
                  emptyDescription={
                    hasFilterOrSearch
                      ? 'Élargissez la ville ou le métier.'
                      : 'Les prestataires publiés apparaîtront ici.'
                  }
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
          <div
            id="vitrine-panel-rentals"
            className="space-y-4"
            role="region"
            aria-labelledby="vitrine-tab-rentals"
            aria-busy={loadingCatalog}
            aria-live="polite"
          >
            {catalogFilters}
            {loadingCatalog ? (
              <CatalogueResultsSkeleton mode="grid" count={pageSize} gridCols={vitrineCols} />
            ) : (
              <>
                <CatalogueResults
                  items={pagedRentals}
                  mode="grid"
                  gridCols={vitrineCols}
                  emptyTitle={hasFilterOrSearch ? 'Aucun matériel trouvé' : 'Aucune offre de matériel ou équipement'}
                  emptyDescription={
                    hasFilterOrSearch
                      ? 'Élargissez la ville ou le type.'
                      : 'Le matériel publié apparaîtra ici.'
                  }
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
          <div
            id="vitrine-panel-events"
            className="space-y-4"
            role="region"
            aria-labelledby="vitrine-tab-events"
            aria-busy={loadingCatalog}
            aria-live="polite"
          >
            {catalogFilters}
            {loadingCatalog ? (
              <CatalogueResultsSkeleton mode="grid" count={pageSize} gridCols={vitrineCols} />
            ) : (
              <>
                <CatalogueResults
                  items={pagedEvents}
                  mode="grid"
                  gridCols={vitrineCols}
                  emptyTitle={hasFilterOrSearch ? 'Aucun événement trouvé' : 'Aucun événement public'}
                  emptyDescription={
                    hasFilterOrSearch
                      ? 'Élargissez la ville ou la date.'
                      : 'Les événements publiés apparaîtront ici.'
                  }
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
