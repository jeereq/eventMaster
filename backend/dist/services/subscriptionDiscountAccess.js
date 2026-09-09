"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SUBSCRIPTION_DISCOUNT_ACCESS = void 0;
exports.sanitizeSubscriptionDiscountAccess = sanitizeSubscriptionDiscountAccess;
exports.isDiscountPeriodActive = isDiscountPeriodActive;
exports.resolveSubscriptionDiscountAccess = resolveSubscriptionDiscountAccess;
exports.DEFAULT_SUBSCRIPTION_DISCOUNT_ACCESS = {
    enabled: true,
    periodStart: null,
    periodEnd: null,
    tenantIds: [],
};
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})/;
function sanitizeDay(value) {
    if (typeof value !== 'string')
        return null;
    const match = DAY_RE.exec(value.trim());
    if (!match)
        return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const utc = Date.UTC(year, month - 1, day);
    const check = new Date(utc);
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
        return null;
    }
    return `${match[1]}-${match[2]}-${match[3]}`;
}
function dayUtcMs(iso) {
    const match = DAY_RE.exec(iso);
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
function sanitizeSubscriptionDiscountAccess(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const tenantIds = Array.isArray(src.tenantIds)
        ? [...new Set(src.tenantIds.filter((id) => typeof id === 'string' && id.trim().length > 0).map((id) => id.trim()))]
        : [];
    let periodStart = sanitizeDay(src.periodStart);
    let periodEnd = sanitizeDay(src.periodEnd);
    if (periodStart && periodEnd && dayUtcMs(periodEnd) < dayUtcMs(periodStart)) {
        periodEnd = periodStart;
    }
    return {
        enabled: src.enabled !== false,
        periodStart,
        periodEnd,
        tenantIds,
    };
}
function isDiscountPeriodActive(access, now = new Date()) {
    if (!access.periodStart && !access.periodEnd)
        return false;
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    if (access.periodStart && today < dayUtcMs(access.periodStart))
        return false;
    if (access.periodEnd && today > dayUtcMs(access.periodEnd))
        return false;
    return true;
}
function resolveSubscriptionDiscountAccess(tenantId, access, now = new Date()) {
    const periodActive = isDiscountPeriodActive(access, now);
    if (!access.enabled) {
        return { allowed: false, reason: 'Les demandes de rabais sont désactivées.', periodActive };
    }
    if (tenantId && access.tenantIds.includes(tenantId)) {
        return { allowed: true, reason: '', periodActive };
    }
    if (periodActive) {
        return { allowed: true, reason: '', periodActive };
    }
    if (access.tenantIds.length === 0 && !access.periodStart && !access.periodEnd) {
        return { allowed: true, reason: '', periodActive };
    }
    if (access.tenantIds.length > 0 && !periodActive) {
        return {
            allowed: false,
            reason: 'Ce rabais n’est pas ouvert pour votre organisation actuellement.',
            periodActive,
        };
    }
    return {
        allowed: false,
        reason: 'La campagne de rabais n’est pas ouverte pour le moment.',
        periodActive,
    };
}
