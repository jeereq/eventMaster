import { prisma } from '../db';
import { notifyUsers } from './platformNotificationService';
import { PLATFORM_NOTIFICATION_TYPE } from '../config/platformNotificationTypes';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function startOfLocalDay(value = new Date()) {
  const day = new Date(value);
  day.setHours(0, 0, 0, 0);
  return day;
}

export async function processTaskDueReminders() {
  const now = new Date();
  const today = startOfLocalDay(now);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 2);
  const staleBefore = new Date(now.getTime() - 20 * 60 * 60 * 1000);

  const tasks = await prisma.eventTask.findMany({
    where: {
      status: 'OPEN',
      dueAt: { lte: horizon },
      OR: [{ dueRemindedAt: null }, { dueRemindedAt: { lt: staleBefore } }],
    },
    include: {
      event: { select: { id: true, title: true } },
    },
    take: 200,
  });

  if (tasks.length === 0) return;

  console.log(`[Task reminders] ${tasks.length} tâche(s) à rappeler.`);

  for (const task of tasks) {
    if (!task.dueAt) continue;
    const overdue = task.dueAt < today;
    const recipientId = task.assigneeId || task.createdById;
    if (!recipientId) continue;

    const dueLabel = task.dueAt.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const title = overdue ? `Tâche en retard — ${task.event.title}` : `Échéance demain / aujourd’hui — ${task.event.title}`;
    const message = overdue
      ? `« ${task.title} » était due le ${dueLabel}.`
      : `« ${task.title} » est due le ${dueLabel}.`;

    await notifyUsers([recipientId], {
      type: PLATFORM_NOTIFICATION_TYPE.EVENT_TASK_DUE,
      title,
      message,
      metadata: {
        eventId: task.eventId,
        taskId: task.id,
        href: `${FRONTEND_URL}/dashboard/events/${task.eventId}?tab=tasks`,
      },
      whatsapp: `${title}. ${message}`,
    });

    await prisma.eventTask.update({
      where: { id: task.id },
      data: { dueRemindedAt: now },
    });
  }
}
