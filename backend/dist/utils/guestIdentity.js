"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePhone = normalizePhone;
exports.isValidEmail = isValidEmail;
exports.isPlaceholderGuestEmail = isPlaceholderGuestEmail;
exports.placeholderEmailFromPhone = placeholderEmailFromPhone;
exports.resolveGuestContactEmail = resolveGuestContactEmail;
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
function isPlaceholderGuestEmail(email) {
    return Boolean(email && /@guest\.local$/i.test(email.trim()));
}
function placeholderEmailFromPhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length < 7)
        return null;
    return `wa.${digits}@guest.local`;
}
/** E-mail réel, ou joker unique dérivé du WhatsApp. */
function resolveGuestContactEmail(opts) {
    const trimmed = String(opts.email || '').trim();
    if (trimmed && !isPlaceholderGuestEmail(trimmed) && !isValidEmail(trimmed)) {
        return { error: 'Adresse e-mail invalide. Laissez vide si vous n’avez que le WhatsApp.' };
    }
    if (trimmed && isValidEmail(trimmed) && !isPlaceholderGuestEmail(trimmed)) {
        return { email: trimmed.toLowerCase() };
    }
    const fromPhone = placeholderEmailFromPhone(opts.phone);
    if (fromPhone)
        return { email: fromPhone };
    return { error: 'Indiquez un e-mail ou un numéro WhatsApp.' };
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
    if (isPlaceholderGuestEmail(email))
        return null;
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
