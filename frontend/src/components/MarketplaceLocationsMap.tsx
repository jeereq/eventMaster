'use client';

import React, { useEffect, useRef } from 'react';
import { loadLeaflet } from '@/lib/leafletLoader';

export interface MarketplaceMapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  href: string;
  subtitle?: string;
}

const KINSHASA = { lat: -4.325, lng: 15.322 };

export default function MarketplaceLocationsMap({
  markers,
  height = 320,
}: {
  markers: MarketplaceMapMarker[];
  height?: number;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

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
        }
        const map = L.map(hostRef.current, { scrollWheelZoom: false });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        const points = markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
        if (points.length === 0) {
          map.setView([KINSHASA.lat, KINSHASA.lng], 11);
        } else {
          const group = L.featureGroup(
            points.map((m) =>
              L.marker([m.lat, m.lng]).bindPopup(
                `<a href="${m.href}" style="font-weight:600">${m.title}</a>${m.subtitle ? `<br/><span>${m.subtitle}</span>` : ''}`,
              ),
            ),
          ).addTo(map);
          map.fitBounds(group.getBounds().pad(0.25), { maxZoom: 14 });
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
  }, [markers]);

  return (
    <div
      ref={hostRef}
      className="w-full rounded-[var(--radius-card)] border border-border overflow-hidden bg-surface-muted"
      style={{ height }}
    />
  );
}
