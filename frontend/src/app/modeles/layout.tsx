import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { publicPageMetadata } from '@/lib/pageMetadata';
import { adaptDescription, fetchPublicSiteSnapshot } from '@/lib/publicSiteServer';

export async function generateMetadata(): Promise<Metadata> {
  const site = await fetchPublicSiteSnapshot();
  return publicPageMetadata(
    'Modèles d’invitations',
    adaptDescription(
      'Modèles d’invitations prêts à l’emploi ou créés par IA, envoyés par WhatsApp, SMS ou e-mail avec confirmation de présence et pass QR.',
      site.notificationChannels,
    ),
    '/modeles',
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
