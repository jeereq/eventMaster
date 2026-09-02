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
    const allergies = customFields.allergies ?? customFields.allergie ?? prefs.allergies;
    if (allergies !== undefined && allergies !== null && String(allergies).trim()) {
        prefs.allergies = String(allergies).trim();
    }
    const menu = customFields.type_menu ?? customFields.special_meal ?? customFields.regime ?? prefs.specialMeal;
    if (menu !== undefined && menu !== null && String(menu).trim()) {
        prefs.specialMeal = mealValueFromLabel(String(menu));
    }
    return prefs;
}
function mealValueFromLabel(raw) {
    const value = raw.trim();
    const known = ['none', 'vegetarian', 'vegan', 'halal', 'kosher'];
    if (known.includes(value))
        return value;
    const n = value.toLowerCase();
    if (n.includes('vegan') || n.includes('végétalien') || n.includes('vegetalien'))
        return 'vegan';
    if (n.includes('végétarien') || n.includes('vegetarien') || n.includes('vegetarian'))
        return 'vegetarian';
    if (n.includes('halal'))
        return 'halal';
    if (n.includes('casher') || n.includes('kosher'))
        return 'kosher';
    if (n.includes('standard') || n === 'none' || n === 'aucun')
        return 'none';
    return 'none';
}
