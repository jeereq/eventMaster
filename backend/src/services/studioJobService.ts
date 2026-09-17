import { randomUUID } from 'node:crypto';

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
const jobs = new Map<string, StudioJobRecord>();

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
  return job;
}

export function getStudioJob(
  id: string,
  access?: { userId?: string | null; deviceId?: string | null },
): StudioJobRecord | null {
  const job = jobs.get(id);
  if (!job) return null;
  if (access && !canReadJob(job, access.userId, access.deviceId)) return null;
  return job;
}

export function listStudioJobs(access: { userId?: string | null; deviceId?: string | null }): StudioJobRecord[] {
  pruneStudioJobs();
  return [...jobs.values()]
    .filter((job) => canReadJob(job, access.userId, access.deviceId))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 20);
}

export function markStudioJobRunning(id: string) {
  const job = jobs.get(id);
  if (!job) return;
  job.status = 'running';
  job.updatedAt = Date.now();
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
}

export function failStudioJob(id: string, message: string) {
  const job = jobs.get(id);
  if (!job) return;
  job.status = 'error';
  job.error = message.slice(0, 400);
  job.updatedAt = Date.now();
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
