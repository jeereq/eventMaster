import type { Metadata } from 'next';
import { eventMetadata } from '@/lib/listingMetadata';
import EventDetailClient from './EventDetailClient';

type Props = { params: Promise<{ slug: string }> };

/** Aperçu de partage (WhatsApp, SMS, e-mail) : titre, date, lieu, prix des billets et affiche. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return eventMetadata(slug);
}

export default function MarketplaceEventDetailPage() {
  return <EventDetailClient />;
}
