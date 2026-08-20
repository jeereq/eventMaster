import { notifyUsers } from './platformNotificationService';
import { PLATFORM_NOTIFICATION_TYPE } from '../config/platformNotificationTypes';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export function eventTaskHref(eventId: string) {
  return `${FRONTEND_URL}/dashboard/events/${eventId}?tab=tasks`;
}

function uniqueRecipients(ids: Array<string | null | undefined>, actorId?: string | null) {
  const set = new Set(ids.filter((id): id is string => Boolean(id)));
  if (actorId) set.delete(actorId);
  return [...set];
}

export function notifyEventTaskAssigned(params: {
  actorId: string;
  assigneeId: string | null;
  createdById: string;
  eventId: string;
  eventTitle: string;
  taskId: string;
  taskTitle: string;
}) {
  const recipients = uniqueRecipients([params.assigneeId, params.createdById], params.actorId);
  if (recipients.length === 0) return;
  void notifyUsers(recipients, {
    type: PLATFORM_NOTIFICATION_TYPE.EVENT_TASK_ASSIGNED,
    title: `Tâche — ${params.eventTitle}`,
    message: params.taskTitle,
    metadata: {
      eventId: params.eventId,
      taskId: params.taskId,
      href: eventTaskHref(params.eventId),
    },
  });
}

export function notifyEventTaskCompleted(params: {
  actorId: string;
  assigneeId: string | null;
  createdById: string;
  eventId: string;
  eventTitle: string;
  taskId: string;
  taskTitle: string;
}) {
  const recipients = uniqueRecipients([params.assigneeId, params.createdById], params.actorId);
  if (recipients.length === 0) return;
  void notifyUsers(recipients, {
    type: PLATFORM_NOTIFICATION_TYPE.EVENT_TASK_COMPLETED,
    title: `Tâche faite — ${params.eventTitle}`,
    message: `« ${params.taskTitle} » est marquée comme faite.`,
    metadata: {
      eventId: params.eventId,
      taskId: params.taskId,
      href: eventTaskHref(params.eventId),
    },
  });
}

export function notifyEventTaskDue(params: {
  assigneeId: string | null;
  createdById: string;
  eventId: string;
  eventTitle: string;
  taskId: string;
  taskTitle: string;
  overdue: boolean;
  dueLabel: string;
}) {
  const recipients = uniqueRecipients([params.assigneeId, params.createdById]);
  if (recipients.length === 0) return;
  const title = params.overdue
    ? `Tâche en retard — ${params.eventTitle}`
    : `Échéance demain / aujourd’hui — ${params.eventTitle}`;
  const message = params.overdue
    ? `« ${params.taskTitle} » était due le ${params.dueLabel}.`
    : `« ${params.taskTitle} » est due le ${params.dueLabel}.`;
  return notifyUsers(recipients, {
    type: PLATFORM_NOTIFICATION_TYPE.EVENT_TASK_DUE,
    title,
    message,
    metadata: {
      eventId: params.eventId,
      taskId: params.taskId,
      href: eventTaskHref(params.eventId),
    },
    whatsapp: `${title}. ${message}`,
  });
}
