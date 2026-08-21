"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliverGuestPlacementIfEligible = deliverGuestPlacementIfEligible;
const db_1 = require("../db");
const commercialService_1 = require("../services/commercialService");
const guestSeatNotificationService_1 = require("../services/guestSeatNotificationService");
const tablePlanAssignment_1 = require("../utils/tablePlanAssignment");
const planFeaturesService_1 = require("../services/planFeaturesService");
const guestGuidelines_1 = require("../utils/guestGuidelines");
const guestPlacementAccess_1 = require("../utils/guestPlacementAccess");
/** Envoie la carte + PDF / plan / GPS dès RSVP accepté (ou check-in si pas encore envoyé). */
async function deliverGuestPlacementIfEligible(params) {
    const { guestId, eventId, tenantId } = params;
    const snapshot = await (0, planFeaturesService_1.getTenantPlanSnapshot)(tenantId);
    if (!snapshot?.features.seatNotifications) {
        return { delivered: false, skippedReason: 'forfait' };
    }
    const guest = await db_1.prisma.guest.findFirst({
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
            rsvp: true,
        },
    });
    if (!guest) {
        return { delivered: false, skippedReason: 'guest_not_found' };
    }
    if (!(0, guestPlacementAccess_1.canGuestAccessPlacement)(guest)) {
        return { delivered: false, skippedReason: 'not_validated' };
    }
    if ((0, guestPlacementAccess_1.getPlacementNotifiedAt)(guest.preferences)) {
        return { delivered: false, skippedReason: 'already_sent' };
    }
    const event = await db_1.prisma.event.findFirst({
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
    const assigned = (0, commercialService_1.findGuestSeatInTablePlan)(event.tablePlan, guestId);
    if (!assigned) {
        return { delivered: false, skippedReason: 'no_seat' };
    }
    const invitation = await db_1.prisma.invitation.findFirst({
        where: { eventId },
        orderBy: { updatedAt: 'desc' },
        select: { channel: true, subject: true, body: true },
    });
    const mateIds = (0, tablePlanAssignment_1.getTableMateGuestIds)(event.tablePlan, guestId);
    const tableMates = mateIds.length
        ? await db_1.prisma.guest.findMany({
            where: { id: { in: mateIds }, eventId },
            select: { firstName: true, lastName: true },
            orderBy: { lastName: 'asc' },
        })
        : [];
    const dressCode = (0, guestGuidelines_1.formatDressCodeText)((0, guestGuidelines_1.normalizeGuestGuidelines)(event.guestGuidelines)) || null;
    const notification = await (0, guestSeatNotificationService_1.notifyGuestTableAssignment)({
        guest,
        eventId,
        event,
        assignedSeat: assigned,
        tableMates,
        invitation,
        dressCode,
    });
    if (notification.sent) {
        await db_1.prisma.guest.update({
            where: { id: guestId },
            data: {
                preferences: (0, guestPlacementAccess_1.mergePlacementNotifiedPreferences)(guest.preferences, new Date().toISOString()),
            },
        });
        return { delivered: true, notification };
    }
    return { delivered: false, skippedReason: 'delivery_failed', notification };
}
