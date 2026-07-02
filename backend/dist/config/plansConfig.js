"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_KEYS = void 0;
exports.getDefaultPlans = getDefaultPlans;
exports.getPlansConfiguration = getPlansConfiguration;
exports.getPlanLimits = getPlanLimits;
exports.mergePlansForSave = mergePlansForSave;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.PLAN_KEYS = ['FREE', 'STANDARD', 'PREMIUM', 'ENTERPRISE'];
const settingsFilePath = path_1.default.join(__dirname, 'settings.json');
function getDefaultPlans() {
    return {
        FREE: {
            name: 'Plan Gratuit',
            price: '0 FC',
            description: "Parfait pour tester l'application ou organiser un petit événement.",
            maxEvents: 3,
            maxGuests: 50,
            maxTemplates: 2,
            customTemplates: false,
        },
        STANDARD: {
            name: 'Plan Standard',
            price: '30.000 FC',
            description: 'Idéal pour les événements de taille moyenne.',
            maxEvents: 8,
            maxGuests: 150,
            maxTemplates: 5,
            customTemplates: false,
        },
        PREMIUM: {
            name: 'Plan Premium',
            price: '80.000 FC',
            description: "Conçu pour les organisateurs réguliers d'événements.",
            maxEvents: 20,
            maxGuests: 500,
            maxTemplates: 10,
            customTemplates: true,
        },
        ENTERPRISE: {
            name: 'Plan Enterprise',
            price: '275.000 FC',
            description: 'Pour les grandes agences événementielles ou besoins sur-mesure.',
            maxEvents: 9999,
            maxGuests: 99999,
            maxTemplates: 9999,
            customTemplates: true,
        },
    };
}
function mergePlan(base, override) {
    if (!override)
        return { ...base };
    return {
        name: override.name ?? base.name,
        price: override.price ?? base.price,
        description: override.description ?? base.description,
        maxEvents: override.maxEvents ?? base.maxEvents,
        maxGuests: override.maxGuests ?? base.maxGuests,
        maxTemplates: override.maxTemplates ?? base.maxTemplates,
        customTemplates: override.customTemplates ?? base.customTemplates,
    };
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
    return plans[planKey] || plans.FREE;
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
