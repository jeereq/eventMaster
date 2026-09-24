import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { publicPageMetadata } from '@/lib/pageMetadata';

export const metadata: Metadata = publicPageMetadata(
  'Marketplace événementiel en RDC',
  'Salles, prestataires, matériel, boissons et événements publics à Kinshasa, Lubumbashi et Goma. Comparez, demandez un devis, réservez.',
  '/marketplace',
);

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
