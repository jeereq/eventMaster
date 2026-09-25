'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { prefersReducedMotion } from '@/lib/prefersReducedMotion';

const MOBILE_QUERY = '(max-width: 767px)';

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MOBILE_QUERY).matches;
}

/** Petit retour haptique au tap (Android ; ignoré sans support, ex. iOS Safari). */
export function tapHaptic(duration = 8) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  if (prefersReducedMotion()) return;
  try {
    navigator.vibrate(duration);
  } catch {
    /* navigateur sans autorisation de vibration */
  }
}

/**
 * Comme une app native : re-taper l'onglet actif remonte en haut de l'écran.
 * Le dashboard défile dans `#main-content`, les pages publiques dans la fenêtre.
 */
export function scrollAppToTop() {
  const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
  const main = document.getElementById('main-content');
  if (main && main.scrollTop > 0) main.scrollTo({ top: 0, behavior });
  if (window.scrollY > 0) window.scrollTo({ top: 0, behavior });
}

/**
 * Fondu d'entrée du contenu à chaque changement d'écran sur mobile.
 * Opacité seule : un `transform` casserait les éléments `fixed` de la page pendant l'animation.
 */
export function useMobileRouteFade() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!isMobileViewport() || prefersReducedMotion()) return;
    const main = document.getElementById('main-content');
    if (!main || typeof main.animate !== 'function') return;
    main.animate([{ opacity: 0.35 }, { opacity: 1 }], {
      duration: 220,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    });
  }, [pathname]);
}
