import type { TablePlanTable } from '@/lib/tablePlanUtils';

export type EventWorkflowTab =
  | 'guests'
  | 'invitations'
  | 'tablePlan'
  | 'guestInfo'
  | 'protocol'
  | 'analytics';

export type EventWorkflowStepId =
  | 'event'
  | 'guests'
  | 'invitation'
  | 'send'
  | 'rsvp'
  | 'tablePlan'
  | 'tableNotify'
  | 'protocol'
  | 'analytics';

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

function hasInvitationTemplate(invitations: EventWorkflowInvitation[]): boolean {
  return invitations.some((inv) => inv.template?.id || inv.templateId);
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

function resolveStatuses(
  steps: Omit<EventWorkflowStep, 'status'>[],
): EventWorkflowStep[] {
  const firstIncomplete = steps.findIndex((s) => {
    if (s.id === 'analytics') return false;
    return !s.detail?.startsWith('✓');
  });

  return steps.map((step, index) => {
    const isComplete = step.detail?.startsWith('✓') ?? false;
    let status: EventWorkflowStepStatus = 'upcoming';

    if (isComplete) {
      status = 'complete';
    } else if (firstIncomplete === -1) {
      status = index === steps.length - 1 ? 'current' : 'complete';
    } else if (index === firstIncomplete) {
      status = 'current';
    } else if (index < firstIncomplete) {
      status = 'complete';
    }

    return { ...step, status };
  });
}

export function computeEventWorkflowState(input: {
  guests: EventWorkflowGuest[];
  invitations: EventWorkflowInvitation[];
  tablePlan?: TablePlanMeta | null;
  eventDate?: string;
  isProtocolOnly?: boolean;
}): EventWorkflowState {
  const { guests, invitations, tablePlan, eventDate, isProtocolOnly } = input;

  const guestCount = guests.length;
  const assignedCount = countAssignedGuests(tablePlan ?? undefined);
  const sentCount = countInvitationSent(guests);
  const rsvpCount = countRsvpResponses(guests);
  const checkedInCount = countCheckedIn(guests);
  const placementDeliveredCount = countPlacementDelivered(guests);
  const hasTemplate = hasInvitationTemplate(invitations);
  const hasInviteConfig = invitations.length > 0 && hasTemplate;

  const eventPassed = eventDate ? new Date(eventDate).getTime() < Date.now() : false;

  if (isProtocolOnly) {
    const protocolSteps: Omit<EventWorkflowStep, 'status'>[] = [
      {
        id: 'protocol',
        title: 'Protocole jour J',
        description: 'Scan QR, confirmation de présence et accueil des invités.',
        tab: 'protocol',
        detail: checkedInCount > 0 ? `✓ ${checkedInCount} invité(s) enregistré(s)` : `${guestCount} invité(s) à accueillir`,
      },
      {
        id: 'analytics',
        title: 'Statistiques',
        description: 'Taux RSVP, réponses et activité de l\'événement.',
        href: '/dashboard/analytics',
        detail: guestCount > 0 ? '✓ Consultable' : 'Après ajout d\'invités',
      },
    ];

    const steps = resolveStatuses(protocolSteps);
    const completedCount = steps.filter((s) => s.status === 'complete').length;

    return {
      steps,
      completedCount,
      totalCount: steps.length,
      progressPercent: Math.round((completedCount / steps.length) * 100),
      currentStepId: steps.find((s) => s.status === 'current')?.id ?? null,
    };
  }

  const rawSteps: Omit<EventWorkflowStep, 'status'>[] = [
    {
      id: 'event',
      title: 'Événement',
      description: 'Titre, date, lieu et salle associée.',
      detail: '✓ Événement créé',
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
      title: 'Modèle & invitation',
      description: 'Choisissez un modèle visuel et rédigez le message.',
      tab: 'invitations',
      detail: hasInviteConfig
        ? `✓ ${invitations.length} invitation(s) configurée(s)`
        : invitations.length > 0
          ? 'Associez un modèle visuel'
          : 'Créez une invitation',
    },
    {
      id: 'send',
      title: 'Envoi invitation',
      description: 'Diffusez le lien RSVP (sans placement — envoyé après protocole).',
      tab: 'invitations',
      detail:
        sentCount > 0
          ? `✓ ${sentCount} envoi(s)`
          : hasInviteConfig && guestCount > 0
            ? 'Lancez la diffusion'
            : 'Configurez d\'abord invités et invitation',
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
      description: 'Placez les invités sur le plan 2D de la salle.',
      tab: 'tablePlan',
      detail:
        assignedCount > 0
          ? `✓ ${assignedCount} place(s) assignée(s)`
          : guestCount > 0
            ? 'Organisez le placement'
            : 'Ajoutez des invités d\'abord',
    },
    {
      id: 'tableNotify',
      title: 'Notification placement',
      description: 'Carte et PDF envoyés après confirmation de présence au protocole.',
      tab: 'tablePlan',
      detail:
        placementDeliveredCount > 0
          ? `✓ ${placementDeliveredCount} placement(s) envoyé(s)`
          : assignedCount > 0
            ? 'Après validation à l\'entrée (protocole)'
            : 'Assignez des places d\'abord',
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
    {
      id: 'analytics',
      title: 'Statistiques',
      description: 'Suivez les taux RSVP, menus et participation.',
      href: '/dashboard/analytics',
      detail: guestCount > 0 ? '✓ Tableaux disponibles' : 'Après ajout d\'invités',
    },
  ];

  const steps = resolveStatuses(rawSteps);
  const completedCount = steps.filter((s) => s.status === 'complete').length;

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
  if ((input.invitationCount ?? 0) > 0 && input.hasTemplate) score += 1;
  return Math.round((score / 9) * 100);
}
