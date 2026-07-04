import { prisma } from '../db';
import { findGuestSeatInTablePlan } from '../services/commercialService';
import { notifyGuestTableAssignment } from '../services/guestSeatNotificationService';
import { getTableMateGuestIds } from '../utils/tablePlanAssignment';
import { getTenantPlanSnapshot } from '../services/planFeaturesService';
import { normalizeGuestGuidelines, formatDressCodeText } from '../utils/guestGuidelines';
import {
  canGuestAccessPlacement,
  getPlacementNotifiedAt,
  mergePlacementNotifiedPreferences,
} from '../utils/guestPlacementAccess';

export type PlacementDeliveryResult = {
  delivered: boolean;
  skippedReason?: string;
  notification?: Awaited<ReturnType<typeof notifyGuestTableAssignment>>;
};

/** Envoie la carte + PDF placement après confirmation de présence ou validation protocole. */
export async function deliverGuestPlacementIfEligible(params: {
  guestId: string;
  eventId: string;
  tenantId: string;
}): Promise<PlacementDeliveryResult> {
  const { guestId, eventId, tenantId } = params;

  const snapshot = await getTenantPlanSnapshot(tenantId);
  if (!snapshot?.features.seatNotifications) {
    return { delivered: false, skippedReason: 'forfait' };
  }

  const guest = await prisma.guest.findFirst({
    where: { id: guestId, eventId, event: { tenantId } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      preferences: true,
      checkedInAt: true,
      seatVerified: true,
    },
  });

  if (!guest) {
    return { delivered: false, skippedReason: 'guest_not_found' };
  }

  if (!canGuestAccessPlacement(guest)) {
    return { delivered: false, skippedReason: 'not_validated' };
  }

  if (getPlacementNotifiedAt(guest.preferences as Record<string, unknown> | null)) {
    return { delivered: false, skippedReason: 'already_sent' };
  }

  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    select: {
      id: true,
      title: true,
      description: true,
      date: true,
      location: true,
      latitude: true,
      longitude: true,
      guestGuidelines: true,
      tablePlan: true,
    },
  });

  if (!event) {
    return { delivered: false, skippedReason: 'event_not_found' };
  }

  const assigned = findGuestSeatInTablePlan(event.tablePlan, guestId);
  if (!assigned) {
    return { delivered: false, skippedReason: 'no_seat' };
  }

  const invitation = await prisma.invitation.findFirst({
    where: { eventId },
    orderBy: { updatedAt: 'desc' },
    select: { channel: true, subject: true, body: true },
  });

  const mateIds = getTableMateGuestIds(event.tablePlan, guestId);
  const tableMates = mateIds.length
    ? await prisma.guest.findMany({
        where: { id: { in: mateIds }, eventId },
        select: { firstName: true, lastName: true },
        orderBy: { lastName: 'asc' },
      })
    : [];

  const dressCode =
    formatDressCodeText(normalizeGuestGuidelines(event.guestGuidelines)) || null;

  const notification = await notifyGuestTableAssignment({
    guest,
    eventId,
    event,
    assignedSeat: assigned,
    tableMates,
    invitation,
    dressCode,
  });

  if (notification.sent) {
    await prisma.guest.update({
      where: { id: guestId },
      data: {
        preferences: mergePlacementNotifiedPreferences(
          guest.preferences as Record<string, unknown> | null,
          new Date().toISOString(),
        ) as object,
      },
    });
    return { delivered: true, notification };
  }

  return { delivered: false, skippedReason: 'delivery_failed', notification };
}
