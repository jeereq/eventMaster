"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotificationCredentials = getNotificationCredentials;
exports.isUltraMsgConfigured = isUltraMsgConfigured;
exports.logNotificationConfigStatus = logNotificationConfigStatus;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const settingsFilePath = path_1.default.join(__dirname, 'settings.json');
function readSettingsFile() {
    try {
        if (fs_1.default.existsSync(settingsFilePath)) {
            return JSON.parse(fs_1.default.readFileSync(settingsFilePath, 'utf-8'));
        }
    }
    catch (error) {
        console.warn('[Notification Config] Impossible de lire settings.json:', error);
    }
    return {};
}
function pickString(settings, settingsKey, envKey, fallback = '') {
    const fromSettings = settings[settingsKey];
    if (typeof fromSettings === 'string' && fromSettings.trim()) {
        return fromSettings.trim();
    }
    const fromEnv = process.env[envKey];
    if (fromEnv?.trim()) {
        return fromEnv.trim();
    }
    return fallback;
}
/** Lit settings.json (panneau admin) avec repli sur les variables d'environnement. */
function getNotificationCredentials() {
    const settings = readSettingsFile();
    return {
        sendgridApiKey: pickString(settings, 'sendgridApiKey', 'SENDGRID_API_KEY'),
        sendgridFrom: pickString(settings, 'sendgridFrom', 'SENDGRID_FROM', 'no-reply@eventmaster.cd'),
        twilioSid: pickString(settings, 'twilioAccountSid', 'TWILIO_ACCOUNT_SID'),
        twilioAuthToken: pickString(settings, 'twilioAuthToken', 'TWILIO_AUTH_TOKEN'),
        twilioPhone: pickString(settings, 'twilioPhoneNumber', 'TWILIO_PHONE_NUMBER'),
        ultramsgInstanceId: pickString(settings, 'ultramsgInstanceId', 'ULTRAMSG_INSTANCE_ID'),
        ultramsgToken: pickString(settings, 'ultramsgToken', 'ULTRAMSG_TOKEN'),
    };
}
function isUltraMsgConfigured(credentials = getNotificationCredentials()) {
    return !!(credentials.ultramsgInstanceId && credentials.ultramsgToken);
}
function logNotificationConfigStatus() {
    const creds = getNotificationCredentials();
    const settingsExists = fs_1.default.existsSync(settingsFilePath);
    console.log(`[Notification Config] settings.json ${settingsExists ? 'trouvé' : 'absent'} — credentials chargées depuis le panneau admin et/ou les variables d'environnement.`);
    if (creds.sendgridApiKey) {
        console.log('[Notification Service] SendGrid configuré.');
    }
    else {
        console.warn('[Notification Service] SendGrid non configuré — envoi e-mail simulé.');
    }
    if (creds.twilioSid && creds.twilioAuthToken && creds.twilioPhone) {
        console.log('[Notification Service] Twilio configuré.');
    }
    else {
        console.warn('[Notification Service] Twilio non configuré — envoi SMS simulé.');
    }
    if (isUltraMsgConfigured(creds)) {
        console.log('[Notification Service] UltraMsg configuré pour WhatsApp.');
    }
    else {
        console.warn('[Notification Service] UltraMsg non configuré — envoi WhatsApp simulé.');
    }
}
