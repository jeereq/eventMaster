import type { PublicSiteConfig } from '@/context/PlatformSiteContext';
import { MARKETPLACE_COMMISSION_RATE, MARKETPLACE_DEPOSIT_RATE } from '@/lib/marketplace';

export function commissionPercent(site?: Pick<PublicSiteConfig, 'marketplaceCommissionPercent'> | null) {
  return site?.marketplaceCommissionPercent ?? Math.round(MARKETPLACE_COMMISSION_RATE * 100);
}

export function depositPercent(site?: Pick<PublicSiteConfig, 'marketplaceDepositPercent'> | null) {
  return site?.marketplaceDepositPercent ?? Math.round(MARKETPLACE_DEPOSIT_RATE * 100);
}

export function commercialPercent(site?: Pick<PublicSiteConfig, 'commercialFirstCommissionPercent'> | null) {
  return site?.commercialFirstCommissionPercent ?? 30;
}

export function renewalPercent(site?: Pick<PublicSiteConfig, 'commercialRenewalCommissionPercent'> | null) {
  return site?.commercialRenewalCommissionPercent ?? 20;
}

/** Remplace {depositPercent}, {commissionPercent}, {commercialPercent}, {renewalPercent}, {platformName}. */
export function interpolateRates(text: string, site?: PublicSiteConfig | null) {
  return text
    .replaceAll('{depositPercent}', String(depositPercent(site)))
    .replaceAll('{commissionPercent}', String(commissionPercent(site)))
    .replaceAll('{commercialPercent}', String(commercialPercent(site)))
    .replaceAll('{renewalPercent}', String(renewalPercent(site)))
    .replaceAll('{platformName}', site?.platformName || 'EventMaster');
}
