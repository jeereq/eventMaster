'use client';

import { useEffect } from 'react';
import { syncBrandFavicon, resolveDefaultBrandPalette } from '@/lib/brandTheme';

/**
 * Garantit une favicon colorée au premier paint client
 * (avant / en complément des applyBrandToDocument des contextes).
 */
export default function BrandFaviconSync() {
  useEffect(() => {
    const primary =
      getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() ||
      resolveDefaultBrandPalette().primary;
    const accent =
      getComputedStyle(document.documentElement).getPropertyValue('--brand-accent').trim() ||
      primary;
    syncBrandFavicon(primary, accent);
  }, []);

  return null;
}
