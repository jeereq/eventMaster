'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useCatalogueView } from '@/components/CatalogueViewToggle';
import CatalogueSearchLayout from '@/components/CatalogueSearchLayout';
import CatalogueFilterBar, {
  CatalogueChoicePills,
  CatalogueFilterField,
  CatalogueGeoFields,
  type CatalogueFilterChip,
} from '@/components/CatalogueFilterBar';
import {
  EMPTY_CATALOGUE_GEO,
  PRICE_UNIT_OPTIONS,
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  SERVICE_MOBILITY_OPTIONS,
  appendCatalogueGeoParams,
  catalogueGeoChips,
  catalogueItemToMapMarker,
  clearCatalogueGeoChip,
  resolveCatalogueGeo,
  sortCatalogueByDistance,
  serviceToCatalogueItem,
  type CatalogueGeoState,
  type PublicService,
  type ServiceMobility,
} from '@/lib/marketplace';

type ServiceFilters = CatalogueGeoState & { category: string; priceUnit: string; mobility: ServiceMobility };

const emptyFilters: ServiceFilters = {
  ...EMPTY_CATALOGUE_GEO,
  category: '',
  priceUnit: '',
  mobility: '',
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
  const PAGE_SIZE = 12;

  const load = useCallback(async (filters: ServiceFilters, search: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      appendCatalogueGeoParams(params, filters);
      if (filters.category) params.set('category', filters.category);
      if (filters.priceUnit) params.set('priceUnit', filters.priceUnit);
      if (filters.mobility) params.set('mobility', filters.mobility);
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

  const items = useMemo(() => sortCatalogueByDistance(services.map(serviceToCatalogueItem)), [services]);
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
    if (applied.mobility) {
      extra.push({
        id: 'mobility',
        label: 'Intervention',
        value: applied.mobility === 'on_site' ? 'Sur place' : 'Se déplace',
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

  const searchCenter = applied.proximity && applied.lat != null && applied.lng != null
    ? { lat: applied.lat, lng: applied.lng }
    : null;

  return (
    <CatalogueSearchLayout
      activeNav="services"
      heroTitle="Trouvez un prestataire pour votre événement"
      heroDescription="Traiteur, photo, DJ, déco… Filtrez par zone, catégorie, prix ou autour de vous."
      mode={mode}
      onViewChange={setView}
      items={items}
      markers={markers}
      loading={loading}
      error={error}
      emptyTitle="Aucun prestataire pour ces filtres"
      emptyDescription="Élargissez la commune ou la catégorie, ou publiez une prestation depuis Marketplace."
      page={page}
      pageSize={PAGE_SIZE}
      onPageChange={setPage}
      itemLabel="prestataires"
      searchCenter={searchCenter}
      radiusKm={searchCenter ? applied.radiusKm : 0}
      city={applied.city}
      searchOriginLabel={applied.proximity === 'around' ? 'Vous êtes ici' : 'Lieu de recherche'}
      cta={{
        title: 'Vous proposez un service ?',
        description: 'Publiez votre prestation avec zone d’intervention, médias et calendrier.',
        primaryHref: '/register',
        primaryLabel: 'Proposer mes services',
        secondaryHref: '/contact',
        secondaryLabel: 'Nous contacter',
      }}
      renderFilters={(variant) => (
        <CatalogueFilterBar
          variant={variant}
          hideViewToggle={variant === 'float' && mode !== 'focus'}
          compactToggle={variant === 'float'}
          search={q}
          onSearchChange={setQ}
          searchPlaceholder="Nom, prestataire…"
          view={mode}
          onViewChange={setView}
          chips={chips}
          resultLabel={!loading ? `${items.length} prestataire${items.length > 1 ? 's' : ''}` : undefined}
          onRemoveChip={(id) => {
            if (id === 'category' || id === 'priceUnit' || id === 'mobility') applyFilters({ ...applied, [id]: '' });
            else applyFilters({
              ...clearCatalogueGeoChip(applied, id),
              category: applied.category,
              priceUnit: applied.priceUnit,
              mobility: applied.mobility,
            });
          }}
          onClearChips={() => applyFilters(emptyFilters)}
          onOpen={() => {
            setDraft(applied);
            setFilterError('');
          }}
          onApply={async () => {
            try {
              const geo = await resolveCatalogueGeo(draft);
              applyFilters({ ...geo, category: draft.category, priceUnit: draft.priceUnit, mobility: draft.mobility });
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
                onChange={(next) => setDraft({ ...next, category: draft.category, priceUnit: draft.priceUnit, mobility: draft.mobility })}
                error={filterError}
              />
              <CatalogueFilterField label="Intervention">
                <CatalogueChoicePills
                  options={SERVICE_MOBILITY_OPTIONS.filter((opt) => opt.id)}
                  value={draft.mobility}
                  onChange={(id) => setDraft((d) => ({ ...d, mobility: (id as ServiceMobility) || '' }))}
                />
              </CatalogueFilterField>
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
      )}
    />
  );
}
