'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { ViewPreferencesProvider } from '@/context/ViewPreferencesContext';

/** Applique la couleur d’accent (localStorage) sur tout le site, y compris les pages auth. */
export default function ViewPreferencesBridge({ children }: { children: React.ReactNode }) {
  const { tenant } = useAuth();
  return (
    <ViewPreferencesProvider tenantBranding={tenant?.branding ?? null}>
      {children}
    </ViewPreferencesProvider>
  );
}
