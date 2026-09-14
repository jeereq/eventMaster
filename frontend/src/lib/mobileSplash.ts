/** Splash mobile / PWA — clés sessionStorage + shell HTML natif (#em-native-splash). */

export const MOBILE_SPLASH_SEEN_KEY = 'em_mobile_splash_seen_v1';
export const MOBILE_SPLASH_FORCE_KEY = 'em_force_splash';

const PENDING_DARK_KEY = '__emPendingDark';

export function isMobileSplashViewport(): boolean {
  if (typeof window === 'undefined') return false;
  const narrow = window.matchMedia('(max-width: 767px)').matches;
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (typeof navigator !== 'undefined' &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true);
  return narrow || standalone;
}

function nativeSplashEl(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.getElementById('em-native-splash');
}

/** Affiche le shell HTML immédiatement (avant React) et reporte le mode sombre. */
export function showNativeSplashShell(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.add('em-splash-boot');

  if (root.classList.contains('dark')) {
    try {
      (window as unknown as Record<string, unknown>)[PENDING_DARK_KEY] = true;
    } catch {
      /* ignore */
    }
    root.classList.remove('dark');
  }

  const el = nativeSplashEl();
  if (el) {
    el.classList.add('is-on');
    el.setAttribute('aria-hidden', 'false');
    el.removeAttribute('hidden');
  }
}

export function hideNativeSplashShell(): void {
  if (typeof document === 'undefined') return;
  const el = nativeSplashEl();
  if (el) {
    el.classList.remove('is-on');
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('hidden', '');
  }
  document.documentElement.classList.remove('em-splash-boot');

  try {
    const w = window as unknown as Record<string, unknown>;
    if (w[PENDING_DARK_KEY]) {
      document.documentElement.classList.add('dark');
      delete w[PENDING_DARK_KEY];
    }
  } catch {
    /* ignore */
  }
}

export function requestMobileSplashAfterAuth(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(MOBILE_SPLASH_FORCE_KEY, '1');
    sessionStorage.removeItem(MOBILE_SPLASH_SEEN_KEY);
  } catch {
    /* private mode */
  }
  showNativeSplashShell();
  window.dispatchEvent(new Event('em-mobile-splash-request'));
}

export function shouldShowMobileSplash(): boolean {
  if (typeof window === 'undefined') return false;
  if (!isMobileSplashViewport()) return false;
  try {
    if (sessionStorage.getItem(MOBILE_SPLASH_FORCE_KEY) === '1') return true;
    if (sessionStorage.getItem(MOBILE_SPLASH_SEEN_KEY) === '1') return false;
  } catch {
    return true;
  }
  return true;
}

export function markMobileSplashSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(MOBILE_SPLASH_SEEN_KEY, '1');
    sessionStorage.removeItem(MOBILE_SPLASH_FORCE_KEY);
  } catch {
    /* private mode */
  }
  hideNativeSplashShell();
}

export function clearMobileSplashBootClass(): void {
  hideNativeSplashShell();
}
