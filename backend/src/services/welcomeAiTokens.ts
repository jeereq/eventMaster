import { prisma } from '../db';
import { calculateTokensForAmount, currentAiTokenPricing } from './aiTokenFlexPayService';
import { grantAiTokensToUser, tenantGrantDeviceId } from './aiSimulationWalletService';
import { loadPlatformSettings } from './platformSettingsService';
import {
  resolveWelcomeAudience,
  resolveWelcomeOffer,
  sanitizeWelcomeGrantRules,
  welcomeTokenValueFc,
  type WelcomeAudience,
  type WelcomeGrantMoment,
  type WelcomeOffer,
} from './welcomeAiTokensPolicy';

export {
  WELCOME_TOKEN_VALUE_B2B_FC,
  WELCOME_TOKEN_VALUE_B2C_FC,
  WELCOME_TOKEN_VALUE_ENTERPRISE_FC,
  WELCOME_TOKENS_CATALOG_FAMILY,
  WELCOME_TOKENS_PROTOCOL,
  DEFAULT_WELCOME_GRANT_RULES,
  isEnterprisePlanKey,
  resolveWelcomeAudience,
  resolveWelcomeOffer,
  sanitizeWelcomeGrantRules,
  welcomeTokenValueFc,
  type WelcomeAudience,
  type WelcomeGrantRules,
  type WelcomeOffer,
} from './welcomeAiTokensPolicy';

function currentWelcomeRules() {
  return sanitizeWelcomeGrantRules(loadPlatformSettings().welcomeAiGrants);
}

export function welcomeTokensForAudience(audience: WelcomeAudience): number {
  return calculateTokensForAmount(welcomeTokenValueFc(audience, currentWelcomeRules()), currentAiTokenPricing());
}

export function welcomeTokensForOffer(offer: WelcomeOffer): number {
  if (offer.key === 'none') return 0;
  if (offer.fixedTokens) return offer.tokens;
  return calculateTokensForAmount(offer.valueFc, currentAiTokenPricing());
}

export function welcomeGrantRelatedId(userId: string, offerKey = 'default'): string {
  const id = userId.trim();
  if (offerKey === 'protocol') return `welcome_protocol_${id}`;
  if (offerKey === 'enterprise') return `welcome_enterprise_${id}`;
  if (offerKey === 'manager') return `welcome_manager_${id}`;
  return `welcome_${id}`;
}

export async function grantWelcomeAiTokens(input: {
  userId: string;
  tenantId?: string | null;
  accountKind?: string | null;
  intent?: string | null;
  planKey?: string | null;
  orgRole?: string | null;
  moment?: WelcomeGrantMoment;
}): Promise<{
  audience: WelcomeAudience;
  offer: WelcomeOffer;
  tokensCount: number;
  valueFc: number;
  skipped?: boolean;
}> {
  const moment = input.moment || 'signup';
  const offer = resolveWelcomeOffer(input, { rules: currentWelcomeRules(), moment });
  const audience = resolveWelcomeAudience(input);
  const tokensCount = welcomeTokensForOffer(offer);
  const valueFc = offer.valueFc;

  if (offer.key === 'none' || tokensCount <= 0) {
    return { audience, offer, tokensCount: 0, valueFc, skipped: true };
  }

  const shareDevice =
    offer.shareWithOrg && input.tenantId?.trim()
      ? tenantGrantDeviceId(input.tenantId)
      : undefined;

  try {
    await grantAiTokensToUser({
      userId: input.userId,
      tokensCount,
      adminUserId: input.userId,
      relatedId: welcomeGrantRelatedId(input.userId, offer.key),
      source: 'signup',
      deviceId: shareDevice,
    });
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 409) {
      return { audience, offer, tokensCount, valueFc, skipped: true };
    }
    throw error;
  }

  return { audience, offer, tokensCount, valueFc };
}

/** Crédite l’offre dont le moment est l’activation d’un forfait payant (complément si déjà offert à l’inscription). */
export async function grantWelcomeAtPlanActivation(input: {
  userId: string;
  tenantId: string;
  planKey?: string | null;
  accountKind?: string | null;
}): Promise<{ tokensCount: number; skipped?: boolean }> {
  const ownerId = input.userId.trim();
  const tenantId = input.tenantId.trim();
  if (!ownerId || !tenantId) return { tokensCount: 0, skipped: true };

  const rules = currentWelcomeRules();
  const offer = resolveWelcomeOffer(
    { accountKind: input.accountKind, planKey: input.planKey },
    { rules, moment: 'plan_activation' },
  );
  const targetTokens = welcomeTokensForOffer(offer);
  if (offer.key === 'none' || targetTokens <= 0) {
    return { tokensCount: 0, skipped: true };
  }

  const relatedId = welcomeGrantRelatedId(ownerId, offer.key);
  const alreadyThisOffer = await prisma.aiTokenLedger.findFirst({
    where: { action: 'grant', relatedId },
    select: { id: true },
  });
  if (alreadyThisOffer) return { tokensCount: 0, skipped: true };

  const prior = await prisma.aiTokenLedger.findMany({
    where: {
      action: 'grant',
      relatedId: {
        in: [
          welcomeGrantRelatedId(ownerId),
          welcomeGrantRelatedId(ownerId, 'b2c'),
          welcomeGrantRelatedId(ownerId, 'b2b'),
          welcomeGrantRelatedId(ownerId, 'catalog'),
          welcomeGrantRelatedId(ownerId, 'enterprise'),
        ],
      },
    },
    select: { tokensDelta: true },
  });
  const already = prior.reduce((sum, row) => sum + Math.max(0, row.tokensDelta ?? 0), 0);
  const tokensCount = targetTokens - already;
  if (tokensCount <= 0) return { tokensCount: 0, skipped: true };

  try {
    await grantAiTokensToUser({
      userId: ownerId,
      tokensCount,
      adminUserId: ownerId,
      relatedId,
      source: 'signup',
      deviceId: tenantGrantDeviceId(tenantId),
    });
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 409) return { tokensCount, skipped: true };
    throw error;
  }

  return { tokensCount };
}

export async function grantEnterpriseWelcomeUpgrade(input: {
  userId: string;
  tenantId: string;
  planKey?: string | null;
  accountKind?: string | null;
}) {
  return grantWelcomeAtPlanActivation(input);
}
