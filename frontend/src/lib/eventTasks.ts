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
