"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEvents = getEvents;
exports.createEvent = createEvent;
exports.getEventById = getEventById;
exports.updateEvent = updateEvent;
exports.deleteEvent = deleteEvent;
exports.importRoomLayout = importRoomLayout;
exports.getOrgTicketingSummary = getOrgTicketingSummary;
exports.listOrgTicketOrders = listOrgTicketOrders;
exports.listEventTicketOrders = listEventTicketOrders;
const db_1 = require("../db");
const plansConfig_1 = require("../config/plansConfig");
const permissionsService_1 = require("../services/permissionsService");
const roomLayoutService_1 = require("../services/roomLayoutService");
const ticketPricingService_1 = require("../services/ticketPricingService");
const platformSettingsService_1 = require("../services/platformSettingsService");
const donationsAccess_1 = require("../services/donationsAccess");
const tableAssignmentNotificationService_1 = require("../services/tableAssignmentNotificationService");
const prismaJson_1 = require("../utils/prismaJson");
const slug_1 = require("../utils/slug");
const publicVenue_1 = require("../utils/publicVenue");
const eventPlace_1 = require("../utils/eventPlace");
function rejectPaidTicketingIfDisabled(body, res) {
    const wantsPublic = body.isPublic === true || body.isPublic === 'true';
    const wantsPaid = body.ticketingEnabled === true || body.ticketingEnabled === 'true';
    if (wantsPublic && wantsPaid && !(0, platformSettingsService_1.isOnlinePaymentsEnabled)()) {
        res.status(403).json({
            error: 'Les paiements en ligne sont désactivés par la plateforme. Utilisez l’inscription gratuite.',
        });
        return true;
    }
    return false;
}
function serializeEvent(event) {
    const { _count, ...rest } = event;
    const donationsAccess = (0, platformSettingsService_1.getDonationsAccess)();
    const allowedByPlatform = event.tenantId
        ? (0, donationsAccess_1.resolveDonationsAccess)(event.tenantId, donationsAccess).allowed
        : donationsAccess.enabled;
    const donationsConfig = (0, donationsAccess_1.extractEventDonationsConfig)(event.eventPrep);
    return {
        ...rest,
        feedPostCount: _count?.posts ?? 0,
        placeLabel: (0, eventPlace_1.formatEventPlace)(rest),
        donations: donationsConfig
            ? { ...donationsConfig, allowedByPlatform }
            : { enabled: false, targetAmountFc: null, minAmountFc: donationsAccess.minAmountFc, cause: null, suggestedAmountsFc: donationsAccess.defaultSuggestedAmountsFc, donorAttendancePass: true, allowedByPlatform },
    };
}
function eventPlaceData(body, forCreate) {
    const city = parseOptionalString(body.city);
    const commune = parseOptionalString(body.commune);
    const neighborhood = parseOptionalString(body.neighborhood);
    if (forCreate) {
        return {
            city: city ?? null,
            commune: commune ?? null,
            neighborhood: neighborhood ?? null,
        };
    }
    return {
        ...(city !== undefined ? { city } : {}),
        ...(commune !== undefined ? { commune } : {}),
        ...(neighborhood !== undefined ? { neighborhood } : {}),
    };
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
function parseOptionalString(value) {
    if (value === undefined)
        return undefined;
    if (value === null)
        return null;
    const text = String(value).trim();
    return text || null;
}
function parseOptionalInt(value) {
    if (value === undefined)
        return undefined;
    if (value === null || value === '')
        return null;
    const n = Math.round(Number(value));
    return Number.isFinite(n) && n > 0 ? n : null;
}
function parseOptionalDate(value) {
    if (value === undefined)
        return undefined;
    if (value === null || value === '')
        return null;
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? null : d;
}
function parseEventKind(value) {
    if (value === undefined)
        return undefined;
    if (value === null || value === '')
        return null;
    const kind = String(value).trim().toUpperCase();
    return EVENT_KIND_IDS.has(kind) ? kind : null;
}
function eventDossierData(body, forCreate) {
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
async function eventVisibilityData(title, body, existing) {
    const isPublic = body.isPublic === true || body.isPublic === 'true';
    let slug = existing?.slug || null;
    if (isPublic && !slug) {
        slug = await (0, slug_1.uniqueSlug)(title || 'evenement', async (s) => {
            const found = await db_1.prisma.event.findFirst({
                where: { slug: s, ...(existing?.id ? { NOT: { id: existing.id } } : {}) },
            });
            return Boolean(found);
        });
    }
    const ticketingEnabled = isPublic && (body.ticketingEnabled === true || body.ticketingEnabled === 'true');
    const ticketPricingMode = isPublic && ticketingEnabled && body.ticketPricingMode === 'by_zone' ? 'by_zone' : 'global';
    const ticketPriceFc = ticketingEnabled
        ? Math.max(0, Math.round(Number(body.ticketPriceFc) || 0))
        : 0;
    const rawTotal = body.ticketsTotal;
    const ticketsTotal = rawTotal === '' || rawTotal == null || rawTotal === undefined
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
        seatSelectionEnabled: isPublic && (body.seatSelectionEnabled === true || body.seatSelectionEnabled === 'true'),
    };
}
// List all events for the current tenant
async function getEvents(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        const accessible = await (0, permissionsService_1.getAccessibleEventIds)(userId, tenantId);
        const where = accessible === 'all'
            ? { tenantId }
            : { tenantId, id: { in: accessible.length ? accessible : ['__none__'] } };
        const events = await db_1.prisma.event.findMany({
            where,
            include: {
                room: { select: { id: true, name: true, roomType: true, layoutBlueprint: true } },
                _count: { select: { posts: true } },
            },
            orderBy: { date: 'asc' },
        });
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        return res.json({ events: events.map(serializeEvent), access });
    }
    catch (error) {
        console.error('Erreur lors de la récupération des événements:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des événements' });
    }
}
// Create an event under the current tenant
async function createEvent(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        if (!access.canCreateEvents) {
            return res.status(403).json({ error: 'Vous n\'avez pas la permission de créer des événements.' });
        }
        const { title, description, date, location, reminderFrequency, latitude, longitude, roomId, importRoomLayout, guestGuidelines, rsvpForm, themeId } = req.body;
        if (!title || !date || !location) {
            return res.status(400).json({ error: 'Les champs title, date et location sont requis' });
        }
        if (rejectPaidTicketingIfDisabled(req.body, res))
            return;
        const visibility = await eventVisibilityData(title, req.body);
        // Check Plan / Quota before creating event (will be integrated in Phase 4, but let's add a placeholder or simple check)
        const tenant = await db_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            include: { _count: { select: { events: true } } },
        });
        if (tenant) {
            const limits = (0, plansConfig_1.getPlanLimitsForTenant)(tenant.plan, tenant.accountKind);
            if (limits.maxEvents <= 0 || tenant._count.events >= limits.maxEvents) {
                return res.status(403).json({
                    error: limits.maxEvents <= 0
                        ? `La création d’événements n’est pas incluse dans votre forfait ${limits.name}. Choisissez un forfait organisateur.`
                        : `Quota d'événements atteint pour votre forfait ${limits.name} (Max ${limits.maxEvents === 9999 ? 'illimité' : limits.maxEvents}). Veuillez passer à un forfait supérieur.`,
                });
            }
        }
        let tablePlanData;
        if (roomId && importRoomLayout !== false) {
            const room = await db_1.prisma.organizationRoom.findFirst({
                where: { id: roomId, tenantId },
                select: { layoutBlueprint: true },
            });
            if (room?.layoutBlueprint) {
                tablePlanData = (0, roomLayoutService_1.blueprintToTablePlan)(room.layoutBlueprint);
            }
        }
        if (req.body.tablePlan && typeof req.body.tablePlan === 'object') {
            tablePlanData = {
                ...(tablePlanData || {}),
                ...req.body.tablePlan,
            };
        }
        if (req.body.pricingZones !== undefined) {
            tablePlanData = (0, ticketPricingService_1.mergePricingZonesIntoTablePlan)(tablePlanData ?? { tables: [] }, Array.isArray(req.body.pricingZones) ? req.body.pricingZones : []);
        }
        const donationsAccess = (0, platformSettingsService_1.getDonationsAccess)();
        let donationsConfig = null;
        if (req.body.donations !== undefined) {
            if (req.body.donations && typeof req.body.donations === 'object' && req.body.donations.enabled) {
                const accessCheck = (0, donationsAccess_1.resolveDonationsAccess)(tenantId, donationsAccess);
                if (!accessCheck.allowed) {
                    return res.status(403).json({ error: accessCheck.reason });
                }
            }
            donationsConfig = (0, donationsAccess_1.sanitizeEventDonationsConfig)(req.body.donations, donationsAccess);
        }
        const initialEventPrep = {
            ...(req.body.eventPrep && typeof req.body.eventPrep === 'object' ? req.body.eventPrep : {}),
            ...(donationsConfig ? { donations: donationsConfig } : {}),
        };
        const event = await db_1.prisma.event.create({
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
                tablePlan: tablePlanData ? (0, prismaJson_1.toPrismaJson)(tablePlanData) : undefined,
                guestGuidelines: guestGuidelines !== undefined ? (0, prismaJson_1.toPrismaJson)(guestGuidelines) : undefined,
                rsvpForm: rsvpForm !== undefined ? (0, prismaJson_1.toPrismaJson)(rsvpForm) : undefined,
                eventPrep: Object.keys(initialEventPrep).length > 0 ? (0, prismaJson_1.toPrismaJson)(initialEventPrep) : undefined,
                themeId: themeId || null,
                photos: (0, prismaJson_1.toPrismaJson)((0, publicVenue_1.parsePhotoUrls)(req.body.photos)),
                ...(req.body.eventProgram !== undefined
                    ? { eventProgram: (0, prismaJson_1.toPrismaJson)(req.body.eventProgram) }
                    : {}),
                ...visibility,
                ...eventDossierData(req.body, true),
                ...eventPlaceData(req.body, true),
            },
            include: {
                room: { select: { id: true, name: true, roomType: true, layoutBlueprint: true } },
                _count: { select: { posts: true } },
            },
        });
        return res.status(201).json(serializeEvent(event));
    }
    catch (error) {
        console.error('Erreur lors de la création de l\'événement:', error);
        return res.status(500).json({ error: 'Erreur lors de la création de l\'événement' });
    }
}
// Get a single event details
async function getEventById(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const id = req.params.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        if (!(await (0, permissionsService_1.canAccessEvent)(userId, tenantId, id))) {
            return res.status(403).json({ error: 'Accès refusé à cet événement.' });
        }
        const event = await db_1.prisma.event.findFirst({
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
    }
    catch (error) {
        console.error('Erreur lors de la récupération de l\'événement:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération de l\'événement' });
    }
}
// Update an event
async function updateEvent(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const id = req.params.id;
        const { title, description, date, location, reminderFrequency, latitude, longitude, tablePlan, roomId, guestGuidelines, rsvpForm, eventPrep, themeId } = req.body;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        if (!(await (0, permissionsService_1.canManageEvent)(userId, tenantId, id))) {
            return res.status(403).json({ error: 'Vous n\'avez pas la permission de modifier cet événement.' });
        }
        const existingEvent = await db_1.prisma.event.findFirst({
            where: { id, tenantId },
        });
        if (!existingEvent) {
            return res.status(404).json({ error: 'Événement non trouvé ou non autorisé' });
        }
        if (rejectPaidTicketingIfDisabled(req.body, res))
            return;
        const visibility = req.body.isPublic !== undefined
            ? await eventVisibilityData(title || existingEvent.title, req.body, existingEvent)
            : {};
        let mergedTablePlan = tablePlan !== undefined ? tablePlan : undefined;
        if (req.body.pricingZones !== undefined) {
            const base = tablePlan !== undefined ? tablePlan : existingEvent.tablePlan;
            mergedTablePlan = (0, ticketPricingService_1.mergePricingZonesIntoTablePlan)(base, Array.isArray(req.body.pricingZones) ? req.body.pricingZones : []);
        }
        const donationsAccess = (0, platformSettingsService_1.getDonationsAccess)();
        let updatedEventPrep = eventPrep !== undefined
            ? (eventPrep && typeof eventPrep === 'object' ? { ...eventPrep } : {})
            : (existingEvent.eventPrep && typeof existingEvent.eventPrep === 'object'
                ? { ...existingEvent.eventPrep }
                : {});
        if (req.body.donations !== undefined) {
            if (req.body.donations && typeof req.body.donations === 'object' && req.body.donations.enabled) {
                const accessCheck = (0, donationsAccess_1.resolveDonationsAccess)(tenantId, donationsAccess);
                if (!accessCheck.allowed) {
                    return res.status(403).json({ error: accessCheck.reason });
                }
            }
            const sanitized = (0, donationsAccess_1.sanitizeEventDonationsConfig)(req.body.donations, donationsAccess);
            updatedEventPrep = {
                ...updatedEventPrep,
                donations: sanitized,
            };
        }
        const updatedEvent = await db_1.prisma.event.update({
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
                guestGuidelines: guestGuidelines !== undefined ? (0, prismaJson_1.toPrismaJson)(guestGuidelines) : existingEvent.guestGuidelines ?? undefined,
                rsvpForm: rsvpForm !== undefined ? (0, prismaJson_1.toPrismaJson)(rsvpForm) : existingEvent.rsvpForm ?? undefined,
                eventPrep: Object.keys(updatedEventPrep).length > 0 ? (0, prismaJson_1.toPrismaJson)(updatedEventPrep) : (eventPrep !== undefined ? undefined : existingEvent.eventPrep ?? undefined),
                themeId: themeId !== undefined ? (themeId || null) : existingEvent.themeId,
                ...(req.body.photos !== undefined ? { photos: (0, prismaJson_1.toPrismaJson)((0, publicVenue_1.parsePhotoUrls)(req.body.photos)) } : {}),
                ...(req.body.eventProgram !== undefined
                    ? { eventProgram: (0, prismaJson_1.toPrismaJson)(req.body.eventProgram) }
                    : {}),
                ...visibility,
                ...eventDossierData(req.body, false),
                ...eventPlaceData(req.body, false),
            },
            include: {
                room: { select: { id: true, name: true, roomType: true, layoutBlueprint: true } },
                _count: { select: { posts: true } },
            },
        });
        let assignmentNotifications = null;
        let eventForResponse = updatedEvent;
        if (mergedTablePlan !== undefined) {
            assignmentNotifications = await (0, tableAssignmentNotificationService_1.notifyTableAssignmentChanges)({
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
                eventForResponse = await db_1.prisma.event.update({
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
    }
    catch (error) {
        console.error('Erreur lors de la modification de l\'événement:', error);
        return res.status(500).json({ error: 'Erreur lors de la modification de l\'événement' });
    }
}
// Delete an event
async function deleteEvent(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const id = req.params.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        if (!(await (0, permissionsService_1.canManageEvent)(userId, tenantId, id))) {
            return res.status(403).json({ error: 'Vous n\'avez pas la permission de supprimer cet événement.' });
        }
        const existingEvent = await db_1.prisma.event.findFirst({
            where: { id, tenantId },
        });
        if (!existingEvent) {
            return res.status(404).json({ error: 'Événement non trouvé ou non autorisé' });
        }
        await db_1.prisma.event.delete({
            where: { id },
        });
        return res.json({ message: 'Événement supprimé avec succès' });
    }
    catch (error) {
        console.error('Erreur lors de la suppression de l\'événement:', error);
        return res.status(500).json({ error: 'Erreur lors de la suppression de l\'événement' });
    }
}
async function importRoomLayout(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const id = req.params.id;
        const { replaceExisting, preserveAssignments } = req.body;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        if (!(await (0, permissionsService_1.canManageEvent)(userId, tenantId, id))) {
            return res.status(403).json({ error: 'Vous n\'avez pas la permission de modifier cet événement.' });
        }
        const event = await db_1.prisma.event.findFirst({
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
        const existingPlan = event.tablePlan;
        const hasTables = Boolean(existingPlan?.tables && existingPlan.tables.length > 0);
        if (hasTables && !replaceExisting && preserveAssignments !== true) {
            return res.status(409).json({
                error: 'Un plan de table existe déjà. Utilisez replaceExisting ou preserveAssignments.',
                hasExistingPlan: true,
            });
        }
        const blueprint = event.room.layoutBlueprint;
        const keepSeats = preserveAssignments === true || (replaceExisting && preserveAssignments !== false);
        const tablePlan = keepSeats && hasTables
            ? (0, roomLayoutService_1.mergeBlueprintIntoTablePlan)(existingPlan, blueprint)
            : (0, roomLayoutService_1.blueprintToTablePlan)(blueprint);
        const updatedEvent = await db_1.prisma.event.update({
            where: { id },
            data: { tablePlan: (0, prismaJson_1.toPrismaJson)(tablePlan) },
            include: { room: { select: { id: true, name: true, roomType: true, layoutBlueprint: true } } },
        });
        return res.json(updatedEvent);
    }
    catch (error) {
        console.error('Erreur importRoomLayout:', error);
        return res.status(500).json({ error: 'Impossible d\'importer le plan de la salle.' });
    }
}
async function getOrgTicketingSummary(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId)
            return res.status(403).json({ error: 'Tenant non identifié' });
        const accessible = await (0, permissionsService_1.getAccessibleEventIds)(userId, tenantId);
        if (Array.isArray(accessible) && accessible.length === 0) {
            return res.json({
                summary: {
                    totalRevenueFc: 0,
                    paidTicketsCount: 0,
                    pendingTicketsCount: 0,
                    paidOrdersCount: 0,
                    pendingOrdersCount: 0,
                    totalOrdersCount: 0,
                    checkedInGuestsCount: 0,
                },
                events: [],
            });
        }
        const eventFilter = {
            tenantId,
            ...(Array.isArray(accessible) ? { id: { in: accessible } } : {}),
            OR: [{ ticketingEnabled: true }, { ticketOrders: { some: {} } }],
        };
        const events = await db_1.prisma.event.findMany({
            where: eventFilter,
            select: {
                id: true,
                title: true,
                slug: true,
                date: true,
                location: true,
                isPublic: true,
                ticketingEnabled: true,
                ticketPriceFc: true,
                ticketPricingMode: true,
                ticketsSold: true,
                ticketsTotal: true,
                tablePlan: true,
                _count: {
                    select: {
                        ticketOrders: true,
                        guests: true,
                    },
                },
            },
            orderBy: { date: 'desc' },
        });
        const orderWhere = {
            event: { tenantId },
            ...(Array.isArray(accessible) ? { eventId: { in: accessible } } : {}),
        };
        const [paidAggregate, pendingAggregate, totalOrdersCount, checkedInGuestsCount] = await Promise.all([
            db_1.prisma.ticketOrder.aggregate({
                where: { ...orderWhere, status: 'PAID' },
                _sum: { amountFc: true, quantity: true },
                _count: { _all: true },
            }),
            db_1.prisma.ticketOrder.aggregate({
                where: { ...orderWhere, status: 'PENDING' },
                _sum: { amountFc: true, quantity: true },
                _count: { _all: true },
            }),
            db_1.prisma.ticketOrder.count({ where: orderWhere }),
            db_1.prisma.guest.count({
                where: {
                    ticketOrderId: { not: null },
                    checkedInAt: { not: null },
                    event: { tenantId, ...(Array.isArray(accessible) ? { id: { in: accessible } } : {}) },
                },
            }),
        ]);
        return res.json({
            summary: {
                totalRevenueFc: paidAggregate._sum.amountFc || 0,
                paidTicketsCount: paidAggregate._sum.quantity || 0,
                pendingTicketsCount: pendingAggregate._sum.quantity || 0,
                paidOrdersCount: paidAggregate._count._all || 0,
                pendingOrdersCount: pendingAggregate._count._all || 0,
                totalOrdersCount,
                checkedInGuestsCount,
            },
            events,
        });
    }
    catch (error) {
        console.error('getOrgTicketingSummary', error);
        return res.status(500).json({ error: 'Impossible de calculer la synthèse billetterie.' });
    }
}
async function listOrgTicketOrders(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId)
            return res.status(403).json({ error: 'Tenant non identifié' });
        const accessible = await (0, permissionsService_1.getAccessibleEventIds)(userId, tenantId);
        if (Array.isArray(accessible) && accessible.length === 0) {
            return res.json({ orders: [], total: 0 });
        }
        const { eventId, status, q, page, limit } = req.query;
        const where = {
            event: { tenantId },
            ...(Array.isArray(accessible) ? { eventId: { in: accessible } } : {}),
        };
        if (eventId && typeof eventId === 'string' && eventId !== 'all') {
            if (Array.isArray(accessible) && !accessible.includes(eventId)) {
                return res.status(403).json({ error: 'Accès non autorisé à cet événement.' });
            }
            where.eventId = eventId;
        }
        if (status && typeof status === 'string' && status !== 'all') {
            where.status = status.toUpperCase();
        }
        if (q && typeof q === 'string' && q.trim()) {
            const query = q.trim();
            where.OR = [
                { buyerName: { contains: query, mode: 'insensitive' } },
                { buyerEmail: { contains: query, mode: 'insensitive' } },
                { buyerPhone: { contains: query } },
                { flexPayOrderNumber: { contains: query, mode: 'insensitive' } },
                { flexPayReference: { contains: query, mode: 'insensitive' } },
                {
                    guests: {
                        some: {
                            OR: [
                                { firstName: { contains: query, mode: 'insensitive' } },
                                { lastName: { contains: query, mode: 'insensitive' } },
                                { phone: { contains: query } },
                            ],
                        },
                    },
                },
            ];
        }
        const pageSize = Math.min(200, Math.max(1, Number(limit) || 50));
        const pageNum = Math.max(1, Number(page) || 1);
        const [orders, total] = await Promise.all([
            db_1.prisma.ticketOrder.findMany({
                where,
                include: {
                    event: {
                        select: {
                            id: true,
                            title: true,
                            slug: true,
                            date: true,
                            location: true,
                            ticketPricingMode: true,
                            tablePlan: true,
                        },
                    },
                    guests: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            rsvp: true,
                            checkedInAt: true,
                            seatVerified: true,
                            category: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: pageSize,
                skip: (pageNum - 1) * pageSize,
            }),
            db_1.prisma.ticketOrder.count({ where }),
        ]);
        return res.json({ orders, total });
    }
    catch (error) {
        console.error('listOrgTicketOrders', error);
        return res.status(500).json({ error: 'Impossible de charger les billets.' });
    }
}
async function listEventTicketOrders(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const eventId = req.params.eventId;
        if (!tenantId || !userId)
            return res.status(403).json({ error: 'Tenant non identifié' });
        if (!(await (0, permissionsService_1.canAccessEvent)(userId, tenantId, eventId))) {
            return res.status(403).json({ error: 'Accès refusé à cet événement.' });
        }
        const orders = await db_1.prisma.ticketOrder.findMany({
            where: { eventId, event: { tenantId } },
            include: {
                guests: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        rsvp: true,
                        checkedInAt: true,
                        seatVerified: true,
                        category: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        return res.json({ orders });
    }
    catch (error) {
        console.error('listEventTicketOrders', error);
        return res.status(500).json({ error: 'Impossible de charger les commandes.' });
    }
}
