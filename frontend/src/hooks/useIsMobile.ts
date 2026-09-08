'use client';

import { useSyncExternalStore } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';
const LG_UP_QUERY = '(min-width: 1024px)';

function subscribeQuery(query: string) {
  return (onChange: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  };
}

/** SSR : desktop, pour éviter un flash de carte plein écran sur grand écran. */
export default function useIsMobile() {
  return useSyncExternalStore(
    subscribeQuery(MOBILE_QUERY),
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
}

/** Aligné sur le breakpoint `lg` Tailwind : colonne contact des fiches. */
export function useIsLgUp() {
  return useSyncExternalStore(
    subscribeQuery(LG_UP_QUERY),
    () => window.matchMedia(LG_UP_QUERY).matches,
    () => true,
  );
}
