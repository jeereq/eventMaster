'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, ChevronRight, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/cn';

const STORAGE_KEY = 'em-getting-started';

type PersistedFlow = {
  dismissed?: boolean;
  guestsDone?: boolean;
  guestInfoDone?: boolean;
  feedDone?: boolean;
  templateDone?: boolean;
  guideDone?: boolean;
};

export type GettingStartedProps = {
  hasEvents: boolean;
  hasTemplates?: boolean;
  firstEventId?: string | null;
  className?: string;
  variant?: 'organizer' | 'vendor';
  hasRooms?: boolean;
  hasServices?: boolean;
  preferServices?: boolean;
};

function readFlow(): PersistedFlow {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as PersistedFlow;
  } catch {
    return {};
  }
}

function writeFlow(next: PersistedFlow) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/**
 * Parcours guidé type Asana : étapes claires, progression visible, dismissible.
 */
export default function GettingStartedChecklist({
  hasEvents,
  hasTemplates = false,
  firstEventId,
  className,
  variant = 'organizer',
  hasRooms = false,
  hasServices = false,
  preferServices = false,
}: GettingStartedProps) {
  const [flow, setFlow] = useState<PersistedFlow>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setFlow(readFlow());
    setReady(true);
  }, []);

  const steps = useMemo(() => {
    if (variant === 'vendor') {
      const startWithService = preferServices || (hasServices && !hasRooms);
      return [
        {
          id: 'offer',
          title: startWithService ? 'Publier une prestation' : 'Publier une salle',
          description: 'Fiche marketplace avec localisation et tarif.',
          href: startWithService ? '/dashboard/marketplace' : '/dashboard/rooms',
          done: hasRooms || hasServices,
        },
        {
          id: 'billing',
          title: 'Choisir un forfait marketplace',
          description: 'Salle, Prestataire ou Salle & presta.',
          href: '/dashboard/billing',
          done: Boolean(flow.templateDone),
          markOnClick: 'templateDone' as const,
        },
        {
          id: 'guide',
          title: 'Faire la visite guidée',
          description: '2 minutes pour découvrir l’espace.',
          href: '/dashboard/guide?view=tour&start=1',
          done: Boolean(flow.guideDone),
          markOnClick: 'guideDone' as const,
        },
      ];
    }
    const guestsHref = firstEventId
      ? `/dashboard/events/${firstEventId}`
      : '/dashboard/events';
    const guestInfoHref = firstEventId
      ? `/dashboard/events/${firstEventId}?tab=guestInfo`
      : '/dashboard/events';
    const feedHref = firstEventId
      ? `/dashboard/events/${firstEventId}?tab=feed`
      : '/dashboard/events';
    return [
      {
        id: 'event',
        title: 'Créer un événement',
        description: 'Date, lieu et infos de base.',
        href: '/dashboard/events',
        done: hasEvents,
      },
      {
        id: 'guestInfo',
        title: 'Renseigner dress code et avantages',
        description: 'Tenue, parking, cadeaux — visibles sur le RSVP.',
        href: guestInfoHref,
        done: Boolean(flow.guestInfoDone) && hasEvents,
        markOnClick: 'guestInfoDone' as const,
        disabled: !hasEvents,
      },
      {
        id: 'guests',
        title: 'Ajouter des invités',
        description: 'Import CSV ou saisie manuelle.',
        href: guestsHref,
        done: Boolean(flow.guestsDone) && hasEvents,
        markOnClick: 'guestsDone' as const,
        disabled: !hasEvents,
      },
      {
        id: 'feed',
        title: 'Publier sur le fil',
        description: 'Annonces et photos ; les invités like et commentent.',
        href: feedHref,
        done: Boolean(flow.feedDone) && hasEvents,
        markOnClick: 'feedDone' as const,
        disabled: !hasEvents,
      },
      {
        id: 'template',
        title: 'Choisir un modèle d’invitation',
        description: 'Bibliothèque ou création custom.',
        href: '/dashboard/templates',
        done: hasTemplates || Boolean(flow.templateDone),
        markOnClick: 'templateDone' as const,
      },
      {
        id: 'guide',
        title: 'Faire la visite guidée',
        description: '2 minutes pour découvrir l’espace.',
        href: '/dashboard/guide?view=tour&start=1',
        done: Boolean(flow.guideDone),
        markOnClick: 'guideDone' as const,
      },
    ];
  }, [variant, hasRooms, hasServices, preferServices, hasEvents, hasTemplates, firstEventId, flow.guestsDone, flow.guestInfoDone, flow.feedDone, flow.templateDone, flow.guideDone]);

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  if (!ready || flow.dismissed || allDone) return null;

  const nextStep = steps.find((s) => !s.done && !s.disabled) || steps.find((s) => !s.done);

  const dismiss = () => {
    const next = { ...flow, dismissed: true };
    setFlow(next);
    writeFlow(next);
  };

  const onStepClick = (mark?: 'guestsDone' | 'guestInfoDone' | 'feedDone' | 'templateDone' | 'guideDone') => {
    if (!mark) return;
    const next = { ...flow, [mark]: true };
    setFlow(next);
    writeFlow(next);
  };

  return (
    <section
      className={cn(
        'rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5',
        className,
      )}
      aria-labelledby="getting-started-title"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 w-8 h-8 rounded-[var(--radius-button)] bg-surface-muted text-primary flex items-center justify-center border border-border">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 id="getting-started-title" className="text-sm font-semibold text-foreground tracking-tight">
              Bien démarrer
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {doneCount}/{steps.length} étapes
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-muted transition shrink-0"
          aria-label="Masquer le parcours"
          title="Masquer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div
        className="h-1.5 rounded-full bg-surface-muted mb-5 overflow-hidden"
        role="progressbar"
        aria-valuenow={doneCount}
        aria-valuemin={0}
        aria-valuemax={steps.length}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>

      <ol className="space-y-1">
        {steps.map((step, index) => {
          const content = (
            <span className="flex items-start gap-3 min-w-0 flex-1">
              <span className="mt-0.5 shrink-0">
                {step.done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5 text-muted" />
                )}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-muted tabular-nums">{index + 1}</span>
                  <span
                    className={cn(
                      'text-sm font-medium tracking-tight',
                      step.done ? 'text-muted line-through' : 'text-foreground',
                    )}
                  >
                    {step.title}
                  </span>
                </span>
                <span className="block text-xs text-muted mt-0.5">{step.description}</span>
              </span>
            </span>
          );

          if (step.disabled) {
            return (
              <li
                key={step.id}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2.5 opacity-50 cursor-not-allowed"
              >
                {content}
              </li>
            );
          }

          return (
            <li key={step.id}>
              <Link
                href={step.href}
                onClick={() => onStepClick(step.markOnClick)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2.5 py-2.5 transition group',
                    !step.done && nextStep?.id === step.id
                    ? 'bg-primary/10 ring-1 ring-primary/20'
                    : 'hover:bg-surface-muted',
                )}
              >
                {content}
                <ChevronRight className="w-4 h-4 text-muted group-hover:text-primary shrink-0" />
              </Link>
            </li>
          );
        })}
      </ol>

      {nextStep && !nextStep.disabled && (
        <div className="mt-4 pt-4 border-t border-border">
          <Link
            href={nextStep.href}
            onClick={() => onStepClick(nextStep.markOnClick)}
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 rounded-[var(--radius-button)] bg-primary hover:bg-primary-hover text-white text-sm font-medium transition"
          >
            Continuer : {nextStep.title}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </section>
  );
}
