import { prisma } from '../db';
import { getTenantPlanSnapshot } from './planFeaturesService';
import { notifyGuestTableAssignment } from './guestSeatNotificationService';
import { deliverGuestPlacementIfEligible } from './guestPlacementDeliveryService';
import {
  extractGuestAssignments,
  findAssignmentChanges,
  getTableMateGuestIds,
} from '../utils/tablePlanAssignment';
import { normalizeGuestGuidelines, formatDressCodeText } from '../utils/guestGuidelines';
import { getPlacementNotifiedAt } from '../utils/guestPlacementAccess';

export type TableAssignmentNotificationSummary = {
  notified: number;
  skipped: number;
  skippedReason?: 'forfait';
  results: Array<{
    guestId: string;
    guestName: string;
    sent: boolean;
    channels: string[];
    errors: string[];
  }>;
};

function extractDressCode(guestGuidelines: unknown): string | null {
  const g = normalizeGuestGuidelines(guestGuidelines);
  const text = formatDressCodeText(g);
  return text || null;
}

/** Notifie les invités nouvellement assignés ou déplacés sur le plan de table. */
export async function notifyTableAssignmentChanges(params: {
  eventId: string;
  tenantId: string;
  oldPlan: unknown;
  newPlan: unknown;
}): Promise<TableAssignmentNotificationSummary | null> {
  const { eventId, tenantId, oldPlan, newPlan } = params;

  const snapshot = await getTenantPlanSnapshot(tenantId);
  if (!snapshot) {
    return { notified: 0, skipped: 0, results: [], skippedReason: 'forfait' };
  }

  const guestIdsToNotify = findAssignmentChanges(oldPlan, newPlan);
  if (guestIdsToNotify.length === 0) {
    return { notified: 0, skipped: 0, results: [] };
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    select: {
      id: true,
      title: true,
      description: true,
      date: true,
      location: true,
      guestGuidelines: true,
      tablePlan: true,
    },
  });

  if (!event) return null;

  const invitation = await prisma.invitation.findFirst({
    where: { eventId },
    orderBy: { updatedAt: 'desc' },
    select: { channel: true, subject: true, body: true },
  });

  const assignments = extractGuestAssignments(newPlan);
  const guests = await prisma.guest.findMany({
    where: { id: { in: guestIdsToNotify }, eventId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      preferences: true,
      rsvp: true,
    },
  });

  const guestById = new Map(guests.map((g) => [g.id, g]));
  const dressCode = extractDressCode(event.guestGuidelines);
  const hasSeatNotifications = Boolean(snapshot.features.seatNotifications);

  const results: TableAssignmentNotificationSummary['results'] = [];
  let notified = 0;
  let skipped = 0;

  for (const guestId of guestIdsToNotify) {
    const guest = guestById.get(guestId);
    const assigned = assignments.get(guestId);

    if (!guest || !assigned) {
      skipped += 1;
      continue;
    }

    const mateIds = getTableMateGuestIds(newPlan, guestId);
    const mateGuests = mateIds.length
      ? await prisma.guest.findMany({
          where: { id: { in: mateIds }, eventId },
          select: { firstName: true, lastName: true },
          orderBy: { lastName: 'asc' },
        })
      : [];

    // Invité déjà confirmé : livraison complète PDF / GPS (si forfait)
    if (guest.rsvp === 'ACCEPTED' && hasSeatNotifications) {
      const alreadySent = getPlacementNotifiedAt(guest.preferences as Record<string, unknown> | null);

      if (!alreadySent) {
        const placement = await deliverGuestPlacementIfEligible({
          guestId: guest.id,
          eventId,
          tenantId,
        });
        if (placement.delivered) {
          notified += 1;
          results.push({
            guestId: guest.id,
            guestName: `${guest.firstName} ${guest.lastName}`.trim(),
            sent: true,
            channels: placement.notification?.channels || [],
            errors: placement.notification?.errors || [],
          });
        } else {
          skipped += 1;
          results.push({
            guestId: guest.id,
            guestName: `${guest.firstName} ${guest.lastName}`.trim(),
            sent: false,
            channels: [],
            errors: [placement.skippedReason || 'skipped'],
          });
        }
        continue;
      }

      // Réassignation après une première livraison : renvoyer le full
      const notification = await notifyGuestTableAssignment({
        guest,
        eventId,
        event: {
          title: event.title,
          description: event.description,
          date: event.date,
          location: event.location,
          guestGuidelines: event.guestGuidelines,
        },
        assignedSeat: assigned,
        tableMates: mateGuests,
        invitation,
        dressCode,
        delivery: 'full',
      });
      if (notification.sent) notified += 1;
      else skipped += 1;
      results.push({
        guestId: guest.id,
        guestName: `${guest.firstName} ${guest.lastName}`.trim(),
        sent: notification.sent,
        channels: notification.channels,
        errors: notification.errors,
      });
      continue;
    }

    const notification = await notifyGuestTableAssignment({
      guest,
      eventId,
      event: {
        title: event.title,
        description: event.description,
        date: event.date,
        location: event.location,
        guestGuidelines: event.guestGuidelines,
      },
      assignedSeat: assigned,
      tableMates: mateGuests,
      invitation,
      dressCode,
      delivery: 'announcement',
    });

    if (notification.sent) notified += 1;
    else skipped += 1;

    results.push({
      guestId: guest.id,
      guestName: `${guest.firstName} ${guest.lastName}`.trim(),
      sent: notification.sent,
      channels: notification.channels,
      errors: notification.errors,
    });
  }

  return { notified, skipped, results };
}
