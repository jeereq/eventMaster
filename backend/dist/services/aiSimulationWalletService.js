"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_FREE_TRIALS_MAX = void 0;
exports.ensureAiSimulationWallet = ensureAiSimulationWallet;
exports.getAiSimulationWalletAllowance = getAiSimulationWalletAllowance;
exports.requireAiSimulationCredit = requireAiSimulationCredit;
exports.consumeAiSimulationCredit = consumeAiSimulationCredit;
exports.creditPaidAiTokenOrder = creditPaidAiTokenOrder;
exports.claimAiSimulationWallet = claimAiSimulationWallet;
const db_1 = require("../db");
exports.AI_FREE_TRIALS_MAX = 4;
function fail(status, message) {
    const error = new Error(message);
    error.status = status;
    throw error;
}
function parseCredited(value) {
    if (!Array.isArray(value))
        return [];
    return value.filter((item) => typeof item === 'string' && item.trim().length > 0);
}
function serialize(wallet, paid) {
    const freeTrialsUsed = Math.max(0, wallet.freeTrialsUsed);
    const bonusTokens = Math.max(0, wallet.bonusTokens);
    const freeRemaining = Math.max(0, exports.AI_FREE_TRIALS_MAX - freeTrialsUsed);
    const totalRemaining = freeRemaining + bonusTokens;
    return {
        deviceId: wallet.deviceId,
        userId: wallet.userId,
        freeTrialsUsed,
        freeTrialsMax: exports.AI_FREE_TRIALS_MAX,
        freeRemaining,
        bonusTokens,
        totalRemaining,
        canSimulate: totalRemaining > 0,
        totalPaidTokens: paid.totalPaidTokens,
        paidOrdersCount: paid.paidOrdersCount,
    };
}
async function paidSummary(deviceId, userId) {
    const where = userId
        ? { status: 'PAID', OR: [{ deviceId }, { userId }] }
        : { status: 'PAID', deviceId };
    try {
        const orders = await db_1.prisma.aiTokenOrder.findMany({
            where,
            select: { id: true, tokensCount: true },
        });
        return {
            orders,
            totalPaidTokens: orders.reduce((sum, row) => sum + (row.tokensCount || 0), 0),
            paidOrdersCount: orders.length,
        };
    }
    catch {
        return { orders: [], totalPaidTokens: 0, paidOrdersCount: 0 };
    }
}
async function bootstrapNewWallet(wallet) {
    let runCount = 0;
    try {
        runCount = await db_1.prisma.aiSimulationRun.count({
            where: {
                OR: [
                    { deviceId: wallet.deviceId },
                    ...(wallet.userId ? [{ userId: wallet.userId }] : []),
                ],
            },
        });
    }
    catch {
        runCount = 0;
    }
    const paid = await paidSummary(wallet.deviceId, wallet.userId);
    const freeTrialsUsed = Math.min(exports.AI_FREE_TRIALS_MAX, runCount);
    const consumedPaid = Math.max(0, runCount - exports.AI_FREE_TRIALS_MAX);
    const bonusTokens = Math.max(0, paid.totalPaidTokens - consumedPaid);
    const updated = await db_1.prisma.aiSimulationWallet.update({
        where: { id: wallet.id },
        data: {
            freeTrialsUsed,
            bonusTokens,
            creditedOrderIds: paid.orders.map((order) => order.id),
        },
    });
    return {
        wallet: updated,
        paid: {
            totalPaidTokens: paid.totalPaidTokens,
            paidOrdersCount: paid.paidOrdersCount,
        },
    };
}
async function syncPaidCredits(wallet) {
    const paid = await paidSummary(wallet.deviceId, wallet.userId);
    const credited = parseCredited(wallet.creditedOrderIds);
    const missing = paid.orders.filter((order) => !credited.includes(order.id));
    if (!missing.length) {
        return {
            wallet,
            paid: {
                totalPaidTokens: paid.totalPaidTokens,
                paidOrdersCount: paid.paidOrdersCount,
            },
        };
    }
    const added = missing.reduce((sum, order) => sum + (order.tokensCount || 0), 0);
    const nextIds = [...credited, ...missing.map((order) => order.id)];
    const updated = await db_1.prisma.aiSimulationWallet.update({
        where: { id: wallet.id },
        data: {
            bonusTokens: wallet.bonusTokens + added,
            creditedOrderIds: nextIds,
        },
    });
    return {
        wallet: updated,
        paid: {
            totalPaidTokens: paid.totalPaidTokens,
            paidOrdersCount: paid.paidOrdersCount,
        },
    };
}
async function ensureAiSimulationWallet(deviceId, userId) {
    const cleanDevice = deviceId.trim();
    if (!cleanDevice)
        fail(400, 'Identifiant d’appareil manquant pour la simulation.');
    let wallet = await db_1.prisma.aiSimulationWallet.findUnique({ where: { deviceId: cleanDevice } });
    if (!wallet) {
        wallet = await db_1.prisma.aiSimulationWallet.create({
            data: {
                deviceId: cleanDevice,
                userId: userId || null,
            },
        });
        return bootstrapNewWallet(wallet);
    }
    if (userId && !wallet.userId) {
        wallet = await db_1.prisma.aiSimulationWallet.update({
            where: { id: wallet.id },
            data: { userId },
        });
    }
    const synced = await syncPaidCredits(wallet);
    return synced;
}
async function getAiSimulationWalletAllowance(deviceId, userId) {
    const { wallet, paid } = await ensureAiSimulationWallet(deviceId, userId);
    return serialize(wallet, paid);
}
async function requireAiSimulationCredit(deviceId, userId) {
    const allowance = await getAiSimulationWalletAllowance(deviceId, userId);
    if (!allowance.canSimulate) {
        fail(402, 'Plus de simulations disponibles. Rechargez 15 recherches pour continuer.');
    }
    return allowance;
}
async function consumeAiSimulationCredit(deviceId, userId) {
    const { wallet, paid } = await ensureAiSimulationWallet(deviceId, userId);
    const remaining = Math.max(0, exports.AI_FREE_TRIALS_MAX - wallet.freeTrialsUsed) + Math.max(0, wallet.bonusTokens);
    if (remaining <= 0) {
        fail(402, 'Plus de simulations disponibles. Rechargez 15 recherches pour continuer.');
    }
    if (wallet.bonusTokens > 0) {
        const result = await db_1.prisma.aiSimulationWallet.updateMany({
            where: { id: wallet.id, bonusTokens: { gt: 0 } },
            data: { bonusTokens: { decrement: 1 } },
        });
        if (!result.count) {
            fail(402, 'Plus de simulations disponibles. Rechargez 15 recherches pour continuer.');
        }
    }
    else {
        const result = await db_1.prisma.aiSimulationWallet.updateMany({
            where: { id: wallet.id, freeTrialsUsed: { lt: exports.AI_FREE_TRIALS_MAX } },
            data: { freeTrialsUsed: { increment: 1 } },
        });
        if (!result.count) {
            fail(402, 'Plus de simulations disponibles. Rechargez 15 recherches pour continuer.');
        }
    }
    const next = await db_1.prisma.aiSimulationWallet.findUnique({ where: { id: wallet.id } });
    if (!next)
        fail(500, 'Portefeuille de simulations introuvable.');
    return serialize(next, paid);
}
async function creditPaidAiTokenOrder(order) {
    const deviceId = order.deviceId?.trim();
    if (!deviceId)
        return;
    const { wallet, paid } = await ensureAiSimulationWallet(deviceId, order.userId);
    const credited = parseCredited(wallet.creditedOrderIds);
    if (credited.includes(order.id))
        return serialize(wallet, paid);
    const updated = await db_1.prisma.aiSimulationWallet.update({
        where: { id: wallet.id },
        data: {
            bonusTokens: wallet.bonusTokens + Math.max(1, order.tokensCount || 15),
            creditedOrderIds: [...credited, order.id],
        },
    });
    return serialize(updated, {
        totalPaidTokens: paid.totalPaidTokens + Math.max(1, order.tokensCount || 15),
        paidOrdersCount: paid.paidOrdersCount + 1,
    });
}
async function claimAiSimulationWallet(userId, deviceId) {
    return getAiSimulationWalletAllowance(deviceId, userId);
}
