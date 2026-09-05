import { calculateTokensForAmount, currentAiTokenPricing } from './aiTokenFlexPayService';
import { grantAiTokensToUser } from './aiSimulationWalletService';

export {
  WELCOME_TOKEN_VALUE_B2B_FC,
  WELCOME_TOKEN_VALUE_B2C_FC,
  resolveWelcomeAudience,
  welcomeTokenValueFc,
  type WelcomeAudience,
} from './welcomeAiTokensPolicy';
import {
  WELCOME_TOKEN_VALUE_B2B_FC,
  WELCOME_TOKEN_VALUE_B2C_FC,
  resolveWelcomeAudience,
  welcomeTokenValueFc,
  type WelcomeAudience,
} from './welcomeAiTokensPolicy';

export function welcomeTokensForAudience(audience: WelcomeAudience): number {
  return calculateTokensForAmount(welcomeTokenValueFc(audience), currentAiTokenPricing());
}

export function welcomeGrantRelatedId(userId: string): string {
  return `welcome_${userId.trim()}`;
}

/** Offre de bienvenue : 10 000 FC (B2C) ou 20 000 FC (B2B) convertis au tarif jeton actuel. */
export async function grantWelcomeAiTokens(input: {
  userId: string;
  accountKind?: string | null;
  intent?: string | null;
  planKey?: string | null;
}): Promise<{ audience: WelcomeAudience; tokensCount: number; valueFc: number; skipped?: boolean }> {
  const audience = resolveWelcomeAudience(input);
  const valueFc = welcomeTokenValueFc(audience);
  const tokensCount = welcomeTokensForAudience(audience);

  try {
    await grantAiTokensToUser({
      userId: input.userId,
      tokensCount,
      adminUserId: input.userId,
      relatedId: welcomeGrantRelatedId(input.userId),
      source: 'signup',
    });
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 409) {
      return { audience, tokensCount, valueFc, skipped: true };
    }
    throw error;
  }

  return { audience, tokensCount, valueFc };
}
