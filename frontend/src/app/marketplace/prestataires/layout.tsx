import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { publicPageMetadata } from '@/lib/pageMetadata';

export const metadata: Metadata = publicPageMetadata(
  'Prestataires événementiels',
  'Traiteurs, DJ, photographes, décorateurs, maîtres de cérémonie : comparez les prestataires et demandez un devis.',
  '/marketplace/prestataires',
);

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
