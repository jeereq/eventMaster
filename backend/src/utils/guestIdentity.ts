export function normalizePhone(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const digits = value.replace(/[^\d+]/g, '');
  if (digits.length < 7) return null;
  return digits.startsWith('+') ? digits : digits;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function extractGuestPhone(guest: {
  phone?: string | null;
  email?: string;
  preferences?: unknown;
}): string | null {
  if (guest.phone?.trim()) {
    return normalizePhone(guest.phone);
  }

  if (guest.preferences && typeof guest.preferences === 'object') {
    const prefs = guest.preferences as Record<string, unknown>;
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

export function extractGuestEmail(guest: { email?: string }): string | null {
  const email = guest.email?.trim() || '';
  return isValidEmail(email) ? email.toLowerCase() : null;
}

export function buildGuestIdentityOrClauses(
  email: string | null,
  phone: string | null,
): Array<Record<string, unknown>> {
  const clauses: Array<Record<string, unknown>> = [];

  if (email) {
    clauses.push({ email: { equals: email, mode: 'insensitive' } });
  }

  if (phone) {
    clauses.push({ phone });
  }

  return clauses;
}
