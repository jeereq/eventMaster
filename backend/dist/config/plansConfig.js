"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAID_PLAN_KEYS = exports.PLAN_KEYS = exports.ANNUAL_DISCOUNT_PERCENT = void 0;
exports.formatPlanPriceFc = formatPlanPriceFc;
exports.annualMonthlyEquivalent = annualMonthlyEquivalent;
exports.getDefaultPlans = getDefaultPlans;
exports.getCatalogMonthlyPriceFc = getCatalogMonthlyPriceFc;
exports.getEffectiveMonthlyPriceFc = getEffectiveMonthlyPriceFc;
exports.getPlansConfiguration = getPlansConfiguration;
exports.getPlanLimits = getPlanLimits;
exports.mergePlansForSave = mergePlansForSave;
exports.isPaidPlan = isPaidPlan;
exports.normalizePlanKey = normalizePlanKey;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/** Réduction appliquée à la facturation annuelle (équivalent mensuel affiché). */
exports.ANNUAL_DISCOUNT_PERCENT = 10;
exports.PLAN_KEYS = [
    'FREE',
    'STANDARD',
    'PREMIUM_1',
    'PREMIUM_2',
    'ENTERPRISE_1',
    'ENTERPRISE_2',
    'ENTERPRISE_3',
];
exports.PAID_PLAN_KEYS = exports.PLAN_KEYS.filter((k) => k !== 'FREE');
const settingsFilePath = path_1.default.join(__dirname, 'settings.json');
function formatPlanPriceFc(amount) {
    return `${amount.toLocaleString('fr-FR')} FC`;
}
function annualMonthlyEquivalent(monthlyFc) {
    const discounted = Math.round(monthlyFc * (1 - exports.ANNUAL_DISCOUNT_PERCENT / 100));
    return formatPlanPriceFc(discounted);
}
function getDefaultPlans() {
    return {
        FREE: {
            name: 'Essentials',
            price: '0 FC',
            monthlyPriceFc: 0,
            description: "Découvrir EventMaster et organiser un premier événement.",
            maxEvents: 3,
            maxGuests: 50,
            maxTemplates: 2,
            maxRooms: 1,
            maxOrgManagers: 1,
            customTemplates: false,
            mockupOcr: false,
            protocolQr: false,
            seatNotifications: false,
            roomThemesFixtures: false,
            adminReports: false,
            roomEditorLevel: 'basic',
            commercialNetwork: false,
            supportLevel: 'community',
        },
        STANDARD: {
            name: 'Business',
            price: '30.000 FC',
            monthlyPriceFc: 30000,
            description: 'Équipes qui gèrent plusieurs réceptions par an avec protocole QR.',
            maxEvents: 8,
            maxGuests: 150,
            maxTemplates: 5,
            maxRooms: 3,
            maxOrgManagers: 3,
            customTemplates: false,
            mockupOcr: false,
            protocolQr: true,
            seatNotifications: false,
            roomThemesFixtures: true,
            adminReports: false,
            roomEditorLevel: 'standard',
            commercialNetwork: false,
            supportLevel: 'email',
        },
        PREMIUM_1: {
            name: 'Business Premium 1',
            price: '55.000 FC',
            monthlyPriceFc: 55000,
            description: 'Salles 2D avancées, modèles personnalisés et équipe élargie.',
            maxEvents: 12,
            maxGuests: 500,
            maxTemplates: 8,
            maxRooms: 5,
            maxOrgManagers: 5,
            customTemplates: true,
            mockupOcr: false,
            protocolQr: true,
            seatNotifications: true,
            roomThemesFixtures: true,
            adminReports: false,
            roomEditorLevel: 'advanced',
            commercialNetwork: false,
            supportLevel: 'email',
        },
        PREMIUM_2: {
            name: 'Business Premium 2',
            price: '85.000 FC',
            monthlyPriceFc: 85000,
            description: 'Protocole complet, notifications siège et gestion multi-salles.',
            maxEvents: 20,
            maxGuests: 1000,
            maxTemplates: 10,
            maxRooms: 10,
            maxOrgManagers: 10,
            customTemplates: true,
            mockupOcr: true,
            protocolQr: true,
            seatNotifications: true,
            roomThemesFixtures: true,
            adminReports: false,
            roomEditorLevel: 'advanced',
            commercialNetwork: false,
            supportLevel: 'priority',
        },
        ENTERPRISE_1: {
            name: 'Business Enterprise 1',
            price: '350.000 FC',
            monthlyPriceFc: 350000,
            description: 'Grandes organisations : volume élevé, rapports et support prioritaire.',
            maxEvents: 40,
            maxGuests: 3500,
            maxTemplates: 18,
            maxRooms: 25,
            maxOrgManagers: 18,
            customTemplates: true,
            mockupOcr: true,
            protocolQr: true,
            seatNotifications: true,
            roomThemesFixtures: true,
            adminReports: true,
            roomEditorLevel: 'complete',
            commercialNetwork: false,
            supportLevel: 'priority',
        },
        ENTERPRISE_2: {
            name: 'Business Enterprise 2',
            price: '525.000 FC',
            monthlyPriceFc: 525000,
            description: 'Agences événementielles avec réseau commercial et commissions 20 %.',
            maxEvents: 70,
            maxGuests: 5000,
            maxTemplates: 30,
            maxRooms: 50,
            maxOrgManagers: 30,
            customTemplates: true,
            mockupOcr: true,
            protocolQr: true,
            seatNotifications: true,
            roomThemesFixtures: true,
            adminReports: true,
            roomEditorLevel: 'complete',
            commercialNetwork: true,
            supportLevel: 'dedicated',
        },
        ENTERPRISE_3: {
            name: 'Business Enterprise 3',
            price: '700.000 FC',
            monthlyPriceFc: 700000,
            description: 'Illimité, multi-agences, SLA 24/7 et onboarding dédié.',
            maxEvents: 9999,
            maxGuests: 99999,
            maxTemplates: 9999,
            maxRooms: 9999,
            maxOrgManagers: 9999,
            customTemplates: true,
            mockupOcr: true,
            protocolQr: true,
            seatNotifications: true,
            roomThemesFixtures: true,
            adminReports: true,
            roomEditorLevel: 'complete',
            commercialNetwork: true,
            supportLevel: 'sla247',
        },
    };
}
function mergePlan(base, override) {
    if (!override)
        return { ...base };
    const merged = {
        name: override.name ?? base.name,
        price: override.price ?? base.price,
        monthlyPriceFc: override.monthlyPriceFc ?? base.monthlyPriceFc,
        promoActive: override.promoActive ?? base.promoActive ?? false,
        promoPrice: override.promoPrice ?? base.promoPrice,
        promoMonthlyPriceFc: override.promoMonthlyPriceFc ?? base.promoMonthlyPriceFc,
        promoLabel: override.promoLabel ?? base.promoLabel,
        description: override.description ?? base.description,
        maxEvents: override.maxEvents ?? base.maxEvents,
        maxGuests: override.maxGuests ?? base.maxGuests,
        maxTemplates: override.maxTemplates ?? base.maxTemplates,
        maxRooms: override.maxRooms ?? base.maxRooms,
        maxOrgManagers: override.maxOrgManagers ?? base.maxOrgManagers,
        customTemplates: override.customTemplates ?? base.customTemplates,
        mockupOcr: override.mockupOcr ?? base.mockupOcr,
        protocolQr: override.protocolQr ?? base.protocolQr,
        seatNotifications: override.seatNotifications ?? base.seatNotifications,
        roomThemesFixtures: override.roomThemesFixtures ?? base.roomThemesFixtures,
        adminReports: override.adminReports ?? base.adminReports,
        roomEditorLevel: override.roomEditorLevel ?? base.roomEditorLevel,
        commercialNetwork: override.commercialNetwork ?? base.commercialNetwork,
        supportLevel: override.supportLevel ?? base.supportLevel,
    };
    if (override.price && !override.monthlyPriceFc) {
        const digits = override.price.replace(/[^\d]/g, '');
        merged.monthlyPriceFc = digits ? parseInt(digits, 10) : base.monthlyPriceFc;
    }
    if (override.promoPrice && override.promoMonthlyPriceFc === undefined) {
        const digits = override.promoPrice.replace(/[^\d]/g, '');
        merged.promoMonthlyPriceFc = digits ? parseInt(digits, 10) : base.promoMonthlyPriceFc;
    }
    return merged;
}
function getCatalogMonthlyPriceFc(planKey) {
    return getPlanLimits(planKey).monthlyPriceFc;
}
function getEffectiveMonthlyPriceFc(planKey) {
    const plan = getPlanLimits(planKey);
    if (plan.promoActive && plan.promoMonthlyPriceFc != null && plan.promoMonthlyPriceFc >= 0) {
        return plan.promoMonthlyPriceFc;
    }
    return plan.monthlyPriceFc;
}
function getPlansConfiguration() {
    const defaults = getDefaultPlans();
    try {
        if (fs_1.default.existsSync(settingsFilePath)) {
            const settings = JSON.parse(fs_1.default.readFileSync(settingsFilePath, 'utf-8'));
            if (settings.plans && typeof settings.plans === 'object') {
                const merged = { ...defaults };
                for (const key of exports.PLAN_KEYS) {
                    merged[key] = mergePlan(defaults[key], settings.plans[key]);
                }
                return merged;
            }
        }
    }
    catch (error) {
        console.error('[Plans Config] Erreur de lecture settings.json:', error);
    }
    return defaults;
}
function getPlanLimits(planKey) {
    const plans = getPlansConfiguration();
    const normalized = normalizePlanKey(planKey);
    return plans[normalized] || plans.FREE;
}
function mergePlansForSave(incomingPlans) {
    const defaults = getDefaultPlans();
    const current = getPlansConfiguration();
    const merged = { ...current };
    for (const key of exports.PLAN_KEYS) {
        merged[key] = mergePlan(defaults[key], {
            ...current[key],
            ...(incomingPlans[key] || {}),
        });
    }
    return merged;
}
function isPaidPlan(planKey) {
    return planKey !== 'FREE' && exports.PLAN_KEYS.includes(planKey);
}
/** Rétrocompatibilité : anciens identifiants Prisma */
function normalizePlanKey(planKey) {
    const legacy = {
        PREMIUM: 'PREMIUM_2',
        ENTERPRISE: 'ENTERPRISE_2',
    };
    if (legacy[planKey])
        return legacy[planKey];
    if (exports.PLAN_KEYS.includes(planKey))
        return planKey;
    return 'FREE';
}
