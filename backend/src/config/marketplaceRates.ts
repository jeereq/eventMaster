import { parseRateInput } from '../utils/ratePercent.ts';

/** Aucune commission marketplace sur les salles et prestataires (réglable par l'admin, de 0 à 50 %). */
export const MARKETPLACE_COMMISSION_RATE = 0;
/** Acompte par défaut ; chaque prestataire peut fixer son propre taux. */
export const MARKETPLACE_DEPOSIT_RATE = 0.3;
export const MARKETPLACE_DEPOSIT_RATE_MIN = 0.05;
export const MARKETPLACE_DEPOSIT_RATE_MAX = 0.9;

export interface MarketplaceRatesInput {
  marketplaceCommissionRate?: unknown;
  marketplaceDepositRate?: unknown;
}

export function resolveMarketplaceRates(settings: MarketplaceRatesInput) {
  return {
    commissionRate: parseRateInput(settings.marketplaceCommissionRate, MARKETPLACE_COMMISSION_RATE, 0, 0.5),
    depositRate: parseRateInput(
      settings.marketplaceDepositRate,
      MARKETPLACE_DEPOSIT_RATE,
      MARKETPLACE_DEPOSIT_RATE_MIN,
      MARKETPLACE_DEPOSIT_RATE_MAX,
    ),
  };
}

export type MarketplaceBillingRates = ReturnType<typeof resolveMarketplaceRates>;

/** Taux de la plateforme, avec l'acompte propre au prestataire s'il en a fixé un. */
export function ratesWithVendorDeposit(
  vendorDepositRate: number | null | undefined,
  base: MarketplaceBillingRates,
): MarketplaceBillingRates {
  if (vendorDepositRate == null || !Number.isFinite(vendorDepositRate)) return base;
  return {
    ...base,
    depositRate: parseRateInput(vendorDepositRate, base.depositRate, MARKETPLACE_DEPOSIT_RATE_MIN, MARKETPLACE_DEPOSIT_RATE_MAX),
  };
}

export function computeMarketplaceAmountsWith(amountFc: number, rates: MarketplaceBillingRates) {
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
