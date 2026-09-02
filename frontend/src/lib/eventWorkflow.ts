import type { TablePlanTable } from '@/lib/tablePlanUtils';
import { type GuestGuidelines } from '@/lib/guestGuidelines';

export type EventWorkflowTab =
  | 'guests'
  | 'invitations'
  | 'tablePlan'
  | 'guestInfo'
  | 'feed'
  | 'protocol'
  | 'prep'
  | 'analytics'
  | 'tasks'
  | 'staff';

export type EventWorkflowStepId =
  | 'event'
  | 'prep'
  | 'guests'
  | 'invitation'
  | 'rsvp'
  | 'tablePlan'
  | 'protocol'
  | 'protocolTasks';

export type EventWorkflowStepStatus = 'complete' | 'current' | 'upcoming' | 'skipped';

export interface EventWorkflowGuest {
  id: string;
  rsvp: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  seatingInvitationPdfUrl?: string | null;
  checkedInAt?: string | null;
  preferences?: {
    invitationSentAt?: string;
    placementNotifiedAt?: string;
    [key: string]: unknown;
  } | null;
}

export interface EventWorkflowInvitation {
  id: string;
  template?: { id: string } | null;
  templateId?: string | null;
}

export interface EventWorkflowStep {
  id: EventWorkflowStepId;
  title: string;
  description: string;
  tab?: EventWorkflowTab;
  href?: string;
  status: EventWorkflowStepStatus;
  detail?: string;
  optional?: boolean;
}

export interface EventWorkflowState {
  steps: EventWorkflowStep[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  currentStepId: EventWorkflowStepId | null;
}

export interface TablePlanMeta {
  tables?: TablePlanTable[];
  placementNotifiedAt?: string;
  notifiedAt?: string;
}

export function countAssignedGuests(tablePlan: TablePlanMeta | null | undefined): number {
  if (!tablePlan?.tables?.length) return 0;
  const assigned = new Set<string>();
  for (const table of tablePlan.tables) {
    if (!table.seats) continue;
    for (const guestId of Object.values(table.seats)) {
      if (guestId) assigned.add(guestId);
    }
  }
  return assigned.size;
}

function countInvitationSent(guests: EventWorkflowGuest[]): number {
  return guests.filter((g) => g.preferences?.invitationSentAt).length;
}

function countPlacementDelivered(guests: EventWorkflowGuest[]): number {
  return guests.filter((g) => g.preferences?.placementNotifiedAt).length;
}

function countRsvpResponses(guests: EventWorkflowGuest[]): number {
  return guests.filter((g) => g.rsvp !== 'PENDING').length;
}

function countCheckedIn(guests: EventWorkflowGuest[]): number {
  return guests.filter((g) => g.checkedInAt).length;
}

function isStepComplete(step: Omit<EventWorkflowStep, 'status'>): boolean {
  return Boolean(step.detail?.startsWith('✓'));
}

function resolveStatuses(steps: Omit<EventWorkflowStep, 'status'>[]): EventWorkflowStep[] {
  const firstOpen = steps.findIndex((step, index) => {
    if (isStepComplete(step)) return false;
    if (step.optional && steps.some((later, laterIndex) => laterIndex > index && isStepComplete(later))) {
      return false;
    }
    return true;
  });

  return steps.map((step, index) => {
    if (isStepComplete(step)) {
      return { ...step, status: 'complete' as const };
    }
    if (step.optional && steps.some((later, laterIndex) => laterIndex > index && isStepComplete(later))) {
      return { ...step, status: 'skipped' as const };
    }
    if (firstOpen === -1) {
      return { ...step, status: index === steps.length - 1 ? 'current' : 'complete' };
    }
    if (index === firstOpen) {
      return { ...step, status: 'current' as const };
    }
    if (index < firstOpen) {
      return { ...step, status: 'complete' as const };
    }
    return { ...step, status: 'upcoming' as const };
  });
}

export function computeEventWorkflowState(input: {
  guests: EventWorkflowGuest[];
  invitations: EventWorkflowInvitation[];
  tablePlan?: TablePlanMeta | null;
  eventDate?: string;
  isProtocolOnly?: boolean;
  /** Mode accueil jour J — navigation Accueil / Tâches. */
  protocolDesk?: boolean;
  guestGuidelines?: GuestGuidelines | null;
  feedPostCount?: number;
  hasPrepShortlist?: boolean;
  prepSummary?: string | null;
}): EventWorkflowState {
  const { guests, invitations, tablePlan, eventDate, isProtocolOnly, protocolDesk } = input;

  const guestCount = guests.length;
  const assignedCount = countAssignedGuests(tablePlan ?? undefined);
  const sentCount = countInvitationSent(guests);
  const rsvpCount = countRsvpResponses(guests);
  const checkedInCount = countCheckedIn(guests);
  const placementDeliveredCount = countPlacementDelivered(guests);
  const hasInviteConfig = invitations.length > 0;

  const eventPassed = eventDate ? new Date(eventDate).getTime() < Date.now() : false;

  if (isProtocolOnly || protocolDesk) {
    const protocolSteps: Omit<EventWorkflowStep, 'status'>[] = [
      {
        id: 'protocol',
        title: 'Accueil',
        description: 'Scan QR, confirmation de présence et accueil des invités.',
        tab: 'protocol',
        detail: checkedInCount > 0 ? `✓ ${checkedInCount} invité(s) enregistré(s)` : `${guestCount} invité(s) à accueillir`,
      },
      {
        id: 'protocolTasks',
        title: 'Tâches',
        description: 'Checklist protocole du jour : briefing, postes, urgences.',
        tab: 'tasks',
        detail: 'Ouvertes et assignées à l’équipe d’accueil',
      },
    ];

    const steps = resolveStatuses(protocolSteps);
    const completedCount = steps.filter((s) => s.status === 'complete').length;

    return {
      steps,
      completedCount,
      totalCount: steps.length,
      progressPercent: Math.round((completedCount / Math.max(1, steps.length)) * 100),
      currentStepId: steps.find((s) => s.status === 'current')?.id ?? null,
    };
  }

  const invitationDetail =
    sentCount > 0
      ? `✓ ${sentCount} envoi(s)`
      : hasInviteConfig && guestCount > 0
        ? 'Prêt à envoyer le lien RSVP'
        : hasInviteConfig
          ? 'Ajoutez des invités puis envoyez'
          : 'Rédigez et envoyez le message';

  const tablePlanDetail =
    assignedCount > 0
      ? placementDeliveredCount > 0
        ? `✓ ${assignedCount} place(s) · ${placementDeliveredCount} notifié(s)`
        : `✓ ${assignedCount} place(s) assignée(s)`
      : guestCount > 0
        ? 'Placez les invités — le PDF part à l’acceptation'
        : 'Ajoutez des invités d\'abord';

  const rawSteps: Omit<EventWorkflowStep, 'status'>[] = [
    {
      id: 'event',
      title: 'Événement',
      description: 'Titre, date et lieu.',
      detail: '✓ Événement créé',
    },
    {
      id: 'prep',
      title: 'Préparation',
      description: 'Retenez une salle, des prestataires ou du matériel & équipements. Les devis se lient à cet événement.',
      tab: 'prep',
      optional: true,
      detail: input.hasPrepShortlist
        ? `✓ ${input.prepSummary || 'Pistes retenues'}`
        : 'Optionnel — retenez des fiches, puis demandez un devis',
    },
    {
      id: 'guests',
      title: 'Invités',
      description: 'Ajoutez ou importez votre liste d\'invités.',
      tab: 'guests',
      detail: guestCount > 0 ? `✓ ${guestCount} invité(s)` : 'Ajoutez des invités',
    },
    {
      id: 'invitation',
      title: 'Invitation',
      description: 'Rédigez le message et envoyez le lien RSVP.',
      tab: 'invitations',
      detail: invitationDetail,
    },
    {
      id: 'rsvp',
      title: 'RSVP invités',
      description: 'Les invités confirment via leur lien personnel.',
      tab: 'guests',
      detail:
        rsvpCount > 0
          ? `✓ ${rsvpCount}/${guestCount} réponse(s)`
          : guestCount > 0
            ? 'En attente de réponses'
            : 'Après envoi des invitations',
    },
    {
      id: 'tablePlan',
      title: 'Plan de table',
      description: 'Placez les invités ; le PDF et le GPS partent à l’acceptation RSVP.',
      tab: 'tablePlan',
      detail: tablePlanDetail,
    },
    {
      id: 'protocol',
      title: 'Protocole jour J',
      description: 'Scan QR, contrôle d\'accès et confirmation de présence.',
      tab: 'protocol',
      detail:
        checkedInCount > 0
          ? `✓ ${checkedInCount} invité(s) accueilli(s)`
          : eventPassed
            ? 'Prêt pour l\'accueil'
            : 'Le jour de l\'événement',
    },
  ];

  const steps = resolveStatuses(rawSteps);
  const completedCount = steps.filter((s) => s.status === 'complete' || s.status === 'skipped').length;

  return {
    steps,
    completedCount,
    totalCount: steps.length,
    progressPercent: Math.round((completedCount / steps.length) * 100),
    currentStepId: steps.find((s) => s.status === 'current')?.id ?? null,
  };
}

export function computeEventListProgress(input: {
  guestCount?: number;
  invitationCount?: number;
  hasTemplate?: boolean;
}): number {
  let score = 1;
  if ((input.guestCount ?? 0) > 0) score += 1;
  if ((input.invitationCount ?? 0) > 0) score += 1;
  return Math.round((score / 3) * 100);
}
