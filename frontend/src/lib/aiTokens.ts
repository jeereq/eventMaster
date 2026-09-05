export const MAX_FREE_TRIALS = 4;
export const DEFAULT_AI_TOKEN_PRICE_FC = 416;
export const DEFAULT_AI_TOKEN_MIN_AMOUNT_FC = 2500;
/** Référence tarifaire par défaut : 2 500 FC ≈ 6 jetons. */
export const AI_TOKEN_BASE_COUNT = 6;
export const AI_TOKEN_BASE_PRICE_FC = 2500;
export const AI_TOKEN_MIN_AMOUNT_FC = DEFAULT_AI_TOKEN_MIN_AMOUNT_FC;
export const AI_TOKEN_MIN_COUNT = 6;
export const AI_TOKEN_PACK_SIZE = 6;
export const AI_TOKEN_PACK_PRICE_FC = DEFAULT_AI_TOKEN_MIN_AMOUNT_FC;
/** 1 jeton = 1 simulation budget. */
export const AI_SIMULATION_TOKEN_COST = 1;
/** 2 jetons = 1 génération d’invitation (image). */
export const AI_INVITATION_COMPOSE_TOKEN_COST = 2;
/** 3 jetons = 1 composition ou lecture de plan de salle. */
export const AI_ROOM_PLAN_TOKEN_COST = 3;

export type AiTokenPricing = {
  priceCdf: number;
  minAmountCdf: number;
  minCount: number;
};

export function resolveAiTokenPricing(site?: {
  aiTokenPriceCdf?: number;
  aiTokenMinPurchaseCdf?: number;
} | null): AiTokenPricing {
  const priceCdf = Math.round(Number(site?.aiTokenPriceCdf));
  const safePrice = Number.isFinite(priceCdf) && priceCdf >= 1 ? Math.min(1_000_000, priceCdf) : DEFAULT_AI_TOKEN_PRICE_FC;
  const minRaw = Math.round(Number(site?.aiTokenMinPurchaseCdf));
  const minAmountCdf = Number.isFinite(minRaw) && minRaw >= safePrice
    ? Math.min(100_000_000, minRaw)
    : Math.max(DEFAULT_AI_TOKEN_MIN_AMOUNT_FC, safePrice);
  return {
    priceCdf: safePrice,
    minAmountCdf,
    minCount: Math.max(1, Math.floor(minAmountCdf / safePrice)),
  };
}

export function aiTokenCostLegend(): string {
  return `${AI_SIMULATION_TOKEN_COST} jeton = budget · ${AI_INVITATION_COMPOSE_TOKEN_COST} = invitation · ${AI_ROOM_PLAN_TOKEN_COST} = plan de salle`;
}

export function canAffordAiAction(
  allowance: Pick<AiAllowance, 'totalRemaining' | 'unlimited'>,
  cost: number,
): boolean {
  if (allowance.unlimited) return true;
  return allowance.totalRemaining >= Math.max(1, cost);
}

export function calculateTokensForAmount(
  amountFc: number,
  pricing: AiTokenPricing = resolveAiTokenPricing(),
): number {
  if (!Number.isFinite(amountFc) || amountFc < pricing.minAmountCdf) {
    return pricing.minCount;
  }
  return Math.max(pricing.minCount, Math.floor(amountFc / pricing.priceCdf));
}

export function calculateAmountForTokens(
  tokensCount: number,
  pricing: AiTokenPricing = resolveAiTokenPricing(),
): number {
  const count = Math.max(pricing.minCount, Math.round(tokensCount || pricing.minCount));
  return Math.max(pricing.minAmountCdf, count * pricing.priceCdf);
}

export function calculateNextTokenAmount(
  amountFc: number,
  pricing: AiTokenPricing = resolveAiTokenPricing(),
): number | null {
  if (!Number.isFinite(amountFc) || amountFc < pricing.minAmountCdf) {
    return pricing.minAmountCdf;
  }
  const currentTokens = calculateTokensForAmount(amountFc, pricing);
  return calculateAmountForTokens(currentTokens + 1, pricing);
}

export function aiTokenAmountPresets(pricing: AiTokenPricing = resolveAiTokenPricing()): number[] {
  return [1, 2, 3, 4].map((factor) => pricing.minAmountCdf * factor);
}

export const STORAGE_KEY_AI_DEVICE_ID = 'em_ai_device_id';
export const STORAGE_KEY_AI_TRIALS = 'em_ai_free_trials_count';
export const STORAGE_KEY_AI_BONUS_TOKENS = 'em_ai_bonus_tokens';
export const STORAGE_KEY_AI_CREDITED_ORDERS = 'em_ai_credited_orders';
export const STORAGE_KEY_AI_GRANTED_TOKENS = 'em_ai_granted_tokens';
export const AI_ALLOWANCE_CHANGED = 'em-ai-allowance-changed';

export interface AiAllowance {
  deviceId: string;
  freeTrialsUsed: number;
  freeTrialsMax: number;
  freeRemaining: number;
  bonusTokens: number;
  grantedTokens: number;
  totalRemaining: number;
  canSimulate: boolean;
  unlimited: boolean;
}

let sessionUnlimited = false;

export function setAiTokenSessionUnlimited(value: boolean) {
  sessionUnlimited = Boolean(value);
  if (typeof window !== 'undefined') {
    emitAllowanceChanged(getAiSimulationAllowance());
  }
}

/**
 * Récupère ou génère un identifiant unique persistant et rattaché à cet appareil (device).
 * Stocké à la fois en localStorage et dans un cookie à longue durée (1 an).
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server_placeholder_device';

  try {
    // 1) Vérifier localStorage
    let deviceId = localStorage.getItem(STORAGE_KEY_AI_DEVICE_ID);
    if (deviceId && deviceId.trim()) {
      persistDeviceCookie(deviceId.trim());
      return deviceId.trim();
    }

    // 2) Vérifier cookie
    const match = document.cookie.match(new RegExp('(^|;\\s*)em_ai_device_id=([^;]*)'));
    if (match && match[2]) {
      deviceId = decodeURIComponent(match[2]);
      localStorage.setItem(STORAGE_KEY_AI_DEVICE_ID, deviceId);
      return deviceId;
    }

    // 3) Générer un nouvel identifiant d'appareil
    const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const newId = `dev_${Date.now()}_${randomHex}`;
    localStorage.setItem(STORAGE_KEY_AI_DEVICE_ID, newId);
    persistDeviceCookie(newId);
    return newId;
  } catch {
    return 'fallback_device_local';
  }
}

function persistDeviceCookie(deviceId: string) {
  try {
    if (typeof document !== 'undefined') {
      const oneYear = 60 * 60 * 24 * 365;
      document.cookie = `em_ai_device_id=${encodeURIComponent(deviceId)}; max-age=${oneYear}; path=/; SameSite=Lax`;
    }
  } catch {
    // safe fallback
  }
}

function emitAllowanceChanged(allowance: AiAllowance) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(AI_ALLOWANCE_CHANGED, { detail: allowance }));
  } catch {
    /* ignore */
  }
}

function writeLocalAllowance(freeTrialsUsed: number, bonusTokens: number, grantedTokens = 0) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_AI_TRIALS, String(Math.max(0, freeTrialsUsed)));
      localStorage.setItem(STORAGE_KEY_AI_BONUS_TOKENS, String(Math.max(0, bonusTokens)));
      localStorage.setItem(STORAGE_KEY_AI_GRANTED_TOKENS, String(Math.max(0, grantedTokens)));
    }
  } catch {
    /* ignore */
  }
}

/**
 * Récupère la liste des identifiants de commandes déjà créditées sur cet appareil.
 */
export function getCreditedOrders(): string[] {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_AI_CREDITED_ORDERS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {
    // safe fallback
  }
  return [];
}

/**
 * Récupère le solde actuel de simulations (cache local ; la vérité est le portefeuille serveur).
 */
export function getAiSimulationAllowance(): AiAllowance {
  
  let freeTrialsUsed = 0;
  let bonusTokens = 0;
  let grantedTokens = 0;
  const deviceId = getOrCreateDeviceId();

  try {
    if (typeof window !== 'undefined') {
      const storedTrials = parseInt(localStorage.getItem(STORAGE_KEY_AI_TRIALS) || '0', 10);
      freeTrialsUsed = Number.isFinite(storedTrials) ? Math.max(0, storedTrials) : 0;

      const storedBonus = parseInt(localStorage.getItem(STORAGE_KEY_AI_BONUS_TOKENS) || '0', 10);
      bonusTokens = Number.isFinite(storedBonus) ? Math.max(0, storedBonus) : 0;

      const storedGranted = parseInt(localStorage.getItem(STORAGE_KEY_AI_GRANTED_TOKENS) || '0', 10);
      grantedTokens = Number.isFinite(storedGranted) ? Math.max(0, storedGranted) : 0;
    }
  } catch {
    // Fallback safe si localStorage est désactivé
  }

  const freeRemaining = Math.max(0, MAX_FREE_TRIALS - freeTrialsUsed);
  const totalRemaining = freeRemaining + bonusTokens + grantedTokens;

  return {
    deviceId,
    freeTrialsUsed,
    freeTrialsMax: MAX_FREE_TRIALS,
    freeRemaining,
    bonusTokens,
    grantedTokens,
    totalRemaining,
    canSimulate: sessionUnlimited || totalRemaining > 0,
    unlimited: sessionUnlimited,
  };
}

/** Applique le solde renvoyé par l’API et met à jour le cache hors-ligne. */
export function applyServerAllowance(data: Partial<AiAllowance> | null | undefined): AiAllowance {
  if (!data || typeof data !== 'object') return getAiSimulationAllowance();
  const current = getAiSimulationAllowance();
  const freeTrialsUsed = typeof data.freeTrialsUsed === 'number'
    ? Math.max(0, data.freeTrialsUsed)
    : current.freeTrialsUsed;
  const bonusTokens = typeof data.bonusTokens === 'number'
    ? Math.max(0, data.bonusTokens)
    : current.bonusTokens;
  const grantedTokens = typeof data.grantedTokens === 'number'
    ? Math.max(0, data.grantedTokens)
    : current.grantedTokens;
  if (typeof data.unlimited === 'boolean') {
    sessionUnlimited = data.unlimited;
  }
  writeLocalAllowance(freeTrialsUsed, bonusTokens, grantedTokens);
  const next = getAiSimulationAllowance();
  emitAllowanceChanged(next);
  return next;
}

/**
 * Consomme `count` crédits IA en cache local (hors-ligne / repli).
 * Par défaut 1 (simulation). Les invitations en consomment 2.
 */
export function consumeAiSimulation(count = AI_SIMULATION_TOKEN_COST): AiAllowance {
  if (sessionUnlimited) return getAiSimulationAllowance();
  let { freeTrialsUsed, bonusTokens, grantedTokens } = getAiSimulationAllowance();
  let left = Math.max(1, Math.round(count));

  const fromBonus = Math.min(left, bonusTokens);
  bonusTokens -= fromBonus;
  left -= fromBonus;
  const fromGranted = Math.min(left, grantedTokens);
  grantedTokens -= fromGranted;
  left -= fromGranted;
  if (left > 0) {
    freeTrialsUsed += left;
  }

  writeLocalAllowance(freeTrialsUsed, bonusTokens, grantedTokens);
  const next = getAiSimulationAllowance();
  emitAllowanceChanged(next);
  return next;
}

/**
 * Crédite des jetons de simulation supplémentaires sur cet appareil (ex: 15 jetons pour 2 500 FC).
 * Enregistre également la commande pour éviter tout double crédit.
 */
export function addPurchasedAiTokens(amount = AI_TOKEN_PACK_SIZE, orderId?: string | null): AiAllowance {
  const current = getAiSimulationAllowance();
  const credited = getCreditedOrders();

  // Si l'orderId a déjà été crédité sur cet appareil, on ne le recompte pas
  if (orderId && credited.includes(orderId)) {
    return current;
  }

  const nextBonus = current.bonusTokens + Math.max(1, amount);

  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_AI_BONUS_TOKENS, String(nextBonus));
      if (orderId) {
        credited.push(orderId);
        localStorage.setItem(STORAGE_KEY_AI_CREDITED_ORDERS, JSON.stringify(credited));
      }
    }
  } catch {
    // Ignorer si impossible d'écrire
  }

  const next = getAiSimulationAllowance();
  emitAllowanceChanged(next);
  return next;
}

/**
 * Synchronise le cache local avec le portefeuille serveur (essais + jetons payés restants).
 */
export async function syncDeviceAiTokensWithBackend(apiClient: any): Promise<AiAllowance> {
  const deviceId = getOrCreateDeviceId();
  if (!deviceId || deviceId.startsWith('server_') || !apiClient) {
    return getAiSimulationAllowance();
  }

  try {
    const data = await apiClient.get(`/public/ai-tokens/device/${encodeURIComponent(deviceId)}/balance`);
    if (data && (typeof data.freeTrialsUsed === 'number' || typeof data.bonusTokens === 'number')) {
      return applyServerAllowance(data);
    }
    if (data && typeof data.totalPaidTokens === 'number') {
      const current = getAiSimulationAllowance();
      if (data.totalPaidTokens > current.bonusTokens) {
        const diff = data.totalPaidTokens - current.bonusTokens;
        return addPurchasedAiTokens(diff, `sync_server_${Date.now()}`);
      }
    }
  } catch {
    // safe fallback si hors ligne
  }

  return getAiSimulationAllowance();
}
