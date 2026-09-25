'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { isAiFabHiddenRoute } from '@/lib/aiFabVisibility';

const GlobalAiSimulatorFab = dynamic(() => import('@/components/GlobalAiSimulatorFab'), {
  ssr: false,
});

export default function GlobalAiSimulatorFabHost() {
  const pathname = usePathname() || '/';
  if (isAiFabHiddenRoute(pathname)) return null;
  return <GlobalAiSimulatorFab />;
}
