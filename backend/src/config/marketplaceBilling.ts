import { loadPlatformSettings } from '../services/platformSettingsService';
import { parseRateInput } from '../utils/ratePercent';

/** Défauts si les réglages plateforme n’ont pas encore été enregistrés. */
export const MARKETPLACE_COMMISSION_RATE = 0.08;
export const MARKETPLACE_DEPOSIT_RATE = 0.3;

export function getMarketplaceBillingRates(settings = loadPlatformSettings()) {
  return {
    commissionRate: parseRateInput(settings.marketplaceCommissionRate, MARKETPLACE_COMMISSION_RATE, 0.01, 0.5),
    depositRate: parseRateInput(settings.marketplaceDepositRate, MARKETPLACE_DEPOSIT_RATE, 0.05, 0.9),
  };
}

export function computeMarketplaceAmounts(amountFc: number, rates = getMarketplaceBillingRates()) {
  const amount = Math.max(0, Math.round(amountFc));
  const depositFc = Math.round(amount * rates.depositRate);
  const commissionFc = Math.round(amount * rates.commissionRate);
  return {
    amountFc: amount,
    depositFc,
    commissionFc,
    commissionRate: rates.commissionRate,
  };
}

/** Tarif « par jour » × nombre de jours ; les autres unités restent un forfait pour la plage. */
export function billedMarketplaceAmount(priceFromFc: number, priceUnit: string | null | undefined, dayCount: number) {
  const days = Math.max(1, dayCount);
  const base = priceUnit === 'DAY' ? priceFromFc * days : priceFromFc;
  return computeMarketplaceAmounts(base);
}
