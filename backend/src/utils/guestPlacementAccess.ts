type GuestPreferences = Record<string, unknown> | null | undefined;

export function canGuestAccessPlacement(guest: {
  checkedInAt?: Date | string | null;
  seatVerified?: boolean | null;
}): boolean {
  return Boolean(guest.checkedInAt || guest.seatVerified);
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
