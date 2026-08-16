import type { Metadata } from 'next';
import FaqPageClient from './FaqPageClient';

export const metadata: Metadata = {
  title: 'FAQ — EventMaster',
  description:
    'Questions fréquentes sur EventMaster : forfaits, sécurité, protocole QR, facturation.',
};

export default function FaqPage() {
  return <FaqPageClient />;
}
