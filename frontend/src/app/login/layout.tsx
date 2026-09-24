import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { publicPageMetadata } from '@/lib/pageMetadata';

export const metadata: Metadata = publicPageMetadata(
  'Connexion',
  'Connectez-vous à votre espace EventMaster par e-mail ou numéro de téléphone.',
  '/login',
);

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
