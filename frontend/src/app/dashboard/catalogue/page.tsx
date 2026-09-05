'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Minimize2, Store, Wallet, Bookmark, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import {
  Alert,
  Breadcrumbs,
  Button,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  Pagination,
  paginateItems,
  usePageSize,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import CatalogueFilterBar, {
  CatalogueEntityFilterFields,
} from '@/components/CatalogueFilterBar';
import CatalogueResults, { CatalogueResultsSkeleton } from '@/components/CatalogueResults';
import { useCatalogueView } from '@/components/CatalogueViewToggle';
import MarketplaceLocationsMap from '@/components/MarketplaceLocationsMap';
import { CatalogueFocusStage, CatalogueImmersiveStage } from '@/components/CatalogueSearchLayout';
import CatalogueMobileExplore from '@/components/CatalogueMobileExplore';
import useIsMobile from '@/hooks/useIsMobile';
import {
  EMPTY_CATALOGUE_GEO,
  appendCatalogueGeoParams,
  catalogueGeoChips,
  catalogueItemToMapMarker,
  clearCatalogueGeoChip,
  resolveCatalogueGeo,
  withDashboardListingHref,
  type CatalogueGeoState,
  type CatalogueItem,
  type PublicEventCard,
  type PublicService,
  type PublicVenue,
  isServiceRentalCategory,
} from '@/lib/marketplace';
import {
  EMPTY_CATALOGUE_EXTRAS,
  HUB_FILTER_EXTRA_KEYS,
  KIND_FILTER_OPTIONS,
  appendCatalogueEntityParams,
  catalogueEntityExtraChips,
  catalogueKindFilterTitle,
  clearCatalogueExtraChip,
  composeCatalogueFeed,
  mergeCatalogueExtras,
  mergeGeoAndExtras,
  splitCatalogueExtras,
  type CatalogueEntityExtras,
  type CatalogueKind,
} from '@/lib/catalogueEntityFilters';
import { fetchPublicServicesForCatalogue } from '@/lib/catalogueFetch';
import { useCatalogueQueryState, useRememberListReturn } from '@/lib/catalogueQuery';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { favoriteToCatalogueItem, useListingFavorites } from '@/lib/listingFavorites';
import { eventTypeLabel } from '@/lib/listingDetails';
import {
  createDefaultBrief,
  hydrateBrief,
  readStoredBrief,
  snapshotPlanItems,
  writeStoredBrief,
  eventPlanAiToPackage,
  type EventPlanBrief,
  type EventPlanLock,
  type PlanItem,
  type PlanMissingSlot,
  type PlanPackage,
  type SavedEventBrief,
  type SavedEventPack,
} from '@/lib/eventPlan';
import EventPlanBriefForm from '@/components/EventPlanBriefForm';
import EventPlanMethodPicker from '@/components/EventPlanMethodPicker';
import EventPlanPacks from '@/components/EventPlanPacks';
import EventSavedPacks from '@/components/EventSavedPacks';
import EventPrepAiSimulator from '@/components/EventPrepAiSimulator';
import CatalogueViewToggle from '@/components/CatalogueViewToggle';
import EventPrepListingModal, { type EventPrepPreviewTarget } from '@/components/EventPrepListingModal';

type HubTab = 'explore' | 'favorites' | 'plan' | 'packs';
type PlanPrepView = 'manual' | 'ai' | 'final';
type HubFilters = CatalogueGeoState & CatalogueEntityExtras;

const HUB_TABS: HubTab[] = ['explore', 'favorites', 'plan', 'packs'];

function parseHubTab(params: URLSearchParams): HubTab {
  const raw = params.get('hub') || params.get('tab');
  return HUB_TABS.includes(raw as HubTab) ? (raw as HubTab) : 'explore';
}

function parsePlanPrepView(params: URLSearchParams): PlanPrepView {
  const raw = params.get('planView');
  return raw === 'ai' || raw === 'final' ? raw : 'manual';
}

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

function ClientMarketplaceInner() {
  useRememberListReturn();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { mode, setView, gridCols, setGridCols } = useCatalogueView();
  const lastBrowseRef = useRef<Exclude<import('@/lib/marketplace').CatalogueViewMode, 'map' | 'focus'>>('grid');
  const { q: query, setQ: setQuery, searchQ, applied, draft, setDraft, page, applyFilters, setPage } = useCatalogueQueryState(QUERY_OPTS);
  const { isFavorite, toggleFavorite, items: favoriteRows, loading: favoritesLoading, reload: reloadFavorites } = useListingFavorites();
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [events, setEvents] = useState<PublicEventCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterError, setFilterError] = useState('');
  const [pageSize, setPageSize] = usePageSize('dashboard-catalogue', 12);

  const [brief, setBrief] = useState<EventPlanBrief>(createDefaultBrief);
  const [briefReady, setBriefReady] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState('');
  const [manualPackages, setManualPackages] = useState<PlanPackage[]>([]);
  const [aiPackages, setAiPackages] = useState<PlanPackage[]>([]);
  const [finalPackage, setFinalPackage] = useState<PlanPackage | null>(null);
  const [spendableFc, setSpendableFc] = useState(0);
  const [planLock, setPlanLock] = useState<EventPlanLock | null>(null);
  const [flexSlots, setFlexSlots] = useState<string[]>([]);
  const [savedPacks, setSavedPacks] = useState<SavedEventPack[]>([]);
  const [savedBriefs, setSavedBriefs] = useState<SavedEventBrief[]>([]);
  const [favKind, setFavKind] = useState<'all' | 'venue' | 'service' | 'rental'>('all');
  const [favQ, setFavQ] = useState('');
  const [favMode, setFavMode] = useState<'grid' | 'list'>('grid');
  const [saveTarget, setSaveTarget] = useState<PlanPackage | null>(null);
  const [saveName, setSaveName] = useState('');
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [listingPreview, setListingPreview] = useState<EventPrepPreviewTarget | null>(null);

  const urlTab = parseHubTab(searchParams);
  const urlPlanView = parsePlanPrepView(searchParams);
  const [tab, setTabState] = useState<HubTab>(urlTab);
  const [planView, setPlanViewState] = useState<PlanPrepView>(urlPlanView);
  const pendingTab = useRef<HubTab | null>(null);
  const pendingPlanView = useRef<PlanPrepView | null>(null);

  useEffect(() => {
    if (pendingTab.current) {
      if (urlTab === pendingTab.current) pendingTab.current = null;
      return;
    }
    setTabState(urlTab);
  }, [urlTab]);

  useEffect(() => {
    if (pendingPlanView.current) {
      if (urlPlanView === pendingPlanView.current) pendingPlanView.current = null;
      return;
    }
    setPlanViewState(urlPlanView);
  }, [urlPlanView]);

  const setTab = (next: HubTab) => {
    pendingTab.current = next;
    setTabState(next);
    const params = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : searchParams.toString(),
    );
    params.delete('tab');
    if (next === 'explore') params.delete('hub');
    else params.set('hub', next);
    if (next !== 'plan') params.delete('planView');
    const qs = params.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    router.replace(href, { scroll: false });
  };

  const setPlanView = (next: PlanPrepView) => {
    pendingPlanView.current = next;
    setPlanViewState(next);
    const params = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : searchParams.toString(),
    );
    params.set('hub', 'plan');
    if (next === 'manual') params.delete('planView');
    else params.set('planView', next);
    const qs = params.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    router.replace(href, { scroll: false });
  };

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
      const eventQs = eventParams.toString() ? `?${eventParams}` : '';
      const loadVenues = filters.kind === 'all' || filters.kind === 'venue';
      const loadServices = filters.kind === 'all' || filters.kind === 'service' || filters.kind === 'rental';
      const loadEvents = filters.kind === 'all' || filters.kind === 'event';
      const [venuesData, services, eventsData] = await Promise.all([
        loadVenues ? api.get(`/public/venues${venueQs}`).catch(() => ({ venues: [] })) : Promise.resolve({ venues: [] }),
        loadServices ? fetchPublicServicesForCatalogue(serviceParams, filters.kind) : Promise.resolve([] as PublicService[]),
        loadEvents ? api.get(`/public/events${eventQs}`).catch(() => ({ events: [] })) : Promise.resolve({ events: [] }),
      ]);
      setVenues(venuesData.venues || []);
      setServices(services);
      setEvents(eventsData.events || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== 'explore') return;
    void load(applied, searchQ);
  }, [applied, searchQ, load, tab]);

  useEffect(() => {
    if (tab === 'favorites' || tab === 'packs') void reloadFavorites();
  }, [tab, reloadFavorites]);

  const loadSavedPacks = useCallback(async () => {
    try {
      const data = await api.get('/marketplace/event-packs');
      setSavedPacks(data.packs || []);
    } catch {
      setSavedPacks([]);
    }
  }, []);

  const loadSavedBriefs = useCallback(async () => {
    try {
      const data = await api.get('/marketplace/event-briefs');
      setSavedBriefs((data.briefs || []).map((row: SavedEventBrief) => ({
        ...row,
        payload: hydrateBrief(row.payload),
      })));
    } catch {
      setSavedBriefs([]);
    }
  }, []);

  useEffect(() => {
    setBrief(readStoredBrief());
    setBriefReady(true);
  }, []);

  useEffect(() => {
    if (!briefReady) return;
    writeStoredBrief(brief);
  }, [brief, briefReady]);

  useEffect(() => {
    if (tab === 'packs' || tab === 'plan') {
      void loadSavedPacks();
      void loadSavedBriefs();
    }
  }, [tab, loadSavedPacks, loadSavedBriefs]);

  const items = useMemo(
    () => composeCatalogueFeed(venues, services, events, applied, withDashboardListingHref),
    [venues, services, events, applied],
  );

  const visible = items;

  const favoriteItems = useMemo(
    () => favoriteRows.map(favoriteToCatalogueItem),
    [favoriteRows],
  );

  const visibleFavorites = useMemo(() => {
    const q = favQ.trim().toLowerCase();
    return favoriteItems.filter((item) => {
      if (favKind === 'venue' && item.kind !== 'venue') return false;
      if (favKind === 'service' && (item.kind !== 'service' || isServiceRentalCategory(item.category))) return false;
      if (favKind === 'rental' && (item.kind !== 'service' || !isServiceRentalCategory(item.category))) return false;
      if (!q) return true;
      return [item.title, item.orgName, item.location, item.categoryLabel].join(' ').toLowerCase().includes(q);
    });
  }, [favoriteItems, favKind, favQ]);

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

  const onToggleFavorite = (item: CatalogueItem) => {
    if (item.kind === 'event') return;
    void toggleFavorite(item.kind, item.slug);
  };

  const runPlan = async (overrides?: { lock?: EventPlanLock | null; flexSlots?: string[]; brief?: EventPlanBrief }) => {
    const current = overrides?.brief || brief;
    const lock = overrides?.lock === undefined ? planLock : overrides.lock;
    const nextFlex = overrides?.flexSlots === undefined ? flexSlots : overrides.flexSlots;
    setPlanning(true);
    setPlanError('');
    try {
      const data = await api.post('/marketplace/event-plan', {
        ...current,
        budgetFc: current.budgetMaxFc,
        city: current.city || undefined,
        commune: current.commune || undefined,
        guestCount: current.guestCount || undefined,
        eventDate: current.eventDate || undefined,
        lock: lock || undefined,
        flexSlots: nextFlex.length ? nextFlex : undefined,
      });
      setManualPackages(data.packages || []);
      setSpendableFc(Number(data.spendableFc) || brief.budgetMaxFc);
      if (!(data.packages || []).length) {
        setPlanError('Aucune proposition pour ce budget. Élargissez la ville, le type, la date ou le montant.');
      }
    } catch (err: unknown) {
      setManualPackages([]);
      setPlanError(err instanceof Error ? err.message : 'Impossible de préparer la proposition.');
    } finally {
      setPlanning(false);
    }
  };

  const replacePackItem = (packId: string, currentSlug: string, next: PlanItem) => {
    const budget = brief.budgetMaxFc || 0;
    const apply = (current: PlanPackage[]) => current.map((pack) => {
      if (pack.id !== packId) return pack;
      const rows = pack.venue ? [pack.venue, ...pack.services] : pack.services;
      const currentItem = rows.find((item) => item.slug === currentSlug);
      if (!currentItem) return pack;
      const room = pack.leftoverFc + currentItem.estimatedFc;
      if (next.estimatedFc > room) return pack;
      const swapped: PlanItem = {
        ...next,
        alternatives: [
          { ...currentItem, alternatives: [] },
          ...(currentItem.alternatives || []).filter((item) => item.slug !== next.slug),
        ],
      };
      const nextRows = rows.map((item) => (item.slug === currentSlug ? swapped : item));
      const venue = nextRows.find((item) => item.kind === 'venue') || null;
      const services = nextRows.filter((item) => item.kind === 'service');
      const totalFc = nextRows.reduce((sum, item) => sum + item.estimatedFc, 0);
      return {
        ...pack,
        venue,
        services,
        items: nextRows,
        totalFc,
        leftoverFc: Math.max(0, budget - totalFc),
        overBudget: totalFc > budget,
      };
    });
    if (planView === 'ai') setAiPackages((current) => apply(current));
    else if (planView === 'final') setFinalPackage((prev) => (prev ? apply([prev])[0] || prev : prev));
    else setManualPackages((current) => apply(current));
  };

  const workingPackages = planView === 'ai' ? aiPackages : planView === 'final' ? (finalPackage ? [finalPackage] : []) : manualPackages;

  const persistPack = async (payload: {
    name: string;
    eventType: string;
    budgetFc: number;
    city?: string;
    guestCount?: number;
    eventDate?: string;
    source: 'search' | 'custom';
    styleLabel?: string;
    items: ReturnType<typeof snapshotPlanItems>;
  }) => {
    await api.post('/marketplace/event-packs', payload);
    await loadSavedPacks();
  };

  const saveSearchPack = async () => {
    if (!saveTarget) return;
    setSaveBusy(true);
    setSaveError('');
    try {
      const items = snapshotPlanItems(saveTarget.venue ? [saveTarget.venue, ...saveTarget.services] : saveTarget.services);
      await persistPack({
        name: saveName.trim() || `${eventTypeLabel(brief.eventType)} · ${saveTarget.label}`,
        eventType: brief.eventType,
        budgetFc: brief.budgetMaxFc || saveTarget.totalFc,
        city: brief.city || undefined,
        guestCount: brief.guestCount || undefined,
        eventDate: brief.eventDate || undefined,
        source: 'search',
        styleLabel: saveTarget.label,
        items,
      });
      setSaveTarget(null);
      setTab('packs');
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Impossible d’enregistrer le pack.');
    } finally {
      setSaveBusy(false);
    }
  };

  const mapMode = tab === 'explore' && mode === 'map';
  const focusMode = tab === 'explore' && mode === 'focus';
  const immersiveExplore = tab === 'explore' && (focusMode || (isMobile && mapMode));

  useEffect(() => {
    if (mode === 'grid' || mode === 'list') lastBrowseRef.current = mode;
  }, [mode]);

  useEffect(() => {
    if (!immersiveExplore) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setView(lastBrowseRef.current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [immersiveExplore, setView]);

  const kindPills = (
    <div className="flex flex-nowrap sm:flex-wrap items-center gap-1.5">
      {KIND_FILTER_OPTIONS.map((item) => {
        const isSelected = applied.kind === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              const kind = item.id as CatalogueKind;
              applyFilters({
                ...applied,
                kind,
                roomType: kind === 'service' || kind === 'rental' || kind === 'event' ? '' : applied.roomType,
                category: kind === 'venue' || kind === 'event'
                  ? ''
                  : kind === 'service' && isServiceRentalCategory(applied.category)
                    ? ''
                    : kind === 'rental' && applied.category && !isServiceRentalCategory(applied.category)
                      ? ''
                      : applied.category,
                mobility: kind === 'venue' || kind === 'event' ? '' : applied.mobility,
                priceUnit: kind === 'venue' || kind === 'event' ? '' : applied.priceUnit,
                entry: kind === 'venue' || kind === 'service' || kind === 'rental' ? '' : applied.entry,
              });
            }}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold border transition touch-manipulation shrink-0',
              isSelected
                ? 'bg-primary text-white border-primary shadow-xs'
                : 'border-white/25 dark:border-white/10 bg-surface/95 text-muted hover:text-foreground hover:border-primary/40 shadow-sm',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );

  const exploreFilterBar = (variant: 'card' | 'float') => (
    <CatalogueFilterBar
      variant={variant}
      topSlot={kindPills}
      hideViewToggle={variant === 'float'}
      compactToggle={variant === 'float'}
      hideShare={variant === 'float'}
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
      modalTitle={catalogueKindFilterTitle(draft.kind, 'Filtrer le marketplace')}
      filters={
        <CatalogueEntityFilterFields
          showKind={false}
          value={draft}
          extras={draft}
          error={filterError}
          onChange={(geo, extras) => setDraft(mergeGeoAndExtras(geo, extras))}
        />
      }
    />
  );

  return (
    <>
      {immersiveExplore ? (
        <CatalogueImmersiveStage>
          {isMobile ? (
            <CatalogueMobileExplore
              items={visible}
              markers={markers}
              loading={loading}
              error={filterError}
              searchCenter={searchCenter}
              radiusKm={applied.radiusKm}
              city={applied.city}
              searchOriginLabel={applied.proximity === 'around' ? 'Vous êtes ici' : 'Lieu de recherche'}
              onExit={() => setView(lastBrowseRef.current)}
              filters={exploreFilterBar('float')}
              emptyTitle="Aucune fiche géolocalisée"
              emptyDescription="Élargissez les filtres ou changez de ville pour trouver des établissements."
            />
          ) : (
            <CatalogueFocusStage
              className="h-full w-full"
              markers={markers}
              loading={loading}
              error={filterError}
              listingSearch={false}
              navigateOnClick={false}
              searchCenter={searchCenter}
              radiusKm={applied.radiusKm}
              city={applied.city}
              searchOriginLabel={applied.proximity === 'around' ? 'Vous êtes ici' : 'Lieu de recherche'}
              header={
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface/95 backdrop-blur-xl border border-border shadow-md text-xs font-bold text-foreground">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Mode Focus · Carte interactive</span>
                    <span className="text-muted font-normal">({visible.length} fiches)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setView(lastBrowseRef.current)}
                    className="h-10 shrink-0 inline-flex items-center gap-1.5 px-3.5 rounded-full bg-surface/95 backdrop-blur-xl border border-border shadow-md text-xs font-bold text-foreground hover:bg-surface hover:text-primary transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                    Quitter le focus
                  </button>
                </div>
              }
              filters={exploreFilterBar('float')}
            />
          )}
        </CatalogueImmersiveStage>
      ) : null}

    <div className={cn('space-y-6 w-full', immersiveExplore && 'hidden')}>
      <PageHeader
        title={searchParams.get('kind') === 'event' && tab === 'explore' ? 'Agenda' : 'Marketplace'}
        description={
          tab === 'plan'
            ? 'Choisissez comment simuler (par critères ou avec l’IA), puis retenez le pack utilisé pour les devis.'
            : tab === 'favorites'
              ? 'Salles, prestataires et matériel & équipements enregistrés. Filtrez et changez la vue grille ou liste.'
              : tab === 'packs'
                ? 'Packs et briefs sauvegardés, à reprendre ou à envoyer en devis.'
                : searchParams.get('kind') === 'event'
                  ? 'Événements publics du marketplace. Inscrivez-vous ou achetez un billet — il apparaît dans Mes billets.'
                  : 'Explorez les salles, prestataires et matériel & équipements, enregistrez vos favoris, puis préparez un événement selon votre budget.'
        }
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Marketplace', href: '/dashboard/catalogue' },
              {
                label:
                  tab === 'favorites'
                    ? 'Favoris'
                    : tab === 'plan'
                      ? 'Préparer un événement'
                      : tab === 'packs'
                        ? 'Mes packs'
                        : searchParams.get('kind') === 'event'
                          ? 'Agenda'
                          : 'Explorer',
              },
            ]}
          />
        }
      />

      <div
        role="tablist"
        aria-label="Sections du marketplace"
        className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/40 p-1"
      >
        {[
          { id: 'explore' as const, label: 'Explorer', icon: Store },
          { id: 'favorites' as const, label: 'Favoris', icon: Heart },
          { id: 'plan' as const, label: 'Préparer un événement', icon: Wallet },
          { id: 'packs' as const, label: 'Mes packs', icon: Bookmark },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              'inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition',
              tab === item.id
                ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
                : 'text-muted hover:bg-surface/70 hover:text-foreground',
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
            {item.id === 'favorites' && favoriteRows.length > 0 ? ` (${favoriteRows.length})` : ''}
            {item.id === 'packs' && savedPacks.length > 0 ? ` (${savedPacks.length})` : ''}
          </button>
        ))}
      </div>

      {tab === 'explore' && !immersiveExplore ? (
          <>
            <div className="sticky top-0 md:top-14 z-10 -mx-1 px-1 py-1 bg-background/90 backdrop-blur-md">
              {exploreFilterBar('card')}
            </div>

            {loading ? (
              <CatalogueResultsSkeleton mode={mapMode ? 'map' : mode === 'list' ? 'list' : 'grid'} count={pageSize} gridCols={gridCols} />
            ) : mapMode ? (
              markers.length === 0 ? (
                <EmptyState icon={<Store className="w-5 h-5" />} title="Aucune position" description="Aucune fiche géolocalisée ne correspond à cette recherche." />
              ) : (
                <MarketplaceLocationsMap
                  markers={markers}
                  listingSearch
                  navigateOnClick={false}
                  height={500}
                  searchCenter={searchCenter}
                  radiusKm={searchCenter ? applied.radiusKm : 0}
                  city={applied.city}
                  searchOriginLabel={applied.proximity === 'around' ? 'Vous êtes ici' : 'Lieu de recherche'}
                />
              )
            ) : (
              <div className="space-y-3">
                <CatalogueResults
                  items={paginateItems(visible, page, pageSize)}
                  mode={mode === 'list' ? 'list' : 'grid'}
                  gridCols={gridCols}
                  emptyTitle="Aucune fiche pour cette recherche"
                  emptyDescription="Élargissez les mots-clés, la ville ou le type pour voir des salles, prestataires, matériel & équipements et événements."
                  isFavorite={(item) => item.kind !== 'event' && isFavorite(item.kind, item.slug)}
                  onToggleFavorite={onToggleFavorite}
                />
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={visible.length}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  itemLabel="fiches"
                />
              </div>
            )}
          </>
      ) : null}

      {tab === 'favorites' ? (
        favoritesLoading ? (
          <CatalogueResultsSkeleton mode={favMode} count={8} gridCols={gridCols} />
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-surface p-3 sm:p-4 space-y-3 shadow-[var(--shadow-soft)]">
              <div className="pb-2 border-b border-border/70 flex flex-wrap items-center gap-1.5">
                {([
                  ['all', 'Tous'],
                  ['venue', 'Salles'],
                  ['service', 'Prestataires'],
                  ['rental', 'Matériel & Équipements'],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFavKind(id)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-semibold border transition touch-manipulation',
                      favKind === id
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'border-border bg-surface-muted/60 text-muted hover:text-foreground hover:border-primary/40',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <Input
                    value={favQ}
                    onChange={(e) => setFavQ(e.target.value)}
                    placeholder="Filtrer par nom, ville, prestataire…"
                    leftIcon={<Store className="w-4 h-4" />}
                  />
                </div>
                <CatalogueViewToggle
                  compact
                  hideMap
                  value={favMode}
                  onChange={(next) => setFavMode(next === 'list' ? 'list' : 'grid')}
                />
              </div>
            </div>
            <CatalogueResults
              items={visibleFavorites}
              mode={favMode}
              gridCols={gridCols}
              emptyTitle={favoriteItems.length === 0 ? 'Aucun favori pour le moment' : 'Aucun favori pour ce filtre'}
              emptyDescription={favoriteItems.length === 0
                ? 'Dans Explorer, cliquez sur le cœur d’une salle, d’un prestataire ou d’un équipement pour le retrouver ici.'
                : 'Changez le type (salles / prestataires / matériel & équipements) ou le mot-clé.'}
              isFavorite={(item) => item.kind !== 'event' && isFavorite(item.kind, item.slug)}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        )
      ) : null}

      {tab === 'plan' ? (
        <div className="space-y-5">
          <EventPlanMethodPicker
            value={planView}
            onChange={setPlanView}
            counts={{
              manual: manualPackages.length,
              ai: aiPackages.length,
              final: finalPackage ? 1 : 0,
            }}
            finalLocked
          />

          <div className="space-y-5">
            {planView === 'ai' ? (
              <EventPrepAiSimulator
                defaultOpen
                defaults={{
                  eventType: brief.eventType,
                  city: brief.city,
                  commune: brief.commune,
                  guestCount: brief.guestCount,
                  eventDate: brief.eventDate,
                  budgetMaxFc: brief.budgetMaxFc,
                  keepVenueSlug: aiPackages[0]?.venue?.slug || manualPackages[0]?.venue?.slug,
                  keepServiceSlugs: [
                    ...(aiPackages[0]?.services || []),
                    ...(manualPackages[0]?.services || []),
                  ].map((item) => item.slug),
                }}
                applyLabel="Retenir cette proposition"
                onOpenListing={(target) => setListingPreview(target)}
                onApply={(pack) => {
                  setAiPackages(() => {
                    const next = eventPlanAiToPackage(pack, brief.budgetMaxFc);
                    return [next];
                  });
                  setPlanError('');
                }}
              />
            ) : null}

            {planView === 'manual' ? (
              <EventPlanBriefForm
                brief={brief}
                onChange={(next) => {
                  setBrief(next);
                  setPlanLock(null);
                  setFlexSlots([]);
                }}
                planning={planning}
                error={planError}
                onSubmit={() => {
                  setPlanLock(null);
                  setFlexSlots([]);
                  void runPlan({ lock: null, flexSlots: [] });
                }}
                briefs={savedBriefs}
                onSaveBrief={async (name) => {
                  await api.post('/marketplace/event-briefs', { name, payload: brief });
                  await loadSavedBriefs();
                }}
                onLoadBrief={(item) => {
                  setBrief(hydrateBrief(item.payload));
                  setPlanLock(null);
                  setFlexSlots([]);
                  setManualPackages([]);
                }}
                onDeleteBrief={async (id) => {
                  await api.delete(`/marketplace/event-briefs/${id}`);
                  await loadSavedBriefs();
                }}
              />
            ) : null}

            {planView === 'final' ? (
              <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">Quel pack retenir ?</p>
                  <p className="text-xs text-muted leading-relaxed">
                    Reprenez un pack d’une simulation — c’est celui que vous enregistrerez dans Mes packs et utiliserez pour les devis.
                  </p>
                </div>
                {manualPackages.length === 0 && aiPackages.length === 0 ? (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => setPlanView('manual')}>
                      Simuler par critères
                    </Button>
                    <Button type="button" size="sm" onClick={() => setPlanView('ai')}>
                      Simuler avec l’IA
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {manualPackages.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Issus des critères (sans IA)</p>
                        <div className="flex flex-wrap gap-2">
                          {manualPackages.map((pack) => (
                            <Button
                              key={`manual-${pack.id}`}
                              type="button"
                              size="sm"
                              variant={finalPackage?.id === `final-${pack.id}` ? 'primary' : 'secondary'}
                              onClick={() => setFinalPackage({ ...pack, id: `final-${pack.id}`, label: pack.label || 'Pack sans IA' })}
                            >
                              {pack.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {aiPackages.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Issus de l’IA</p>
                        <div className="flex flex-wrap gap-2">
                          {aiPackages.map((pack) => (
                            <Button
                              key={`ai-${pack.id}`}
                              type="button"
                              size="sm"
                              variant={finalPackage?.id === `final-${pack.id}` ? 'primary' : 'secondary'}
                              onClick={() => setFinalPackage({ ...pack, id: `final-${pack.id}`, label: pack.label || 'Proposition IA' })}
                            >
                              {pack.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}

            {workingPackages.length > 0 ? (
              <div className="space-y-3 pt-2 animate-fade-in">
                {planView === 'ai' ? (
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-primary/10 border border-primary/25">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          Formule IA sélectionnée & prête pour votre projet
                        </p>
                        <p className="text-[11px] text-muted">
                          Vous pouvez ajuster chaque ligne, sauvegarder dans Mes packs ou contacter directement les prestataires certifiés.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
                <EventPlanPacks
                  packages={workingPackages}
                  budgetFc={brief.budgetMaxFc}
                  spendableFc={spendableFc || brief.budgetMaxFc}
                  isFavorite={isFavorite}
                  onToggleFavorite={(kind, slug) => void toggleFavorite(kind, slug)}
                  onOpenListing={(item) => setListingPreview({ kind: item.kind, slug: item.slug })}
                  onReplace={replacePackItem}
                  onChooseFinal={planView !== 'final' ? (pack) => {
                    setFinalPackage({
                      ...pack,
                      id: `final-${pack.id}`,
                      label: pack.label,
                    });
                    setPlanView('final');
                  } : undefined}
                  onSave={(pack) => {
                    setSaveName(`${eventTypeLabel(brief.eventType)} · ${pack.label}`);
                    setSaveError('');
                    setSaveTarget(pack);
                  }}
                  onKeep={planView === 'manual' ? (item) => {
                    const lock: EventPlanLock = {
                      kind: item.kind,
                      slug: item.slug,
                      category: item.kind === 'service' ? item.category : undefined,
                    };
                    setPlanLock(lock);
                    void runPlan({ lock });
                  } : undefined}
                  onWidenSlot={planView === 'manual' ? (slot: PlanMissingSlot) => {
                    const nextBrief: EventPlanBrief = { ...brief, matchMode: 'widen', missingStrategy: 'widen_city' };
                    if (slot.slot === 'venue') {
                      nextBrief.includeVenue = 'yes';
                    } else {
                      nextBrief.slots = { ...brief.slots, [slot.slot]: 'required' };
                      const nextFlex = flexSlots.includes(slot.slot) ? flexSlots : [...flexSlots, slot.slot];
                      setFlexSlots(nextFlex);
                      setBrief(nextBrief);
                      void runPlan({ flexSlots: nextFlex, brief: nextBrief });
                      return;
                    }
                    setBrief(nextBrief);
                    void runPlan({ lock: planLock, brief: nextBrief });
                  } : undefined}
                />
              </div>
            ) : !planning && (planView !== 'manual' || !planError) ? (
              <EmptyState
                icon={<Wallet className="w-5 h-5" />}
                title={
                  planView === 'ai'
                    ? 'Aucune simulation IA retenue'
                    : planView === 'final'
                      ? 'Pas encore de solution finale'
                      : 'Préparez votre événement'
                }
                description={
                  planView === 'ai'
                    ? 'Décrivez l’événement ci-dessus, lancez la simulation, puis retenez le mix proposé.'
                    : planView === 'final'
                      ? 'Choisissez un pack issu de la simulation par critères ou de l’IA.'
                      : 'Indiquez le budget, la date et les prestataires, puis lancez la recherche.'
                }
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === 'packs' ? (
        <EventSavedPacks
          packs={savedPacks}
          favorites={favoriteRows}
          eventType={brief.eventType}
          budgetFc={brief.budgetMaxFc}
          city={brief.city}
          guestCount={brief.guestCount}
          onOpenListing={(item) => setListingPreview({ kind: item.kind, slug: item.slug })}
          onCreate={async (payload) => {
            await persistPack(payload);
          }}
          onDelete={async (id) => {
            await api.delete(`/marketplace/event-packs/${id}`);
            await loadSavedPacks();
          }}
        />
      ) : null}

      <Modal
        open={Boolean(saveTarget)}
        onClose={() => setSaveTarget(null)}
        title="Sauvegarder ce pack"
        description="Il apparaîtra dans Mes packs, pour y revenir avant de réserver."
        footer={
          <>
            <Button variant="ghost" onClick={() => setSaveTarget(null)}>Annuler</Button>
            <Button loading={saveBusy} onClick={() => void saveSearchPack()}>Enregistrer</Button>
          </>
        }
      >
        <Input
          label="Nom du pack"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
        />
        {saveError ? <Alert variant="error" className="mt-3">{saveError}</Alert> : null}
      </Modal>

      <EventPrepListingModal
        target={listingPreview}
        selected={false}
        dateKey={brief.eventDate?.slice(0, 10) || ''}
        guestCount={brief.guestCount}
        onClose={() => setListingPreview(null)}
      />
    </div>
    </>
  );
}

export default function ClientMarketplacePage() {
  return (
    <Suspense fallback={<div className="py-16 text-sm text-muted">Chargement du marketplace…</div>}>
      <ClientMarketplaceInner />
    </Suspense>
  );
}
