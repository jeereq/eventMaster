'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, Calendar, MapPin, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import MarketplaceLocationsMap, { type MarketplaceMapMarker } from '@/components/MarketplaceLocationsMap';
import { Button, Skeleton } from '@/components/ui';
import CatalogueFilterBar, { CatalogueEntityFilterFields } from '@/components/CatalogueFilterBar';
import {
  EMPTY_CATALOGUE_GEO,
  appendCatalogueGeoParams,
  catalogueGeoChips,
  catalogueItemMatchesGeo,
  catalogueItemToMapMarker,
  catalogueKindLabel,
  cataloguePriceCaption,
  clearCatalogueGeoChip,
  eventToCatalogueItem,
  resolveCatalogueGeo,
  serviceToCatalogueItem,
  venueToCatalogueItem,
  withCatalogueDistance,
  type CatalogueGeoState,
  type PublicEventCard,
  type PublicService,
  type PublicVenue,
} from '@/lib/marketplace';
import {
  EMPTY_CATALOGUE_EXTRAS,
  appendCatalogueEntityParams,
  catalogueEntityExtraChips,
  catalogueItemMatchesExtras,
  clearCatalogueExtraChip,
  type CatalogueEntityExtras,
} from '@/lib/catalogueEntityFilters';

type MapFilters = CatalogueGeoState & CatalogueEntityExtras;

const emptyFilters: MapFilters = { ...EMPTY_CATALOGUE_GEO, ...EMPTY_CATALOGUE_EXTRAS };

export default function LandingMapSection() {
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [events, setEvents] = useState<PublicEventCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [applied, setApplied] = useState<MapFilters>(emptyFilters);
  const [draft, setDraft] = useState<MapFilters>(emptyFilters);
  const [filterError, setFilterError] = useState('');
  const [selected, setSelected] = useState<MarketplaceMapMarker | null>(null);

  const load = useCallback(async (filters: MapFilters, search: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      appendCatalogueGeoParams(params, filters);
      const venueParams = new URLSearchParams(params);
      appendCatalogueEntityParams(venueParams, filters, 'venue');
      const serviceParams = new URLSearchParams(params);
      appendCatalogueEntityParams(serviceParams, filters, 'service');
      const eventParams = new URLSearchParams();
      if (search.trim()) eventParams.set('q', search.trim());
      appendCatalogueGeoParams(eventParams, filters);
      appendCatalogueEntityParams(eventParams, filters, 'event');
      const loadVenues = filters.kind !== 'service' && filters.kind !== 'event';
      const loadServices = filters.kind !== 'venue' && filters.kind !== 'event';
      const loadEvents = filters.kind !== 'venue' && filters.kind !== 'service';
      const [venuesData, servicesData, eventsData] = await Promise.all([
        loadVenues ? api.get(`/public/venues${venueParams.toString() ? `?${venueParams}` : ''}`).catch(() => ({ venues: [] })) : Promise.resolve({ venues: [] }),
        loadServices ? api.get(`/public/services${serviceParams.toString() ? `?${serviceParams}` : ''}`).catch(() => ({ services: [] })) : Promise.resolve({ services: [] }),
        loadEvents ? api.get(`/public/events${eventParams.toString() ? `?${eventParams}` : ''}`).catch(() => ({ events: [] })) : Promise.resolve({ events: [] }),
      ]);
      setVenues(venuesData.venues || []);
      setServices(servicesData.services || []);
      setEvents(eventsData.events || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(applied, query); }, query.trim() ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [query, applied, load]);

  const items = useMemo(() => {
    const mapped = [
      ...venues.map(venueToCatalogueItem),
      ...services.map(serviceToCatalogueItem),
      ...events
        .map(eventToCatalogueItem)
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    ]
      .map((item) => withCatalogueDistance(item, applied.lat, applied.lng))
      .filter((item) => catalogueItemMatchesGeo(item, applied) && catalogueItemMatchesExtras(item, applied));
    return mapped;
  }, [venues, services, events, applied]);

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

  const chips = catalogueGeoChips(applied, catalogueEntityExtraChips(applied));
  const searchCenter = applied.proximity && applied.lat != null && applied.lng != null
    ? { lat: applied.lat, lng: applied.lng }
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
              Salles, prestataires et événements à Kinshasa et Lubumbashi
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Filtres complets (ville, dates, prix, type de salle, métier, entrée…). Sélectionnez un pin, puis ouvrez la fiche.
            </p>
          </div>
          <Link href="/marketplace">
            <Button variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Explorer le marketplace
            </Button>
          </Link>
        </div>

        <CatalogueFilterBar
          search={query}
          onSearchChange={setQuery}
          searchPlaceholder="Nom, quartier, prestataire, événement…"
          view="map"
          onViewChange={() => undefined}
          hideViewToggle
          resultLabel={!loading ? `${items.length} fiche${items.length > 1 ? 's' : ''} · ${markers.length} sur la carte` : undefined}
          chips={chips}
          onRemoveChip={(id) => setApplied(clearCatalogueExtraChip(clearCatalogueGeoChip(applied, id), id))}
          onClearChips={() => {
            setApplied(emptyFilters);
            setDraft(emptyFilters);
          }}
          onOpen={() => { setDraft(applied); setFilterError(''); }}
          onApply={async () => {
            try {
              const geo = await resolveCatalogueGeo(draft);
              setApplied({ ...draft, ...geo });
            } catch (err: unknown) {
              setFilterError(err instanceof Error ? err.message : 'Filtre de proximité impossible.');
              throw err;
            }
          }}
          modalTitle="Filtrer la carte"
          filters={
            <CatalogueEntityFilterFields
              showKind
              value={draft}
              extras={draft}
              error={filterError}
              onChange={(geo, extras) => setDraft({ ...geo, ...extras })}
            />
          }
        />

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
                city={applied.city || undefined}
                selectedId={selected?.id || null}
                onMarkerSelect={setSelected}
                searchCenter={searchCenter}
                radiusKm={searchCenter ? applied.radiusKm : 0}
              />
            </div>
            <aside className="rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-3">
              {selectedItem ? (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted inline-flex items-center gap-1.5">
                    {selectedItem.kind === 'venue' ? <Building2 className="w-3.5 h-3.5" /> : selectedItem.kind === 'event' ? <Calendar className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {catalogueKindLabel(selectedItem.kind)}
                  </p>
                  <h3 className="text-sm font-semibold text-foreground leading-snug">{selectedItem.title}</h3>
                  {selectedItem.location ? (
                    <p className="text-xs text-muted">{selectedItem.location}</p>
                  ) : null}
                  {selectedItem.categoryLabel ? (
                    <p className="text-xs text-muted">{selectedItem.categoryLabel}</p>
                  ) : null}
                  <p className="text-sm font-semibold text-foreground">
                    {cataloguePriceCaption(selectedItem)}
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
                  Touchez un pin pour sélectionner une salle, un prestataire ou un événement, puis ouvrez la fiche.
                </p>
              )}
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
