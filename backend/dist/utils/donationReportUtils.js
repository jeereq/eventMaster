"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDonationMeta = parseDonationMeta;
exports.resolveChannelLabel = resolveChannelLabel;
exports.csvEscape = csvEscape;
function parseDonationMeta(selectedSeats) {
    if (selectedSeats && typeof selectedSeats === 'object' && !Array.isArray(selectedSeats)) {
        const raw = selectedSeats;
        return {
            kind: typeof raw.kind === 'string' ? raw.kind : undefined,
            donationNote: typeof raw.donationNote === 'string' && raw.donationNote.trim() ? raw.donationNote.trim() : null,
            isAnonymous: Boolean(raw.isAnonymous),
            donorAttendancePass: raw.donorAttendancePass !== false,
        };
    }
    return { donorAttendancePass: true };
}
function resolveChannelLabel(channel, provider) {
    const ch = String(channel || '').toLowerCase().trim();
    const prov = String(provider || '').toLowerCase().trim();
    if (ch.includes('mpesa') || ch.includes('voda'))
        return 'M-Pesa (Vodacom)';
    if (ch.includes('orange'))
        return 'Orange Money';
    if (ch.includes('airtel'))
        return 'Airtel Money';
    if (ch.includes('afri'))
        return 'Afrimoney';
    if (ch.includes('card') || prov === 'flexpay_card')
        return 'Carte Bancaire (FlexPay)';
    if (prov === 'stripe')
        return 'Carte Bancaire (Stripe)';
    if (ch)
        return ch.toUpperCase();
    if (prov)
        return prov.toUpperCase();
    return 'Mobile Money / En ligne';
}
function csvEscape(val) {
    if (val === null || val === undefined)
        return '""';
    const s = String(val).replace(/"/g, '""').replace(/[\r\n]+/g, ' ');
    return `"${s}"`;
}
