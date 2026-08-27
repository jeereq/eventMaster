"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rowToPlanDefinition = rowToPlanDefinition;
exports.planDefinitionToDbData = planDefinitionToDbData;
exports.seedDefaultSubscriptionPlans = seedDefaultSubscriptionPlans;
exports.syncSubscriptionPlanPolicyFromCode = syncSubscriptionPlanPolicyFromCode;
exports.loadSubscriptionPlansFromDb = loadSubscriptionPlansFromDb;
exports.saveSubscriptionPlansToDb = saveSubscriptionPlansToDb;
const db_1 = require("../db");
const plansConfig_1 = require("../config/plansConfig");
const PLAN_SORT_ORDER = {
    FREE: 0,
    PERSONAL_50: 1,
    PERSONAL_100: 2,
    PERSONAL_200: 3,
    PERSONAL_PLUS: 4,
    STANDARD: 5,
    PREMIUM_1: 6,
    PREMIUM_2: 7,
    ENTERPRISE_1: 8,
    ENTERPRISE_2: 9,
    ENTERPRISE_3: 10,
    VENUE: 11,
    SERVICE: 12,
    CATALOG: 13,
};
function rowToPlanDefinition(row) {
    return {
        name: row.name,
        price: row.price,
        monthlyPriceFc: row.monthlyPriceFc,
        promoActive: row.promoActive,
        promoPrice: row.promoPrice ?? undefined,
        promoMonthlyPriceFc: row.promoMonthlyPriceFc ?? undefined,
        promoLabel: row.promoLabel ?? undefined,
        description: row.description,
        audience: (0, plansConfig_1.parsePlanAudience)(row.audience),
        maxEvents: row.maxEvents,
        maxGuests: row.maxGuests,
        maxTemplates: row.maxTemplates,
        maxRooms: row.maxRooms,
        maxServices: row.maxServices,
        maxOrgManagers: row.maxOrgManagers,
        customTemplates: row.customTemplates,
        customRsvpFields: row.customRsvpFields,
        mockupOcr: row.mockupOcr,
        protocolQr: row.protocolQr,
        seatNotifications: row.seatNotifications,
        roomThemesFixtures: row.roomThemesFixtures,
        adminReports: row.adminReports,
        roomEditorLevel: row.roomEditorLevel,
        commercialNetwork: row.commercialNetwork,
        supportLevel: row.supportLevel,
    };
}
function planDefinitionToDbData(key, def) {
    return {
        name: def.name,
        price: def.price,
        monthlyPriceFc: def.monthlyPriceFc,
        promoActive: Boolean(def.promoActive),
        promoPrice: def.promoPrice ?? null,
        promoMonthlyPriceFc: def.promoMonthlyPriceFc ?? null,
        promoLabel: def.promoLabel ?? null,
        description: def.description,
        audience: def.audience,
        maxEvents: def.maxEvents,
        maxGuests: def.maxGuests,
        maxTemplates: def.maxTemplates,
        maxRooms: def.maxRooms,
        maxServices: def.maxServices,
        maxOrgManagers: def.maxOrgManagers,
        customTemplates: def.customTemplates,
        customRsvpFields: def.customRsvpFields,
        mockupOcr: def.mockupOcr,
        protocolQr: def.protocolQr,
        seatNotifications: def.seatNotifications,
        roomThemesFixtures: def.roomThemesFixtures,
        adminReports: def.adminReports,
        roomEditorLevel: def.roomEditorLevel,
        commercialNetwork: def.commercialNetwork,
        supportLevel: def.supportLevel,
        sortOrder: PLAN_SORT_ORDER[key],
        isActive: true,
    };
}
function rowsToConfiguration(rows) {
    const defaults = (0, plansConfig_1.getDefaultPlans)();
    const result = { ...defaults };
    for (const row of rows) {
        const key = row.id;
        if (!plansConfig_1.PLAN_KEYS.includes(key))
            continue;
        result[key] = rowToPlanDefinition(row);
    }
    return result;
}
async function seedDefaultSubscriptionPlans() {
    const defaults = (0, plansConfig_1.getDefaultPlans)();
    const existing = await db_1.prisma.subscriptionPlan.findMany({ select: { id: true } });
    const have = new Set(existing.map((row) => String(row.id)));
    for (const key of plansConfig_1.PLAN_KEYS) {
        if (have.has(key))
            continue;
        const data = planDefinitionToDbData(key, defaults[key]);
        await db_1.prisma.subscriptionPlan.create({
            data: { id: key, ...data },
        });
    }
}
/**
 * Aligne les quotas / flags produit depuis le code sans écraser prix & promos admin.
 * Appelé au démarrage après seed des forfaits manquants.
 */
async function syncSubscriptionPlanPolicyFromCode() {
    const defaults = (0, plansConfig_1.getDefaultPlans)();
    for (const key of plansConfig_1.PLAN_KEYS) {
        const d = defaults[key];
        await db_1.prisma.subscriptionPlan.updateMany({
            where: { id: key },
            data: {
                name: d.name,
                description: d.description,
                maxEvents: d.maxEvents,
                maxGuests: d.maxGuests,
                maxTemplates: d.maxTemplates,
                maxRooms: d.maxRooms,
                maxServices: d.maxServices,
                maxOrgManagers: d.maxOrgManagers,
                customTemplates: d.customTemplates,
                customRsvpFields: d.customRsvpFields,
                mockupOcr: d.mockupOcr,
                protocolQr: d.protocolQr,
                seatNotifications: d.seatNotifications,
                roomThemesFixtures: d.roomThemesFixtures,
                adminReports: d.adminReports,
                roomEditorLevel: d.roomEditorLevel,
                commercialNetwork: d.commercialNetwork,
                supportLevel: d.supportLevel,
                sortOrder: PLAN_SORT_ORDER[key],
            },
        });
    }
}
/** Charge le catalogue depuis la BD (crée les forfaits manquants) et met à jour le cache. */
async function loadSubscriptionPlansFromDb() {
    await seedDefaultSubscriptionPlans();
    await syncSubscriptionPlanPolicyFromCode();
    const rows = await db_1.prisma.subscriptionPlan.findMany({
        orderBy: { sortOrder: 'asc' },
    });
    const config = rowsToConfiguration(rows);
    (0, plansConfig_1.setPlansCache)(config);
    console.log(`[SubscriptionPlan] ${rows.length} forfait(s) chargés depuis la base.`);
    return config;
}
/** Persiste un catalogue complet (admin) et rafraîchit le cache. */
async function saveSubscriptionPlansToDb(incoming) {
    const defaults = (0, plansConfig_1.getDefaultPlans)();
    const current = (0, plansConfig_1.getCachedPlansConfiguration)();
    const merged = { ...current };
    for (const key of plansConfig_1.PLAN_KEYS) {
        merged[key] = (0, plansConfig_1.mergePlan)(defaults[key], {
            ...current[key],
            ...(incoming[key] || {}),
        });
        const data = planDefinitionToDbData(key, merged[key]);
        await db_1.prisma.subscriptionPlan.upsert({
            where: { id: key },
            create: { id: key, ...data },
            update: data,
        });
    }
    (0, plansConfig_1.setPlansCache)(merged);
    return merged;
}
