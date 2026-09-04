'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { SITE_CONTACT } from '@/config/siteContent';
import { applyBrandToDocument } from '@/lib/brandTheme';
import { resolveUsdExchangeRateCdf, sanitizeEnabledCities } from '@/lib/platformCities';
import { sanitizeAuthOtpChannels, type AuthOtpChannels } from '@/lib/authOtpChannels';

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
  onlinePaymentsEnabled: boolean;
  saasPaymentMode: 'manual' | 'flexpay';
  ticketPaymentProvider: 'flexpay_card';
  brandPrimary: string;
  brandAccent: string;
  marketplaceCommissionRate: number;
  marketplaceDepositRate: number;
  marketplaceCommissionPercent: number;
  marketplaceDepositPercent: number;
  commercialFirstCommissionRate: number;
  commercialRenewalCommissionRate: number;
  commercialFirstCommissionPercent: number;
  commercialRenewalCommissionPercent: number;
  usdExchangeRateCdf: number;
  enabledCities: string[];
  authOtpChannels: AuthOtpChannels;
}

export const DEFAULT_PUBLIC_SITE: PublicSiteConfig = {
  platformName: 'EventMaster',
  platformTagline: 'Préparez votre événement en un clic.',
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
  onlinePaymentsEnabled: true,
  saasPaymentMode: 'manual',
  ticketPaymentProvider: 'flexpay_card',
  brandPrimary: '',
  brandAccent: '',
  marketplaceCommissionRate: 0.08,
  marketplaceDepositRate: 0.3,
  marketplaceCommissionPercent: 8,
  marketplaceDepositPercent: 30,
  commercialFirstCommissionRate: 0.3,
  commercialRenewalCommissionRate: 0.2,
  commercialFirstCommissionPercent: 30,
  commercialRenewalCommissionPercent: 20,
  usdExchangeRateCdf: 2800,
  enabledCities: ['Kinshasa', 'Lubumbashi', 'Goma'],
  authOtpChannels: 'BOTH',
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
      const next: PublicSiteConfig = {
        ...DEFAULT_PUBLIC_SITE,
        ...data,
        usdExchangeRateCdf: resolveUsdExchangeRateCdf(data.usdExchangeRateCdf, DEFAULT_PUBLIC_SITE.usdExchangeRateCdf),
        enabledCities: sanitizeEnabledCities(data.enabledCities),
        authOtpChannels: sanitizeAuthOtpChannels(data.authOtpChannels),
      };
      setSite(next);

      if (next.brandPrimary || next.brandAccent) {
        applyBrandToDocument({
          primary: next.brandPrimary || undefined,
          accent: next.brandAccent || next.brandPrimary || undefined,
        });
      } else {
        applyBrandToDocument(null);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('em-brand-applied'));
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
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('em-platform-settings-updated', onUpdated);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('em-platform-settings-updated', onUpdated);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const value = useMemo(() => ({ site, ready, refresh }), [site, ready]);

  return (
    <PlatformSiteContext.Provider value={value}>
      {children}
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
