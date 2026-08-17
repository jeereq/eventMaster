'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Loader2, MapPin, Navigation, Search, Sparkles, Users, X } from 'lucide-react';
import { loadLeaflet, leafletBasemap, documentMapTheme, reverseGeocode, searchPlaces, type GeoPlace } from '@/lib/leafletLoader';
import {
  fetchDrivingRoute,
  formatRouteDistance,
  formatRouteDuration,
  type DrivingRoute,
} from '@/lib/osrm';
import { findRdcCity, cityForPoint, leafletMaxBounds, nominatimViewbox, pointInAllowedRdcCities, pointInBounds } from '@/lib/rdcCities';
import { formatDistanceKm, haversineKm } from '@/lib/marketplace';
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
  priceUnitLabel?: string;
  categoryLabel?: string;
  orgName?: string;
  location?: string;
  address?: string;
  coverageRadiusKm?: number | null;
  capacity?: number | null;
  quotaLabel?: string | null;
  distanceKm?: number | null;
  roomTypeLabel?: string | null;
}

const KINSHASA = { lat: -4.325, lng: 15.322 };

const VENUE_ICON_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M6 12H4a2 2 0 0 0-2 2v8h20v-8a2 2 0 0 0-2-2h-2"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/></svg>';
const SERVICE_ICON_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>';
const HERE_ICON_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>';

function listingIconHtml(kind?: 'venue' | 'service') {
  const isService = kind === 'service';
  return `<span class="em-map-marker-hit"><span class="em-map-marker-inner"><span class="em-map-marker-head">${isService ? SERVICE_ICON_SVG : VENUE_ICON_SVG}</span><span class="em-map-marker-tail"></span></span></span>`;
}

function hereIconHtml() {
  return `<span class="em-map-marker-inner"><span class="em-map-marker-head">${HERE_ICON_SVG}</span></span>`;
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
  pinned,
  onKeep,
  onHide,
  onClose,
  onDirections,
  searchCenter,
}: {
  marker: MarketplaceMapMarker;
  pinned?: boolean;
  onKeep: () => void;
  onHide: () => void;
  onClose: () => void;
  onDirections: (marker: MarketplaceMapMarker) => void;
  searchCenter?: { lat: number; lng: number } | null;
}) {
  const isService = marker.kind === 'service';
  const KindIcon = isService ? Sparkles : Building2;
  const kindLabel = isService ? 'Prestataire' : 'Salle';
  const distance = formatDistanceKm(
    marker.distanceKm
    ?? (searchCenter ? haversineKm(searchCenter.lat, searchCenter.lng, marker.lat, marker.lng) : null),
  );

  return (
    <div
      className="absolute z-[500] left-3 right-3 bottom-3 sm:left-auto sm:right-3 sm:w-[22rem] rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-soft)] overflow-hidden max-h-[70%] overflow-y-auto pointer-events-auto"
      onMouseEnter={onKeep}
      onMouseLeave={onHide}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute z-10 top-2 right-2 p-1.5 rounded-lg bg-surface/95 text-muted hover:text-foreground border border-border shadow-sm"
        aria-label="Fermer les détails"
      >
        <X className="w-4 h-4" />
      </button>
      {marker.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={marker.coverUrl} alt="" className="w-full h-32 object-cover" />
      ) : (
        <div className={cn(
          'h-16 flex items-center justify-center',
          isService ? 'bg-[color:var(--festive-accent)]/12 text-[color:var(--festive-accent)]' : 'bg-primary/10 text-primary',
        )}>
          <KindIcon className="w-7 h-7" />
        </div>
      )}
      <div className="p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border border-border',
            isService ? 'text-[color:var(--festive-accent)]' : 'text-primary',
          )}>
            <KindIcon className="w-3 h-3" />
            {kindLabel}
          </span>
          {marker.categoryLabel && marker.categoryLabel !== kindLabel ? (
            <span className="text-[10px] font-medium text-muted">{marker.categoryLabel}</span>
          ) : null}
          {distance ? (
            <span className="text-[10px] font-semibold text-primary">{distance}</span>
          ) : null}
          {pinned ? (
            <span className="text-[10px] text-muted">Reste affichée</span>
          ) : null}
        </div>
        <h3 className="font-semibold text-sm text-foreground leading-snug">{marker.title}</h3>
        {marker.orgName ? <p className="text-xs text-muted truncate">{marker.orgName}</p> : null}
        {(marker.location || marker.address) ? (
          <p className="text-xs text-muted inline-flex items-start gap-1">
            <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{[marker.address, marker.location].filter(Boolean).join(' · ')}</span>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
          {marker.capacity ? (
            <span className="inline-flex items-center gap-1">
              <Users className="w-3 h-3" /> {marker.capacity} places
            </span>
          ) : null}
          {marker.quotaLabel ? <span>{marker.quotaLabel}</span> : null}
          {isService && marker.coverageRadiusKm ? (
            <span>Intervient jusqu’à {marker.coverageRadiusKm} km</span>
          ) : null}
        </div>
        {marker.priceLabel ? (
          <p className="text-sm font-semibold text-foreground">
            {marker.priceLabel}
            {marker.priceUnitLabel ? <span className="block text-[11px] font-normal text-muted">{marker.priceUnitLabel}</span> : null}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" onClick={() => onDirections(marker)} leftIcon={<Navigation className="w-3.5 h-3.5" />}>
            Lancer la navigation
          </Button>
          <Link href={marker.href} className="inline-flex">
            <Button size="sm" variant="secondary">Voir la fiche</Button>
          </Link>
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
  navigateOnClick = false,
  variant = 'default',
  autoDirections = false,
  city,
  searchOriginLabel,
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
  autoDirections?: boolean;
  city?: string | null;
  searchOriginLabel?: string;
}) {
  const router = useRouter();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const radiusLayerRef = useRef<any>(null);
  const overviewBoundsRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const originMarkerRef = useRef<any>(null);
  const awaitingOriginRef = useRef(false);
  const routeDestRef = useRef<MarketplaceMapMarker | null>(null);
  const paintRouteRef = useRef<(origin: { lat: number; lng: number }, dest: MarketplaceMapMarker) => Promise<void>>(async () => {});
  const markersById = useRef<Map<string, any>>(new Map());
  const onPlaceSelectRef = useRef(onPlaceSelect);
  onPlaceSelectRef.current = onPlaceSelect;
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const navigateOnClickRef = useRef(navigateOnClick);
  navigateOnClickRef.current = navigateOnClick;
  const routerRef = useRef(router);
  routerRef.current = router;

  const cityMeta = findRdcCity(city);
  const cityKey = cityMeta?.name || '';

  const [query, setQuery] = useState('');
  const [osmResults, setOsmResults] = useState<GeoPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [hovered, setHovered] = useState<MarketplaceMapMarker | null>(null);
  const [pinned, setPinned] = useState(false);
  const [mapReady, setMapReady] = useState(0);
  const [mapTheme, setMapTheme] = useState<'light' | 'dark'>(documentMapTheme);
  const [route, setRoute] = useState<DrivingRoute | null>(null);
  const [routeTitle, setRouteTitle] = useState('');
  const [routeHint, setRouteHint] = useState('');
  const [routing, setRouting] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didAutoRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);
  const lastRecalcRef = useRef(0);
  const pinnedRef = useRef(false);
  const suppressMapClickRef = useRef(false);

  const clearHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const showPreview = (marker: MarketplaceMapMarker, pin = false) => {
    clearHideTimer();
    if (pin) {
      pinnedRef.current = true;
      setPinned(true);
    }
    setHovered(marker);
  };

  const hidePreview = (force = false) => {
    if (!force && pinnedRef.current) return;
    if (!force && markersRef.current.length === 1 && !navigateOnClickRef.current) return;
    clearHideTimer();
    pinnedRef.current = false;
    setPinned(false);
    setHovered(null);
  };

  const showPreviewRef = useRef(showPreview);
  showPreviewRef.current = showPreview;
  const hidePreviewRef = useRef(hidePreview);
  hidePreviewRef.current = hidePreview;

  const markersKey = markers.map((m) => `${m.id}:${m.lat}:${m.lng}:${m.kind || ''}:${m.coverageRadiusKm || ''}`).join('|');
  const centerKey = searchCenter ? `${searchCenter.lat}:${searchCenter.lng}:${radiusKm}` : '';

  useEffect(() => {
    pinnedRef.current = false;
    setPinned(false);
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
        applyBasemap(L, map, documentMapTheme());

        if (!map.getPane('coverage')) {
          map.createPane('coverage');
          map.getPane('coverage').style.zIndex = '350';
          map.getPane('coverage').style.pointerEvents = 'none';
        }

        const points = markersRef.current.filter((m) =>
          Number.isFinite(m.lat)
          && Number.isFinite(m.lng)
          && (cityMeta ? pointInBounds(m.lat, m.lng, cityMeta.bounds) : pointInAllowedRdcCities(m.lat, m.lng)),
        );
        const layers: any[] = points.map((m) => {
          const isService = m.kind === 'service';
          const leafletMarker = L.marker([m.lat, m.lng], {
            icon: L.divIcon({
              className: `leaflet-interactive em-map-marker ${isService ? 'em-map-marker-service' : 'em-map-marker-venue'}`,
              html: listingIconHtml(m.kind),
              iconSize: [40, 48],
              iconAnchor: [20, 46],
            }),
            interactive: true,
            bubblingMouseEvents: false,
            keyboard: true,
            zIndexOffset: isService ? 20 : 10,
            riseOnHover: true,
          });

          leafletMarker.on('mouseover', () => {
            leafletMarker.getElement()?.classList.add('is-hovered');
            showPreviewRef.current(m, false);
          });
          leafletMarker.on('mouseout', () => {
            leafletMarker.getElement()?.classList.remove('is-hovered');
          });
          leafletMarker.on('click', () => {
            suppressMapClickRef.current = true;
            showPreviewRef.current(m, true);
            if (navigateOnClickRef.current) {
              routerRef.current.push(m.href);
            }
          });

          markersById.current.set(m.id, leafletMarker);
          return leafletMarker;
        });

        if (searchCenter && Number.isFinite(searchCenter.lat) && Number.isFinite(searchCenter.lng)) {
          layers.push(
            L.marker([searchCenter.lat, searchCenter.lng], {
              icon: L.divIcon({
                className: 'em-map-marker em-map-marker-here',
                html: hereIconHtml(),
                iconSize: [28, 28],
                iconAnchor: [14, 14],
              }),
              zIndexOffset: 80,
              interactive: false,
            }),
          );
          if (radiusKm > 0) {
            layers.push(
              L.circle([searchCenter.lat, searchCenter.lng], {
                pane: 'coverage',
                radius: radiusKm * 1000,
                color: cssVar('--primary', '#4f46e5'),
                weight: 2,
                dashArray: '6 5',
                fillColor: cssVar('--primary', '#4f46e5'),
                fillOpacity: 0.08,
                interactive: false,
              }),
            );
          }
        }

        if (cityMeta) {
          map.setMaxBounds(leafletMaxBounds(cityMeta.bounds));
        } else if (points.length > 0) {
          const inferred = cityForPoint(points[0].lat, points[0].lng);
          const sameCity = inferred && points.every((p) => pointInBounds(p.lat, p.lng, inferred.bounds));
          if (sameCity) map.setMaxBounds(leafletMaxBounds(inferred.bounds));
        }

        if (layers.length === 0) {
          if (searchCenter && radiusKm > 0) {
            const circleBounds = L.latLng(searchCenter.lat, searchCenter.lng).toBounds(radiusKm * 1000);
            overviewBoundsRef.current = circleBounds.pad(0.08);
            map.fitBounds(overviewBoundsRef.current, { maxZoom: 14 });
          } else if (cityMeta) {
            map.fitBounds(leafletMaxBounds(cityMeta.bounds), { maxZoom: 12, padding: [24, 24] });
            overviewBoundsRef.current = L.latLngBounds(leafletMaxBounds(cityMeta.bounds));
          } else {
            map.setView([KINSHASA.lat, KINSHASA.lng], 11);
            overviewBoundsRef.current = null;
          }
        } else {
          const group = L.featureGroup(layers).addTo(map);
          if (searchCenter && radiusKm > 0) {
            const circleBounds = L.latLng(searchCenter.lat, searchCenter.lng).toBounds(radiusKm * 1000);
            overviewBoundsRef.current = circleBounds.pad(0.08);
            map.fitBounds(overviewBoundsRef.current, { maxZoom: 14 });
          } else {
            const mixedCities = !cityMeta && points.length > 1 && (() => {
              const first = cityForPoint(points[0].lat, points[0].lng);
              return Boolean(first && points.some((p) => !pointInBounds(p.lat, p.lng, first.bounds)));
            })();
            if (mixedCities) {
              map.setView([KINSHASA.lat, KINSHASA.lng], 11);
              overviewBoundsRef.current = L.latLngBounds(leafletMaxBounds(findRdcCity('Kinshasa')!.bounds));
            } else {
              const bounds = group.getBounds().pad(0.28);
              overviewBoundsRef.current = bounds;
              map.fitBounds(bounds, { maxZoom: 14 });
            }
          }
        }

        map.on('click', (event: { latlng: { lat: number; lng: number } }) => {
          const point = { lat: event.latlng.lat, lng: event.latlng.lng };
          if (awaitingOriginRef.current && routeDestRef.current) {
            awaitingOriginRef.current = false;
            void paintRouteRef.current(point, routeDestRef.current);
            return;
          }
          if (suppressMapClickRef.current) {
            suppressMapClickRef.current = false;
            return;
          }
          hidePreviewRef.current(true);
          if (searchable && !listingSearch) {
            const allowed = cityMeta
              ? pointInBounds(point.lat, point.lng, cityMeta.bounds)
              : pointInAllowedRdcCities(point.lat, point.lng);
            if (!allowed) return;
            void reverseGeocode(point.lat, point.lng).then((label) => {
              onPlaceSelectRef.current?.({
                lat: point.lat,
                lng: point.lng,
                label: label || 'Point sur la carte',
              });
            });
          }
        });

        mapRef.current = map;
        setMapReady((n) => n + 1);
        setTimeout(() => map.invalidateSize(), 80);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      tileLayerRef.current = null;
      radiusLayerRef.current = null;
    };
  }, [markersKey, centerKey, searchable, listingSearch, searchCenter, radiusKm, cityKey]);

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
  }, [mapReady]);

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
      const el = layer.getElement?.() as HTMLElement | undefined;
      if (!el) return;
      el.classList.toggle('is-dimmed', Boolean(focus && id !== focus.id));
      el.classList.toggle('is-hovered', Boolean(focus && id === focus.id));
    });

    if (!focus) return;

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
        interactive: false,
      }).addTo(map);
      radiusLayerRef.current = circle;
    }
  }, [hovered, mapReady]);

  useEffect(() => {
    const timer = window.setTimeout(() => mapRef.current?.invalidateSize(), 80);
    return () => window.clearTimeout(timer);
  }, [variant, mapReady]);

  const clearRoute = () => {
    const map = mapRef.current;
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (map && routeLineRef.current) map.removeLayer(routeLineRef.current);
    if (map && originMarkerRef.current) map.removeLayer(originMarkerRef.current);
    routeLineRef.current = null;
    originMarkerRef.current = null;
    awaitingOriginRef.current = false;
    routeDestRef.current = null;
    lastRecalcRef.current = 0;
    setRoute(null);
    setRouteTitle('');
    setRouteHint('');
    setRouting(false);
  };

  const paintRoute = async (origin: { lat: number; lng: number }, dest: MarketplaceMapMarker) => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;
    setRouting(true);
    setRouteHint('');
    try {
      const next = await fetchDrivingRoute(origin, { lat: dest.lat, lng: dest.lng });
      if (routeLineRef.current) map.removeLayer(routeLineRef.current);
      if (originMarkerRef.current) map.removeLayer(originMarkerRef.current);
      const color = cssVar('--primary', '#4f46e5');
      originMarkerRef.current = L.circleMarker([origin.lat, origin.lng], {
        radius: 8,
        color,
        weight: 2,
        fillColor: '#fff',
        fillOpacity: 1,
      }).bindPopup('Votre départ').addTo(map);
      routeLineRef.current = L.polyline(
        next.coords.map((p) => [p.lat, p.lng]),
        { color, weight: 5, opacity: 0.9 },
      ).addTo(map);
      map.fitBounds(routeLineRef.current.getBounds(), { padding: [36, 36], maxZoom: 15 });
      setRoute(next);
      setRouteTitle(dest.title);
      lastRecalcRef.current = Date.now();
      setRouteHint('Navigation EventMaster active. Votre position est suivie sur la carte.');
      if (watchIdRef.current == null && navigator.geolocation) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            if (originMarkerRef.current) {
              originMarkerRef.current.setLatLng([origin.lat, origin.lng]);
            }
            const destNow = routeDestRef.current;
            if (!destNow) return;
            const now = Date.now();
            if (now - lastRecalcRef.current < 14000) return;
            lastRecalcRef.current = now;
            void paintRouteRef.current(origin, destNow);
          },
          () => undefined,
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 4000 },
        );
      }
    } catch {
      setRouteHint('Itinéraire introuvable pour cet aller. Cliquez un autre point de départ sur la carte.');
      awaitingOriginRef.current = true;
    } finally {
      setRouting(false);
    }
  };
  paintRouteRef.current = paintRoute;

  const startDirections = (dest: MarketplaceMapMarker) => {
    setHovered(null);
    routeDestRef.current = dest;
    setRoute(null);
    setRouteTitle(dest.title);
    setRouting(true);
    setRouteHint('Calcul de l’itinéraire depuis votre position…');
    if (!navigator.geolocation) {
      awaitingOriginRef.current = true;
      setRouting(false);
      setRouteHint('Cliquez sur la carte pour indiquer votre point de départ.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void paintRoute({ lat: pos.coords.latitude, lng: pos.coords.longitude }, dest);
      },
      () => {
        awaitingOriginRef.current = true;
        setRouting(false);
        setRouteHint('Localisation refusée. Cliquez sur la carte pour indiquer votre départ — vous restez sur EventMaster.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  useEffect(() => {
    if (!navigateOnClick && markersRef.current.length === 1) {
      showPreview(markersRef.current[0], true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markersKey, navigateOnClick]);

  useEffect(() => {
    if (!autoDirections || mapReady === 0 || didAutoRef.current) return;
    const dest = markersRef.current[0];
    if (!dest) return;
    didAutoRef.current = true;
    startDirections(dest);
    // startDirections is recreated each render; auto-run once after the map is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDirections, mapReady]);

  const runOsmSearch = async (text: string) => {
    const q = text.trim();
    if (q.length < 2) {
      setOsmResults([]);
      return;
    }
    setSearching(true);
    try {
      const places = await searchPlaces(
        `${q}${cityMeta ? `, ${cityMeta.name}, RD Congo` : ', RD Congo'}`,
        8,
        cityMeta ? { viewbox: nominatimViewbox(cityMeta.bounds), bounded: true } : undefined,
      );
      setOsmResults(
        places.filter((place) =>
          cityMeta
            ? pointInBounds(place.lat, place.lng, cityMeta.bounds)
            : pointInAllowedRdcCities(place.lat, place.lng),
        ),
      );
    } finally {
      setSearching(false);
    }
  };

  const applyPlace = (place: GeoPlace) => {
    if (cityMeta ? !pointInBounds(place.lat, place.lng, cityMeta.bounds) : !pointInAllowedRdcCities(place.lat, place.lng)) {
      return;
    }
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
                  className="w-full text-left px-3 py-2 text-xs hover:bg-surface-muted flex items-start gap-2"
                  onClick={() => focusListing(place.id)}
                >
                  <span className={cn(
                    'mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md shrink-0',
                    place.kind === 'service' ? 'bg-[color:var(--festive-accent)]/15 text-[color:var(--festive-accent)]' : 'bg-primary/10 text-primary',
                  )}>
                    {place.kind === 'service' ? <Sparkles className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="font-semibold text-foreground">{place.title}</span>
                    <span className="block text-muted">
                      {place.kind === 'service' ? 'Prestataire' : 'Salle'}
                      {place.categoryLabel ? ` · ${place.categoryLabel}` : ''}
                      {formatDistanceKm(place.distanceKm) ? ` · ${formatDistanceKm(place.distanceKm)}` : ''}
                      {place.coverageRadiusKm ? ` · rayon ${place.coverageRadiusKm} km` : ''}
                    </span>
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
      <div className="relative">
        {searchOverlay && searchField && (
          <div className="absolute z-20 top-3 left-3 right-3 sm:right-auto sm:w-80">
            {searchField}
          </div>
        )}
        <div className="absolute z-20 top-3 right-3 pointer-events-none">
          <div className="rounded-xl border border-border bg-surface/95 shadow-[var(--shadow-soft)] px-2.5 py-2 space-y-1.5 text-[11px] text-foreground">
            <p className="inline-flex items-center gap-1.5">
              <span className="em-map-legend-venue" aria-hidden />
              Salle
            </p>
            <p className="inline-flex items-center gap-1.5">
              <span className="em-map-legend-service" aria-hidden />
              Prestataire
            </p>
            {searchCenter ? (
              <p className="inline-flex items-center gap-1.5">
                <span className="em-map-legend-here" aria-hidden />
                {searchOriginLabel || 'Point de recherche'}
                {radiusKm > 0 ? ` · ${radiusKm} km` : ''}
              </p>
            ) : null}
          </div>
        </div>
        <div
          ref={hostRef}
          className={cn(
            'em-marketplace-map w-full rounded-[var(--radius-card)] border border-border overflow-hidden bg-background',
            mapTheme === 'dark' && 'em-map-dark',
          )}
          style={{ height: mapHeight, minHeight: variant === 'focus' ? 420 : undefined }}
        />
        {hovered && !route && !routing && (
          <MarkerPreviewCard
            marker={hovered}
            pinned={pinned}
            searchCenter={searchCenter}
            onKeep={() => showPreview(hovered, pinned)}
            onHide={() => undefined}
            onClose={() => hidePreview(true)}
            onDirections={startDirections}
          />
        )}
        {(route || routeHint || routing) && (
          <div className="absolute z-30 left-3 right-3 top-3 sm:left-auto sm:w-80 rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-soft)] p-3 space-y-2 max-h-[55%] overflow-auto">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Itinéraire</p>
                <p className="text-sm font-semibold text-foreground leading-snug">{routeTitle}</p>
                {route ? (
                  <p className="text-xs text-muted">
                    {formatRouteDistance(route.distance)} · {formatRouteDuration(route.duration)}
                  </p>
                ) : null}
              </div>
              <button type="button" onClick={clearRoute} className="p-1 rounded-md text-muted hover:text-foreground" aria-label="Fermer l’itinéraire">
                <X className="w-4 h-4" />
              </button>
            </div>
            {routing && (
              <p className="text-xs text-muted inline-flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Calcul du trajet…
              </p>
            )}
            {routeHint ? <p className="text-xs text-muted">{routeHint}</p> : null}
            {route?.steps.length ? (
              <ol className="space-y-1.5 text-xs text-foreground">
                {route.steps.slice(0, 12).map((step, i) => (
                  <li key={`${step.instruction}-${i}`} className="leading-snug">
                    <span className="text-muted">{i + 1}.</span> {step.instruction}
                    {step.distance ? <span className="text-muted"> · {formatRouteDistance(step.distance)}</span> : null}
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        )}
      </div>
      {listingSearch && variant !== 'focus' && (
        <p className="text-[11px] text-muted">
          Survolez ou cliquez un pin : les détails restent affichés. Fermez avec × ou en cliquant ailleurs sur la carte.
          {searchCenter && radiusKm > 0 ? ` Filtre : dans un rayon de ${radiusKm} km.` : ''}
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
