import { prisma } from '../db';
import { getTenantPlanSnapshot } from './planFeaturesService';
import { notifyGuestTableAssignment } from './guestSeatNotificationService';
import {
  extractGuestAssignments,
  findAssignmentChanges,
  getTableMateGuestIds,
} from '../utils/tablePlanAssignment';
import { normalizeGuestGuidelines, formatDressCodeText } from '../utils/guestGuidelines';

export type TableAssignmentNotificationSummary = {
  notified: number;
  skipped: number;
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
  if (!snapshot?.features.seatNotifications) {
    return null;
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
    },
  });

  const guestById = new Map(guests.map((g) => [g.id, g]));
  const dressCode = extractDressCode(event.guestGuidelines);

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

    const notification = await notifyGuestTableAssignment({
      guest,
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
