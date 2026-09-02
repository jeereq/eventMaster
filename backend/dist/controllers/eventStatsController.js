"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkspaceStats = getWorkspaceStats;
const db_1 = require("../db");
const permissionsService_1 = require("../services/permissionsService");
function startOfDay(value = new Date()) {
    const day = new Date(value);
    day.setHours(0, 0, 0, 0);
    return day;
}
function endOfDay(value = new Date()) {
    const day = new Date(value);
    day.setHours(23, 59, 59, 999);
    return day;
}
async function getWorkspaceStats(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId)
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        const accessible = await (0, permissionsService_1.getAccessibleEventIds)(userId, tenantId);
        const eventIds = accessible === 'all' ? null : accessible;
        const eventWhere = eventIds
            ? { tenantId, id: { in: eventIds.length ? eventIds : ['__none__'] } }
            : { tenantId };
        const view = access.isProtocolOnly
            ? 'protocol'
            : access.canManageAllEvents
                ? 'org'
                : 'manager';
        const today = startOfDay();
        const tonight = endOfDay();
        const now = new Date();
        const [eventsTotal, eventsUpcoming, eventsPast, eventsToday, rsvpGroups, checkedIn, taskGroups, overdueTasks, dueTodayTasks, mineOpen, upcomingEvents,] = await Promise.all([
            db_1.prisma.event.count({ where: eventWhere }),
            db_1.prisma.event.count({ where: { ...eventWhere, date: { gte: today } } }),
            db_1.prisma.event.count({ where: { ...eventWhere, date: { lt: today } } }),
            db_1.prisma.event.count({ where: { ...eventWhere, date: { gte: today, lte: tonight } } }),
            db_1.prisma.guest.groupBy({
                by: ['rsvp'],
                where: { event: eventWhere },
                _count: { _all: true },
            }),
            db_1.prisma.guest.count({ where: { event: eventWhere, checkedInAt: { not: null } } }),
            db_1.prisma.eventTask.groupBy({
                by: ['status'],
                where: { event: eventWhere },
                _count: { _all: true },
            }),
            db_1.prisma.eventTask.count({
                where: { event: eventWhere, status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] }, dueAt: { lt: today } },
            }),
            db_1.prisma.eventTask.count({
                where: { event: eventWhere, status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] }, dueAt: { gte: today, lte: tonight } },
            }),
            db_1.prisma.eventTask.count({
                where: { event: eventWhere, status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] }, assigneeId: userId },
            }),
            db_1.prisma.event.findMany({
                where: { ...eventWhere, date: { gte: today } },
                orderBy: { date: 'asc' },
                take: 8,
                select: {
                    id: true,
                    title: true,
                    date: true,
                    location: true,
                    _count: { select: { guests: true, tasks: true } },
                },
            }),
        ]);
        const rsvp = (status) => rsvpGroups.find((row) => row.rsvp === status)?._count._all || 0;
        const guestsTotal = rsvpGroups.reduce((sum, row) => sum + row._count._all, 0);
        const accepted = rsvp('ACCEPTED');
        const taskCount = (status) => taskGroups.find((row) => row.status === status)?._count._all || 0;
        const upcomingIds = upcomingEvents.map((event) => event.id);
        const [upcomingChecked, upcomingOpenTasks] = upcomingIds.length
            ? await Promise.all([
                db_1.prisma.guest.groupBy({
                    by: ['eventId'],
                    where: { eventId: { in: upcomingIds }, checkedInAt: { not: null } },
                    _count: { _all: true },
                }),
                db_1.prisma.eventTask.groupBy({
                    by: ['eventId'],
                    where: { eventId: { in: upcomingIds }, status: { in: ['OPEN', 'IN_PROGRESS', 'BLOCKED'] } },
                    _count: { _all: true },
                }),
            ])
            : [[], []];
        const checkedByEvent = new Map(upcomingChecked.map((row) => [row.eventId, row._count._all]));
        const openTasksByEvent = new Map(upcomingOpenTasks.map((row) => [row.eventId, row._count._all]));
        return res.json({
            view,
            generatedAt: now.toISOString(),
            events: {
                total: eventsTotal,
                upcoming: eventsUpcoming,
                past: eventsPast,
                today: eventsToday,
            },
            guests: {
                total: guestsTotal,
                accepted,
                declined: rsvp('DECLINED'),
                pending: rsvp('PENDING'),
                checkedIn,
                toCheckIn: Math.max(0, accepted - checkedIn),
                checkInRate: accepted > 0 ? Math.round((checkedIn / accepted) * 100) : 0,
            },
            tasks: {
                open: taskCount('OPEN'),
                done: taskCount('DONE'),
                cancelled: taskCount('CANCELLED'),
                overdue: overdueTasks,
                dueToday: dueTodayTasks,
                mineOpen,
            },
            upcoming: upcomingEvents.map((event) => ({
                id: event.id,
                title: event.title,
                date: event.date,
                location: event.location,
                guests: event._count.guests,
                checkedIn: checkedByEvent.get(event.id) || 0,
                openTasks: openTasksByEvent.get(event.id) || 0,
            })),
        });
    }
    catch (error) {
        console.error('getWorkspaceStats:', error);
        return res.status(500).json({ error: 'Impossible de charger les statistiques.' });
    }
}
