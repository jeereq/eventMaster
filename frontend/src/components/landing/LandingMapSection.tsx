'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import MarketplaceLocationsMap from '@/components/MarketplaceLocationsMap';
import { Button, Skeleton } from '@/components/ui';
import {
  catalogueItemToMapMarker,
  serviceToCatalogueItem,
  venueToCatalogueItem,
  type PublicService,
  type PublicVenue,
} from '@/lib/marketplace';

export default function LandingMapSection() {
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get('/public/venues').catch(() => ({ venues: [] })),
      api.get('/public/services').catch(() => ({ services: [] })),
    ]).then(([venuesData, servicesData]) => {
      if (cancelled) return;
      setVenues(venuesData.venues || []);
      setServices(servicesData.services || []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const markers = useMemo(
    () =>
      [...venues.map(venueToCatalogueItem), ...services.map(serviceToCatalogueItem)]
        .filter((item) => item.latitude != null && item.longitude != null)
        .map(catalogueItemToMapMarker),
    [venues, services],
  );

  return (
    <section className="py-12 sm:py-16 border-t border-border bg-background">
      <div className="page-container space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="max-w-2xl space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Sur la carte
            </p>
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">
              Salles et prestataires à Kinshasa et Lubumbashi
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Touchez un pin pour voir les photos, le tarif et lancer un itinéraire. Survolez pour un aperçu rapide.
            </p>
          </div>
          <Link href="/marketplace">
            <Button variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Explorer le marketplace
            </Button>
          </Link>
        </div>

        {loading ? (
          <Skeleton className="w-full h-[420px] rounded-[var(--radius-card)]" />
        ) : (
          <MarketplaceLocationsMap
            markers={markers}
            height={440}
            listingSearch={false}
            navigateOnClick={false}
          />
        )}
      </div>
    </section>
  );
}
