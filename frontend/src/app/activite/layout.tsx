import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { publicPageMetadata } from '@/lib/pageMetadata';

export const metadata: Metadata = publicPageMetadata(
  'Réalisations et coulisses',
  'Photos, décors et coulisses partagés par les salles et prestataires du marketplace EventMaster.',
  '/activite',
);

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
