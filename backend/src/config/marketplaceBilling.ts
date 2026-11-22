import { prisma } from '../db';
import { loadPlatformSettings } from '../services/platformSettingsService';
import {
  computeMarketplaceAmountsWith,
  ratesWithVendorDeposit,
  resolveMarketplaceRates,
  type MarketplaceBillingRates,
} from './marketplaceRates';

export {
  MARKETPLACE_COMMISSION_RATE,
  MARKETPLACE_DEPOSIT_RATE,
  MARKETPLACE_DEPOSIT_RATE_MAX,
  MARKETPLACE_DEPOSIT_RATE_MIN,
  ratesWithVendorDeposit,
  type MarketplaceBillingRates,
} from './marketplaceRates';

export function getMarketplaceBillingRates(settings = loadPlatformSettings()): MarketplaceBillingRates {
  return resolveMarketplaceRates(settings);
}

export async function getVendorBillingRates(vendorTenantId: string | null | undefined): Promise<MarketplaceBillingRates> {
  const base = getMarketplaceBillingRates();
  if (!vendorTenantId) return base;
  const tenant = await prisma.tenant.findUnique({
    where: { id: vendorTenantId },
    select: { marketplaceDepositRate: true },
  });
  return ratesWithVendorDeposit(tenant?.marketplaceDepositRate, base);
}

export function computeMarketplaceAmounts(amountFc: number, rates: MarketplaceBillingRates = getMarketplaceBillingRates()) {
  return computeMarketplaceAmountsWith(amountFc, rates);
}

/** Tarif « par jour » × nombre de jours ; les autres unités restent un forfait pour la plage. */
export function billedMarketplaceAmount(
  priceFromFc: number,
  priceUnit: string | null | undefined,
  dayCount: number,
  rates: MarketplaceBillingRates = getMarketplaceBillingRates(),
) {
  const days = Math.max(1, dayCount);
  const base = priceUnit === 'DAY' ? priceFromFc * days : priceFromFc;
  return computeMarketplaceAmountsWith(base, rates);
}
