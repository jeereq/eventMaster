'use client';
import { useMessagingChannels } from '@/hooks/useMessagingChannels';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, ChevronRight, Sparkles, X } from '@/components/icons';
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
  /** Organisation qui vend aussi (B2B) : ajoute une étape vitrine. */
  canSell?: boolean;
  /** Si fourni (page événements), ouvre la modale au lieu de recharger la même URL. */
  onCreateEvent?: () => void;
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
  canSell = false,
  onCreateEvent,
}: GettingStartedProps) {
  const messaging = useMessagingChannels();
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
          id: 'explore',
          title: 'Explorer les lieux et prestataires',
          href: '/dashboard/catalogue',
          done: Boolean(flow.templateDone),
          markOnClick: 'templateDone' as const,
        },
        {
          id: 'quote',
          title: 'Demander un devis ou composer un pack',
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
          id: 'offer',
          title: startWithService ? 'Publier votre première prestation' : 'Publier votre première salle',
          href: startWithService ? '/dashboard/marketplace' : '/dashboard/rooms',
          done: hasRooms || hasServices,
        },
        {
          id: 'billing',
          title: 'Choisir votre formule pro',
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
        id: 'event',
        title: 'Créer votre événement',
        href: '/dashboard/events?create=1',
        done: hasEvents,
      },
      {
        id: 'guests',
        title: 'Ajouter vos invités',
        href: guestsHref,
        done: (hasGuests || Boolean(flow.guestsDone)) && hasEvents,
        markOnClick: 'guestsDone' as const,
        disabled: !hasEvents,
      },
      {
        id: 'invite',
        title: messaging.adapt('Envoyer vos invitations WhatsApp'),
        href: inviteHref,
        done: (hasInvitations || Boolean(flow.inviteDone)) && hasEvents,
        markOnClick: 'inviteDone' as const,
        disabled: !hasEvents,
      },
      ...(canSell
        ? [
            {
              id: 'offer',
              title: 'Publier une offre marketplace',
              href: '/dashboard/marketplace',
              done: hasRooms || hasServices,
            },
          ]
        : []),
    ];
  }, [variant, hasRooms, hasServices, preferServices, canSell, hasEvents, hasGuests, hasInvitations, firstEventId, flow.guestsDone, flow.inviteDone, flow.templateDone, messaging]);

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

      <ol className="space-y-1">
        {steps.map((step) => {
          const content = (
            <span className="flex items-start gap-3 min-w-0 flex-1">
              <span className="mt-0.5 shrink-0">
                {step.done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5 text-muted" />
                )}
              </span>
              <span
                className={cn(
                  'min-w-0 text-sm font-medium tracking-tight',
                  step.done ? 'text-muted line-through' : 'text-foreground',
                )}
              >
                {step.title}
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

          const openCreateHere = step.id === 'event' && Boolean(onCreateEvent);
          const itemClass = cn(
            'flex items-center gap-2 rounded-lg px-2.5 py-2.5 transition group w-full text-left',
            !step.done && nextStep?.id === step.id
              ? 'bg-primary/10 ring-1 ring-primary/20'
              : 'hover:bg-surface-muted',
          );

          return (
            <li key={step.id}>
              {openCreateHere ? (
                <button
                  type="button"
                  onClick={() => {
                    onStepClick(step.markOnClick);
                    onCreateEvent?.();
                  }}
                  className={itemClass}
                >
                  {content}
                  <ChevronRight className="w-4 h-4 text-muted group-hover:text-primary shrink-0" />
                </button>
              ) : (
                <Link
                  href={step.href}
                  onClick={() => onStepClick(step.markOnClick)}
                  className={itemClass}
                >
                  {content}
                  <ChevronRight className="w-4 h-4 text-muted group-hover:text-primary shrink-0" />
                </Link>
              )}
            </li>
          );
        })}
      </ol>

    </section>
  );
}
