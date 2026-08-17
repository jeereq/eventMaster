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
}

const KINSHASA = { lat: -4.325, lng: 15.322 };

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function MarketplaceLocationsMap({
  markers,
  height = 360,
  searchable = false,
  searchCenter = null,
  radiusKm = 0,
  onPlaceSelect,
}: {
  markers: MarketplaceMapMarker[];
  height?: number;
  searchable?: boolean;
  searchCenter?: { lat: number; lng: number } | null;
  radiusKm?: number;
  onPlaceSelect?: (place: GeoPlace) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  onPlaceSelectRef.current = onPlaceSelect;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markersKey = markers.map((m) => `${m.id}:${m.lat}:${m.lng}`).join('|');
  const centerKey = searchCenter ? `${searchCenter.lat}:${searchCenter.lng}:${radiusKm}` : '';

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
        const map = L.map(hostRef.current, { scrollWheelZoom: true });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        const points = markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
        const layers: any[] = points.map((m) =>
          L.marker([m.lat, m.lng]).bindPopup(
            `<a href="${escapeHtml(m.href)}" style="font-weight:600">${escapeHtml(m.title)}</a>${m.subtitle ? `<br/><span>${escapeHtml(m.subtitle)}</span>` : ''}`,
          ),
        );

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

        if (searchable) {
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
  }, [markersKey, centerKey, searchable, markers, searchCenter, radiusKm]);

  const runSearch = async (text: string) => {
    const q = text.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      setResults(await searchPlaces(`${q}, RD Congo`));
    } finally {
      setSearching(false);
    }
  };

  const applyPlace = (place: GeoPlace) => {
    setQuery(place.label);
    setResults([]);
    onPlaceSelect?.(place);
    mapRef.current?.flyTo([place.lat, place.lng], 14, { duration: 0.5 });
  };

  return (
    <div className="space-y-2">
      {searchable && (
        <div className="relative">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => {
              const value = e.target.value;
              setQuery(value);
              if (searchTimer.current) clearTimeout(searchTimer.current);
              searchTimer.current = setTimeout(() => {
                void runSearch(value);
              }, 400);
            }}
            placeholder="Chercher un lieu sur la carte…"
            className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-border bg-surface-muted text-sm"
          />
          {searching && <Loader2 className="w-4 h-4 animate-spin text-muted absolute right-3 top-1/2 -translate-y-1/2" />}
          {results.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-xl border border-border bg-surface shadow-[var(--shadow-soft)]">
              {results.map((place) => (
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
      {searchable && (
        <p className="text-[11px] text-muted">
          Tapez un lieu ou cliquez sur la carte pour filtrer autour de ce point.
        </p>
      )}
    </div>
  );
}
