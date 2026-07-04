import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { getPlanLimits } from '../config/plansConfig';
import {
  canAccessEvent,
  canManageEvent,
  getAccessibleEventIds,
  resolveOrgAccess,
} from '../services/permissionsService';
import { blueprintToTablePlan } from '../services/roomLayoutService';
import { notifyTableAssignmentChanges } from '../services/tableAssignmentNotificationService';
import { toPrismaJson } from '../utils/prismaJson';

// List all events for the current tenant
export async function getEvents(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const accessible = await getAccessibleEventIds(userId, tenantId);
    const where =
      accessible === 'all'
        ? { tenantId }
        : { tenantId, id: { in: accessible.length ? accessible : ['__none__'] } };

    const events = await prisma.event.findMany({
      where,
      include: {
        room: { select: { id: true, name: true, roomType: true, layoutBlueprint: true } },
      },
      orderBy: { date: 'asc' },
    });

    const access = await resolveOrgAccess(userId, tenantId);
    return res.json({ events, access });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des événements:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des événements' });
  }
}

// Create an event under the current tenant
export async function createEvent(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canCreateEvents) {
      return res.status(403).json({ error: 'Vous n\'avez pas la permission de créer des événements.' });
    }

    const { title, description, date, location, reminderFrequency, latitude, longitude, roomId, importRoomLayout, guestGuidelines } = req.body;

    if (!title || !date || !location) {
      return res.status(400).json({ error: 'Les champs title, date et location sont requis' });
    }

    // Check Plan / Quota before creating event (will be integrated in Phase 4, but let's add a placeholder or simple check)
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { _count: { select: { events: true } } },
    });

    if (tenant) {
      const limits = getPlanLimits(tenant.plan);
      if (tenant._count.events >= limits.maxEvents) {
        return res.status(403).json({
          error: `Quota d'événements atteint pour le plan ${tenant.plan} (Max ${limits.maxEvents === 9999 ? 'illimité' : limits.maxEvents}). Veuillez passer à un forfait supérieur.`,
        });
      }
    }

    let tablePlanData: object | undefined;
    if (roomId && importRoomLayout !== false) {
      const room = await prisma.organizationRoom.findFirst({
        where: { id: roomId, tenantId },
        select: { layoutBlueprint: true },
      });
      if (room?.layoutBlueprint) {
        tablePlanData = blueprintToTablePlan(room.layoutBlueprint as any);
      }
    }

    const event = await prisma.event.create({
      data: {
        tenantId,
        title,
        description,
        date: new Date(date),
        location,
        roomId: roomId || null,
        reminderFrequency: reminderFrequency || 'NONE',
        latitude: latitude !== undefined && latitude !== null ? parseFloat(latitude) : null,
        longitude: longitude !== undefined && longitude !== null ? parseFloat(longitude) : null,
        tablePlan: tablePlanData ? toPrismaJson(tablePlanData) : undefined,
        guestGuidelines: guestGuidelines !== undefined ? toPrismaJson(guestGuidelines) : undefined,
      },
      include: { room: { select: { id: true, name: true, roomType: true, layoutBlueprint: true } } },
    });

    return res.status(201).json(event);
  } catch (error: any) {
    console.error('Erreur lors de la création de l\'événement:', error);
    return res.status(500).json({ error: 'Erreur lors de la création de l\'événement' });
  }
}

// Get a single event details
export async function getEventById(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const id = req.params.id as string;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    if (!(await canAccessEvent(userId, tenantId, id))) {
      return res.status(403).json({ error: 'Accès refusé à cet événement.' });
    }

    const event = await prisma.event.findFirst({
      where: { id, tenantId },
      include: { room: { select: { id: true, name: true, roomType: true, layoutBlueprint: true } } },
    });

    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    return res.json(event);
  } catch (error: any) {
    console.error('Erreur lors de la récupération de l\'événement:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération de l\'événement' });
  }
}

// Update an event
export async function updateEvent(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const id = req.params.id as string;
    const { title, description, date, location, reminderFrequency, latitude, longitude, tablePlan, roomId, guestGuidelines, notifyTableAssignments } = req.body;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    if (!(await canManageEvent(userId, tenantId, id))) {
      return res.status(403).json({ error: 'Vous n\'avez pas la permission de modifier cet événement.' });
    }

    const existingEvent = await prisma.event.findFirst({
      where: { id, tenantId },
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Événement non trouvé ou non autorisé' });
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existingEvent.title,
        description: description !== undefined ? description : existingEvent.description,
        date: date !== undefined ? new Date(date) : existingEvent.date,
        location: location !== undefined ? location : existingEvent.location,
        reminderFrequency: reminderFrequency !== undefined ? reminderFrequency : existingEvent.reminderFrequency,
        latitude: latitude !== undefined ? (latitude !== null ? parseFloat(latitude) : null) : existingEvent.latitude,
        longitude: longitude !== undefined ? (longitude !== null ? parseFloat(longitude) : null) : existingEvent.longitude,
        tablePlan: tablePlan !== undefined ? tablePlan : existingEvent.tablePlan,
        roomId: roomId !== undefined ? roomId : existingEvent.roomId,
        guestGuidelines: guestGuidelines !== undefined ? toPrismaJson(guestGuidelines) : existingEvent.guestGuidelines ?? undefined,
      },
      include: { room: { select: { id: true, name: true, roomType: true, layoutBlueprint: true } } },
    });

    let assignmentNotifications = null;
    if (
      tablePlan !== undefined
      && notifyTableAssignments !== false
    ) {
      assignmentNotifications = await notifyTableAssignmentChanges({
        eventId: id,
        tenantId,
        oldPlan: existingEvent.tablePlan,
        newPlan: tablePlan,
      });
    }

    return res.json({
      ...updatedEvent,
      assignmentNotifications,
    });
  } catch (error: any) {
    console.error('Erreur lors de la modification de l\'événement:', error);
    return res.status(500).json({ error: 'Erreur lors de la modification de l\'événement' });
  }
}

// Delete an event
export async function deleteEvent(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const id = req.params.id as string;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    if (!(await canManageEvent(userId, tenantId, id))) {
      return res.status(403).json({ error: 'Vous n\'avez pas la permission de supprimer cet événement.' });
    }

    const existingEvent = await prisma.event.findFirst({
      where: { id, tenantId },
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Événement non trouvé ou non autorisé' });
    }

    await prisma.event.delete({
      where: { id },
    });

    return res.json({ message: 'Événement supprimé avec succès' });
  } catch (error: any) {
    console.error('Erreur lors de la suppression de l\'événement:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression de l\'événement' });
  }
}

export async function importRoomLayout(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const id = req.params.id as string;
    const { replaceExisting } = req.body;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    if (!(await canManageEvent(userId, tenantId, id))) {
      return res.status(403).json({ error: 'Vous n\'avez pas la permission de modifier cet événement.' });
    }

    const event = await prisma.event.findFirst({
      where: { id, tenantId },
      include: {
        room: { select: { id: true, name: true, roomType: true, layoutBlueprint: true } },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    if (!event.roomId || !event.room?.layoutBlueprint) {
      return res.status(400).json({ error: 'Cet événement n\'est pas lié à une salle avec un plan configuré.' });
    }

    if (event.tablePlan && !replaceExisting) {
      const plan = event.tablePlan as { tables?: unknown[] };
      if (plan.tables && plan.tables.length > 0) {
        return res.status(409).json({
          error: 'Un plan de table existe déjà. Confirmez le remplacement avec replaceExisting: true.',
          hasExistingPlan: true,
        });
      }
    }

    const tablePlan = blueprintToTablePlan(event.room.layoutBlueprint as any);
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: { tablePlan: toPrismaJson(tablePlan) },
      include: { room: { select: { id: true, name: true, roomType: true, layoutBlueprint: true } } },
    });

    return res.json(updatedEvent);
  } catch (error: any) {
    console.error('Erreur importRoomLayout:', error);
    return res.status(500).json({ error: 'Impossible d\'importer le plan de la salle.' });
  }
}
