'use client';

import Link from 'next/link';
import { CheckCircle2, Loader2, XCircle, X } from 'lucide-react';
import { useStudioJobs } from '@/context/StudioJobsContext';

export default function StudioJobsDock() {
  const { jobs, dismissJob, activeCount } = useStudioJobs();
  if (jobs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[70] w-[min(22rem,calc(100vw-1.5rem))] space-y-2">
      {jobs.slice(0, 3).map((job) => {
        const running = job.status === 'queued' || job.status === 'running';
        return (
          <div
            key={job.id}
            className="rounded-2xl border border-border bg-surface/95 shadow-xl backdrop-blur-sm px-3.5 py-3"
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
                    className="inline-block mt-1.5 text-[11px] font-bold text-primary hover:underline"
                  >
                    Ouvrir le résultat
                  </Link>
                ) : null}
              </div>
              {!running ? (
                <button
                  type="button"
                  onClick={() => dismissJob(job.id)}
                  className="p-1 rounded-lg text-muted hover:bg-surface-muted"
                  aria-label="Fermer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
      {activeCount > 3 ? (
        <p className="text-[10px] text-muted text-right pr-1">{activeCount} tâches en cours</p>
      ) : null}
    </div>
  );
}
