'use client';

import { useEffect } from 'react';
import {
  applyBrandToDocument,
  type TenantBranding,
} from '@/lib/brandTheme';

/**
 * Applique le thème de l’organisation sur les vues invité (CSS vars + favicon)
 * et le rétablit si le branding plateforme le remplace.
 */
export default function GuestBrandSync({ branding }: { branding?: TenantBranding | null }) {
  useEffect(() => {
    const apply = () => {
      if (branding?.primary || branding?.accent || branding?.sidebar) {
        applyBrandToDocument(branding);
      }
    };
    apply();
    window.addEventListener('em-brand-applied', apply);
    return () => window.removeEventListener('em-brand-applied', apply);
  }, [branding?.primary, branding?.accent, branding?.sidebar]);

  useEffect(() => {
    return () => {
      applyBrandToDocument(null);
      window.dispatchEvent(new CustomEvent('em-platform-settings-updated'));
    };
  }, []);

  return null;
}
