import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { calculateTokensForAmount, AI_TOKEN_MIN_COUNT } from './aiTokenFlexPayService';
import { resolveLedgerAction, type AiTokenAction } from './aiTokenUsageQuery';

export const AI_FREE_TRIALS_MAX = 4;
export const AI_SIMULATION_TOKEN_COST = 1;
export const AI_INVITATION_COMPOSE_TOKEN_COST = 2;
export const AI_ROOM_PLAN_TOKEN_COST = 3;

export type { AiTokenAction };
export type AiTokenLedgerSource = 'landing' | 'dashboard' | 'studio' | 'flexpay' | 'unknown';
export type AiTokenPool = 'free' | 'bonus' | 'mixed' | 'paid';

export type AiTokenLedgerMeta = {
  action?: AiTokenAction;
  source?: AiTokenLedgerSource;
  relatedId?: string | null;
};

type LedgerWriter = Prisma.TransactionClient;

function isUniqueConstraint(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

async function writeAiTokenLedger(
  tx: LedgerWriter,
  entry: {
    userId?: string | null;
    deviceId?: string | null;
    action: AiTokenAction;
    source?: string;
    tokensDelta: number;
    tokensFromFree?: number;
    tokensFromBonus?: number;
    pool: AiTokenPool;
    relatedId?: string | null;
    ignoreDuplicate?: boolean;
  },
) {
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
        pool: entry.pool,
        relatedId: entry.relatedId?.trim() || null,
      },
    });
  } catch (err) {
    if (entry.ignoreDuplicate && isUniqueConstraint(err)) return;
    throw err;
  }
}

async function lockWalletByDevice(tx: LedgerWriter, deviceId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`SELECT id FROM "AiSimulationWallet" WHERE "deviceId" = ${deviceId} FOR UPDATE`,
  );
  if (rows[0]) {
    return tx.aiSimulationWallet.findUniqueOrThrow({ where: { id: rows[0].id } });
  }
  return tx.aiSimulationWallet.create({
    data: { deviceId },
  });
}

export type AiWalletAllowance = {
  deviceId: string;
  userId: string | null;
  freeTrialsUsed: number;
  freeTrialsMax: number;
  freeRemaining: number;
  bonusTokens: number;
  totalRemaining: number;
  canSimulate: boolean;
  totalPaidTokens: number;
  paidOrdersCount: number;
};

type HttpError = Error & { status?: number };

function fail(status: number, message: string): never {
  const error: HttpError = new Error(message);
  error.status = status;
  throw error;
}

function parseCredited(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function serialize(
  wallet: {
    deviceId: string;
    userId: string | null;
    freeTrialsUsed: number;
    bonusTokens: number;
  },
  paid: { totalPaidTokens: number; paidOrdersCount: number },
): AiWalletAllowance {
  const freeTrialsUsed = Math.max(0, wallet.freeTrialsUsed);
  const bonusTokens = Math.max(0, wallet.bonusTokens);
  const freeRemaining = Math.max(0, AI_FREE_TRIALS_MAX - freeTrialsUsed);
  const totalRemaining = freeRemaining + bonusTokens;
  return {
    deviceId: wallet.deviceId,
    userId: wallet.userId,
    freeTrialsUsed,
    freeTrialsMax: AI_FREE_TRIALS_MAX,
    freeRemaining,
    bonusTokens,
    totalRemaining,
    canSimulate: totalRemaining > 0,
    totalPaidTokens: paid.totalPaidTokens,
    paidOrdersCount: paid.paidOrdersCount,
  };
}

async function paidSummary(deviceId: string, userId?: string | null) {
  const where = userId
    ? { status: 'PAID', OR: [{ deviceId }, { userId }] }
    : { status: 'PAID', deviceId };
  try {
    const orders = await prisma.aiTokenOrder.findMany({
      where,
      select: { id: true, tokensCount: true },
    });
    return {
      orders,
      totalPaidTokens: orders.reduce((sum, row) => sum + (row.tokensCount || 0), 0),
      paidOrdersCount: orders.length,
    };
  } catch {
    return { orders: [] as Array<{ id: string; tokensCount: number }>, totalPaidTokens: 0, paidOrdersCount: 0 };
  }
}

async function bootstrapNewWallet(
  wallet: {
    id: string;
    deviceId: string;
    userId: string | null;
    freeTrialsUsed: number;
    bonusTokens: number;
    creditedOrderIds: unknown;
  },
) {
  let runCount = 0;
  try {
    runCount = await prisma.aiSimulationRun.count({
      where: {
        OR: [
          { deviceId: wallet.deviceId },
          ...(wallet.userId ? [{ userId: wallet.userId }] : []),
        ],
      },
    });
  } catch {
    runCount = 0;
  }

  const paid = await paidSummary(wallet.deviceId, wallet.userId);
  const freeTrialsUsed = Math.min(AI_FREE_TRIALS_MAX, runCount);
  const consumedPaid = Math.max(0, runCount - AI_FREE_TRIALS_MAX);
  const bonusTokens = Math.max(0, paid.totalPaidTokens - consumedPaid);
  const updated = await prisma.aiSimulationWallet.update({
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

async function syncPaidCredits(
  wallet: {
    id: string;
    deviceId: string;
    userId: string | null;
    freeTrialsUsed: number;
    bonusTokens: number;
    creditedOrderIds: unknown;
  },
) {
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
  const updated = await prisma.aiSimulationWallet.update({
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

export async function ensureAiSimulationWallet(deviceId: string, userId?: string | null) {
  const cleanDevice = deviceId.trim();
  if (!cleanDevice) fail(400, 'Identifiant d’appareil manquant pour la simulation.');

  let wallet = await prisma.aiSimulationWallet.findUnique({ where: { deviceId: cleanDevice } });
  if (!wallet) {
    wallet = await prisma.aiSimulationWallet.create({
      data: {
        deviceId: cleanDevice,
        userId: userId || null,
      },
    });
    return bootstrapNewWallet(wallet);
  }
  if (userId && !wallet.userId) {
    wallet = await prisma.aiSimulationWallet.update({
      where: { id: wallet.id },
      data: { userId },
    });
  }

  const synced = await syncPaidCredits(wallet);
  return synced;
}

export async function getAiSimulationWalletAllowance(
  deviceId: string,
  userId?: string | null,
): Promise<AiWalletAllowance> {
  const { wallet, paid } = await ensureAiSimulationWallet(deviceId, userId);
  return serialize(wallet, paid);
}

function insufficientCreditMessage(need: number, remaining: number) {
  if (need > 1) {
    return `Cette génération d’invitation consomme ${need} jetons. Solde insuffisant (${remaining}). Rechargez dès 2 500 FC pour 6 jetons.`;
  }
  return 'Plus de jetons disponibles. Rechargez des jetons de recherche pour continuer (dès 2 500 FC pour 6 jetons).';
}

export async function requireAiSimulationCredit(
  deviceId: string,
  userId?: string | null,
  count = AI_SIMULATION_TOKEN_COST,
): Promise<AiWalletAllowance> {
  const need = Math.max(1, Math.round(count));
  const allowance = await getAiSimulationWalletAllowance(deviceId, userId);
  if (allowance.totalRemaining < need) {
    fail(402, insufficientCreditMessage(need, allowance.totalRemaining));
  }
  return allowance;
}

export async function consumeAiSimulationCredit(
  deviceId: string,
  userId?: string | null,
  count = AI_SIMULATION_TOKEN_COST,
  meta?: AiTokenLedgerMeta,
): Promise<AiWalletAllowance> {
  const need = Math.max(1, Math.round(count));
  const action = resolveLedgerAction(meta?.action);
  const cleanDevice = deviceId.trim();
  await ensureAiSimulationWallet(cleanDevice, userId);
  const paid = await paidSummary(cleanDevice, userId);

  const updated = await prisma.$transaction(async (tx) => {
    const wallet = await lockWalletByDevice(tx, cleanDevice);
    const freeRemaining = Math.max(0, AI_FREE_TRIALS_MAX - wallet.freeTrialsUsed);
    const bonus = Math.max(0, wallet.bonusTokens);
    const remaining = freeRemaining + bonus;
    if (remaining < need) {
      fail(402, insufficientCreditMessage(need, remaining));
    }

    const fromBonus = Math.min(need, bonus);
    const fromFree = need - fromBonus;
    const next = await tx.aiSimulationWallet.update({
      where: { id: wallet.id },
      data: {
        bonusTokens: bonus - fromBonus,
        freeTrialsUsed: Math.min(AI_FREE_TRIALS_MAX, wallet.freeTrialsUsed + fromFree),
      },
    });

    const pool: AiTokenPool =
      fromFree > 0 && fromBonus > 0 ? 'mixed' : fromBonus > 0 ? 'bonus' : 'free';
    await writeAiTokenLedger(tx, {
      userId,
      deviceId: cleanDevice,
      action,
      source: meta?.source || 'unknown',
      tokensDelta: -need,
      tokensFromFree: fromFree,
      tokensFromBonus: fromBonus,
      pool,
      relatedId: meta?.relatedId,
    });
    return next;
  });

  return serialize(updated, paid);
}

function tokensToCredit(order: {
  tokensCount?: number | null;
  amountFc?: number | null;
}) {
  const tokensToAdd =
    order.tokensCount && order.tokensCount > 0
      ? order.tokensCount
      : order.amountFc
        ? calculateTokensForAmount(order.amountFc)
        : AI_TOKEN_MIN_COUNT;
  return Math.max(1, tokensToAdd);
}

export async function creditPaidAiTokenOrder(order: {
  id: string;
  deviceId?: string | null;
  userId?: string | null;
  tokensCount?: number | null;
  amountFc?: number | null;
}) {
  const deviceId = order.deviceId?.trim();
  if (!deviceId) return;
  await ensureAiSimulationWallet(deviceId, order.userId);
  const paid = await paidSummary(deviceId, order.userId);
  const added = tokensToCredit(order);

  const wallet = await prisma.$transaction(async (tx) => {
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

export async function claimAiSimulationWallet(userId: string, deviceId: string) {
  return getAiSimulationWalletAllowance(deviceId, userId);
}
