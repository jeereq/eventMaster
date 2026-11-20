'use client';
import { useMessagingChannels } from '@/hooks/useMessagingChannels';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, X } from '@/components/icons';
import { cn } from '@/lib/cn';

import { GETTING_STARTED_CHANGED_EVENT, GETTING_STARTED_STORAGE_KEY } from '@/lib/firstLoginTour';

const STORAGE_KEY = GETTING_STARTED_STORAGE_KEY;

type PersistedFlow = {
  dismissed?: boolean;
  collapsed?: boolean;
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
 * Parcours de démarrage : progression en segments et un seul bouton vers l'étape suivante.
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

  const onToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const collapsed = !e.currentTarget.open;
    if (collapsed === Boolean(flow.collapsed)) return;
    const next = { ...flow, collapsed };
    setFlow(next);
    writeFlow(next);
  };

  const laterSteps = steps.filter((s) => !s.done && s.id !== nextStep?.id);
  const openCreateHere = nextStep?.id === 'event' && Boolean(onCreateEvent);
  const nextClass =
    'inline-flex min-h-11 max-w-full items-center gap-2 rounded-full bg-primary-solid px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary-solid-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

  return (
    <details
      open={!flow.collapsed}
      onToggle={onToggle}
      className={cn('group rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5', className)}
      aria-labelledby="getting-started-title"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <h2 id="getting-started-title" className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <ChevronDown className="w-4 h-4 text-muted transition-transform group-open:rotate-180" aria-hidden />
          Bien démarrer
        </h2>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted tabular-nums">
            {doneCount} sur {steps.length}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              dismiss();
            }}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-muted transition"
            aria-label="Masquer le parcours"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </summary>

      <div className="mt-2 flex gap-1" aria-hidden>
        {steps.map((step) => (
          <span
            key={step.id}
            title={step.title}
            className={cn('h-1 flex-1 rounded-full', step.done ? 'bg-primary' : 'bg-surface-muted')}
          />
        ))}
      </div>

      {nextStep && (
        <div className="mt-4">
          {nextStep.disabled ? (
            <p className="text-sm text-muted">{nextStep.title}</p>
          ) : openCreateHere ? (
            <button
              type="button"
              onClick={() => {
                onStepClick(nextStep.markOnClick);
                onCreateEvent?.();
              }}
              className={nextClass}
            >
              <span className="truncate">{nextStep.title}</span>
              <ArrowRight className="w-4 h-4 shrink-0" aria-hidden />
            </button>
          ) : (
            <Link href={nextStep.href} onClick={() => onStepClick(nextStep.markOnClick)} className={nextClass}>
              <span className="truncate">{nextStep.title}</span>
              <ArrowRight className="w-4 h-4 shrink-0" aria-hidden />
            </Link>
          )}
        </div>
      )}

      {laterSteps.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          Ensuite :{' '}
          {laterSteps.map((step, i) => (
            <React.Fragment key={step.id}>
              {i > 0 && ' · '}
              {step.disabled ? (
                <span>{step.title}</span>
              ) : (
                <Link
                  href={step.href}
                  onClick={() => onStepClick(step.markOnClick)}
                  className="text-foreground hover:text-primary hover:underline underline-offset-2"
                >
                  {step.title}
                </Link>
              )}
            </React.Fragment>
          ))}
        </p>
      )}
    </details>
  );
}
