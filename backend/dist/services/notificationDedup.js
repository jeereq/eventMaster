"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OUTBOUND_DEDUP_MS = exports.DEDUP_WINDOW_MS = void 0;
exports.notificationDedupeKey = notificationDedupeKey;
exports.isWithinDedupWindow = isWithinDedupWindow;
exports.outboundChannelFingerprint = outboundChannelFingerprint;
exports.claimSimilarOutbound = claimSimilarOutbound;
exports.resetOutboundClaims = resetOutboundClaims;
exports.isPlatformBrandedEmailSubject = isPlatformBrandedEmailSubject;
const DEDUP_WINDOW_MS = 90_000;
exports.DEDUP_WINDOW_MS = DEDUP_WINDOW_MS;
const OUTBOUND_DEDUP_MS = 12_000;
exports.OUTBOUND_DEDUP_MS = OUTBOUND_DEDUP_MS;
function notificationDedupeKey(params) {
    const meta = params.metadata || {};
    const entity = String(meta.inquiryId || meta.bookingId || '');
    const body = (params.message || '').slice(0, 80);
    return `${params.type}|${params.title}|${entity}|${body}`;
}
function isWithinDedupWindow(createdAt, now = new Date(), windowMs = DEDUP_WINDOW_MS) {
    return now.getTime() - createdAt.getTime() < windowMs;
}
function normalizeOutboundPart(value) {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
}
/** Empreinte d’un e-mail / WhatsApp : même destinataire, même sujet, même début de corps. */
function outboundChannelFingerprint(input) {
    const dest = normalizeOutboundPart(input.to);
    const subject = normalizeOutboundPart(input.subject || '');
    const body = normalizeOutboundPart(input.body || '').slice(0, 80);
    return `${input.channel}|${dest}|${subject}|${body}`;
}
const recentOutbound = new Map();
function claimSimilarOutbound(fingerprint, now = Date.now(), windowMs = OUTBOUND_DEDUP_MS) {
    const last = recentOutbound.get(fingerprint);
    if (last != null && now - last < windowMs)
        return false;
    recentOutbound.set(fingerprint, now);
    return true;
}
function resetOutboundClaims() {
    recentOutbound.clear();
}
function isPlatformBrandedEmailSubject(subject) {
    return /^eventmaster\s[—–-]/i.test(subject.trim());
}
