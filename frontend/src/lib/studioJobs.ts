import { api } from '@/lib/api';
import { getOrCreateDeviceId } from '@/lib/aiTokens';

export type StudioJobKind = 'invitation' | 'room';
export type StudioJobStatus = 'queued' | 'running' | 'done' | 'error';

export type StudioJobPayload = {
  id: string;
  kind: StudioJobKind;
  status: StudioJobStatus;
  prompt: string;
  error: string | null;
  historyId: string | null;
  result: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type StudioJobAccepted = {
  jobId: string;
  status: StudioJobStatus;
  background: true;
};

export const STUDIO_JOB_EVENT = 'em-studio-job';

export function isStudioJobAccepted(data: unknown): data is StudioJobAccepted {
  if (!data || typeof data !== 'object') return false;
  const row = data as Record<string, unknown>;
  return typeof row.jobId === 'string' && row.background === true;
}

export function isStudioJobRunning(job: { kind?: StudioJobKind; status?: StudioJobStatus } | null | undefined, kind: StudioJobKind): boolean {
  return job?.kind === kind && (job.status === 'queued' || job.status === 'running');
}

export async function fetchStudioJob(jobId: string): Promise<StudioJobPayload> {
  const deviceId = getOrCreateDeviceId();
  return api.get(`/public/studio/jobs/${encodeURIComponent(jobId)}?deviceId=${encodeURIComponent(deviceId)}`) as Promise<StudioJobPayload>;
}

export async function fetchStudioJobs(): Promise<StudioJobPayload[]> {
  const deviceId = getOrCreateDeviceId();
  const data = await api.get(`/public/studio/jobs?deviceId=${encodeURIComponent(deviceId)}`);
  return Array.isArray(data?.items) ? data.items : [];
}

export function studioJobHref(kind: StudioJobKind): string {
  return kind === 'room' ? '/dashboard/rooms' : '/dashboard/templates';
}

export function studioJobLabel(kind: StudioJobKind, prompt?: string): string {
  const short = (prompt || '').trim();
  const hint = short ? ` — ${short.slice(0, 42)}${short.length > 42 ? '…' : ''}` : '';
  return kind === 'room' ? `Plan de salle${hint}` : `Invitation${hint}`;
}

export function dispatchStudioJob(job: StudioJobPayload) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(STUDIO_JOB_EVENT, { detail: job }));
}

export function onStudioJob(listener: (job: StudioJobPayload) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<StudioJobPayload>).detail;
    if (detail?.id) listener(detail);
  };
  window.addEventListener(STUDIO_JOB_EVENT, handler);
  return () => window.removeEventListener(STUDIO_JOB_EVENT, handler);
}
