import type { Metadata } from 'next';
import EmbedVenueClient from './EmbedVenueClient';

/** Version intégrable : jamais indexée, la fiche complète reste la page de référence. */
export const metadata: Metadata = {
  title: 'Visite 3D',
  robots: { index: false, follow: false },
};

export default function EmbedVenuePage() {
  return <EmbedVenueClient />;
}
