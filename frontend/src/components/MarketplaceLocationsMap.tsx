'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, MapPin, Navigation, Search } from 'lucide-react';
import { loadLeaflet, leafletBasemap, reverseGeocode, searchPlaces, type GeoPlace } from '@/lib/leafletLoader';
import { mapsDirectionsUrl } from '@/lib/marketplace';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

export interface MarketplaceMapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  href: string;
  subtitle?: string;
  kind?: 'venue' | 'service';
  coverUrl?: string | null;
  priceLabel?: string;
  categoryLabel?: string;
  orgName?: string;
  location?: string;
  coverageRadiusKm?: number | null;
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

function hexToRgba(hex: string, alpha: number) {
  const raw = hex.replace('#', '').trim();
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const n = Number.parseInt(full.slice(0, 6), 16);
  if (!Number.isFinite(n)) return `rgba(180, 83, 9, ${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function MarkerPreviewCard({
  marker,
  onKeep,
  onHide,
}: {
  marker: MarketplaceMapMarker;
  onKeep: () => void;
  onHide: () => void;
}) {
  const kindLabel = marker.categoryLabel
    || (marker.kind === 'service' ? 'Prestataire' : marker.kind === 'venue' ? 'Salle' : '');

  return (
    <div
      className="absolute z-30 left-3 right-3 bottom-3 sm:left-auto sm:right-3 sm:w-80 rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-soft)] overflow-hidden"
      onMouseEnter={onKeep}
      onMouseLeave={onHide}
    >
      {marker.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={marker.coverUrl} alt="" className="w-full h-28 object-cover" />
      ) : null}
      <div className="p-3 space-y-2">
        {kindLabel ? (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{kindLabel}</p>
        ) : null}
        <h3 className="font-semibold text-sm text-foreground leading-snug">{marker.title}</h3>
        {marker.orgName ? <p className="text-xs text-muted truncate">{marker.orgName}</p> : null}
        {(marker.location || marker.subtitle) ? (
          <p className="text-xs text-muted inline-flex items-start gap-1">
            <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{marker.location || marker.subtitle}</span>
          </p>
        ) : null}
        {marker.kind === 'service' && marker.coverageRadiusKm ? (
          <p className="text-xs font-medium text-foreground">
            Rayon d’action : {marker.coverageRadiusKm} km
          </p>
        ) : null}
        {marker.priceLabel ? (
          <p className="text-sm font-semibold text-foreground">{marker.priceLabel}</p>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href={marker.href} className="inline-flex">
            <Button size="sm">Voir la fiche</Button>
          </Link>
          <a
            href={mapsDirectionsUrl(marker.lat, marker.lng)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex"
          >
            <Button size="sm" variant="secondary" leftIcon={<Navigation className="w-3.5 h-3.5" />}>
              Itinéraire
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function MarketplaceLocationsMap({
  markers,
  height = 420,
  searchable = false,
  listingSearch = false,
  searchCenter = null,
  radiusKm = 0,
  onPlaceSelect,
  navigateOnClick = true,
  variant = 'default',
}: {
  markers: MarketplaceMapMarker[];
  height?: number;
  searchable?: boolean;
  listingSearch?: boolean;
  searchCenter?: { lat: number; lng: number } | null;
  radiusKm?: number;
  onPlaceSelect?: (place: GeoPlace) => void;
  navigateOnClick?: boolean;
  variant?: 'default' | 'focus';
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const radiusLayerRef = useRef<any>(null);
  const overviewBoundsRef = useRef<any>(null);
  const markersById = useRef<Map<string, any>>(new Map());
  const onPlaceSelectRef = useRef(onPlaceSelect);
  onPlaceSelectRef.current = onPlaceSelect;
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const navigateOnClickRef = useRef(navigateOnClick);
  navigateOnClickRef.current = navigateOnClick;
  const routerRef = useRef(router);
  routerRef.current = router;
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const [query, setQuery] = useState('');
  const [osmResults, setOsmResults] = useState<GeoPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [hovered, setHovered] = useState<MarketplaceMapMarker | null>(null);
  const [mapReady, setMapReady] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showPreview = (marker: MarketplaceMapMarker) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setHovered(marker);
  };
  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setHovered(null), 280);
  };
  const showPreviewRef = useRef(showPreview);
  showPreviewRef.current = showPreview;

  const markersKey = markers.map((m) => `${m.id}:${m.lat}:${m.lng}:${m.kind || ''}:${m.coverageRadiusKm || ''}`).join('|');
  const centerKey = searchCenter ? `${searchCenter.lat}:${searchCenter.lng}:${radiusKm}` : '';

  useEffect(() => {
    setHovered(null);
  }, [markersKey]);

  const listingMatches = listingSearch
    ? markers.filter((m) => {
        const q = query.trim().toLowerCase();
        if (q.length < 1) return false;
        return [m.title, m.subtitle, m.orgName, m.location, m.kind === 'venue' ? 'salle' : 'prestataire']
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
      }).slice(0, 8)
    : [];

  const applyBasemap = (L: any, map: any, nextTheme: 'light' | 'dark') => {
    const spec = leafletBasemap(nextTheme);
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    tileLayerRef.current = L.tileLayer(spec.url, {
      attribution: spec.attribution,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
  };

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
        radiusLayerRef.current = null;
        leafletRef.current = L;
        const map = L.map(hostRef.current, { scrollWheelZoom: true });
        applyBasemap(L, map, themeRef.current);

        if (!map.getPane('coverage')) {
          map.createPane('coverage');
          map.getPane('coverage').style.zIndex = '350';
          map.getPane('coverage').style.pointerEvents = 'none';
        }

        const points = markersRef.current.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
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
            `<strong>${escapeHtml(m.title)}</strong>${
              kindLabel ? `<br/><span>${escapeHtml(kindLabel)}</span>` : ''
            }${m.subtitle ? `<br/><span>${escapeHtml(m.subtitle)}</span>` : ''}${
              m.kind === 'service' && m.coverageRadiusKm
                ? `<br/><span>Rayon d’action : ${m.coverageRadiusKm} km</span>`
                : ''
            }<br/>
            <a href="${escapeHtml(m.href)}">Voir la fiche</a>
            · <a href="${escapeHtml(mapsDirectionsUrl(m.lat, m.lng))}" target="_blank" rel="noreferrer">Itinéraire</a>`,
          );

          leafletMarker.on('mouseover', () => {
            leafletMarker.setRadius(12);
            showPreviewRef.current(m);
          });
          leafletMarker.on('mouseout', () => {
            leafletMarker.setRadius(9);
          });
          leafletMarker.on('click', () => {
            showPreviewRef.current(m);
            if (navigateOnClickRef.current) {
              routerRef.current.push(m.href);
            } else {
              leafletMarker.openPopup();
            }
          });

          markersById.current.set(m.id, leafletMarker);
          return leafletMarker;
        });

        if (searchCenter && Number.isFinite(searchCenter.lat) && Number.isFinite(searchCenter.lng)) {
          layers.push(L.marker([searchCenter.lat, searchCenter.lng]).bindPopup('Centre de recherche'));
          if (radiusKm > 0) {
            layers.push(
              L.circle([searchCenter.lat, searchCenter.lng], {
                radius: radiusKm * 1000,
                color: cssVar('--festive-accent', '#b45309'),
                weight: 1,
                fillColor: cssVar('--festive-accent', '#b45309'),
                fillOpacity: 0.08,
              }),
            );
          }
        }

        if (layers.length === 0) {
          map.setView([KINSHASA.lat, KINSHASA.lng], 11);
          overviewBoundsRef.current = null;
        } else {
          const group = L.featureGroup(layers).addTo(map);
          const bounds = group.getBounds().pad(0.28);
          overviewBoundsRef.current = bounds;
          map.fitBounds(bounds, { maxZoom: 14 });
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
        setMapReady((n) => n + 1);
        setTimeout(() => map.invalidateSize(), 80);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      tileLayerRef.current = null;
      radiusLayerRef.current = null;
    };
  }, [markersKey, centerKey, searchable, listingSearch, searchCenter, radiusKm]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;
    applyBasemap(L, map, theme);
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    if (radiusLayerRef.current) {
      map.removeLayer(radiusLayerRef.current);
      radiusLayerRef.current = null;
    }

    const loneService = markersRef.current.length === 1 ? markersRef.current[0] : null;
    const focus = hovered || (
      loneService?.kind === 'service' && loneService.coverageRadiusKm
        ? loneService
        : null
    );

    markersById.current.forEach((layer, id) => {
      if (!focus) {
        layer.setStyle({ fillOpacity: 0.85, opacity: 1, weight: 2 });
        return;
      }
      if (id === focus.id) layer.setStyle({ fillOpacity: 0.95, opacity: 1, weight: 3 });
      else layer.setStyle({ fillOpacity: 0.22, opacity: 0.35, weight: 1 });
    });

    if (!focus) {
      if (overviewBoundsRef.current) {
        map.fitBounds(overviewBoundsRef.current, { maxZoom: 14, animate: true });
      }
      return;
    }

    const radius = focus.kind === 'service' && focus.coverageRadiusKm && focus.coverageRadiusKm > 0
      ? focus.coverageRadiusKm
      : 0;

    if (radius > 0) {
      const color = markerColor('service');
      const circle = L.circle([focus.lat, focus.lng], {
        pane: 'coverage',
        radius: radius * 1000,
        color,
        weight: 2,
        dashArray: '7 5',
        fillColor: hexToRgba(color, 0.16),
        fillOpacity: 1,
      }).addTo(map);
      radiusLayerRef.current = circle;
      map.fitBounds(circle.getBounds().pad(0.12), { maxZoom: 13, animate: true });
    } else if (hovered) {
      map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 14), { duration: 0.4 });
    }
  }, [hovered, mapReady]);

  useEffect(() => {
    const timer = window.setTimeout(() => mapRef.current?.invalidateSize(), 80);
    return () => window.clearTimeout(timer);
  }, [variant, mapReady]);

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
    if (data) showPreview(data);
    if (marker && data && mapRef.current) {
      mapRef.current.flyTo([data.lat, data.lng], 15, { duration: 0.45 });
      marker.openPopup();
    }
  };

  const showSearch = searchable || listingSearch;
  const searchOverlay = variant === 'focus';
  const mapHeight = variant === 'focus' ? 'calc(100dvh - 10.5rem)' : height;

  const searchField = showSearch ? (
    <div className={cn('relative', searchOverlay && 'pointer-events-auto')}>
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
        className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-border bg-surface text-sm shadow-[var(--shadow-soft)]"
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
                    {place.coverageRadiusKm ? ` · rayon ${place.coverageRadiusKm} km` : ''}
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
  ) : null;

  return (
    <div className="space-y-2">
      {showSearch && !searchOverlay && searchField}
      <div
        className="relative"
        onMouseEnter={() => {
          if (hideTimer.current) clearTimeout(hideTimer.current);
        }}
        onMouseLeave={scheduleHide}
      >
        {searchOverlay && searchField && (
          <div className="absolute z-20 top-3 left-3 right-3 sm:right-auto sm:w-80">
            {searchField}
          </div>
        )}
        <div
          ref={hostRef}
          className="em-marketplace-map w-full rounded-[var(--radius-card)] border border-border overflow-hidden bg-background"
          style={{ height: mapHeight, minHeight: variant === 'focus' ? 420 : undefined }}
        />
        {hovered && (
          <MarkerPreviewCard
            marker={hovered}
            onKeep={() => showPreview(hovered)}
            onHide={scheduleHide}
          />
        )}
      </div>
      {listingSearch && variant !== 'focus' && (
        <p className="text-[11px] text-muted">
          Survolez un prestataire pour voir son rayon d’action. Cliquez pour ouvrir la fiche.
          {markers.length ? ` · ${markers.length} fiche${markers.length > 1 ? 's' : ''} avec GPS` : ''}.
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
