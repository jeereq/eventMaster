'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import PublicCtaBand from '@/components/PublicCtaBand';
import { Button, Input } from '@/components/ui';
import {
  venueToCatalogueItem,
  type PublicVenue,
} from '@/lib/marketplace';
import { roomTypeLabels } from '@/lib/roomLayoutUtils';
import MarketplacePublicNav from '@/components/MarketplacePublicNav';
import MarketplaceLocationsMap from '@/components/MarketplaceLocationsMap';
import CatalogueViewToggle, { useCatalogueView } from '@/components/CatalogueViewToggle';
import CatalogueResults from '@/components/CatalogueResults';
import { Loader2, MapPin, Search } from 'lucide-react';

const ROOM_FILTERS: Array<{ id: string; label: string }> = [
  { id: '', label: 'Tous les types' },
  { id: 'BANQUET', label: roomTypeLabels.BANQUET },
  { id: 'CONFERENCE', label: roomTypeLabels.CONFERENCE },
  { id: 'AMPHITHEATER', label: roomTypeLabels.AMPHITHEATER },
  { id: 'TENT', label: roomTypeLabels.TENT },
  { id: 'CUSTOM', label: roomTypeLabels.CUSTOM },
];

const fieldClass = 'w-full px-3 py-2.5 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm';

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
        .map((item) => ({
          id: item.id,
          lat: item.latitude as number,
          lng: item.longitude as number,
          title: item.title,
          href: item.href,
          subtitle: item.location || undefined,
          kind: item.kind,
        })),
    [items],
  );

  return (
    <PublicPageShell faqHref="/faq">
      <PublicPageHero
        chip="Catalogue"
        title="Trouvez une salle pour votre événement"
        description="Filtrez par ville, commune ou quartier. En vue carte, la recherche ne porte que sur les salles enregistrées chez EventMaster."
      >
        <MarketplacePublicNav active="venues" />
      </PublicPageHero>

      <main className="page-container py-10 flex-1 space-y-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, organisation…" leftIcon={<Search className="w-4 h-4" />} />
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville" leftIcon={<MapPin className="w-4 h-4" />} />
          <Input value={commune} onChange={(e) => setCommune(e.target.value)} placeholder="Commune (ex. Gombe)" />
          <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Quartier" />
          <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className={fieldClass}>
            {ROOM_FILTERS.map((opt) => (
              <option key={opt.id || 'all'} value={opt.id}>{opt.label}</option>
            ))}
          </select>
          <div className="hidden lg:block" />
          <Button type="submit">Filtrer</Button>
          <div className="flex justify-end">
            <CatalogueViewToggle value={mode} onChange={setView} />
          </div>
        </form>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : mode === 'map' ? (
          <MarketplaceLocationsMap markers={markers} listingSearch height={480} />
        ) : (
          <CatalogueResults
            items={items}
            mode={mode}
            emptyTitle="Aucune salle pour ces filtres"
            emptyDescription="Élargissez la recherche, ou publiez une salle depuis Mon compte → Salles."
          />
        )}
      </main>

      <PublicCtaBand
        title="Vous avez une salle à proposer ?"
        description="Publiez votre fiche avec photos, vidéos, tarifs et calendrier."
        primaryHref="/register"
        primaryLabel="Publier une salle"
        secondaryHref="/contact"
        secondaryLabel="Nous contacter"
      />
    </PublicPageShell>
  );
}
