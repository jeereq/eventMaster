'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, MapPin, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import MarketplaceLocationsMap, { type MarketplaceMapMarker } from '@/components/MarketplaceLocationsMap';
import { Button, Input, Skeleton } from '@/components/ui';
import { CatalogueChoicePills } from '@/components/CatalogueFilterBar';
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  catalogueItemToMapMarker,
  serviceToCatalogueItem,
  venueToCatalogueItem,
  type PublicService,
  type PublicVenue,
} from '@/lib/marketplace';
import { formatFc } from '@/config/landingPricing';
import { RDC_CITIES } from '@/lib/rdcCities';

type KindFilter = 'all' | 'venue' | 'service';

export default function LandingMapSection() {
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<KindFilter>('all');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<MarketplaceMapMarker | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get('/public/venues').catch(() => ({ venues: [] })),
      api.get('/public/services').catch(() => ({ services: [] })),
    ]).then(([venuesData, servicesData]) => {
      if (cancelled) return;
      setVenues(venuesData.venues || []);
      setServices(servicesData.services || []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const venueItems = venues
      .filter((venue) => kind !== 'service')
      .filter((venue) => !city || venue.city === city)
      .map(venueToCatalogueItem);
    const serviceItems = services
      .filter((service) => kind !== 'venue')
      .filter((service) => !city || service.city === city)
      .filter((service) => !category || service.category === category)
      .map(serviceToCatalogueItem);
    return [...venueItems, ...serviceItems].filter((item) => {
      if (!q) return true;
      return `${item.title} ${item.orgName || ''} ${item.categoryLabel || ''} ${item.location || ''}`.toLowerCase().includes(q);
    });
  }, [venues, services, kind, city, category, query]);

  const markers = useMemo(
    () =>
      items
        .filter((item) => item.latitude != null && item.longitude != null)
        .map(catalogueItemToMapMarker),
    [items],
  );

  useEffect(() => {
    if (!selected) return;
    if (!markers.some((marker) => marker.id === selected.id)) setSelected(null);
  }, [markers, selected]);

  const selectedItem = selected
    ? items.find((item) => item.id === selected.id) || null
    : null;

  return (
    <section className="py-12 sm:py-16 border-t border-border bg-background">
      <div className="page-container space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="max-w-2xl space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Sur la carte
            </p>
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">
              Salles et prestataires à Kinshasa et Lubumbashi
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Filtrez, sélectionnez un pin, puis ouvrez la fiche. L’itinéraire se lance depuis la carte.
            </p>
          </div>
          <Link href="/marketplace">
            <Button variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Explorer le marketplace
            </Button>
          </Link>
        </div>

        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3 sm:p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Recherche"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom, quartier, prestataire…"
            />
            <label className="block space-y-1.5 min-w-0">
              <span className="text-xs font-semibold text-muted">Ville</span>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full h-[42px] px-3 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
              >
                <option value="">Toutes</option>
                {RDC_CITIES.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </label>
            <div className="sm:col-span-2 space-y-1.5">
              <p className="text-xs font-semibold text-muted">Type</p>
              <CatalogueChoicePills
                value={kind === 'all' ? '' : kind}
                onChange={(id) => setKind((id || 'all') as KindFilter)}
                options={[
                  { id: '', label: 'Tous' },
                  { id: 'venue', label: 'Salles' },
                  { id: 'service', label: 'Prestataires' },
                ]}
              />
            </div>
          </div>
          {kind !== 'venue' && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted">Catégorie de prestation</p>
              <CatalogueChoicePills
                value={category}
                onChange={setCategory}
                options={[
                  { id: '', label: 'Toutes' },
                  ...SERVICE_CATEGORIES.map((id) => ({ id, label: SERVICE_CATEGORY_LABELS[id] })),
                ]}
              />
            </div>
          )}
          <p className="text-[11px] text-muted">
            {markers.length} emplacement{markers.length > 1 ? 's' : ''} sur la carte
            {items.length !== markers.length ? ` · ${items.length} fiche${items.length > 1 ? 's' : ''} au total` : ''}
          </p>
        </div>

        {loading ? (
          <Skeleton className="w-full h-[420px] rounded-[var(--radius-card)]" />
        ) : (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem] gap-3 items-stretch">
            <div className="rounded-[var(--radius-card)] overflow-hidden border border-border min-h-[22rem]">
              <MarketplaceLocationsMap
                markers={markers}
                height={440}
                listingSearch
                navigateOnClick={false}
                city={city || undefined}
                selectedId={selected?.id || null}
                onMarkerSelect={setSelected}
              />
            </div>
            <aside className="rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-3">
              {selectedItem ? (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted inline-flex items-center gap-1.5">
                    {selectedItem.kind === 'venue' ? <Building2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {selectedItem.kind === 'venue' ? 'Salle' : 'Prestation'}
                  </p>
                  <h3 className="text-sm font-semibold text-foreground leading-snug">{selectedItem.title}</h3>
                  {selectedItem.location ? (
                    <p className="text-xs text-muted">{selectedItem.location}</p>
                  ) : null}
                  {selectedItem.categoryLabel ? (
                    <p className="text-xs text-muted">{selectedItem.categoryLabel}</p>
                  ) : null}
                  <p className="text-sm font-semibold text-foreground">
                    {selectedItem.priceFromFc != null ? formatFc(selectedItem.priceFromFc) : 'Sur devis'}
                    {selectedItem.priceUnitLabel ? (
                      <span className="text-xs font-medium text-muted"> · {selectedItem.priceUnitLabel}</span>
                    ) : null}
                  </p>
                  <Link href={selectedItem.href} className="block">
                    <Button fullWidth size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Voir la fiche
                    </Button>
                  </Link>
                </>
              ) : (
                <p className="text-sm text-muted leading-relaxed">
                  Touchez un pin pour sélectionner une salle ou un prestataire, puis ouvrez la fiche.
                </p>
              )}
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
