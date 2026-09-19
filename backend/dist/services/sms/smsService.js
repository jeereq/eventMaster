"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAvailableSmsProviders = void 0;
exports.sendRealSms = sendRealSms;
exports.checkActiveSmsBalance = checkActiveSmsBalance;
exports.getSmsDeliveryStatus = getSmsDeliveryStatus;
const smsProviderRegistry_ts_1 = require("./smsProviderRegistry.js");
Object.defineProperty(exports, "listAvailableSmsProviders", { enumerable: true, get: function () { return smsProviderRegistry_ts_1.listAvailableSmsProviders; } });
const notificationDedup_ts_1 = require("../notificationDedup.js");
/**
 * Envoie un SMS transactionnel via la passerelle SMS active (Dream Digital ou alternative configurée).
 * Gère la déduplication automatique des envois identiques récents et la simulation si non configuré.
 */
async function sendRealSms(to, text, options) {
    const target = Array.isArray(to) ? to.join(',') : to;
    // Déduplication sur le canal SMS pour éviter les doubles envois intempestifs
    const fingerprint = (0, notificationDedup_ts_1.outboundChannelFingerprint)({
        channel: 'SMS',
        to: target,
        body: text,
    });
    if (!(0, notificationDedup_ts_1.claimSimilarOutbound)(fingerprint)) {
        return {
            success: true,
            simulated: false,
            provider: 'dedup',
            messageId: 'deduped-same-channel',
            remarks: 'Message dédupliqué (envoi identique récent)',
        };
    }
    const provider = options?.provider ? (0, smsProviderRegistry_ts_1.getSmsProvider)(options.provider) || (0, smsProviderRegistry_ts_1.getActiveSmsProvider)() : (0, smsProviderRegistry_ts_1.getActiveSmsProvider)();
    return provider.sendSms({
        to,
        text,
        senderId: options?.senderId,
        uid: options?.uid,
        smsType: options?.smsType || 'T',
        encoding: options?.encoding,
        validitySeconds: options?.validitySeconds,
        callbackUrl: options?.callbackUrl,
    });
}
/**
 * Interroge le solde de la passerelle active (ex: Dream Digital aSMSC).
 */
async function checkActiveSmsBalance(providerName) {
    const provider = providerName ? (0, smsProviderRegistry_ts_1.getSmsProvider)(providerName) || (0, smsProviderRegistry_ts_1.getActiveSmsProvider)() : (0, smsProviderRegistry_ts_1.getActiveSmsProvider)();
    if (provider.checkBalance) {
        return provider.checkBalance();
    }
    return {
        success: false,
        provider: provider.name,
        error: `La passerelle '${provider.name}' ne supporte pas l'interrogation de solde via API.`,
    };
}
/**
 * Récupère le statut d'acheminement d'un SMS envoyé.
 */
async function getSmsDeliveryStatus(messageId, uid, providerName) {
    const provider = providerName ? (0, smsProviderRegistry_ts_1.getSmsProvider)(providerName) || (0, smsProviderRegistry_ts_1.getActiveSmsProvider)() : (0, smsProviderRegistry_ts_1.getActiveSmsProvider)();
    if (provider.getDeliveryStatus) {
        return provider.getDeliveryStatus(messageId, uid);
    }
    return {
        success: false,
        provider: provider.name,
        messageId,
        error: `La passerelle '${provider.name}' ne supporte pas la vérification du statut via API.`,
    };
}
