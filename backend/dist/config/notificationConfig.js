"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotificationCredentials = getNotificationCredentials;
exports.isSendGridConfigured = isSendGridConfigured;
exports.isUltraMsgConfigured = isUltraMsgConfigured;
exports.assertSendGridConfigured = assertSendGridConfigured;
exports.logNotificationConfigStatus = logNotificationConfigStatus;
const platformSettingsService_1 = require("../services/platformSettingsService");
function getNotificationCredentials() {
    return (0, platformSettingsService_1.getNotificationCredentials)();
}
function isSendGridConfigured(credentials = getNotificationCredentials()) {
    return !!(credentials.sendgridApiKey?.trim() && credentials.sendgridFrom?.trim());
}
function isUltraMsgConfigured(credentials = getNotificationCredentials()) {
    return !!(credentials.ultramsgInstanceId && credentials.ultramsgToken);
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
}
