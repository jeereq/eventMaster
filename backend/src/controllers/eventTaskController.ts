import { Response } from 'express';
import { EventTaskKind, EventTaskStatus } from '@prisma/client';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';
import { canAccessEvent, canManageEvent, getAccessibleEventIds } from '../services/permissionsService';
import { verifyEventBelongsToTenant } from '../utils/tenantAccess';
import { notifyEventTaskAssigned, notifyEventTaskCompleted } from '../services/eventTaskNotifyService';

const OPEN_TASK_STATUSES: EventTaskStatus[] = ['OPEN', 'IN_PROGRESS', 'BLOCKED'];

const userLite = { id: true, name: true, email: true } as const;

const taskInclude = {
  assignee: { select: userLite },
  createdBy: { select: userLite },
  blockedBy: { select: { id: true, title: true, status: true } },
  event: { select: { id: true, title: true, date: true } },
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function serializeTask(row: {
  id: string;
  eventId: string;
  title: string;
  notes: string | null;
  status: EventTaskStatus;
  kind: EventTaskKind;
  priority: number;
  dueAt: Date | null;
  sourceKey: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  blockedById: string | null;
  assignee: { id: string; name: string | null; email: string } | null;
  createdBy: { id: string; name: string | null; email: string };
  blockedBy: { id: string; title: string; status: EventTaskStatus } | null;
  event: { id: string; title: string; date: Date };
}, userId: string) {
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

function sortTasks<T extends { status: EventTaskStatus; priority: number; createdAt: Date; dueAt: Date | null }>(rows: T[]): T[] {
  const rank = (status: EventTaskStatus) => {
    if (status === 'BLOCKED') return 0;
    if (status === 'OPEN') return 1;
    if (status === 'IN_PROGRESS') return 2;
    if (status === 'DONE') return 3;
    return 4;
  };
  return [...rows].sort((a, b) => {
    const byStatus = rank(a.status) - rank(b.status);
    if (byStatus !== 0) return byStatus;
    const byPriority = (b.priority ?? 1) - (a.priority ?? 1);
    if (byPriority !== 0) return byPriority;
    const aDue = a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bDue = b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (aDue !== bDue) return aDue - bDue;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

type Assignable = { id: string; name: string | null; email: string; label: string };

async function listAssignable(tenantId: string, eventId: string): Promise<Assignable[]> {
  const [tenant, staff, orgUsers] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { managerId: true } }),
    prisma.eventStaff.findMany({
      where: { eventId },
      include: { user: { select: { id: true, name: true, email: true, orgRole: true } } },
    }),
    prisma.user.findMany({
      where: { tenantId, role: 'USER', orgRole: { in: ['MANAGER', 'PROTOCOL'] } },
      select: { id: true, name: true, email: true, orgRole: true },
    }),
  ]);

  const map = new Map<string, Assignable>();
  if (tenant?.managerId) {
    const owner = await prisma.user.findUnique({
      where: { id: tenant.managerId },
      select: { id: true, name: true, email: true },
    });
    if (owner) map.set(owner.id, { ...owner, label: 'Propriétaire' });
  }
  for (const user of orgUsers) {
    if (map.has(user.id)) continue;
    map.set(user.id, {
      id: user.id,
      name: user.name,
      email: user.email,
      label: user.orgRole === 'MANAGER' ? 'Manager' : 'Protocole',
    });
  }
  for (const row of staff) {
    if (map.has(row.user.id)) continue;
    map.set(row.user.id, {
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
      label: row.staffRole === 'MANAGER' ? 'Manager événement' : 'Protocole événement',
    });
  }
  return [...map.values()];
}

function suggestionsFromEvent(event: {
  title: string;
  location: string;
  eventPrep: unknown;
}): Array<{ sourceKey: string; title: string; notes: string; kind: EventTaskKind }> {
  const prep = asRecord(event.eventPrep);
  const items: Array<{ sourceKey: string; title: string; notes: string; kind: EventTaskKind }> = [];
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
    if (!slug || !title) continue;
    const orgName = typeof vendor?.orgName === 'string' ? vendor.orgName.trim() : '';
    items.push({
      sourceKey: `prep:vendor:${slug}`,
      title: `Confirmer ${title}`,
      notes: orgName ? `Prestataire : ${orgName}. Vérifier devis ou réservation.` : 'Vérifier devis ou réservation.',
      kind: 'VENDOR',
    });
  }
  items.push(
    {
      sourceKey: 'ops:tables',
      title: 'Vérifier le plan de table',
      notes: 'Places assignées et PDF sièges pour les invités confirmés.',
      kind: 'GUESTS',
    },
    {
      sourceKey: 'ops:checkin',
      title: 'Accueil et check-in',
      notes: 'Scanner les badges et confirmer les présences.',
      kind: 'PROTOCOL',
    },
    {
      sourceKey: 'ops:briefing',
      title: 'Briefing protocole jour J',
      notes: `Lieu : ${event.location}. Brief de l’équipe avant l’accueil.`,
      kind: 'PROTOCOL',
    },
  );
  return items;
}

function parseStatus(value: unknown): EventTaskStatus | null {
  if (
    value === 'OPEN'
    || value === 'IN_PROGRESS'
    || value === 'BLOCKED'
    || value === 'DONE'
    || value === 'CANCELLED'
  ) {
    return value;
  }
  return null;
}

function parseKind(value: unknown): EventTaskKind | null {
  if (
    value === 'GENERAL'
    || value === 'VENUE'
    || value === 'VENDOR'
    || value === 'GUESTS'
    || value === 'PROTOCOL'
    || value === 'LOGISTICS'
    || value === 'COMMUNICATION'
    || value === 'FINANCE'
  ) {
    return value;
  }
  return null;
}

function parsePriority(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isInteger(n) || n < 0 || n > 2) return null;
  return n;
}

async function wouldCreateCycle(eventId: string, taskId: string, blockedById: string): Promise<boolean> {
  if (taskId === blockedById) return true;
  const rows = await prisma.eventTask.findMany({
    where: { eventId },
    select: { id: true, blockedById: true },
  });
  const nextById = new Map(rows.map((item) => [item.id, item.blockedById]));
  const seen = new Set<string>([taskId]);
  let current: string | null = blockedById;
  while (current) {
    if (seen.has(current)) return true;
    seen.add(current);
    current = nextById.get(current) ?? null;
  }
  return false;
}

async function loadEventOr404(eventId: string, tenantId: string) {
  return verifyEventBelongsToTenant(eventId, tenantId);
}

export async function listMyEventTasks(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Organisation non identifiée.' });

    const accessIds = await getAccessibleEventIds(userId, tenantId);
    const eventFilter = accessIds === 'all'
      ? { event: { tenantId } }
      : { eventId: { in: accessIds } };

    const rows = await prisma.eventTask.findMany({
      where: { ...eventFilter, assigneeId: userId, status: { in: OPEN_TASK_STATUSES } },
      include: taskInclude,
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
      take: 50,
    });

    return res.json({ tasks: rows.map((row) => serializeTask(row, userId)) });
  } catch (error) {
    console.error('listMyEventTasks:', error);
    return res.status(500).json({ error: 'Impossible de charger vos tâches.' });
  }
}

export async function listEventTasks(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const eventId = req.params.eventId as string;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Organisation non identifiée.' });

    const event = await loadEventOr404(eventId, tenantId);
    if (!event) return res.status(404).json({ error: 'Événement introuvable.' });
    if (!(await canAccessEvent(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Accès refusé à cet événement.' });
    }

    const [rows, canManage, assignees] = await Promise.all([
      prisma.eventTask.findMany({
        where: { eventId },
        include: taskInclude,
        orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'asc' }],
      }),
      canManageEvent(userId, tenantId, eventId),
      listAssignable(tenantId, eventId),
    ]);

    return res.json({
      tasks: sortTasks(rows).map((row) => serializeTask(row, userId)),
      canManage,
      assignees,
    });
  } catch (error) {
    console.error('listEventTasks:', error);
    return res.status(500).json({ error: 'Impossible de charger les tâches.' });
  }
}

export async function createEventTask(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const eventId = req.params.eventId as string;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Organisation non identifiée.' });

    const event = await loadEventOr404(eventId, tenantId);
    if (!event) return res.status(404).json({ error: 'Événement introuvable.' });
    if (!(await canManageEvent(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Seuls les managers peuvent créer une tâche.' });
    }

    const title = String(req.body?.title || '').trim().slice(0, 160);
    if (!title) return res.status(400).json({ error: 'Indiquez un titre.' });

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
      const blocker = await prisma.eventTask.findFirst({ where: { id: blockedById, eventId }, select: { id: true } });
      if (!blocker) return res.status(400).json({ error: 'Tâche dépendante introuvable.' });
    }

    const task = await prisma.eventTask.create({
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
      notifyEventTaskAssigned({
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
  } catch (error) {
    console.error('createEventTask:', error);
    return res.status(500).json({ error: 'Impossible de créer la tâche.' });
  }
}

export async function seedEventTasks(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const eventId = req.params.eventId as string;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Organisation non identifiée.' });

    const event = await loadEventOr404(eventId, tenantId);
    if (!event) return res.status(404).json({ error: 'Événement introuvable.' });
    if (!(await canManageEvent(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Seuls les managers peuvent générer la checklist.' });
    }

    const suggestions = suggestionsFromEvent(event);
    const existing = await prisma.eventTask.findMany({
      where: { eventId, sourceKey: { in: suggestions.map((item) => item.sourceKey) } },
      select: { sourceKey: true },
    });
    const seen = new Set(existing.map((row) => row.sourceKey));
    const toCreate = suggestions.filter((item) => !seen.has(item.sourceKey));
    if (toCreate.length === 0) {
      const rows = await prisma.eventTask.findMany({
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

    await prisma.eventTask.createMany({
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

    const rows = await prisma.eventTask.findMany({
      where: { eventId },
      include: taskInclude,
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'asc' }],
    });

    return res.status(201).json({
      created: toCreate.length,
      message:
        toCreate.length === 1
          ? '1 tâche ajoutée depuis la préparation.'
          : `${toCreate.length} tâches ajoutées depuis la préparation.`,
      tasks: sortTasks(rows).map((row) => serializeTask(row, userId)),
    });
  } catch (error) {
    console.error('seedEventTasks:', error);
    return res.status(500).json({ error: 'Impossible de générer la checklist.' });
  }
}

export async function updateEventTask(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const eventId = req.params.eventId as string;
    const taskId = req.params.taskId as string;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Organisation non identifiée.' });

    const event = await loadEventOr404(eventId, tenantId);
    if (!event) return res.status(404).json({ error: 'Événement introuvable.' });
    if (!(await canAccessEvent(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Accès refusé à cet événement.' });
    }

    const existing = await prisma.eventTask.findFirst({
      where: { id: taskId, eventId },
    });
    if (!existing) return res.status(404).json({ error: 'Tâche introuvable.' });

    const canManage = await canManageEvent(userId, tenantId, eventId);
    const canComplete = canManage || existing.assigneeId === userId || !existing.assigneeId;
    if (!canManage && !canComplete) {
      return res.status(403).json({ error: 'Vous ne pouvez modifier que les tâches qui vous sont assignées.' });
    }

    const data: {
      title?: string;
      notes?: string | null;
      status?: EventTaskStatus;
      kind?: EventTaskKind;
      priority?: number;
      dueAt?: Date | null;
      assigneeId?: string | null;
      blockedById?: string | null;
      completedAt?: Date | null;
      dueRemindedAt?: Date | null;
    } = {};

    if (canManage) {
      if (req.body?.title != null) {
        const title = String(req.body.title).trim().slice(0, 160);
        if (!title) return res.status(400).json({ error: 'Indiquez un titre.' });
        data.title = title;
      }
      if (req.body?.notes !== undefined) {
        data.notes = req.body.notes ? String(req.body.notes).trim().slice(0, 2000) : null;
      }
      if (req.body?.dueAt !== undefined) {
        if (!req.body.dueAt) data.dueAt = null;
        else {
          const dueAt = new Date(String(req.body.dueAt));
          if (Number.isNaN(dueAt.getTime())) return res.status(400).json({ error: 'Date d’échéance invalide.' });
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
        if (!kind) return res.status(400).json({ error: 'Type de tâche invalide.' });
        data.kind = kind;
      }
      if (req.body?.priority !== undefined) {
        const priority = parsePriority(req.body.priority);
        if (priority == null) return res.status(400).json({ error: 'Priorité invalide.' });
        data.priority = priority;
      }
      if (req.body?.blockedById !== undefined) {
        const blockedById = req.body.blockedById ? String(req.body.blockedById) : null;
        if (blockedById) {
          const blocker = await prisma.eventTask.findFirst({
            where: { id: blockedById, eventId },
            select: { id: true, status: true },
          });
          if (!blocker) return res.status(400).json({ error: 'Tâche dépendante introuvable.' });
          if (await wouldCreateCycle(eventId, existing.id, blockedById)) {
            return res.status(400).json({ error: 'Cette dépendance créerait un cycle.' });
          }
          data.blockedById = blockedById;
          if (blocker.status !== 'DONE' && req.body?.status === undefined) {
            data.status = 'BLOCKED';
            data.completedAt = null;
          }
        } else {
          data.blockedById = null;
          if (existing.status === 'BLOCKED' && req.body?.status === undefined) {
            data.status = 'OPEN';
          }
        }
      }
    }

    if (req.body?.status !== undefined) {
      const status = parseStatus(req.body.status);
      if (!status) return res.status(400).json({ error: 'Statut invalide.' });
      if (!canManage && status === 'CANCELLED') {
        return res.status(403).json({ error: 'Seul un manager peut annuler une tâche.' });
      }
      data.status = status;
      data.completedAt = status === 'DONE' ? new Date() : null;
      if (status === 'OPEN' || status === 'IN_PROGRESS') data.dueRemindedAt = null;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Aucune modification.' });
    }

    const task = await prisma.eventTask.update({
      where: { id: existing.id },
      data,
      include: taskInclude,
    });

    if (data.status === 'DONE') {
      await prisma.eventTask.updateMany({
        where: { blockedById: existing.id, status: 'BLOCKED' },
        data: { status: 'OPEN' },
      });
    }

    if (data.status === 'DONE' && existing.status !== 'DONE') {
      notifyEventTaskCompleted({
        actorId: userId,
        assigneeId: task.assigneeId,
        createdById: task.createdById,
        eventId,
        eventTitle: event.title,
        taskId: task.id,
        taskTitle: task.title,
      });
    }

    if (
      canManage
      && data.assigneeId
      && data.assigneeId !== existing.assigneeId
    ) {
      notifyEventTaskAssigned({
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
  } catch (error) {
    console.error('updateEventTask:', error);
    return res.status(500).json({ error: 'Impossible de mettre à jour la tâche.' });
  }
}

export async function deleteEventTask(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const eventId = req.params.eventId as string;
    const taskId = req.params.taskId as string;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Organisation non identifiée.' });

    const event = await loadEventOr404(eventId, tenantId);
    if (!event) return res.status(404).json({ error: 'Événement introuvable.' });
    if (!(await canManageEvent(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Seuls les managers peuvent supprimer une tâche.' });
    }

    await prisma.eventTask.deleteMany({ where: { id: taskId, eventId } });
    return res.json({ message: 'Tâche supprimée.' });
  } catch (error) {
    console.error('deleteEventTask:', error);
    return res.status(500).json({ error: 'Impossible de supprimer la tâche.' });
  }
}
