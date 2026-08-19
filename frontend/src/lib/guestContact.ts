const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isPlaceholderGuestEmail(email?: string | null): boolean {
  return Boolean(email && /@guest\.local$/i.test(email.trim()));
}

export function isRealGuestEmail(email?: string | null): boolean {
  const value = String(email || '').trim();
  return EMAIL_RE.test(value) && !isPlaceholderGuestEmail(value);
}

export function displayGuestEmail(email?: string | null): string {
  if (!isRealGuestEmail(email)) return '';
  return String(email).trim();
}

export function placeholderEmailFromPhone(phone?: string | null): string | null {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 7) return null;
  return `wa.${digits}@guest.local`;
}

export function resolveGuestFormEmail(email: string, phone?: string | null): string | null {
  const trimmed = email.trim();
  if (isRealGuestEmail(trimmed)) return trimmed.toLowerCase();
  if (trimmed && !isPlaceholderGuestEmail(trimmed) && !EMAIL_RE.test(trimmed)) {
    return null;
  }
  return placeholderEmailFromPhone(phone);
}
