export type FlexPayChargeCurrency = 'CDF' | 'USD';

export function resolveUsdExchangeRateCdf(value: unknown, fallback = 2800): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

/** Carte = toujours FC. Mobile Money accepte FC ou USD. */
export function parseFlexPayChargeCurrency(
  raw: unknown,
  method: 'mobile' | 'card' = 'mobile',
): FlexPayChargeCurrency {
  if (method !== 'mobile') return 'CDF';
  const value = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  if (value === 'USD' || value === 'DOLLAR' || value === 'DOLLARS' || value === '$') return 'USD';
  return 'CDF';
}

export function convertFcToUsd(amountFc: number, rate: number): number {
  if (!(amountFc > 0) || !(rate > 0)) return 0;
  return Math.round((amountFc / rate) * 100) / 100;
}

export function formatFlexPayApiAmount(amount: number, currency: FlexPayChargeCurrency): string {
  if (currency === 'USD') {
    const usd = Math.round(amount * 100) / 100;
    if (usd < 0.01) {
      throw new Error('Ce montant est trop faible pour un paiement en dollars. Choisissez les francs.');
    }
    return usd.toFixed(2);
  }
  return String(Math.max(1, Math.round(amount)));
}

export function resolveFlexPayCharge(
  amountFc: number,
  currency: FlexPayChargeCurrency,
  usdExchangeRateCdf: unknown,
): { currency: FlexPayChargeCurrency; amount: number; rate: number } {
  const rate = resolveUsdExchangeRateCdf(usdExchangeRateCdf);
  if (currency === 'USD') {
    const amount = convertFcToUsd(amountFc, rate);
    if (amount < 0.01) {
      throw new Error('Ce montant est trop faible pour un paiement en dollars. Choisissez les francs.');
    }
    return { currency: 'USD', amount, rate };
  }
  return { currency: 'CDF', amount: Math.max(1, Math.round(amountFc)), rate };
}
