"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveInvitationComposeTokenCost = resolveInvitationComposeTokenCost;
const db_1 = require("../db");
const aiSimulationWalletService_1 = require("./aiSimulationWalletService");
/** Résout le coût jetons : modèle source (admin) ou défaut plateforme. */
async function resolveInvitationComposeTokenCost(input) {
    const id = typeof input.sourceTemplateId === 'string' ? input.sourceTemplateId.trim() : '';
    if (!id)
        return aiSimulationWalletService_1.AI_INVITATION_COMPOSE_TOKEN_COST;
    try {
        const row = await db_1.prisma.template.findUnique({
            where: { id },
            select: { aiTokenCost: true },
        });
        if (!row)
            return aiSimulationWalletService_1.AI_INVITATION_COMPOSE_TOKEN_COST;
        return (0, aiSimulationWalletService_1.clampInvitationTokenCost)(row.aiTokenCost);
    }
    catch {
        return aiSimulationWalletService_1.AI_INVITATION_COMPOSE_TOKEN_COST;
    }
}
