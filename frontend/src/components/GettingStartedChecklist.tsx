'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, ChevronRight, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/cn';

import { GETTING_STARTED_CHANGED_EVENT, GETTING_STARTED_STORAGE_KEY } from '@/lib/firstLoginTour';

const STORAGE_KEY = GETTING_STARTED_STORAGE_KEY;

type PersistedFlow = {
  dismissed?: boolean;
  guestsDone?: boolean;
  guestInfoDone?: boolean;
  feedDone?: boolean;
  inviteDone?: boolean;
  templateDone?: boolean;
  guideDone?: boolean;
};

export type GettingStartedProps = {
  hasEvents: boolean;
  hasGuests?: boolean;
  hasInvitations?: boolean;
  hasTemplates?: boolean;
  firstEventId?: string | null;
  className?: string;
  variant?: 'organizer' | 'vendor' | 'client';
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

type MarkKey = 'guestsDone' | 'inviteDone' | 'templateDone' | 'guideDone';

type ChecklistStep = {
  id: string;
  title: string;
  description: string;
  href: string;
  done: boolean;
  markOnClick?: MarkKey;
  disabled?: boolean;
};

/**
 * Parcours guidé type Asana : étapes claires, progression visible, dismissible.
 */
export default function GettingStartedChecklist({
  hasEvents,
  hasGuests = false,
  hasInvitations = false,
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
    const sync = () => setFlow(readFlow());
    window.addEventListener(GETTING_STARTED_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(GETTING_STARTED_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const steps = useMemo((): ChecklistStep[] => {
    if (variant === 'client') {
      return [
        {
          id: 'guide',
          title: 'Faire la visite guidée',
          description: '1 minute pour découvrir le marketplace, les devis et les billets.',
          href: '/dashboard/guide?view=tour&start=1',
          done: Boolean(flow.guideDone),
          markOnClick: 'guideDone' as const,
        },
        {
          id: 'explore',
          title: 'Explorer salles et prestataires',
          description: 'Filtrez, ouvrez une fiche, ajoutez un favori.',
          href: '/dashboard/catalogue',
          done: Boolean(flow.templateDone),
          markOnClick: 'templateDone' as const,
        },
        {
          id: 'quote',
          title: 'Demander un devis',
          description: 'Composez un pack ou envoyez une demande depuis une fiche.',
          href: '/dashboard/bookings',
          done: Boolean(flow.inviteDone),
          markOnClick: 'inviteDone' as const,
        },
      ];
    }
    if (variant === 'vendor') {
      const startWithService = preferServices || (hasServices && !hasRooms);
      return [
        {
          id: 'guide',
          title: 'Faire la visite guidée',
          description: '1 minute pour découvrir l’espace prestataire.',
          href: '/dashboard/guide?view=tour&start=1',
          done: Boolean(flow.guideDone),
          markOnClick: 'guideDone' as const,
        },
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
      ];
    }
    const guestsHref = firstEventId
      ? `/dashboard/events/${firstEventId}`
      : '/dashboard/events';
    const inviteHref = firstEventId
      ? `/dashboard/events/${firstEventId}?tab=invitations`
      : '/dashboard/events';
    return [
      {
        id: 'guide',
        title: 'Faire la visite guidée',
        description: '1 minute pour découvrir le menu et votre première action.',
        href: '/dashboard/guide?view=tour&start=1',
        done: Boolean(flow.guideDone),
        markOnClick: 'guideDone' as const,
      },
      {
        id: 'event',
        title: 'Créer un événement',
        description: 'Titre, date et lieu suffisent pour commencer.',
        href: '/dashboard/events',
        done: hasEvents,
      },
      {
        id: 'guests',
        title: 'Ajouter des invités',
        description: 'E-mail ou WhatsApp — un contact suffit.',
        href: guestsHref,
        done: (hasGuests || Boolean(flow.guestsDone)) && hasEvents,
        markOnClick: 'guestsDone' as const,
        disabled: !hasEvents,
      },
      {
        id: 'invite',
        title: 'Envoyer les invitations',
        description: 'Rédigez le message, puis diffusez le lien RSVP.',
        href: inviteHref,
        done: (hasInvitations || Boolean(flow.inviteDone)) && hasEvents,
        disabled: !hasEvents,
      },
    ];
  }, [variant, hasRooms, hasServices, preferServices, hasEvents, hasGuests, hasInvitations, firstEventId, flow.guestsDone, flow.inviteDone, flow.guideDone, flow.templateDone]);

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  if (!ready || flow.dismissed || allDone) return null;

  const nextStep = steps.find((s) => !s.done && !s.disabled) || steps.find((s) => !s.done);

  const dismiss = () => {
    const next = { ...flow, dismissed: true };
    setFlow(next);
    writeFlow(next);
  };

  const onStepClick = (mark?: MarkKey) => {
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
