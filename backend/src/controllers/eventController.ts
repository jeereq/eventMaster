import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { getPlanLimitsForTenant } from '../config/plansConfig';
import {
  canAccessEvent,
  canManageEvent,
  getAccessibleEventIds,
  resolveOrgAccess,
} from '../services/permissionsService';
import { blueprintToTablePlan, mergeBlueprintIntoTablePlan } from '../services/roomLayoutService';
import { mergePricingZonesIntoTablePlan } from '../services/ticketPricingService';
import { isOnlinePaymentsEnabled } from '../services/platformSettingsService';
import { notifyTableAssignmentChanges } from '../services/tableAssignmentNotificationService';
import { toPrismaJson } from '../utils/prismaJson';
import { uniqueSlug } from '../utils/slug';
import { parsePhotoUrls } from '../utils/publicVenue';

function rejectPaidTicketingIfDisabled(body: Record<string, unknown>, res: Response): boolean {
  const wantsPublic = body.isPublic === true || body.isPublic === 'true';
  const wantsPaid = body.ticketingEnabled === true || body.ticketingEnabled === 'true';
  if (wantsPublic && wantsPaid && !isOnlinePaymentsEnabled()) {
    res.status(403).json({
      error: 'Les paiements en ligne sont désactivés par la plateforme. Utilisez l’inscription gratuite.',
    });
    return true;
  }
  return false;
}

function serializeEvent<T extends { _count?: { posts: number } }>(event: T) {
  const { _count, ...rest } = event;
  return { ...rest, feedPostCount: _count?.posts ?? 0 };
}

const EVENT_KIND_IDS = new Set([
  'WEDDING',
  'BIRTHDAY',
  'BAPTISM',
  'CORPORATE',
  'CONFERENCE',
  'GALA',
  'OTHER',
]);

function parseOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function parseOptionalInt(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseEventKind(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const kind = String(value).trim().toUpperCase();
  return EVENT_KIND_IDS.has(kind) ? kind : null;
}

function eventDossierData(body: Record<string, unknown>, forCreate: boolean) {
  const eventKind = parseEventKind(body.eventKind);
  const clientName = parseOptionalString(body.clientName);
  const endsAt = parseOptionalDate(body.endsAt);
  const estimatedGuests = parseOptionalInt(body.estimatedGuests);
  const dayOfContactName = parseOptionalString(body.dayOfContactName);
  const dayOfContactPhone = parseOptionalString(body.dayOfContactPhone);

  if (forCreate) {
    return {
      eventKind: eventKind ?? null,
      clientName: clientName ?? null,
      endsAt: endsAt ?? null,
      estimatedGuests: estimatedGuests ?? null,
      dayOfContactName: dayOfContactName ?? null,
      dayOfContactPhone: dayOfContactPhone ?? null,
    };
  }

  return {
    ...(eventKind !== undefined ? { eventKind } : {}),
    ...(clientName !== undefined ? { clientName } : {}),
    ...(endsAt !== undefined ? { endsAt } : {}),
    ...(estimatedGuests !== undefined ? { estimatedGuests } : {}),
    ...(dayOfContactName !== undefined ? { dayOfContactName } : {}),
    ...(dayOfContactPhone !== undefined ? { dayOfContactPhone } : {}),
  };
}

async function eventVisibilityData(
  title: string,
  body: Record<string, unknown>,
  existing?: { id: string; slug: string | null; publishedAt: Date | null; ticketsSold: number; ticketsTotal: number | null } | null,
) {
  const isPublic = body.isPublic === true || body.isPublic === 'true';
  let slug = existing?.slug || null;
  if (isPublic && !slug) {
    slug = await uniqueSlug(title || 'evenement', async (s) => {
      const found = await prisma.event.findFirst({
        where: { slug: s, ...(existing?.id ? { NOT: { id: existing.id } } : {}) },
      });
      return Boolean(found);
    });
  }
  const ticketingEnabled = isPublic && (body.ticketingEnabled === true || body.ticketingEnabled === 'true');
  const ticketPricingMode =
    isPublic && ticketingEnabled && body.ticketPricingMode === 'by_zone' ? 'by_zone' : 'global';
  const ticketPriceFc = ticketingEnabled
    ? Math.max(0, Math.round(Number(body.ticketPriceFc) || 0))
    : 0;
  const rawTotal = body.ticketsTotal;
  const ticketsTotal =
    rawTotal === '' || rawTotal == null || rawTotal === undefined
      ? null
      : Math.max(existing?.ticketsSold || 0, Math.round(Number(rawTotal) || 0)) || null;

  return {
    isPublic,
    slug,
    publishedAt: isPublic ? existing?.publishedAt || new Date() : null,
    ticketingEnabled: isPublic ? ticketingEnabled : false,
    ticketPriceFc: isPublic ? ticketPriceFc : 0,
    ticketPricingMode: isPublic && ticketingEnabled ? ticketPricingMode : 'global',
    ticketsTotal: isPublic ? ticketsTotal : existing?.ticketsTotal ?? null,
    seatSelectionEnabled:
      isPublic && (body.seatSelectionEnabled === true || body.seatSelectionEnabled === 'true'),
  };
}

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
        _count: { select: { posts: true } },
      },
      orderBy: { date: 'asc' },
    });

    const access = await resolveOrgAccess(userId, tenantId);
    return res.json({ events: events.map(serializeEvent), access });
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

    const { title, description, date, location, reminderFrequency, latitude, longitude, roomId, importRoomLayout, guestGuidelines, rsvpForm, themeId } = req.body;

    if (!title || !date || !location) {
      return res.status(400).json({ error: 'Les champs title, date et location sont requis' });
    }

    if (rejectPaidTicketingIfDisabled(req.body, res)) return;

    const visibility = await eventVisibilityData(title, req.body);

    // Check Plan / Quota before creating event (will be integrated in Phase 4, but let's add a placeholder or simple check)
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { _count: { select: { events: true } } },
    });

    if (tenant) {
      const limits = getPlanLimitsForTenant(tenant.plan, tenant.accountKind);
      if (limits.maxEvents <= 0 || tenant._count.events >= limits.maxEvents) {
        return res.status(403).json({
          error:
            limits.maxEvents <= 0
              ? `La création d’événements n’est pas incluse dans ${limits.name}. Choisissez un forfait organisateur.`
              : `Quota d'événements atteint pour le plan ${tenant.plan} (Max ${limits.maxEvents === 9999 ? 'illimité' : limits.maxEvents}). Veuillez passer à un forfait supérieur.`,
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
    if (req.body.pricingZones !== undefined) {
      tablePlanData = mergePricingZonesIntoTablePlan(
        tablePlanData ?? { tables: [] },
        Array.isArray(req.body.pricingZones) ? req.body.pricingZones : [],
      ) as object;
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
        rsvpForm: rsvpForm !== undefined ? toPrismaJson(rsvpForm) : undefined,
        themeId: themeId || null,
        photos: toPrismaJson(parsePhotoUrls(req.body.photos)),
        ...(req.body.eventProgram !== undefined
          ? { eventProgram: toPrismaJson(req.body.eventProgram) }
          : {}),
        ...visibility,
        ...eventDossierData(req.body, true),
      },
      include: {
        room: { select: { id: true, name: true, roomType: true, layoutBlueprint: true } },
        _count: { select: { posts: true } },
      },
    });

    if (tenant?.accountKind === 'VENDOR') {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { accountKind: 'BOTH' },
      });
    }

    return res.status(201).json(serializeEvent(event));
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
      include: {
        room: { select: { id: true, name: true, roomType: true, layoutBlueprint: true } },
        _count: { select: { posts: true } },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    return res.json(serializeEvent(event));
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
    const { title, description, date, location, reminderFrequency, latitude, longitude, tablePlan, roomId, guestGuidelines, rsvpForm, eventPrep, themeId } = req.body;

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

    if (rejectPaidTicketingIfDisabled(req.body, res)) return;

    const visibility =
      req.body.isPublic !== undefined
        ? await eventVisibilityData(title || existingEvent.title, req.body, existingEvent)
        : {};

    let mergedTablePlan = tablePlan !== undefined ? tablePlan : undefined;
    if (req.body.pricingZones !== undefined) {
      const base = tablePlan !== undefined ? tablePlan : existingEvent.tablePlan;
      mergedTablePlan = mergePricingZonesIntoTablePlan(
        base,
        Array.isArray(req.body.pricingZones) ? req.body.pricingZones : [],
      );
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
        tablePlan: mergedTablePlan !== undefined ? mergedTablePlan : existingEvent.tablePlan,
        roomId: roomId !== undefined ? roomId : existingEvent.roomId,
        guestGuidelines: guestGuidelines !== undefined ? toPrismaJson(guestGuidelines) : existingEvent.guestGuidelines ?? undefined,
        rsvpForm: rsvpForm !== undefined ? toPrismaJson(rsvpForm) : existingEvent.rsvpForm ?? undefined,
        eventPrep: eventPrep !== undefined ? toPrismaJson(eventPrep) : existingEvent.eventPrep ?? undefined,
        themeId: themeId !== undefined ? (themeId || null) : existingEvent.themeId,
        ...(req.body.photos !== undefined ? { photos: toPrismaJson(parsePhotoUrls(req.body.photos)) } : {}),
        ...(req.body.eventProgram !== undefined
          ? { eventProgram: toPrismaJson(req.body.eventProgram) }
          : {}),
        ...visibility,
        ...eventDossierData(req.body, false),
      },
      include: {
        room: { select: { id: true, name: true, roomType: true, layoutBlueprint: true } },
        _count: { select: { posts: true } },
      },
    });

    let assignmentNotifications = null;
    let eventForResponse = updatedEvent;
    if (mergedTablePlan !== undefined) {
      assignmentNotifications = await notifyTableAssignmentChanges({
        eventId: id,
        tenantId,
        oldPlan: existingEvent.tablePlan,
        newPlan: mergedTablePlan,
      });

      if ((assignmentNotifications?.notified ?? 0) > 0) {
        const planWithMeta = {
          ...(typeof mergedTablePlan === 'object' && mergedTablePlan !== null ? mergedTablePlan : {}),
          placementNotifiedAt: new Date().toISOString(),
        };
        eventForResponse = await prisma.event.update({
          where: { id },
          data: { tablePlan: planWithMeta },
          include: {
            room: { select: { id: true, name: true, roomType: true, layoutBlueprint: true } },
            _count: { select: { posts: true } },
          },
        });
      }
    }

    return res.json({
      ...serializeEvent(eventForResponse),
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
    const { replaceExisting, preserveAssignments } = req.body;

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

    const existingPlan = event.tablePlan as { tables?: unknown[] } | null;
    const hasTables = Boolean(existingPlan?.tables && existingPlan.tables.length > 0);

    if (hasTables && !replaceExisting && preserveAssignments !== true) {
      return res.status(409).json({
        error: 'Un plan de table existe déjà. Utilisez replaceExisting ou preserveAssignments.',
        hasExistingPlan: true,
      });
    }

    const blueprint = event.room.layoutBlueprint as any;
    const keepSeats = preserveAssignments === true || (replaceExisting && preserveAssignments !== false);
    const tablePlan =
      keepSeats && hasTables
        ? mergeBlueprintIntoTablePlan(existingPlan as any, blueprint)
        : blueprintToTablePlan(blueprint);

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

export async function listEventTicketOrders(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const eventId = req.params.eventId as string;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Tenant non identifié' });
    if (!(await canAccessEvent(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Accès refusé à cet événement.' });
    }
    const orders = await prisma.ticketOrder.findMany({
      where: { eventId, event: { tenantId } },
      include: { guests: { select: { id: true, email: true, firstName: true, lastName: true, rsvp: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return res.json({ orders });
  } catch (error: any) {
    console.error('listEventTicketOrders', error);
    return res.status(500).json({ error: 'Impossible de charger les commandes.' });
  }
}
