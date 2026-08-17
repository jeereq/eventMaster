'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 767px)';

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

/** SSR : desktop, pour éviter un flash de carte plein écran sur grand écran. */
function getServerSnapshot() {
  return false;
}

export default function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
