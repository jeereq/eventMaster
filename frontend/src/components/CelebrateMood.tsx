'use client';

import { useLayoutEffect } from 'react';
import { useViewPreferencesOptional } from '@/context/ViewPreferencesContext';

/**
 * Force l’ambiance Celebrate sur les surfaces publiques / invité.
 * Compteur : plusieurs instances (layout RSVP + page) ne se marchent pas dessus.
 * useLayoutEffect : appliqué avant le paint, pour éviter un flash de fond.
 */
let celebrateLock = 0;

export default function CelebrateMood() {
  const prefs = useViewPreferencesOptional();

  useLayoutEffect(() => {
    const root = document.documentElement;
    celebrateLock += 1;
    root.dataset.mood = 'celebrate';
    return () => {
      celebrateLock = Math.max(0, celebrateLock - 1);
      if (celebrateLock === 0) {
        root.dataset.mood = prefs?.prefs.mood === 'celebrate' ? 'celebrate' : 'work';
      }
    };
  }, [prefs?.prefs.mood]);

  return null;
}
