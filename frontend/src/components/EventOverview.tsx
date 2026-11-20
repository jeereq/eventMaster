'use client';

import React from 'react';
import { ArrowRight, Check } from '@/components/icons';
import {
  countAssignedGuests,
  type EventWorkflowGuest,
  type EventWorkflowState,
  type EventWorkflowStep,
  type EventWorkflowStepId,
  type EventWorkflowTab,
  type TablePlanMeta,
} from '@/lib/eventWorkflow';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

/** Libellé de l’action quand l’étape est celle à faire. */
const CURRENT_CTA: Partial<Record<EventWorkflowStepId, string>> = {
  prep: 'Composer la préparation',
  guests: 'Ajouter des invités',
  invitation: 'Préparer l’envoi',
  rsvp: 'Voir les réponses',
  tablePlan: 'Placer les invités',
  protocol: 'Ouvrir l’accueil',
};

/** Titres courts de la vue d’ensemble (les étapes gardent leurs titres ailleurs). */
const TITLES: Partial<Record<EventWorkflowStepId, string>> = {
  rsvp: 'Réponses',
  protocol: 'Jour J',
};

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="min-w-0">
      <dd className="text-xl font-bold text-foreground tabular-nums">{value}</dd>
      <dt className="text-xs text-muted">{label}</dt>
    </div>
  );
}

/**
 * Vue d’ensemble d’un événement : chiffres clés et étapes du parcours.
 * Lecture seule — tout vient de données déjà chargées par la page (aucun appel API).
 */
export default function EventOverview({
  workflow,
  guests,
  tablePlan,
  onNavigateTab,
  onAction,
}: {
  workflow: EventWorkflowState;
  guests: EventWorkflowGuest[];
  tablePlan?: TablePlanMeta | null;
  onNavigateTab: (tab: EventWorkflowTab) => void;
  onAction?: (stepId: string) => void;
}) {
  const confirmed = guests.filter((g) => g.rsvp === 'ACCEPTED').length;
  const seatable = guests.filter((g) => g.rsvp !== 'DECLINED').length;
  const assigned = countAssignedGuests(tablePlan ?? undefined);
  const checkedIn = guests.filter((g) => g.checkedInAt).length;
  const sent = guests.filter((g) => g.preferences?.invitationSentAt).length;
  const answered = guests.filter((g) => g.rsvp !== 'PENDING').length;
  const steps = workflow.steps.filter((step) => step.id !== 'event' && step.tab);

  const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);
  /** Texte d’état de chaque étape, calculé sur les mêmes données que les chiffres du haut. */
  const detailOf = (step: EventWorkflowStep): string | undefined => {
    const total = guests.length;
    switch (step.id) {
      case 'prep':
        return step.status === 'complete' ? step.detail?.replace(/^✓\s*/, '') : 'Facultatif';
      case 'guests':
        return total > 0 ? `${total} sur la liste` : 'Aucun invité pour l’instant';
      case 'invitation':
        return total === 0
          ? 'Après l’ajout des invités'
          : `${sent} ${plural(sent, 'envoyée', 'envoyées')} sur ${total}`;
      case 'rsvp':
        return total === 0
          ? 'Après l’envoi des invitations'
          : `${answered} ${plural(answered, 'réponse', 'réponses')} sur ${total}`;
      case 'tablePlan':
        return total === 0
          ? 'Après l’ajout des invités'
          : `${assigned} ${plural(assigned, 'placé', 'placés')} sur ${seatable}`;
      case 'protocol':
        return checkedIn > 0
          ? `${checkedIn} ${plural(checkedIn, 'entrée', 'entrées')}`
          : 'Accueil et contrôle des entrées';
      default:
        return step.detail?.replace(/^✓\s*/, '');
    }
  };

  const open = (step: EventWorkflowStep, withAction: boolean) => {
    if (!step.tab) return;
    onNavigateTab(step.tab);
    if (withAction) onAction?.(step.id);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-[var(--radius-card)] border border-border bg-surface px-4 sm:px-5 py-4">
        <Stat value={guests.length} label="invités" />
        <Stat value={confirmed} label="confirmés" />
        <Stat value={`${assigned} / ${seatable}`} label="placés" />
        <Stat value={checkedIn} label={checkedIn > 1 ? 'entrées' : 'entrée'} />
      </dl>

      <ul className="rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden divide-y divide-border">
        {steps.map((step) => {
          const isCurrent = step.status === 'current';
          const isDone = step.status === 'complete';
          const detail = detailOf(step);
          return (
            <li
              key={step.id}
              className={cn('flex items-center gap-3 px-4 sm:px-5 py-3.5', isCurrent && 'bg-primary/[0.06]')}
            >
              <span
                className={cn(
                  'w-[22px] h-[22px] shrink-0 rounded-full flex items-center justify-center',
                  isDone
                    ? 'bg-primary-solid text-primary-foreground'
                    : isCurrent
                      ? 'border-2 border-primary'
                      : 'border-2 border-border',
                )}
                aria-hidden
              >
                {isDone ? <Check className="w-3 h-3" /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {TITLES[step.id] ?? step.title}
                  <span className="sr-only">
                    {isDone ? ' — fait' : isCurrent ? ' — à faire' : ''}
                  </span>
                </p>
                {detail ? <p className="text-xs text-muted mt-0.5 truncate">{detail}</p> : null}
              </div>
              {isCurrent ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => open(step, true)}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="shrink-0"
                >
                  {CURRENT_CTA[step.id] ?? 'Ouvrir'}
                </Button>
              ) : (
                <button
                  type="button"
                  onClick={() => open(step, false)}
                  aria-label={`Ouvrir ${TITLES[step.id] ?? step.title}`}
                  className="shrink-0 min-h-11 px-2 text-sm font-semibold text-primary hover:underline underline-offset-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  Ouvrir
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
