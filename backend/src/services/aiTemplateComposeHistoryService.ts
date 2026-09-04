import { Prisma } from '@prisma/client';
import { prisma } from '../db';

export type AiTemplateComposeSource = 'landing' | 'studio';

export type SaveAiTemplateComposeInput = {
  userId?: string | null;
  deviceId?: string | null;
  source: AiTemplateComposeSource;
  prompt?: string | null;
  referenceUrls?: string[];
  content: {
    global?: Record<string, unknown>;
    elements?: unknown[];
  };
  stage?: Record<string, unknown> | null;
};

export function serializeTemplateComposeRun(run: {
  id: string;
  userId: string | null;
  deviceId: string | null;
  source: string;
  prompt: string | null;
  referenceUrls: Prisma.JsonValue;
  previewImageUrl: string | null;
  content: Prisma.JsonValue;
  stage: Prisma.JsonValue | null;
  createdAt: Date;
}) {
  const refs = Array.isArray(run.referenceUrls)
    ? run.referenceUrls.filter((u): u is string => typeof u === 'string')
    : [];
  return {
    id: run.id,
    userId: run.userId,
    deviceId: run.deviceId,
    source: run.source,
    prompt: run.prompt,
    referenceUrls: refs,
    previewImageUrl: run.previewImageUrl,
    content: run.content,
    stage: run.stage,
    createdAt: run.createdAt.toISOString(),
  };
}

function extractPreviewUrl(content: SaveAiTemplateComposeInput['content']): string | null {
  const global = content?.global;
  if (!global || typeof global !== 'object') return null;
  const url = (global as Record<string, unknown>).bgImageUrl;
  return typeof url === 'string' && /^https?:\/\//i.test(url) ? url : null;
}

export async function saveAiTemplateComposeRun(input: SaveAiTemplateComposeInput) {
  const deviceId = input.deviceId?.trim() || null;
  const userId = input.userId?.trim() || null;
  if (!deviceId && !userId) return null;

  const referenceUrls = (input.referenceUrls || [])
    .filter((u) => typeof u === 'string' && u.trim())
    .map((u) => u.trim())
    .slice(0, 4);

  const run = await prisma.aiTemplateComposeRun.create({
    data: {
      userId,
      deviceId,
      source: input.source,
      prompt: input.prompt?.trim()?.slice(0, 2000) || null,
      referenceUrls,
      previewImageUrl: extractPreviewUrl(input.content),
      content: input.content as unknown as Prisma.InputJsonValue,
      stage: (input.stage || null) as Prisma.InputJsonValue,
    },
  });
  return serializeTemplateComposeRun(run);
}

export async function listAiTemplateComposeRuns(opts: {
  userId?: string | null;
  deviceId?: string | null;
  limit?: number;
}) {
  const userId = opts.userId?.trim() || null;
  const deviceId = opts.deviceId?.trim() || null;
  if (!userId && !deviceId) return [];

  const take = Math.min(Math.max(opts.limit ?? 20, 1), 40);
  const where: Prisma.AiTemplateComposeRunWhereInput =
    userId && deviceId
      ? { OR: [{ userId }, { deviceId }] }
      : userId
        ? { userId }
        : { deviceId };

  const rows = await prisma.aiTemplateComposeRun.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
  });
  return rows.map(serializeTemplateComposeRun);
}

export async function getAiTemplateComposeRun(opts: {
  id: string;
  userId?: string | null;
  deviceId?: string | null;
}) {
  const id = opts.id?.trim();
  if (!id) return null;
  const userId = opts.userId?.trim() || null;
  const deviceId = opts.deviceId?.trim() || null;

  const run = await prisma.aiTemplateComposeRun.findUnique({ where: { id } });
  if (!run) return null;

  const allowed =
    (userId && run.userId === userId) ||
    (deviceId && run.deviceId === deviceId) ||
    (userId && !run.userId && deviceId && run.deviceId === deviceId);
  if (!allowed) return null;

  return serializeTemplateComposeRun(run);
}

export async function claimDeviceTemplateComposeRuns(userId: string, deviceId: string) {
  const cleanDevice = deviceId.trim();
  if (!cleanDevice || !userId) return { claimed: 0 };

  const result = await prisma.aiTemplateComposeRun.updateMany({
    where: { deviceId: cleanDevice, userId: null },
    data: { userId },
  });
  return { claimed: result.count };
}
