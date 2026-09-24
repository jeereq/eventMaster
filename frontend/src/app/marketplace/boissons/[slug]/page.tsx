import type { Metadata } from 'next';
import { beverageVendorMetadata } from '@/lib/listingMetadata';
import BeverageVendorDetailClient from './BeverageVendorDetailClient';

type Props = { params: Promise<{ slug: string }> };

/** Aperçu de partage (WhatsApp, SMS, e-mail) : vendeur, ville et boissons disponibles. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return beverageVendorMetadata(slug);
}

export default function VendorDrinksPage() {
  return <BeverageVendorDetailClient />;
}
