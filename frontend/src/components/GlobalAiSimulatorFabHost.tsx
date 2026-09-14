'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const GlobalAiSimulatorFab = dynamic(() => import('@/components/GlobalAiSimulatorFab'), {
  ssr: false,
});

const HIDDEN_PREFIXES = ['/rsvp/', '/invite/', '/print'];
const LISTING_DETAIL = /^\/marketplace\/(salles|prestataires|evenements)\/[^/]+/;

export default function GlobalAiSimulatorFabHost() {
  const pathname = usePathname() || '/';
  const hidden =
    HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    LISTING_DETAIL.test(pathname);

  if (hidden) return null;
  return <GlobalAiSimulatorFab />;
}
