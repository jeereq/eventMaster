'use client';

import { useEffect } from 'react';
import {
  applyBrandToDocument,
  type TenantBranding,
} from '@/lib/brandTheme';

const LEGACY_DEFAULT = new Set(['#4f46e5', '#6366f1', '#4338ca']);

function isCustomGuestBrand(branding?: TenantBranding | null) {
  if (!branding) return false;
  if (branding.sidebar) return true;
  const primary = branding.primary?.trim().toLowerCase();
  const accent = branding.accent?.trim().toLowerCase();
  const primaryIsLegacy = !primary || LEGACY_DEFAULT.has(primary);
  const accentIsLegacy = !accent || LEGACY_DEFAULT.has(accent) || accent === primary;
  if (primaryIsLegacy && accentIsLegacy) return false;
  return Boolean(primary || accent);
}

/**
 * Applique le thème de l’organisation sur les vues invité (CSS vars + favicon)
 * uniquement si l’orga a choisi des couleurs perso (pas l’ancien indigo par défaut).
 */
export default function GuestBrandSync({ branding }: { branding?: TenantBranding | null }) {
  const custom = isCustomGuestBrand(branding);

  useEffect(() => {
    const apply = () => {
      if (custom) applyBrandToDocument(branding);
    };
    apply();
    window.addEventListener('em-brand-applied', apply);
    return () => window.removeEventListener('em-brand-applied', apply);
  }, [custom, branding?.primary, branding?.accent, branding?.sidebar]);

  useEffect(() => {
    return () => {
      applyBrandToDocument(null);
      window.dispatchEvent(new CustomEvent('em-platform-settings-updated'));
    };
  }, []);

  return null;
}
