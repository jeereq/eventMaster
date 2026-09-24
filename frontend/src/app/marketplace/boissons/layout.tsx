import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { publicPageMetadata } from '@/lib/pageMetadata';

export const metadata: Metadata = publicPageMetadata(
  'Boissons pour vos réceptions',
  'Bières, sucrés, eaux, vins et champagne livrés à votre salle. Prix affichés en francs congolais.',
  '/marketplace/boissons',
);

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
