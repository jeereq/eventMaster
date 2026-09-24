import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { publicPageMetadata } from '@/lib/pageMetadata';

export const metadata: Metadata = publicPageMetadata(
  'Tarifs et forfaits',
  'Compte gratuit sans carte bancaire, forfaits Particulier au trimestre, offres Business et Pro. Paiement Mobile Money ou carte.',
  '/tarifs',
);

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
