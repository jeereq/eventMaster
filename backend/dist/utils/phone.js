"use strict";
/** Compose / normalise téléphone côté API */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCountryCode = normalizeCountryCode;
exports.normalizeNationalNumber = normalizeNationalNumber;
exports.composeE164 = composeE164;
exports.resolvePhoneFields = resolvePhoneFields;
exports.formatPhoneE164 = formatPhoneE164;
function normalizeCountryCode(raw, fallback = '+243') {
    if (!raw?.trim())
        return fallback;
    const digits = raw.replace(/[^\d]/g, '');
    return digits ? `+${digits}` : fallback;
}
function normalizeNationalNumber(raw) {
    if (!raw)
        return '';
    let digits = raw.replace(/[^\d]/g, '');
    if (digits.startsWith('0'))
        digits = digits.slice(1);
    return digits;
}
function composeE164(countryCode, national) {
    const nat = normalizeNationalNumber(national);
    if (!nat)
        return null;
    const cc = normalizeCountryCode(countryCode).replace(/^\+/, '');
    if (nat.startsWith(cc))
        return `+${nat}`;
    // Si national est déjà un E.164 collé
    if (national?.trim().startsWith('+')) {
        return `+${nat}`;
    }
    return `+${cc}${nat}`;
}
/**
 * Résout phone + phoneCountryCode depuis le body.
 * - phone stocké en E.164 complet
 * - phoneCountryCode stocké tel quel (+243)
 */
function resolvePhoneFields(input) {
    const cc = input.phoneCountryCode
        ? normalizeCountryCode(input.phoneCountryCode)
        : null;
    // Nouveau flux : indicatif + numéro national séparés
    if (cc && (input.nationalNumber || input.phone)) {
        const national = input.nationalNumber || input.phone;
        // Si phone commence déjà par +, c’est un E.164
        if (typeof national === 'string' && national.trim().startsWith('+') && !input.nationalNumber) {
            return { phone: national.trim(), phoneCountryCode: cc };
        }
        const e164 = composeE164(cc, national);
        return { phone: e164, phoneCountryCode: cc };
    }
    // Legacy : un seul champ phone
    if (input.phone?.trim()) {
        const raw = input.phone.trim();
        if (raw.startsWith('+')) {
            return { phone: raw, phoneCountryCode: cc };
        }
        if (cc) {
            return { phone: composeE164(cc, raw), phoneCountryCode: cc };
        }
        return { phone: raw, phoneCountryCode: null };
    }
    return { phone: null, phoneCountryCode: cc };
}
/** Formate un numéro de téléphone en notation E.164 (+243...) pour UltraMsg / WhatsApp / SMS */
function formatPhoneE164(to) {
    let formattedTo = to.trim().replace(/[\s\-()]/g, '');
    if (!formattedTo.startsWith('+')) {
        if (formattedTo.startsWith('00')) {
            formattedTo = '+' + formattedTo.slice(2);
        }
        else if (formattedTo.startsWith('0')) {
            formattedTo = '+243' + formattedTo.slice(1);
        }
        else if (formattedTo.length === 9 && /^[89]/.test(formattedTo)) {
            formattedTo = '+243' + formattedTo;
        }
        else {
            formattedTo = '+' + formattedTo;
        }
    }
    return formattedTo;
}
