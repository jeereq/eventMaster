import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { publicPageMetadata } from '@/lib/pageMetadata';

export const metadata: Metadata = publicPageMetadata(
  'Salles de réception et de fête',
  'Trouvez une salle pour votre mariage, anniversaire, gala ou conférence : capacité, prix en FC, photos et visite 3D.',
  '/marketplace/salles',
);

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
