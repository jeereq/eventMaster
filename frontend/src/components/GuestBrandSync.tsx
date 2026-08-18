'use client';

import { useEffect } from 'react';
import {
  applyBrandToDocument,
  clearBrandFromDocument,
  type TenantBranding,
} from '@/lib/brandTheme';

/** Applique le thème de l’organisation sur les vues invité (CSS vars + favicon). */
export default function GuestBrandSync({ branding }: { branding?: TenantBranding | null }) {
  useEffect(() => {
    if (branding?.primary || branding?.accent || branding?.sidebar) {
      applyBrandToDocument(branding);
    }
  }, [branding?.primary, branding?.accent, branding?.sidebar]);

  useEffect(() => {
    return () => {
      clearBrandFromDocument();
    };
  }, []);

  return null;
}
