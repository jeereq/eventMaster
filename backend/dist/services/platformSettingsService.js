"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsFilePath = exports.DEFAULT_CONTACT_ADMIN_EMAILS = exports.PLATFORM_CITY_CATALOG = exports.DEFAULT_PLATFORM_SETTINGS = exports.DEFAULT_SHOWCASE_ROOM_PLANS = exports.DEFAULT_STUDIO_VISIBILITY = exports.DEFAULT_AUDIO_NOTIFICATIONS = exports.AUDIO_NOTIFICATION_FAMILIES = exports.AUDIO_NOTIFICATION_PRESETS = void 0;
exports.sanitizeStudioVisibility = sanitizeStudioVisibility;
exports.sanitizeShowcaseRoomPlans = sanitizeShowcaseRoomPlans;
exports.sanitizeCommercialPermissions = sanitizeCommercialPermissions;
exports.sanitizeAudioNotifications = sanitizeAudioNotifications;
exports.sanitizeEnabledCities = sanitizeEnabledCities;
exports.sanitizeAuthOtpChannels = sanitizeAuthOtpChannels;
exports.getAuthOtpChannels = getAuthOtpChannels;
exports.defaultAuthOtpMethod = defaultAuthOtpMethod;
exports.resolveAuthOtpMethod = resolveAuthOtpMethod;
exports.assertAuthOtpMethodAllowed = assertAuthOtpMethodAllowed;
exports.isOnlinePaymentsEnabled = isOnlinePaymentsEnabled;
exports.getTicketPaymentProvider = getTicketPaymentProvider;
exports.getSaasPaymentMode = getSaasPaymentMode;
exports.loadPlatformSettings = loadPlatformSettings;
exports.savePlatformSettings = savePlatformSettings;
exports.savePlatformSettingsDurable = savePlatformSettingsDurable;
exports.hydratePlatformSettingsFromDb = hydratePlatformSettingsFromDb;
exports.getPublicSiteConfig = getPublicSiteConfig;
exports.getDonationsAccess = getDonationsAccess;
exports.getSubscriptionDiscountAccess = getSubscriptionDiscountAccess;
exports.getContactNotificationEmails = getContactNotificationEmails;
exports.getContactDestinations = getContactDestinations;
exports.maskSecretsForAdmin = maskSecretsForAdmin;
exports.mergeSettingsUpdate = mergeSettingsUpdate;
exports.getNotificationCredentials = getNotificationCredentials;
exports.getCommercialPermissions = getCommercialPermissions;
exports.hasCommercialPermission = hasCommercialPermission;
exports.canManageShowcasePlans = canManageShowcasePlans;
exports.setCommercialPermissions = setCommercialPermissions;
exports.removeCommercialPermissions = removeCommercialPermissions;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("../db");
const ratePercent_1 = require("../utils/ratePercent");
const aiTokenPricing_1 = require("./aiTokenPricing");
const welcomeAiTokensPolicy_1 = require("./welcomeAiTokensPolicy");
const subscriptionDiscountAccess_1 = require("./subscriptionDiscountAccess");
const donationsAccess_1 = require("./donationsAccess");
const settingsFilePath = path_1.default.join(__dirname, '..', 'config', 'settings.json');
exports.settingsFilePath = settingsFilePath;
const PLATFORM_CONFIG_ID = 'default';
/** Cache processus : source de vérité après hydratation BD (le fichier est un secours local). */
let memoryCache = null;
exports.AUDIO_NOTIFICATION_PRESETS = ['off', 'chime', 'bell', 'soft', 'urgent', 'cosmic', 'fanfare'];
exports.AUDIO_NOTIFICATION_FAMILIES = ['events', 'billing', 'commissions', 'catalog', 'tasks', 'studio'];
exports.DEFAULT_AUDIO_NOTIFICATIONS = {
    enabled: true,
    volume: 70,
    events: 'bell',
    billing: 'urgent',
    commissions: 'chime',
    catalog: 'bell',
    tasks: 'soft',
    studio: 'cosmic',
    studioStepSound: true,
    default: 'chime',
};
exports.DEFAULT_STUDIO_VISIBILITY = {
    budget: true,
    invite: true,
    room: true,
};
function sanitizeStudioVisibility(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    return {
        budget: src.budget !== false,
        invite: src.invite !== false,
        room: src.room !== false,
    };
}
exports.DEFAULT_SHOWCASE_ROOM_PLANS = [
    {
        id: 'banquet-honor',
        name: 'Table d’honneur',
        label: 'Mariage & Table d’Honneur',
        category: 'wedding',
        description: 'Table d’honneur VIP verrouillée avec invités disposés en banquet',
        outlineShape: 'rectangle',
        presetId: 'banquet-honor',
        isPublished: true,
        order: 1,
    },
    {
        id: 'banquet-classic',
        name: 'Banquet classique',
        label: 'Banquet & Réception',
        category: 'banquet',
        description: 'Tables rondes ordonnées en grille avec grande scène de réception',
        outlineShape: 'rectangle',
        presetId: 'banquet-classic',
        isPublished: true,
        order: 2,
    },
    {
        id: 'cocktail',
        name: 'Cocktail & Mange-debout',
        label: 'Cocktail & Mange-debout',
        category: 'cocktail',
        description: 'Espace fluide pour réceptions debout, bar événementiel et zone DJ',
        outlineShape: 'rectangle',
        presetId: 'cocktail',
        isPublished: true,
        order: 3,
    },
    {
        id: 'conference-standard',
        name: 'Conférence standard',
        label: 'Conférence & Séminaire',
        category: 'pro',
        description: 'Rangées de sièges face à la scène principale et pupitre orateur',
        outlineShape: 'rectangle',
        presetId: 'conference-standard',
        isPublished: true,
        order: 4,
    },
    {
        id: 'chairs-ceremony',
        name: 'Allée nuptiale',
        label: 'Cérémonie & Allée Nuptiale',
        category: 'wedding',
        description: 'Double rangée avec allée centrale majestueuse et arche florale',
        outlineShape: 'rectangle',
        presetId: 'chairs-ceremony',
        isPublished: true,
        order: 5,
    },
    {
        id: 'banquet-ushape',
        name: 'Banquet en U',
        label: 'Banquet en U',
        category: 'banquet',
        description: 'Tables rectangulaires conviviales ouvertes vers la scène',
        outlineShape: 'rectangle',
        presetId: 'banquet-ushape',
        isPublished: true,
        order: 6,
    },
    {
        id: 'boardroom',
        name: 'Salle de conseil VIP',
        label: 'Salle de Conseil VIP',
        category: 'pro',
        description: 'Grande table de direction avec fauteuils et écran de présentation',
        outlineShape: 'rectangle',
        presetId: 'boardroom',
        isPublished: true,
        order: 7,
    },
    {
        id: 'chairs-theater',
        name: 'Auditorium & Théâtre',
        label: 'Auditorium & Théâtre',
        category: 'pro',
        description: 'Disposition en gradins théâtraux avec visibilité optimale',
        outlineShape: 'rectangle',
        presetId: 'chairs-theater',
        isPublished: true,
        order: 8,
    },
    {
        id: 'classroom',
        name: 'Formation & Classe',
        label: 'Formation & Classe',
        category: 'pro',
        description: 'Tables de travail partagées avec sièges et allées de circulation',
        outlineShape: 'rectangle',
        presetId: 'classroom',
        isPublished: true,
        order: 9,
    },
];
function sanitizeShowcaseRoomPlans(raw) {
    if (!Array.isArray(raw) || raw.length === 0) {
        return exports.DEFAULT_SHOWCASE_ROOM_PLANS;
    }
    return raw.map((item, index) => {
        const src = item && typeof item === 'object' ? item : {};
        return {
            id: String(src.id || `showcase-${index + 1}`),
            name: String(src.name || 'Plan sans titre').trim(),
            label: String(src.label || src.name || 'Modèle').trim(),
            category: String(src.category || 'other').trim(),
            description: String(src.description || '').trim(),
            outlineShape: src.outlineShape ? String(src.outlineShape) : 'rectangle',
            blueprint: src.blueprint && typeof src.blueprint === 'object' ? src.blueprint : undefined,
            presetId: src.presetId ? String(src.presetId) : undefined,
            isPublished: src.isPublished !== false,
            order: Number.isFinite(Number(src.order)) ? Number(src.order) : index + 1,
            createdAt: src.createdAt ? String(src.createdAt) : undefined,
            updatedAt: src.updatedAt ? String(src.updatedAt) : undefined,
            updatedBy: src.updatedBy ? String(src.updatedBy) : undefined,
        };
    });
}
function sanitizeCommercialPermissions(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return {};
    }
    const result = {};
    for (const [userId, perms] of Object.entries(raw)) {
        if (perms && typeof perms === 'object' && !Array.isArray(perms)) {
            const p = perms;
            result[userId] = {
                canManageTemplates: Boolean(p.canManageTemplates),
                canManageMessageTemplates: Boolean(p.canManageMessageTemplates),
                canManageCatalog: Boolean(p.canManageCatalog),
                canManageEvents: Boolean(p.canManageEvents),
                canManageGuests: Boolean(p.canManageGuests),
                canManageShowcasePlans: Boolean(p.canManageShowcasePlans),
            };
        }
    }
    return result;
}
function isAudioPreset(value) {
    return typeof value === 'string' && exports.AUDIO_NOTIFICATION_PRESETS.includes(value);
}
function sanitizeAudioNotifications(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const volume = Number(src.volume);
    return {
        enabled: src.enabled !== false,
        volume: Number.isFinite(volume) ? Math.max(0, Math.min(100, Math.round(volume))) : exports.DEFAULT_AUDIO_NOTIFICATIONS.volume,
        events: isAudioPreset(src.events) ? src.events : exports.DEFAULT_AUDIO_NOTIFICATIONS.events,
        billing: isAudioPreset(src.billing) ? src.billing : exports.DEFAULT_AUDIO_NOTIFICATIONS.billing,
        commissions: isAudioPreset(src.commissions) ? src.commissions : exports.DEFAULT_AUDIO_NOTIFICATIONS.commissions,
        catalog: isAudioPreset(src.catalog) ? src.catalog : exports.DEFAULT_AUDIO_NOTIFICATIONS.catalog,
        tasks: isAudioPreset(src.tasks) ? src.tasks : exports.DEFAULT_AUDIO_NOTIFICATIONS.tasks,
        studio: isAudioPreset(src.studio) ? src.studio : exports.DEFAULT_AUDIO_NOTIFICATIONS.studio,
        studioStepSound: src.studioStepSound !== false,
        default: isAudioPreset(src.default) ? src.default : exports.DEFAULT_AUDIO_NOTIFICATIONS.default,
    };
}
exports.DEFAULT_PLATFORM_SETTINGS = {
    platformName: 'EventMaster',
    platformTagline: 'Préparez votre événement en un clic.',
    supportEmail: process.env.CONTACT_ADMIN_EMAIL || 'mingandajeereq@gmail.com',
    supportPhone: '+243 817 125 577',
    supportWhatsApp: process.env.CONTACT_ADMIN_WHATSAPP || '+243817125577',
    whatsappNote: 'WhatsApp disponible',
    addressLine1: 'Boulevard du 30 Juin, Gombe',
    addressLine2: 'Kinshasa, RD Congo',
    addressShort: 'Boulevard du 30 Juin, Gombe, Kinshasa, RDC',
    supportHours: 'Lun–Sam, 8h–20h (heure de Kinshasa)',
    maintenanceMode: false,
    maintenanceMessage: 'La plateforme est temporairement en maintenance. Merci de réessayer dans quelques instants.',
    allowRegistration: true,
    onlinePaymentsEnabled: true,
    saasPaymentMode: 'manual',
    ticketPaymentProvider: 'flexpay_card',
    flexPayCardToken: process.env.FLEXPAY_CARD_TOKEN || '',
    flexPayCardMerchant: process.env.FLEXPAY_CARD_MERCHANT || '',
    flexPayCardPayUrl: process.env.FLEXPAY_CARD_PAY_URL || '',
    flexPayCardCheckUrl: process.env.FLEXPAY_CARD_CHECK_URL || '',
    flexPayMobilePayUrl: process.env.FLEXPAY_MOBILE_PAY_URL || '',
    flexPayMobileCheckUrl: process.env.FLEXPAY_MOBILE_CHECK_URL || '',
    brandPrimary: '',
    brandAccent: '',
    ultramsgInstanceId: process.env.ULTRAMSG_INSTANCE_ID || '',
    ultramsgToken: process.env.ULTRAMSG_TOKEN || '',
    sendgridApiKey: process.env.SENDGRID_API_KEY || '',
    sendgridFrom: process.env.SENDGRID_FROM || 'no-reply@eventmaster.cd',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    marketplaceCommissionRate: 0.08,
    marketplaceDepositRate: 0.3,
    commercialFirstCommissionRate: 0.3,
    commercialRenewalCommissionRate: 0.2,
    usdExchangeRateCdf: 2800,
    enabledCities: ['Kinshasa', 'Lubumbashi', 'Goma'],
    authOtpChannels: 'BOTH',
    aiTokenPriceCdf: aiTokenPricing_1.DEFAULT_AI_TOKEN_PRICE_CDF,
    aiTokenMinPurchaseCdf: aiTokenPricing_1.DEFAULT_AI_TOKEN_MIN_PURCHASE_CDF,
    welcomeAiGrants: welcomeAiTokensPolicy_1.DEFAULT_WELCOME_GRANT_RULES,
    audioNotifications: exports.DEFAULT_AUDIO_NOTIFICATIONS,
    studioVisibility: exports.DEFAULT_STUDIO_VISIBILITY,
    commercialPermissions: {},
    subscriptionDiscountAccess: subscriptionDiscountAccess_1.DEFAULT_SUBSCRIPTION_DISCOUNT_ACCESS,
    donationsAccess: donationsAccess_1.DEFAULT_DONATIONS_ACCESS,
    showcaseRoomPlans: exports.DEFAULT_SHOWCASE_ROOM_PLANS,
};
exports.PLATFORM_CITY_CATALOG = [
    'Kinshasa',
    'Lubumbashi',
    'Goma',
    'Kisangani',
    'Bukavu',
    'Matadi',
    'Kolwezi',
];
function sanitizeEnabledCities(value) {
    const allowed = new Set(exports.PLATFORM_CITY_CATALOG);
    const raw = Array.isArray(value) ? value : exports.DEFAULT_PLATFORM_SETTINGS.enabledCities;
    const picked = raw.map((item) => String(item || '').trim()).filter((item) => allowed.has(item));
    const ordered = exports.PLATFORM_CITY_CATALOG.filter((city) => picked.includes(city));
    if (!ordered.includes('Kinshasa') && !ordered.includes('Lubumbashi')) {
        return ['Kinshasa', ...ordered];
    }
    return ordered.length > 0 ? [...ordered] : ['Kinshasa'];
}
function sanitizeAuthOtpChannels(value) {
    const raw = String(value || '').trim().toUpperCase();
    if (raw === 'EMAIL' || raw === 'WHATSAPP' || raw === 'BOTH')
        return raw;
    return 'BOTH';
}
function getAuthOtpChannels(settings = loadPlatformSettings()) {
    return sanitizeAuthOtpChannels(settings.authOtpChannels);
}
function defaultAuthOtpMethod(settings = loadPlatformSettings()) {
    return getAuthOtpChannels(settings) === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL';
}
/**
 * Résout une méthode OTP demandée selon la config plateforme.
 * Si un seul canal est autorisé, force ce canal (même si la demande diffère).
 */
function resolveAuthOtpMethod(requested, settings = loadPlatformSettings()) {
    const channels = getAuthOtpChannels(settings);
    if (channels === 'EMAIL')
        return 'EMAIL';
    if (channels === 'WHATSAPP')
        return 'WHATSAPP';
    return String(requested || '').trim().toUpperCase() === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL';
}
function assertAuthOtpMethodAllowed(requested, settings = loadPlatformSettings()) {
    const channels = getAuthOtpChannels(settings);
    const raw = String(requested || '').trim().toUpperCase();
    if (!raw) {
        return { ok: true, method: defaultAuthOtpMethod(settings) };
    }
    if (raw !== 'EMAIL' && raw !== 'WHATSAPP') {
        return { ok: false, error: 'Méthode de validation invalide.' };
    }
    if (channels === 'BOTH' || channels === raw) {
        return { ok: true, method: raw };
    }
    return {
        ok: false,
        error: channels === 'EMAIL'
            ? 'Seule la validation par e-mail est activée sur la plateforme.'
            : 'Seule la validation par WhatsApp est activée sur la plateforme.',
    };
}
function ensureSettingsDir() {
    const dir = path_1.default.dirname(settingsFilePath);
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
}
function phoneToHref(phone) {
    const digits = phone.replace(/[^\d+]/g, '');
    return digits ? `tel:${digits}` : 'tel:';
}
/** Paiements en ligne (billets événements + forfaits SaaS si mode FlexPay). */
function isOnlinePaymentsEnabled(settings = loadPlatformSettings()) {
    return settings.onlinePaymentsEnabled !== false;
}
function getTicketPaymentProvider(_settings = loadPlatformSettings()) {
    return 'flexpay_card';
}
function getSaasPaymentMode(settings = loadPlatformSettings()) {
    return settings.saasPaymentMode === 'flexpay' ? 'flexpay' : 'manual';
}
function mergeStoredSettings(raw) {
    const { plans: _ignored, ...rest } = (raw || {});
    return normalizeStoredRates({ ...exports.DEFAULT_PLATFORM_SETTINGS, ...rest });
}
function readSettingsFromFile() {
    try {
        if (fs_1.default.existsSync(settingsFilePath)) {
            const raw = JSON.parse(fs_1.default.readFileSync(settingsFilePath, 'utf-8'));
            return mergeStoredSettings(raw);
        }
    }
    catch (error) {
        console.warn('[PlatformSettings] Impossible de lire settings.json:', error);
    }
    return null;
}
function writeSettingsFileBestEffort(settings) {
    try {
        ensureSettingsDir();
        fs_1.default.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), 'utf-8');
    }
    catch (error) {
        console.warn('[PlatformSettings] Écriture settings.json ignorée (volume éphémère ou lecture seule).', error);
    }
}
function loadPlatformSettings() {
    if (memoryCache)
        return memoryCache;
    memoryCache = readSettingsFromFile() || { ...exports.DEFAULT_PLATFORM_SETTINGS };
    return memoryCache;
}
function normalizeStoredRates(settings) {
    const parsedUsdRate = Number(settings.usdExchangeRateCdf);
    return {
        ...settings,
        marketplaceCommissionRate: (0, ratePercent_1.parseRateInput)(settings.marketplaceCommissionRate, 0.08, 0.01, 0.5),
        marketplaceDepositRate: (0, ratePercent_1.parseRateInput)(settings.marketplaceDepositRate, 0.3, 0.05, 0.9),
        commercialFirstCommissionRate: (0, ratePercent_1.parseRateInput)(settings.commercialFirstCommissionRate, 0.3, 0, 1),
        commercialRenewalCommissionRate: (0, ratePercent_1.parseRateInput)(settings.commercialRenewalCommissionRate, 0.2, 0, 1),
        usdExchangeRateCdf: Number.isFinite(parsedUsdRate) && parsedUsdRate > 0 ? Math.round(parsedUsdRate) : 2800,
        enabledCities: sanitizeEnabledCities(settings.enabledCities),
        authOtpChannels: sanitizeAuthOtpChannels(settings.authOtpChannels),
        aiTokenPriceCdf: (0, aiTokenPricing_1.sanitizeAiTokenPriceCdf)(settings.aiTokenPriceCdf),
        aiTokenMinPurchaseCdf: (0, aiTokenPricing_1.sanitizeAiTokenMinPurchaseCdf)(settings.aiTokenMinPurchaseCdf, (0, aiTokenPricing_1.sanitizeAiTokenPriceCdf)(settings.aiTokenPriceCdf)),
        welcomeAiGrants: (0, welcomeAiTokensPolicy_1.sanitizeWelcomeGrantRules)(settings.welcomeAiGrants),
        audioNotifications: sanitizeAudioNotifications(settings.audioNotifications),
        studioVisibility: sanitizeStudioVisibility(settings.studioVisibility),
        commercialPermissions: sanitizeCommercialPermissions(settings.commercialPermissions),
        subscriptionDiscountAccess: (0, subscriptionDiscountAccess_1.sanitizeSubscriptionDiscountAccess)(settings.subscriptionDiscountAccess),
        donationsAccess: (0, donationsAccess_1.sanitizeDonationsAccess)(settings.donationsAccess),
    };
}
function buildNextSettings(partial) {
    const current = loadPlatformSettings();
    const { plans: _plans, ...rest } = partial;
    const next = { ...current };
    const keys = Object.keys(exports.DEFAULT_PLATFORM_SETTINGS);
    for (const key of keys) {
        if (key in rest && rest[key] !== undefined) {
            next[key] = rest[key];
        }
    }
    next.marketplaceCommissionRate = (0, ratePercent_1.parseRateInput)(next.marketplaceCommissionRate, 0.08, 0.01, 0.5);
    next.marketplaceDepositRate = (0, ratePercent_1.parseRateInput)(next.marketplaceDepositRate, 0.3, 0.05, 0.9);
    next.commercialFirstCommissionRate = (0, ratePercent_1.parseRateInput)(next.commercialFirstCommissionRate, 0.3, 0, 1);
    next.commercialRenewalCommissionRate = (0, ratePercent_1.parseRateInput)(next.commercialRenewalCommissionRate, 0.2, 0, 1);
    const parsedUsdRate = Number(next.usdExchangeRateCdf);
    next.usdExchangeRateCdf = Number.isFinite(parsedUsdRate) && parsedUsdRate > 0 ? Math.round(parsedUsdRate) : 2800;
    next.enabledCities = sanitizeEnabledCities(next.enabledCities);
    next.authOtpChannels = sanitizeAuthOtpChannels(next.authOtpChannels);
    next.aiTokenPriceCdf = (0, aiTokenPricing_1.sanitizeAiTokenPriceCdf)(next.aiTokenPriceCdf);
    next.aiTokenMinPurchaseCdf = (0, aiTokenPricing_1.sanitizeAiTokenMinPurchaseCdf)(next.aiTokenMinPurchaseCdf, next.aiTokenPriceCdf);
    next.welcomeAiGrants = (0, welcomeAiTokensPolicy_1.sanitizeWelcomeGrantRules)(next.welcomeAiGrants);
    next.audioNotifications = sanitizeAudioNotifications(next.audioNotifications);
    next.studioVisibility = sanitizeStudioVisibility(next.studioVisibility);
    next.commercialPermissions = sanitizeCommercialPermissions(next.commercialPermissions);
    next.subscriptionDiscountAccess = (0, subscriptionDiscountAccess_1.sanitizeSubscriptionDiscountAccess)(next.subscriptionDiscountAccess);
    next.donationsAccess = (0, donationsAccess_1.sanitizeDonationsAccess)(next.donationsAccess);
    next.showcaseRoomPlans = sanitizeShowcaseRoomPlans(next.showcaseRoomPlans);
    next.ticketPaymentProvider = 'flexpay_card';
    next.saasPaymentMode = next.saasPaymentMode === 'flexpay' ? 'flexpay' : 'manual';
    next.onlinePaymentsEnabled = next.onlinePaymentsEnabled !== false;
    return next;
}
async function persistPlatformConfigToDb(settings) {
    const payload = JSON.parse(JSON.stringify(settings));
    await db_1.prisma.platformConfig.upsert({
        where: { id: PLATFORM_CONFIG_ID },
        create: { id: PLATFORM_CONFIG_ID, payload },
        update: { payload },
    });
}
function applySettingsToCache(next) {
    memoryCache = next;
    writeSettingsFileBestEffort(next);
    return next;
}
function savePlatformSettings(partial) {
    const next = applySettingsToCache(buildNextSettings(partial));
    void persistPlatformConfigToDb(next).catch((error) => {
        console.error('[PlatformSettings] Persistance en base échouée:', error);
    });
    return next;
}
/** Sauvegarde admin : cache + fichier local + Postgres (survit aux déploiements). */
async function savePlatformSettingsDurable(partial) {
    const previous = loadPlatformSettings();
    const next = applySettingsToCache(buildNextSettings(partial));
    try {
        await persistPlatformConfigToDb(next);
        return next;
    }
    catch (error) {
        applySettingsToCache(previous);
        throw error;
    }
}
/** Charge les réglages depuis Postgres au boot, ou y recopie fichier/défauts si la table est vide. */
async function hydratePlatformSettingsFromDb() {
    try {
        const row = await db_1.prisma.platformConfig.findUnique({ where: { id: PLATFORM_CONFIG_ID } });
        if (row?.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)) {
            memoryCache = mergeStoredSettings(row.payload);
            writeSettingsFileBestEffort(memoryCache);
            console.log('[PlatformSettings] Réglages chargés depuis la base.');
            return;
        }
        const seed = loadPlatformSettings();
        await persistPlatformConfigToDb(seed);
        console.log('[PlatformSettings] Réglages initiaux enregistrés en base.');
    }
    catch (error) {
        console.warn('[PlatformSettings] Hydratation BD impossible — fichier ou défauts.', error);
        loadPlatformSettings();
    }
}
function getPublicSiteConfig(settings = loadPlatformSettings()) {
    return {
        platformName: settings.platformName,
        platformTagline: settings.platformTagline,
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
        supportPhoneHref: phoneToHref(settings.supportPhone),
        whatsappNote: settings.whatsappNote,
        addressLine1: settings.addressLine1,
        addressLine2: settings.addressLine2,
        addressShort: settings.addressShort || `${settings.addressLine1}, ${settings.addressLine2}`,
        supportHours: settings.supportHours,
        maintenanceMode: Boolean(settings.maintenanceMode),
        maintenanceMessage: settings.maintenanceMessage,
        allowRegistration: settings.allowRegistration !== false,
        onlinePaymentsEnabled: isOnlinePaymentsEnabled(settings),
        saasPaymentMode: getSaasPaymentMode(settings),
        ticketPaymentProvider: getTicketPaymentProvider(settings),
        brandPrimary: settings.brandPrimary || '',
        brandAccent: settings.brandAccent || '',
        marketplaceCommissionRate: (0, ratePercent_1.parseRateInput)(settings.marketplaceCommissionRate, 0.08, 0.01, 0.5),
        marketplaceDepositRate: (0, ratePercent_1.parseRateInput)(settings.marketplaceDepositRate, 0.3, 0.05, 0.9),
        marketplaceCommissionPercent: (0, ratePercent_1.rateToPercent)((0, ratePercent_1.parseRateInput)(settings.marketplaceCommissionRate, 0.08, 0.01, 0.5)),
        marketplaceDepositPercent: (0, ratePercent_1.rateToPercent)((0, ratePercent_1.parseRateInput)(settings.marketplaceDepositRate, 0.3, 0.05, 0.9)),
        commercialFirstCommissionRate: (0, ratePercent_1.parseRateInput)(settings.commercialFirstCommissionRate, 0.3, 0, 1),
        commercialRenewalCommissionRate: (0, ratePercent_1.parseRateInput)(settings.commercialRenewalCommissionRate, 0.2, 0, 1),
        commercialFirstCommissionPercent: (0, ratePercent_1.rateToPercent)((0, ratePercent_1.parseRateInput)(settings.commercialFirstCommissionRate, 0.3, 0, 1)),
        commercialRenewalCommissionPercent: (0, ratePercent_1.rateToPercent)((0, ratePercent_1.parseRateInput)(settings.commercialRenewalCommissionRate, 0.2, 0, 1)),
        usdExchangeRateCdf: Number(settings.usdExchangeRateCdf) > 0 ? Math.round(Number(settings.usdExchangeRateCdf)) : 2800,
        enabledCities: sanitizeEnabledCities(settings.enabledCities),
        authOtpChannels: sanitizeAuthOtpChannels(settings.authOtpChannels),
        aiTokenPriceCdf: (0, aiTokenPricing_1.sanitizeAiTokenPriceCdf)(settings.aiTokenPriceCdf),
        aiTokenMinPurchaseCdf: (0, aiTokenPricing_1.sanitizeAiTokenMinPurchaseCdf)(settings.aiTokenMinPurchaseCdf, (0, aiTokenPricing_1.sanitizeAiTokenPriceCdf)(settings.aiTokenPriceCdf)),
        welcomeAiGrants: (0, welcomeAiTokensPolicy_1.sanitizeWelcomeGrantRules)(settings.welcomeAiGrants),
        audioNotifications: sanitizeAudioNotifications(settings.audioNotifications),
        studioVisibility: sanitizeStudioVisibility(settings.studioVisibility),
        subscriptionDiscountAccess: (() => {
            const access = (0, subscriptionDiscountAccess_1.sanitizeSubscriptionDiscountAccess)(settings.subscriptionDiscountAccess);
            return {
                enabled: access.enabled,
                periodStart: access.periodStart,
                periodEnd: access.periodEnd,
            };
        })(),
        donationsAccess: (0, donationsAccess_1.sanitizeDonationsAccess)(settings.donationsAccess),
    };
}
function getDonationsAccess(settings = loadPlatformSettings()) {
    return (0, donationsAccess_1.sanitizeDonationsAccess)(settings.donationsAccess);
}
function getSubscriptionDiscountAccess(settings = loadPlatformSettings()) {
    return (0, subscriptionDiscountAccess_1.sanitizeSubscriptionDiscountAccess)(settings.subscriptionDiscountAccess);
}
exports.DEFAULT_CONTACT_ADMIN_EMAILS = [
    'mingandajeereq@gmail.com',
    'contact.eventmaster@neevo.app',
];
/**
 * Résout la liste des e-mails destinataires des messages du formulaire de contact public.
 * Garantit toujours l'envoi à mingandajeereq@gmail.com et contact.eventmaster@neevo.app.
 */
function getContactNotificationEmails(settings = loadPlatformSettings()) {
    const configured = settings.supportEmail?.trim();
    const envEmail = process.env.CONTACT_ADMIN_EMAIL?.trim();
    const rawList = [
        ...exports.DEFAULT_CONTACT_ADMIN_EMAILS,
        ...(configured ? configured.split(/[,;\s]+/) : []),
        ...(envEmail ? envEmail.split(/[,;\s]+/) : []),
    ];
    return Array.from(new Set(rawList
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0 && e.includes('@'))));
}
function getContactDestinations(settings = loadPlatformSettings()) {
    const emails = getContactNotificationEmails(settings);
    return {
        email: settings.supportEmail || emails[0] || exports.DEFAULT_PLATFORM_SETTINGS.supportEmail,
        emails,
        whatsapp: settings.supportWhatsApp || exports.DEFAULT_PLATFORM_SETTINGS.supportWhatsApp,
        platformName: settings.platformName || exports.DEFAULT_PLATFORM_SETTINGS.platformName,
    };
}
/** Masque les secrets pour l’API admin (affichage partiel). */
function maskSecretsForAdmin(settings) {
    const mask = (v) => (v && v.length > 8 ? `${v.slice(0, 4)}…${v.slice(-4)}` : v ? '••••••••' : '');
    return {
        ...settings,
        sendgridApiKey: settings.sendgridApiKey ? mask(settings.sendgridApiKey) : '',
        ultramsgToken: settings.ultramsgToken ? mask(settings.ultramsgToken) : '',
        twilioAuthToken: settings.twilioAuthToken ? mask(settings.twilioAuthToken) : '',
        flexPayCardToken: settings.flexPayCardToken ? mask(settings.flexPayCardToken) : '',
        sendgridConfigured: Boolean(settings.sendgridApiKey?.trim() && settings.sendgridFrom?.trim()),
        ultramsgConfigured: Boolean(settings.ultramsgInstanceId?.trim() && settings.ultramsgToken?.trim()),
    };
}
/**
 * Merge admin PUT body : ne remplace un secret que s’il est fourni en clair
 * (pas une valeur déjà masquée avec « … »).
 */
function mergeSettingsUpdate(current, body) {
    const secretKeys = [
        'sendgridApiKey',
        'ultramsgToken',
        'twilioAuthToken',
        'flexPayCardToken',
    ];
    const next = { ...body };
    for (const key of secretKeys) {
        const val = next[key];
        if (typeof val !== 'string' || !val.trim() || val.includes('…') || val.includes('••••')) {
            delete next[key];
        }
    }
    return next;
}
/** Credentials notifications = settings plateforme + fallback env. */
function getNotificationCredentials(settings = loadPlatformSettings()) {
    const pick = (fromSettings, envKey, fallback = '') => {
        if (fromSettings?.trim())
            return fromSettings.trim();
        const fromEnv = process.env[envKey];
        if (fromEnv?.trim())
            return fromEnv.trim();
        return fallback;
    };
    return {
        sendgridApiKey: pick(settings.sendgridApiKey, 'SENDGRID_API_KEY'),
        sendgridFrom: pick(settings.sendgridFrom, 'SENDGRID_FROM', 'no-reply@eventmaster.cd'),
        twilioSid: pick(settings.twilioAccountSid, 'TWILIO_ACCOUNT_SID'),
        twilioAuthToken: pick(settings.twilioAuthToken, 'TWILIO_AUTH_TOKEN'),
        twilioPhone: pick(settings.twilioPhoneNumber, 'TWILIO_PHONE_NUMBER'),
        ultramsgInstanceId: pick(settings.ultramsgInstanceId, 'ULTRAMSG_INSTANCE_ID'),
        ultramsgToken: pick(settings.ultramsgToken, 'ULTRAMSG_TOKEN'),
    };
}
function getCommercialPermissions(userId) {
    const settings = loadPlatformSettings();
    return settings.commercialPermissions?.[userId] || {};
}
function hasCommercialPermission(userId, perm) {
    const userPerms = getCommercialPermissions(userId);
    return Boolean(userPerms[perm]);
}
/** Vérifie si un utilisateur a le droit de gérer les plans vitrine 2D/3D (Super Admin ou Commercial habilité). */
function canManageShowcasePlans(user) {
    if (!user)
        return false;
    if (user.role === 'SUPER_ADMIN')
        return true;
    if (user.role === 'COMMERCIAL' && user.id && hasCommercialPermission(user.id, 'canManageShowcasePlans')) {
        return true;
    }
    return false;
}
async function setCommercialPermissions(userId, permissions) {
    const settings = loadPlatformSettings();
    const current = { ...(settings.commercialPermissions || {}) };
    current[userId] = {
        canManageTemplates: Boolean(permissions.canManageTemplates),
        canManageMessageTemplates: Boolean(permissions.canManageMessageTemplates),
        canManageCatalog: Boolean(permissions.canManageCatalog),
        canManageEvents: Boolean(permissions.canManageEvents),
        canManageGuests: Boolean(permissions.canManageGuests),
        canManageShowcasePlans: Boolean(permissions.canManageShowcasePlans),
    };
    await savePlatformSettingsDurable({ commercialPermissions: current });
}
async function removeCommercialPermissions(userId) {
    const settings = loadPlatformSettings();
    if (!settings.commercialPermissions?.[userId])
        return;
    const current = { ...settings.commercialPermissions };
    delete current[userId];
    await savePlatformSettingsDurable({ commercialPermissions: current });
}
