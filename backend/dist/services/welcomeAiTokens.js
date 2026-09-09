"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.welcomeTokenValueFc = exports.sanitizeWelcomeGrantRules = exports.resolveWelcomeOffer = exports.resolveWelcomeAudience = exports.isEnterprisePlanKey = exports.DEFAULT_WELCOME_GRANT_RULES = exports.WELCOME_TOKENS_PROTOCOL = exports.WELCOME_TOKENS_CATALOG_FAMILY = exports.WELCOME_TOKEN_VALUE_ENTERPRISE_FC = exports.WELCOME_TOKEN_VALUE_B2C_FC = exports.WELCOME_TOKEN_VALUE_B2B_FC = void 0;
exports.welcomeTokensForAudience = welcomeTokensForAudience;
exports.welcomeTokensForOffer = welcomeTokensForOffer;
exports.welcomeGrantRelatedId = welcomeGrantRelatedId;
exports.grantWelcomeAiTokens = grantWelcomeAiTokens;
exports.grantWelcomeAtPlanActivation = grantWelcomeAtPlanActivation;
exports.grantEnterpriseWelcomeUpgrade = grantEnterpriseWelcomeUpgrade;
const db_1 = require("../db");
const aiTokenFlexPayService_1 = require("./aiTokenFlexPayService");
const aiSimulationWalletService_1 = require("./aiSimulationWalletService");
const platformSettingsService_1 = require("./platformSettingsService");
const welcomeAiTokensPolicy_1 = require("./welcomeAiTokensPolicy");
var welcomeAiTokensPolicy_2 = require("./welcomeAiTokensPolicy");
Object.defineProperty(exports, "WELCOME_TOKEN_VALUE_B2B_FC", { enumerable: true, get: function () { return welcomeAiTokensPolicy_2.WELCOME_TOKEN_VALUE_B2B_FC; } });
Object.defineProperty(exports, "WELCOME_TOKEN_VALUE_B2C_FC", { enumerable: true, get: function () { return welcomeAiTokensPolicy_2.WELCOME_TOKEN_VALUE_B2C_FC; } });
Object.defineProperty(exports, "WELCOME_TOKEN_VALUE_ENTERPRISE_FC", { enumerable: true, get: function () { return welcomeAiTokensPolicy_2.WELCOME_TOKEN_VALUE_ENTERPRISE_FC; } });
Object.defineProperty(exports, "WELCOME_TOKENS_CATALOG_FAMILY", { enumerable: true, get: function () { return welcomeAiTokensPolicy_2.WELCOME_TOKENS_CATALOG_FAMILY; } });
Object.defineProperty(exports, "WELCOME_TOKENS_PROTOCOL", { enumerable: true, get: function () { return welcomeAiTokensPolicy_2.WELCOME_TOKENS_PROTOCOL; } });
Object.defineProperty(exports, "DEFAULT_WELCOME_GRANT_RULES", { enumerable: true, get: function () { return welcomeAiTokensPolicy_2.DEFAULT_WELCOME_GRANT_RULES; } });
Object.defineProperty(exports, "isEnterprisePlanKey", { enumerable: true, get: function () { return welcomeAiTokensPolicy_2.isEnterprisePlanKey; } });
Object.defineProperty(exports, "resolveWelcomeAudience", { enumerable: true, get: function () { return welcomeAiTokensPolicy_2.resolveWelcomeAudience; } });
Object.defineProperty(exports, "resolveWelcomeOffer", { enumerable: true, get: function () { return welcomeAiTokensPolicy_2.resolveWelcomeOffer; } });
Object.defineProperty(exports, "sanitizeWelcomeGrantRules", { enumerable: true, get: function () { return welcomeAiTokensPolicy_2.sanitizeWelcomeGrantRules; } });
Object.defineProperty(exports, "welcomeTokenValueFc", { enumerable: true, get: function () { return welcomeAiTokensPolicy_2.welcomeTokenValueFc; } });
function currentWelcomeRules() {
    return (0, welcomeAiTokensPolicy_1.sanitizeWelcomeGrantRules)((0, platformSettingsService_1.loadPlatformSettings)().welcomeAiGrants);
}
function welcomeTokensForAudience(audience) {
    return (0, aiTokenFlexPayService_1.calculateTokensForAmount)((0, welcomeAiTokensPolicy_1.welcomeTokenValueFc)(audience, currentWelcomeRules()), (0, aiTokenFlexPayService_1.currentAiTokenPricing)());
}
function welcomeTokensForOffer(offer) {
    if (offer.key === 'none')
        return 0;
    if (offer.fixedTokens)
        return offer.tokens;
    return (0, aiTokenFlexPayService_1.calculateTokensForAmount)(offer.valueFc, (0, aiTokenFlexPayService_1.currentAiTokenPricing)());
}
function welcomeGrantRelatedId(userId, offerKey = 'default') {
    const id = userId.trim();
    if (offerKey === 'protocol')
        return `welcome_protocol_${id}`;
    if (offerKey === 'enterprise')
        return `welcome_enterprise_${id}`;
    if (offerKey === 'manager')
        return `welcome_manager_${id}`;
    return `welcome_${id}`;
}
async function grantWelcomeAiTokens(input) {
    const moment = input.moment || 'signup';
    const offer = (0, welcomeAiTokensPolicy_1.resolveWelcomeOffer)(input, { rules: currentWelcomeRules(), moment });
    const audience = (0, welcomeAiTokensPolicy_1.resolveWelcomeAudience)(input);
    const tokensCount = welcomeTokensForOffer(offer);
    const valueFc = offer.valueFc;
    if (offer.key === 'none' || tokensCount <= 0) {
        return { audience, offer, tokensCount: 0, valueFc, skipped: true };
    }
    const shareDevice = offer.shareWithOrg && input.tenantId?.trim()
        ? (0, aiSimulationWalletService_1.tenantGrantDeviceId)(input.tenantId)
        : undefined;
    try {
        await (0, aiSimulationWalletService_1.grantAiTokensToUser)({
            userId: input.userId,
            tokensCount,
            adminUserId: input.userId,
            relatedId: welcomeGrantRelatedId(input.userId, offer.key),
            source: 'signup',
            deviceId: shareDevice,
        });
    }
    catch (error) {
        const status = error.status;
        if (status === 409) {
            return { audience, offer, tokensCount, valueFc, skipped: true };
        }
        throw error;
    }
    return { audience, offer, tokensCount, valueFc };
}
/** Crédite l’offre dont le moment est l’activation d’un forfait payant (complément si déjà offert à l’inscription). */
async function grantWelcomeAtPlanActivation(input) {
    const ownerId = input.userId.trim();
    const tenantId = input.tenantId.trim();
    if (!ownerId || !tenantId)
        return { tokensCount: 0, skipped: true };
    const rules = currentWelcomeRules();
    const offer = (0, welcomeAiTokensPolicy_1.resolveWelcomeOffer)({ accountKind: input.accountKind, planKey: input.planKey }, { rules, moment: 'plan_activation' });
    const targetTokens = welcomeTokensForOffer(offer);
    if (offer.key === 'none' || targetTokens <= 0) {
        return { tokensCount: 0, skipped: true };
    }
    const relatedId = welcomeGrantRelatedId(ownerId, offer.key);
    const alreadyThisOffer = await db_1.prisma.aiTokenLedger.findFirst({
        where: { action: 'grant', relatedId },
        select: { id: true },
    });
    if (alreadyThisOffer)
        return { tokensCount: 0, skipped: true };
    const prior = await db_1.prisma.aiTokenLedger.findMany({
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
    if (tokensCount <= 0)
        return { tokensCount: 0, skipped: true };
    try {
        await (0, aiSimulationWalletService_1.grantAiTokensToUser)({
            userId: ownerId,
            tokensCount,
            adminUserId: ownerId,
            relatedId,
            source: 'signup',
            deviceId: (0, aiSimulationWalletService_1.tenantGrantDeviceId)(tenantId),
        });
    }
    catch (error) {
        const status = error.status;
        if (status === 409)
            return { tokensCount, skipped: true };
        throw error;
    }
    return { tokensCount };
}
async function grantEnterpriseWelcomeUpgrade(input) {
    return grantWelcomeAtPlanActivation(input);
}
