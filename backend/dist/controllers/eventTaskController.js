"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMyEventTasks = listMyEventTasks;
exports.listEventTasks = listEventTasks;
exports.createEventTask = createEventTask;
exports.seedEventTasks = seedEventTasks;
exports.updateEventTask = updateEventTask;
exports.deleteEventTask = deleteEventTask;
const db_1 = require("../db");
const permissionsService_1 = require("../services/permissionsService");
const tenantAccess_1 = require("../utils/tenantAccess");
const eventTaskNotifyService_1 = require("../services/eventTaskNotifyService");
const OPEN_TASK_STATUSES = ['OPEN', 'IN_PROGRESS', 'BLOCKED'];
const userLite = { id: true, name: true, email: true };
const taskInclude = {
    assignee: { select: userLite },
    createdBy: { select: userLite },
    blockedBy: { select: { id: true, title: true, status: true } },
    event: { select: { id: true, title: true, date: true } },
};
function asRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : null;
}
function serializeTask(row, userId) {
    return {
        id: row.id,
        eventId: row.eventId,
        title: row.title,
        notes: row.notes,
        status: row.status,
        kind: row.kind,
        priority: row.priority,
        dueAt: row.dueAt,
        sourceKey: row.sourceKey,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        completedAt: row.completedAt,
        blockedById: row.blockedById,
        blockedBy: row.blockedBy,
        assignee: row.assignee,
        createdBy: row.createdBy,
        event: row.event,
        mine: row.assignee?.id === userId,
    };
}
function sortTasks(rows) {
    const rank = (status) => {
        if (status === 'BLOCKED')
            return 0;
        if (status === 'OPEN')
            return 1;
        if (status === 'IN_PROGRESS')
            return 2;
        if (status === 'DONE')
            return 3;
        return 4;
    };
    return [...rows].sort((a, b) => {
        const byStatus = rank(a.status) - rank(b.status);
        if (byStatus !== 0)
            return byStatus;
        const byPriority = (b.priority ?? 1) - (a.priority ?? 1);
        if (byPriority !== 0)
            return byPriority;
        const aDue = a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bDue = b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
        if (aDue !== bDue)
            return aDue - bDue;
        return a.createdAt.getTime() - b.createdAt.getTime();
    });
}
async function listAssignable(tenantId, eventId) {
    const [tenant, staff, orgUsers] = await Promise.all([
        db_1.prisma.tenant.findUnique({ where: { id: tenantId }, select: { managerId: true } }),
        db_1.prisma.eventStaff.findMany({
            where: { eventId },
            include: { user: { select: { id: true, name: true, email: true, orgRole: true } } },
        }),
        db_1.prisma.user.findMany({
            where: { tenantId, role: 'USER', orgRole: { in: ['MANAGER', 'PROTOCOL'] } },
            select: { id: true, name: true, email: true, orgRole: true },
        }),
    ]);
    const map = new Map();
    if (tenant?.managerId) {
        const owner = await db_1.prisma.user.findUnique({
            where: { id: tenant.managerId },
            select: { id: true, name: true, email: true },
        });
        if (owner)
            map.set(owner.id, { ...owner, label: 'Propriétaire' });
    }
    for (const user of orgUsers) {
        if (map.has(user.id))
            continue;
        map.set(user.id, {
            id: user.id,
            name: user.name,
            email: user.email,
            label: user.orgRole === 'MANAGER' ? 'Manager' : 'Protocole',
        });
    }
    for (const row of staff) {
        if (map.has(row.user.id))
            continue;
        map.set(row.user.id, {
            id: row.user.id,
            name: row.user.name,
            email: row.user.email,
            label: row.staffRole === 'MANAGER' ? 'Manager événement' : 'Protocole événement',
        });
    }
    return [...map.values()];
}
function suggestionsFromEvent(event) {
    const prep = asRecord(event.eventPrep);
    const items = [];
    const venue = asRecord(prep?.venue);
    const venueName = typeof venue?.name === 'string' ? venue.name.trim() : '';
    const venueHeadline = typeof venue?.headline === 'string' ? venue.headline.trim() : '';
    const venueSlug = typeof venue?.slug === 'string' ? venue.slug.trim() : '';
    if (venueSlug && (venueName || venueHeadline)) {
        items.push({
            sourceKey: `prep:venue:${venueSlug}`,
            title: `Confirmer la salle — ${venueName || venueHeadline}`,
            notes: 'Vérifier la réservation, l’accès et le brief du lieu.',
            kind: 'VENUE',
        });
    }
    const vendors = Array.isArray(prep?.vendors) ? prep.vendors : [];
    for (const raw of vendors) {
        const vendor = asRecord(raw);
        const slug = typeof vendor?.slug === 'string' ? vendor.slug.trim() : '';
        const title = typeof vendor?.title === 'string' ? vendor.title.trim() : '';
        if (!slug || !title)
            continue;
        const orgName = typeof vendor?.orgName === 'string' ? vendor.orgName.trim() : '';
        items.push({
            sourceKey: `prep:vendor:${slug}`,
            title: `Confirmer ${title}`,
            notes: orgName ? `Prestataire : ${orgName}. Vérifier devis ou réservation.` : 'Vérifier devis ou réservation.',
            kind: 'VENDOR',
        });
    }
    items.push({
        sourceKey: 'ops:tables',
        title: 'Vérifier le plan de table',
        notes: 'Places assignées et PDF sièges pour les invités confirmés.',
        kind: 'GUESTS',
    }, {
        sourceKey: 'ops:checkin',
        title: 'Accueil et check-in',
        notes: 'Scanner les badges et confirmer les présences.',
        kind: 'PROTOCOL',
    }, {
        sourceKey: 'ops:briefing',
        title: 'Briefing protocole jour J',
        notes: `Lieu : ${event.location}. Brief de l’équipe avant l’accueil.`,
        kind: 'PROTOCOL',
    });
    return items;
}
function parseStatus(value) {
    if (value === 'OPEN'
        || value === 'IN_PROGRESS'
        || value === 'BLOCKED'
        || value === 'DONE'
        || value === 'CANCELLED') {
        return value;
    }
    return null;
}
function parseKind(value) {
    if (value === 'GENERAL'
        || value === 'VENUE'
        || value === 'VENDOR'
        || value === 'GUESTS'
        || value === 'PROTOCOL'
        || value === 'LOGISTICS'
        || value === 'COMMUNICATION'
        || value === 'FINANCE') {
        return value;
    }
    return null;
}
function parsePriority(value) {
    const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
    if (!Number.isInteger(n) || n < 0 || n > 2)
        return null;
    return n;
}
async function wouldCreateCycle(eventId, taskId, blockedById) {
    if (taskId === blockedById)
        return true;
    const rows = await db_1.prisma.eventTask.findMany({
        where: { eventId },
        select: { id: true, blockedById: true },
    });
    const nextById = new Map(rows.map((item) => [item.id, item.blockedById]));
    const seen = new Set([taskId]);
    let current = blockedById;
    while (current) {
        if (seen.has(current))
            return true;
        seen.add(current);
        current = nextById.get(current) ?? null;
    }
    return false;
}
async function loadEventOr404(eventId, tenantId) {
    return (0, tenantAccess_1.verifyEventBelongsToTenant)(eventId, tenantId);
}
async function listMyEventTasks(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId)
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        const accessIds = await (0, permissionsService_1.getAccessibleEventIds)(userId, tenantId);
        const eventFilter = accessIds === 'all'
            ? { event: { tenantId } }
            : { eventId: { in: accessIds } };
        const rows = await db_1.prisma.eventTask.findMany({
            where: { ...eventFilter, assigneeId: userId, status: { in: OPEN_TASK_STATUSES } },
            include: taskInclude,
            orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
            take: 50,
        });
        return res.json({ tasks: rows.map((row) => serializeTask(row, userId)) });
    }
    catch (error) {
        console.error('listMyEventTasks:', error);
        return res.status(500).json({ error: 'Impossible de charger vos tâches.' });
    }
}
async function listEventTasks(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const eventId = req.params.eventId;
        if (!tenantId || !userId)
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        const event = await loadEventOr404(eventId, tenantId);
        if (!event)
            return res.status(404).json({ error: 'Événement introuvable.' });
        if (!(await (0, permissionsService_1.canAccessEvent)(userId, tenantId, eventId))) {
            return res.status(403).json({ error: 'Accès refusé à cet événement.' });
        }
        const [rows, canManage, assignees] = await Promise.all([
            db_1.prisma.eventTask.findMany({
                where: { eventId },
                include: taskInclude,
                orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'asc' }],
            }),
            (0, permissionsService_1.canManageEvent)(userId, tenantId, eventId),
            listAssignable(tenantId, eventId),
        ]);
        return res.json({
            tasks: sortTasks(rows).map((row) => serializeTask(row, userId)),
            canManage,
            assignees,
        });
    }
    catch (error) {
        console.error('listEventTasks:', error);
        return res.status(500).json({ error: 'Impossible de charger les tâches.' });
    }
}
async function createEventTask(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const eventId = req.params.eventId;
        if (!tenantId || !userId)
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        const event = await loadEventOr404(eventId, tenantId);
        if (!event)
            return res.status(404).json({ error: 'Événement introuvable.' });
        if (!(await (0, permissionsService_1.canManageEvent)(userId, tenantId, eventId))) {
            return res.status(403).json({ error: 'Seuls les managers peuvent créer une tâche.' });
        }
        const title = String(req.body?.title || '').trim().slice(0, 160);
        if (!title)
            return res.status(400).json({ error: 'Indiquez un titre.' });
        const assignees = await listAssignable(tenantId, eventId);
        const assigneeId = req.body?.assigneeId ? String(req.body.assigneeId) : null;
        if (assigneeId && !assignees.some((item) => item.id === assigneeId)) {
            return res.status(400).json({ error: 'Cet utilisateur ne peut pas être assigné à cet événement.' });
        }
        const dueAtRaw = req.body?.dueAt ? new Date(String(req.body.dueAt)) : event.date;
        const dueAt = Number.isNaN(dueAtRaw.getTime()) ? event.date : dueAtRaw;
        const kind = parseKind(req.body?.kind) || 'GENERAL';
        const priority = parsePriority(req.body?.priority) ?? 1;
        const blockedById = req.body?.blockedById ? String(req.body.blockedById) : null;
        if (blockedById) {
            const blocker = await db_1.prisma.eventTask.findFirst({ where: { id: blockedById, eventId }, select: { id: true } });
            if (!blocker)
                return res.status(400).json({ error: 'Tâche dépendante introuvable.' });
        }
        const task = await db_1.prisma.eventTask.create({
            data: {
                eventId,
                title,
                notes: req.body?.notes ? String(req.body.notes).trim().slice(0, 2000) : null,
                dueAt,
                assigneeId,
                createdById: userId,
                kind,
                priority,
                blockedById,
                status: blockedById ? 'BLOCKED' : 'OPEN',
            },
            include: taskInclude,
        });
        if (assigneeId) {
            (0, eventTaskNotifyService_1.notifyEventTaskAssigned)({
                actorId: userId,
                assigneeId,
                createdById: userId,
                eventId,
                eventTitle: event.title,
                taskId: task.id,
                taskTitle: title,
            });
        }
        return res.status(201).json({ task: serializeTask(task, userId) });
    }
    catch (error) {
        console.error('createEventTask:', error);
        return res.status(500).json({ error: 'Impossible de créer la tâche.' });
    }
}
async function seedEventTasks(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const eventId = req.params.eventId;
        if (!tenantId || !userId)
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        const event = await loadEventOr404(eventId, tenantId);
        if (!event)
            return res.status(404).json({ error: 'Événement introuvable.' });
        if (!(await (0, permissionsService_1.canManageEvent)(userId, tenantId, eventId))) {
            return res.status(403).json({ error: 'Seuls les managers peuvent générer la checklist.' });
        }
        const suggestions = suggestionsFromEvent(event);
        const existing = await db_1.prisma.eventTask.findMany({
            where: { eventId, sourceKey: { in: suggestions.map((item) => item.sourceKey) } },
            select: { sourceKey: true },
        });
        const seen = new Set(existing.map((row) => row.sourceKey));
        const toCreate = suggestions.filter((item) => !seen.has(item.sourceKey));
        if (toCreate.length === 0) {
            const rows = await db_1.prisma.eventTask.findMany({
                where: { eventId },
                include: taskInclude,
                orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'asc' }],
            });
            return res.json({
                created: 0,
                message: 'La checklist est déjà en place.',
                tasks: sortTasks(rows).map((row) => serializeTask(row, userId)),
            });
        }
        await db_1.prisma.eventTask.createMany({
            data: toCreate.map((item) => ({
                eventId,
                title: item.title,
                notes: item.notes,
                dueAt: event.date,
                createdById: userId,
                sourceKey: item.sourceKey,
                kind: item.kind,
            })),
        });
        const rows = await db_1.prisma.eventTask.findMany({
            where: { eventId },
            include: taskInclude,
            orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'asc' }],
        });
        return res.status(201).json({
            created: toCreate.length,
            message: toCreate.length === 1
                ? '1 tâche ajoutée depuis la préparation.'
                : `${toCreate.length} tâches ajoutées depuis la préparation.`,
            tasks: sortTasks(rows).map((row) => serializeTask(row, userId)),
        });
    }
    catch (error) {
        console.error('seedEventTasks:', error);
        return res.status(500).json({ error: 'Impossible de générer la checklist.' });
    }
}
async function updateEventTask(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const eventId = req.params.eventId;
        const taskId = req.params.taskId;
        if (!tenantId || !userId)
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        const event = await loadEventOr404(eventId, tenantId);
        if (!event)
            return res.status(404).json({ error: 'Événement introuvable.' });
        if (!(await (0, permissionsService_1.canAccessEvent)(userId, tenantId, eventId))) {
            return res.status(403).json({ error: 'Accès refusé à cet événement.' });
        }
        const existing = await db_1.prisma.eventTask.findFirst({
            where: { id: taskId, eventId },
        });
        if (!existing)
            return res.status(404).json({ error: 'Tâche introuvable.' });
        const canManage = await (0, permissionsService_1.canManageEvent)(userId, tenantId, eventId);
        const canComplete = canManage || existing.assigneeId === userId || !existing.assigneeId;
        if (!canManage && !canComplete) {
            return res.status(403).json({ error: 'Vous ne pouvez modifier que les tâches qui vous sont assignées.' });
        }
        const data = {};
        if (canManage) {
            if (req.body?.title != null) {
                const title = String(req.body.title).trim().slice(0, 160);
                if (!title)
                    return res.status(400).json({ error: 'Indiquez un titre.' });
                data.title = title;
            }
            if (req.body?.notes !== undefined) {
                data.notes = req.body.notes ? String(req.body.notes).trim().slice(0, 2000) : null;
            }
            if (req.body?.dueAt !== undefined) {
                if (!req.body.dueAt)
                    data.dueAt = null;
                else {
                    const dueAt = new Date(String(req.body.dueAt));
                    if (Number.isNaN(dueAt.getTime()))
                        return res.status(400).json({ error: 'Date d’échéance invalide.' });
                    data.dueAt = dueAt;
                    data.dueRemindedAt = null;
                }
            }
            if (req.body?.assigneeId !== undefined) {
                const assigneeId = req.body.assigneeId ? String(req.body.assigneeId) : null;
                if (assigneeId) {
                    const assignees = await listAssignable(tenantId, eventId);
                    if (!assignees.some((item) => item.id === assigneeId)) {
                        return res.status(400).json({ error: 'Cet utilisateur ne peut pas être assigné à cet événement.' });
                    }
                }
                data.assigneeId = assigneeId;
            }
            if (req.body?.kind !== undefined) {
                const kind = parseKind(req.body.kind);
                if (!kind)
                    return res.status(400).json({ error: 'Type de tâche invalide.' });
                data.kind = kind;
            }
            if (req.body?.priority !== undefined) {
                const priority = parsePriority(req.body.priority);
                if (priority == null)
                    return res.status(400).json({ error: 'Priorité invalide.' });
                data.priority = priority;
            }
            if (req.body?.blockedById !== undefined) {
                const blockedById = req.body.blockedById ? String(req.body.blockedById) : null;
                if (blockedById) {
                    const blocker = await db_1.prisma.eventTask.findFirst({
                        where: { id: blockedById, eventId },
                        select: { id: true, status: true },
                    });
                    if (!blocker)
                        return res.status(400).json({ error: 'Tâche dépendante introuvable.' });
                    if (await wouldCreateCycle(eventId, existing.id, blockedById)) {
                        return res.status(400).json({ error: 'Cette dépendance créerait un cycle.' });
                    }
                    data.blockedById = blockedById;
                    if (blocker.status !== 'DONE' && req.body?.status === undefined) {
                        data.status = 'BLOCKED';
                        data.completedAt = null;
                    }
                }
                else {
                    data.blockedById = null;
                    if (existing.status === 'BLOCKED' && req.body?.status === undefined) {
                        data.status = 'OPEN';
                    }
                }
            }
        }
        if (req.body?.status !== undefined) {
            const status = parseStatus(req.body.status);
            if (!status)
                return res.status(400).json({ error: 'Statut invalide.' });
            if (!canManage && status === 'CANCELLED') {
                return res.status(403).json({ error: 'Seul un manager peut annuler une tâche.' });
            }
            data.status = status;
            data.completedAt = status === 'DONE' ? new Date() : null;
            if (status === 'OPEN' || status === 'IN_PROGRESS')
                data.dueRemindedAt = null;
        }
        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: 'Aucune modification.' });
        }
        const task = await db_1.prisma.eventTask.update({
            where: { id: existing.id },
            data,
            include: taskInclude,
        });
        if (data.status === 'DONE') {
            await db_1.prisma.eventTask.updateMany({
                where: { blockedById: existing.id, status: 'BLOCKED' },
                data: { status: 'OPEN' },
            });
        }
        if (data.status === 'DONE' && existing.status !== 'DONE') {
            (0, eventTaskNotifyService_1.notifyEventTaskCompleted)({
                actorId: userId,
                assigneeId: task.assigneeId,
                createdById: task.createdById,
                eventId,
                eventTitle: event.title,
                taskId: task.id,
                taskTitle: task.title,
            });
        }
        if (canManage
            && data.assigneeId
            && data.assigneeId !== existing.assigneeId) {
            (0, eventTaskNotifyService_1.notifyEventTaskAssigned)({
                actorId: userId,
                assigneeId: data.assigneeId,
                createdById: existing.createdById,
                eventId,
                eventTitle: event.title,
                taskId: task.id,
                taskTitle: task.title,
            });
        }
        return res.json({ task: serializeTask(task, userId) });
    }
    catch (error) {
        console.error('updateEventTask:', error);
        return res.status(500).json({ error: 'Impossible de mettre à jour la tâche.' });
    }
}
async function deleteEventTask(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const eventId = req.params.eventId;
        const taskId = req.params.taskId;
        if (!tenantId || !userId)
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        const event = await loadEventOr404(eventId, tenantId);
        if (!event)
            return res.status(404).json({ error: 'Événement introuvable.' });
        if (!(await (0, permissionsService_1.canManageEvent)(userId, tenantId, eventId))) {
            return res.status(403).json({ error: 'Seuls les managers peuvent supprimer une tâche.' });
        }
        await db_1.prisma.eventTask.deleteMany({ where: { id: taskId, eventId } });
        return res.json({ message: 'Tâche supprimée.' });
    }
    catch (error) {
        console.error('deleteEventTask:', error);
        return res.status(500).json({ error: 'Impossible de supprimer la tâche.' });
    }
}
