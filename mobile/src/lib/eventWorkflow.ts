export type EventWorkflowTab =
  | 'guests'
  | 'invitations'
  | 'tablePlan'
  | 'guestInfo'
  | 'feed'
  | 'protocol'
  | 'analytics';

export type EventWorkflowStepId =
  | 'event'
  | 'guests'
  | 'invitation'
  | 'rsvp'
  | 'tablePlan'
  | 'protocol';

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

interface TablePlanTable {
  seats?: Record<string, string | null>;
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

function resolveStatuses(steps: Omit<EventWorkflowStep, 'status'>[]): EventWorkflowStep[] {
  const firstIncomplete = steps.findIndex((s) => !s.detail?.startsWith('✓'));

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
  hasGuestInfo?: boolean;
  feedPostCount?: number;
}): EventWorkflowState {
  const { guests, invitations, tablePlan, eventDate, isProtocolOnly } = input;

  const guestCount = guests.length;
  const assignedCount = countAssignedGuests(tablePlan ?? undefined);
  const sentCount = countInvitationSent(guests);
  const rsvpCount = countRsvpResponses(guests);
  const checkedInCount = countCheckedIn(guests);
  const placementDeliveredCount = countPlacementDelivered(guests);
  const hasInviteConfig = invitations.length > 0;
  const eventPassed = eventDate ? new Date(eventDate).getTime() < Date.now() : false;

  if (isProtocolOnly) {
    const protocolSteps: Omit<EventWorkflowStep, 'status'>[] = [
      {
        id: 'protocol',
        title: 'Protocole jour J',
        description: 'Scan QR et confirmation de présence.',
        tab: 'protocol',
        detail:
          checkedInCount > 0
            ? `✓ ${checkedInCount} invité(s) enregistré(s)`
            : `${guestCount} invité(s) à accueillir`,
      },
    ];
    const steps = resolveStatuses(protocolSteps);
    return {
      steps,
      completedCount: steps.filter((s) => s.status === 'complete').length,
      totalCount: steps.length,
      progressPercent: Math.round((steps.filter((s) => s.status === 'complete').length / steps.length) * 100),
      currentStepId: steps.find((s) => s.status === 'current')?.id ?? null,
    };
  }

  const invitationDetail =
    sentCount > 0
      ? `✓ ${sentCount} envoi(s)`
      : hasInviteConfig && guestCount > 0
        ? 'Prêt à envoyer'
        : hasInviteConfig
          ? 'Ajoutez des invités'
          : 'Rédigez et envoyez';

  const tablePlanDetail =
    assignedCount > 0
      ? placementDeliveredCount > 0
        ? `✓ ${assignedCount} place(s) · ${placementDeliveredCount} notifié(s)`
        : `✓ ${assignedCount} place(s)`
      : guestCount > 0
        ? 'Placez les invités'
        : 'Ajoutez des invités';

  const rawSteps: Omit<EventWorkflowStep, 'status'>[] = [
    { id: 'event', title: 'Événement', description: 'Créé', detail: '✓ Événement créé' },
    {
      id: 'guests',
      title: 'Invités',
      description: 'Liste invités',
      tab: 'guests',
      detail: guestCount > 0 ? `✓ ${guestCount} invité(s)` : 'Ajoutez des invités',
    },
    {
      id: 'invitation',
      title: 'Invitation',
      description: 'Message et envoi RSVP',
      tab: 'invitations',
      detail: invitationDetail,
    },
    {
      id: 'rsvp',
      title: 'RSVP',
      description: 'Réponses',
      tab: 'guests',
      detail:
        rsvpCount > 0
          ? `✓ ${rsvpCount}/${guestCount} réponse(s)`
          : guestCount > 0
            ? 'En attente'
            : 'Après envoi',
    },
    {
      id: 'tablePlan',
      title: 'Plan de table',
      description: 'Placement — PDF à l’acceptation',
      tab: 'tablePlan',
      detail: tablePlanDetail,
    },
    {
      id: 'protocol',
      title: 'Protocole',
      description: 'Jour J',
      tab: 'protocol',
      detail:
        checkedInCount > 0
          ? `✓ ${checkedInCount} accueilli(s)`
          : eventPassed
            ? 'Prêt pour l\'accueil'
            : 'Le jour J',
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
