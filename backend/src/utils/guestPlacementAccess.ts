type GuestPreferences = Record<string, unknown> | null | undefined;

/**
 * Accès au plan / PDF / GPS : dès RSVP accepté, ou après check-in / vérification siège (legacy).
 */
export function canGuestAccessPlacement(guest: {
  checkedInAt?: Date | string | null;
  seatVerified?: boolean | null;
  rsvp?: string | null;
}): boolean {
  return Boolean(
    guest.rsvp === 'ACCEPTED' || guest.checkedInAt || guest.seatVerified,
  );
}

export function getPlacementNotifiedAt(preferences: GuestPreferences): string | null {
  if (!preferences || typeof preferences !== 'object') return null;
  const value = (preferences as { placementNotifiedAt?: unknown }).placementNotifiedAt;
  return typeof value === 'string' && value.trim() ? value : null;
}

export function mergePlacementNotifiedPreferences(
  preferences: GuestPreferences,
  notifiedAt: string,
): Record<string, unknown> {
  const base =
    preferences && typeof preferences === 'object' && !Array.isArray(preferences)
      ? { ...(preferences as Record<string, unknown>) }
      : {};
  return { ...base, placementNotifiedAt: notifiedAt };
}
