"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDeliveryChannels = resolveDeliveryChannels;
/**
 * Résout les canaux actifs de diffusion (e-mail, WhatsApp et/ou SMS).
 * Supporte les sélections unitaires, combinées ou multi-canaux.
 */
function resolveDeliveryChannels(channel) {
    let raw = [];
    if (Array.isArray(channel)) {
        raw = channel.map((c) => String(c).trim().toUpperCase());
    }
    else if (typeof channel === 'string' && channel.trim()) {
        const normalized = channel.trim().toUpperCase();
        if (normalized === 'EMAIL_AND_WHATSAPP' || normalized === 'WHATSAPP_AND_EMAIL') {
            raw = ['EMAIL', 'WHATSAPP'];
        }
        else if (normalized === 'EMAIL_AND_SMS' || normalized === 'SMS_AND_EMAIL') {
            raw = ['EMAIL', 'SMS'];
        }
        else if (normalized === 'WHATSAPP_AND_SMS' || normalized === 'SMS_AND_WHATSAPP') {
            raw = ['WHATSAPP', 'SMS'];
        }
        else if (normalized === 'ALL_CHANNELS') {
            raw = ['EMAIL', 'WHATSAPP', 'SMS'];
        }
        else if (normalized === 'SMS') {
            raw = ['SMS'];
        }
        else {
            raw = normalized.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
        }
    }
    else {
        raw = ['EMAIL'];
    }
    const resolved = new Set();
    for (const entry of raw) {
        if (entry === 'EMAIL')
            resolved.add('EMAIL');
        else if (entry === 'WHATSAPP')
            resolved.add('WHATSAPP');
        else if (entry === 'SMS')
            resolved.add('SMS');
    }
    if (resolved.size === 0)
        resolved.add('EMAIL');
    return [...resolved];
}
