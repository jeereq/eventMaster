import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { toPrismaJson } from '../utils/prismaJson.ts';

export type StudioJobKind = 'invitation' | 'room';
export type StudioJobStatus = 'queued' | 'running' | 'done' | 'error';

export type StudioJobRecord = {
  id: string;
  kind: StudioJobKind;
  status: StudioJobStatus;
  userId: string | null;
  deviceId: string;
  prompt: string;
  error?: string;
  historyId?: string | null;
  result?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
};

const JOB_TTL_MS = 2 * 60 * 60 * 1000;
const STALE_RUNNING_MS = 15 * 60 * 1000;
const jobs = new Map<string, StudioJobRecord>();

function shouldPersistStudioJobs(): boolean {
  if (process.env.STUDIO_JOBS_MEMORY === '1') return false;
  if (process.env.NODE_ENV === 'test') return false;
  if (process.argv.includes('--test') || process.argv.some((arg) => arg.includes('.test.ts'))) {
    return false;
  }
  return true;
}

function pruneStudioJobs() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs) {
    if (job.updatedAt < cutoff) jobs.delete(id);
  }
}

function canReadJob(job: StudioJobRecord, userId?: string | null, deviceId?: string | null) {
  if (userId && job.userId === userId) return true;
  if (deviceId && job.deviceId === deviceId) return true;
  return false;
}

function expireStaleRunningJob(job: StudioJobRecord): StudioJobRecord {
  if (job.status !== 'running' && job.status !== 'queued') return job;
  if (Date.now() - job.updatedAt < STALE_RUNNING_MS) return job;
  job.status = 'error';
  job.error = 'Le serveur a redémarré pendant la génération. Relancez la création.';
  job.updatedAt = Date.now();
  persistStudioJob(job);
  return job;
}

function rowToJob(row: {
  id: string;
  kind: string;
  status: string;
  userId: string | null;
  deviceId: string;
  prompt: string;
  error: string | null;
  historyId: string | null;
  result: unknown;
  createdAt: Date;
  updatedAt: Date;
}): StudioJobRecord {
  return {
    id: row.id,
    kind: row.kind === 'room' ? 'room' : 'invitation',
    status:
      row.status === 'running' || row.status === 'done' || row.status === 'error'
        ? row.status
        : 'queued',
    userId: row.userId,
    deviceId: row.deviceId,
    prompt: row.prompt,
    error: row.error || undefined,
    historyId: row.historyId,
    result:
      row.result && typeof row.result === 'object' && !Array.isArray(row.result)
        ? (row.result as Record<string, unknown>)
        : undefined,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

async function persistStudioJob(job: StudioJobRecord): Promise<void> {
  if (!shouldPersistStudioJobs()) return;
  try {
    const { prisma } = await import('../db.ts');
    const data = {
      kind: job.kind,
      status: job.status,
      userId: job.userId,
      deviceId: job.deviceId,
      prompt: job.prompt,
      error: job.error || null,
      historyId: job.historyId || null,
      result: job.result ? toPrismaJson(job.result) : Prisma.DbNull,
      createdAt: new Date(job.createdAt),
      updatedAt: new Date(job.updatedAt),
    };
    await prisma.studioJob.upsert({
      where: { id: job.id },
      create: { id: job.id, ...data },
      update: {
        status: data.status,
        error: data.error,
        historyId: data.historyId,
        result: data.result,
        updatedAt: data.updatedAt,
      },
    });
  } catch (error) {
    console.warn('[studioJob] persist skipped:', (error as Error)?.message);
  }
}

async function loadPersistedStudioJob(id: string): Promise<StudioJobRecord | null> {
  if (!shouldPersistStudioJobs()) return null;
  try {
    const { prisma } = await import('../db.ts');
    const row = await prisma.studioJob.findUnique({ where: { id } });
    return row ? rowToJob(row) : null;
  } catch (error) {
    console.warn('[studioJob] load skipped:', (error as Error)?.message);
    return null;
  }
}

async function loadPersistedStudioJobs(access: {
  userId?: string | null;
  deviceId?: string | null;
}): Promise<void> {
  if (!shouldPersistStudioJobs()) return;
  try {
    const { prisma } = await import('../db.ts');
    const or = [];
    if (access.userId) or.push({ userId: access.userId });
    if (access.deviceId) or.push({ deviceId: access.deviceId });
    if (!or.length) return;
    const cutoff = new Date(Date.now() - JOB_TTL_MS);
    const rows = await prisma.studioJob.findMany({
      where: { OR: or, updatedAt: { gte: cutoff } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    for (const row of rows) {
      const incoming = rowToJob(row);
      const existing = jobs.get(incoming.id);
      if (!existing || incoming.updatedAt >= existing.updatedAt) {
        jobs.set(incoming.id, incoming);
      }
    }
    await prisma.studioJob.deleteMany({ where: { updatedAt: { lt: cutoff } } }).catch(() => undefined);
  } catch (error) {
    console.warn('[studioJob] list load skipped:', (error as Error)?.message);
  }
}

export function createStudioJob(input: {
  kind: StudioJobKind;
  userId?: string | null;
  deviceId: string;
  prompt?: string;
}): StudioJobRecord {
  pruneStudioJobs();
  const now = Date.now();
  const job: StudioJobRecord = {
    id: randomUUID(),
    kind: input.kind,
    status: 'queued',
    userId: input.userId?.trim() || null,
    deviceId: input.deviceId.trim(),
    prompt: (input.prompt || '').trim().slice(0, 200),
    createdAt: now,
    updatedAt: now,
  };
  jobs.set(job.id, job);
  void persistStudioJob(job);
  return job;
}

export async function getStudioJob(
  id: string,
  access?: { userId?: string | null; deviceId?: string | null },
): Promise<StudioJobRecord | null> {
  pruneStudioJobs();
  let job = jobs.get(id) || null;
  if (!job) {
    job = await loadPersistedStudioJob(id);
    if (job) jobs.set(job.id, job);
  }
  if (!job) return null;
  const latest = expireStaleRunningJob(job);
  if (access && !canReadJob(latest, access.userId, access.deviceId)) return null;
  return latest;
}

export async function listStudioJobs(access: {
  userId?: string | null;
  deviceId?: string | null;
}): Promise<StudioJobRecord[]> {
  await loadPersistedStudioJobs(access);
  pruneStudioJobs();
  return [...jobs.values()]
    .map((job) => expireStaleRunningJob(job))
    .filter((job) => canReadJob(job, access.userId, access.deviceId))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 20);
}

export function markStudioJobRunning(id: string) {
  const job = jobs.get(id);
  if (!job) return;
  job.status = 'running';
  job.updatedAt = Date.now();
  void persistStudioJob(job);
}

export function completeStudioJob(
  id: string,
  payload: { result: Record<string, unknown>; historyId?: string | null },
) {
  const job = jobs.get(id);
  if (!job) return;
  job.status = 'done';
  job.result = payload.result;
  job.historyId = payload.historyId || null;
  job.updatedAt = Date.now();
  void persistStudioJob(job);
}

export function failStudioJob(id: string, message: string) {
  const job = jobs.get(id);
  if (!job) return;
  job.status = 'error';
  job.error = message.slice(0, 400);
  job.updatedAt = Date.now();
  void persistStudioJob(job);
}

export function runStudioJob(id: string, work: () => Promise<void>) {
  markStudioJobRunning(id);
  setImmediate(() => {
    work().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'La génération a échoué.';
      failStudioJob(id, message);
    });
  });
}

export function serializeStudioJob(job: StudioJobRecord) {
  return {
    id: job.id,
    kind: job.kind,
    status: job.status,
    prompt: job.prompt,
    error: job.error || null,
    historyId: job.historyId || null,
    result: job.status === 'done' ? job.result || null : null,
    createdAt: new Date(job.createdAt).toISOString(),
    updatedAt: new Date(job.updatedAt).toISOString(),
  };
}
