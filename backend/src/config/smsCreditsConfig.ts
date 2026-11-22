import { isB2cPlanKey, normalizePlanKey, PLAN_KEYS } from './plansConfig.ts';

/**
 * Crédits SMS : chaque forfait inclut un quota de SMS par période ; au-delà, l'organisation
 * achète des packs au prix coûtant plus une marge légère. Les crédits achetés sont valables
 * 12 mois par défaut, non remboursables, et survivent à un changement de forfait.
 * Tous les chiffres sont des réglages administrateur ; ceux-ci sont les valeurs par défaut.
 */

export interface SmsPackSetting {
  smsCount: number;
  /** Prix = coût réel × coefficient (1,15 = 15 % de marge brute avant frais de paiement). */
  coefficient: number;
}

export interface SmsCreditSettings {
  /** Coût réel d'un SMS chez le fournisseur (USD). */
  unitCostUsd: number;
  /** Taux de change retenu pour fixer les prix des packs (FC pour 1 USD). */
  fxRateCdf: number;
  /** Frais de paiement FlexPay estimés sur l'encaissement (0 à 0,2). */
  paymentFeeRate: number;
  /** Les prix des packs sont arrondis au multiple supérieur de ce montant (FC). */
  roundingFc: number;
  /** Durée de validité des crédits achetés (mois). */
  validityMonths: number;
  /** Part du quota inclus à partir de laquelle l'organisation est prévenue. */
  lowThreshold: number;
  packs: SmsPackSetting[];
  /** SMS inclus par période (mois ; trimestre pour les Particuliers), par forfait. */
  included: Record<string, number>;
}

/** SMS inclus par défaut. */
export const DEFAULT_PLAN_SMS_INCLUDED: Record<string, number> = {
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

export const DEFAULT_SMS_CREDIT_SETTINGS: SmsCreditSettings = {
  unitCostUsd: 0.03,
  fxRateCdf: 2270,
  paymentFeeRate: 0.03,
  roundingFc: 500,
  validityMonths: 12,
  lowThreshold: 0.8,
  packs: [
    { smsCount: 50, coefficient: 1.155 },
    { smsCount: 100, coefficient: 1.155 },
    { smsCount: 250, coefficient: 1.14 },
    { smsCount: 500, coefficient: 1.12 },
    { smsCount: 1000, coefficient: 1.1 },
  ],
  included: { ...DEFAULT_PLAN_SMS_INCLUDED },
};

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  return Math.round(clampNumber(value, fallback, min, max));
}

/** Réglages SMS saisis ou stockés : valeurs bornées, packs triés et sans doublon, quotas entiers. */
export function sanitizeSmsCreditSettings(raw: unknown): SmsCreditSettings {
  const d = DEFAULT_SMS_CREDIT_SETTINGS;
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const rawPacks = Array.isArray(src.packs) ? src.packs : null;
  let packs: SmsPackSetting[] = [];
  if (rawPacks) {
    const seen = new Set<number>();
    for (const item of rawPacks.slice(0, 8)) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const smsCount = clampInt(row.smsCount, 0, 0, 100_000);
      if (smsCount < 10 || seen.has(smsCount)) continue;
      seen.add(smsCount);
      packs.push({ smsCount, coefficient: Math.round(clampNumber(row.coefficient, 1.15, 1, 5) * 1000) / 1000 });
    }
  }
  if (packs.length === 0) packs = d.packs.map((p) => ({ ...p }));
  packs.sort((a, b) => a.smsCount - b.smsCount);

  const rawIncluded = src.included && typeof src.included === 'object' ? (src.included as Record<string, unknown>) : {};
  const included: Record<string, number> = {};
  for (const key of PLAN_KEYS) {
    included[key] = clampInt(rawIncluded[key], d.included[key] ?? 0, 0, 1_000_000);
  }

  return {
    unitCostUsd: Math.round(clampNumber(src.unitCostUsd, d.unitCostUsd, 0.001, 5) * 10000) / 10000,
    fxRateCdf: clampInt(src.fxRateCdf, d.fxRateCdf, 500, 100_000),
    paymentFeeRate: Math.round(clampNumber(src.paymentFeeRate, d.paymentFeeRate, 0, 0.2) * 10000) / 10000,
    roundingFc: clampInt(src.roundingFc, d.roundingFc, 1, 10_000),
    validityMonths: clampInt(src.validityMonths, d.validityMonths, 1, 60),
    lowThreshold: Math.round(clampNumber(src.lowThreshold, d.lowThreshold, 0.1, 1) * 100) / 100,
    packs,
    included,
  };
}

export interface SmsCreditPack {
  id: string;
  smsCount: number;
  priceFc: number;
}

/** Packs proposés : prix = coût réel × coefficient, arrondi au multiple supérieur de l'arrondi réglé. */
export function buildSmsCreditPacks(settings: SmsCreditSettings = DEFAULT_SMS_CREDIT_SETTINGS): SmsCreditPack[] {
  const unitCostFc = settings.unitCostUsd * settings.fxRateCdf;
  return settings.packs.map((pack) => {
    const raw = pack.smsCount * unitCostFc * pack.coefficient;
    // Les arrondis flottants (ex. 7865,6 / 500) ne doivent pas faire monter d'un palier de trop.
    const priceFc = Math.ceil(Math.round(raw * 1e6) / 1e6 / settings.roundingFc) * settings.roundingFc;
    return { id: `sms_${pack.smsCount}`, smsCount: pack.smsCount, priceFc };
  });
}

export function getSmsCreditPack(
  packId: unknown,
  settings: SmsCreditSettings = DEFAULT_SMS_CREDIT_SETTINGS,
): SmsCreditPack | null {
  return buildSmsCreditPacks(settings).find((pack) => pack.id === packId) ?? null;
}

export function smsIncludedForPlan(
  plan?: string | null,
  settings: SmsCreditSettings = DEFAULT_SMS_CREDIT_SETTINGS,
): number {
  return settings.included[normalizePlanKey(String(plan || 'FREE'))] ?? 0;
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

/** Marge d'un pack après frais de paiement, aux réglages donnés. */
export function smsPackMargin(pack: SmsCreditPack, settings: SmsCreditSettings = DEFAULT_SMS_CREDIT_SETTINGS) {
  const realCostFc = pack.smsCount * settings.unitCostUsd * settings.fxRateCdf;
  const netFc = pack.priceFc * (1 - settings.paymentFeeRate);
  const gainFc = netFc - realCostFc;
  return { realCostFc, netFc, gainFc, marginRate: realCostFc > 0 ? gainFc / realCostFc : 0 };
}
