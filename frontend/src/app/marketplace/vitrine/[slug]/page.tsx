import type { Metadata } from 'next';
import { vendorMetadata } from '@/lib/listingMetadata';
import VendorShowcaseClient from './VendorShowcaseClient';

type Props = { params: Promise<{ slug: string }> };

/** Aperçu de partage (WhatsApp, SMS, e-mail) de la vitrine d'un prestataire. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return vendorMetadata(slug);
}

export default function MarketplaceVendorShowcasePage() {
  return <VendorShowcaseClient />;
}
