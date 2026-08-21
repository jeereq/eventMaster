"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processTaskDueReminders = processTaskDueReminders;
const db_1 = require("../db");
const eventTaskNotifyService_1 = require("./eventTaskNotifyService");
function startOfLocalDay(value = new Date()) {
    const day = new Date(value);
    day.setHours(0, 0, 0, 0);
    return day;
}
async function processTaskDueReminders() {
    const now = new Date();
    const today = startOfLocalDay(now);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 2);
    const staleBefore = new Date(now.getTime() - 20 * 60 * 60 * 1000);
    const tasks = await db_1.prisma.eventTask.findMany({
        where: {
            status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] },
            dueAt: { lte: horizon },
            OR: [{ dueRemindedAt: null }, { dueRemindedAt: { lt: staleBefore } }],
        },
        include: {
            event: { select: { id: true, title: true } },
        },
        take: 200,
    });
    if (tasks.length === 0)
        return;
    console.log(`[Task reminders] ${tasks.length} tâche(s) à rappeler.`);
    for (const task of tasks) {
        if (!task.dueAt)
            continue;
        const overdue = task.dueAt < today;
        const dueLabel = task.dueAt.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });
        await (0, eventTaskNotifyService_1.notifyEventTaskDue)({
            assigneeId: task.assigneeId,
            createdById: task.createdById,
            eventId: task.eventId,
            eventTitle: task.event.title,
            taskId: task.id,
            taskTitle: task.title,
            overdue,
            dueLabel,
        });
        await db_1.prisma.eventTask.update({
            where: { id: task.id },
            data: { dueRemindedAt: now },
        });
    }
}
