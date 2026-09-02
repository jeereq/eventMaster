"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canGuestAccessPlacement = canGuestAccessPlacement;
exports.getPlacementNotifiedAt = getPlacementNotifiedAt;
exports.mergePlacementNotifiedPreferences = mergePlacementNotifiedPreferences;
/**
 * Accès au plan / PDF / GPS : dès RSVP accepté, ou après check-in / vérification siège (legacy).
 */
function canGuestAccessPlacement(guest) {
    return Boolean(guest.rsvp === 'ACCEPTED' || guest.checkedInAt || guest.seatVerified);
}
function getPlacementNotifiedAt(preferences) {
    if (!preferences || typeof preferences !== 'object')
        return null;
    const value = preferences.placementNotifiedAt;
    return typeof value === 'string' && value.trim() ? value : null;
}
function mergePlacementNotifiedPreferences(preferences, notifiedAt) {
    const base = preferences && typeof preferences === 'object' && !Array.isArray(preferences)
        ? { ...preferences }
        : {};
    return { ...base, placementNotifiedAt: notifiedAt };
}
