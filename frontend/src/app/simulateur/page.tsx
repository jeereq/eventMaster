import type { Metadata } from 'next';
import SimulateurPageClient from './SimulateurPageClient';

export const metadata: Metadata = {
  title: 'Simulateur budget IA — EventMaster',
  description:
    'Estimez le budget de votre événement en RDC : trois formules (éco, équilibré, confort) à partir des salles et prestataires du catalogue EventMaster.',
};

export default function SimulateurPage() {
  return <SimulateurPageClient />;
}
