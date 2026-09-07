import { resolveUsdExchangeRateCdf } from '@/lib/platformCities';

export type FlexPayChargeCurrency = 'CDF' | 'USD';

export function convertFcToUsd(amountFc: number, rate: number): number {
  if (!(amountFc > 0) || !(rate > 0)) return 0;
  return Math.round((amountFc / rate) * 100) / 100;
}

export function formatUsd(amount: number): string {
  return `${amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} $`;
}

export function formatChargeAmount(
  amountFc: number,
  currency: FlexPayChargeCurrency,
  rate: number,
): string {
  if (currency === 'USD') {
    return formatUsd(convertFcToUsd(amountFc, resolveUsdExchangeRateCdf(rate)));
  }
  const fc = Math.max(0, Math.round(amountFc));
  return `${fc.toLocaleString('fr-FR')} FC`;
}
