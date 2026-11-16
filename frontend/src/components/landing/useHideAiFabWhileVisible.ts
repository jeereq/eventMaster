'use client';

import { useEffect, type RefObject } from 'react';

const ATTR = 'data-em-ai-fab-muted';
let visibleCount = 0;

function sync() {
  if (visibleCount > 0) document.body.setAttribute(ATTR, '');
  else document.body.removeAttribute(ATTR);
}

/**
 * Masque le bouton flottant « Simulateur IA » tant que la section est à l’écran :
 * elle porte déjà ses propres boutons, le bouton flottant ferait doublon et recouvrirait le contenu.
 */
export function useHideAiFabWhileVisible<T extends HTMLElement>(ref: RefObject<T | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    let counted = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = Boolean(entry?.isIntersecting);
        if (visible === counted) return;
        counted = visible;
        visibleCount += visible ? 1 : -1;
        sync();
      },
      { rootMargin: '-15% 0px -15% 0px' },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (counted) {
        visibleCount -= 1;
        sync();
      }
    };
  }, [ref]);
}
