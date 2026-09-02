"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendExpoPushToUser = sendExpoPushToUser;
const pushDeviceTokenService_1 = require("./pushDeviceTokenService");
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
async function sendExpoPushToUser(userId, payload) {
    const tokens = await (0, pushDeviceTokenService_1.getPushTokensForUser)(userId);
    if (tokens.length === 0) {
        return { sent: 0, failed: 0 };
    }
    const messages = tokens.map((token) => ({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sound: 'default',
    }));
    const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    };
    if (process.env.EXPO_ACCESS_TOKEN) {
        headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
    }
    let sent = 0;
    let failed = 0;
    const invalidTokens = [];
    for (let i = 0; i < messages.length; i += 100) {
        const chunk = messages.slice(i, i + 100);
        try {
            const response = await fetch(EXPO_PUSH_URL, {
                method: 'POST',
                headers,
                body: JSON.stringify(chunk),
            });
            if (!response.ok) {
                failed += chunk.length;
                continue;
            }
            const result = (await response.json());
            const tickets = result.data ?? [];
            tickets.forEach((ticket, idx) => {
                if (ticket.status === 'ok') {
                    sent += 1;
                }
                else {
                    failed += 1;
                    const errorCode = ticket.details?.error;
                    if (errorCode === 'DeviceNotRegistered' || errorCode === 'InvalidCredentials') {
                        invalidTokens.push(chunk[idx].to);
                    }
                }
            });
        }
        catch (err) {
            console.warn('[ExpoPush] Envoi échoué:', err);
            failed += chunk.length;
        }
    }
    if (invalidTokens.length > 0) {
        await (0, pushDeviceTokenService_1.removeInvalidPushTokens)(invalidTokens);
    }
    return { sent, failed };
}
