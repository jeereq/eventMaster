'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Heart, Loader2, Sparkles, Store, Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import {
  Alert,
  Breadcrumbs,
  Button,
  EmptyState,
  Input,
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
  catalogueItemToMapMarker,
  clearCatalogueGeoChip,
  isCatalogueMapView,
  resolveCatalogueGeo,
  serviceToCatalogueItem,
  sortCatalogueByDistance,
  venueToCatalogueItem,
  withDashboardListingHref,
  type CatalogueGeoState,
  type CatalogueItem,
  type PublicService,
  type PublicVenue,
  type ServiceCategory,
  type ServiceMobility,
} from '@/lib/marketplace';
import { useCatalogueQueryState, useRememberListReturn } from '@/lib/catalogueQuery';
import { favoriteToCatalogueItem, useListingFavorites } from '@/lib/listingFavorites';
import { LISTING_EVENT_TYPES, eventTypeLabel, type ListingEventTypeId } from '@/lib/listingDetails';
import { EVENT_PLAN_SLOTS, type PlanItem, type PlanPackage } from '@/lib/eventPlan';
import EventPlanPacks from '@/components/EventPlanPacks';

type HubTab = 'explore' | 'favorites' | 'plan';
type HubFilters = CatalogueGeoState & { kind: 'all' | 'venue' | 'service'; mobility: ServiceMobility; tab: HubTab };

const emptyFilters: HubFilters = {
  ...EMPTY_CATALOGUE_GEO,
  kind: 'all',
  mobility: '',
  tab: 'explore',
};

const QUERY_OPTS = {
  extraKeys: ['kind', 'mobility', 'tab'],
  emptyExtra: { kind: 'all', mobility: '', tab: 'explore' },
  merge: (geo: CatalogueGeoState, extra: Record<string, string>): HubFilters => ({
    ...geo,
    kind: extra.kind === 'venue' || extra.kind === 'service' ? extra.kind : 'all',
    mobility: (extra.mobility as ServiceMobility) || '',
    tab: extra.tab === 'favorites' || extra.tab === 'plan' ? extra.tab : 'explore',
  }),
  split: (filters: HubFilters) => ({
    kind: filters.kind,
    mobility: filters.mobility,
    tab: filters.tab,
  }),
};

function ClientMarketplaceInner() {
  useRememberListReturn();
  const { mode, setView, gridCols, setGridCols } = useCatalogueView();
  const { q: query, setQ: setQuery, searchQ, applied, draft, setDraft, page, applyFilters, setPage } = useCatalogueQueryState(QUERY_OPTS);
  const { isFavorite, toggleFavorite, items: favoriteRows, loading: favoritesLoading, reload: reloadFavorites } = useListingFavorites();
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
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

  const tab = applied.tab;

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
      const [venuesData, servicesData] = await Promise.all([
        api.get(`/public/venues${venueQs}`).catch(() => ({ venues: [] })),
        api.get(`/public/services${serviceQs}`).catch(() => ({ services: [] })),
      ]);
      setVenues(venuesData.venues || []);
      setServices(servicesData.services || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== 'explore') return;
    void load(applied, searchQ);
  }, [applied, searchQ, load, tab]);

  useEffect(() => {
    if (tab === 'favorites') void reloadFavorites();
  }, [tab, reloadFavorites]);

  const items = useMemo(
    () => sortCatalogueByDistance([
      ...venues.map((venue) => withDashboardListingHref(venueToCatalogueItem(venue))),
      ...services.map((service) => withDashboardListingHref(serviceToCatalogueItem(service))),
    ]),
    [venues, services],
  );

  const visible = useMemo(() => {
    if (applied.kind === 'all') return items;
    return items.filter((item) => item.kind === applied.kind);
  }, [items, applied.kind]);

  const favoriteItems = useMemo(
    () => favoriteRows.map(favoriteToCatalogueItem),
    [favoriteRows],
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

  const chips = catalogueGeoChips(
    applied,
    [
      ...(applied.kind === 'all' ? [] : [{ id: 'kind', label: 'Type', value: applied.kind === 'venue' ? 'Salles' : 'Prestataires' }]),
      ...(applied.mobility
        ? [{ id: 'mobility', label: 'Intervention', value: applied.mobility === 'on_site' ? 'Sur place' : 'Se déplace' }]
        : []),
    ],
  );

  const setTab = (next: HubTab) => applyFilters({ ...applied, tab: next });

  const onToggleFavorite = (item: CatalogueItem) => {
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
              { label: tab === 'favorites' ? 'Favoris' : tab === 'plan' ? 'Préparer un événement' : 'Explorer' },
            ]}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'explore' as const, label: 'Explorer', icon: Store },
          { id: 'favorites' as const, label: 'Favoris', icon: Heart },
          { id: 'plan' as const, label: 'Préparer un événement', icon: Wallet },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition',
              tab === item.id
                ? 'bg-surface text-foreground border-border shadow-[var(--shadow-soft)]'
                : 'text-muted border-transparent hover:text-foreground',
            )}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
            {item.id === 'favorites' && favoriteRows.length > 0 ? ` (${favoriteRows.length})` : ''}
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
              else applyFilters({ ...clearCatalogueGeoChip(applied, id), kind: applied.kind, mobility: applied.mobility, tab: applied.tab });
            }}
            onClearChips={() => applyFilters({ ...emptyFilters, tab: 'explore' })}
            onOpen={() => {
              setDraft(applied);
              setFilterError('');
            }}
            onApply={async () => {
              try {
                const geo = await resolveCatalogueGeo(draft);
                applyFilters({ ...geo, kind: draft.kind, mobility: draft.mobility, tab: 'explore' });
              } catch (err: unknown) {
                setFilterError(err instanceof Error ? err.message : 'Filtre de proximité impossible.');
                throw err;
              }
            }}
            modalTitle="Filtrer le marketplace"
            filters={
              <>
                <CatalogueFilterField label="Salles ou prestataires">
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
                  onChange={(next) => setDraft({ ...next, kind: draft.kind, mobility: draft.mobility, tab: draft.tab })}
                  error={filterError}
                  showCapacity={draft.kind !== 'service'}
                />
                <CatalogueFilterField label="Prestataires — intervention">
                  <CatalogueChoicePills
                    options={SERVICE_MOBILITY_OPTIONS.filter((opt) => opt.id)}
                    value={draft.mobility}
                    onChange={(id) => setDraft((d) => ({ ...d, mobility: (id as ServiceMobility) || '' }))}
                  />
                </CatalogueFilterField>
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
                emptyDescription="Élargissez les mots-clés, la ville ou le type pour voir des salles et prestataires."
                isFavorite={(item) => isFavorite(item.kind, item.slug)}
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
          <CatalogueResultsSkeleton mode="grid" count={8} gridCols={gridCols} />
        ) : (
          <CatalogueResults
            items={favoriteItems}
            mode={mode === 'list' ? 'list' : 'grid'}
            gridCols={gridCols}
            emptyTitle="Aucun favori pour le moment"
            emptyDescription="Dans Explorer, cliquez sur le cœur d’une salle ou d’un prestataire pour le retrouver ici."
            isFavorite={(item) => isFavorite(item.kind, item.slug)}
            onToggleFavorite={onToggleFavorite}
          />
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
