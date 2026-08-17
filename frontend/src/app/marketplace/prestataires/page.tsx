'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import PublicCtaBand from '@/components/PublicCtaBand';
import MarketplacePublicNav from '@/components/MarketplacePublicNav';
import MarketplaceLocationsMap from '@/components/MarketplaceLocationsMap';
import { useCatalogueView } from '@/components/CatalogueViewToggle';
import CatalogueResults from '@/components/CatalogueResults';
import CatalogueFilterBar, {
  CatalogueChoicePills,
  CatalogueFilterField,
  type CatalogueFilterChip,
} from '@/components/CatalogueFilterBar';
import { Input, Pagination, paginateItems } from '@/components/ui';
import {
  CATALOGUE_COMMUNE_SUGGESTIONS,
  PRICE_UNIT_OPTIONS,
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  catalogueItemToMapMarker,
  isCatalogueMapView,
  serviceToCatalogueItem,
  type PublicService,
} from '@/lib/marketplace';
import { Loader2, MapPin } from 'lucide-react';

const emptyFilters = {
  city: '',
  commune: '',
  neighborhood: '',
  category: '',
  priceUnit: '',
};

type ServiceFilters = typeof emptyFilters;

export default function MarketplaceServicesPage() {
  const { mode, setView } = useCatalogueView();
  const [services, setServices] = useState<PublicService[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [applied, setApplied] = useState<ServiceFilters>(emptyFilters);
  const [draft, setDraft] = useState<ServiceFilters>(emptyFilters);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  const load = useCallback(async (filters: ServiceFilters, search: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (filters.city.trim()) params.set('city', filters.city.trim());
      if (filters.commune.trim()) params.set('commune', filters.commune.trim());
      if (filters.neighborhood.trim()) params.set('neighborhood', filters.neighborhood.trim());
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
    const next: CatalogueFilterChip[] = [];
    if (applied.city.trim()) next.push({ id: 'city', label: 'Ville', value: applied.city.trim() });
    if (applied.commune.trim()) next.push({ id: 'commune', label: 'Commune', value: applied.commune.trim() });
    if (applied.neighborhood.trim()) next.push({ id: 'neighborhood', label: 'Quartier', value: applied.neighborhood.trim() });
    if (applied.category) {
      next.push({
        id: 'category',
        label: 'Catégorie',
        value: SERVICE_CATEGORY_LABELS[applied.category as keyof typeof SERVICE_CATEGORY_LABELS] || applied.category,
      });
    }
    if (applied.priceUnit) {
      next.push({
        id: 'priceUnit',
        label: 'Tarif',
        value: PRICE_UNIT_OPTIONS.find((opt) => opt.id === applied.priceUnit)?.label || applied.priceUnit,
      });
    }
    return next;
  }, [applied]);

  const applyFilters = (next: ServiceFilters) => {
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

  return (
    <PublicPageShell faqHref="/faq">
      {mode !== 'focus' && (
        <PublicPageHero
          compact
          chip="Catalogue"
          title="Trouvez un prestataire"
          description="Traiteur, photo, DJ… Choisissez vos filtres dans la fenêtre, puis voyez-les sous la recherche."
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
          onRemoveChip={(id) => applyFilters({ ...applied, [id]: '' })}
          onClearChips={() => applyFilters(emptyFilters)}
          onOpen={() => setDraft(applied)}
          onApply={() => applyFilters(draft)}
          modalTitle="Filtrer les prestataires"
          filters={
            <>
              <CatalogueFilterField label="Ville">
                <Input
                  value={draft.city}
                  onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                  placeholder="Ex. Kinshasa"
                  leftIcon={<MapPin className="w-4 h-4" />}
                />
              </CatalogueFilterField>
              <CatalogueFilterField label="Commune" hint="Choisissez une suggestion ou saisissez la vôtre.">
                <CatalogueChoicePills
                  options={CATALOGUE_COMMUNE_SUGGESTIONS.map((name) => ({ id: name, label: name }))}
                  value={draft.commune}
                  onChange={(id) => setDraft((d) => ({ ...d, commune: id }))}
                />
                <Input
                  value={draft.commune}
                  onChange={(e) => setDraft((d) => ({ ...d, commune: e.target.value }))}
                  placeholder="Autre commune…"
                  className="mt-2"
                />
              </CatalogueFilterField>
              <CatalogueFilterField label="Quartier">
                <Input
                  value={draft.neighborhood}
                  onChange={(e) => setDraft((d) => ({ ...d, neighborhood: e.target.value }))}
                  placeholder="Quartier"
                />
              </CatalogueFilterField>
              <CatalogueFilterField label="Catégorie">
                <CatalogueChoicePills
                  options={SERVICE_CATEGORIES.map((id) => ({ id, label: SERVICE_CATEGORY_LABELS[id] }))}
                  value={draft.category}
                  onChange={(id) => setDraft((d) => ({ ...d, category: id }))}
                />
              </CatalogueFilterField>
              <CatalogueFilterField label="Tarif">
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
          <div className="flex justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : mapMode ? (
          <MarketplaceLocationsMap
            markers={markers}
            listingSearch
            height={480}
            variant={mode === 'focus' ? 'focus' : 'default'}
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
