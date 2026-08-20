export type EventTaskStatus = 'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'CANCELLED';

export type EventTaskKind =
  | 'GENERAL'
  | 'VENUE'
  | 'VENDOR'
  | 'GUESTS'
  | 'PROTOCOL'
  | 'LOGISTICS'
  | 'COMMUNICATION'
  | 'FINANCE';

export type EventTaskPerson = {
  id: string;
  name: string | null;
  email: string;
};

export type EventTaskBlockedBy = {
  id: string;
  title: string;
  status: EventTaskStatus;
};

export type EventTaskItem = {
  id: string;
  eventId: string;
  title: string;
  notes: string | null;
  status: EventTaskStatus;
  kind: EventTaskKind;
  priority: number;
  dueAt: string | null;
  sourceKey: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  assignee: EventTaskPerson | null;
  createdBy: EventTaskPerson;
  blockedById: string | null;
  blockedBy: EventTaskBlockedBy | null;
  event: { id: string; title: string; date: string };
  mine: boolean;
};

export type EventTaskAssigneeOption = {
  id: string;
  name: string | null;
  email: string;
  label: string;
};

export const EVENT_TASK_STATUS_LABELS: Record<EventTaskStatus, string> = {
  OPEN: 'À faire',
  IN_PROGRESS: 'En cours',
  BLOCKED: 'Bloquée',
  DONE: 'Faite',
  CANCELLED: 'Annulée',
};

export const EVENT_TASK_KIND_LABELS: Record<EventTaskKind, string> = {
  GENERAL: 'Générale',
  VENUE: 'Salle',
  VENDOR: 'Prestataire',
  GUESTS: 'Invités',
  PROTOCOL: 'Protocole',
  LOGISTICS: 'Logistique',
  COMMUNICATION: 'Communication',
  FINANCE: 'Finance',
};

export const EVENT_TASK_PRIORITY_LABELS: Record<number, string> = {
  0: 'Basse',
  1: 'Normale',
  2: 'Haute',
};

export const OPEN_EVENT_TASK_STATUSES: EventTaskStatus[] = ['OPEN', 'IN_PROGRESS', 'BLOCKED'];

export function isOpenEventTask(status: EventTaskStatus): boolean {
  return OPEN_EVENT_TASK_STATUSES.includes(status);
}

export type TaskDueState = 'none' | 'upcoming' | 'today' | 'overdue';

export function taskDueState(dueAt?: string | null, status?: EventTaskStatus): TaskDueState {
  if (!dueAt || status === 'DONE' || status === 'CANCELLED') return 'none';
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return 'none';
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  if (due < start) return 'overdue';
  if (due < end) return 'today';
  return 'upcoming';
}

export function taskDueLabel(dueAt?: string | null, status?: EventTaskStatus): string | null {
  const state = taskDueState(dueAt, status);
  if (!dueAt || state === 'none') return null;
  const day = new Date(dueAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  if (state === 'overdue') return `En retard · ${day}`;
  if (state === 'today') return `Aujourd’hui`;
  return day;
}

export type EventTaskPersonStats = {
  id: string;
  label: string;
  total: number;
  open: number;
  inProgress: number;
  blocked: number;
  done: number;
  overdue: number;
};

export function summarizeTasksByPerson(tasks: EventTaskItem[]): EventTaskPersonStats[] {
  const map = new Map<string, EventTaskPersonStats>();
  const take = (id: string, label: string) => {
    let row = map.get(id);
    if (!row) {
      row = { id, label, total: 0, open: 0, inProgress: 0, blocked: 0, done: 0, overdue: 0 };
      map.set(id, row);
    }
    return row;
  };

  for (const task of tasks) {
    const row = task.assignee
      ? take(task.assignee.id, task.assignee.name || task.assignee.email)
      : take('unassigned', 'Non assignée');
    row.total += 1;
    if (task.status === 'OPEN') row.open += 1;
    else if (task.status === 'IN_PROGRESS') row.inProgress += 1;
    else if (task.status === 'BLOCKED') row.blocked += 1;
    else if (task.status === 'DONE') row.done += 1;
    if (taskDueState(task.dueAt, task.status) === 'overdue') row.overdue += 1;
  }

  return [...map.values()].sort((a, b) => {
    const aOpen = a.open + a.inProgress + a.blocked;
    const bOpen = b.open + b.inProgress + b.blocked;
    if (bOpen !== aOpen) return bOpen - aOpen;
    return b.total - a.total;
  });
}
