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
  type CatalogueFilterChip,
} from '@/components/CatalogueFilterBar';
import { Pagination, paginateItems } from '@/components/ui';
import {
  EMPTY_CATALOGUE_GEO,
  PRICE_UNIT_OPTIONS,
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  appendCatalogueGeoParams,
  catalogueGeoChips,
  catalogueItemToMapMarker,
  clearCatalogueGeoChip,
  isCatalogueMapView,
  resolveCatalogueGeo,
  serviceToCatalogueItem,
  type CatalogueGeoState,
  type PublicService,
} from '@/lib/marketplace';

type ServiceFilters = CatalogueGeoState & { category: string; priceUnit: string };

const emptyFilters: ServiceFilters = {
  ...EMPTY_CATALOGUE_GEO,
  category: '',
  priceUnit: '',
};

export default function MarketplaceServicesPage() {
  const { mode, setView } = useCatalogueView();
  const [services, setServices] = useState<PublicService[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [applied, setApplied] = useState<ServiceFilters>(emptyFilters);
  const [draft, setDraft] = useState<ServiceFilters>(emptyFilters);
  const [error, setError] = useState('');
  const [filterError, setFilterError] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  const load = useCallback(async (filters: ServiceFilters, search: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      appendCatalogueGeoParams(params, filters);
      if (filters.category) params.set('category', filters.category);
      if (filters.priceUnit) params.set('priceUnit', filters.priceUnit);
      const data = await api.get(`/public/services${params.toString() ? `?${params}` : ''}`);
      setServices(data.services || []);
      setPage(1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les prestataires.');
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const items = useMemo(() => services.map(serviceToCatalogueItem), [services]);
  const markers = useMemo(
    () =>
      items
        .filter((item) => item.latitude != null && item.longitude != null)
        .map(catalogueItemToMapMarker),
    [items],
  );

  const chips: CatalogueFilterChip[] = useMemo(() => {
    const extra: CatalogueFilterChip[] = [];
    if (applied.category) {
      extra.push({
        id: 'category',
        label: 'Catégorie',
        value: SERVICE_CATEGORY_LABELS[applied.category as keyof typeof SERVICE_CATEGORY_LABELS] || applied.category,
      });
    }
    if (applied.priceUnit) {
      extra.push({
        id: 'priceUnit',
        label: 'Tarif',
        value: PRICE_UNIT_OPTIONS.find((opt) => opt.id === applied.priceUnit)?.label || applied.priceUnit,
      });
    }
    return catalogueGeoChips(applied, extra);
  }, [applied]);

  const applyFilters = (next: ServiceFilters) => {
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
          title="Trouvez un prestataire"
          description="Traiteur, photo, DJ… Filtrez par zone, catégorie, prix ou autour de vous."
        >
          <MarketplacePublicNav active="services" />
        </PublicPageHero>
      )}

      <main className="page-container py-6 sm:py-10 flex-1 space-y-4 sm:space-y-6">
        {mode === 'focus' && <MarketplacePublicNav active="services" />}
        <CatalogueFilterBar
          search={q}
          onSearchChange={setQ}
          searchPlaceholder="Nom, prestataire…"
          view={mode}
          onViewChange={setView}
          chips={chips}
          resultLabel={!loading ? `${items.length} prestataire${items.length > 1 ? 's' : ''}` : undefined}
          onRemoveChip={(id) => {
            if (id === 'category' || id === 'priceUnit') applyFilters({ ...applied, [id]: '' });
            else applyFilters({ ...clearCatalogueGeoChip(applied, id), category: applied.category, priceUnit: applied.priceUnit });
          }}
          onClearChips={() => applyFilters(emptyFilters)}
          onOpen={() => {
            setDraft(applied);
            setFilterError('');
          }}
          onApply={async () => {
            try {
              const geo = await resolveCatalogueGeo(draft);
              applyFilters({ ...geo, category: draft.category, priceUnit: draft.priceUnit });
            } catch (err: unknown) {
              setFilterError(err instanceof Error ? err.message : 'Filtre de proximité impossible.');
              throw err;
            }
          }}
          modalTitle="Filtrer les prestataires"
          filters={
            <>
              <CatalogueGeoFields
                value={draft}
                onChange={(next) => setDraft({ ...next, category: draft.category, priceUnit: draft.priceUnit })}
                error={filterError}
              />
              <CatalogueFilterField label="Catégorie">
                <CatalogueChoicePills
                  options={SERVICE_CATEGORIES.map((id) => ({ id, label: SERVICE_CATEGORY_LABELS[id] }))}
                  value={draft.category}
                  onChange={(id) => setDraft((d) => ({ ...d, category: id }))}
                />
              </CatalogueFilterField>
              <CatalogueFilterField label="Unité tarifaire">
                <CatalogueChoicePills
                  options={PRICE_UNIT_OPTIONS.map((opt) => ({ id: opt.id, label: opt.label }))}
                  value={draft.priceUnit}
                  onChange={(id) => setDraft((d) => ({ ...d, priceUnit: id }))}
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
              emptyTitle="Aucun prestataire pour ces filtres"
              emptyDescription="Élargissez la commune ou la catégorie, ou publiez une prestation depuis Marketplace."
            />
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={items.length}
              onPageChange={setPage}
              itemLabel="prestataires"
            />
          </>
        )}
      </main>

      {mode !== 'focus' && (
        <PublicCtaBand
          title="Vous proposez un service ?"
          description="Publiez votre prestation avec zone d’intervention, médias et calendrier."
          primaryHref="/register"
          primaryLabel="Proposer mes services"
          secondaryHref="/contact"
          secondaryLabel="Nous contacter"
        />
      )}
    </PublicPageShell>
  );
}
