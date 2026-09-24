import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { publicPageMetadata } from '@/lib/pageMetadata';

export const metadata: Metadata = publicPageMetadata(
  'Modèles d’invitations',
  'Modèles d’invitations prêts à l’emploi ou créés par IA, envoyés par WhatsApp, SMS ou e-mail avec confirmation de présence et pass QR.',
  '/modeles',
);

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
