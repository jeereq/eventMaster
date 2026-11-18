'use client';

import { useEffect } from 'react';

/**
 * Fait apparaître les éléments `[data-reveal]` de l'accueil quand ils entrent à l'écran
 * (voir « Mouvement de l'accueil » dans globals.css : 8px + opacité, 300ms).
 * Pose `.em-motion` sur la racine : sans ce script, ou si le visiteur demande moins de
 * mouvement, rien n'est masqué. Surveille aussi les sections chargées après coup.
 */
export default function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.em-home');
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -6% 0px' },
    );

    const watch = (scope: ParentNode) => {
      scope.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)').forEach((el) => io.observe(el));
    };

    watch(root);
    root.classList.add('em-motion');

    const mo = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches('[data-reveal]')) io.observe(node);
          watch(node);
        });
      }
    });
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      root.classList.remove('em-motion');
    };
  }, []);

  return null;
}
