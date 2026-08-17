'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { loadLeaflet, reverseGeocode, searchPlaces, type GeoPlace } from '@/lib/leafletLoader';

export interface MarketplaceMapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  href: string;
  subtitle?: string;
  kind?: 'venue' | 'service';
}

const KINSHASA = { lat: -4.325, lng: 15.322 };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cssVar(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function markerColor(kind?: 'venue' | 'service') {
  return kind === 'service'
    ? cssVar('--festive-accent', '#b45309')
    : cssVar('--primary', '#4f46e5');
}

export default function MarketplaceLocationsMap({
  markers,
  height = 420,
  searchable = false,
  listingSearch = false,
  searchCenter = null,
  radiusKm = 0,
  onPlaceSelect,
}: {
  markers: MarketplaceMapMarker[];
  height?: number;
  /** Recherche OpenStreetMap (formulaires internes). */
  searchable?: boolean;
  /** Recherche uniquement parmi les fiches EventMaster affichées. */
  listingSearch?: boolean;
  searchCenter?: { lat: number; lng: number } | null;
  radiusKm?: number;
  onPlaceSelect?: (place: GeoPlace) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersById = useRef<Map<string, any>>(new Map());
  const onPlaceSelectRef = useRef(onPlaceSelect);
  onPlaceSelectRef.current = onPlaceSelect;

  const [query, setQuery] = useState('');
  const [osmResults, setOsmResults] = useState<GeoPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markersKey = markers.map((m) => `${m.id}:${m.lat}:${m.lng}:${m.kind || ''}`).join('|');
  const centerKey = searchCenter ? `${searchCenter.lat}:${searchCenter.lng}:${radiusKm}` : '';

  const listingMatches = listingSearch
    ? markers.filter((m) => {
        const q = query.trim().toLowerCase();
        if (q.length < 1) return false;
        return [m.title, m.subtitle, m.kind === 'venue' ? 'salle' : 'prestataire']
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
      }).slice(0, 8)
    : [];

  useEffect(() => {
    let cancelled = false;
    if (!hostRef.current) return undefined;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !hostRef.current) return;
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        markersById.current.clear();
        const map = L.map(hostRef.current, { scrollWheelZoom: true });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        const points = markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
        const layers: any[] = points.map((m) => {
          const color = markerColor(m.kind);
          const kindLabel = m.kind === 'service' ? 'Prestataire EventMaster' : m.kind === 'venue' ? 'Salle EventMaster' : '';
          const leafletMarker = L.circleMarker([m.lat, m.lng], {
            radius: 9,
            color,
            weight: 2,
            fillColor: color,
            fillOpacity: 0.85,
          }).bindPopup(
            `<a href="${escapeHtml(m.href)}" style="font-weight:600">${escapeHtml(m.title)}</a>${
              kindLabel ? `<br/><span>${escapeHtml(kindLabel)}</span>` : ''
            }${m.subtitle ? `<br/><span>${escapeHtml(m.subtitle)}</span>` : ''}`,
          );
          markersById.current.set(m.id, leafletMarker);
          return leafletMarker;
        });

        if (searchCenter && Number.isFinite(searchCenter.lat) && Number.isFinite(searchCenter.lng)) {
          layers.push(L.marker([searchCenter.lat, searchCenter.lng]).bindPopup('Centre de recherche'));
          if (radiusKm > 0) {
            layers.push(
              L.circle([searchCenter.lat, searchCenter.lng], {
                radius: radiusKm * 1000,
                color: '#b45309',
                weight: 1,
                fillColor: '#b45309',
                fillOpacity: 0.08,
              }),
            );
          }
        }

        if (layers.length === 0) {
          map.setView([KINSHASA.lat, KINSHASA.lng], 11);
        } else {
          const group = L.featureGroup(layers).addTo(map);
          map.fitBounds(group.getBounds().pad(0.28), { maxZoom: 14 });
        }

        if (searchable && !listingSearch) {
          map.on('click', (event: { latlng: { lat: number; lng: number } }) => {
            const point = { lat: event.latlng.lat, lng: event.latlng.lng };
            void reverseGeocode(point.lat, point.lng).then((label) => {
              onPlaceSelectRef.current?.({
                lat: point.lat,
                lng: point.lng,
                label: label || 'Point sur la carte',
              });
            });
          });
        }

        mapRef.current = map;
        setTimeout(() => map.invalidateSize(), 80);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [markersKey, centerKey, searchable, listingSearch, markers, searchCenter, radiusKm]);

  const runOsmSearch = async (text: string) => {
    const q = text.trim();
    if (q.length < 2) {
      setOsmResults([]);
      return;
    }
    setSearching(true);
    try {
      setOsmResults(await searchPlaces(`${q}, RD Congo`));
    } finally {
      setSearching(false);
    }
  };

  const applyPlace = (place: GeoPlace) => {
    setQuery(place.label);
    setOsmResults([]);
    onPlaceSelect?.(place);
    mapRef.current?.flyTo([place.lat, place.lng], 14, { duration: 0.5 });
  };

  const focusListing = (id: string) => {
    const marker = markersById.current.get(id);
    const data = markers.find((m) => m.id === id);
    setQuery(data?.title || '');
    if (marker && data && mapRef.current) {
      mapRef.current.flyTo([data.lat, data.lng], 15, { duration: 0.45 });
      marker.openPopup();
    }
  };

  const showSearch = searchable || listingSearch;
  const unmatchedOnMap = listingSearch
    ? markers.length
    : 0;

  return (
    <div className="space-y-2">
      {showSearch && (
        <div className="relative">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => {
              const value = e.target.value;
              setQuery(value);
              if (!listingSearch) {
                if (searchTimer.current) clearTimeout(searchTimer.current);
                searchTimer.current = setTimeout(() => {
                  void runOsmSearch(value);
                }, 400);
              }
            }}
            placeholder={
              listingSearch
                ? 'Rechercher une salle ou un prestataire EventMaster…'
                : 'Chercher un lieu sur la carte…'
            }
            className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-border bg-surface-muted text-sm"
          />
          {searching && <Loader2 className="w-4 h-4 animate-spin text-muted absolute right-3 top-1/2 -translate-y-1/2" />}
          {listingSearch && query.trim() && (
            <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-xl border border-border bg-surface shadow-[var(--shadow-soft)]">
              {listingMatches.length === 0 ? (
                <li className="px-3 py-2.5 text-xs text-muted">
                  Aucune salle ni prestataire EventMaster ne correspond.
                </li>
              ) : (
                listingMatches.map((place) => (
                  <li key={place.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-xs hover:bg-surface-muted"
                      onClick={() => focusListing(place.id)}
                    >
                      <span className="font-semibold text-foreground">{place.title}</span>
                      <span className="block text-muted">
                        {place.kind === 'service' ? 'Prestataire' : 'Salle'}
                        {place.subtitle ? ` · ${place.subtitle}` : ''}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
          {!listingSearch && osmResults.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-xl border border-border bg-surface shadow-[var(--shadow-soft)]">
              {osmResults.map((place) => (
                <li key={`${place.lat}-${place.lng}-${place.label}`}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-xs hover:bg-surface-muted"
                    onClick={() => applyPlace(place)}
                  >
                    {place.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div
        ref={hostRef}
        className="w-full rounded-[var(--radius-card)] border border-border overflow-hidden bg-surface-muted"
        style={{ height }}
      />
      {listingSearch && (
        <p className="text-[11px] text-muted">
          Uniquement les salles et prestataires enregistrés sur EventMaster
          {unmatchedOnMap ? ` · ${unmatchedOnMap} fiche${unmatchedOnMap > 1 ? 's' : ''} avec GPS` : ''}.
        </p>
      )}
      {searchable && !listingSearch && (
        <p className="text-[11px] text-muted">
          Tapez un lieu ou cliquez sur la carte pour filtrer autour de ce point.
        </p>
      )}
    </div>
  );
}
