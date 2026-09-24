import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { publicPageMetadata } from '@/lib/pageMetadata';

export const metadata: Metadata = publicPageMetadata(
  'Événements publics et billetterie',
  'Concerts, galas et conférences en RDC. Billets payés par Mobile Money ou carte, entrée par QR code.',
  '/marketplace/evenements',
);

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
