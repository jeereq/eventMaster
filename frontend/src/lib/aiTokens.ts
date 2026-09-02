export const MAX_FREE_TRIALS = 10;
export const AI_TOKEN_PACK_SIZE = 20;
export const AI_TOKEN_PACK_PRICE_FC = 2000;

export const STORAGE_KEY_AI_TRIALS = 'em_ai_free_trials_count';
export const STORAGE_KEY_AI_BONUS_TOKENS = 'em_ai_bonus_tokens';

export interface AiAllowance {
  freeTrialsUsed: number;
  freeTrialsMax: number;
  freeRemaining: number;
  bonusTokens: number;
  totalRemaining: number;
  canSimulate: boolean;
}

/**
 * Récupère le solde actuel de simulations (10 essais gratuits + jetons achetés).
 */
export function getAiSimulationAllowance(): AiAllowance {
  let freeTrialsUsed = 0;
  let bonusTokens = 0;

  try {
    if (typeof window !== 'undefined') {
      const storedTrials = parseInt(localStorage.getItem(STORAGE_KEY_AI_TRIALS) || '0', 10);
      freeTrialsUsed = Number.isFinite(storedTrials) ? Math.max(0, storedTrials) : 0;

      const storedBonus = parseInt(localStorage.getItem(STORAGE_KEY_AI_BONUS_TOKENS) || '0', 10);
      bonusTokens = Number.isFinite(storedBonus) ? Math.max(0, storedBonus) : 0;
    }
  } catch {
    // Fallback safe si localStorage est désactivé
  }

  const freeRemaining = Math.max(0, MAX_FREE_TRIALS - freeTrialsUsed);
  const totalRemaining = freeRemaining + bonusTokens;

  return {
    freeTrialsUsed,
    freeTrialsMax: MAX_FREE_TRIALS,
    freeRemaining,
    bonusTokens,
    totalRemaining,
    canSimulate: totalRemaining > 0,
  };
}

/**
 * Consomme 1 crédit de simulation IA (priorité aux jetons achetés puis aux essais gratuits).
 */
export function consumeAiSimulation(): AiAllowance {
  let { freeTrialsUsed, bonusTokens } = getAiSimulationAllowance();

  if (bonusTokens > 0) {
    bonusTokens -= 1;
  } else {
    freeTrialsUsed += 1;
  }

  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_AI_TRIALS, String(freeTrialsUsed));
      localStorage.setItem(STORAGE_KEY_AI_BONUS_TOKENS, String(bonusTokens));
    }
  } catch {
    // Ignorer si impossible d'écrire
  }

  return getAiSimulationAllowance();
}

/**
 * Crédite des jetons de simulation supplémentaires (ex: 20 jetons pour 2000 FC).
 */
export function addPurchasedAiTokens(amount = AI_TOKEN_PACK_SIZE): AiAllowance {
  const current = getAiSimulationAllowance();
  const nextBonus = current.bonusTokens + Math.max(1, amount);

  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_AI_BONUS_TOKENS, String(nextBonus));
    }
  } catch {
    // Ignorer si impossible d'écrire
  }

  return getAiSimulationAllowance();
}
