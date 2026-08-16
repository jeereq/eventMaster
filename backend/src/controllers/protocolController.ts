import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import {
  canProtocolGuests,
  canManageGuests,
} from '../services/permissionsService';
import {
  extractGuestIdFromScanPayload,
  findGuestSeatInTablePlan,
} from '../services/commercialService';
import { deliverGuestPlacementIfEligible } from '../services/guestPlacementDeliveryService';
import { assertPlanFeature, PlanFeatureError } from '../services/planFeaturesService';

async function ensureProtocolPlan(tenantId: string) {
  await assertPlanFeature(tenantId, 'protocolQr');
}

function handlePlanError(res: Response, error: unknown) {
  if (error instanceof PlanFeatureError) {
    return res.status(403).json({ error: error.message });
  }
  return null;
}

async function loadGuestForEvent(eventId: string, tenantId: string, guestId: string) {
  const guest = await prisma.guest.findFirst({
    where: { id: guestId, eventId, event: { tenantId } },
    include: {
      protocolNotes: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  return guest;
}

function buildGuestProtocolResponse(guest: NonNullable<Awaited<ReturnType<typeof loadGuestForEvent>>>, tablePlan: unknown) {
  const assignedSeat = findGuestSeatInTablePlan(tablePlan, guest.id);
  return {
    ...guest,
    assignedSeat,
  };
}

export async function scanGuest(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const eventId = req.params.eventId as string;
    const { payload, guestId: rawGuestId } = req.body;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    try {
      await ensureProtocolPlan(tenantId);
    } catch (err) {
      const handled = handlePlanError(res, err);
      if (handled) return handled;
      throw err;
    }

    if (!(await canProtocolGuests(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Accès protocole refusé pour cet événement.' });
    }

    const guestId = rawGuestId || extractGuestIdFromScanPayload(payload || '');
    if (!guestId) {
      return res.status(400).json({ error: 'QR code ou identifiant invité invalide.' });
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: { id: true, title: true, tablePlan: true },
    });
    if (!event) {
      return res.status(404).json({ error: 'Événement introuvable.' });
    }

    const guest = await loadGuestForEvent(eventId, tenantId, guestId);
    if (!guest) {
      return res.status(404).json({ error: 'Invité introuvable pour cet événement.' });
    }

    return res.json({
      event: { id: event.id, title: event.title },
      guest: buildGuestProtocolResponse(guest, event.tablePlan),
    });
  } catch (error) {
    console.error('scanGuest:', error);
    return res.status(500).json({ error: 'Erreur lors du scan invité.' });
  }
}

export async function checkInGuest(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const eventId = req.params.eventId as string;
    const guestId = req.params.guestId as string;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    try {
      await ensureProtocolPlan(tenantId);
    } catch (err) {
      const handled = handlePlanError(res, err);
      if (handled) return handled;
      throw err;
    }

    if (!(await canProtocolGuests(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Accès protocole refusé.' });
    }

    const guest = await loadGuestForEvent(eventId, tenantId, guestId);
    if (!guest) {
      return res.status(404).json({ error: 'Invité introuvable.' });
    }

    if (guest.rsvp !== 'ACCEPTED') {
      return res.status(400).json({
        error: 'Cet invité n\'a pas confirmé sa présence (RSVP non accepté).',
        guest: { id: guest.id, rsvp: guest.rsvp },
      });
    }

    const updated = await prisma.guest.update({
      where: { id: guestId },
      data: {
        checkedInAt: new Date(),
        checkedInByUserId: userId,
      },
    });

    const placementDelivery = await deliverGuestPlacementIfEligible({
      guestId,
      eventId,
      tenantId,
    });

    let placementHint = '';
    if (placementDelivery.delivered && placementDelivery.notification?.channels.length) {
      placementHint = ` Placement envoyé par ${placementDelivery.notification.channels.join(', ')}.`;
    } else if (placementDelivery.skippedReason === 'forfait') {
      placementHint =
        ' Le PDF et le GPS de placement ne sont pas inclus dans votre forfait (Premium ou supérieur requis).';
    } else if (placementDelivery.skippedReason === 'delivery_failed') {
      placementHint = ' Notification de placement non envoyée (coordonnées manquantes ou erreur d\'envoi).';
    }

    return res.json({
      message: `${guest.firstName} ${guest.lastName} authentifié avec succès.${placementHint}`,
      guest: updated,
      placementDelivery,
    });
  } catch (error) {
    console.error('checkInGuest:', error);
    return res.status(500).json({ error: 'Erreur lors de la confirmation de présence.' });
  }
}

export async function verifyGuestSeat(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const eventId = req.params.eventId as string;
    const guestId = req.params.guestId as string;
    const { tableId, seatIndex } = req.body;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    try {
      await ensureProtocolPlan(tenantId);
    } catch (err) {
      const handled = handlePlanError(res, err);
      if (handled) return handled;
      throw err;
    }

    if (!(await canProtocolGuests(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Accès protocole refusé.' });
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: { title: true, date: true, location: true, tablePlan: true },
    });
    if (!event) {
      return res.status(404).json({ error: 'Événement introuvable.' });
    }

    const guest = await loadGuestForEvent(eventId, tenantId, guestId);
    if (!guest) {
      return res.status(404).json({ error: 'Invité introuvable.' });
    }

    const assigned = findGuestSeatInTablePlan(event.tablePlan, guestId);
    let seatMatch = true;
    let mismatchReason: string | null = null;

    if (!assigned) {
      seatMatch = false;
      mismatchReason = 'Aucun siège assigné à cet invité dans le plan de table.';
    } else if (tableId !== undefined && assigned.tableId !== tableId) {
      seatMatch = false;
      mismatchReason = `Siège attendu : ${assigned.tableName}, pas la table scannée.`;
    } else if (seatIndex !== undefined && assigned.seatIndex !== Number(seatIndex)) {
      seatMatch = false;
      mismatchReason = `Siège attendu n°${assigned.seatIndex + 1}, pas le n°${Number(seatIndex) + 1}.`;
    }

    const updated = await prisma.guest.update({
      where: { id: guestId },
      data: {
        seatVerified: seatMatch,
        seatVerifiedAt: new Date(),
        seatVerifiedByUserId: userId,
      },
    });

    let placementDelivery: Awaited<ReturnType<typeof deliverGuestPlacementIfEligible>> | null = null;

    if (seatMatch && assigned) {
      placementDelivery = await deliverGuestPlacementIfEligible({
        guestId,
        eventId,
        tenantId,
      });

      if (placementDelivery.delivered) {
        console.log(
          '[Protocol] Placement envoyé:',
          placementDelivery.notification?.channels.join(', '),
        );
      } else if (placementDelivery.skippedReason === 'delivery_failed') {
        console.warn('[Protocol] Notification placement non envoyée:', placementDelivery.notification?.errors);
      }
    }

    const baseMessage = seatMatch
      ? 'Siège confirmé : l\'invité est bien à sa place.'
      : mismatchReason || 'Siège non conforme.';

    const notificationHint =
      seatMatch && placementDelivery?.delivered && placementDelivery.notification?.channels.length
        ? ` Notification envoyée (${placementDelivery.notification.channels.join(', ')}).`
        : seatMatch && placementDelivery?.skippedReason === 'forfait'
          ? ' Le PDF et le GPS de placement ne sont pas inclus dans votre forfait (Premium ou supérieur requis).'
          : seatMatch && placementDelivery?.skippedReason === 'delivery_failed'
            ? ' Notification non envoyée (coordonnées invité manquantes ou erreur d\'envoi).'
            : '';

    return res.json({
      message: baseMessage + notificationHint,
      seatMatch,
      assignedSeat: assigned,
      guest: updated,
      notification: placementDelivery?.notification
        ? {
            sent: placementDelivery.notification.sent,
            channels: placementDelivery.notification.channels,
            errors: placementDelivery.notification.errors,
          }
        : undefined,
      placementDelivery,
    });
  } catch (error) {
    console.error('verifyGuestSeat:', error);
    return res.status(500).json({ error: 'Erreur lors de la vérification du siège.' });
  }
}

export async function addGuestProtocolNote(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const eventId = req.params.eventId as string;
    const guestId = req.params.guestId as string;
    const { content } = req.body;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    try {
      await ensureProtocolPlan(tenantId);
    } catch (err) {
      const handled = handlePlanError(res, err);
      if (handled) return handled;
      throw err;
    }

    if (!(await canProtocolGuests(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Accès protocole refusé.' });
    }

    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: 'Le commentaire est requis.' });
    }

    const guest = await loadGuestForEvent(eventId, tenantId, guestId);
    if (!guest) {
      return res.status(404).json({ error: 'Invité introuvable.' });
    }

    const note = await prisma.guestProtocolNote.create({
      data: {
        guestId,
        userId,
        content: String(content).trim(),
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return res.status(201).json({ message: 'Commentaire enregistré.', note });
  } catch (error) {
    console.error('addGuestProtocolNote:', error);
    return res.status(500).json({ error: 'Erreur lors de l\'ajout du commentaire.' });
  }
}

export async function getGuestProtocolNotes(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const eventId = req.params.eventId as string;
    const guestId = req.params.guestId as string;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    const canRead =
      (await canProtocolGuests(userId, tenantId, eventId)) ||
      (await canManageGuests(userId, tenantId, eventId));

    if (!canRead) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    const notes = await prisma.guestProtocolNote.findMany({
      where: { guestId, guest: { eventId, event: { tenantId } } },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(notes);
  } catch (error) {
    console.error('getGuestProtocolNotes:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des commentaires.' });
  }
}

export async function listProtocolGuests(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const eventId = req.params.eventId as string;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    try {
      await ensureProtocolPlan(tenantId);
    } catch (err) {
      const handled = handlePlanError(res, err);
      if (handled) return handled;
      throw err;
    }

    if (!(await canProtocolGuests(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Accès protocole refusé.' });
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: { tablePlan: true },
    });
    if (!event) {
      return res.status(404).json({ error: 'Événement introuvable.' });
    }

    const guests = await prisma.guest.findMany({
      where: { eventId },
      include: {
        protocolNotes: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { lastName: 'asc' },
    });

    return res.json(
      guests.map((g) => ({
        ...g,
        assignedSeat: findGuestSeatInTablePlan(event.tablePlan, g.id),
      })),
    );
  } catch (error) {
    console.error('listProtocolGuests:', error);
    return res.status(500).json({ error: 'Erreur lors du chargement des invités.' });
  }
}
