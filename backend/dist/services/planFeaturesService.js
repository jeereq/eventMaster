"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanFeatureError = void 0;
exports.planHasFeature = planHasFeature;
exports.isRoomTypeAllowed = isRoomTypeAllowed;
exports.allowsRoomBlueprint = allowsRoomBlueprint;
exports.getTenantPlanSnapshot = getTenantPlanSnapshot;
exports.assertPlanFeature = assertPlanFeature;
exports.assertRoomQuota = assertRoomQuota;
exports.assertOrgManagerQuota = assertOrgManagerQuota;
exports.assertRoomTypeForPlan = assertRoomTypeForPlan;
exports.formatPlanFeaturesResponse = formatPlanFeaturesResponse;
const db_1 = require("../db");
const plansConfig_1 = require("../config/plansConfig");
const ROOM_TYPES_BY_LEVEL = {
    basic: ['SIMPLE'],
    standard: ['SIMPLE', 'BANQUET', 'CONFERENCE'],
    advanced: ['SIMPLE', 'BANQUET', 'CONFERENCE', 'AMPHITHEATER', 'TENT'],
    complete: ['SIMPLE', 'BANQUET', 'CONFERENCE', 'AMPHITHEATER', 'TENT', 'CUSTOM'],
};
function planHasFeature(plan, feature) {
    return Boolean(plan[feature]);
}
function isRoomTypeAllowed(plan, roomType) {
    const allowed = ROOM_TYPES_BY_LEVEL[plan.roomEditorLevel] || ROOM_TYPES_BY_LEVEL.basic;
    return allowed.includes(roomType);
}
function allowsRoomBlueprint(plan, roomType) {
    if (roomType === 'SIMPLE')
        return false;
    if (roomType === 'CUSTOM')
        return plan.roomEditorLevel === 'complete';
    return plan.roomEditorLevel !== 'basic';
}
async function getTenantPlanSnapshot(tenantId) {
    const tenant = await db_1.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
            _count: { select: { events: true, templates: true, rooms: true } },
        },
    });
    if (!tenant)
        return null;
    const features = (0, plansConfig_1.getPlanLimits)(tenant.plan);
    const guestCount = await db_1.prisma.guest.count({
        where: { event: { tenantId } },
    });
    const orgManagers = await db_1.prisma.user.count({
        where: { tenantId, role: 'USER', orgRole: 'MANAGER' },
    });
    return {
        plan: tenant.plan,
        planName: features.name,
        features,
        usage: {
            events: tenant._count.events,
            guests: guestCount,
            templates: tenant._count.templates,
            rooms: tenant._count.rooms,
            orgManagers: orgManagers + (tenant.managerId ? 1 : 0),
        },
    };
}
class PlanFeatureError extends Error {
    statusCode = 403;
    constructor(message) {
        super(message);
        this.name = 'PlanFeatureError';
    }
}
exports.PlanFeatureError = PlanFeatureError;
async function assertPlanFeature(tenantId, feature) {
    const snapshot = await getTenantPlanSnapshot(tenantId);
    if (!snapshot)
        throw new PlanFeatureError('Organisation introuvable.');
    if (!planHasFeature(snapshot.features, feature)) {
        throw new PlanFeatureError(`Fonctionnalité non incluse dans votre forfait ${snapshot.planName}. Passez à un forfait supérieur.`);
    }
    return snapshot.features;
}
async function assertRoomQuota(tenantId) {
    const snapshot = await getTenantPlanSnapshot(tenantId);
    if (!snapshot)
        throw new PlanFeatureError('Organisation introuvable.');
    const max = snapshot.features.maxRooms;
    if (max >= 9999)
        return;
    if (snapshot.usage.rooms >= max) {
        throw new PlanFeatureError(`Quota de salles atteint (${max} max pour ${snapshot.planName}). Passez à un forfait supérieur.`);
    }
}
async function assertOrgManagerQuota(tenantId, addingManager = true) {
    if (!addingManager)
        return;
    const snapshot = await getTenantPlanSnapshot(tenantId);
    if (!snapshot)
        throw new PlanFeatureError('Organisation introuvable.');
    const max = snapshot.features.maxOrgManagers;
    if (max >= 9999)
        return;
    if (snapshot.usage.orgManagers >= max) {
        throw new PlanFeatureError(`Quota de managers organisation atteint (${max} max pour ${snapshot.planName}). Passez à un forfait supérieur.`);
    }
}
async function assertRoomTypeForPlan(tenantId, roomType) {
    const snapshot = await getTenantPlanSnapshot(tenantId);
    if (!snapshot)
        throw new PlanFeatureError('Organisation introuvable.');
    if (!isRoomTypeAllowed(snapshot.features, roomType)) {
        throw new PlanFeatureError(`Le type de salle « ${roomType} » n'est pas disponible avec le forfait ${snapshot.planName}.`);
    }
    return snapshot.features;
}
function formatPlanFeaturesResponse(snapshot) {
    const f = snapshot.features;
    return {
        plan: snapshot.plan,
        planName: snapshot.planName,
        price: f.price,
        description: f.description,
        usage: snapshot.usage,
        limits: {
            maxEvents: f.maxEvents,
            maxGuests: f.maxGuests,
            maxTemplates: f.maxTemplates,
            maxRooms: f.maxRooms,
            maxOrgManagers: f.maxOrgManagers,
        },
        capabilities: {
            protocolQr: f.protocolQr,
            seatNotifications: f.seatNotifications,
            customTemplates: f.customTemplates,
            mockupOcr: f.mockupOcr,
            roomThemesFixtures: f.roomThemesFixtures,
            commercialNetwork: f.commercialNetwork,
            adminReports: f.adminReports,
            roomEditorLevel: f.roomEditorLevel,
            allowedRoomTypes: ROOM_TYPES_BY_LEVEL[f.roomEditorLevel],
            supportLevel: f.supportLevel,
        },
        formattedLimits: {
            maxEvents: f.maxEvents >= 9999 ? 'Illimité' : String(f.maxEvents),
            maxGuests: f.maxGuests >= 99999 ? 'Illimité' : String(f.maxGuests),
            maxTemplates: f.maxTemplates >= 9999 ? 'Illimité' : String(f.maxTemplates),
            maxRooms: f.maxRooms >= 9999 ? 'Illimité' : String(f.maxRooms),
            maxOrgManagers: f.maxOrgManagers >= 9999 ? 'Illimité' : String(f.maxOrgManagers),
            price: (0, plansConfig_1.formatPlanPriceFc)(f.monthlyPriceFc),
        },
    };
}
