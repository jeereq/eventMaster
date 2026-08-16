'use client';

import { useEffect } from 'react';
import { useViewPreferencesOptional } from '@/context/ViewPreferencesContext';

/**
 * Force l’ambiance Celebrate sur les surfaces publiques / invité.
 * Au démontage, restaure le mood des préférences (dashboard = Work par défaut).
 */
export default function CelebrateMood() {
  const prefs = useViewPreferencesOptional();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.mood = 'celebrate';
    return () => {
      const restore = prefs?.prefs.mood === 'celebrate' ? 'celebrate' : 'work';
      root.dataset.mood = restore;
    };
  }, [prefs?.prefs.mood]);

  return null;
}
