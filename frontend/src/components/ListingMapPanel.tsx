'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui';
import { ExternalLink, MapPin, Navigation } from 'lucide-react';
import type { MarketplaceMapHandle, MarketplaceMapMarker } from '@/components/MarketplaceLocationsMap';

const MarketplaceLocationsMap = dynamic(
  () => import('@/components/MarketplaceLocationsMap'),
  {
    ssr: false,
    loading: () => <div className="h-full min-h-[22rem] bg-surface-muted" aria-hidden />,
  },
);

export default function ListingMapPanel({
  mapRef,
  marker,
  city,
  locationLine,
  address,
  wantRoute,
  onStartRoute,
}: {
  mapRef: React.RefObject<MarketplaceMapHandle | null>;
  marker: MarketplaceMapMarker;
  city?: string | null;
  locationLine?: string;
  address?: string | null;
  wantRoute: boolean;
  onStartRoute: () => void;
}) {
  const dest = `${marker.lat},${marker.lng}`;
  const googleHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
  const osmHref = `https://www.openstreetmap.org/?mlat=${marker.lat}&mlon=${marker.lng}#map=16/${marker.lat}/${marker.lng}`;

  return (
    <div className="rounded-[var(--radius-card)] border border-border overflow-hidden bg-surface shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-3 p-3 sm:p-4 border-b border-border sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            Position & itinéraire
          </p>
          {locationLine ? (
            <p className="text-sm font-medium text-foreground">{locationLine}</p>
          ) : null}
          {address ? (
            <p className="text-xs text-muted leading-relaxed">{address}</p>
          ) : null}
          <p className="text-[11px] text-muted">
            Carte agrandie · autorisez la localisation, ou cliquez le point de départ sur la carte.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            size="sm"
            className="min-h-11 sm:min-h-0"
            onClick={onStartRoute}
            leftIcon={<Navigation className="w-3.5 h-3.5" />}
          >
            Itinéraire vocal
          </Button>
          <a
            href={googleHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 min-h-11 sm:min-h-9 px-3 rounded-[var(--radius-button)] border border-border text-xs font-semibold text-foreground hover:bg-surface-muted"
          >
            Google Maps
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href={osmHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 min-h-11 sm:min-h-9 px-3 rounded-[var(--radius-button)] border border-border text-xs font-semibold text-foreground hover:bg-surface-muted"
          >
            OpenStreetMap
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
      <div className="h-[min(70vh,36rem)] sm:h-[min(72vh,42rem)]">
        <MarketplaceLocationsMap
          ref={mapRef}
          markers={[marker]}
          height="100%"
          navigateOnClick={false}
          autoDirections={wantRoute}
          city={city}
        />
      </div>
    </div>
  );
}
