'use client';

import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Building2, Calendar, KeyRound, Loader2, MapPin, Navigation, Search, Sparkles, Users, Volume2, VolumeX, X } from 'lucide-react';
import { loadLeaflet, leafletBasemap, documentMapTheme, reverseGeocode, searchPlaces, type GeoPlace } from '@/lib/leafletLoader';
import {
  fetchDrivingRoute,
  formatRouteDistance,
  formatRouteDuration,
  type DrivingRoute,
} from '@/lib/osrm';
import { findRdcCity, cityForPoint, leafletMaxBounds, nominatimViewbox, pointInAllowedRdcCities, pointInBounds } from '@/lib/rdcCities';
import { formatDistanceKm, haversineKm, isVideoUrl, catalogueKindFilterLabel, catalogueKindHint, catalogueKindLabel } from '@/lib/marketplace';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  isRouteVoiceSupported,
  readRouteVoiceEnabled,
  routeIntroScript,
  speakRouteGuide,
  stopRouteVoice,
  writeRouteVoiceEnabled,
} from '@/lib/routeVoice';

export type MarketplaceMapKind = 'venue' | 'service' | 'rental' | 'event';

export interface MarketplaceMapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  href: string;
  subtitle?: string;
  kind?: MarketplaceMapKind;
  coverUrl?: string | null;
  photos?: string[];
  priceLabel?: string;
  priceUnitLabel?: string;
  categoryLabel?: string;
  orgName?: string;
  location?: string;
  address?: string;
  coverageRadiusKm?: number | null;
  travels?: boolean;
  capacity?: number | null;
  quotaLabel?: string | null;
  distanceKm?: number | null;
  roomTypeLabel?: string | null;
}

const KINSHASA = { lat: -4.325, lng: 15.322 };

const VENUE_ICON_SVG = '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M6 12H4a2 2 0 0 0-2 2v8h20v-8a2 2 0 0 0-2-2h-2"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/></svg>';
const SERVICE_ICON_SVG = '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>';
const RENTAL_ICON_SVG = '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3"/></svg>';
const EVENT_ICON_SVG = '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>';
const HERE_ICON_SVG = '<svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>';

function escapeAttr(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function markerPhotoUrl(marker: { coverUrl?: string | null; photos?: string[] }) {
  const list = [
    marker.coverUrl,
    ...(marker.photos || []),
  ].filter((url): url is string => typeof url === 'string' && url.length > 0 && !isVideoUrl(url));
  return list[0] || null;
}

function markerImageUrls(marker: { coverUrl?: string | null; photos?: string[] }) {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const url of [marker.coverUrl, ...(marker.photos || [])]) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    list.push(url);
  }
  return list;
}

const PIN_ARROW_SVG = '<svg class="em-map-marker-arrow" viewBox="0 0 8 5" width="8" height="5" aria-hidden="true"><path d="M4 5 0 0h8z" fill="currentColor"/></svg>';

function listingIconHtml(kind?: MarketplaceMapKind, coverUrl?: string | null, title?: string, delayMs = 0) {
  const pinClass = kind === 'service' ? 'is-service' : kind === 'rental' ? 'is-rental' : kind === 'event' ? 'is-event' : 'is-venue';
  const icon = kind === 'service' ? SERVICE_ICON_SVG : kind === 'rental' ? RENTAL_ICON_SVG : kind === 'event' ? EVENT_ICON_SVG : VENUE_ICON_SVG;
  const caption = title
    ? `<span class="em-map-marker-caption">${escapeAttr(title)}</span>`
    : '';
  const pulse = '<span class="em-map-marker-pulse" aria-hidden="true"></span>';
  const delayStyle = `style="--pin-delay:${Math.max(0, delayMs)}ms"`;
  const photo = coverUrl
    ? `<img class="em-map-marker-card-photo" src="${escapeAttr(coverUrl)}" alt="" />`
    : '';
  return `<span class="em-map-marker-hit" ${delayStyle}>${pulse}${caption}<span class="em-map-marker-card ${pinClass}${coverUrl ? ' has-photo' : ''}"><span class="em-map-marker-card-face">${photo}<span class="em-map-marker-card-icon">${icon}</span></span><span class="em-map-marker-card-arrow">${PIN_ARROW_SVG}</span></span></span>`;
}

function hereIconHtml() {
  return `<span class="em-map-marker-inner"><span class="em-map-marker-head">${HERE_ICON_SVG}</span></span>`;
}

function cssVar(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function markerColor(kind?: MarketplaceMapKind) {
  if (kind === 'service') return cssVar('--festive-accent', '#b45309');
  if (kind === 'rental') return '#0e7490';
  if (kind === 'event') return '#059669';
  return cssVar('--primary', '#4f46e5');
}

function markerKindClass(kind?: MarketplaceMapKind) {
  if (kind === 'service') return 'em-map-marker-service';
  if (kind === 'rental') return 'em-map-marker-rental';
  if (kind === 'event') return 'em-map-marker-event';
  return 'em-map-marker-venue';
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

function MarkerPhotoGallery({
  urls,
  fallbackIcon,
}: {
  urls: string[];
  fallbackIcon: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const current = urls[index];

  if (!current) {
    return <div className="h-16 flex items-center justify-center">{fallbackIcon}</div>;
  }

  return (
    <div className="relative h-40 bg-surface-muted">
      {isVideoUrl(current) ? (
        <video src={current} className="w-full h-full object-cover" muted playsInline preload="metadata" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current} alt="" className="w-full h-full object-cover" />
      )}
      {urls.length > 1 ? (
        <>
          <button
            type="button"
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/55 text-white inline-flex items-center justify-center"
            onClick={() => setIndex((i) => (i - 1 + urls.length) % urls.length)}
            aria-label="Image précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/55 text-white inline-flex items-center justify-center"
            onClick={() => setIndex((i) => (i + 1) % urls.length)}
            aria-label="Image suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {urls.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => setIndex(i)}
                className={cn('h-1.5 rounded-full transition', i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/50')}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

const MAP_KIND_ORDER: MarketplaceMapKind[] = ['venue', 'service', 'rental', 'event'];

function groupMapMarkersByKind<T extends { kind?: MarketplaceMapKind | string | null }>(items: T[]) {
  return MAP_KIND_ORDER
    .map((kind) => ({ kind, items: items.filter((item) => (item.kind || 'venue') === kind) }))
    .filter((group) => group.items.length > 0);
}

function markerKindIcon(kind?: MarketplaceMapKind) {
  if (kind === 'service') return Sparkles;
  if (kind === 'rental') return KeyRound;
  if (kind === 'event') return Calendar;
  return Building2;
}

function MarkerPreviewCard({
  marker,
  pinned,
  navigatingHere,
  navigationActive,
  onKeep,
  onHide,
  onClose,
  onDirections,
  onCancelNavigation,
  searchCenter,
}: {
  marker: MarketplaceMapMarker;
  pinned?: boolean;
  navigatingHere?: boolean;
  navigationActive?: boolean;
  onKeep: () => void;
  onHide: () => void;
  onClose: () => void;
  onDirections: (marker: MarketplaceMapMarker) => void;
  onCancelNavigation?: () => void;
  searchCenter?: { lat: number; lng: number } | null;
}) {
  const kind = marker.kind || 'venue';
  const isService = kind === 'service';
  const isRental = kind === 'rental';
  const isEvent = kind === 'event';
  const KindIcon = markerKindIcon(kind);
  const kindLabel = catalogueKindLabel(kind);
  const distance = formatDistanceKm(
    marker.distanceKm
    ?? (searchCenter ? haversineKm(searchCenter.lat, searchCenter.lng, marker.lat, marker.lng) : null),
  );

  return (
    <div
      className="absolute z-[500] left-3 right-3 bottom-3 sm:left-auto sm:right-3 sm:w-[22rem] rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-soft)] overflow-hidden max-h-[46%] overflow-y-auto pointer-events-auto"
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
      <MarkerPhotoGallery
        key={marker.id}
        urls={markerImageUrls(marker)}
        fallbackIcon={
          <div className={cn(
            'h-16 w-full flex items-center justify-center',
            isEvent
              ? 'bg-emerald-50 text-emerald-700'
              : isRental
                ? 'bg-cyan-50 text-cyan-800'
              : isService
                ? 'bg-[color:var(--festive-accent)]/12 text-[color:var(--festive-accent)]'
                : 'bg-primary/10 text-primary',
          )}>
            <KindIcon className="w-7 h-7" />
          </div>
        }
      />
      <div className="p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border',
            isEvent
              ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
              : isRental
                ? 'text-cyan-800 border-cyan-200 bg-cyan-50'
              : isService
                ? 'text-[color:var(--festive-accent)] border-[color:var(--festive-accent)]/30 bg-[color:var(--festive-accent)]/10'
                : 'text-primary border-primary/25 bg-primary/10',
          )}>
            <KindIcon className="w-3 h-3" />
            {kindLabel}
          </span>
          {catalogueKindHint(kind) ? (
            <span className="text-[10px] font-medium text-muted">{catalogueKindHint(kind)}</span>
          ) : null}
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
          {isService && marker.travels && marker.coverageRadiusKm ? (
            <span>Se déplace jusqu’à {marker.coverageRadiusKm} km</span>
          ) : null}
          {isService && marker.travels === false ? (
            <span>Intervient sur place</span>
          ) : null}
          {isRental ? (
            <span>{marker.travels ? 'Livraison possible' : 'Bien à récupérer'}</span>
          ) : null}
        </div>
        {marker.priceLabel ? (
          <p className="text-sm font-semibold text-foreground">
            {marker.priceLabel}
            {marker.priceUnitLabel ? <span className="block text-[11px] font-normal text-muted">{marker.priceUnitLabel}</span> : null}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-1">
          {navigatingHere ? (
            <Button size="sm" variant="secondary" onClick={onCancelNavigation}>
              Annuler la navigation
            </Button>
          ) : (
            <Button size="sm" onClick={() => onDirections(marker)} leftIcon={<Navigation className="w-3.5 h-3.5" />}>
              {navigationActive ? 'Itinéraire vers ici' : 'Lancer la navigation'}
            </Button>
          )}
          <Link href={marker.href} className="inline-flex">
            <Button size="sm" variant="secondary">Voir la fiche</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export type MarketplaceMapHandle = {
  startDirectionsFor: (id: string) => void;
  clearRoute: () => void;
  recenter: () => void;
};

const MarketplaceLocationsMap = React.forwardRef<MarketplaceMapHandle, {
  markers: MarketplaceMapMarker[];
  height?: number | string;
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
  immersive?: boolean;
  selectedId?: string | null;
  onMarkerSelect?: (marker: MarketplaceMapMarker) => void;
  className?: string;
}>(function MarketplaceLocationsMap({
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
  immersive = false,
  selectedId = null,
  onMarkerSelect,
  className,
}, ref) {
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
  const onMarkerSelectRef = useRef(onMarkerSelect);
  onMarkerSelectRef.current = onMarkerSelect;
  const immersiveRef = useRef(immersive);
  immersiveRef.current = immersive;

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
  const navGenRef = useRef(0);
  const [navDestId, setNavDestId] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const voiceOnRef = useRef(true);
  const lastSpokenRef = useRef('');
  const [hiddenKinds, setHiddenKinds] = useState<Set<MarketplaceMapKind>>(new Set());

  useEffect(() => {
    const enabled = readRouteVoiceEnabled();
    setVoiceOn(enabled);
    voiceOnRef.current = enabled;
    return () => stopRouteVoice();
  }, []);

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

  const markersKey = markers.map((m) => `${m.id}:${m.lat}:${m.lng}:${m.kind || ''}:${m.coverageRadiusKm || ''}:${m.travels ? '1' : '0'}:${m.coverUrl || ''}`).join('|');
  const centerKey = searchCenter ? `${searchCenter.lat}:${searchCenter.lng}:${radiusKm}` : '';

  useEffect(() => {
    pinnedRef.current = false;
    setPinned(false);
    setHovered(null);
    setHiddenKinds(new Set());
  }, [markersKey]);

  const listingMatches = listingSearch
    ? markers.filter((m) => {
        if (hiddenKinds.has(m.kind || 'venue')) return false;
        const q = query.trim().toLowerCase();
        if (q.length < 1) return false;
        return [m.title, m.subtitle, m.orgName, m.location, catalogueKindLabel(m.kind)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
      }).slice(0, 12)
    : [];
  const listingMatchGroups = groupMapMarkersByKind(listingMatches);
  const presentKinds = useMemo(
    () => MAP_KIND_ORDER.filter((kind) => markers.some((marker) => (marker.kind || 'venue') === kind)),
    [markers],
  );

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
        const layers: any[] = points.map((m, index) => {
          const photoUrl = markerPhotoUrl(m);
          const leafletMarker = L.marker([m.lat, m.lng], {
            icon: L.divIcon({
              className: `leaflet-interactive em-map-marker ${markerKindClass(m.kind)}`,
              html: listingIconHtml(m.kind, photoUrl, m.title, Math.min(index, 20) * 45),
              iconSize: [32, 46],
              iconAnchor: [16, 44],
            }),
            interactive: true,
            bubblingMouseEvents: false,
            keyboard: true,
            zIndexOffset: m.kind === 'event' ? 40 : m.kind === 'rental' ? 30 : m.kind === 'service' ? 20 : 10,
            riseOnHover: true,
          });

          leafletMarker.on('mouseover', () => {
            leafletMarker.getElement()?.classList.add('is-hovered');
            if (!immersiveRef.current) showPreviewRef.current(m, false);
          });
          leafletMarker.on('mouseout', () => {
            leafletMarker.getElement()?.classList.remove('is-hovered');
          });
          leafletMarker.on('click', (event: { originalEvent?: Event }) => {
            if (event.originalEvent) {
              L.DomEvent.stopPropagation(event.originalEvent);
              L.DomEvent.preventDefault(event.originalEvent);
            }
            suppressMapClickRef.current = true;
            onMarkerSelectRef.current?.(m);
            if (!immersiveRef.current) showPreviewRef.current(m, true);
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
                iconSize: [20, 20],
                iconAnchor: [10, 10],
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
                interactive: false
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

    const selected = selectedId ? markersRef.current.find((m) => m.id === selectedId) : null;
    const preview = selected || hovered;
    const zoneTarget = selected || (pinned ? hovered : null);

    markersById.current.forEach((layer, id) => {
      const el = layer.getElement?.() as HTMLElement | undefined;
      if (!el) return;
      el.classList.toggle('is-dimmed', Boolean(preview && id !== preview.id));
      el.classList.toggle('is-hovered', Boolean(preview && id === preview.id));
    });

    if (!zoneTarget) return;

    const radius = zoneTarget.kind === 'service' && zoneTarget.coverageRadiusKm && zoneTarget.coverageRadiusKm > 0
      ? zoneTarget.coverageRadiusKm
      : 0;

    if (radius > 0) {
      const color = markerColor('service');
      const circle = L.circle([zoneTarget.lat, zoneTarget.lng], {
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
  }, [hovered, pinned, mapReady, selectedId]);

  useEffect(() => {
    markersById.current.forEach((layer, id) => {
      const data = markersRef.current.find((item) => item.id === id);
      const kind = data?.kind || 'venue';
      const el = layer.getElement?.() as HTMLElement | undefined;
      if (!el) return;
      el.style.display = hiddenKinds.has(kind) ? 'none' : '';
    });
    if (hovered && hiddenKinds.has(hovered.kind || 'venue')) {
      hidePreview(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenKinds, mapReady, markersKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => mapRef.current?.invalidateSize(), 80);
    const later = window.setTimeout(() => mapRef.current?.invalidateSize(), 320);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(later);
    };
  }, [variant, mapReady, immersive]);

  const clearRoute = () => {
    navGenRef.current += 1;
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
    setNavDestId(null);
    stopRouteVoice();
    lastSpokenRef.current = '';
    if (map && overviewBoundsRef.current) {
      map.fitBounds(overviewBoundsRef.current, { maxZoom: 14, animate: true });
    }
  };

  const paintRoute = async (origin: { lat: number; lng: number }, dest: MarketplaceMapMarker) => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;
    const gen = navGenRef.current;
    setRouting(true);
    setRouteHint('');
    try {
      const next = await fetchDrivingRoute(origin, { lat: dest.lat, lng: dest.lng });
      if (gen !== navGenRef.current) return;
      if (routeLineRef.current) map.removeLayer(routeLineRef.current);
      if (originMarkerRef.current) map.removeLayer(originMarkerRef.current);
      const color = cssVar('--primary', '#4f46e5');
      originMarkerRef.current = L.circleMarker([origin.lat, origin.lng], {
        radius: 6,
        color,
        weight: 2,
        fillColor: '#fff',
        fillOpacity: 1,
        interactive: false,
      }).bindPopup('Votre départ').addTo(map);
      routeLineRef.current = L.polyline(
        next.coords.map((p) => [p.lat, p.lng]),
        { color, weight: 5, opacity: 0.9, interactive: false },
      ).addTo(map);
      map.fitBounds(routeLineRef.current.getBounds(), { padding: [36, 36], maxZoom: 15 });
      const initial = lastRecalcRef.current === 0;
      setRoute(next);
      setRouteTitle(dest.title);
      setNavDestId(dest.id);
      lastRecalcRef.current = Date.now();
      setRouteHint('Navigation active. Survolez les autres pins pour comparer. Annulez à tout moment.');
      if (voiceOnRef.current) {
        if (initial) {
          lastSpokenRef.current = next.steps[0]?.instruction || '';
          void speakRouteGuide(routeIntroScript(
            dest.title,
            formatRouteDuration(next.duration),
            formatRouteDistance(next.distance),
            next.steps.map((step) => step.instruction),
          ));
        } else {
          const step = next.steps[0]?.instruction || '';
          if (step && step !== lastSpokenRef.current) {
            lastSpokenRef.current = step;
            void speakRouteGuide(step);
          }
        }
      }
      if (watchIdRef.current == null && navigator.geolocation) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            if (gen !== navGenRef.current) return;
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
      if (gen !== navGenRef.current) return;
      setRouteHint('Itinéraire introuvable. Cliquez un autre point de départ, ou annulez.');
      awaitingOriginRef.current = true;
    } finally {
      if (gen === navGenRef.current) setRouting(false);
    }
  };
  paintRouteRef.current = paintRoute;

  const startDirections = (dest: MarketplaceMapMarker) => {
    navGenRef.current += 1;
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    lastSpokenRef.current = '';
    lastRecalcRef.current = 0;
    routeDestRef.current = dest;
    setNavDestId(dest.id);
    setRoute(null);
    setRouteTitle(dest.title);
    setRouting(true);
    setRouteHint('Calcul de l’itinéraire depuis votre position…');
    if (!navigator.geolocation) {
      awaitingOriginRef.current = true;
      setRouting(false);
      setRouteHint('Cliquez sur la carte pour indiquer votre point de départ, ou annulez.');
      return;
    }
    const gen = navGenRef.current;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (gen !== navGenRef.current) return;
        void paintRoute({ lat: pos.coords.latitude, lng: pos.coords.longitude }, dest);
      },
      () => {
        if (gen !== navGenRef.current) return;
        awaitingOriginRef.current = true;
        setRouting(false);
        setRouteHint('Localisation refusée. Cliquez la carte pour le départ, ou annulez.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  useEffect(() => {
    if (immersive) return;
    if (!navigateOnClick && markersRef.current.length === 1) {
      showPreview(markersRef.current[0], true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markersKey, navigateOnClick, immersive]);

  useEffect(() => {
    if (!autoDirections || mapReady === 0 || didAutoRef.current) return;
    const dest = markersRef.current[0];
    if (!dest) return;
    didAutoRef.current = true;
    startDirections(dest);
    // startDirections is recreated each render; auto-run once after the map is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDirections, mapReady]);

  useEffect(() => {
    if (!selectedId || !mapRef.current || mapReady === 0) return;
    const data = markersRef.current.find((m) => m.id === selectedId);
    if (!data) return;
    const zoom = Math.max(mapRef.current.getZoom?.() || 13, 14);
    mapRef.current.flyTo([data.lat, data.lng], zoom, { duration: 0.4 });
  }, [selectedId, mapReady]);

  const recenter = () => {
    const map = mapRef.current;
    if (!map) return;
    if (searchCenter) {
      map.flyTo([searchCenter.lat, searchCenter.lng], 14, { duration: 0.4 });
      return;
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => map.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { duration: 0.4 }),
        () => {
          if (overviewBoundsRef.current) map.fitBounds(overviewBoundsRef.current, { maxZoom: 14, animate: true });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 4000 },
      );
      return;
    }
    if (overviewBoundsRef.current) map.fitBounds(overviewBoundsRef.current, { maxZoom: 14, animate: true });
  };

  useImperativeHandle(ref, () => ({
    startDirectionsFor: (id: string) => {
      const dest = markersRef.current.find((m) => m.id === id);
      if (dest) startDirections(dest);
    },
    clearRoute,
    recenter,
  }));

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

  const showSearch = !immersive && (searchable || listingSearch);
  const fillViewport = immersive || variant === 'focus';
  const fillHeight = fillViewport || typeof height === 'string';
  const searchOverlay = fillViewport || listingSearch || searchable;
  const mapHeight = fillViewport ? '100%' : height;

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
            ? presentKinds.length <= 1
              ? `Rechercher ${catalogueKindFilterLabel(presentKinds[0] || 'all').toLowerCase()}…`
              : 'Rechercher salles, métiers, locations ou événements…'
            : 'Chercher un lieu sur la carte…'
        }
        className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-border bg-surface text-sm shadow-[var(--shadow-soft)]"
      />
      {searching && <Loader2 className="w-4 h-4 animate-spin text-muted absolute right-3 top-1/2 -translate-y-1/2" />}
      {listingSearch && query.trim() && (
        <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-xl border border-border bg-surface shadow-[var(--shadow-soft)]">
          {listingMatches.length === 0 ? (
            <li className="px-3 py-2.5 text-xs text-muted">
              Aucune fiche EventMaster ne correspond.
            </li>
          ) : (
            listingMatchGroups.map((group) => (
              <li key={group.kind} className="border-t border-border first:border-t-0">
                {listingMatchGroups.length > 1 ? (
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {catalogueKindFilterLabel(group.kind)}
                  </p>
                ) : null}
                <ul>
                  {group.items.map((place) => {
                    const KindIcon = markerKindIcon(place.kind);
                    return (
                      <li key={place.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-xs hover:bg-surface-muted flex items-start gap-2"
                          onClick={() => focusListing(place.id)}
                        >
                          <span className={cn(
                            'mt-0.5 inline-flex h-6 w-6 items-center justify-center shrink-0',
                            place.kind === 'service'
                              ? 'rounded-full bg-[color:var(--festive-accent)]/15 text-[color:var(--festive-accent)]'
                              : place.kind === 'rental'
                                ? 'rounded-[3px] rotate-45 bg-cyan-50 text-cyan-800'
                              : place.kind === 'event'
                                ? 'rounded-md bg-emerald-50 text-emerald-700'
                                : 'rounded-md bg-primary/10 text-primary',
                          )}>
                            <KindIcon className={cn('w-3.5 h-3.5', place.kind === 'rental' && '-rotate-45')} />
                          </span>
                          <span className="min-w-0">
                            <span className="font-semibold text-foreground">{place.title}</span>
                            <span className="block text-muted">
                              {catalogueKindLabel(place.kind)}
                              {place.kind === 'service' || place.kind === 'rental' ? ` · ${place.kind === 'rental' ? 'bien loué' : 'savoir-faire'}` : ''}
                              {place.categoryLabel ? ` · ${place.categoryLabel}` : ''}
                              {formatDistanceKm(place.distanceKm) ? ` · ${formatDistanceKm(place.distanceKm)}` : ''}
                              {place.kind === 'service' && place.coverageRadiusKm ? ` · se déplace ${place.coverageRadiusKm} km` : ''}
                              {place.kind === 'service' && place.travels === false ? ' · sur place' : ''}
                              {place.kind === 'rental' ? (place.travels ? ' · livraison' : ' · à récupérer') : ''}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
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
    <div className={cn(fillHeight ? 'h-full' : 'space-y-2', className)}>
      {showSearch && !searchOverlay && searchField}
      <div className={cn('relative isolate', fillHeight && 'h-full')}>
        {searchOverlay && searchField && (
          <div className="absolute z-[1100] top-3 left-3 right-3 sm:right-auto sm:w-80 pointer-events-auto">
            {searchField}
          </div>
        )}
        {!immersive ? (
          <div className={cn(
            'absolute z-[1100] pointer-events-none',
            fillViewport ? 'bottom-3 left-3' : 'top-3 right-3',
          )}>
            <div className="rounded-xl border border-border bg-surface/95 shadow-[var(--shadow-soft)] px-2.5 py-2 space-y-1 text-[11px] text-foreground pointer-events-auto max-w-[13.5rem]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Calques</p>
              {(presentKinds.length ? presentKinds : MAP_KIND_ORDER).map((kind) => {
                const hidden = hiddenKinds.has(kind);
                const hint = catalogueKindHint(kind);
                const showHint = presentKinds.includes('service') && presentKinds.includes('rental') && (kind === 'service' || kind === 'rental');
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => {
                      setHiddenKinds((current) => {
                        const next = new Set(current);
                        if (next.has(kind)) next.delete(kind);
                        else next.add(kind);
                        return next;
                      });
                    }}
                    className={cn(
                      'flex w-full items-start gap-1.5 rounded-md px-0.5 py-0.5 text-left hover:bg-surface-muted',
                      hidden && 'opacity-40 line-through',
                    )}
                    aria-pressed={!hidden}
                  >
                    <span
                      className={cn(
                        'mt-0.5',
                        kind === 'venue'
                          ? 'em-map-legend-venue'
                          : kind === 'service'
                            ? 'em-map-legend-service'
                            : kind === 'rental'
                              ? 'em-map-legend-rental'
                              : 'em-map-legend-event',
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block leading-tight">{catalogueKindFilterLabel(kind)}</span>
                      {showHint && hint ? (
                        <span className="block text-[9px] font-normal text-muted leading-snug no-underline">
                          {hint}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
              {searchCenter ? (
                <p className="inline-flex items-center gap-1.5 pt-0.5">
                  <span className="em-map-legend-here" aria-hidden />
                  {searchOriginLabel || 'Point de recherche'}
                  {radiusKm > 0 ? ` · ${radiusKm} km` : ''}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
        <div
          ref={hostRef}
          className={cn(
            'em-marketplace-map w-full overflow-hidden bg-background',
            fillHeight ? 'h-full rounded-none border-0' : 'rounded-[var(--radius-card)] border border-border',
            fillViewport && 'em-explore-map',
            mapTheme === 'dark' && 'em-map-dark',
          )}
          style={{ height: mapHeight }}
        />
        {!immersive && hovered ? (
          <MarkerPreviewCard
            marker={hovered}
            pinned={pinned}
            navigatingHere={navDestId === hovered.id}
            navigationActive={Boolean(navDestId || routing || route)}
            searchCenter={searchCenter}
            onKeep={() => showPreview(hovered, pinned)}
            onHide={() => undefined}
            onClose={() => hidePreview(true)}
            onDirections={startDirections}
            onCancelNavigation={clearRoute}
          />
        ) : null}
        {(route || routeHint || routing) && (
          <div className={cn(
            'absolute z-[1100] left-3 right-3 sm:right-auto sm:w-80 rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-soft)] p-3 space-y-2 max-h-[42%] overflow-auto',
            immersive || variant === 'focus' ? 'top-[6.75rem] sm:top-[11.5rem] max-h-[28%]' : 'top-3',
          )}>
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
              <div className="flex items-center gap-1">
                {isRouteVoiceSupported() ? (
                  <button
                    type="button"
                    onClick={() => {
                      const next = !voiceOn;
                      setVoiceOn(next);
                      voiceOnRef.current = next;
                      writeRouteVoiceEnabled(next);
                      if (!next) stopRouteVoice();
                    }}
                    className="p-1 rounded-md text-muted hover:text-foreground"
                    aria-label={voiceOn ? 'Couper la voix' : 'Activer la voix'}
                    title={voiceOn ? 'Couper la voix féminine' : 'Activer la voix féminine'}
                  >
                    {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                ) : null}
                <button type="button" onClick={clearRoute} className="p-1 rounded-md text-muted hover:text-foreground" aria-label="Annuler la navigation">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {routing && (
              <p className="text-xs text-muted inline-flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Calcul du trajet…
              </p>
            )}
            {routeHint ? <p className="text-xs text-muted">{routeHint}</p> : null}
            {route?.steps.length ? (
              <ol className="space-y-1.5 text-xs text-foreground">
                {route.steps.slice(0, 8).map((step, i) => (
                  <li key={`${step.instruction}-${i}`} className="leading-snug">
                    <span className="text-muted">{i + 1}.</span> {step.instruction}
                    {step.distance ? <span className="text-muted"> · {formatRouteDistance(step.distance)}</span> : null}
                  </li>
                ))}
              </ol>
            ) : null}
            <Button size="sm" variant="secondary" onClick={clearRoute}>
              Annuler la navigation
            </Button>
          </div>
        )}
      </div>
      {listingSearch && variant !== 'focus' && !immersive && (
        <p className="text-[11px] text-muted">
          Survolez les pins même pendant un itinéraire. Annulez la navigation depuis le panneau ou la fiche.
          {searchCenter && radiusKm > 0 ? ` Filtre : dans un rayon de ${radiusKm} km.` : ''}
          {markers.length ? ` · ${markers.length} fiche${markers.length > 1 ? 's' : ''} avec GPS` : ''}.
        </p>
      )}
      {searchable && !listingSearch && !immersive && (
        <p className="text-[11px] text-muted">
          Tapez un lieu ou cliquez sur la carte pour filtrer autour de ce point.
        </p>
      )}
    </div>
  );
});

MarketplaceLocationsMap.displayName = 'MarketplaceLocationsMap';

export default MarketplaceLocationsMap;
