'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import PublicCtaBand from '@/components/PublicCtaBand';
import { Input, Pagination, paginateItems } from '@/components/ui';
import {
  CATALOGUE_COMMUNE_SUGGESTIONS,
  catalogueItemToMapMarker,
  isCatalogueMapView,
  venueToCatalogueItem,
  type PublicVenue,
} from '@/lib/marketplace';
import { roomTypeLabels } from '@/lib/roomLayoutUtils';
import MarketplacePublicNav from '@/components/MarketplacePublicNav';
import MarketplaceLocationsMap from '@/components/MarketplaceLocationsMap';
import { useCatalogueView } from '@/components/CatalogueViewToggle';
import CatalogueResults from '@/components/CatalogueResults';
import CatalogueFilterBar, {
  CatalogueChoicePills,
  CatalogueFilterField,
  type CatalogueFilterChip,
} from '@/components/CatalogueFilterBar';
import { Loader2, MapPin } from 'lucide-react';

const ROOM_FILTERS: Array<{ id: string; label: string }> = [
  { id: 'BANQUET', label: roomTypeLabels.BANQUET },
  { id: 'CONFERENCE', label: roomTypeLabels.CONFERENCE },
  { id: 'AMPHITHEATER', label: roomTypeLabels.AMPHITHEATER },
  { id: 'TENT', label: roomTypeLabels.TENT },
  { id: 'CUSTOM', label: roomTypeLabels.CUSTOM },
];

const emptyFilters = {
  city: '',
  commune: '',
  neighborhood: '',
  roomType: '',
};

type VenueFilters = typeof emptyFilters;

export default function MarketplaceVenuesPage() {
  const { mode, setView } = useCatalogueView();
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [applied, setApplied] = useState<VenueFilters>(emptyFilters);
  const [draft, setDraft] = useState<VenueFilters>(emptyFilters);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  const load = useCallback(async (filters: VenueFilters, search: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (filters.city.trim()) params.set('city', filters.city.trim());
      if (filters.commune.trim()) params.set('commune', filters.commune.trim());
      if (filters.neighborhood.trim()) params.set('neighborhood', filters.neighborhood.trim());
      if (filters.roomType) params.set('roomType', filters.roomType);
      const data = await api.get(`/public/venues${params.toString() ? `?${params}` : ''}`);
      setVenues(data.venues || []);
      setPage(1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les salles.');
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const items = useMemo(() => venues.map(venueToCatalogueItem), [venues]);
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
    if (applied.roomType) {
      next.push({
        id: 'roomType',
        label: 'Type',
        value: ROOM_FILTERS.find((opt) => opt.id === applied.roomType)?.label || applied.roomType,
      });
    }
    return next;
  }, [applied]);

  const applyFilters = (next: VenueFilters) => {
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
          title="Trouvez une salle pour votre événement"
          description="Filtrez par ville, commune ou quartier. Les filtres choisis restent visibles sous la recherche."
        >
          <MarketplacePublicNav active="venues" />
        </PublicPageHero>
      )}

      <main className="page-container py-6 sm:py-10 flex-1 space-y-4 sm:space-y-6">
        {mode === 'focus' && <MarketplacePublicNav active="venues" />}
        <CatalogueFilterBar
          search={q}
          onSearchChange={setQ}
          searchPlaceholder="Nom, organisation…"
          view={mode}
          onViewChange={setView}
          chips={chips}
          resultLabel={!loading ? `${items.length} salle${items.length > 1 ? 's' : ''}` : undefined}
          onRemoveChip={(id) => applyFilters({ ...applied, [id]: '' })}
          onClearChips={() => applyFilters(emptyFilters)}
          onOpen={() => setDraft(applied)}
          onApply={() => applyFilters(draft)}
          modalTitle="Filtrer les salles"
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
              <CatalogueFilterField label="Type de salle">
                <CatalogueChoicePills
                  options={ROOM_FILTERS}
                  value={draft.roomType}
                  onChange={(id) => setDraft((d) => ({ ...d, roomType: id }))}
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
              emptyTitle="Aucune salle pour ces filtres"
              emptyDescription="Élargissez la recherche, ou publiez une salle depuis Salles dans le tableau de bord."
            />
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={items.length}
              onPageChange={setPage}
              itemLabel="salles"
            />
          </>
        )}
      </main>

      {mode !== 'focus' && (
        <PublicCtaBand
          title="Vous avez une salle à proposer ?"
          description="Publiez votre fiche avec photos, vidéos, tarifs et calendrier."
          primaryHref="/register"
          primaryLabel="Publier une salle"
          secondaryHref="/contact"
          secondaryLabel="Nous contacter"
        />
      )}
    </PublicPageShell>
  );
}
