/** Splash mobile / PWA — clés sessionStorage partagées. */

export const MOBILE_SPLASH_SEEN_KEY = 'em_mobile_splash_seen_v1';
/** Forcer le splash après connexion / OTP (ignore « déjà vu » dans la session). */
export const MOBILE_SPLASH_FORCE_KEY = 'em_force_splash';

export function isMobileSplashViewport(): boolean {
  if (typeof window === 'undefined') return false;
  const narrow = window.matchMedia('(max-width: 767px)').matches;
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (typeof navigator !== 'undefined' &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true);
  return narrow || standalone;
}

export function requestMobileSplashAfterAuth(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(MOBILE_SPLASH_FORCE_KEY, '1');
    sessionStorage.removeItem(MOBILE_SPLASH_SEEN_KEY);
    document.documentElement.classList.add('em-splash-boot');
  } catch {
    /* private mode */
  }
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
  document.documentElement.classList.remove('em-splash-boot');
}

export function clearMobileSplashBootClass(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove('em-splash-boot');
}
