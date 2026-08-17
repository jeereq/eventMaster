'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import CelebrateMood from '@/components/CelebrateMood';
import { Button, Input } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import {
  RADIUS_KM_OPTIONS,
  formatLocationLine,
  formatQuotaLabel,
  type PublicVenue,
} from '@/lib/marketplace';
import { roomTypeLabels, type RoomType } from '@/lib/roomLayoutUtils';
import MarketplacePublicNav from '@/components/MarketplacePublicNav';
import MarketplaceLocationsMap from '@/components/MarketplaceLocationsMap';
import { geocodeLocation, type GeoPlace } from '@/lib/leafletLoader';
import { ArrowRight, Building2, Loader2, MapPin, Search, Users } from 'lucide-react';

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
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [commune, setCommune] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [around, setAround] = useState('');
  const [radiusKm, setRadiusKm] = useState('');
  const [roomType, setRoomType] = useState('');
  const [error, setError] = useState('');
  const [mapOrigin, setMapOrigin] = useState<GeoPlace | null>(null);

  const load = async (origin: GeoPlace | null = mapOrigin) => {
    setLoading(true);
    setError('');
    try {
      const search = new URLSearchParams();
      if (q.trim()) search.set('q', q.trim());
      if (city.trim()) search.set('city', city.trim());
      if (commune.trim()) search.set('commune', commune.trim());
      if (neighborhood.trim()) search.set('neighborhood', neighborhood.trim());
      if (roomType) search.set('roomType', roomType);
      const radius = radiusKm || (origin ? '15' : '');
      if (origin) {
        search.set('lat', String(origin.lat));
        search.set('lng', String(origin.lng));
        search.set('radiusKm', radius);
      } else if (around.trim() && radius) {
        const geo = await geocodeLocation(`${around.trim()}, RD Congo`);
        if (geo) {
          search.set('lat', String(geo.lat));
          search.set('lng', String(geo.lng));
          search.set('radiusKm', radius);
        }
      }
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

  const markers = useMemo(
    () =>
      venues
        .filter((v) => v.latitude != null && v.longitude != null)
        .map((v) => ({
          id: v.slug,
          lat: v.latitude as number,
          lng: v.longitude as number,
          title: v.headline,
          href: `/marketplace/salles/${v.slug}`,
          subtitle: formatLocationLine(v) || undefined,
        })),
    [venues],
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <CelebrateMood />
      <SiteHeader variant="contact" />

      <section className="border-b border-border">
        <div className="page-container py-12 sm:py-16 space-y-4 max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--festive-accent)]">
            Marketplace
          </p>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight">
            Trouvez une salle pour votre événement
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            Filtrez par ville, commune ou quartier, voyez les salles sur la carte, puis réservez une date.
          </p>
          <MarketplacePublicNav active="venues" />
        </div>
      </section>

      <main className="page-container py-8 flex-1 space-y-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setMapOrigin(null);
            load(null);
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, organisation…" leftIcon={<Search className="w-4 h-4" />} />
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville" leftIcon={<MapPin className="w-4 h-4" />} />
          <Input value={commune} onChange={(e) => setCommune(e.target.value)} placeholder="Commune (ex. Gombe)" />
          <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Quartier" />
          <Input value={around} onChange={(e) => setAround(e.target.value)} placeholder="Autour de (lieu)" />
          <select value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} className={fieldClass}>
            <option value="">Rayon — tous</option>
            {RADIUS_KM_OPTIONS.map((km) => (
              <option key={km} value={km}>{km} km</option>
            ))}
          </select>
          <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className={fieldClass}>
            {ROOM_FILTERS.map((opt) => (
              <option key={opt.id || 'all'} value={opt.id}>{opt.label}</option>
            ))}
          </select>
          <Button type="submit">Rechercher</Button>
        </form>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Carte des salles</h2>
          <MarketplaceLocationsMap
            markers={markers}
            searchable
            searchCenter={mapOrigin}
            radiusKm={Number(radiusKm || (mapOrigin ? 15 : 0))}
            onPlaceSelect={(place) => {
              setAround(place.label);
              if (!radiusKm) setRadiusKm('15');
              setMapOrigin(place);
              void load(place);
            }}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : venues.length === 0 ? (
          <div className="text-center py-16 px-6 border border-border rounded-[var(--radius-card)] bg-surface">
            <Building2 className="w-10 h-10 text-muted mx-auto mb-3" />
            <h2 className="font-semibold text-foreground">Aucune salle pour ces filtres</h2>
            <p className="text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">
              Élargissez la recherche, ou publiez une salle depuis Mon compte → Salles.
            </p>
            <Link href="/register" className="inline-block mt-5">
              <Button size="sm">Publier une salle</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {venues.map((venue) => (
              <Link
                key={venue.slug}
                href={`/marketplace/salles/${venue.slug}`}
                className="group bg-surface border border-border rounded-[var(--radius-card)] overflow-hidden hover:border-primary/40 transition"
              >
                <div className="aspect-[16/10] bg-surface-muted overflow-hidden">
                  {venue.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={venue.coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted">
                      <Building2 className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {roomTypeLabels[venue.roomType as RoomType] || venue.roomType}
                  </p>
                  <h2 className="font-display font-semibold text-foreground group-hover:text-primary transition">
                    {venue.headline}
                  </h2>
                  <p className="text-xs text-muted truncate">{venue.orgName}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted">
                    {formatLocationLine(venue) && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {formatLocationLine(venue)}
                      </span>
                    )}
                    {venue.capacity ? (
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3" /> {venue.capacity} places
                      </span>
                    ) : null}
                    {formatQuotaLabel(venue.quotaMin, venue.quotaMax) && (
                      <span>{formatQuotaLabel(venue.quotaMin, venue.quotaMax)}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-sm font-semibold text-foreground">
                      {venue.priceFromFc != null ? `Dès ${formatFc(venue.priceFromFc)}` : 'Sur devis'}
                      <span className="block text-[11px] font-normal text-muted">{venue.priceUnitLabel}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      Voir <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <SiteFooter faqHref="/faq" />
    </div>
  );
}
