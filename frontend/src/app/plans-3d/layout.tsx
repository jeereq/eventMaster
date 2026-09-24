import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { publicPageMetadata } from '@/lib/pageMetadata';

export const metadata: Metadata = publicPageMetadata(
  'Plans de salle 2D et 3D',
  'Dessinez votre salle, placez tables et invités, puis faites visiter le plan en 3D avant le jour J.',
  '/plans-3d',
);

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
