"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyTableAssignmentChanges = notifyTableAssignmentChanges;
const db_1 = require("../db");
const planFeaturesService_1 = require("./planFeaturesService");
const guestSeatNotificationService_1 = require("./guestSeatNotificationService");
const guestPlacementDeliveryService_1 = require("./guestPlacementDeliveryService");
const tablePlanAssignment_1 = require("../utils/tablePlanAssignment");
const guestGuidelines_1 = require("../utils/guestGuidelines");
const guestPlacementAccess_1 = require("../utils/guestPlacementAccess");
function extractDressCode(guestGuidelines) {
    const g = (0, guestGuidelines_1.normalizeGuestGuidelines)(guestGuidelines);
    const text = (0, guestGuidelines_1.formatDressCodeText)(g);
    return text || null;
}
/** Notifie les invités nouvellement assignés ou déplacés sur le plan de table. */
async function notifyTableAssignmentChanges(params) {
    const { eventId, tenantId, oldPlan, newPlan } = params;
    const snapshot = await (0, planFeaturesService_1.getTenantPlanSnapshot)(tenantId);
    if (!snapshot) {
        return { notified: 0, skipped: 0, results: [], skippedReason: 'forfait' };
    }
    const guestIdsToNotify = (0, tablePlanAssignment_1.findAssignmentChanges)(oldPlan, newPlan);
    if (guestIdsToNotify.length === 0) {
        return { notified: 0, skipped: 0, results: [] };
    }
    const event = await db_1.prisma.event.findFirst({
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
    if (!event)
        return null;
    const invitation = await db_1.prisma.invitation.findFirst({
        where: { eventId },
        orderBy: { updatedAt: 'desc' },
        select: { channel: true, subject: true, body: true },
    });
    const assignments = (0, tablePlanAssignment_1.extractGuestAssignments)(newPlan);
    const guests = await db_1.prisma.guest.findMany({
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
    const results = [];
    let notified = 0;
    let skipped = 0;
    for (const guestId of guestIdsToNotify) {
        const guest = guestById.get(guestId);
        const assigned = assignments.get(guestId);
        if (!guest || !assigned) {
            skipped += 1;
            continue;
        }
        const mateIds = (0, tablePlanAssignment_1.getTableMateGuestIds)(newPlan, guestId);
        const mateGuests = mateIds.length
            ? await db_1.prisma.guest.findMany({
                where: { id: { in: mateIds }, eventId },
                select: { firstName: true, lastName: true },
                orderBy: { lastName: 'asc' },
            })
            : [];
        // Invité déjà confirmé : livraison complète PDF / GPS (si forfait)
        if (guest.rsvp === 'ACCEPTED' && hasSeatNotifications) {
            const alreadySent = (0, guestPlacementAccess_1.getPlacementNotifiedAt)(guest.preferences);
            if (!alreadySent) {
                const placement = await (0, guestPlacementDeliveryService_1.deliverGuestPlacementIfEligible)({
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
                }
                else {
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
            const notification = await (0, guestSeatNotificationService_1.notifyGuestTableAssignment)({
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
            if (notification.sent)
                notified += 1;
            else
                skipped += 1;
            results.push({
                guestId: guest.id,
                guestName: `${guest.firstName} ${guest.lastName}`.trim(),
                sent: notification.sent,
                channels: notification.channels,
                errors: notification.errors,
            });
            continue;
        }
        const notification = await (0, guestSeatNotificationService_1.notifyGuestTableAssignment)({
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
        if (notification.sent)
            notified += 1;
        else
            skipped += 1;
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
