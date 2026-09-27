const TOKEN_KEY = 'token';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = window.sessionStorage.getItem(TOKEN_KEY);
  if (token) return token;

  // Migration ponctuelle des anciennes sessions persistantes.
  const legacyToken = window.localStorage.getItem(TOKEN_KEY);
  if (!legacyToken) return null;
  window.sessionStorage.setItem(TOKEN_KEY, legacyToken);
  window.localStorage.removeItem(TOKEN_KEY);
  return legacyToken;
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(TOKEN_KEY, token);
  window.localStorage.removeItem(TOKEN_KEY);
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(TOKEN_KEY);
}
