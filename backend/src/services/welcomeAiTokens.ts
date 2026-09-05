import { prisma } from '../db';
import { calculateTokensForAmount, currentAiTokenPricing } from './aiTokenFlexPayService';
import { grantAiTokensToUser, tenantGrantDeviceId } from './aiSimulationWalletService';
import {
  isEnterprisePlanKey,
  resolveWelcomeAudience,
  resolveWelcomeOffer,
  welcomeTokenValueFc,
  type WelcomeAudience,
  type WelcomeOffer,
} from './welcomeAiTokensPolicy';

export {
  WELCOME_TOKEN_VALUE_B2B_FC,
  WELCOME_TOKEN_VALUE_B2C_FC,
  WELCOME_TOKEN_VALUE_ENTERPRISE_FC,
  WELCOME_TOKENS_CATALOG_FAMILY,
  WELCOME_TOKENS_PROTOCOL,
  isEnterprisePlanKey,
  resolveWelcomeAudience,
  resolveWelcomeOffer,
  welcomeTokenValueFc,
  type WelcomeAudience,
  type WelcomeOffer,
} from './welcomeAiTokensPolicy';

export function welcomeTokensForAudience(audience: WelcomeAudience): number {
  return calculateTokensForAmount(welcomeTokenValueFc(audience), currentAiTokenPricing());
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
  return `welcome_${id}`;
}

export async function grantWelcomeAiTokens(input: {
  userId: string;
  tenantId?: string | null;
  accountKind?: string | null;
  intent?: string | null;
  planKey?: string | null;
  orgRole?: string | null;
}): Promise<{
  audience: WelcomeAudience;
  offer: WelcomeOffer;
  tokensCount: number;
  valueFc: number;
  skipped?: boolean;
}> {
  const offer = resolveWelcomeOffer(input);
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

/** Complète l’offre entreprise (50 000 FC) à l’activation réelle du forfait. */
export async function grantEnterpriseWelcomeUpgrade(input: {
  userId: string;
  tenantId: string;
  planKey?: string | null;
}): Promise<{ tokensCount: number; skipped?: boolean }> {
  if (input.planKey && !isEnterprisePlanKey(input.planKey)) {
    return { tokensCount: 0, skipped: true };
  }

  const ownerId = input.userId.trim();
  const tenantId = input.tenantId.trim();
  if (!ownerId || !tenantId) return { tokensCount: 0, skipped: true };

  const enterpriseOffer = resolveWelcomeOffer({ planKey: 'ENTERPRISE_1', accountKind: 'ORGANIZER' });
  const enterpriseTokens = welcomeTokensForOffer(enterpriseOffer);
  const relatedId = welcomeGrantRelatedId(ownerId, 'enterprise');

  const alreadyEnterprise = await prisma.aiTokenLedger.findFirst({
    where: { action: 'grant', relatedId },
    select: { id: true },
  });
  if (alreadyEnterprise) return { tokensCount: 0, skipped: true };

  const prior = await prisma.aiTokenLedger.findFirst({
    where: { action: 'grant', relatedId: welcomeGrantRelatedId(ownerId) },
    select: { tokensDelta: true },
  });
  const already = Math.max(0, prior?.tokensDelta ?? 0);
  const tokensCount = enterpriseTokens - already;
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
