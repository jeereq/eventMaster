import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import type { EventPlanAiResult } from './eventPlanAiService';

export type AiSimulationSource = 'landing' | 'dashboard';

export type SaveAiSimulationInput = {
  userId?: string | null;
  deviceId?: string | null;
  source: AiSimulationSource;
  prompt?: string | null;
  eventType?: string | null;
  city?: string | null;
  commune?: string | null;
  guestCount?: number | null;
  budgetMaxFc?: number | null;
  eventDate?: string | null;
  result: EventPlanAiResult;
};

export function serializeSimulationRun(run: {
  id: string;
  userId: string | null;
  deviceId: string | null;
  source: string;
  prompt: string | null;
  eventType: string | null;
  city: string | null;
  commune: string | null;
  guestCount: number | null;
  budgetMaxFc: number | null;
  eventDate: string | null;
  result: Prisma.JsonValue;
  createdAt: Date;
}) {
  return {
    id: run.id,
    userId: run.userId,
    deviceId: run.deviceId,
    source: run.source,
    prompt: run.prompt,
    eventType: run.eventType,
    city: run.city,
    commune: run.commune,
    guestCount: run.guestCount,
    budgetMaxFc: run.budgetMaxFc,
    eventDate: run.eventDate,
    result: run.result,
    createdAt: run.createdAt.toISOString(),
  };
}

export async function saveAiSimulationRun(input: SaveAiSimulationInput) {
  const deviceId = input.deviceId?.trim() || null;
  const userId = input.userId?.trim() || null;
  if (!deviceId && !userId) return null;

  const run = await prisma.aiSimulationRun.create({
    data: {
      userId,
      deviceId,
      source: input.source,
      prompt: input.prompt?.trim() || null,
      eventType: input.eventType || null,
      city: input.city || null,
      commune: input.commune || null,
      guestCount: input.guestCount && input.guestCount > 0 ? Math.round(input.guestCount) : null,
      budgetMaxFc: input.budgetMaxFc && input.budgetMaxFc > 0 ? Math.round(input.budgetMaxFc) : null,
      eventDate: input.eventDate || null,
      result: input.result as unknown as Prisma.InputJsonValue,
    },
  });
  return serializeSimulationRun(run);
}

export async function listAiSimulationRuns(opts: {
  userId?: string | null;
  deviceId?: string | null;
  limit?: number;
}) {
  const userId = opts.userId?.trim() || null;
  const deviceId = opts.deviceId?.trim() || null;
  if (!userId && !deviceId) return [];

  const take = Math.min(Math.max(opts.limit ?? 12, 1), 40);
  const where: Prisma.AiSimulationRunWhereInput = userId && deviceId
    ? { OR: [{ userId }, { deviceId }] }
    : userId
      ? { userId }
      : { deviceId };

  const rows = await prisma.aiSimulationRun.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
  });
  return rows.map(serializeSimulationRun);
}

export async function claimDeviceSimulations(userId: string, deviceId: string) {
  const cleanDevice = deviceId.trim();
  if (!cleanDevice || !userId) return { claimed: 0 };

  const result = await prisma.aiSimulationRun.updateMany({
    where: { deviceId: cleanDevice, userId: null },
    data: { userId },
  });
  return { claimed: result.count };
}
