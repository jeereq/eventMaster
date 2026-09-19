"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotificationCredentials = getNotificationCredentials;
exports.isSendGridConfigured = isSendGridConfigured;
exports.isUltraMsgConfigured = isUltraMsgConfigured;
exports.isSmsConfigured = isSmsConfigured;
exports.assertSendGridConfigured = assertSendGridConfigured;
exports.logNotificationConfigStatus = logNotificationConfigStatus;
const platformSettingsService_ts_1 = require("../services/platformSettingsService.js");
function getNotificationCredentials() {
    return (0, platformSettingsService_ts_1.getNotificationCredentials)();
}
function isSendGridConfigured(credentials = getNotificationCredentials()) {
    return !!(credentials.sendgridApiKey?.trim() && credentials.sendgridFrom?.trim());
}
function isUltraMsgConfigured(credentials = getNotificationCredentials()) {
    return !!(credentials.ultramsgInstanceId && credentials.ultramsgToken);
}
function isSmsConfigured(credentials = getNotificationCredentials()) {
    const provider = (credentials.smsProvider || 'dream-digital').toLowerCase();
    if (provider === 'twilio') {
        return Boolean(credentials.twilioSid && credentials.twilioAuthToken && credentials.twilioPhone);
    }
    if (provider === 'custom') {
        return Boolean(credentials.customSmsUrl?.trim());
    }
    return Boolean(credentials.dreamDigitalApiId?.trim() && credentials.dreamDigitalApiPassword?.trim());
}
function assertSendGridConfigured() {
    if (!isSendGridConfigured()) {
        throw new Error("SendGrid obligatoire pour l'envoi d'e-mails. Configurez sendgridApiKey et sendgridFrom dans les réglages plateforme (ou SENDGRID_API_KEY / SENDGRID_FROM).");
    }
}
function logNotificationConfigStatus() {
    const creds = getNotificationCredentials();
    console.log("[Notification Config] Credentials chargées depuis les réglages plateforme et/ou les variables d'environnement.");
    if (isSendGridConfigured(creds)) {
        console.log(`[Notification Service] SendGrid configuré (expéditeur: ${creds.sendgridFrom}).`);
    }
    else {
        console.error('[Notification Service] SendGrid NON configuré — les e-mails ne pourront PAS être envoyés.');
    }
    if (isUltraMsgConfigured(creds)) {
        console.log('[Notification Service] UltraMsg configuré pour WhatsApp.');
    }
    else {
        console.warn('[Notification Service] UltraMsg non configuré — envoi WhatsApp simulé.');
    }
    if (isSmsConfigured(creds)) {
        const provider = creds.smsProvider || 'dream-digital';
        const sender = provider === 'twilio' ? creds.twilioPhone : creds.dreamDigitalSenderId || 'EVENTMASTER';
        console.log(`[Notification Service] Passerelle SMS configurée (fournisseur: ${provider}, expéditeur: ${sender}).`);
    }
    else {
        console.warn('[Notification Service] Passerelle SMS non configurée — envoi SMS simulé.');
    }
}
