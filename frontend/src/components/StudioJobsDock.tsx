'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Coins, Loader2, RefreshCw, Sparkles, X, XCircle } from 'lucide-react';
import { useStudioJobs, type TrackedJob } from '@/context/StudioJobsContext';
import { isAiTokenShortageMessage, notifyAiTokensInsufficient } from '@/lib/aiTokenEvents';
import { cn } from '@/lib/cn';

const AUTO_DISMISS_SUCCESS_MS = 8_000;
const AUTO_DISMISS_ERROR_MS = 10_000;
const HOVER_GRACE_MS = 4_000;

function StudioJobCard({
  job,
  onDismiss,
}: {
  job: TrackedJob;
  onDismiss: (id: string) => void;
}) {
  const running = job.status === 'queued' || job.status === 'running';
  const isDone = job.status === 'done';
  const isError = job.status === 'error';
  const [exiting, setExiting] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const remainingMsRef = useRef<number>(
    isError ? AUTO_DISMISS_ERROR_MS : AUTO_DISMISS_SUCCESS_MS,
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

    const totalDuration = isError ? AUTO_DISMISS_ERROR_MS : AUTO_DISMISS_SUCCESS_MS;
    const elapsed = job.completedAt ? Date.now() - job.completedAt : 0;
    const initialRemaining = Math.max(1_000, totalDuration - elapsed);

    scheduleDismiss(initialRemaining);

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [running, isError, job.completedAt, scheduleDismiss]);

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

  const durationSec = (isError ? AUTO_DISMISS_ERROR_MS : AUTO_DISMISS_SUCCESS_MS) / 1000;
  const isTokenShortage = isError && isAiTokenShortageMessage(job.error);

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative overflow-hidden rounded-2xl border backdrop-blur-md px-4 py-3.5 transition-all duration-300 ease-out shadow-2xl',
        running && 'border-primary/40 bg-surface/95 dark:bg-surface/90 ring-1 ring-primary/20',
        isDone && 'border-emerald-500/50 bg-emerald-50/95 dark:bg-emerald-950/80 text-foreground ring-2 ring-emerald-500/20 shadow-emerald-500/10',
        isError && 'border-rose-500/60 bg-rose-50/95 dark:bg-rose-950/85 text-foreground ring-2 ring-rose-500/25 shadow-rose-500/10',
        exiting
          ? 'opacity-0 translate-y-3 scale-95 pointer-events-none'
          : 'opacity-100 translate-y-0 scale-100 animate-in fade-in slide-in-from-bottom-2',
      )}
    >
      <div className="flex items-start gap-3">
        {running ? (
          <div className="relative mt-0.5 shrink-0">
            <span className="absolute inset-0 rounded-full animate-ping bg-primary/20" />
            <Loader2 className="w-5 h-5 animate-spin text-primary relative" />
          </div>
        ) : isDone ? (
          <div className="mt-0.5 p-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        ) : (
          <div className="mt-0.5 p-1 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {running ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-primary/15 text-primary uppercase tracking-wide">
                En cours
              </span>
            ) : isDone ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                <Sparkles className="w-2.5 h-2.5" /> Succès Studio
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-500/20 text-rose-700 dark:text-rose-300 uppercase tracking-wide">
                Échec Studio
              </span>
            )}
            <p className="text-xs font-bold text-foreground truncate">{job.label}</p>
          </div>

          <p className="text-xs text-muted-foreground dark:text-muted mt-1 leading-relaxed">
            {running
              ? 'Génération IA en cours — vous pouvez continuer à travailler ou quitter cette page.'
              : isDone
                ? 'Création terminée avec succès ! Le résultat est prêt à être appliqué.'
                : job.error || 'La génération du studio n’a pas pu aboutir.'}
          </p>

          {isDone ? (
            <Link
              href={job.href}
              onClick={handleManualDismiss}
              className="inline-flex items-center justify-center gap-1.5 mt-2.5 w-full py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all active:scale-[0.98]"
            >
              <span>Ouvrir et appliquer le résultat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : null}

          {isError ? (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {isTokenShortage ? (
                <button
                  type="button"
                  onClick={() => {
                    handleManualDismiss();
                    notifyAiTokensInsufficient(job.error || undefined);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition active:scale-[0.98]"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Recharger mes jetons</span>
                </button>
              ) : null}
              <Link
                href={job.href}
                onClick={handleManualDismiss}
                className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-surface border border-border hover:bg-surface-muted text-foreground font-semibold text-xs transition"
              >
                <RefreshCw className="w-3 h-3 text-muted" />
                <span>Réessayer dans le Studio</span>
              </Link>
            </div>
          ) : null}
        </div>

        {!running ? (
          <button
            type="button"
            onClick={handleManualDismiss}
            className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-muted/80 transition-colors"
            aria-label="Fermer la notification"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {!running ? (
        <div className="absolute bottom-0 inset-x-0 h-1 bg-border/30 overflow-hidden">
          <div
            className={cn(
              'h-full w-full origin-left',
              isDone ? 'bg-emerald-500' : 'bg-rose-500',
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
