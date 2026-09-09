"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_ROOM_PLAN_TOKEN_COST = exports.AI_INVITATION_COMPOSE_TOKEN_COST = exports.AI_SIMULATION_TOKEN_COST = exports.AI_FREE_TRIALS_MAX = exports.TENANT_GRANT_DEVICE_PREFIX = exports.USER_GRANT_DEVICE_PREFIX = void 0;
exports.userGrantDeviceId = userGrantDeviceId;
exports.tenantGrantDeviceId = tenantGrantDeviceId;
exports.isUnlimitedAiTokenUser = isUnlimitedAiTokenUser;
exports.ensureAiSimulationWallet = ensureAiSimulationWallet;
exports.grantAiTokensToUser = grantAiTokensToUser;
exports.getAiSimulationWalletAllowance = getAiSimulationWalletAllowance;
exports.requireAiSimulationCredit = requireAiSimulationCredit;
exports.consumeAiSimulationCredit = consumeAiSimulationCredit;
exports.creditPaidAiTokenOrder = creditPaidAiTokenOrder;
exports.claimAiSimulationWallet = claimAiSimulationWallet;
const client_1 = require("@prisma/client");
const db_1 = require("../db");
const aiTokenFlexPayService_1 = require("./aiTokenFlexPayService");
const aiTokenUsageQuery_1 = require("./aiTokenUsageQuery");
exports.USER_GRANT_DEVICE_PREFIX = 'user-grant:';
exports.TENANT_GRANT_DEVICE_PREFIX = 'tenant-grant:';
function userGrantDeviceId(userId) {
    return `${exports.USER_GRANT_DEVICE_PREFIX}${userId}`;
}
function tenantGrantDeviceId(tenantId) {
    return `${exports.TENANT_GRANT_DEVICE_PREFIX}${tenantId.trim()}`;
}
function isUnlimitedAiTokenUser(user) {
    return user?.role === 'SUPER_ADMIN' || Boolean(user?.impersonatedBy);
}
exports.AI_FREE_TRIALS_MAX = 4;
exports.AI_SIMULATION_TOKEN_COST = 1;
exports.AI_INVITATION_COMPOSE_TOKEN_COST = 2;
exports.AI_ROOM_PLAN_TOKEN_COST = 3;
function isUniqueConstraint(err) {
    return err instanceof client_1.Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}
async function writeAiTokenLedger(tx, entry) {
    try {
        await tx.aiTokenLedger.create({
            data: {
                userId: entry.userId?.trim() || null,
                deviceId: entry.deviceId?.trim() || null,
                action: entry.action,
                source: entry.source?.trim() || 'unknown',
                tokensDelta: entry.tokensDelta,
                tokensFromFree: Math.max(0, entry.tokensFromFree ?? 0),
                tokensFromBonus: Math.max(0, entry.tokensFromBonus ?? 0),
                tokensFromGranted: Math.max(0, entry.tokensFromGranted ?? 0),
                pool: entry.pool,
                relatedId: entry.relatedId?.trim() || null,
            },
        });
    }
    catch (err) {
        if (entry.ignoreDuplicate && isUniqueConstraint(err))
            return;
        throw err;
    }
}
async function lockWalletByDevice(tx, deviceId) {
    const rows = await tx.$queryRaw(client_1.Prisma.sql `SELECT id FROM "AiSimulationWallet" WHERE "deviceId" = ${deviceId} FOR UPDATE`);
    if (rows[0]) {
        return tx.aiSimulationWallet.findUniqueOrThrow({ where: { id: rows[0].id } });
    }
    return tx.aiSimulationWallet.create({
        data: { deviceId },
    });
}
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
function serialize(wallet, paid, opts) {
    const freeTrialsUsed = Math.max(0, wallet.freeTrialsUsed);
    const bonusTokens = Math.max(0, wallet.bonusTokens);
    const grantedTokens = Math.max(0, wallet.grantedTokens ?? 0);
    const freeRemaining = Math.max(0, exports.AI_FREE_TRIALS_MAX - freeTrialsUsed);
    const totalRemaining = freeRemaining + bonusTokens + grantedTokens;
    const unlimited = Boolean(opts?.unlimited);
    return {
        deviceId: wallet.deviceId,
        userId: wallet.userId,
        freeTrialsUsed,
        freeTrialsMax: exports.AI_FREE_TRIALS_MAX,
        freeRemaining,
        bonusTokens,
        grantedTokens,
        totalRemaining,
        canSimulate: unlimited || totalRemaining > 0,
        unlimited,
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
        const boot = await bootstrapNewWallet(wallet);
        const absorbed = await absorbUserGrantWallet(boot.wallet, userId);
        return { wallet: absorbed, paid: boot.paid };
    }
    if (userId && !wallet.userId) {
        wallet = await db_1.prisma.aiSimulationWallet.update({
            where: { id: wallet.id },
            data: { userId },
        });
    }
    const absorbed = await absorbUserGrantWallet(wallet, userId);
    const synced = await syncPaidCredits(absorbed);
    return synced;
}
async function absorbUserGrantWallet(wallet, userId) {
    if (!userId)
        return wallet;
    const grantDevice = userGrantDeviceId(userId);
    if (wallet.deviceId === grantDevice)
        return wallet;
    const grantWallet = await db_1.prisma.aiSimulationWallet.findUnique({ where: { deviceId: grantDevice } });
    const pending = Math.max(0, grantWallet?.grantedTokens ?? 0);
    if (!grantWallet || pending <= 0)
        return wallet;
    const [updated] = await db_1.prisma.$transaction([
        db_1.prisma.aiSimulationWallet.update({
            where: { id: wallet.id },
            data: { grantedTokens: Math.max(0, wallet.grantedTokens ?? 0) + pending, userId },
        }),
        db_1.prisma.aiSimulationWallet.update({
            where: { id: grantWallet.id },
            data: { grantedTokens: 0 },
        }),
    ]);
    return updated;
}
async function orgShareDeviceIdForUser(userId) {
    if (!userId)
        return null;
    const user = await db_1.prisma.user.findUnique({
        where: { id: userId },
        select: { tenantId: true, orgRole: true },
    });
    if (!user?.tenantId)
        return null;
    if (user.orgRole === 'PROTOCOL')
        return null;
    return tenantGrantDeviceId(user.tenantId);
}
async function orgGrantedRemaining(deviceId) {
    if (!deviceId)
        return 0;
    const wallet = await db_1.prisma.aiSimulationWallet.findUnique({
        where: { deviceId },
        select: { grantedTokens: true },
    });
    return Math.max(0, wallet?.grantedTokens ?? 0);
}
function withOrgGranted(allowance, orgGranted) {
    if (orgGranted <= 0)
        return allowance;
    const grantedTokens = allowance.grantedTokens + orgGranted;
    const totalRemaining = allowance.totalRemaining + orgGranted;
    return {
        ...allowance,
        grantedTokens,
        totalRemaining,
        canSimulate: allowance.unlimited || totalRemaining > 0,
    };
}
async function grantAiTokensToUser(input) {
    const userId = input.userId.trim();
    const tokensCount = Math.max(1, Math.round(input.tokensCount));
    if (!userId)
        fail(400, 'Utilisateur manquant.');
    const user = await db_1.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true },
    });
    if (!user)
        fail(404, 'Utilisateur introuvable.');
    const deviceId = input.deviceId?.trim() || userGrantDeviceId(userId);
    const relatedId = input.relatedId?.trim() || `grant_${userId}_${Date.now()}`;
    const paid = await paidSummary(deviceId, userId);
    if (input.relatedId?.trim()) {
        const already = await db_1.prisma.aiTokenLedger.findFirst({
            where: { action: 'grant', relatedId },
            select: { id: true },
        });
        if (already)
            fail(409, 'Ces jetons ont déjà été offerts.');
    }
    const wallet = await db_1.prisma.$transaction(async (tx) => {
        const locked = await lockWalletByDevice(tx, deviceId);
        const next = await tx.aiSimulationWallet.update({
            where: { id: locked.id },
            data: {
                userId,
                grantedTokens: Math.max(0, locked.grantedTokens ?? 0) + tokensCount,
            },
        });
        await writeAiTokenLedger(tx, {
            userId,
            deviceId,
            action: 'grant',
            source: input.source?.trim() || 'admin',
            tokensDelta: tokensCount,
            tokensFromGranted: tokensCount,
            pool: 'granted',
            relatedId,
            ignoreDuplicate: true,
        });
        return next;
    });
    return {
        user,
        tokensCount,
        allowance: serialize(wallet, paid),
    };
}
async function getAiSimulationWalletAllowance(deviceId, userId) {
    const { wallet, paid } = await ensureAiSimulationWallet(deviceId, userId);
    const allowance = serialize(wallet, paid);
    const orgDevice = await orgShareDeviceIdForUser(userId);
    if (!orgDevice || orgDevice === wallet.deviceId)
        return allowance;
    return withOrgGranted(allowance, await orgGrantedRemaining(orgDevice));
}
function insufficientCreditMessage(need, remaining) {
    const pricing = (0, aiTokenFlexPayService_1.currentAiTokenPricing)();
    const hint = `Rechargez dès ${pricing.minAmountCdf.toLocaleString('fr-FR')} FC pour ${pricing.minCount} jeton${pricing.minCount > 1 ? 's' : ''}.`;
    if (need > 1) {
        return `Cette action consomme ${need} jetons. Solde insuffisant (${remaining}). ${hint}`;
    }
    return `Plus de jetons disponibles. ${hint}`;
}
async function requireAiSimulationCredit(deviceId, userId, count = exports.AI_SIMULATION_TOKEN_COST, meta) {
    const need = Math.max(1, Math.round(count));
    const allowance = await getAiSimulationWalletAllowance(deviceId, userId);
    if (meta?.unlimited) {
        return { ...allowance, unlimited: true, canSimulate: true };
    }
    if (allowance.totalRemaining < need) {
        fail(402, insufficientCreditMessage(need, allowance.totalRemaining));
    }
    return allowance;
}
function consumePool(fromBonus, fromGranted, fromFree) {
    const used = [fromBonus > 0, fromGranted > 0, fromFree > 0].filter(Boolean).length;
    if (used > 1)
        return 'mixed';
    if (fromGranted > 0)
        return 'granted';
    if (fromBonus > 0)
        return 'bonus';
    return 'free';
}
async function consumeAiSimulationCredit(deviceId, userId, count = exports.AI_SIMULATION_TOKEN_COST, meta) {
    const need = Math.max(1, Math.round(count));
    const action = (0, aiTokenUsageQuery_1.resolveLedgerAction)(meta?.action);
    const cleanDevice = deviceId.trim();
    await ensureAiSimulationWallet(cleanDevice, userId);
    const paid = await paidSummary(cleanDevice, userId);
    const orgDevice = await orgShareDeviceIdForUser(userId);
    const shareOrg = Boolean(orgDevice && orgDevice !== cleanDevice);
    const updated = await db_1.prisma.$transaction(async (tx) => {
        const lockOrder = shareOrg && orgDevice
            ? [orgDevice, cleanDevice].sort()
            : [cleanDevice];
        const locked = new Map();
        for (const id of lockOrder) {
            locked.set(id, await lockWalletByDevice(tx, id));
        }
        const wallet = locked.get(cleanDevice);
        const orgWallet = shareOrg && orgDevice ? locked.get(orgDevice) : undefined;
        if (meta?.unlimited) {
            await writeAiTokenLedger(tx, {
                userId,
                deviceId: cleanDevice,
                action,
                source: meta.source || 'support',
                tokensDelta: -need,
                pool: 'comp',
                relatedId: meta.relatedId,
            });
            return { wallet, orgGrantedLeft: Math.max(0, orgWallet?.grantedTokens ?? 0) };
        }
        const freeRemaining = Math.max(0, exports.AI_FREE_TRIALS_MAX - wallet.freeTrialsUsed);
        const bonus = Math.max(0, wallet.bonusTokens);
        const granted = Math.max(0, wallet.grantedTokens ?? 0);
        const orgGranted = Math.max(0, orgWallet?.grantedTokens ?? 0);
        const remaining = freeRemaining + bonus + granted + orgGranted;
        if (remaining < need) {
            fail(402, insufficientCreditMessage(need, remaining));
        }
        let left = need;
        const fromOrg = Math.min(left, orgGranted);
        left -= fromOrg;
        const fromBonus = Math.min(left, bonus);
        left -= fromBonus;
        const fromGranted = Math.min(left, granted);
        left -= fromGranted;
        const fromFree = left;
        if (orgWallet && fromOrg > 0) {
            await tx.aiSimulationWallet.update({
                where: { id: orgWallet.id },
                data: { grantedTokens: orgGranted - fromOrg },
            });
        }
        const next = await tx.aiSimulationWallet.update({
            where: { id: wallet.id },
            data: {
                bonusTokens: bonus - fromBonus,
                grantedTokens: granted - fromGranted,
                freeTrialsUsed: Math.min(exports.AI_FREE_TRIALS_MAX, wallet.freeTrialsUsed + fromFree),
            },
        });
        await writeAiTokenLedger(tx, {
            userId,
            deviceId: cleanDevice,
            action,
            source: meta?.source || 'unknown',
            tokensDelta: -need,
            tokensFromFree: fromFree,
            tokensFromBonus: fromBonus,
            tokensFromGranted: fromGranted + fromOrg,
            pool: consumePool(fromBonus, fromGranted + fromOrg, fromFree),
            relatedId: meta?.relatedId,
        });
        return { wallet: next, orgGrantedLeft: orgGranted - fromOrg };
    });
    return withOrgGranted(serialize(updated.wallet, paid, { unlimited: Boolean(meta?.unlimited) }), updated.orgGrantedLeft);
}
function tokensToCredit(order) {
    const tokensToAdd = order.tokensCount && order.tokensCount > 0
        ? order.tokensCount
        : order.amountFc
            ? (0, aiTokenFlexPayService_1.calculateTokensForAmount)(order.amountFc)
            : (0, aiTokenFlexPayService_1.currentAiTokenPricing)().minCount;
    return Math.max(1, tokensToAdd);
}
async function creditPaidAiTokenOrder(order) {
    const deviceId = order.deviceId?.trim();
    if (!deviceId)
        return;
    await ensureAiSimulationWallet(deviceId, order.userId);
    const paid = await paidSummary(deviceId, order.userId);
    const added = tokensToCredit(order);
    const wallet = await db_1.prisma.$transaction(async (tx) => {
        const locked = await lockWalletByDevice(tx, deviceId);
        const credited = parseCredited(locked.creditedOrderIds);
        await writeAiTokenLedger(tx, {
            userId: order.userId,
            deviceId,
            action: 'recharge',
            source: 'flexpay',
            tokensDelta: added,
            tokensFromBonus: added,
            pool: 'paid',
            relatedId: order.id,
            ignoreDuplicate: true,
        });
        if (credited.includes(order.id)) {
            return locked;
        }
        return tx.aiSimulationWallet.update({
            where: { id: locked.id },
            data: {
                bonusTokens: locked.bonusTokens + added,
                creditedOrderIds: [...credited, order.id],
            },
        });
    });
    return serialize(wallet, paid);
}
async function claimAiSimulationWallet(userId, deviceId) {
    return getAiSimulationWalletAllowance(deviceId, userId);
}
