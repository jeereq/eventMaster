'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, XCircle, X } from 'lucide-react';
import { useStudioJobs, type TrackedJob } from '@/context/StudioJobsContext';
import { isAiTokenShortageMessage, notifyAiTokensInsufficient } from '@/lib/aiTokenEvents';
import { cn } from '@/lib/cn';

const AUTO_DISMISS_SUCCESS_MS = 7_000;
const AUTO_DISMISS_ERROR_MS = 9_000;
const HOVER_GRACE_MS = 3_500;

function StudioJobCard({
  job,
  onDismiss,
}: {
  job: TrackedJob;
  onDismiss: (id: string) => void;
}) {
  const running = job.status === 'queued' || job.status === 'running';
  const [exiting, setExiting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const remainingMsRef = useRef<number>(
    job.status === 'error' ? AUTO_DISMISS_ERROR_MS : AUTO_DISMISS_SUCCESS_MS,
  );

  const triggerDismiss = useCallback(() => {
    setExiting(true);
    exitTimerRef.current = setTimeout(() => {
      onDismiss(job.id);
    }, 250);
  }, [job.id, onDismiss]);

  const scheduleDismiss = useCallback(
    (delay: number) => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      startTimeRef.current = Date.now();
      remainingMsRef.current = delay;
      dismissTimerRef.current = setTimeout(triggerDismiss, delay);
    },
    [triggerDismiss],
  );

  useEffect(() => {
    if (running) {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      return;
    }

    const totalDuration =
      job.status === 'error' ? AUTO_DISMISS_ERROR_MS : AUTO_DISMISS_SUCCESS_MS;
    const elapsed = job.completedAt ? Date.now() - job.completedAt : 0;
    const initialRemaining = Math.max(1_000, totalDuration - elapsed);

    scheduleDismiss(initialRemaining);

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [running, job.status, job.completedAt, scheduleDismiss]);

  const handleMouseEnter = () => {
    if (running) return;
    setIsHovered(true);
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    const elapsed = Date.now() - startTimeRef.current;
    remainingMsRef.current = Math.max(HOVER_GRACE_MS, remainingMsRef.current - elapsed);
  };

  const handleMouseLeave = () => {
    if (running) return;
    setIsHovered(false);
    scheduleDismiss(Math.max(HOVER_GRACE_MS, remainingMsRef.current));
  };

  const handleManualDismiss = () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    triggerDismiss();
  };

  const durationSec =
    (job.status === 'error' ? AUTO_DISMISS_ERROR_MS : AUTO_DISMISS_SUCCESS_MS) / 1000;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-surface/95 shadow-xl backdrop-blur-sm px-3.5 py-3 transition-all duration-250 ease-out',
        exiting
          ? 'opacity-0 translate-y-2 scale-95 pointer-events-none'
          : 'opacity-100 translate-y-0 scale-100',
      )}
    >
      <div className="flex items-start gap-2.5">
        {running ? (
          <Loader2 className="w-4 h-4 mt-0.5 animate-spin text-primary shrink-0" />
        ) : job.status === 'done' ? (
          <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">{job.label}</p>
          <p className="text-[11px] text-muted mt-0.5 leading-snug">
            {running
              ? 'Génération en cours — vous pouvez quitter cette page.'
              : job.status === 'done'
                ? 'Prête. Ouvrez le studio pour l’appliquer.'
                : job.error || 'La génération a échoué.'}
          </p>
          {job.status === 'done' ? (
            <Link
              href={job.href}
              onClick={handleManualDismiss}
              className="inline-block mt-1.5 text-[11px] font-bold text-primary hover:underline"
            >
              Ouvrir le résultat
            </Link>
          ) : null}
          {job.status === 'error' && isAiTokenShortageMessage(job.error) ? (
            <button
              type="button"
              onClick={() => notifyAiTokensInsufficient(job.error || undefined)}
              className="inline-block mt-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline"
            >
              Recharger des jetons
            </button>
          ) : null}
        </div>
        {!running ? (
          <button
            type="button"
            onClick={handleManualDismiss}
            className="p-1 rounded-lg text-muted hover:bg-surface-muted transition-colors"
            aria-label="Fermer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {!running ? (
        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-border/40 overflow-hidden">
          <div
            className={cn(
              'h-full w-full origin-left',
              job.status === 'done' ? 'bg-primary' : 'bg-red-500',
            )}
            style={{
              animation: `em-shrink-progress ${durationSec}s linear forwards`,
              animationPlayState: isHovered ? 'paused' : 'running',
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function StudioJobsDock() {
  const { jobs, dismissJob, activeCount } = useStudioJobs();
  if (jobs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[70] w-[min(22rem,calc(100vw-1.5rem))] space-y-2">
      {jobs.slice(0, 3).map((job) => (
        <StudioJobCard key={job.id} job={job} onDismiss={dismissJob} />
      ))}
      {activeCount > 3 ? (
        <p className="text-[10px] text-muted text-right pr-1">{activeCount} tâches en cours</p>
      ) : null}
    </div>
  );
}
