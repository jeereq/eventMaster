'use client';

import { useLayoutEffect } from 'react';

/**
 * Force l’ambiance Celebrate sur les surfaces publiques / invité.
 * Compteur : plusieurs instances (layout réponse à l’invitation + page) ne se marchent pas dessus.
 * useLayoutEffect : appliqué avant le paint, pour éviter un flash de fond.
 */
let celebrateLock = 0;

export default function CelebrateMood() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    celebrateLock += 1;
    root.dataset.mood = 'celebrate';
    return () => {
      celebrateLock = Math.max(0, celebrateLock - 1);
      if (celebrateLock === 0) delete root.dataset.mood;
    };
  }, []);

  return null;
}
