import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { calculateTokensForAmount, currentAiTokenPricing } from './aiTokenFlexPayService';
import { resolveLedgerAction, type AiTokenAction } from './aiTokenUsageQuery';

export const USER_GRANT_DEVICE_PREFIX = 'user-grant:';

export function userGrantDeviceId(userId: string): string {
  return `${USER_GRANT_DEVICE_PREFIX}${userId}`;
}

export function isUnlimitedAiTokenUser(user?: { role?: string; impersonatedBy?: string } | null): boolean {
  return user?.role === 'SUPER_ADMIN' || Boolean(user?.impersonatedBy);
}

export const AI_FREE_TRIALS_MAX = 4;
export const AI_SIMULATION_TOKEN_COST = 1;
export const AI_INVITATION_COMPOSE_TOKEN_COST = 2;
export const AI_ROOM_PLAN_TOKEN_COST = 3;

export type { AiTokenAction };
export type AiTokenLedgerSource = 'landing' | 'dashboard' | 'studio' | 'flexpay' | 'admin' | 'support' | 'signup' | 'unknown';
export type AiTokenPool = 'free' | 'bonus' | 'mixed' | 'paid' | 'granted' | 'comp';

export type AiTokenLedgerMeta = {
  action?: AiTokenAction;
  source?: AiTokenLedgerSource;
  relatedId?: string | null;
  unlimited?: boolean;
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
    tokensFromGranted?: number;
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
        tokensFromGranted: Math.max(0, entry.tokensFromGranted ?? 0),
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
  grantedTokens: number;
  totalRemaining: number;
  canSimulate: boolean;
  unlimited: boolean;
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
    grantedTokens?: number;
  },
  paid: { totalPaidTokens: number; paidOrdersCount: number },
  opts?: { unlimited?: boolean },
): AiWalletAllowance {
  const freeTrialsUsed = Math.max(0, wallet.freeTrialsUsed);
  const bonusTokens = Math.max(0, wallet.bonusTokens);
  const grantedTokens = Math.max(0, wallet.grantedTokens ?? 0);
  const freeRemaining = Math.max(0, AI_FREE_TRIALS_MAX - freeTrialsUsed);
  const totalRemaining = freeRemaining + bonusTokens + grantedTokens;
  const unlimited = Boolean(opts?.unlimited);
  return {
    deviceId: wallet.deviceId,
    userId: wallet.userId,
    freeTrialsUsed,
    freeTrialsMax: AI_FREE_TRIALS_MAX,
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
    const boot = await bootstrapNewWallet(wallet);
    const absorbed = await absorbUserGrantWallet(boot.wallet, userId);
    return { wallet: absorbed, paid: boot.paid };
  }
  if (userId && !wallet.userId) {
    wallet = await prisma.aiSimulationWallet.update({
      where: { id: wallet.id },
      data: { userId },
    });
  }

  const absorbed = await absorbUserGrantWallet(wallet, userId);
  const synced = await syncPaidCredits(absorbed);
  return synced;
}

async function absorbUserGrantWallet(
  wallet: {
    id: string;
    deviceId: string;
    userId: string | null;
    freeTrialsUsed: number;
    bonusTokens: number;
    grantedTokens?: number;
    creditedOrderIds: unknown;
  },
  userId?: string | null,
) {
  if (!userId) return wallet;
  const grantDevice = userGrantDeviceId(userId);
  if (wallet.deviceId === grantDevice) return wallet;
  const grantWallet = await prisma.aiSimulationWallet.findUnique({ where: { deviceId: grantDevice } });
  const pending = Math.max(0, grantWallet?.grantedTokens ?? 0);
  if (!grantWallet || pending <= 0) return wallet;

  const [updated] = await prisma.$transaction([
    prisma.aiSimulationWallet.update({
      where: { id: wallet.id },
      data: { grantedTokens: Math.max(0, wallet.grantedTokens ?? 0) + pending, userId },
    }),
    prisma.aiSimulationWallet.update({
      where: { id: grantWallet.id },
      data: { grantedTokens: 0 },
    }),
  ]);
  return updated;
}

export async function grantAiTokensToUser(input: {
  userId: string;
  tokensCount: number;
  adminUserId: string;
  relatedId?: string;
  source?: string;
}) {
  const userId = input.userId.trim();
  const tokensCount = Math.max(1, Math.round(input.tokensCount));
  if (!userId) fail(400, 'Utilisateur manquant.');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) fail(404, 'Utilisateur introuvable.');

  const deviceId = userGrantDeviceId(userId);
  const relatedId = input.relatedId?.trim() || `grant_${userId}_${Date.now()}`;
  const paid = await paidSummary(deviceId, userId);

  if (input.relatedId?.trim()) {
    const already = await prisma.aiTokenLedger.findFirst({
      where: { action: 'grant', relatedId },
      select: { id: true },
    });
    if (already) fail(409, 'Ces jetons ont déjà été offerts.');
  }

  const wallet = await prisma.$transaction(async (tx) => {
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

export async function getAiSimulationWalletAllowance(
  deviceId: string,
  userId?: string | null,
): Promise<AiWalletAllowance> {
  const { wallet, paid } = await ensureAiSimulationWallet(deviceId, userId);
  return serialize(wallet, paid);
}

function insufficientCreditMessage(need: number, remaining: number) {
  const pricing = currentAiTokenPricing();
  const hint = `Rechargez dès ${pricing.minAmountCdf.toLocaleString('fr-FR')} FC pour ${pricing.minCount} jeton${pricing.minCount > 1 ? 's' : ''}.`;
  if (need > 1) {
    return `Cette action consomme ${need} jetons. Solde insuffisant (${remaining}). ${hint}`;
  }
  return `Plus de jetons disponibles. ${hint}`;
}

export async function requireAiSimulationCredit(
  deviceId: string,
  userId?: string | null,
  count = AI_SIMULATION_TOKEN_COST,
  meta?: AiTokenLedgerMeta,
): Promise<AiWalletAllowance> {
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

function consumePool(fromBonus: number, fromGranted: number, fromFree: number): AiTokenPool {
  const used = [fromBonus > 0, fromGranted > 0, fromFree > 0].filter(Boolean).length;
  if (used > 1) return 'mixed';
  if (fromGranted > 0) return 'granted';
  if (fromBonus > 0) return 'bonus';
  return 'free';
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
      return wallet;
    }

    const freeRemaining = Math.max(0, AI_FREE_TRIALS_MAX - wallet.freeTrialsUsed);
    const bonus = Math.max(0, wallet.bonusTokens);
    const granted = Math.max(0, wallet.grantedTokens ?? 0);
    const remaining = freeRemaining + bonus + granted;
    if (remaining < need) {
      fail(402, insufficientCreditMessage(need, remaining));
    }

    const fromBonus = Math.min(need, bonus);
    const afterBonus = need - fromBonus;
    const fromGranted = Math.min(afterBonus, granted);
    const fromFree = afterBonus - fromGranted;
    const next = await tx.aiSimulationWallet.update({
      where: { id: wallet.id },
      data: {
        bonusTokens: bonus - fromBonus,
        grantedTokens: granted - fromGranted,
        freeTrialsUsed: Math.min(AI_FREE_TRIALS_MAX, wallet.freeTrialsUsed + fromFree),
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
      tokensFromGranted: fromGranted,
      pool: consumePool(fromBonus, fromGranted, fromFree),
      relatedId: meta?.relatedId,
    });
    return next;
  });

  return serialize(updated, paid, { unlimited: Boolean(meta?.unlimited) });
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
        : currentAiTokenPricing().minCount;
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
