/**
 * Dons en deux devises : francs congolais (CDF) ou dollars américains (USD).
 *
 * Le donateur choisit sa devise et saisit son montant dans cette devise. FlexPay
 * (Mobile Money comme carte) est débité exactement dans la devise choisie, sans
 * reconversion. La commande garde :
 * - `amountFc` : contre-valeur en FC (taux Superadmin du moment) pour les cumuls,
 *   l’objectif de collecte et les reversements existants ;
 * - `selectedSeats.donationCurrency` / `donationAmount` : la devise et le montant
 *   réellement versés, pour l’affichage et les totaux par devise.
 */
import { resolveUsdExchangeRateCdf, type FlexPayChargeCurrency } from './flexPayChargeCurrency.ts';

export type DonationCurrency = FlexPayChargeCurrency;

export const DONATION_CURRENCIES: readonly DonationCurrency[] = ['CDF', 'USD'];
export const DEFAULT_MIN_DONATION_USD = 1;
export const DEFAULT_SUGGESTED_DONATIONS_USD = [5, 10, 20, 50, 100];

export function parseDonationCurrency(raw: unknown): DonationCurrency {
  const value = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  if (value === 'USD' || value === 'DOLLAR' || value === 'DOLLARS' || value === '$') return 'USD';
  return 'CDF';
}

export function roundUsd(value: number): number {
  return Math.round(value * 100) / 100;
}

export function sanitizeMinDonationUsd(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? roundUsd(n) : DEFAULT_MIN_DONATION_USD;
}

export function sanitizeSuggestedDonationsUsd(raw: unknown, minAmountUsd: number): number[] {
  const list = Array.isArray(raw) ? raw : [];
  const valid = [
    ...new Set(
      list
        .map((n) => roundUsd(Number(n)))
        .filter((n) => Number.isFinite(n) && n >= minAmountUsd && n <= 100000),
    ),
  ].sort((a, b) => a - b);
  if (valid.length > 0) return valid.slice(0, 8);
  const defaults = DEFAULT_SUGGESTED_DONATIONS_USD.filter((n) => n >= minAmountUsd);
  return defaults.length > 0 ? defaults : [minAmountUsd];
}

export function formatDonationAmount(amount: number, currency: DonationCurrency): string {
  if (currency === 'USD') {
    return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
  }
  return `${Math.round(amount).toLocaleString('fr-FR')} FC`;
}

export type ResolvedDonationAmount =
  | {
      ok: true;
      currency: DonationCurrency;
      /** Montant versé dans la devise choisie (FC entiers, ou dollars à 2 décimales). */
      amount: number;
      /** Contre-valeur en FC (entier). */
      amountFc: number;
      /** Taux utilisé (FC pour 1 $). */
      rate: number;
    }
  | { ok: false; error: string };

/**
 * Lit le montant d’un don depuis le corps de requête.
 * - `currency` = 'USD' → `amount` (ou `amountUsd`) en dollars ;
 * - sinon → `amount` / `amountFc` / `donationAmountFc` en FC (rétrocompatible).
 */
export function resolveDonationAmount(input: {
  body: Record<string, unknown> | null | undefined;
  minAmountFc: number;
  minAmountUsd: number;
  usdExchangeRateCdf: unknown;
}): ResolvedDonationAmount {
  const body = input.body || {};
  const currency = parseDonationCurrency(body.currency ?? body.donationCurrency);
  const rate = resolveUsdExchangeRateCdf(input.usdExchangeRateCdf);

  if (currency === 'USD') {
    const raw = Number(body.amount ?? body.amountUsd ?? body.donationAmount);
    const minUsd = input.minAmountUsd > 0 ? input.minAmountUsd : DEFAULT_MIN_DONATION_USD;
    if (!Number.isFinite(raw) || raw < minUsd) {
      return { ok: false, error: `Le montant minimum pour un don en dollars est de ${formatDonationAmount(minUsd, 'USD')}.` };
    }
    if (raw > 1_000_000) {
      return { ok: false, error: 'Montant trop élevé pour un don en ligne.' };
    }
    const amount = roundUsd(raw);
    return { ok: true, currency, amount, amountFc: Math.max(1, Math.round(amount * rate)), rate };
  }

  const raw = Number(body.amount ?? body.amountFc ?? body.donationAmountFc);
  if (!Number.isFinite(raw) || raw < input.minAmountFc) {
    return {
      ok: false,
      error: `Le montant minimum pour un don est de ${formatDonationAmount(input.minAmountFc, 'CDF')}.`,
    };
  }
  const amount = Math.round(raw);
  return { ok: true, currency, amount, amountFc: amount, rate };
}

/** Champs à ranger dans `selectedSeats` d’une commande de don. */
export function donationCurrencyMeta(resolved: Extract<ResolvedDonationAmount, { ok: true }>) {
  return {
    donationCurrency: resolved.currency,
    donationAmount: resolved.amount,
    usdExchangeRateCdf: resolved.rate,
  };
}

/** Devise et montant réellement versés (anciennes commandes = FC). */
export function readDonationCurrency(
  selectedSeats: unknown,
  amountFc: number,
): { currency: DonationCurrency; amount: number } {
  if (selectedSeats && typeof selectedSeats === 'object' && !Array.isArray(selectedSeats)) {
    const raw = selectedSeats as Record<string, unknown>;
    if (parseDonationCurrency(raw.donationCurrency) === 'USD') {
      const amount = Number(raw.donationAmount);
      if (Number.isFinite(amount) && amount > 0) return { currency: 'USD', amount: roundUsd(amount) };
    }
  }
  return { currency: 'CDF', amount: amountFc };
}

export interface DonationCurrencyTotal {
  /** Montant cumulé dans la devise (FC ou $). */
  amount: number;
  /** Contre-valeur en FC. */
  amountFc: number;
  count: number;
}

export type DonationCurrencyTotals = Record<DonationCurrency, DonationCurrencyTotal>;

export function emptyDonationCurrencyTotals(): DonationCurrencyTotals {
  return {
    CDF: { amount: 0, amountFc: 0, count: 0 },
    USD: { amount: 0, amountFc: 0, count: 0 },
  };
}

export function addToDonationCurrencyTotals(
  totals: DonationCurrencyTotals,
  order: { selectedSeats: unknown; amountFc: number },
): DonationCurrencyTotals {
  const { currency, amount } = readDonationCurrency(order.selectedSeats, order.amountFc);
  const bucket = totals[currency];
  bucket.amount = currency === 'USD' ? roundUsd(bucket.amount + amount) : bucket.amount + amount;
  bucket.amountFc += order.amountFc;
  bucket.count += 1;
  return totals;
}

export function summarizeDonationCurrencies(
  orders: Array<{ selectedSeats: unknown; amountFc: number }>,
): DonationCurrencyTotals {
  return orders.reduce(addToDonationCurrencyTotals, emptyDonationCurrencyTotals());
}
