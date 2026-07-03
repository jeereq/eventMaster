type RsvpFormDataEntry = {
  fieldId: string;
  analyticsKey: string;
  label: string;
  type: string;
  category?: string;
  value: string | number | boolean | null;
};

export function normalizeGuestPreferences(preferences: unknown): object {
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
    return {};
  }

  const prefs = { ...(preferences as Record<string, unknown>) };
  const customFields =
    prefs.customFields && typeof prefs.customFields === 'object' && !Array.isArray(prefs.customFields)
      ? { ...(prefs.customFields as Record<string, unknown>) }
      : {};

  const rsvpFormData = Array.isArray(prefs.rsvpFormData)
    ? (prefs.rsvpFormData as RsvpFormDataEntry[])
    : [];

  for (const entry of rsvpFormData) {
    if (!entry || typeof entry !== 'object') continue;
    const key = entry.analyticsKey || entry.label;
    if (key && entry.value !== undefined && entry.value !== null && entry.value !== '') {
      customFields[key] = entry.value;
    }
  }

  prefs.customFields = customFields;
  return prefs;
}
