"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGuestRsvpDetails = getGuestRsvpDetails;
exports.getGuestAllInvitations = getGuestAllInvitations;
exports.submitRsvp = submitRsvp;
exports.downloadSeatingInvitationPdf = downloadSeatingInvitationPdf;
exports.getGuestQrPng = getGuestQrPng;
exports.submitGuestDonation = submitGuestDonation;
const rsvpPreferences_1 = require("../utils/rsvpPreferences");
const db_1 = require("../db");
const notificationService_1 = require("../services/notificationService");
const messageTemplateService_1 = require("../services/messageTemplateService");
const legalService_1 = require("../services/legalService");
const guestIdentity_1 = require("../utils/guestIdentity");
const commercialService_1 = require("../services/commercialService");
const seatingInvitationStorageService_1 = require("../services/seatingInvitationStorageService");
const tablePlanAssignment_1 = require("../utils/tablePlanAssignment");
const guestGuidelines_1 = require("../utils/guestGuidelines");
const guestPlacementAccess_1 = require("../utils/guestPlacementAccess");
const guestPlacementDeliveryService_1 = require("../services/guestPlacementDeliveryService");
const qrCode_1 = require("../utils/qrCode");
const brandedMessaging_1 = require("../utils/brandedMessaging");
const brandingUtils_1 = require("../utils/brandingUtils");
const guestMessageCopy_1 = require("../utils/guestMessageCopy");
const eventPlace_1 = require("../utils/eventPlace");
const mandatoryRsvpFields_1 = require("../utils/mandatoryRsvpFields");
const publicVenue_1 = require("../utils/publicVenue");
const phone_1 = require("../utils/phone");
const platformNotificationTypes_1 = require("../config/platformNotificationTypes");
const platformNotificationService_1 = require("../services/platformNotificationService");
const platformSettingsService_1 = require("../services/platformSettingsService");
const donationsAccess_1 = require("../services/donationsAccess");
const flexPayCardService_1 = require("../services/flexPayCardService");
const flexPayChargeCurrency_1 = require("../services/flexPayChargeCurrency");
const prismaJson_1 = require("../utils/prismaJson");
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').trim().replace(/\/$/, '');
function isEventDatePassed(eventDate) {
    return new Date(eventDate).getTime() < Date.now();
}
// Helper function to extract guest phone number
function getGuestPhone(guest) {
    return (0, guestIdentity_1.extractGuestPhone)(guest);
}
function getUserPhone(user) {
    if (user.phone?.trim())
        return user.phone.trim();
    const emailStr = user.email?.trim() || '';
    const isPhone = /^\+?[0-9\s\-()]{7,20}$/.test(emailStr);
    return isPhone ? emailStr : null;
}
function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
function formatPreferencesDetails(preferences) {
    if (!preferences || typeof preferences !== 'object')
        return '';
    const prefs = preferences;
    const lines = [];
    if (prefs.allergies)
        lines.push(`- Allergies : ${prefs.allergies}`);
    if (prefs.specialMeal)
        lines.push(`- Repas spécial : ${prefs.specialMeal}`);
    if (prefs.notes)
        lines.push(`- Notes : ${prefs.notes}`);
    if (prefs.customFields && typeof prefs.customFields === 'object') {
        for (const [key, value] of Object.entries(prefs.customFields)) {
            if (value !== undefined && value !== null && String(value).trim()) {
                lines.push(`- ${key} : ${value}`);
            }
        }
    }
    return lines.length > 0 ? `\n\nPréférences indiquées :\n${lines.join('\n')}` : '';
}
async function resolveEventOrganizer(tenantId, manager) {
    if (manager)
        return manager;
    return db_1.prisma.user.findFirst({
        where: { tenantId, role: 'USER' },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, email: true, phone: true },
    });
}
async function notifyOrganizerOfRsvp(params) {
    const { organizer, guest, eventTitle, rsvp, preferences } = params;
    const statusLabel = rsvp === 'ACCEPTED' ? 'Présence confirmée (Oui)' : 'Absence (Décliné)';
    const preferencesDetails = formatPreferencesDetails(preferences);
    const ownerSubject = `[RSVP] ${guest.firstName} ${guest.lastName} — ${rsvp === 'ACCEPTED' ? 'Présent' : 'Décliné'}`;
    const dashboardPath = params.eventId
        ? `/dashboard/events/${params.eventId}`
        : '/dashboard/events';
    const dashboardUrl = `${FRONTEND_URL}${dashboardPath}`;
    const orgBrand = await (0, brandedMessaging_1.loadOrgBrand)(params.tenantId);
    const ownerTextBody = `Bonjour ${organizer.name || 'Organisateur'},\n\n` +
        `Un invité vient de répondre à votre invitation pour l'événement "${eventTitle}".\n\n` +
        `Invité : ${guest.firstName} ${guest.lastName}\n` +
        `Email : ${guest.email}\n` +
        `Statut : ${statusLabel}${preferencesDetails}\n\n` +
        `Consultez la liste complète : ${dashboardUrl}\n\n` +
        `${orgBrand.orgName}`;
    const ownerHtmlBody = (0, brandedMessaging_1.wrapBrandedEmail)({
        branding: orgBrand.branding,
        orgName: orgBrand.orgName,
        title: 'Nouvelle réponse RSVP',
        eyebrow: eventTitle,
        innerHtml: `
      <p style="color:#64748b;margin:0 0 18px;">Un invité a répondu pour <strong>${(0, brandingUtils_1.escapeHtml)(eventTitle)}</strong>.</p>
      <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:8px;">
        <p style="margin:0 0 8px;"><strong>Invité :</strong> ${(0, brandingUtils_1.escapeHtml)(`${guest.firstName} ${guest.lastName}`)}</p>
        <p style="margin:0 0 8px;"><strong>Email :</strong> ${(0, brandingUtils_1.escapeHtml)(guest.email)}</p>
        <p style="margin:0;"><strong>Statut :</strong> ${(0, brandingUtils_1.escapeHtml)(statusLabel)}</p>
      </div>
      ${preferencesDetails ? `<pre style="background-color:#fffbeb;border:1px solid #fef3c7;border-radius:8px;padding:15px;font-size:13px;white-space:pre-wrap;">${(0, brandingUtils_1.escapeHtml)(preferencesDetails.trim())}</pre>` : ''}
    `,
        cta: { href: dashboardUrl, label: 'Voir mes invités' },
    });
    const ownerWhatsappRendered = await (0, messageTemplateService_1.renderGuestMessage)('RSVP_ORGANIZER_WHATSAPP', {
        title: eventTitle,
        firstName: guest.firstName,
        lastName: guest.lastName,
        statusLabel: rsvp === 'ACCEPTED' ? '✅ Présent' : '❌ Décliné',
        preferencesDetails: preferencesDetails ? `\n\n📋 *Préférences* :${preferencesDetails}` : '',
        dashboardUrl,
        orgName: orgBrand.orgName,
    });
    const ownerWhatsappBody = (0, brandedMessaging_1.wrapBrandedWhatsApp)(ownerWhatsappRendered.body, orgBrand.orgName);
    if (params.tenantId) {
        await (0, platformNotificationService_1.notifyTenantOperators)(params.tenantId, {
            type: platformNotificationTypes_1.PLATFORM_NOTIFICATION_TYPE.EVENT_RSVP,
            title: `RSVP — ${statusLabel}`,
            message: `${guest.firstName} ${guest.lastName} · ${eventTitle}`,
            metadata: {
                href: dashboardPath,
                eventId: params.eventId || null,
                eventTitle,
            },
            email: { subject: ownerSubject, text: ownerTextBody, html: ownerHtmlBody },
            whatsapp: ownerWhatsappBody,
        });
        return;
    }
    const organizerPhone = getUserPhone(organizer);
    const results = [];
    if (isValidEmail(organizer.email)) {
        const emailResult = await (0, notificationService_1.sendRealEmail)(organizer.email, ownerSubject, ownerTextBody, ownerHtmlBody);
        if (emailResult.success && !emailResult.simulated) {
            results.push(`email:${organizer.email}`);
        }
        else if (emailResult.simulated) {
            console.log(`[RSVP Controller] Organizer email simulated to ${organizer.email}`);
        }
        else {
            console.warn(`[RSVP Controller] Organizer email failed for ${organizer.email}`);
        }
    }
    if (organizerPhone) {
        const whatsappResult = await (0, notificationService_1.sendRealWhatsApp)(organizerPhone, ownerWhatsappBody);
        if (whatsappResult.success && !whatsappResult.simulated) {
            results.push(`whatsapp:${organizerPhone}`);
        }
        else if (whatsappResult.simulated) {
            console.log(`[RSVP Controller] Organizer WhatsApp simulated to ${organizerPhone}`);
        }
        else {
            console.warn(`[RSVP Controller] Organizer WhatsApp failed for ${organizerPhone}:`, whatsappResult.error);
        }
    }
    if (results.length === 0) {
        console.warn(`[RSVP Controller] Aucune notification organisateur envoyée (email/téléphone manquants ou simulés).`);
    }
    else {
        console.log(`[RSVP Controller] Organisateur notifié via: ${results.join(', ')}`);
    }
}
// Public endpoint to get guest and event details
async function getGuestRsvpDetails(req, res) {
    try {
        const guestId = req.params.guestId;
        const guest = await db_1.prisma.guest.findUnique({
            where: { id: guestId },
            include: {
                ticketOrder: {
                    select: {
                        id: true,
                        tableId: true,
                        seatIndex: true,
                        selectedSeats: true,
                        pricingZoneId: true,
                        status: true,
                        quantity: true,
                        amountFc: true,
                    },
                },
                event: {
                    select: {
                        id: true,
                        tenantId: true,
                        title: true,
                        description: true,
                        date: true,
                        location: true,
                        city: true,
                        commune: true,
                        neighborhood: true,
                        latitude: true,
                        longitude: true,
                        isPublic: true,
                        tablePlan: true,
                        eventPrep: true,
                        eventProgram: true,
                        guestGuidelines: true,
                        rsvpForm: true,
                        room: {
                            select: {
                                layoutBlueprint: true,
                            },
                        },
                        tenant: { select: { id: true, name: true, branding: true } },
                        invitations: {
                            where: {
                                templateId: { not: null }
                            },
                            select: {
                                template: true
                            },
                            take: 1
                        }
                    },
                },
            },
        });
        if (!guest) {
            return res.status(404).json({ error: 'Invité non trouvé ou lien RSVP invalide.' });
        }
        // Si l'invité possède un billet ou s'il s'agit d'un événement public avec billetterie / inscription,
        // sa présence est validée dès l'obtention du billet.
        if (guest.rsvp === 'PENDING' &&
            (guest.ticketOrderId || guest.category === 'Billet' || Boolean(guest.event?.isPublic))) {
            await db_1.prisma.guest.update({
                where: { id: guest.id },
                data: { rsvp: 'ACCEPTED' },
            }).catch(() => undefined);
            guest.rsvp = 'ACCEPTED';
        }
        // Réconciliation de la place réservée via le billet (TicketOrder)
        const order = guest.ticketOrder;
        let reservedTableId = order?.tableId ?? null;
        let reservedSeatIndex = order?.seatIndex ?? null;
        if (order?.selectedSeats && Array.isArray(order.selectedSeats) && order.selectedSeats.length > 0) {
            const rawSeats = order.selectedSeats;
            if ((order.quantity ?? 1) > 1) {
                const orderGuests = await db_1.prisma.guest.findMany({
                    where: { ticketOrderId: order.id },
                    select: { id: true },
                    orderBy: { createdAt: 'asc' },
                });
                const guestIdx = orderGuests.findIndex((g) => g.id === guest.id);
                const seatItem = rawSeats[guestIdx >= 0 ? guestIdx : 0] || rawSeats[0];
                if (seatItem) {
                    reservedTableId = String(seatItem.tableId);
                    reservedSeatIndex = Number(seatItem.seatIndex);
                }
            }
            else if (rawSeats[0]) {
                reservedTableId = String(rawSeats[0].tableId);
                reservedSeatIndex = Number(rawSeats[0].seatIndex);
            }
        }
        // Auto-attribution et synchronisation en mémoire du plan de table
        const eventObj = guest.event;
        if (eventObj?.tablePlan && typeof eventObj.tablePlan === 'object' && Array.isArray(eventObj.tablePlan.tables)) {
            if (reservedTableId && reservedSeatIndex != null) {
                const targetTable = eventObj.tablePlan.tables.find((t) => t.id === reservedTableId);
                if (targetTable) {
                    if (!targetTable.seats)
                        targetTable.seats = {};
                    if (targetTable.seats[String(reservedSeatIndex)] !== guestId) {
                        targetTable.seats[String(reservedSeatIndex)] = guestId;
                        // Persistance asynchrone non-bloquante pour synchroniser la base
                        db_1.prisma.event.update({
                            where: { id: guest.eventId },
                            data: { tablePlan: (0, prismaJson_1.toPrismaJson)(eventObj.tablePlan) },
                        }).catch(() => undefined);
                    }
                }
            }
        }
        const forPrint = req.query.print === '1';
        const hasSeatAssignment = Boolean((0, commercialService_1.findGuestSeatInTablePlan)(guest.event.tablePlan, guestId)) ||
            (reservedTableId != null && reservedSeatIndex != null);
        const placementAccessible = (0, guestPlacementAccess_1.canGuestAccessPlacement)(guest) || (forPrint && hasSeatAssignment);
        // Extract table details if the guest is assigned to a table (after validation only)
        let tableDetails = null;
        let tablePlanOverview = null;
        let planFixtures = null;
        let roomOutline = null;
        let roomThemeId = null;
        let floorType = null;
        let floorImageUrl = null;
        let depthAmount = 0;
        let depthView = false;
        let roomLayoutPreview = null;
        let sourceRoomType = null;
        let previewLightingPreset = null;
        let pricingZones = [];
        // eventObj déjà déclaré plus haut
        if (placementAccessible && eventObj && eventObj.tablePlan && typeof eventObj.tablePlan === 'object') {
            const plan = eventObj.tablePlan;
            pricingZones = Array.isArray(plan.pricingZones) ? plan.pricingZones : [];
            const isPublicEvent = Boolean(guest.event?.isPublic);
            const sharingPolicy = (plan.neighborSharingPolicy && typeof plan.neighborSharingPolicy === 'object' ? plan.neighborSharingPolicy : null);
            const policyMode = sharingPolicy?.mode ?? (isPublicEvent ? 'first_name' : 'full');
            const shareSameTable = sharingPolicy?.shareSameTable !== false; // default true
            const shareSameZone = Boolean(sharingPolicy?.shareSameZone); // default false
            if (Array.isArray(plan.tables)) {
                tablePlanOverview = plan.tables.map((table) => ({
                    id: table.id,
                    name: table.name,
                    shape: table.shape,
                    capacity: table.capacity,
                    x: table.x,
                    y: table.y,
                    occupiedCount: Object.values(table.seats || {}).filter(Boolean).length,
                    isGuestTable: Object.values(table.seats || {}).includes(guestId) ||
                        (reservedTableId != null && table.id === reservedTableId),
                    guestSeatIndex: (() => {
                        const entry = Object.entries(table.seats || {}).find(([, id]) => id === guestId);
                        if (entry)
                            return parseInt(entry[0], 10);
                        if (reservedTableId != null && table.id === reservedTableId && reservedSeatIndex != null) {
                            return reservedSeatIndex;
                        }
                        return undefined;
                    })(),
                    pricingZoneId: table.pricingZoneId,
                    chairType: table.chairType,
                    chairImageUrl: table.chairImageUrl,
                    tableColor: table.tableColor,
                    tableImageUrl: table.tableImageUrl,
                }));
                if (Array.isArray(plan.fixtures)) {
                    planFixtures = plan.fixtures;
                }
                for (const table of plan.tables) {
                    const seatsObj = table.seats || {};
                    const seatEntries = Object.entries(seatsObj);
                    const guestSeatEntry = seatEntries.find(([, id]) => id === guestId);
                    if (guestSeatEntry) {
                        const seatIndex = parseInt(guestSeatEntry[0], 10);
                        const tableZone = pricingZones.find((z) => z.id === table.pricingZoneId);
                        let neighbors = [];
                        if (shareSameTable) {
                            const neighborIds = seatEntries
                                .filter(([, id]) => id && id !== guestId)
                                .map(([, id]) => id);
                            if (neighborIds.length > 0) {
                                const neighborGuests = await db_1.prisma.guest.findMany({
                                    where: { id: { in: neighborIds } },
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                    },
                                });
                                neighbors = neighborGuests.map((g) => {
                                    const neighborSeat = seatEntries.find(([, id]) => id === g.id);
                                    const seatIdx = neighborSeat ? parseInt(neighborSeat[0], 10) : undefined;
                                    if (policyMode === 'hidden') {
                                        return {
                                            id: g.id,
                                            firstName: 'Participant',
                                            lastName: '',
                                            anonymous: true,
                                            seatIndex: seatIdx,
                                        };
                                    }
                                    if (policyMode === 'first_name') {
                                        return {
                                            id: g.id,
                                            firstName: g.firstName,
                                            lastName: g.lastName ? `${g.lastName.charAt(0).toUpperCase()}.` : '',
                                            anonymous: false,
                                            seatIndex: seatIdx,
                                        };
                                    }
                                    return {
                                        ...g,
                                        anonymous: false,
                                        seatIndex: seatIdx,
                                    };
                                });
                            }
                        }
                        // Calcul des convives de la même zone si shareSameZone est activé
                        let zoneNeighbors = [];
                        let zoneNeighborsCount = 0;
                        if (table.pricingZoneId) {
                            const otherZoneTables = plan.tables.filter((t) => t.id !== table.id && t.pricingZoneId === table.pricingZoneId);
                            const otherZoneGuestIds = [];
                            for (const zt of otherZoneTables) {
                                const zSeats = zt.seats || {};
                                for (const gid of Object.values(zSeats)) {
                                    if (gid && gid !== guestId) {
                                        otherZoneGuestIds.push({ guestId: gid, tableName: zt.name });
                                    }
                                }
                            }
                            zoneNeighborsCount = otherZoneGuestIds.length;
                            if (shareSameZone && otherZoneGuestIds.length > 0) {
                                const ids = otherZoneGuestIds.map((item) => item.guestId);
                                const zoneGuests = await db_1.prisma.guest.findMany({
                                    where: { id: { in: ids } },
                                    select: { id: true, firstName: true, lastName: true },
                                    take: 30,
                                });
                                zoneNeighbors = zoneGuests.map((g) => {
                                    const item = otherZoneGuestIds.find((x) => x.guestId === g.id);
                                    if (policyMode === 'hidden') {
                                        return {
                                            id: g.id,
                                            firstName: 'Participant',
                                            lastName: '',
                                            tableName: item?.tableName || 'Table',
                                            anonymous: true,
                                        };
                                    }
                                    if (policyMode === 'first_name') {
                                        return {
                                            id: g.id,
                                            firstName: g.firstName,
                                            lastName: g.lastName ? `${g.lastName.charAt(0).toUpperCase()}.` : '',
                                            tableName: item?.tableName || 'Table',
                                            anonymous: false,
                                        };
                                    }
                                    return {
                                        id: g.id,
                                        firstName: g.firstName,
                                        lastName: g.lastName,
                                        tableName: item?.tableName || 'Table',
                                        anonymous: false,
                                    };
                                });
                            }
                        }
                        tableDetails = {
                            tableName: table.name,
                            shape: table.shape,
                            capacity: table.capacity,
                            seatIndex,
                            chairType: table.chairType,
                            chairImageUrl: table.chairImageUrl,
                            pricingZoneId: table.pricingZoneId || null,
                            zoneName: tableZone?.name || null,
                            zoneColor: tableZone?.color || null,
                            privacyPolicy: {
                                mode: policyMode,
                                shareSameTable,
                                shareSameZone,
                                isPublic: isPublicEvent,
                            },
                            neighbors,
                            zoneNeighborsCount,
                            zoneNeighbors: shareSameZone ? zoneNeighbors : undefined,
                        };
                        break;
                    }
                }
                // Si non trouvé par ID exact, mais que l'invité a une réservation issue de son billet
                if (!tableDetails && reservedTableId != null && reservedSeatIndex != null) {
                    const fallbackTable = plan.tables.find((t) => t.id === reservedTableId);
                    if (fallbackTable) {
                        const seatIndex = reservedSeatIndex;
                        const tableZone = pricingZones.find((z) => z.id === fallbackTable.pricingZoneId);
                        tableDetails = {
                            tableName: fallbackTable.name || `Table ${fallbackTable.id.slice(0, 6)}`,
                            shape: fallbackTable.shape || 'round',
                            capacity: fallbackTable.capacity || 8,
                            seatIndex,
                            chairType: fallbackTable.chairType,
                            chairImageUrl: fallbackTable.chairImageUrl,
                            pricingZoneId: fallbackTable.pricingZoneId || null,
                            zoneName: tableZone?.name || null,
                            zoneColor: tableZone?.color || null,
                            privacyPolicy: {
                                mode: policyMode,
                                shareSameTable,
                                shareSameZone,
                                isPublic: isPublicEvent,
                            },
                            neighbors: [],
                            zoneNeighborsCount: 0,
                        };
                    }
                }
            }
            const room = eventObj.room;
            if (room?.layoutBlueprint) {
                roomLayoutPreview = (0, publicVenue_1.sanitizeLayoutBlueprint)(room.layoutBlueprint);
            }
            if (plan.sourceRoomType) {
                sourceRoomType = String(plan.sourceRoomType);
            }
            else if (room?.layoutBlueprint?.roomType) {
                sourceRoomType = String(room.layoutBlueprint.roomType);
            }
            const program = eventObj.eventProgram;
            if (program && typeof program === 'object' && Array.isArray(program.slots)) {
                const firstSlot = program.slots[0];
                if (firstSlot?.lighting)
                    previewLightingPreset = firstSlot.lighting;
            }
            if (room?.layoutBlueprint?.roomOutline) {
                roomOutline = room.layoutBlueprint.roomOutline;
            }
            else if (plan.roomOutline) {
                roomOutline = plan.roomOutline;
            }
            if (room?.layoutBlueprint?.metadata?.roomThemeId) {
                roomThemeId = room.layoutBlueprint.metadata.roomThemeId;
            }
            else if (plan.roomThemeId) {
                roomThemeId = plan.roomThemeId;
            }
            if (room?.layoutBlueprint?.metadata?.floorType) {
                floorType = room.layoutBlueprint.metadata.floorType;
            }
            else if (plan.floorType) {
                floorType = plan.floorType;
            }
            if (room?.layoutBlueprint?.metadata?.floorImageUrl) {
                floorImageUrl = room.layoutBlueprint.metadata.floorImageUrl;
            }
            else if (plan.floorImageUrl) {
                floorImageUrl = plan.floorImageUrl;
            }
            const meta = room?.layoutBlueprint?.metadata;
            if (typeof meta?.depthAmount === 'number') {
                depthAmount = meta.depthAmount;
                depthView = meta.depthAmount > 0;
            }
            else if (typeof plan.depthAmount === 'number') {
                depthAmount = plan.depthAmount;
                depthView = plan.depthAmount > 0;
            }
            else if (meta?.depthView || plan.depthView) {
                depthView = true;
                depthAmount = 55;
            }
        }
        const { event: guestEvent, ...guestWithoutEvent } = guest;
        const tenant = guestEvent.tenant;
        const { tenant: _tenant, ...eventWithoutTenant } = guestEvent;
        void _tenant;
        const eventForClient = placementAccessible
            ? eventWithoutTenant
            : { ...eventWithoutTenant, latitude: null, longitude: null };
        if (eventForClient && typeof eventForClient === 'object' && Array.isArray(eventForClient.invitations)) {
            eventForClient.invitations =
                eventForClient.invitations.map((inv) => {
                    if (!inv?.template)
                        return inv;
                    return {
                        ...inv,
                        template: {
                            ...inv.template,
                            content: (0, mandatoryRsvpFields_1.overlayRsvpFieldsOnContent)((0, mandatoryRsvpFields_1.ensureMandatoryRsvpFieldsOnContent)(inv.template.content), guestEvent.rsvpForm),
                        },
                    };
                });
        }
        const isTicketGuest = Boolean(guest.ticketOrderId || guest.category === 'Billet');
        const assignedZoneId = tableDetails?.pricingZoneId || order?.pricingZoneId || null;
        const assignedZone = pricingZones.find((z) => z.id === assignedZoneId);
        const effectiveSeatIndex = tableDetails?.seatIndex ?? reservedSeatIndex ?? null;
        const ticketPlacement = {
            hasTicket: isTicketGuest,
            isAssigned: Boolean(tableDetails || (reservedTableId && reservedSeatIndex != null)),
            orderId: order?.id || null,
            pricingZoneId: assignedZoneId,
            zoneName: tableDetails?.zoneName || assignedZone?.name || null,
            zoneColor: tableDetails?.zoneColor || assignedZone?.color || null,
            tableId: tableDetails
                ? (eventObj?.tablePlan?.tables?.find((t) => t.name === tableDetails.tableName)?.id || reservedTableId)
                : reservedTableId,
            tableName: tableDetails?.tableName || (reservedTableId ? (eventObj?.tablePlan?.tables?.find((t) => t.id === reservedTableId)?.name || 'Votre table') : null),
            seatIndex: effectiveSeatIndex,
            seatNumber: effectiveSeatIndex != null ? effectiveSeatIndex + 1 : null,
        };
        // Récupération de tous les pass associés à la commande si achat groupé de billets
        let orderPasses = null;
        if (guest.ticketOrderId) {
            const orderGuests = await db_1.prisma.guest.findMany({
                where: { ticketOrderId: guest.ticketOrderId },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'asc' },
            });
            if (orderGuests.length > 0) {
                const rawSeats = Array.isArray(order?.selectedSeats)
                    ? order?.selectedSeats
                    : [];
                const tablesList = eventObj?.tablePlan?.tables || [];
                const passes = orderGuests.map((og, idx) => {
                    const isCurrent = og.id === guestId;
                    let pTableId = null;
                    let pSeatIndex = null;
                    if (rawSeats[idx]) {
                        pTableId = rawSeats[idx].tableId ? String(rawSeats[idx].tableId) : null;
                        pSeatIndex = rawSeats[idx].seatIndex != null ? Number(rawSeats[idx].seatIndex) : null;
                    }
                    else if (idx === 0 && order?.tableId != null) {
                        pTableId = order.tableId;
                        pSeatIndex = order.seatIndex;
                    }
                    let foundTableName = null;
                    let foundZoneName = null;
                    for (const tbl of tablesList) {
                        const sObj = tbl.seats || {};
                        const entry = Object.entries(sObj).find(([, gId]) => gId === og.id);
                        if (entry) {
                            foundTableName = tbl.name;
                            pSeatIndex = parseInt(entry[0], 10);
                            const z = pricingZones.find((pz) => pz.id === tbl.pricingZoneId);
                            if (z)
                                foundZoneName = z.name;
                            break;
                        }
                    }
                    if (!foundTableName && pTableId) {
                        const tbl = tablesList.find((t) => t.id === pTableId);
                        if (tbl) {
                            foundTableName = tbl.name;
                            const z = pricingZones.find((pz) => pz.id === tbl.pricingZoneId);
                            if (z)
                                foundZoneName = z.name;
                        }
                    }
                    const effSeatNumber = pSeatIndex != null ? pSeatIndex + 1 : null;
                    return {
                        guestId: og.id,
                        ticketNumber: idx + 1,
                        firstName: og.firstName,
                        lastName: og.lastName,
                        email: og.email,
                        phone: og.phone,
                        isCurrentGuest: isCurrent,
                        rsvpUrl: `${FRONTEND_URL}/rsvp/${og.id}`,
                        qrImageUrl: `${FRONTEND_URL}/api/rsvp/${og.id}/qr.png`,
                        tableName: foundTableName,
                        seatIndex: pSeatIndex,
                        seatNumber: effSeatNumber,
                        zoneName: foundZoneName || assignedZone?.name || null,
                    };
                });
                orderPasses = {
                    orderId: guest.ticketOrderId,
                    totalCount: Math.max(order?.quantity || 1, orderGuests.length),
                    passes,
                };
            }
        }
        let donationsData = null;
        const donationsAccess = (0, platformSettingsService_1.getDonationsAccess)();
        const eventTenantId = guest.event.tenantId;
        const platformCheck = (0, donationsAccess_1.resolveDonationsAccess)(eventTenantId, donationsAccess);
        const donationsConfig = (0, donationsAccess_1.extractEventDonationsConfig)(guest.event.eventPrep);
        if (platformCheck.allowed && donationsConfig?.enabled) {
            const paidDonations = await db_1.prisma.ticketOrder.aggregate({
                where: {
                    eventId: guest.eventId,
                    status: 'PAID',
                    pricingZoneId: 'donation',
                },
                _sum: { amountFc: true },
                _count: { _all: true },
            });
            const collectedAmountFc = paidDonations._sum.amountFc || 0;
            const target = donationsConfig.targetAmountFc;
            const progressPercent = target && target > 0 ? Math.min(100, Math.round((collectedAmountFc / target) * 100)) : null;
            donationsData = {
                enabled: true,
                cause: donationsConfig.cause,
                targetAmountFc: donationsConfig.targetAmountFc,
                minAmountFc: donationsConfig.minAmountFc || donationsAccess.minAmountFc || 1000,
                suggestedAmountsFc: donationsConfig.suggestedAmountsFc || donationsAccess.defaultSuggestedAmountsFc,
                collectedAmountFc,
                donorsCount: paidDonations._count._all || 0,
                progressPercent,
            };
        }
        return res.json({
            ...guestWithoutEvent,
            event: eventForClient,
            branding: (0, brandingUtils_1.customTenantBranding)(tenant?.branding),
            organizationName: tenant?.name || 'Organisation',
            placementAccessible,
            seatingInvitationPdfUrl: placementAccessible ? guest.seatingInvitationPdfUrl ?? null : null,
            tableDetails,
            tablePlanOverview,
            pricingZones,
            planFixtures,
            roomOutline,
            roomThemeId,
            floorType,
            floorImageUrl,
            depthAmount,
            depthView,
            roomLayoutPreview,
            sourceRoomType,
            previewLightingPreset,
            ticketPlacement,
            orderPasses,
            donations: donationsData,
            eventPassed: isEventDatePassed(guest.event.date),
            rsvpLocked: isEventDatePassed(guest.event.date),
        });
    }
    catch (error) {
        console.error('Erreur lors de la récupération des détails RSVP de l\'invité:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération du RSVP' });
    }
}
// Public endpoint: all events where this guest (by email or phone) has been invited
async function getGuestAllInvitations(req, res) {
    try {
        const guestId = req.params.guestId;
        const anchorGuest = await db_1.prisma.guest.findUnique({
            where: { id: guestId },
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, preferences: true },
        });
        if (!anchorGuest) {
            return res.status(404).json({ error: 'Invité non trouvé ou lien invalide.' });
        }
        const guestRecords = await (0, legalService_1.findGuestsByIdentity)(anchorGuest);
        const identityEmail = (0, guestIdentity_1.extractGuestEmail)(anchorGuest);
        const identityPhone = (0, guestIdentity_1.extractGuestPhone)(anchorGuest);
        const invitations = guestRecords
            .map((record) => {
            const eventPassed = isEventDatePassed(record.event.date);
            return {
                guestId: record.id,
                rsvp: record.rsvp,
                event: record.event,
                organizationName: record.event.tenant?.name || 'Organisation',
                branding: (0, brandingUtils_1.customTenantBranding)(record.event.tenant?.branding),
                eventPassed,
                rsvpLocked: eventPassed,
                isCurrent: record.id === guestId,
            };
        })
            .sort((a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime());
        return res.json({
            guest: {
                firstName: anchorGuest.firstName,
                lastName: anchorGuest.lastName,
                email: identityEmail,
                phone: identityPhone,
            },
            currentGuestId: guestId,
            invitations,
            total: invitations.length,
            upcomingCount: invitations.filter((i) => !i.eventPassed).length,
            pastCount: invitations.filter((i) => i.eventPassed).length,
            matchedBy: {
                email: Boolean(identityEmail),
                phone: Boolean(identityPhone),
            },
        });
    }
    catch (error) {
        console.error('Erreur lors de la récupération des invitations invité:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération de vos invitations.' });
    }
}
// Public endpoint to submit RSVP response and preferences
async function submitRsvp(req, res) {
    try {
        const guestId = req.params.guestId;
        const { rsvp, preferences, firstName, lastName, phone, phoneCountryCode } = req.body;
        if (rsvp && !['ACCEPTED', 'DECLINED'].includes(rsvp)) {
            return res.status(400).json({ error: 'Le statut RSVP doit être ACCEPTED ou DECLINED.' });
        }
        const guest = await db_1.prisma.guest.findUnique({
            where: { id: guestId },
            include: {
                event: {
                    include: {
                        tenant: {
                            include: {
                                manager: true
                            }
                        }
                    }
                }
            },
        });
        if (!guest) {
            return res.status(404).json({ error: 'Invité non trouvé ou lien RSVP invalide.' });
        }
        if (isEventDatePassed(guest.event.date)) {
            return res.status(403).json({
                error: 'La date de célébration est passée. Vos informations ne peuvent plus être modifiées.',
                rsvpLocked: true,
            });
        }
        const isTicketOrPublic = Boolean(guest.ticketOrderId ||
            guest.category === 'Billet' ||
            guest.event?.isPublic ||
            guest.event?.ticketingEnabled);
        // Déterminer le statut RSVP :
        // Si explicitement fourni, on le prend. Sinon, pour un billet ou événement public, c'est 'ACCEPTED', sinon statut actuel.
        const targetRsvp = rsvp
            ? rsvp
            : (guest.rsvp === 'DECLINED' ? 'DECLINED' : 'ACCEPTED');
        const previousRsvp = guest.rsvp;
        const wasPending = previousRsvp === 'PENDING';
        const statusChanged = previousRsvp !== targetRsvp;
        // Prise en compte du prénom et du nom
        const cleanFirstName = typeof firstName === 'string' ? firstName.trim().slice(0, 80) : undefined;
        const cleanLastName = typeof lastName === 'string' ? lastName.trim().slice(0, 80) : undefined;
        const nameChanged = Boolean((cleanFirstName && cleanFirstName !== guest.firstName) ||
            (cleanLastName !== undefined && cleanLastName !== guest.lastName));
        // Normalisation du téléphone
        let nextPhone = guest.phone;
        let nextCountryCode = guest.phoneCountryCode;
        if (phone !== undefined || phoneCountryCode !== undefined) {
            const resolved = (0, phone_1.resolvePhoneFields)({
                phone: phone !== undefined ? phone : guest.phone,
                phoneCountryCode: phoneCountryCode !== undefined ? phoneCountryCode : guest.phoneCountryCode,
            });
            nextPhone = resolved.phone;
            nextCountryCode = resolved.phoneCountryCode;
        }
        // Normalisation des préférences
        const mergedPreferences = {
            ...(guest.preferences || {}),
            ...(preferences ? (0, rsvpPreferences_1.normalizeGuestPreferences)(preferences) : {}),
        };
        if (nextPhone) {
            mergedPreferences.phone = nextPhone;
        }
        const updateData = {
            rsvp: targetRsvp,
            preferences: mergedPreferences,
            phone: nextPhone,
            phoneCountryCode: nextCountryCode,
        };
        if (cleanFirstName) {
            updateData.firstName = cleanFirstName;
        }
        if (cleanLastName !== undefined) {
            updateData.lastName = cleanLastName;
        }
        const updatedGuest = await db_1.prisma.guest.update({
            where: { id: guestId },
            data: updateData,
        });
        // Send QR Code notifications asynchronously if RSVP is accepted AND (statusChanged or newly accepted)
        const formattedDate = guest.event.date ? new Date(guest.event.date).toLocaleDateString('fr-FR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : '';
        if (targetRsvp === 'ACCEPTED' && (statusChanged || wasPending)) {
            const qrCodeUrl = (0, qrCode_1.buildGuestQrImageUrl)(guest.id, 300);
            const orgBrand = (0, brandedMessaging_1.orgBrandFromTenant)(guest.event.tenant);
            const subject = `Confirmation de votre présence - ${guest.event.title}`;
            const textBody = `Bonjour ${updatedGuest.firstName},\n\nVotre présence à l'événement "${guest.event.title}" a été confirmée avec succès !\n\nVoici votre badge de confirmation de présence (QR Code) : ${qrCodeUrl}\n\nPrésentez ce QR Code à l'entrée le jour J.\n\nDate : ${formattedDate}\nLieu : ${(0, eventPlace_1.formatEventPlace)(guest.event) || guest.event.location || 'Non défini'}\n\n${guestMessageCopy_1.GUEST_COPY.afterRsvp}\n\nMerci et à très bientôt !\n${orgBrand.orgName}`;
            const htmlBody = (0, brandedMessaging_1.wrapBrandedEmail)({
                branding: orgBrand.branding,
                orgName: orgBrand.orgName,
                title: 'Présence confirmée',
                eyebrow: guest.event.title,
                innerHtml: `
          <p style="text-align:center;color:${orgBrand.branding.primary};font-weight:700;margin:0 0 16px;">Merci, ${(0, brandingUtils_1.escapeHtml)(updatedGuest.firstName)} !</p>
          <p>Votre présence à <strong>${(0, brandingUtils_1.escapeHtml)(guest.event.title)}</strong> a été enregistrée.</p>
          <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
            <span style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:10px;">Votre badge</span>
            <img src="${qrCodeUrl}" alt="QR Code" style="width:180px;height:180px;border:1px solid #cbd5e1;border-radius:8px;padding:5px;background:#fff;" />
            <p style="font-size:12px;color:#64748b;margin:10px 0 0;">Présentez ce QR Code à l'entrée le jour J.</p>
          </div>
          ${(0, brandedMessaging_1.brandedEventDetailsHtml)(orgBrand.branding, [
                    { label: 'Date', value: formattedDate },
                    { label: 'Lieu', value: (0, eventPlace_1.formatEventPlace)(guest.event) || guest.event.location || 'Non défini' },
                ])}
        `,
                footerNote: guestMessageCopy_1.GUEST_COPY.rsvpEmailFooter,
            });
            const whatsappRendered = await (0, messageTemplateService_1.renderGuestMessage)('RSVP_CONFIRMATION_WHATSAPP', {
                firstName: updatedGuest.firstName,
                title: guest.event.title,
                date: formattedDate,
                location: (0, eventPlace_1.formatEventPlace)(guest.event) || guest.event.location || 'Non défini',
                orgName: orgBrand.orgName,
            });
            const whatsappCaption = (0, brandedMessaging_1.wrapBrandedWhatsApp)(whatsappRendered.body, orgBrand.orgName, {
                guidelinesBlock: (0, guestGuidelines_1.guestGuidelinesInvitationText)(guest.event.guestGuidelines),
            });
            // Run sending in the background to avoid blocking the user response
            (async () => {
                try {
                    // 1. Send Email if valid email address
                    const destEmail = (0, guestIdentity_1.extractGuestEmail)(updatedGuest);
                    if (destEmail) {
                        console.log(`[RSVP Controller] Sending confirmation email with QR Code to ${destEmail}...`);
                        await (0, notificationService_1.sendRealEmail)(destEmail, subject, textBody, htmlBody);
                    }
                    // 2. WhatsApp avec image QR
                    const phone = getGuestPhone(updatedGuest);
                    if (phone) {
                        console.log(`[RSVP Controller] Sending confirmation WhatsApp Image with QR Code to ${phone}...`);
                        await (0, notificationService_1.sendRealWhatsAppImage)(phone, qrCodeUrl, whatsappCaption);
                    }
                    // 3. PDF / plan / GPS dès acceptation (si siège assigné + forfait)
                    const tenantId = guest.event.tenantId;
                    if (tenantId) {
                        const placement = await (0, guestPlacementDeliveryService_1.deliverGuestPlacementIfEligible)({
                            guestId: guest.id,
                            eventId: guest.eventId,
                            tenantId,
                        });
                        if (placement.delivered) {
                            console.log('[RSVP Controller] Placement PDF/GPS envoyé:', placement.notification?.channels?.join(', '));
                        }
                        else {
                            console.log('[RSVP Controller] Placement non envoyé:', placement.skippedReason);
                        }
                    }
                }
                catch (notifErr) {
                    console.error('[RSVP Controller] Error sending QR Code confirmation notifications:', notifErr);
                }
            })();
        }
        // Notifier l'organisateur (email + WhatsApp) à chaque changement de statut RSVP ou de coordonnées
        if (statusChanged || nameChanged) {
            (async () => {
                try {
                    const organizer = await resolveEventOrganizer(guest.event.tenantId, guest.event.tenant?.manager ?? null);
                    if (!organizer) {
                        console.warn(`[RSVP Controller] Aucun organisateur trouvé pour le tenant ${guest.event.tenantId}`);
                        return;
                    }
                    await notifyOrganizerOfRsvp({
                        organizer,
                        guest: {
                            firstName: updatedGuest.firstName,
                            lastName: updatedGuest.lastName,
                            email: updatedGuest.email,
                        },
                        eventTitle: guest.event.title,
                        eventId: guest.eventId,
                        rsvp: targetRsvp,
                        preferences: updateData.preferences || {},
                        tenantId: guest.event.tenantId,
                    });
                }
                catch (ownerNotifErr) {
                    console.error('[RSVP Controller] Error sending notification to event organizer:', ownerNotifErr);
                }
            })();
        }
        return res.json({
            message: nameChanged
                ? 'Vos coordonnées ont été mises à jour avec succès.'
                : 'Votre réponse RSVP a été enregistrée avec succès.',
            guest: {
                id: updatedGuest.id,
                firstName: updatedGuest.firstName,
                lastName: updatedGuest.lastName,
                email: updatedGuest.email,
                phone: updatedGuest.phone,
                phoneCountryCode: updatedGuest.phoneCountryCode,
                rsvp: updatedGuest.rsvp,
                preferences: updatedGuest.preferences,
            },
        });
    }
    catch (error) {
        console.error('Erreur lors de la soumission du RSVP:', error);
        return res.status(500).json({ error: 'Erreur lors de l\'enregistrement de votre réponse RSVP.' });
    }
}
async function downloadSeatingInvitationPdf(req, res) {
    try {
        const guestId = req.params.guestId;
        const guest = await db_1.prisma.guest.findUnique({
            where: { id: guestId },
            include: {
                event: {
                    select: {
                        title: true,
                        description: true,
                        date: true,
                        location: true,
                        city: true,
                        commune: true,
                        neighborhood: true,
                        guestGuidelines: true,
                        tablePlan: true,
                    },
                },
            },
        });
        if (!guest?.event) {
            return res.status(404).json({ error: 'Invitation introuvable.' });
        }
        if (!(0, guestPlacementAccess_1.canGuestAccessPlacement)(guest)) {
            return res.status(403).json({
                error: guestMessageCopy_1.GUEST_COPY.pdfRequiresRsvp,
            });
        }
        const assigned = (0, commercialService_1.findGuestSeatInTablePlan)(guest.event.tablePlan, guestId);
        if (!assigned) {
            return res.status(404).json({ error: 'Aucun placement de table pour cet invité.' });
        }
        const mateIds = (0, tablePlanAssignment_1.getTableMateGuestIds)(guest.event.tablePlan, guestId);
        const tableMates = mateIds.length
            ? await db_1.prisma.guest.findMany({
                where: { id: { in: mateIds } },
                select: { firstName: true, lastName: true },
                orderBy: { lastName: 'asc' },
            })
            : [];
        const dressCode = (0, guestGuidelines_1.formatDressCodeText)((0, guestGuidelines_1.normalizeGuestGuidelines)(guest.event.guestGuidelines)) || null;
        const pdfInput = {
            guestId: guest.id,
            eventId: guest.eventId,
            guest: { firstName: guest.firstName, lastName: guest.lastName },
            event: guest.event,
            assignedSeat: assigned,
            tableMates,
            dressCode,
        };
        if (guest.seatingInvitationPdfUrl) {
            return res.redirect(302, guest.seatingInvitationPdfUrl);
        }
        const stored = await (0, seatingInvitationStorageService_1.generateAndStoreGuestInvitationPdf)(pdfInput);
        if (stored.url) {
            return res.redirect(302, stored.url);
        }
        const filename = `invitation-${guest.lastName || 'invite'}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        return res.send(stored.buffer);
    }
    catch (error) {
        console.error('Erreur génération PDF invitation:', error);
        return res.status(500).json({ error: 'Impossible de générer le PDF.' });
    }
}
/** PNG QR auto-hébergé pour badge invité (e-mail, WhatsApp, portail). */
async function getGuestQrPng(req, res) {
    try {
        const guestId = req.params.guestId;
        const sizeRaw = Number(req.query.size);
        const size = Number.isFinite(sizeRaw) ? Math.min(600, Math.max(80, Math.round(sizeRaw))) : 300;
        const guest = await db_1.prisma.guest.findUnique({
            where: { id: guestId },
            select: { id: true },
        });
        if (!guest) {
            return res.status(404).json({ error: 'Invité introuvable.' });
        }
        const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';
        const rsvpUrl = `${FRONTEND}/rsvp/${guest.id}`;
        const png = await (0, qrCode_1.generateQrPngBuffer)(rsvpUrl, { size });
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Content-Disposition', `inline; filename="qr-${guest.id}.png"`);
        return res.send(png);
    }
    catch (error) {
        console.error('Erreur génération QR:', error);
        return res.status(500).json({ error: 'Impossible de générer le QR code.' });
    }
}
/**
 * Permet à un invité d'effectuer un don solidaire directement depuis son espace invité.
 * POST /api/rsvp/:guestId/donations
 * body: { amountFc, isAnonymous?, donationNote?, paymentMethod?: 'mobile'|'card', phone?, currency? }
 */
async function submitGuestDonation(req, res) {
    try {
        const guestId = req.params.guestId;
        const guest = await db_1.prisma.guest.findUnique({
            where: { id: guestId },
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        tenantId: true,
                        eventPrep: true,
                        tenant: { select: { name: true } },
                    },
                },
            },
        });
        if (!guest || !guest.event) {
            return res.status(404).json({ error: 'Invité ou événement introuvable.' });
        }
        const donationsAccess = (0, platformSettingsService_1.getDonationsAccess)();
        const platformCheck = (0, donationsAccess_1.resolveDonationsAccess)(guest.event.tenantId, donationsAccess);
        if (!platformCheck.allowed) {
            return res.status(403).json({ error: platformCheck.reason || 'Les donations sont désactivées pour cette organisation.' });
        }
        const donationsConfig = (0, donationsAccess_1.extractEventDonationsConfig)(guest.event.eventPrep);
        if (!donationsConfig || !donationsConfig.enabled) {
            return res.status(400).json({ error: 'Les donations ne sont pas activées sur cet événement.' });
        }
        const rawAmount = Number(req.body?.amountFc || req.body?.donationAmountFc);
        const minAmount = donationsConfig.minAmountFc || donationsAccess.minAmountFc || 1000;
        if (!Number.isFinite(rawAmount) || rawAmount < minAmount) {
            return res.status(400).json({
                error: `Le montant minimum pour un don est de ${minAmount.toLocaleString('fr-FR')} FC.`,
            });
        }
        const amountFc = Math.round(rawAmount);
        const isAnonymous = Boolean(req.body?.isAnonymous);
        const donationNote = typeof req.body?.donationNote === 'string' ? req.body.donationNote.trim().slice(0, 500) : null;
        const rawMethod = String(req.body?.paymentMethod || 'mobile').toLowerCase();
        const paymentMethod = rawMethod === 'card' ? 'card' : 'mobile';
        const paymentProvider = paymentMethod === 'mobile' ? 'flexpay_mobile' : 'flexpay_card';
        if (!(0, platformSettingsService_1.isOnlinePaymentsEnabled)()) {
            return res.status(403).json({ error: 'Les paiements en ligne sont actuellement désactivés.' });
        }
        if (!(0, flexPayCardService_1.isFlexPayCardConfigured)()) {
            return res.status(503).json({
                error: 'Paiements FlexPay non configurés. Réessayez plus tard ou contactez le support.',
            });
        }
        const buyerName = `${guest.firstName} ${guest.lastName}`.trim() || 'Invité';
        const buyerEmail = guest.email;
        const buyerPhone = String(req.body?.phone || guest.phone || '').trim();
        const order = await db_1.prisma.ticketOrder.create({
            data: {
                eventId: guest.event.id,
                buyerName: isAnonymous ? 'Donateur Anonyme' : buyerName,
                buyerEmail,
                buyerPhone: buyerPhone || null,
                quantity: 1,
                amountFc,
                unitPriceFc: amountFc,
                pricingZoneId: 'donation',
                status: 'PENDING',
                paymentProvider,
                selectedSeats: (0, prismaJson_1.toPrismaJson)({
                    kind: 'DONATION',
                    isAnonymous,
                    donationNote,
                    originalBuyerName: buyerName,
                    donorGuestId: guest.id,
                    donorAttendancePass: false,
                }),
            },
        });
        if (paymentProvider === 'flexpay_mobile') {
            if (!buyerPhone) {
                await db_1.prisma.ticketOrder.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
                return res.status(400).json({ error: 'Numéro Mobile Money requis (ex. 243…).' });
            }
            const charge = (0, flexPayChargeCurrency_1.resolveFlexPayCharge)(amountFc, (0, flexPayChargeCurrency_1.parseFlexPayChargeCurrency)(req.body?.currency, 'mobile'), (0, platformSettingsService_1.loadPlatformSettings)().usdExchangeRateCdf);
            const apiBase = (0, flexPayCardService_1.getPublicApiBaseUrl)();
            const reference = (0, flexPayCardService_1.buildFlexPayReference)('dn', order.id);
            try {
                const flex = await (0, flexPayCardService_1.createFlexPayMobileCheckout)({
                    reference,
                    amount: charge.amount,
                    currency: charge.currency,
                    phone: buyerPhone,
                    callbackUrl: `${apiBase}/api/public/payments/flexpay/callback`,
                });
                await db_1.prisma.ticketOrder.update({
                    where: { id: order.id },
                    data: {
                        paymentProvider: 'flexpay_mobile',
                        flexPayOrderNumber: flex.orderNumber,
                        flexPayReference: reference,
                    },
                });
                return res.status(201).json({
                    paid: false,
                    pending: true,
                    orderId: order.id,
                    method: 'mobile',
                    amountCustomer: charge.amount,
                    currencyCustomer: charge.currency,
                    orderNumber: flex.orderNumber,
                    message: 'Demande de paiement Mobile Money envoyée sur votre téléphone. Veuillez valider avec votre code PIN.',
                });
            }
            catch (err) {
                await db_1.prisma.ticketOrder.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
                return res.status(502).json({ error: err?.message || 'Erreur lors de l’initialisation FlexPay Mobile.' });
            }
        }
        // flexpay_card
        const charge = (0, flexPayChargeCurrency_1.resolveFlexPayCharge)(amountFc, 'USD', (0, platformSettingsService_1.loadPlatformSettings)().usdExchangeRateCdf);
        const apiBase = (0, flexPayCardService_1.getPublicApiBaseUrl)();
        const reference = (0, flexPayCardService_1.buildFlexPayReference)('dn', order.id);
        try {
            const flex = await (0, flexPayCardService_1.createFlexPayCardCheckout)({
                reference,
                amount: charge.amount,
                currency: charge.currency,
                description: `Don solidaire: ${guest.event.title}`.slice(0, 100),
                callbackUrl: `${apiBase}/api/public/payments/flexpay/callback`,
                approveUrl: `${FRONTEND_URL}/rsvp/${guest.id}?donationSuccess=1&orderId=${order.id}`,
                cancelUrl: `${FRONTEND_URL}/rsvp/${guest.id}?donationCancelled=1`,
                declineUrl: `${FRONTEND_URL}/rsvp/${guest.id}?donationDeclined=1`,
            });
            await db_1.prisma.ticketOrder.update({
                where: { id: order.id },
                data: {
                    paymentProvider: 'flexpay_card',
                    flexPayOrderNumber: flex.orderNumber,
                    flexPayReference: reference,
                },
            });
            return res.status(201).json({
                paid: false,
                pending: true,
                orderId: order.id,
                method: 'card',
                paymentUrl: flex.redirectUrl,
            });
        }
        catch (err) {
            await db_1.prisma.ticketOrder.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
            return res.status(502).json({ error: err?.message || 'Erreur lors de l’initialisation du paiement par carte.' });
        }
    }
    catch (err) {
        console.error('Erreur submitGuestDonation:', err);
        return res.status(500).json({ error: 'Erreur lors de l’enregistrement de votre don.' });
    }
}
