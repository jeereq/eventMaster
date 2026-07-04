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

function hasInvitationTemplate(invitations: EventWorkflowInvitation[]): boolean {
  return invitations.some((inv) => inv.template?.id || inv.templateId);
}

function countInvitationSent(guests: EventWorkflowGuest[]): number {
  return guests.filter((g) => g.preferences?.invitationSentAt || g.seatingInvitationPdfUrl).length;
}

function countRsvpResponses(guests: EventWorkflowGuest[]): number {
  return guests.filter((g) => g.rsvp !== 'PENDING').length;
}

function countCheckedIn(guests: EventWorkflowGuest[]): number {
  return guests.filter((g) => g.checkedInAt).length;
}

function placementNotified(tablePlan: TablePlanMeta | null | undefined): boolean {
  return Boolean(tablePlan?.placementNotifiedAt || tablePlan?.notifiedAt);
}

function resolveStatuses(steps: Omit<EventWorkflowStep, 'status'>[]): EventWorkflowStep[] {
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
  const hasInviteConfig = invitations.length > 0 && hasInvitationTemplate(invitations);
  const tableNotified = placementNotified(tablePlan ?? undefined);
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
      {
        id: 'analytics',
        title: 'Statistiques',
        description: 'Taux RSVP et participation.',
        detail: guestCount > 0 ? '✓ Consultable' : 'Après ajout d\'invités',
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
      title: 'Modèle & invitation',
      description: 'Configuration',
      tab: 'invitations',
      detail: hasInviteConfig
        ? `✓ ${invitations.length} invitation(s)`
        : invitations.length > 0
          ? 'Associez un modèle'
          : 'Créez une invitation',
    },
    {
      id: 'send',
      title: 'Envoi PDF',
      description: 'Diffusion',
      tab: 'invitations',
      detail:
        sentCount > 0
          ? `✓ ${sentCount} envoi(s)`
          : hasInviteConfig && guestCount > 0
            ? 'Lancez la diffusion'
            : 'Configurez invités et invitation',
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
      description: 'Placement',
      tab: 'tablePlan',
      detail:
        assignedCount > 0
          ? `✓ ${assignedCount} place(s)`
          : guestCount > 0
            ? 'Organisez le placement'
            : 'Ajoutez des invités',
    },
    {
      id: 'tableNotify',
      title: 'Notification placement',
      description: 'Envoi auto',
      tab: 'tablePlan',
      detail: tableNotified
        ? '✓ Notifications envoyées'
        : assignedCount > 0
          ? 'Sauvegardez le plan'
          : 'Assignez des places',
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
    {
      id: 'analytics',
      title: 'Statistiques',
      description: 'Suivi',
      detail: guestCount > 0 ? '✓ Disponibles' : 'Après invités',
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
