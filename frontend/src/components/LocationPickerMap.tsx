'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';
import { loadLeaflet, leafletBasemap, documentMapTheme, reverseGeocode, searchPlaces, type GeoPlace } from '@/lib/leafletLoader';
import {
  findRdcCity,
  findRdcCommune,
  leafletMaxBounds,
  nominatimViewbox,
  pointInBounds,
} from '@/lib/rdcCities';
import { cn } from '@/lib/cn';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { enabledMarketplaceCities, formatCityList } from '@/lib/platformCities';

export default function LocationPickerMap({
  latitude,
  longitude,
  onChange,
  height = 320,
  required = false,
  city,
  commune,
}: {
  latitude: string;
  longitude: string;
  onChange: (next: { latitude: string; longitude: string }) => void;
  height?: number;
  required?: boolean;
  city?: string;
  commune?: string;
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
  const cityMeta = findRdcCity(city);
  const communeMeta = findRdcCommune(city, commune);
  const cityMetaRef = useRef(cityMeta);
  cityMetaRef.current = cityMeta;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [hint, setHint] = useState('');
  const [mapTheme, setMapTheme] = useState<'light' | 'dark'>(documentMapTheme);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { site } = usePlatformSite();
  const cityList = formatCityList(enabledMarketplaceCities(site));

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
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

  const acceptPoint = (point: { lat: number; lng: number }) => {
    const meta = cityMetaRef.current;
    if (!meta) {
      setHint(`Choisissez d’abord ${cityList}.`);
      return false;
    }
    if (!pointInBounds(point.lat, point.lng, meta.bounds)) {
      setHint(`Placez le point dans ${meta.name}.`);
      return false;
    }
    return true;
  };

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
        const map = L.map(hostRef.current, {
          scrollWheelZoom: true,
          maxBoundsViscosity: 0.85,
        });
        leafletRef.current = L;
        applyBasemap(L, map, documentMapTheme());

        const start = hasPoint
          ? { lat, lng }
          : communeMeta?.center || cityMeta?.center || { lat: -4.325, lng: 15.322 };
        map.setView([start.lat, start.lng], hasPoint ? 15 : communeMeta ? 14 : 11);
        if (cityMeta) {
          map.setMaxBounds(leafletMaxBounds(cityMeta.bounds));
        } else {
          map.setMaxBounds(leafletMaxBounds({ south: -4.55, west: 15.12, north: -4.18, east: 16.32 }));
          map.dragging.disable();
          map.scrollWheelZoom.disable();
          map.doubleClickZoom.disable();
        }

        const placeMarker = (point: { lat: number; lng: number }, fly = false) => {
          if (!acceptPoint(point)) return;
          if (markerRef.current) {
            markerRef.current.setLatLng([point.lat, point.lng]);
          } else {
            markerRef.current = L.marker([point.lat, point.lng], {
              draggable: true,
              icon: pinIcon(L),
            }).addTo(map);
            markerRef.current.on('dragend', () => {
              const pos = markerRef.current.getLatLng();
              if (!acceptPoint(pos)) {
                if (hasPoint) markerRef.current.setLatLng([lat, lng]);
                return;
              }
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
          if (!acceptPoint(point)) return;
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
    // Recreate when the selected city changes so maxBounds stay correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityMeta?.name]);

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !cityMeta) return;
    map.setMaxBounds(leafletMaxBounds(cityMeta.bounds));
    if (hasPoint && !pointInBounds(lat, lng, cityMeta.bounds)) {
      onChangeRef.current({ latitude: '', longitude: '' });
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    }
    const focus = communeMeta?.center || cityMeta.center;
    map.flyTo([focus.lat, focus.lng], communeMeta ? 14 : 12, { duration: 0.5 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityMeta?.name, communeMeta?.name]);

  const runSearch = async (text: string) => {
    const q = text.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const suffix = cityMeta ? `, ${cityMeta.name}, RD Congo` : ', RD Congo';
      const places = await searchPlaces(`${q}${suffix}`, 6, cityMeta
        ? { viewbox: nominatimViewbox(cityMeta.bounds), bounded: true }
        : undefined);
      setResults(
        cityMeta
          ? places.filter((place) => pointInBounds(place.lat, place.lng, cityMeta.bounds))
          : places,
      );
    } finally {
      setSearching(false);
    }
  };

  const applyPlace = (place: GeoPlace) => {
    if (!acceptPoint(place)) return;
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

  const cityLabel = cityMeta?.name;
  const placeholder = cityLabel
    ? `Rechercher un lieu à ${cityLabel}${commune ? `, ${commune}` : ''}…`
    : `Choisissez d’abord ${cityList}`;

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="relative">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={query}
            disabled={!cityMeta}
            onChange={(e) => {
              const value = e.target.value;
              setQuery(value);
              if (searchTimer.current) clearTimeout(searchTimer.current);
              searchTimer.current = setTimeout(() => {
                void runSearch(value);
              }, 400);
            }}
            placeholder={placeholder}
            className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-border bg-surface-muted text-sm disabled:opacity-60"
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
      <div className="relative">
        <div
          ref={hostRef}
          className={cn(
            'em-marketplace-map w-full rounded-[var(--radius-card)] border border-border overflow-hidden bg-background',
            mapTheme === 'dark' && 'em-map-dark',
            !cityMeta && 'opacity-60',
          )}
          style={{ height }}
        />
        {!cityMeta ? (
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center rounded-[var(--radius-card)] bg-background/70">
            <p className="text-sm font-medium text-foreground">
              Choisissez {cityList} pour cadrer la carte.
            </p>
          </div>
        ) : null}
      </div>
      <p className={cn('text-[11px] flex items-start gap-1.5', required && !hasPoint ? 'text-rose-600' : 'text-muted')}>
        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        {!cityMeta
          ? `Choisissez ${cityList} dans Détails pour cadrer la carte.`
          : hasPoint
            ? `${hint || 'Position choisie'} · ${lat.toFixed(5)}, ${lng.toFixed(5)}`
            : required
              ? `Position GPS obligatoire à ${cityLabel} : cliquez dans le cadre de la ville.`
              : `Cliquez dans le cadre de ${cityLabel} pour enregistrer la position.`}
      </p>
    </div>
  );
}
