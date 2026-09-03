'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Play, Square, Loader2, LocateFixed, AlertCircle } from 'lucide-react';
import { geocodeLocation, loadLeaflet } from '@/lib/leafletLoader';
import { DEFAULT_BRAND_PALETTE } from '@/lib/brandTheme';

interface GuestVenueGuideProps {
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  eventTitle?: string;
}

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
}

function resolveBrandPrimary(): string {
  if (typeof document === 'undefined') return DEFAULT_BRAND_PALETTE.primary;
  const fromCss = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
  return fromCss || DEFAULT_BRAND_PALETTE.primary;
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number) {
  const min = Math.round(seconds / 60);
  if (min < 1) return '< 1 min';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function translateManeuver(step: any): string {
  const type = step?.maneuver?.type as string | undefined;
  const modifier = step?.maneuver?.modifier as string | undefined;
  const name = (step?.name as string) || '';
  const road = name && name !== '-' ? ` sur ${name}` : '';

  const turn: Record<string, string> = {
    right: 'à droite',
    left: 'à gauche',
    'slight right': 'légèrement à droite',
    'slight left': 'légèrement à gauche',
    'sharp right': 'fortement à droite',
    'sharp left': 'fortement à gauche',
    straight: 'tout droit',
    uturn: 'demi-tour',
  };

  switch (type) {
    case 'depart':
      return 'Départ — suivez le parcours';
    case 'arrive':
      return 'Vous êtes arrivé au lieu de réception';
    case 'turn':
      return `Tournez ${turn[modifier || ''] || modifier || ''}${road}`.trim();
    case 'new name':
    case 'continue':
      return `Continuez${road}`;
    case 'merge':
      return `Fusionnez${road}`;
    case 'on ramp':
      return `Prenez la bretelle${road}`;
    case 'off ramp':
      return `Prenez la sortie${road}`;
    case 'fork':
      return `Au croisement, prenez ${turn[modifier || ''] || 'la voie indiquée'}${road}`;
    case 'roundabout':
    case 'rotary':
      return `Au rond-point, prenez la sortie${road}`;
    case 'end of road':
      return `En bout de route, ${turn[modifier || ''] || 'continuez'}${road}`;
    default:
      return name ? `Continuez sur ${name}` : 'Continuez tout droit';
  }
}

function googleMapsDirUrl(dest: { lat: number; lng: number }, origin?: { lat: number; lng: number } | null, query?: string) {
  const destination = `${dest.lat},${dest.lng}`;
  if (origin) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination}&travelmode=driving`;
  }
  if (query) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
}

function wazeUrl(dest: { lat: number; lng: number }) {
  return `https://www.waze.com/ul?ll=${dest.lat},${dest.lng}&navigate=yes`;
}

export default function GuestVenueGuide({
  location,
  latitude,
  longitude,
  eventTitle,
}: GuestVenueGuideProps) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);

  const [dest, setDest] = useState<{ lat: number; lng: number } | null>(
    Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { lat: Number(latitude), lng: Number(longitude) }
      : null,
  );
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [guiding, setGuiding] = useState(false);
  const [error, setError] = useState('');
  const [steps, setSteps] = useState<RouteStep[]>([]);
  const [summary, setSummary] = useState<{ distance: number; duration: number } | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);

  const destinationLabel = location || eventTitle || 'Lieu de réception';

  const setUserMarker = useCallback((L: any, pos: { lat: number; lng: number }) => {
    if (!mapRef.current) return;
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([pos.lat, pos.lng]);
      return;
    }
    const icon = L.divIcon({
      className: 'em-guide-user-marker',
      html: '<span class="em-guide-user-dot"></span>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    userMarkerRef.current = L.marker([pos.lat, pos.lng], { icon, zIndexOffset: 600 }).addTo(mapRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function resolveDest() {
      if (dest) return dest;
      if (!location.trim()) return null;
      try {
        const found = await geocodeLocation(location);
        if (!cancelled && found) setDest(found);
        return found;
      } catch {
        return null;
      }
    }

    async function init() {
      try {
        const L = await loadLeaflet();
        const resolved = await resolveDest();
        if (cancelled || !mapElRef.current) return;

        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        const center = resolved || { lat: -4.3224, lng: 15.307 };
        const map = L.map(mapElRef.current, { zoomControl: true, attributionControl: true }).setView(
          [center.lat, center.lng],
          resolved ? 15 : 12,
        );
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        if (resolved) {
          const destIcon = L.divIcon({
            className: 'em-guide-dest-marker',
            html: '<span class="em-guide-dest-pin"></span>',
            iconSize: [20, 20],
            iconAnchor: [10, 20],
          });
          destMarkerRef.current = L.marker([resolved.lat, resolved.lng], { icon: destIcon }).addTo(map);
          destMarkerRef.current.bindPopup(destinationLabel);
        }

        mapRef.current = map;
        setReady(true);
        requestAnimationFrame(() => map.invalidateSize());
        setTimeout(() => map.invalidateSize(), 200);
      } catch (err) {
        if (!cancelled) setError('Impossible de charger la carte.');
      }
    }

    init();

    return () => {
      cancelled = true;
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          /* ignore */
        }
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, latitude, longitude]);

  const stopGuide = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGuiding(false);
    setStarting(false);
  }, []);

  const startGuide = async () => {
    setError('');
    setStarting(true);

    let target = dest;
    if (!target && location.trim()) {
      try {
        target = await geocodeLocation(location);
        if (target) setDest(target);
      } catch {
        /* ignore */
      }
    }

    if (!navigator.geolocation) {
      setStarting(false);
      if (target) {
        window.open(googleMapsDirUrl(target, null, location), '_blank', 'noopener,noreferrer');
      }
      setError('La géolocalisation n’est pas disponible. Ouverture de l’itinéraire externe.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const origin = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserPos(origin);

        if (!target) {
          setStarting(false);
          window.open(
            `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${encodeURIComponent(location)}&travelmode=driving`,
            '_blank',
            'noopener,noreferrer',
          );
          setError('Coordonnées du lieu indisponibles. Itinéraire ouvert dans Google Maps.');
          return;
        }

        try {
          const L = await loadLeaflet();
          setUserMarker(L, origin);

          const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${target.lng},${target.lat}?overview=full&geometries=geojson&steps=true`;
          const res = await fetch(url);
          const data = await res.json();
          const route = data?.routes?.[0];

          if (!route || !mapRef.current) {
            throw new Error('no-route');
          }

          const coords = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
          if (routeLineRef.current) {
            mapRef.current.removeLayer(routeLineRef.current);
          }
          routeLineRef.current = L.polyline(coords, {
            color: resolveBrandPrimary(),
            weight: 5,
            opacity: 0.9,
          }).addTo(mapRef.current);
          mapRef.current.fitBounds(routeLineRef.current.getBounds(), { padding: [36, 36] });

          const nextSteps: RouteStep[] = (route.legs?.[0]?.steps || []).map((step: any) => ({
            instruction: translateManeuver(step),
            distance: step.distance || 0,
            duration: step.duration || 0,
          }));
          setSteps(nextSteps.filter((s) => s.instruction));
          setSummary({ distance: route.distance, duration: route.duration });
          setGuiding(true);

          if (watchIdRef.current != null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
          }
          watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
              const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setUserPos(next);
              setUserMarker(L, next);
            },
            () => undefined,
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
          );
        } catch {
          window.open(googleMapsDirUrl(target, origin, location), '_blank', 'noopener,noreferrer');
          setError('Itinéraire détaillé indisponible ici. Ouverture dans Google Maps.');
        } finally {
          setStarting(false);
        }
      },
      (geoError) => {
        setStarting(false);
        const fallback = dest
          ? googleMapsDirUrl(dest, null, location)
          : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}&travelmode=driving`;
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError('Autorisez la localisation pour lancer le guide, ou ouvrez l’itinéraire externe.');
        } else {
          window.open(fallback, '_blank', 'noopener,noreferrer');
          setError('Position introuvable. Itinéraire ouvert dans Google Maps.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="px-1">
        <p className="em-guest-section-label">Itinéraire</p>
        <h3 className="font-display font-semibold text-foreground text-base mt-0.5">
          {eventTitle || 'Réception'}
        </h3>
        <p className="text-xs text-muted mt-1 leading-relaxed">{location}</p>
      </div>
      <div className="em-venue-guide rounded-2xl border border-border overflow-hidden bg-surface shadow-[0_10px_40px_rgba(15,23,42,0.05)]" data-guest-no-swipe>
        <div className="relative">
          <div ref={mapElRef} className="em-venue-guide-map h-[280px] sm:h-[340px] w-full bg-surface-muted" />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-muted/80">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          )}
          <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-surface/95 backdrop-blur-sm text-[10px] font-semibold text-foreground shadow-sm">
            <MapPin className="w-3 h-3 text-primary" />
            {destinationLabel}
          </div>
        </div>

        <div className="p-4 space-y-3 bg-surface border-t border-border">
          {summary && guiding && (
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <Navigation className="w-3.5 h-3.5 text-primary" />
                {formatDistance(summary.distance)}
              </span>
              <span className="text-muted">· {formatDuration(summary.duration)}</span>
              {userPos && <LocateFixed className="w-3.5 h-3.5 text-primary ml-auto" />}
            </div>
          )}

          {error && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-[var(--radius-button)] px-3 py-2 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {error}
            </p>
          )}

          {!guiding ? (
            <button
              type="button"
              onClick={startGuide}
              disabled={starting}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition disabled:opacity-60 shadow-sm"
            >
              {starting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Préparation de l’itinéraire…
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Lancer l’itinéraire
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={stopGuide}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-[var(--radius-button)] border border-border bg-surface-muted text-foreground text-sm font-semibold hover:bg-surface transition"
            >
              <Square className="w-3.5 h-3.5" />
              Arrêter l’itinéraire
            </button>
          )}

          <p className="text-[10px] text-muted text-center">
            Nous utiliserons votre position pour afficher le trajet jusqu’au lieu.
          </p>
        </div>
      </div>

      {guiding && steps.length > 0 && (
        <div className="bg-surface border border-border rounded-[var(--radius-card)] shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-foreground">Instructions</p>
          </div>
          <ol className="max-h-56 overflow-y-auto divide-y divide-border">
            {steps.map((step, i) => (
              <li key={`${i}-${step.instruction}`} className="px-4 py-2.5 flex items-start gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground leading-snug">{step.instruction}</p>
                  <p className="text-[10px] text-muted mt-0.5">
                    {formatDistance(step.distance)} · {formatDuration(step.duration)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {dest && (
        <div className="flex flex-col gap-2 min-[360px]:flex-row">
          <a
            href={googleMapsDirUrl(dest, userPos, location)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center min-h-11 text-center text-xs font-semibold px-3 py-2.5 rounded-[var(--radius-button)] border border-border text-muted hover:text-foreground hover:bg-surface-muted transition touch-manipulation"
          >
            Google Maps
          </a>
          <a
            href={wazeUrl(dest)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center min-h-11 text-center text-xs font-semibold px-3 py-2.5 rounded-[var(--radius-button)] border border-border text-muted hover:text-foreground hover:bg-surface-muted transition touch-manipulation"
          >
            Waze
          </a>
        </div>
      )}
    </div>
  );
}
