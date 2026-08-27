"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YEAR_DURATION_DAYS = exports.QUARTER_DURATION_DAYS = exports.MONTH_DURATION_DAYS = exports.PAID_PLAN_KEYS = exports.B2B_PLAN_KEYS = exports.VENDOR_PLAN_KEYS = exports.B2C_PLAN_KEYS = exports.PLAN_KEYS = exports.ANNUAL_PERIOD_COUNT_DEFAULT = exports.ANNUAL_PERIOD_COUNT_B2C = exports.ANNUAL_DISCOUNT_PERCENT = void 0;
exports.setPlansCache = setPlansCache;
exports.getCachedPlansConfiguration = getCachedPlansConfiguration;
exports.parsePlanAudience = parsePlanAudience;
exports.formatPlanPriceFc = formatPlanPriceFc;
exports.annualMonthlyEquivalent = annualMonthlyEquivalent;
exports.getDefaultPlans = getDefaultPlans;
exports.mergePlan = mergePlan;
exports.getCatalogMonthlyPriceFc = getCatalogMonthlyPriceFc;
exports.getEffectiveMonthlyPriceFc = getEffectiveMonthlyPriceFc;
exports.getPlansConfiguration = getPlansConfiguration;
exports.getPlanLimits = getPlanLimits;
exports.applyAccountKindToPlan = applyAccountKindToPlan;
exports.getPlanLimitsForTenant = getPlanLimitsForTenant;
exports.mergePlansForSave = mergePlansForSave;
exports.isPaidPlan = isPaidPlan;
exports.paidPlanKeysForAccountKind = paidPlanKeysForAccountKind;
exports.isPlanAllowedForAccountKind = isPlanAllowedForAccountKind;
exports.accountKindForPlanAssignment = accountKindForPlanAssignment;
exports.planAudienceMismatchMessage = planAudienceMismatchMessage;
exports.normalizePlanKey = normalizePlanKey;
exports.isB2cPlanKey = isB2cPlanKey;
exports.resolveDurationDaysForPlan = resolveDurationDaysForPlan;
exports.isAnnualDurationDays = isAnnualDurationDays;
exports.annualPeriodCountForPlanKey = annualPeriodCountForPlanKey;
exports.periodAmountToInvoiceBase = periodAmountToInvoiceBase;
exports.annualPayableFromPeriod = annualPayableFromPeriod;
exports.annualPromoPayableFromPeriod = annualPromoPayableFromPeriod;
exports.getPlanBaseAmount = getPlanBaseAmount;
exports.resolveDefaultPromoApprovedAmount = resolveDefaultPromoApprovedAmount;
exports.resolveDefaultSubscriptionDiscountOptions = resolveDefaultSubscriptionDiscountOptions;
exports.billingCycleFromDurationDays = billingCycleFromDurationDays;
exports.durationDaysFromBillingCycle = durationDaysFromBillingCycle;
/** Réduction appliquée au total annuel (12 mois B2B / 4 trimestres B2C). */
exports.ANNUAL_DISCOUNT_PERCENT = 10;
exports.ANNUAL_PERIOD_COUNT_B2C = 4;
exports.ANNUAL_PERIOD_COUNT_DEFAULT = 12;
exports.PLAN_KEYS = [
    'FREE',
    'PERSONAL_50',
    'PERSONAL_100',
    'PERSONAL_200',
    'PERSONAL_PLUS',
    'STANDARD',
    'PREMIUM_1',
    'PREMIUM_2',
    'ENTERPRISE_1',
    'ENTERPRISE_2',
    'ENTERPRISE_3',
    'VENUE',
    'SERVICE',
    'CATALOG',
];
exports.B2C_PLAN_KEYS = [
    'PERSONAL_50',
    'PERSONAL_100',
    'PERSONAL_200',
    'PERSONAL_PLUS',
];
exports.VENDOR_PLAN_KEYS = ['VENUE', 'SERVICE', 'CATALOG'];
exports.B2B_PLAN_KEYS = exports.PLAN_KEYS.filter((k) => !exports.B2C_PLAN_KEYS.includes(k) && !exports.VENDOR_PLAN_KEYS.includes(k));
exports.PAID_PLAN_KEYS = exports.PLAN_KEYS.filter((k) => k !== 'FREE');
/** Cache hydraté depuis la table SubscriptionPlan (démarrage serveur / save admin). */
let plansCache = null;
function setPlansCache(plans) {
    plansCache = plans;
}
function getCachedPlansConfiguration() {
    return plansCache ?? getDefaultPlans();
}
function parsePlanAudience(raw) {
    if (raw === 'B2C' || raw === 'VENUE' || raw === 'SERVICE' || raw === 'CATALOG')
        return raw;
    return 'B2B';
}
function formatPlanPriceFc(amount) {
    return `${amount.toLocaleString('fr-FR')} FC`;
}
/** Équivalent d’une période déjà réduit (affichage secondaire). */
function annualMonthlyEquivalent(monthlyFc) {
    const discounted = Math.round(monthlyFc * (1 - exports.ANNUAL_DISCOUNT_PERCENT / 100));
    return formatPlanPriceFc(discounted);
}
function organizerPlan(rest) {
    return {
        ...rest,
        maxServices: rest.maxServices ?? 0,
        customRsvpFields: rest.customRsvpFields ?? true,
    };
}
function personalPlan(rest) {
    return organizerPlan({
        ...rest,
        audience: 'B2C',
        maxEvents: 3,
        maxTemplates: 9999,
        maxRooms: 2,
        maxServices: 0,
        maxOrgManagers: 1,
        customTemplates: true,
        customRsvpFields: true,
        mockupOcr: true,
        protocolQr: true,
        seatNotifications: true,
        roomThemesFixtures: true,
        adminReports: true,
        roomEditorLevel: 'complete',
        commercialNetwork: false,
        supportLevel: 'email',
    });
}
function getDefaultPlans() {
    return {
        FREE: organizerPlan({
            name: 'Essentiel',
            price: '0 FC',
            monthlyPriceFc: 0,
            description: 'Découverte : tester EventMaster — flux invitations (RSVP, plan de table, QR, PDF/GPS) ou 1 salle / 1 prestation.',
            audience: 'B2B',
            maxEvents: 3,
            maxGuests: 50,
            maxTemplates: 2,
            maxRooms: 1,
            maxServices: 1,
            maxOrgManagers: 1,
            customTemplates: false,
            mockupOcr: false,
            protocolQr: true,
            seatNotifications: true,
            roomThemesFixtures: false,
            adminReports: false,
            roomEditorLevel: 'basic',
            commercialNetwork: false,
            supportLevel: 'community',
        }),
        PERSONAL_50: personalPlan({
            name: 'Particulier 50',
            price: '60.000 FC',
            monthlyPriceFc: 60000,
            description: 'Fête privée jusqu’à 50 invités : organisation complète (QR, modèles, éditeur 2D/3D complet), 3 événements, 2 salles — sans catalogue. Facturation trimestrielle.',
            maxGuests: 50,
        }),
        PERSONAL_100: personalPlan({
            name: 'Particulier 100',
            price: '90.000 FC',
            monthlyPriceFc: 90000,
            description: 'Fête privée jusqu’à 100 invités : organisation complète (QR, modèles, éditeur 2D/3D complet), 3 événements, 2 salles — sans catalogue. Facturation trimestrielle.',
            maxGuests: 100,
        }),
        PERSONAL_200: personalPlan({
            name: 'Particulier 200',
            price: '120.000 FC',
            monthlyPriceFc: 120000,
            description: 'Fête privée jusqu’à 200 invités : organisation complète (QR, modèles, éditeur 2D/3D complet), 3 événements, 2 salles — sans catalogue. Facturation trimestrielle.',
            maxGuests: 200,
        }),
        PERSONAL_PLUS: personalPlan({
            name: 'Particulier +200',
            price: '180.000 FC',
            monthlyPriceFc: 180000,
            description: 'Grande fête privée (plus de 200 invités) : organisation complète avec éditeur 2D/3D complet, invités illimités, 3 événements, 2 salles — sans catalogue. Facturation trimestrielle.',
            maxGuests: 99999,
        }),
        STANDARD: organizerPlan({
            name: 'Business',
            price: '30.000 FC',
            monthlyPriceFc: 30000,
            description: 'B2B — plusieurs réceptions par an : invitations, protocole QR, PDF/GPS dès RSVP.',
            audience: 'B2B',
            maxEvents: 8,
            maxGuests: 150,
            maxTemplates: 5,
            maxRooms: 3,
            maxOrgManagers: 3,
            customTemplates: false,
            mockupOcr: false,
            protocolQr: true,
            seatNotifications: true,
            roomThemesFixtures: true,
            adminReports: false,
            roomEditorLevel: 'standard',
            commercialNetwork: false,
            supportLevel: 'email',
        }),
        PREMIUM_1: organizerPlan({
            name: 'Premium',
            price: '55.000 FC',
            monthlyPriceFc: 55000,
            description: 'B2B — salles 2D avancées (thèmes, scénographie), modèles personnalisés et équipe élargie.',
            audience: 'B2B',
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
        }),
        PREMIUM_2: organizerPlan({
            name: 'Premium Plus',
            price: '85.000 FC',
            monthlyPriceFc: 85000,
            description: 'B2B — protocole complet, OCR maquette, notifications siège et gestion multi-salles.',
            audience: 'B2B',
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
        }),
        ENTERPRISE_1: organizerPlan({
            name: 'Enterprise',
            price: '350.000 FC',
            monthlyPriceFc: 350000,
            description: 'B2B — grandes organisations : volume élevé, éditeur de salle complet, rapports et support prioritaire.',
            audience: 'B2B',
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
        }),
        ENTERPRISE_2: organizerPlan({
            name: 'Enterprise Pro',
            price: '525.000 FC',
            monthlyPriceFc: 525000,
            description: 'B2B — agences événementielles : volume élevé, éditeur complet et support dédié.',
            audience: 'B2B',
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
            commercialNetwork: false,
            supportLevel: 'dedicated',
        }),
        ENTERPRISE_3: organizerPlan({
            name: 'Enterprise Unlimited',
            price: '700.000 FC',
            monthlyPriceFc: 700000,
            description: 'B2B — illimité, multi-agences, SLA 24/7 et onboarding dédié.',
            audience: 'B2B',
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
            commercialNetwork: false,
            supportLevel: 'sla247',
        }),
        VENUE: {
            name: 'Salle',
            price: '14.900 FC',
            monthlyPriceFc: 14900,
            description: 'Gestionnaire de salles : salles illimitées, éditeur 2D/3D complet — sans prestations, sans événements ni invités.',
            audience: 'VENUE',
            maxEvents: 0,
            maxGuests: 0,
            maxTemplates: 0,
            maxRooms: 9999,
            maxServices: 0,
            maxOrgManagers: 3,
            customTemplates: false,
            mockupOcr: false,
            protocolQr: false,
            seatNotifications: false,
            roomThemesFixtures: true,
            adminReports: false,
            roomEditorLevel: 'complete',
            commercialNetwork: false,
            supportLevel: 'email',
            customRsvpFields: false,
        },
        SERVICE: {
            name: 'Prestataire',
            price: '9.900 FC',
            monthlyPriceFc: 9900,
            description: 'Prestataire : prestations illimitées (traiteur, photo, DJ…) avec photos, vidéos, rayon et calendrier — sans salles, sans événements ni invités.',
            audience: 'SERVICE',
            maxEvents: 0,
            maxGuests: 0,
            maxTemplates: 0,
            maxRooms: 0,
            maxServices: 9999,
            maxOrgManagers: 2,
            customTemplates: false,
            mockupOcr: false,
            protocolQr: false,
            seatNotifications: false,
            roomThemesFixtures: false,
            adminReports: false,
            roomEditorLevel: 'basic',
            commercialNetwork: false,
            supportLevel: 'email',
            customRsvpFields: false,
        },
        CATALOG: {
            name: 'Salle & presta',
            price: '19.900 FC',
            monthlyPriceFc: 19900,
            description: 'Les deux : salles et prestations illimitées (éditeur complet) — sans événements ni invités.',
            audience: 'CATALOG',
            maxEvents: 0,
            maxGuests: 0,
            maxTemplates: 0,
            maxRooms: 9999,
            maxServices: 9999,
            maxOrgManagers: 3,
            customTemplates: false,
            mockupOcr: false,
            protocolQr: false,
            seatNotifications: false,
            roomThemesFixtures: true,
            adminReports: false,
            roomEditorLevel: 'complete',
            commercialNetwork: false,
            supportLevel: 'email',
            customRsvpFields: false,
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
        audience: override.audience ?? base.audience,
        maxEvents: override.maxEvents ?? base.maxEvents,
        maxGuests: override.maxGuests ?? base.maxGuests,
        maxTemplates: override.maxTemplates ?? base.maxTemplates,
        maxRooms: override.maxRooms ?? base.maxRooms,
        maxServices: override.maxServices ?? base.maxServices,
        maxOrgManagers: override.maxOrgManagers ?? base.maxOrgManagers,
        customTemplates: override.customTemplates ?? base.customTemplates,
        customRsvpFields: override.customRsvpFields ?? base.customRsvpFields ?? true,
        mockupOcr: override.mockupOcr ?? base.mockupOcr,
        protocolQr: override.protocolQr ?? base.protocolQr,
        seatNotifications: override.seatNotifications ?? base.seatNotifications,
        roomThemesFixtures: override.roomThemesFixtures ?? base.roomThemesFixtures,
        adminReports: override.adminReports ?? base.adminReports,
        roomEditorLevel: override.roomEditorLevel ?? base.roomEditorLevel,
        commercialNetwork: override.commercialNetwork ?? base.commercialNetwork,
        supportLevel: override.supportLevel ?? base.supportLevel,
    };
    if (override.price && override.monthlyPriceFc == null) {
        const digits = override.price.replace(/[^\d]/g, '');
        merged.monthlyPriceFc = digits ? parseInt(digits, 10) : base.monthlyPriceFc;
    }
    merged.price = formatPlanPriceFc(merged.monthlyPriceFc);
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
    // Source de vérité runtime : cache BD. Fallback : défauts code.
    return getCachedPlansConfiguration();
}
function getPlanLimits(planKey) {
    const plans = getPlansConfiguration();
    const normalized = normalizePlanKey(planKey);
    return plans[normalized] || plans.FREE;
}
/**
 * Quotas effectifs : un compte VENDOR (essai ou payant) n’organise pas d’événements.
 * Un compte client n’a aucun quota SaaS.
 */
function applyAccountKindToPlan(plan, kind, planKey) {
    if (kind === 'CLIENT') {
        return {
            ...plan,
            maxEvents: 0,
            maxGuests: 0,
            maxTemplates: 0,
            maxRooms: 0,
            maxServices: 0,
            maxOrgManagers: 0,
            customRsvpFields: false,
        };
    }
    if (kind === 'VENDOR') {
        const isFree = planKey ? normalizePlanKey(planKey) === 'FREE' : false;
        return {
            ...plan,
            maxEvents: 0,
            maxGuests: 0,
            maxTemplates: 0,
            customRsvpFields: false,
            ...(isFree
                ? { description: 'Essai catalogue : 1 salle et 1 prestation, sans organisation d’événements.' }
                : {}),
        };
    }
    return plan;
}
function getPlanLimitsForTenant(planKey, accountKind) {
    const normalized = normalizePlanKey(planKey);
    return applyAccountKindToPlan(getPlanLimits(normalized), accountKind, normalized);
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
const B2B_PAID_KEYS = exports.B2B_PLAN_KEYS.filter((k) => k !== 'FREE');
/** Forfaits payants proposés selon le type de compte (essai FREE exclu). */
function paidPlanKeysForAccountKind(kind) {
    switch (kind) {
        case 'CLIENT':
            return [];
        case 'VENDOR':
            return [...exports.VENDOR_PLAN_KEYS];
        case 'BOTH':
            return [...exports.B2C_PLAN_KEYS, ...exports.VENDOR_PLAN_KEYS, ...B2B_PAID_KEYS];
        case 'ORGANIZER':
        default:
            return [...exports.B2C_PLAN_KEYS, ...B2B_PAID_KEYS];
    }
}
function isPlanAllowedForAccountKind(planKey, kind) {
    const normalized = normalizePlanKey(planKey);
    if (normalized === 'FREE')
        return true;
    return paidPlanKeysForAccountKind(kind).includes(normalized);
}
/** Type de compte à poser quand un admin assigne un forfait. */
function accountKindForPlanAssignment(planKey, currentKind) {
    const normalized = normalizePlanKey(planKey);
    if (currentKind === 'CLIENT' && normalized === 'FREE')
        return 'CLIENT';
    if (currentKind && isPlanAllowedForAccountKind(normalized, currentKind)) {
        return currentKind;
    }
    if (normalized === 'VENUE' || normalized === 'SERVICE')
        return 'VENDOR';
    if (normalized === 'CATALOG')
        return 'BOTH';
    if (exports.B2C_PLAN_KEYS.includes(normalized))
        return 'ORGANIZER';
    if (currentKind === 'VENDOR' || currentKind === 'BOTH')
        return 'BOTH';
    return 'ORGANIZER';
}
function planAudienceMismatchMessage(planKey, kind) {
    if (kind === 'CLIENT') {
        return 'Un compte client ne souscrit pas d’abonnement SaaS. Passez organisateur ou prestataire dans Mon compte, puis choisissez un forfait.';
    }
    const plan = getPlanLimits(planKey);
    if (kind === 'VENDOR') {
        return `Le forfait ${plan.name} n’est pas destiné aux comptes catalogue. Choisissez Salle, Prestataire ou Salle & presta.`;
    }
    return `Le forfait ${plan.name} n’est pas destiné à ce type de compte. Choisissez un forfait adapté (organisation ou catalogue).`;
}
/** Rétrocompatibilité : anciens identifiants Prisma */
function normalizePlanKey(planKey) {
    const legacy = {
        PREMIUM: 'PREMIUM_2',
        ENTERPRISE: 'ENTERPRISE_2',
        PERSONAL: 'PERSONAL_200',
    };
    if (legacy[planKey])
        return legacy[planKey];
    if (exports.PLAN_KEYS.includes(planKey))
        return planKey;
    return 'FREE';
}
exports.MONTH_DURATION_DAYS = 30;
exports.QUARTER_DURATION_DAYS = 90;
exports.YEAR_DURATION_DAYS = 365;
function isB2cPlanKey(planKey) {
    const normalized = normalizePlanKey(planKey);
    return exports.B2C_PLAN_KEYS.includes(normalized);
}
/** Durée de licence / facture : trimestre B2C, mois sinon — ou durée demandée (ex. annuel 365 j, −10 %). */
function resolveDurationDaysForPlan(planKey, requested) {
    if (requested != null && Number.isFinite(requested) && requested > 0)
        return requested;
    if (isB2cPlanKey(planKey))
        return exports.QUARTER_DURATION_DAYS;
    return exports.MONTH_DURATION_DAYS;
}
function isAnnualDurationDays(durationDays) {
    return durationDays != null && Number.isFinite(durationDays) && durationDays >= exports.YEAR_DURATION_DAYS;
}
/** 4 trimestres (Particulier) ou 12 mois (B2B / marketplace). */
function annualPeriodCountForPlanKey(planKey) {
    return isB2cPlanKey(planKey) ? exports.ANNUAL_PERIOD_COUNT_B2C : exports.ANNUAL_PERIOD_COUNT_DEFAULT;
}
/** Prix catalogue d’une facture : 1 période, ou N périodes si annuel (avant −10 %). */
function periodAmountToInvoiceBase(periodFc, planKey, durationDays) {
    const period = Math.max(0, Math.round(periodFc));
    if (period <= 0)
        return 0;
    if (isAnnualDurationDays(durationDays)) {
        return period * annualPeriodCountForPlanKey(planKey);
    }
    return period;
}
function annualPayableFromPeriod(periodFc, planKey) {
    const base = periodAmountToInvoiceBase(periodFc, planKey, exports.YEAR_DURATION_DAYS);
    return Math.round(base * (1 - exports.ANNUAL_DISCOUNT_PERCENT / 100));
}
function annualPromoPayableFromPeriod(catalogPeriodFc, promoPeriodFc, planKey) {
    const catalogAnnual = annualPayableFromPeriod(catalogPeriodFc, planKey);
    const promoAnnual = Math.round(Math.max(0, promoPeriodFc) * annualPeriodCountForPlanKey(planKey));
    return Math.min(promoAnnual, catalogAnnual);
}
function getPlanBaseAmount(planKey, durationDays) {
    if (normalizePlanKey(planKey) === 'FREE')
        return 0;
    return periodAmountToInvoiceBase(getCatalogMonthlyPriceFc(planKey), planKey, durationDays);
}
function resolveDefaultPromoApprovedAmount(planKey, durationDays, promoPeriodFc) {
    if (isAnnualDurationDays(durationDays)) {
        return annualPromoPayableFromPeriod(getCatalogMonthlyPriceFc(planKey), promoPeriodFc, planKey);
    }
    return Math.max(0, Math.round(promoPeriodFc));
}
/**
 * Remises par défaut pour checkout / facture / renouvellement :
 * 1) promo catalogue (période ou annuel = min(promo×N, catalogue annuel −10 %))
 * 2) sinon annuel → −ANNUAL_DISCOUNT_PERCENT sur la base catalogue
 * 3) sinon aucune remise
 */
function resolveDefaultSubscriptionDiscountOptions(planKey, durationDays) {
    if (normalizePlanKey(planKey) === 'FREE')
        return {};
    const planDef = getPlanLimits(planKey);
    if (planDef.promoActive && planDef.promoMonthlyPriceFc != null && planDef.promoMonthlyPriceFc >= 0) {
        return {
            approvedAmount: resolveDefaultPromoApprovedAmount(planKey, durationDays, planDef.promoMonthlyPriceFc),
        };
    }
    if (isAnnualDurationDays(durationDays)) {
        return { discountPercent: exports.ANNUAL_DISCOUNT_PERCENT };
    }
    return {};
}
function billingCycleFromDurationDays(durationDays) {
    return isAnnualDurationDays(durationDays) ? 'ANNUAL' : 'PERIOD';
}
function durationDaysFromBillingCycle(planKey, billingCycle) {
    if (billingCycle === 'ANNUAL')
        return exports.YEAR_DURATION_DAYS;
    return resolveDurationDaysForPlan(planKey);
}
