import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import {
  persistableRoomPlanImageUrl,
  serializeRoomPlanComposeRun,
  type RoomPlanComposeDraft,
} from './aiRoomPlanComposeHistoryUtils';

export type AiRoomPlanComposeSource = 'landing' | 'studio';

export type { RoomPlanComposeDraft };
export { persistableRoomPlanImageUrl, serializeRoomPlanComposeRun };

export type SaveAiRoomPlanComposeInput = {
  userId?: string | null;
  deviceId?: string | null;
  source: AiRoomPlanComposeSource;
  prompt?: string | null;
  imageUrl?: string | null;
  roomType?: string | null;
  widthM?: number | null;
  heightM?: number | null;
  draft: RoomPlanComposeDraft;
};

export async function saveAiRoomPlanComposeRun(input: SaveAiRoomPlanComposeInput) {
  const deviceId = input.deviceId?.trim() || null;
  const userId = input.userId?.trim() || null;
  if (!deviceId && !userId) return null;

  const run = await prisma.aiRoomPlanComposeRun.create({
    data: {
      userId,
      deviceId,
      source: input.source,
      prompt: input.prompt?.trim()?.slice(0, 2000) || null,
      imageUrl: persistableRoomPlanImageUrl(input.imageUrl),
      roomType: input.roomType?.trim()?.slice(0, 40) || null,
      widthM: Number.isFinite(input.widthM) ? input.widthM : null,
      heightM: Number.isFinite(input.heightM) ? input.heightM : null,
      draft: input.draft as unknown as Prisma.InputJsonValue,
    },
  });
  return serializeRoomPlanComposeRun(run);
}

export async function listAiRoomPlanComposeRuns(opts: {
  userId?: string | null;
  deviceId?: string | null;
  limit?: number;
}) {
  const userId = opts.userId?.trim() || null;
  const deviceId = opts.deviceId?.trim() || null;
  if (!userId && !deviceId) return [];

  const take = Math.min(Math.max(opts.limit ?? 20, 1), 40);
  const where: Prisma.AiRoomPlanComposeRunWhereInput =
    userId && deviceId
      ? { OR: [{ userId }, { deviceId }] }
      : userId
        ? { userId }
        : { deviceId };

  const rows = await prisma.aiRoomPlanComposeRun.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
  });
  return rows.map(serializeRoomPlanComposeRun);
}

export async function getAiRoomPlanComposeRun(opts: {
  id: string;
  userId?: string | null;
  deviceId?: string | null;
}) {
  const id = opts.id?.trim();
  if (!id) return null;
  const userId = opts.userId?.trim() || null;
  const deviceId = opts.deviceId?.trim() || null;

  const run = await prisma.aiRoomPlanComposeRun.findUnique({ where: { id } });
  if (!run) return null;

  const allowed =
    (userId && run.userId === userId) ||
    (deviceId && run.deviceId === deviceId) ||
    (userId && !run.userId && deviceId && run.deviceId === deviceId);
  if (!allowed) return null;

  return serializeRoomPlanComposeRun(run);
}

export async function claimDeviceRoomPlanComposeRuns(userId: string, deviceId: string) {
  const cleanDevice = deviceId.trim();
  if (!cleanDevice || !userId) return { claimed: 0 };

  const result = await prisma.aiRoomPlanComposeRun.updateMany({
    where: { deviceId: cleanDevice, userId: null },
    data: { userId },
  });
  return { claimed: result.count };
}
