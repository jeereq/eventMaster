'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { PublicVenue } from '@/lib/marketplace';
import { listingPublicUrl } from '@/lib/share';
import VenueImmersiveViewer from '@/components/venue/VenueImmersiveViewer';

const embeddedSpaceHref = (slug: string) => listingPublicUrl('venue', slug);

/** Visionneuse 3D plein cadre, pensée pour être placée dans une iframe sur le site d'un propriétaire. */
export default function EmbedVenueClient() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const [venue, setVenue] = useState<PublicVenue | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    api
      .get(`/public/venues/${encodeURIComponent(slug)}`)
      .then((data: PublicVenue) => {
        if (!cancelled) setVenue(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Salle introuvable.');
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const hasPlan = Boolean(venue?.layoutPreview);

  return (
    <main id="main-content" className="fixed inset-0 bg-stage">
      {venue && hasPlan ? (
        <VenueImmersiveViewer
          venue={venue}
          spaceHref={embeddedSpaceHref}
          spaceLinkTarget="_blank"
          contactHref={`${listingPublicUrl('venue', venue.slug)}#listing-contact`}
          shareUrl={listingPublicUrl('venue', venue.slug)}
          className="!aspect-auto h-full min-h-0 w-full rounded-none shadow-none"
        />
      ) : (
        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-stage-foreground" role={error || venue ? 'alert' : 'status'}>
          {error
            ? error
            : venue
              ? 'La visite 3D de cette salle n’est pas disponible.'
              : 'Chargement de la visite…'}
        </div>
      )}
    </main>
  );
}
