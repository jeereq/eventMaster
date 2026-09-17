'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { applyServerAllowance } from '@/lib/aiTokens';
import { playAiGenerationCompleteSound } from '@/lib/audioNotifications';
import { saveAiTemplateDraft, type TemplateAiComposeContent } from '@/lib/templateAiCompose';
import { saveRoomPlanAiDraft, type RoomPlanVisionDraft } from '@/lib/roomPlanAi';
import {
  fetchStudioJob,
  fetchStudioJobs,
  onStudioJob,
  dispatchStudioJob,
  studioJobHref,
  studioJobLabel,
  type StudioJobKind,
  type StudioJobPayload,
} from '@/lib/studioJobs';

const STORAGE_KEY = 'em_studio_jobs';
const POLL_MS = 2500;

type TrackedJob = StudioJobPayload & { label: string; href: string };

type StudioJobsContextValue = {
  jobs: TrackedJob[];
  trackJob: (jobId: string, kind: StudioJobKind, prompt?: string) => void;
  dismissJob: (jobId: string) => void;
  activeCount: number;
};

const StudioJobsContext = createContext<StudioJobsContextValue | null>(null);

function readStoredJobs(): TrackedJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TrackedJob[];
    return Array.isArray(parsed) ? parsed.filter((job) => job?.id) : [];
  } catch {
    return [];
  }
}

function writeStoredJobs(jobs: TrackedJob[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.slice(0, 12)));
  } catch {
    /* quota */
  }
}

export function StudioJobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<TrackedJob[]>([]);
  const jobsRef = useRef<TrackedJob[]>([]);
  jobsRef.current = jobs;
  const seenDone = useRef(new Set<string>());

  useEffect(() => {
    setJobs(readStoredJobs());
  }, []);

  useEffect(() => {
    writeStoredJobs(jobs);
  }, [jobs]);

  const mergeJob = useCallback((incoming: StudioJobPayload, extras?: { label?: string; href?: string }) => {
    setJobs((prev) => {
      const existing = prev.find((job) => job.id === incoming.id);
      const next: TrackedJob = {
        ...incoming,
        label: extras?.label || existing?.label || studioJobLabel(incoming.kind, incoming.prompt),
        href: extras?.href || existing?.href || studioJobHref(incoming.kind),
      };
      const others = prev.filter((job) => job.id !== incoming.id);
      return [next, ...others].slice(0, 12);
    });
  }, []);

  const trackJob = useCallback((jobId: string, kind: StudioJobKind, prompt?: string) => {
    mergeJob({
      id: jobId,
      kind,
      status: 'queued',
      prompt: prompt || '',
      error: null,
      historyId: null,
      result: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { label: studioJobLabel(kind, prompt), href: studioJobHref(kind) });
  }, [mergeJob]);

  const dismissJob = useCallback((jobId: string) => {
    setJobs((prev) => prev.filter((job) => job.id !== jobId));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const pending = jobsRef.current.filter((job) => job.status === 'queued' || job.status === 'running');
      if (pending.length === 0) return;
      await Promise.all(pending.map(async (job) => {
        try {
          const latest = await fetchStudioJob(job.id);
          if (cancelled) return;
          mergeJob(latest);
          if (latest.status === 'done' || latest.status === 'error') {
            dispatchStudioJob(latest);
          }
        } catch {
          /* keep polling */
        }
      }));
    };

    void poll();
    const interval = window.setInterval(() => { void poll(); }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [jobs, mergeJob]);

  useEffect(() => {
    return onStudioJob((job) => {
      if (job.status !== 'done' || seenDone.current.has(job.id)) return;
      seenDone.current.add(job.id);
      const result = job.result || {};
      if (result.allowance) applyServerAllowance(result.allowance);
      if (job.kind === 'invitation' && result.content && typeof result.content === 'object') {
        saveAiTemplateDraft(result.content as TemplateAiComposeContent, job.prompt);
      }
      if (job.kind === 'room' && result.draft && typeof result.draft === 'object') {
        saveRoomPlanAiDraft(result.draft as RoomPlanVisionDraft, { prompt: job.prompt });
      }
      playAiGenerationCompleteSound();
    });
  }, []);

  useEffect(() => {
    void fetchStudioJobs().then((items) => {
      items.forEach((item) => mergeJob(item));
    }).catch(() => undefined);
  }, [mergeJob]);

  const value = useMemo<StudioJobsContextValue>(() => ({
    jobs,
    trackJob,
    dismissJob,
    activeCount: jobs.filter((job) => job.status === 'queued' || job.status === 'running').length,
  }), [jobs, trackJob, dismissJob]);

  return (
    <StudioJobsContext.Provider value={value}>
      {children}
    </StudioJobsContext.Provider>
  );
}

export function useStudioJobs(): StudioJobsContextValue {
  const context = useContext(StudioJobsContext);
  if (!context) {
    throw new Error('useStudioJobs must be used within StudioJobsProvider');
  }
  return context;
}

export function useOptionalStudioJobs(): StudioJobsContextValue | null {
  return useContext(StudioJobsContext);
}
