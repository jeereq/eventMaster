import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { publicPageMetadata } from '@/lib/pageMetadata';

export const metadata: Metadata = publicPageMetadata(
  'Créer un compte',
  'Créez votre compte EventMaster en 1 minute, sans carte bancaire : organisateur, client ou prestataire.',
  '/register',
);

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
