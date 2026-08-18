'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Loader2, Sparkles, Store, Wallet, Bookmark } from 'lucide-react';
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
  CatalogueChoicePills,
  CatalogueFilterField,
  CatalogueGeoFields,
} from '@/components/CatalogueFilterBar';
import CatalogueResults, { CatalogueResultsSkeleton } from '@/components/CatalogueResults';
import { useCatalogueView } from '@/components/CatalogueViewToggle';
import MarketplaceLocationsMap from '@/components/MarketplaceLocationsMap';
import {
  EMPTY_CATALOGUE_GEO,
  SERVICE_MOBILITY_OPTIONS,
  SERVICE_CATEGORY_LABELS,
  appendCatalogueGeoParams,
  catalogueGeoChips,
  catalogueItemMatchesGeo,
  catalogueItemToMapMarker,
  catalogueKindFilterLabel,
  clearCatalogueGeoChip,
  eventToCatalogueItem,
  isCatalogueMapView,
  resolveCatalogueGeo,
  serviceToCatalogueItem,
  sortCatalogueByDistance,
  venueToCatalogueItem,
  withCatalogueDistance,
  withDashboardListingHref,
  type CatalogueGeoState,
  type CatalogueItem,
  type PublicEventCard,
  type PublicService,
  type PublicVenue,
  type ServiceCategory,
  type ServiceMobility,
} from '@/lib/marketplace';
import { useCatalogueQueryState, useRememberListReturn } from '@/lib/catalogueQuery';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { favoriteToCatalogueItem, useListingFavorites } from '@/lib/listingFavorites';
import { LISTING_EVENT_TYPES, eventTypeLabel, type ListingEventTypeId } from '@/lib/listingDetails';
import { EVENT_PLAN_SLOTS, snapshotPlanItems, type PlanItem, type PlanPackage, type SavedEventPack } from '@/lib/eventPlan';
import EventPlanPacks from '@/components/EventPlanPacks';
import EventSavedPacks from '@/components/EventSavedPacks';
import CatalogueViewToggle from '@/components/CatalogueViewToggle';

type HubTab = 'explore' | 'favorites' | 'plan' | 'packs';
type HubFilters = CatalogueGeoState & { kind: 'all' | 'venue' | 'service' | 'event'; mobility: ServiceMobility };

const HUB_TABS: HubTab[] = ['explore', 'favorites', 'plan', 'packs'];

function parseHubTab(params: URLSearchParams): HubTab {
  const raw = params.get('hub') || params.get('tab');
  return HUB_TABS.includes(raw as HubTab) ? (raw as HubTab) : 'explore';
}

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

function ClientMarketplaceInner() {
  useRememberListReturn();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mode, setView, gridCols, setGridCols } = useCatalogueView();
  const { q: query, setQ: setQuery, searchQ, applied, draft, setDraft, page, applyFilters, setPage } = useCatalogueQueryState(QUERY_OPTS);
  const { isFavorite, toggleFavorite, items: favoriteRows, loading: favoritesLoading, reload: reloadFavorites } = useListingFavorites();
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [events, setEvents] = useState<PublicEventCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterError, setFilterError] = useState('');
  const [pageSize, setPageSize] = usePageSize('dashboard-catalogue', 12);

  const [eventType, setEventType] = useState<ListingEventTypeId>('wedding');
  const [budgetFc, setBudgetFc] = useState('1500000');
  const [planCity, setPlanCity] = useState('');
  const [guestCount, setGuestCount] = useState('100');
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState('');
  const [packages, setPackages] = useState<PlanPackage[]>([]);
  const [planCategories, setPlanCategories] = useState<ServiceCategory[]>(EVENT_PLAN_SLOTS.wedding.required);
  const [savedPacks, setSavedPacks] = useState<SavedEventPack[]>([]);
  const [favKind, setFavKind] = useState<'all' | 'venue' | 'service'>('all');
  const [favQ, setFavQ] = useState('');
  const [favMode, setFavMode] = useState<'grid' | 'list'>('grid');
  const [saveTarget, setSaveTarget] = useState<PlanPackage | null>(null);
  const [saveName, setSaveName] = useState('');
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState('');

  const urlTab = parseHubTab(searchParams);
  const [tab, setTabState] = useState<HubTab>(urlTab);
  const pendingTab = useRef<HubTab | null>(null);

  useEffect(() => {
    if (pendingTab.current) {
      if (urlTab === pendingTab.current) pendingTab.current = null;
      return;
    }
    setTabState(urlTab);
  }, [urlTab]);

  const setTab = (next: HubTab) => {
    pendingTab.current = next;
    setTabState(next);
    const params = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : searchParams.toString(),
    );
    params.delete('tab');
    if (next === 'explore') params.delete('hub');
    else params.set('hub', next);
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

  useEffect(() => {
    if (tab === 'packs' || tab === 'plan') void loadSavedPacks();
  }, [tab, loadSavedPacks]);

  const items = useMemo(
    () => sortCatalogueByDistance([
      ...venues.map((venue) => withDashboardListingHref(venueToCatalogueItem(venue))),
      ...services.map((service) => withDashboardListingHref(serviceToCatalogueItem(service))),
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

  const favoriteItems = useMemo(
    () => favoriteRows.map(favoriteToCatalogueItem),
    [favoriteRows],
  );

  const visibleFavorites = useMemo(() => {
    const q = favQ.trim().toLowerCase();
    return favoriteItems.filter((item) => {
      if (favKind !== 'all' && item.kind !== favKind) return false;
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

  const chips = catalogueGeoChips(
    applied,
    [
      ...(applied.kind === 'all' ? [] : [{ id: 'kind', label: 'Type', value: catalogueKindFilterLabel(applied.kind) }]),
      ...(applied.mobility
        ? [{ id: 'mobility', label: 'Intervention', value: applied.mobility === 'on_site' ? 'Sur place' : 'Se déplace' }]
        : []),
    ],
  );

  const onToggleFavorite = (item: CatalogueItem) => {
    if (item.kind === 'event') return;
    void toggleFavorite(item.kind, item.slug);
  };

  const runPlan = async () => {
    setPlanning(true);
    setPlanError('');
    try {
      const data = await api.post('/marketplace/event-plan', {
        eventType,
        budgetFc: Number(budgetFc.replace(/\s/g, '')),
        city: planCity || undefined,
        guestCount: Number(guestCount) || undefined,
        categories: planCategories,
      });
      setPackages(data.packages || []);
      if (!(data.packages || []).length) {
        setPlanError('Aucune proposition pour ce budget. Élargissez la ville, le type ou le montant.');
      }
    } catch (err: unknown) {
      setPackages([]);
      setPlanError(err instanceof Error ? err.message : 'Impossible de préparer la proposition.');
    } finally {
      setPlanning(false);
    }
  };

  const replacePackItem = (packId: string, currentSlug: string, next: PlanItem) => {
    const budget = Number(budgetFc.replace(/\s/g, '')) || 0;
    setPackages((current) => current.map((pack) => {
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
    }));
  };

  const slotOptions = EVENT_PLAN_SLOTS[eventType];
  const togglePlanCategory = (category: ServiceCategory) => {
    setPlanCategories((current) => (
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    ));
  };

  const persistPack = async (payload: {
    name: string;
    eventType: string;
    budgetFc: number;
    city?: string;
    guestCount?: number;
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
        name: saveName.trim() || `${eventTypeLabel(eventType)} · ${saveTarget.label}`,
        eventType,
        budgetFc: Number(budgetFc.replace(/\s/g, '')) || saveTarget.totalFc,
        city: planCity || undefined,
        guestCount: Number(guestCount) || undefined,
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

  const mapMode = tab === 'explore' && isCatalogueMapView(mode);

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Marketplace"
        description="Explorez les salles et prestataires, enregistrez vos favoris, puis préparez un événement selon votre budget."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Marketplace', href: '/dashboard/catalogue' },
              { label: tab === 'favorites' ? 'Favoris' : tab === 'plan' ? 'Préparer un événement' : tab === 'packs' ? 'Mes packs' : 'Explorer' },
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

      {tab === 'explore' ? (
        <>
          <CatalogueFilterBar
            search={query}
            onSearchChange={setQuery}
            searchPlaceholder="Nom, organisation, ville…"
            view={mode}
            onViewChange={setView}
            gridCols={gridCols}
            onGridColsChange={setGridCols}
            compactToggle
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

          {loading ? (
            <CatalogueResultsSkeleton mode={mapMode ? 'map' : mode === 'list' ? 'list' : 'grid'} count={pageSize} gridCols={gridCols} />
          ) : mapMode ? (
            markers.length === 0 ? (
              <EmptyState icon={<Store className="w-5 h-5" />} title="Aucune position" description="Aucune fiche géolocalisée ne correspond à cette recherche." />
            ) : (
              <MarketplaceLocationsMap
                markers={markers}
                listingSearch
                navigateOnClick
                height={480}
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
                emptyDescription="Élargissez les mots-clés, la ville ou le type pour voir des salles, prestataires et événements."
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex flex-wrap gap-1.5">
                {([
                  ['all', 'Tous'],
                  ['venue', 'Salles'],
                  ['service', 'Prestataires'],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFavKind(id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-semibold border',
                      favKind === id ? 'bg-primary text-white border-primary' : 'border-border text-muted hover:text-foreground',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex-1 min-w-[12rem]">
                <Input
                  value={favQ}
                  onChange={(e) => setFavQ(e.target.value)}
                  placeholder="Filtrer par nom, ville, métier…"
                />
              </div>
              <CatalogueViewToggle
                compact
                hideMap
                value={favMode}
                onChange={(next) => setFavMode(next === 'list' ? 'list' : 'grid')}
              />
            </div>
            <CatalogueResults
              items={visibleFavorites}
              mode={favMode}
              gridCols={gridCols}
              emptyTitle={favoriteItems.length === 0 ? 'Aucun favori pour le moment' : 'Aucun favori pour ce filtre'}
              emptyDescription={favoriteItems.length === 0
                ? 'Dans Explorer, cliquez sur le cœur d’une salle ou d’un prestataire pour le retrouver ici.'
                : 'Changez le type (salles / prestataires) ou le mot-clé.'}
              isFavorite={(item) => item.kind !== 'event' && isFavorite(item.kind, item.slug)}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        )
      ) : null}

      {tab === 'plan' ? (
        <div className="space-y-5">
          <div className="bg-surface border border-border rounded-[var(--radius-card)] p-4 sm:p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Budget et type d’événement</h2>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Trois packs distincts dans votre enveloppe. Décochez les métiers inutiles, puis remplacez une ligne si besoin.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <label className="space-y-1.5">
                <span className="block text-xs font-semibold text-muted">Type d’événement</span>
                <select
                  value={eventType}
                  onChange={(e) => {
                    const next = e.target.value as ListingEventTypeId;
                    setEventType(next);
                    setPlanCategories(EVENT_PLAN_SLOTS[next].required);
                    setPackages([]);
                  }}
                  className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
                >
                  {LISTING_EVENT_TYPES.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>
              <Input
                label="Budget (FC)"
                type="number"
                min={50000}
                step={10000}
                value={budgetFc}
                onChange={(e) => setBudgetFc(e.target.value)}
                required
              />
              <label className="space-y-1.5">
                <span className="block text-xs font-semibold text-muted">Ville</span>
                <select
                  value={planCity}
                  onChange={(e) => setPlanCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
                >
                  <option value="">Toutes</option>
                  <option value="Kinshasa">Kinshasa</option>
                  <option value="Lubumbashi">Lubumbashi</option>
                </select>
              </label>
              <Input
                label="Invités"
                type="number"
                min={1}
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted">Prestations à inclure · {eventTypeLabel(eventType)}</p>
              <div className="flex flex-wrap gap-1.5">
                {[...slotOptions.required, ...slotOptions.optional].map((category) => {
                  const checked = planCategories.includes(category);
                  const optional = slotOptions.optional.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => togglePlanCategory(category)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition',
                        checked
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface text-muted border-border hover:text-foreground',
                      )}
                    >
                      {SERVICE_CATEGORY_LABELS[category]}
                      {optional && !checked ? ' · option' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
            {planError ? <Alert variant="error">{planError}</Alert> : null}
            <Button onClick={() => void runPlan()} disabled={planning} leftIcon={planning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}>
              {planning ? 'Recherche…' : 'Lancer la recherche'}
            </Button>
          </div>

          {packages.length > 0 ? (
            <EventPlanPacks
              packages={packages}
              budgetFc={Number(budgetFc.replace(/\s/g, '')) || 0}
              isFavorite={isFavorite}
              onToggleFavorite={(kind, slug) => void toggleFavorite(kind, slug)}
              onReplace={replacePackItem}
              onSave={(pack) => {
                setSaveName(`${eventTypeLabel(eventType)} · ${pack.label}`);
                setSaveError('');
                setSaveTarget(pack);
              }}
            />
          ) : !planning && !planError ? (
            <EmptyState
              icon={<Wallet className="w-5 h-5" />}
              title="Préparez votre événement"
              description="Indiquez le type, le budget et les métiers voulus, puis lancez la recherche pour obtenir trois propositions distinctes."
            />
          ) : null}
        </div>
      ) : null}

      {tab === 'packs' ? (
        <EventSavedPacks
          packs={savedPacks}
          favorites={favoriteRows}
          eventType={eventType}
          budgetFc={Number(budgetFc.replace(/\s/g, '')) || 0}
          city={planCity}
          guestCount={Number(guestCount) || 0}
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
    </div>
  );
}

export default function ClientMarketplacePage() {
  return (
    <Suspense fallback={<div className="py-16 text-sm text-muted">Chargement du marketplace…</div>}>
      <ClientMarketplaceInner />
    </Suspense>
  );
}
