"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDeliveryChannels = resolveDeliveryChannels;
/** Canaux actifs : e-mail et WhatsApp uniquement (SMS et alias legacy convertis). */
function resolveDeliveryChannels(channel) {
    let raw = [];
    if (Array.isArray(channel)) {
        raw = channel.map((c) => String(c).trim().toUpperCase());
    }
    else if (typeof channel === 'string' && channel.trim()) {
        const normalized = channel.trim().toUpperCase();
        if (normalized === 'EMAIL_AND_WHATSAPP') {
            raw = ['EMAIL', 'WHATSAPP'];
        }
        else if (normalized === 'EMAIL_AND_SMS' || normalized === 'ALL_CHANNELS') {
            raw = ['EMAIL', 'WHATSAPP'];
        }
        else if (normalized === 'SMS') {
            raw = ['WHATSAPP'];
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
        else if (entry === 'WHATSAPP' || entry === 'SMS')
            resolved.add('WHATSAPP');
    }
    if (resolved.size === 0)
        resolved.add('EMAIL');
    return [...resolved];
}
