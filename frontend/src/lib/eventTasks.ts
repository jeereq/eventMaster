export type EventTaskStatus = 'OPEN' | 'DONE' | 'CANCELLED';

export type EventTaskPerson = {
  id: string;
  name: string | null;
  email: string;
};

export type EventTaskItem = {
  id: string;
  eventId: string;
  title: string;
  notes: string | null;
  status: EventTaskStatus;
  dueAt: string | null;
  sourceKey: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  assignee: EventTaskPerson | null;
  createdBy: EventTaskPerson;
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
  DONE: 'Faite',
  CANCELLED: 'Annulée',
};

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
