"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_EVENT_DONATIONS_CONFIG = exports.DEFAULT_DONATIONS_ACCESS = void 0;
exports.sanitizeDonationsAccess = sanitizeDonationsAccess;
exports.resolveDonationsAccess = resolveDonationsAccess;
exports.sanitizeEventDonationsConfig = sanitizeEventDonationsConfig;
exports.extractEventDonationsConfig = extractEventDonationsConfig;
exports.DEFAULT_DONATIONS_ACCESS = {
    enabled: true,
    mode: 'all',
    tenantIds: [],
    minAmountFc: 1000,
    defaultSuggestedAmountsFc: [2500, 5000, 10000, 25000, 50000, 100000],
};
function sanitizeDonationsAccess(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const enabled = src.enabled !== false;
    const mode = src.mode === 'restricted' ? 'restricted' : 'all';
    const tenantIds = Array.isArray(src.tenantIds)
        ? [
            ...new Set(src.tenantIds
                .filter((id) => typeof id === 'string' && id.trim().length > 0)
                .map((id) => id.trim())),
        ]
        : [];
    const rawMin = Number(src.minAmountFc);
    const minAmountFc = Number.isFinite(rawMin) && rawMin >= 100 ? Math.round(rawMin) : exports.DEFAULT_DONATIONS_ACCESS.minAmountFc;
    const rawSuggested = Array.isArray(src.defaultSuggestedAmountsFc) ? src.defaultSuggestedAmountsFc : [];
    const validSuggested = [
        ...new Set(rawSuggested
            .map((n) => Math.round(Number(n)))
            .filter((n) => Number.isFinite(n) && n >= minAmountFc)),
    ].sort((a, b) => a - b);
    const defaultSuggestedAmountsFc = validSuggested.length > 0 ? validSuggested : exports.DEFAULT_DONATIONS_ACCESS.defaultSuggestedAmountsFc;
    return {
        enabled,
        mode,
        tenantIds,
        minAmountFc,
        defaultSuggestedAmountsFc,
    };
}
function resolveDonationsAccess(tenantId, access) {
    if (!access.enabled) {
        return {
            allowed: false,
            reason: 'Les donations à montant libre sont actuellement désactivées sur la plateforme.',
        };
    }
    if (access.mode === 'all') {
        return {
            allowed: true,
            reason: '',
        };
    }
    // mode === 'restricted'
    if (tenantId && access.tenantIds.includes(tenantId)) {
        return {
            allowed: true,
            reason: '',
        };
    }
    return {
        allowed: false,
        reason: 'Les donations à montant libre ne sont pas autorisées pour cette organisation. Contactez le support pour activer cette option.',
    };
}
exports.DEFAULT_EVENT_DONATIONS_CONFIG = {
    enabled: false,
    targetAmountFc: null,
    minAmountFc: 1000,
    cause: null,
    suggestedAmountsFc: [2500, 5000, 10000, 25000, 50000, 100000],
    donorAttendancePass: true,
};
function sanitizeEventDonationsConfig(raw, platformAccess) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const enabled = Boolean(src.enabled);
    const rawTarget = Number(src.targetAmountFc);
    const targetAmountFc = Number.isFinite(rawTarget) && rawTarget > 0 ? Math.round(rawTarget) : null;
    const platformMin = platformAccess.minAmountFc || 1000;
    const rawMin = Number(src.minAmountFc);
    const minAmountFc = Number.isFinite(rawMin) && rawMin >= 100 ? Math.max(platformMin, Math.round(rawMin)) : platformMin;
    const cause = typeof src.cause === 'string' && src.cause.trim().length > 0 ? src.cause.trim() : null;
    const rawSuggested = Array.isArray(src.suggestedAmountsFc) ? src.suggestedAmountsFc : [];
    const validSuggested = [
        ...new Set(rawSuggested
            .map((n) => Math.round(Number(n)))
            .filter((n) => Number.isFinite(n) && n >= minAmountFc)),
    ].sort((a, b) => a - b);
    const suggestedAmountsFc = validSuggested.length > 0 ? validSuggested : platformAccess.defaultSuggestedAmountsFc;
    const donorAttendancePass = src.donorAttendancePass !== false;
    return {
        enabled,
        targetAmountFc,
        minAmountFc,
        cause,
        suggestedAmountsFc,
        donorAttendancePass,
    };
}
function extractEventDonationsConfig(eventPrep) {
    if (!eventPrep || typeof eventPrep !== 'object')
        return null;
    const prep = eventPrep;
    if (!prep.donations || typeof prep.donations !== 'object')
        return null;
    return sanitizeEventDonationsConfig(prep.donations, exports.DEFAULT_DONATIONS_ACCESS);
}
