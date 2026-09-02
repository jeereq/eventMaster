import { prisma } from '../db';

export const AI_FREE_TRIALS_MAX = 10;

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

export async function requireAiSimulationCredit(deviceId: string, userId?: string | null): Promise<AiWalletAllowance> {
  const allowance = await getAiSimulationWalletAllowance(deviceId, userId);
  if (!allowance.canSimulate) {
    fail(
      402,
      'Plus de simulations disponibles. Rechargez 20 recherches pour continuer.',
    );
  }
  return allowance;
}

export async function consumeAiSimulationCredit(
  deviceId: string,
  userId?: string | null,
): Promise<AiWalletAllowance> {
  const { wallet, paid } = await ensureAiSimulationWallet(deviceId, userId);
  const remaining = Math.max(0, AI_FREE_TRIALS_MAX - wallet.freeTrialsUsed) + Math.max(0, wallet.bonusTokens);
  if (remaining <= 0) {
    fail(402, 'Plus de simulations disponibles. Rechargez 20 recherches pour continuer.');
  }

  if (wallet.bonusTokens > 0) {
    const result = await prisma.aiSimulationWallet.updateMany({
      where: { id: wallet.id, bonusTokens: { gt: 0 } },
      data: { bonusTokens: { decrement: 1 } },
    });
    if (!result.count) {
      fail(402, 'Plus de simulations disponibles. Rechargez 20 recherches pour continuer.');
    }
  } else {
    const result = await prisma.aiSimulationWallet.updateMany({
      where: { id: wallet.id, freeTrialsUsed: { lt: AI_FREE_TRIALS_MAX } },
      data: { freeTrialsUsed: { increment: 1 } },
    });
    if (!result.count) {
      fail(402, 'Plus de simulations disponibles. Rechargez 20 recherches pour continuer.');
    }
  }

  const next = await prisma.aiSimulationWallet.findUnique({ where: { id: wallet.id } });
  if (!next) fail(500, 'Portefeuille de simulations introuvable.');
  return serialize(next, paid);
}

export async function creditPaidAiTokenOrder(order: {
  id: string;
  deviceId?: string | null;
  userId?: string | null;
  tokensCount?: number | null;
}) {
  const deviceId = order.deviceId?.trim();
  if (!deviceId) return;
  const { wallet, paid } = await ensureAiSimulationWallet(deviceId, order.userId);
  const credited = parseCredited(wallet.creditedOrderIds);
  if (credited.includes(order.id)) return serialize(wallet, paid);

  const updated = await prisma.aiSimulationWallet.update({
    where: { id: wallet.id },
    data: {
      bonusTokens: wallet.bonusTokens + Math.max(1, order.tokensCount || 20),
      creditedOrderIds: [...credited, order.id],
    },
  });
  return serialize(updated, {
    totalPaidTokens: paid.totalPaidTokens + Math.max(1, order.tokensCount || 20),
    paidOrdersCount: paid.paidOrdersCount + 1,
  });
}

export async function claimAiSimulationWallet(userId: string, deviceId: string) {
  return getAiSimulationWalletAllowance(deviceId, userId);
}
