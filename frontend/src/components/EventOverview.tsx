'use client';

import React from 'react';
import {
  ArrowRight,
  Check,
  LayoutGrid,
  MessageSquare,
  ScanLine,
  Send,
  Store,
  UserCheck,
  Users,
  type LucideIcon,
} from '@/components/icons';
import { KpiCard, CARD_SHADOW } from '@/components/dashboard/KpiCard';
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

const STEP_ICONS: Partial<Record<EventWorkflowStepId, LucideIcon>> = {
  prep: Store,
  guests: Users,
  invitation: Send,
  rsvp: MessageSquare,
  tablePlan: LayoutGrid,
  protocol: ScanLine,
};

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
  const assigned = countAssignedGuests(tablePlan ?? undefined, guests);
  const checkedIn = guests.filter((g) => g.checkedInAt).length;
  const sent = guests.filter((g) => g.preferences?.invitationSentAt).length;
  const answered = guests.filter((g) => g.rsvp !== 'PENDING').length;
  const pending = guests.filter((g) => g.rsvp === 'PENDING').length;
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
          : `${assigned} ${plural(assigned, 'place attribuée', 'places attribuées')} sur ${seatable}`;
      case 'protocol':
        return checkedIn > 0
          ? `${checkedIn} ${plural(checkedIn, 'arrivé', 'arrivés')}`
          : 'Accueil des invités';
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
    <div className="space-y-5 animate-fade-in">
      {/* Mêmes tuiles que le tableau de bord, posées sur son fond dégradé. */}
      <section aria-label="Chiffres de l’événement" className="em-header-wash rounded-[26px] p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <KpiCard
            icon={<Users className="w-[18px] h-[18px]" />}
            label="Invités"
            value={String(guests.length)}
            hint={`${answered} ${plural(answered, 'réponse', 'réponses')}`}
          />
          <KpiCard
            icon={<UserCheck className="w-[18px] h-[18px]" />}
            label="Confirmés"
            value={String(confirmed)}
            hint={pending > 0 ? `${pending} sans réponse` : undefined}
          />
          <KpiCard
            icon={<LayoutGrid className="w-[18px] h-[18px]" />}
            label="Places attribuées"
            value={`${assigned} / ${seatable}`}
            hint="sur le plan de table"
          />
          <KpiCard
            icon={<ScanLine className="w-[18px] h-[18px]" />}
            label="Arrivés"
            value={String(checkedIn)}
            hint={confirmed > 0 ? `sur ${confirmed} ${plural(confirmed, 'confirmé', 'confirmés')}` : undefined}
          />
        </div>
      </section>

      <ul className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        {steps.map((step) => {
          const isCurrent = step.status === 'current';
          const isDone = step.status === 'complete';
          const detail = detailOf(step);
          const Icon = STEP_ICONS[step.id] ?? Check;
          const title = TITLES[step.id] ?? step.title;
          return (
            <li
              key={step.id}
              className={cn(
                'relative flex min-w-0 flex-wrap items-center gap-3 rounded-[20px] bg-surface p-4 sm:p-5',
                CARD_SHADOW,
                isCurrent && 'ring-2 ring-primary/40',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border',
                  isCurrent ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-primary',
                )}
              >
                <Icon className="h-5 w-5" />
                {isDone ? (
                  <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-surface bg-primary-solid text-primary-foreground">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                ) : null}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-foreground">
                  {title}
                  <span className="sr-only">{isDone ? ' — fait' : isCurrent ? ' — à faire' : ''}</span>
                </p>
                {detail ? <p className="mt-0.5 truncate text-[13px] text-muted">{detail}</p> : null}
              </div>
              {isCurrent ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => open(step, true)}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full shrink-0 rounded-full px-5 sm:w-auto"
                >
                  {CURRENT_CTA[step.id] ?? 'Ouvrir'}
                </Button>
              ) : (
                <button
                  type="button"
                  onClick={() => open(step, false)}
                  aria-label={`Ouvrir ${title}`}
                  // La zone cliquable couvre toute la carte.
                  className="shrink-0 min-h-11 rounded-full px-3 text-sm font-semibold text-primary after:absolute after:inset-0 after:rounded-[20px] hover:underline underline-offset-2 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary/50"
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
