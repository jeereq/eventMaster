import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { publicPageMetadata } from '@/lib/pageMetadata';

export const metadata: Metadata = publicPageMetadata(
  'Contact et assistance',
  'Démonstration, forfaits, support technique ou partenariat : écrivez-nous ou appelez-nous, réponse sous 24 à 48 h.',
  '/contact',
);

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
