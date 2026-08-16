'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { SITE_CONTACT } from '@/config/siteContent';
import { applyBrandToDocument } from '@/lib/brandTheme';

export interface PublicSiteConfig {
  platformName: string;
  platformTagline: string;
  supportEmail: string;
  supportPhone: string;
  supportPhoneHref: string;
  whatsappNote: string;
  addressLine1: string;
  addressLine2: string;
  addressShort: string;
  supportHours: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowRegistration: boolean;
  brandPrimary: string;
  brandAccent: string;
}

export const DEFAULT_PUBLIC_SITE: PublicSiteConfig = {
  platformName: 'EventMaster',
  platformTagline: 'Organisez vos événements, de la salle au scan invité.',
  supportEmail: SITE_CONTACT.email,
  supportPhone: SITE_CONTACT.phone,
  supportPhoneHref: SITE_CONTACT.phoneHref,
  whatsappNote: SITE_CONTACT.whatsappNote,
  addressLine1: SITE_CONTACT.addressLine1,
  addressLine2: SITE_CONTACT.addressLine2,
  addressShort: SITE_CONTACT.addressShort,
  supportHours: SITE_CONTACT.supportHours,
  maintenanceMode: false,
  maintenanceMessage:
    'La plateforme est temporairement en maintenance. Merci de réessayer dans quelques instants.',
  allowRegistration: true,
  brandPrimary: '',
  brandAccent: '',
};

interface PlatformSiteContextValue {
  site: PublicSiteConfig;
  ready: boolean;
  refresh: () => Promise<void>;
}

const PlatformSiteContext = createContext<PlatformSiteContextValue | undefined>(undefined);

function apiBase() {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
}

export function PlatformSiteProvider({ children }: { children: React.ReactNode }) {
  const [site, setSite] = useState<PublicSiteConfig>(DEFAULT_PUBLIC_SITE);
  const [ready, setReady] = useState(false);

  const refresh = async () => {
    try {
      const res = await fetch(`${apiBase()}/public/site`, { cache: 'no-store' });
      if (!res.ok) throw new Error('site fetch failed');
      const data = (await res.json()) as Partial<PublicSiteConfig>;
      const next: PublicSiteConfig = { ...DEFAULT_PUBLIC_SITE, ...data };
      setSite(next);

      if (next.brandPrimary || next.brandAccent) {
        applyBrandToDocument({
          primary: next.brandPrimary || undefined,
          accent: next.brandAccent || next.brandPrimary || undefined,
        });
      }

      if (typeof document !== 'undefined' && next.platformName) {
        document.title = document.title.includes('—')
          ? document.title.replace(/^[^—]+/, next.platformName)
          : document.title;
      }
    } catch {
      setSite(DEFAULT_PUBLIC_SITE);
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    void refresh();
    const onUpdated = () => void refresh();
    window.addEventListener('em-platform-settings-updated', onUpdated);
    return () => window.removeEventListener('em-platform-settings-updated', onUpdated);
  }, []);

  const value = useMemo(() => ({ site, ready, refresh }), [site, ready]);

  return (
    <PlatformSiteContext.Provider value={value}>
      {children}
      {ready && site.maintenanceMode && (
        <div
          role="status"
          className="fixed bottom-0 inset-x-0 z-[90] border-t border-amber-500/30 bg-amber-950 text-amber-50 px-4 py-3 text-center text-sm"
        >
          <p className="font-semibold">{site.platformName} — maintenance</p>
          <p className="text-xs text-amber-100/80 mt-0.5 max-w-2xl mx-auto leading-relaxed">
            {site.maintenanceMessage}
          </p>
        </div>
      )}
    </PlatformSiteContext.Provider>
  );
}

export function usePlatformSite() {
  const ctx = useContext(PlatformSiteContext);
  if (!ctx) {
    return {
      site: DEFAULT_PUBLIC_SITE,
      ready: false,
      refresh: async () => undefined,
    };
  }
  return ctx;
}
