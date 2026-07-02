"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePhone = normalizePhone;
exports.isValidEmail = isValidEmail;
exports.extractGuestPhone = extractGuestPhone;
exports.extractGuestEmail = extractGuestEmail;
exports.buildGuestIdentityOrClauses = buildGuestIdentityOrClauses;
function normalizePhone(value) {
    if (!value?.trim())
        return null;
    const digits = value.replace(/[^\d+]/g, '');
    if (digits.length < 7)
        return null;
    return digits.startsWith('+') ? digits : digits;
}
function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
function extractGuestPhone(guest) {
    if (guest.phone?.trim()) {
        return normalizePhone(guest.phone);
    }
    if (guest.preferences && typeof guest.preferences === 'object') {
        const prefs = guest.preferences;
        const fromPrefs = prefs.phone || prefs.telephone;
        if (typeof fromPrefs === 'string' && fromPrefs.trim()) {
            return normalizePhone(fromPrefs);
        }
    }
    const emailStr = guest.email?.trim() || '';
    if (/^\+?[0-9\s\-()]{7,20}$/.test(emailStr)) {
        return normalizePhone(emailStr);
    }
    return null;
}
function extractGuestEmail(guest) {
    const email = guest.email?.trim() || '';
    return isValidEmail(email) ? email.toLowerCase() : null;
}
function buildGuestIdentityOrClauses(email, phone) {
    const clauses = [];
    if (email) {
        clauses.push({ email: { equals: email, mode: 'insensitive' } });
    }
    if (phone) {
        clauses.push({ phone });
    }
    return clauses;
}
