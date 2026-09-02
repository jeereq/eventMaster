"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsFilePath = exports.DEFAULT_PLATFORM_SETTINGS = void 0;
exports.isOnlinePaymentsEnabled = isOnlinePaymentsEnabled;
exports.getTicketPaymentProvider = getTicketPaymentProvider;
exports.getSaasPaymentMode = getSaasPaymentMode;
exports.loadPlatformSettings = loadPlatformSettings;
exports.savePlatformSettings = savePlatformSettings;
exports.getPublicSiteConfig = getPublicSiteConfig;
exports.getContactDestinations = getContactDestinations;
exports.maskSecretsForAdmin = maskSecretsForAdmin;
exports.mergeSettingsUpdate = mergeSettingsUpdate;
exports.getNotificationCredentials = getNotificationCredentials;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ratePercent_1 = require("../utils/ratePercent");
const settingsFilePath = path_1.default.join(__dirname, '..', 'config', 'settings.json');
exports.settingsFilePath = settingsFilePath;
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
};
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
function loadPlatformSettings() {
    try {
        if (fs_1.default.existsSync(settingsFilePath)) {
            const raw = JSON.parse(fs_1.default.readFileSync(settingsFilePath, 'utf-8'));
            const { plans: _ignored, ...rest } = raw;
            const merged = { ...exports.DEFAULT_PLATFORM_SETTINGS, ...rest };
            return normalizeStoredRates(merged);
        }
    }
    catch (error) {
        console.warn('[PlatformSettings] Impossible de lire settings.json:', error);
    }
    return { ...exports.DEFAULT_PLATFORM_SETTINGS };
}
function normalizeStoredRates(settings) {
    return {
        ...settings,
        marketplaceCommissionRate: (0, ratePercent_1.parseRateInput)(settings.marketplaceCommissionRate, 0.08, 0.01, 0.5),
        marketplaceDepositRate: (0, ratePercent_1.parseRateInput)(settings.marketplaceDepositRate, 0.3, 0.05, 0.9),
        commercialFirstCommissionRate: (0, ratePercent_1.parseRateInput)(settings.commercialFirstCommissionRate, 0.3, 0, 1),
        commercialRenewalCommissionRate: (0, ratePercent_1.parseRateInput)(settings.commercialRenewalCommissionRate, 0.2, 0, 1),
    };
}
function savePlatformSettings(partial) {
    ensureSettingsDir();
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
    next.ticketPaymentProvider = 'flexpay_card';
    next.saasPaymentMode = next.saasPaymentMode === 'flexpay' ? 'flexpay' : 'manual';
    next.onlinePaymentsEnabled = next.onlinePaymentsEnabled !== false;
    fs_1.default.writeFileSync(settingsFilePath, JSON.stringify(next, null, 2), 'utf-8');
    return next;
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
    };
}
function getContactDestinations(settings = loadPlatformSettings()) {
    return {
        email: settings.supportEmail || exports.DEFAULT_PLATFORM_SETTINGS.supportEmail,
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
