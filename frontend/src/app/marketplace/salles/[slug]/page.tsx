import type { Metadata } from 'next';
import { venueMetadata } from '@/lib/listingMetadata';
import VenueDetailClient from './VenueDetailClient';

type Props = { params: Promise<{ slug: string }> };

/** Aperçu de partage (WhatsApp, SMS, e-mail) : nom, lieu, capacité, prix et photo de la salle. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return venueMetadata(slug);
}

export default function MarketplaceVenueDetailPage() {
  return <VenueDetailClient />;
}
