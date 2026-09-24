import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { publicPageMetadata } from '@/lib/pageMetadata';

export const metadata: Metadata = publicPageMetadata(
  'Location de matériel et équipements',
  'Chaises, tentes, sonorisation, véhicules et tenues de cérémonie, en retrait ou avec livraison.',
  '/marketplace/locations',
);

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
