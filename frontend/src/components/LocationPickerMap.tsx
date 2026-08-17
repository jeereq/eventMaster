'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';
import { loadLeaflet, leafletBasemap, documentMapTheme, reverseGeocode, searchPlaces, type GeoPlace } from '@/lib/leafletLoader';
import { cn } from '@/lib/cn';

const KINSHASA = { lat: -4.325, lng: 15.322 };

export default function LocationPickerMap({
  latitude,
  longitude,
  onChange,
  height = 320,
  required = false,
}: {
  latitude: string;
  longitude: string;
  onChange: (next: { latitude: string; longitude: string }) => void;
  height?: number;
  required?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const lat = Number.parseFloat(latitude);
  const lng = Number.parseFloat(longitude);
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [hint, setHint] = useState('');
  const [mapTheme, setMapTheme] = useState<'light' | 'dark'>(documentMapTheme);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyBasemap = (L: any, map: any, nextTheme: 'light' | 'dark') => {
    const spec = leafletBasemap(nextTheme);
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(spec.url, {
      attribution: spec.attribution,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
  };

  const pinIcon = (L: any) =>
    L.divIcon({
      className: 'em-map-pin',
      html: '<span class="em-map-pin-dot"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return undefined;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !hostRef.current) return;
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
          markerRef.current = null;
        }
        const map = L.map(hostRef.current, { scrollWheelZoom: true });
        leafletRef.current = L;
        applyBasemap(L, map, documentMapTheme());

        const start = hasPoint ? { lat, lng } : KINSHASA;
        map.setView([start.lat, start.lng], hasPoint ? 15 : 11);

        const placeMarker = (point: { lat: number; lng: number }, fly = false) => {
          if (markerRef.current) {
            markerRef.current.setLatLng([point.lat, point.lng]);
          } else {
            markerRef.current = L.marker([point.lat, point.lng], {
              draggable: true,
              icon: pinIcon(L),
            }).addTo(map);
            markerRef.current.on('dragend', () => {
              const pos = markerRef.current.getLatLng();
              onChangeRef.current({
                latitude: pos.lat.toFixed(6),
                longitude: pos.lng.toFixed(6),
              });
            });
          }
          if (fly) map.flyTo([point.lat, point.lng], 16, { duration: 0.6 });
        };

        if (hasPoint) placeMarker({ lat, lng });

        map.on('click', (event: { latlng: { lat: number; lng: number } }) => {
          const point = { lat: event.latlng.lat, lng: event.latlng.lng };
          placeMarker(point);
          onChangeRef.current({
            latitude: point.lat.toFixed(6),
            longitude: point.lng.toFixed(6),
          });
          void reverseGeocode(point.lat, point.lng).then((label) => {
            if (label) setHint(label);
          });
        });

        mapRef.current = map;
        (map as any).__placeMarker = placeMarker;
        setTimeout(() => map.invalidateSize(), 120);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // Point initial only — later updates go through the marker API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const sync = () => {
      const next = documentMapTheme();
      setMapTheme(next);
      const map = mapRef.current;
      const L = leafletRef.current;
      if (map && L) applyBasemap(L, map, next);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasPoint) return;
    const placeMarker = (map as any).__placeMarker as ((p: { lat: number; lng: number }, fly?: boolean) => void) | undefined;
    placeMarker?.({ lat, lng });
  }, [hasPoint, lat, lng]);

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
    setHint(place.label);
    onChange({
      latitude: place.lat.toFixed(6),
      longitude: place.lng.toFixed(6),
    });
    const map = mapRef.current;
    const placeMarker = map ? ((map as any).__placeMarker as ((p: { lat: number; lng: number }, fly?: boolean) => void) | undefined) : undefined;
    placeMarker?.({ lat: place.lat, lng: place.lng }, true);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
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
            placeholder="Rechercher un lieu, une avenue, une commune…"
            className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-border bg-surface-muted text-sm"
          />
          {searching && <Loader2 className="w-4 h-4 animate-spin text-muted absolute right-3 top-1/2 -translate-y-1/2" />}
        </div>
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
      <div
        ref={hostRef}
        className={cn(
          'em-marketplace-map w-full rounded-[var(--radius-card)] border border-border overflow-hidden bg-background',
          mapTheme === 'dark' && 'em-map-dark',
        )}
        style={{ height }}
      />
      <p className={cn('text-[11px] flex items-start gap-1.5', required && !hasPoint ? 'text-rose-600' : 'text-muted')}>
        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        {hasPoint
          ? `${hint || 'Position choisie'} · ${lat.toFixed(5)}, ${lng.toFixed(5)}`
          : required
            ? 'Position GPS obligatoire : cliquez sur la carte ou cherchez un lieu.'
            : 'Cliquez sur la carte ou cherchez un lieu pour enregistrer la position.'}
      </p>
    </div>
  );
}
