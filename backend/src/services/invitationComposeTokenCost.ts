import { prisma } from '../db';
import {
  AI_INVITATION_COMPOSE_TOKEN_COST,
  clampInvitationTokenCost,
} from './aiSimulationWalletService';

/** Résout le coût jetons : modèle source (admin) ou défaut plateforme. */
export async function resolveInvitationComposeTokenCost(input: {
  sourceTemplateId?: string | null;
}): Promise<number> {
  const id = typeof input.sourceTemplateId === 'string' ? input.sourceTemplateId.trim() : '';
  if (!id) return AI_INVITATION_COMPOSE_TOKEN_COST;
  try {
    const row = await prisma.template.findUnique({
      where: { id },
      select: { aiTokenCost: true },
    });
    if (!row) return AI_INVITATION_COMPOSE_TOKEN_COST;
    return clampInvitationTokenCost(row.aiTokenCost);
  } catch {
    return AI_INVITATION_COMPOSE_TOKEN_COST;
  }
}
