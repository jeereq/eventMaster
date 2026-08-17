'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import PublicCtaBand from '@/components/PublicCtaBand';
import { Input, Pagination, paginateItems } from '@/components/ui';
import {
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
import CatalogueFilterBar, { CatalogueFilterField, catalogueSelectClass } from '@/components/CatalogueFilterBar';
import { Loader2, MapPin } from 'lucide-react';

const ROOM_FILTERS: Array<{ id: string; label: string }> = [
  { id: '', label: 'Tous les types' },
  { id: 'BANQUET', label: roomTypeLabels.BANQUET },
  { id: 'CONFERENCE', label: roomTypeLabels.CONFERENCE },
  { id: 'AMPHITHEATER', label: roomTypeLabels.AMPHITHEATER },
  { id: 'TENT', label: roomTypeLabels.TENT },
  { id: 'CUSTOM', label: roomTypeLabels.CUSTOM },
];

export default function MarketplaceVenuesPage() {
  const { mode, setView } = useCatalogueView();
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [commune, setCommune] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [roomType, setRoomType] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const search = new URLSearchParams();
      if (q.trim()) search.set('q', q.trim());
      if (city.trim()) search.set('city', city.trim());
      if (commune.trim()) search.set('commune', commune.trim());
      if (neighborhood.trim()) search.set('neighborhood', neighborhood.trim());
      if (roomType) search.set('roomType', roomType);
      const data = await api.get(`/public/venues${search.toString() ? `?${search}` : ''}`);
      setVenues(data.venues || []);
      setPage(1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les salles.');
      setVenues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chargement initial
  }, []);

  const items = useMemo(() => venues.map(venueToCatalogueItem), [venues]);
  const markers = useMemo(
    () =>
      items
        .filter((item) => item.latitude != null && item.longitude != null)
        .map(catalogueItemToMapMarker),
    [items],
  );

  const filterCount = [city, commune, neighborhood, roomType].filter((v) => v.trim()).length;
  const mapMode = isCatalogueMapView(mode);

  return (
    <PublicPageShell faqHref="/faq">
      {mode !== 'focus' && (
        <PublicPageHero
          chip="Catalogue"
          title="Trouvez une salle pour votre événement"
          description="Filtrez par ville, commune ou quartier. En vue carte, la recherche ne porte que sur les salles enregistrées chez EventMaster."
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
          onSubmit={load}
          filterCount={filterCount}
          showSubmit
          filters={
            <>
              <CatalogueFilterField label="Ville">
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex. Kinshasa" leftIcon={<MapPin className="w-4 h-4" />} />
              </CatalogueFilterField>
              <CatalogueFilterField label="Commune">
                <Input value={commune} onChange={(e) => setCommune(e.target.value)} placeholder="Ex. Gombe" />
              </CatalogueFilterField>
              <CatalogueFilterField label="Quartier">
                <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Quartier" />
              </CatalogueFilterField>
              <CatalogueFilterField label="Type de salle">
                <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className={catalogueSelectClass}>
                  {ROOM_FILTERS.map((opt) => (
                    <option key={opt.id || 'all'} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
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
