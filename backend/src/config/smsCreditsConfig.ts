import { isB2cPlanKey, normalizePlanKey } from './plansConfig.ts';

/**
 * Crédits SMS : chaque forfait inclut un quota de SMS par période ; au-delà, l'organisation
 * achète des packs au prix coûtant plus une marge légère (7 à 14 % après frais de paiement).
 * Les crédits achetés sont valables 12 mois, non remboursables, et survivent à un changement de forfait.
 */

export const SMS_CREDIT_VALIDITY_MONTHS = 12;
/** Coût réel d'un SMS chez le fournisseur (USD). */
export const SMS_UNIT_COST_USD = 0.03;
/** Taux de change retenu pour fixer les prix des packs (FC pour 1 USD). */
export const SMS_PRICING_FX_CDF = 2270;
/** Frais FlexPay estimés sur l'encaissement. */
export const SMS_PAYMENT_FEE_RATE = 0.03;
/** Part du quota inclus à partir de laquelle l'organisation est prévenue. */
export const SMS_LOW_THRESHOLD = 0.8;

export interface SmsCreditPack {
  id: string;
  smsCount: number;
  priceFc: number;
}

/** Prix = coût × coefficient (1,155 à 1,10 selon le volume), arrondi au 500 FC supérieur. */
export const SMS_CREDIT_PACKS: readonly SmsCreditPack[] = [
  { id: 'sms_50', smsCount: 50, priceFc: 4000 },
  { id: 'sms_100', smsCount: 100, priceFc: 8000 },
  { id: 'sms_250', smsCount: 250, priceFc: 19500 },
  { id: 'sms_500', smsCount: 500, priceFc: 38500 },
  { id: 'sms_1000', smsCount: 1000, priceFc: 75000 },
];

export function getSmsCreditPack(packId: unknown): SmsCreditPack | null {
  return SMS_CREDIT_PACKS.find((pack) => pack.id === packId) ?? null;
}

/** SMS inclus par période (mois ; trimestre pour les forfaits Particulier). */
export const PLAN_SMS_INCLUDED: Record<string, number> = {
  FREE: 0,
  PERSONAL_50: 75,
  PERSONAL_100: 150,
  PERSONAL_200: 300,
  PERSONAL_PLUS: 810,
  STANDARD: 100,
  PREMIUM_1: 150,
  PREMIUM_2: 250,
  ENTERPRISE_1: 500,
  ENTERPRISE_2: 700,
  ENTERPRISE_3: 900,
  CUSTOM: 1200,
  VENUE: 0,
  SERVICE: 0,
  CATALOG: 0,
};

export function smsIncludedForPlan(plan?: string | null): number {
  return PLAN_SMS_INCLUDED[normalizePlanKey(String(plan || 'FREE'))] ?? 0;
}

/** Période de décompte du quota inclus : trimestre civil pour les Particuliers, mois civil sinon. */
export function smsPeriodKey(plan: string | null | undefined, date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  if (isB2cPlanKey(String(plan || 'FREE'))) return `${year}-Q${Math.floor(month / 3) + 1}`;
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function addMonthsUtc(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}

/** Marge d'un pack après frais de paiement, à un coût et un taux donnés. */
export function smsPackMargin(
  pack: SmsCreditPack,
  costUsd: number = SMS_UNIT_COST_USD,
  fxRateCdf: number = SMS_PRICING_FX_CDF,
  feeRate: number = SMS_PAYMENT_FEE_RATE,
) {
  const realCostFc = pack.smsCount * costUsd * fxRateCdf;
  const netFc = pack.priceFc * (1 - feeRate);
  const gainFc = netFc - realCostFc;
  return { realCostFc, netFc, gainFc, marginRate: realCostFc > 0 ? gainFc / realCostFc : 0 };
}
