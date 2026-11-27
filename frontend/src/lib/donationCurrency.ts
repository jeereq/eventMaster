import { formatFc } from '@/config/landingPricing';
import type { FlexPayChargeCurrency } from '@/lib/flexPayCurrency';

/** Devise d’un don : francs congolais ou dollars américains. */
export type DonationCurrency = FlexPayChargeCurrency;

export const DEFAULT_MIN_DONATION_USD = 1;
export const DEFAULT_SUGGESTED_DONATIONS_USD = [5, 10, 20, 50, 100];

export interface DonationCurrencyTotal {
  amount: number;
  amountFc: number;
  count: number;
}

export type DonationCurrencyTotals = Record<DonationCurrency, DonationCurrencyTotal>;

export function formatUsdAmount(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const isWhole = Math.abs(n - Math.round(n)) < 0.005;
  return `${n
    .toLocaleString('fr-FR', {
      minimumFractionDigits: isWhole ? 0 : 2,
      maximumFractionDigits: 2,
    })
    .replace(/ /g, ' ')} $`;
}

export function formatDonationAmount(amount: number, currency: DonationCurrency): string {
  return currency === 'USD' ? formatUsdAmount(amount) : formatFc(Math.round(amount));
}

/** Contre-valeur approximative d’un montant FC en dollars (affichage). */
export function fcToUsd(amountFc: number, rate: number): number {
  if (!(amountFc > 0) || !(rate > 0)) return 0;
  return Math.round((amountFc / rate) * 100) / 100;
}

/** Lit une saisie libre : FC = entier, $ = jusqu’à 2 décimales (virgule ou point). */
export function parseDonationInput(raw: string, currency: DonationCurrency): number {
  if (currency === 'USD') {
    const cleaned = raw.replace(/\s/g, '').replace(',', '.').replace(/[^\d.]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  }
  const n = Number(raw.replace(/\D/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Garde ce que l’utilisateur tape dans le champ montant selon la devise. */
export function sanitizeDonationInput(raw: string, currency: DonationCurrency): string {
  if (currency === 'USD') {
    const cleaned = raw.replace(/[^\d.,]/g, '').replace(',', '.');
    const [int, ...rest] = cleaned.split('.');
    return rest.length > 0 ? `${int}.${rest.join('').slice(0, 2)}` : int;
  }
  return raw.replace(/\D/g, '');
}

export function resolveDonationOptions(
  config: {
    minAmountFc?: number;
    suggestedAmountsFc?: number[];
    minAmountUsd?: number;
    suggestedAmountsUsd?: number[];
  } | null | undefined,
  currency: DonationCurrency,
): { min: number; suggested: number[] } {
  if (currency === 'USD') {
    const min = config?.minAmountUsd && config.minAmountUsd > 0 ? config.minAmountUsd : DEFAULT_MIN_DONATION_USD;
    const suggested = config?.suggestedAmountsUsd?.length
      ? config.suggestedAmountsUsd
      : DEFAULT_SUGGESTED_DONATIONS_USD.filter((n) => n >= min);
    return { min, suggested };
  }
  const min = config?.minAmountFc && config.minAmountFc > 0 ? config.minAmountFc : 1000;
  const suggested = config?.suggestedAmountsFc?.length
    ? config.suggestedAmountsFc
    : [2500, 5000, 10000, 25000, 50000];
  return { min, suggested };
}

/** « 120 000 FC et 45 $ » à partir des totaux par devise. */
export function formatDonationTotals(totals: DonationCurrencyTotals | null | undefined): string | null {
  if (!totals) return null;
  const parts: string[] = [];
  if (totals.CDF?.count > 0) parts.push(formatFc(totals.CDF.amount));
  if (totals.USD?.count > 0) parts.push(formatUsdAmount(totals.USD.amount));
  return parts.length > 0 ? parts.join(' + ') : null;
}
