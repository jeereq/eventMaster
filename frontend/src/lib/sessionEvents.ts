export const SESSION_EXPIRED_EVENT = 'em-session-expired';

const AUTH_EXEMPT_PREFIXES = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-otp',
  '/auth/resend-otp',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/ask-reset',
];

export function isAuthExemptPath(path: string): boolean {
  return AUTH_EXEMPT_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}?`));
}

export function notifySessionExpired(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}
