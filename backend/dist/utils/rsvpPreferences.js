"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeGuestPreferences = normalizeGuestPreferences;
function normalizeGuestPreferences(preferences) {
    if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
        return {};
    }
    const prefs = { ...preferences };
    const customFields = prefs.customFields && typeof prefs.customFields === 'object' && !Array.isArray(prefs.customFields)
        ? { ...prefs.customFields }
        : {};
    const rsvpFormData = Array.isArray(prefs.rsvpFormData)
        ? prefs.rsvpFormData
        : [];
    for (const entry of rsvpFormData) {
        if (!entry || typeof entry !== 'object')
            continue;
        const key = entry.analyticsKey || entry.label;
        if (key && entry.value !== undefined && entry.value !== null && entry.value !== '') {
            customFields[key] = entry.value;
        }
    }
    prefs.customFields = customFields;
    return prefs;
}
