export type AiTokenAction =
  | 'budget_simulation'
  | 'invitation_compose'
  | 'room_plan_from_photo'
  | 'recharge'
  | 'grant';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function resolveLedgerAction(action?: AiTokenAction | null): AiTokenAction {
  return action || 'budget_simulation';
}

export function parseUtcDayStart(value: string): Date | undefined {
  const raw = value.trim();
  if (!raw) return undefined;
  const d = ISO_DAY.test(raw) ? new Date(`${raw}T00:00:00.000Z`) : new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function parseUtcDayEnd(value: string): Date | undefined {
  const raw = value.trim();
  if (!raw) return undefined;
  const d = ISO_DAY.test(raw) ? new Date(`${raw}T23:59:59.999Z`) : new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function utcDayKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function bucketLedgerByUtcDay(
  rows: Array<{ createdAt: Date; tokensDelta: number }>,
): Array<{ day: string; consumed: number; credited: number; moves: number }> {
  const map = new Map<string, { consumed: number; credited: number; moves: number }>();
  for (const row of rows) {
    const day = utcDayKey(row.createdAt);
    const current = map.get(day) || { consumed: 0, credited: 0, moves: 0 };
    current.moves += 1;
    if (row.tokensDelta < 0) current.consumed += -row.tokensDelta;
    if (row.tokensDelta > 0) current.credited += row.tokensDelta;
    map.set(day, current);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, values]) => ({ day, ...values }));
}

export const USD_TO_CDF_RATE = 2800;
export const TOKEN_PRICE_CDF = 416; // 2 jetons = 832 FC ≈ 0,30 $ USD

export type ComposeGenerationDetails = {
  speedMode: 'fast' | 'quality';
  speedModeLabel: string;
  variantsCount: number;
  safetyFallbackTriggered: boolean;
  previewImageUrl: string | null;
  prompt: string | null;
  estimatedCostUsd: number;
  estimatedCostFc: number;
  estimatedRevenueUsd: number;
  estimatedRevenueFc: number;
  estimatedMarginUsd: number;
  estimatedMarginPct: number;
};

export type GenerationEconomyReport = {
  totalGenerations: number;
  fastGenerations: number;
  qualityGenerations: number;
  multiVariantsGenerations: number;
  safetyFallbackGenerations: number;
  estimatedCostUsd: number;
  estimatedCostFc: number;
  estimatedRevenueUsd: number;
  estimatedRevenueFc: number;
  estimatedMarginUsd: number;
  estimatedMarginPct: number;
};

export function estimateComposeCostAndMargin(params: {
  speedMode?: string | null;
  variantsCount?: number | null;
  safetyFallbackTriggered?: boolean | null;
  tokensConsumed?: number | null;
  rateCdf?: number;
}): {
  speedMode: 'fast' | 'quality';
  speedModeLabel: string;
  variantsCount: number;
  safetyFallbackTriggered: boolean;
  estimatedCostUsd: number;
  estimatedCostFc: number;
  estimatedRevenueUsd: number;
  estimatedRevenueFc: number;
  estimatedMarginUsd: number;
  estimatedMarginPct: number;
} {
  const rate = params.rateCdf || USD_TO_CDF_RATE;
  const isFast = params.speedMode === 'fast';
  const speedMode: 'fast' | 'quality' = isFast ? 'fast' : 'quality';
  const speedModeLabel = isFast ? '⚡ Rapide (Flash)' : '✨ Qualité (Pro 2K)';
  const variantsCount = Math.max(1, params.variantsCount ?? 1);
  const safetyFallbackTriggered = Boolean(params.safetyFallbackTriggered);

  // Coût API unitaire estimé (USD) par image
  const unitImageCost = isFast ? 0.030 : 0.065;
  const overheadVisionCost = 0.002; // reformulation & analyse vision OCR

  // Si repli de sécurité, une tentative initiale a été exécutée puis un décor de secours a été généré
  const totalCalls = variantsCount + (safetyFallbackTriggered ? 1 : 0);
  const rawCostUsd = totalCalls * unitImageCost + overheadVisionCost;
  const estimatedCostUsd = Math.round(rawCostUsd * 1000) / 1000;
  const estimatedCostFc = Math.round(estimatedCostUsd * rate);

  // Recette facturée (2 jetons par génération = 832 FC par défaut)
  const tokens = Math.abs(params.tokensConsumed ?? 2) || 2;
  const estimatedRevenueFc = tokens * TOKEN_PRICE_CDF;
  const estimatedRevenueUsd = Math.round((estimatedRevenueFc / rate) * 1000) / 1000;

  const estimatedMarginUsd = Math.round((estimatedRevenueUsd - estimatedCostUsd) * 1000) / 1000;
  const estimatedMarginPct =
    estimatedRevenueUsd > 0
      ? Math.round((estimatedMarginUsd / estimatedRevenueUsd) * 100)
      : 0;

  return {
    speedMode,
    speedModeLabel,
    variantsCount,
    safetyFallbackTriggered,
    estimatedCostUsd,
    estimatedCostFc,
    estimatedRevenueUsd,
    estimatedRevenueFc,
    estimatedMarginUsd,
    estimatedMarginPct,
  };
}

