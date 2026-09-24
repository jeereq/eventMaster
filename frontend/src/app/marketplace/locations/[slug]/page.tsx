import type { Metadata } from 'next';
import { serviceMetadata } from '@/lib/listingMetadata';
import ServiceDetailClient from '../../prestataires/[slug]/ServiceDetailClient';

type Props = { params: Promise<{ slug: string }> };

/** Matériel & Équipements : même fiche que les prestataires, aperçu de partage dédié. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return serviceMetadata(slug, '/marketplace/locations');
}

export default function MarketplaceRentalDetailPage() {
  return <ServiceDetailClient />;
}
