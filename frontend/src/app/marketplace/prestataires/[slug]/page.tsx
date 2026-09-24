import type { Metadata } from 'next';
import { serviceMetadata } from '@/lib/listingMetadata';
import ServiceDetailClient from './ServiceDetailClient';

type Props = { params: Promise<{ slug: string }> };

/** Aperçu de partage (WhatsApp, SMS, e-mail) : prestation, métier, zone, prix et photo. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return serviceMetadata(slug, '/marketplace/prestataires');
}

export default function MarketplaceServiceDetailPage() {
  return <ServiceDetailClient />;
}
