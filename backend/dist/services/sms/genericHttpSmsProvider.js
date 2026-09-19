"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericHttpSmsProvider = void 0;
const phone_ts_1 = require("../../utils/phone.js");
const smsConfig_ts_1 = require("./smsConfig.js");
/**
 * Passerelle SMS générique HTTP / Webhook (permet de brancher n'importe quelle API tierce).
 */
class GenericHttpSmsProvider {
    name = 'custom';
    label = 'Passerelle HTTP / API Personnalisée';
    getCredentials() {
        const creds = (0, smsConfig_ts_1.getSmsGatewayCredentials)();
        const url = (creds.customSmsUrl || '').trim();
        const apiKey = (creds.customSmsApiKey || '').trim();
        const senderId = (creds.customSmsSenderId || 'EVENTMASTER').trim();
        return { url, apiKey, senderId };
    }
    isConfigured() {
        const { url } = this.getCredentials();
        return Boolean(url);
    }
    async sendSms(options) {
        const { url, apiKey, senderId } = this.getCredentials();
        const recipients = Array.isArray(options.to) ? options.to : [options.to];
        const formatted = recipients.map((r) => (0, phone_ts_1.formatPhoneE164)(r));
        if (!this.isConfigured()) {
            console.log(`[Simulation] Custom HTTP SMS vers ${formatted.join(', ')}:\n${options.text}\n`);
            return {
                success: true,
                simulated: true,
                provider: this.name,
                messageId: `sim-custom-${Date.now()}`,
                remarks: 'Message simulé (passerelle HTTP non configurée)',
            };
        }
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(apiKey ? { Authorization: `Bearer ${apiKey}`, 'X-API-Key': apiKey } : {}),
                },
                body: JSON.stringify({
                    to: formatted,
                    text: options.text,
                    sender: options.senderId || senderId,
                    uid: options.uid,
                    callbackUrl: options.callbackUrl,
                }),
            });
            const raw = await response.text();
            let data;
            try {
                data = JSON.parse(raw);
            }
            catch {
                data = { raw };
            }
            if (response.ok) {
                return {
                    success: true,
                    simulated: false,
                    provider: this.name,
                    messageId: String(data?.id || data?.messageId || data?.message_id || 'custom-sent'),
                    remarks: data?.remarks || 'Envoyé',
                    raw: data,
                };
            }
            return {
                success: false,
                simulated: false,
                provider: this.name,
                error: data?.error || data?.message || `Erreur passerelle HTTP (${response.status})`,
                raw: data,
            };
        }
        catch (err) {
            return {
                success: false,
                simulated: false,
                provider: this.name,
                error: err.message || String(err),
            };
        }
    }
}
exports.GenericHttpSmsProvider = GenericHttpSmsProvider;
