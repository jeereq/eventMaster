'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import {
  hideNativeSplashShell,
  markMobileSplashSeen,
  shouldShowMobileSplash,
  showNativeSplashShell,
} from '@/lib/mobileSplash';

const MIN_SHOW_MS = 1200;
const MAX_SHOW_MS = 2200;

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Pilote le splash HTML natif (#em-native-splash) — pas de second overlay React.
 * Le shell est visible dès le boot script → plus de flash noir.
 */
export default function MobileSplashScreen() {
  const { site } = usePlatformSite();
  const leaveStartedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const timersRef = useRef<{ wait?: number; leave?: number; max?: number }>({});

  useEffect(() => {
    const title = document.querySelector('#em-native-splash .em-ns-title');
    if (title && site.platformName) title.textContent = site.platformName;
    const root = document.getElementById('em-native-splash');
    if (root && site.platformName) root.setAttribute('aria-label', site.platformName);
  }, [site.platformName]);

  const clearTimers = () => {
    const t = timersRef.current;
    if (t.wait) window.clearTimeout(t.wait);
    if (t.leave) window.clearTimeout(t.leave);
    if (t.max) window.clearTimeout(t.max);
    timersRef.current = {};
  };

  const startLeave = (quiet: boolean) => {
    if (leaveStartedRef.current) return;
    leaveStartedRef.current = true;
    clearTimers();
    const el = document.getElementById('em-native-splash');
    if (quiet) {
      markMobileSplashSeen();
      return;
    }
    el?.classList.add('is-leaving');
    timersRef.current.leave = window.setTimeout(() => {
      markMobileSplashSeen();
      el?.classList.remove('is-leaving');
    }, 280);
  };

  const runSplashCycle = () => {
    cleanupRef.current?.();
    cleanupRef.current = null;

    if (!shouldShowMobileSplash()) {
      hideNativeSplashShell();
      return;
    }

    leaveStartedRef.current = false;
    clearTimers();
    showNativeSplashShell();

    const quiet = prefersReducedMotion();
    const started = Date.now();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const finishAuto = () => {
      if (leaveStartedRef.current) return;
      const wait = Math.max(0, MIN_SHOW_MS - (Date.now() - started));
      timersRef.current.wait = window.setTimeout(() => startLeave(quiet), wait);
    };

    const onSkip = () => startLeave(quiet);
    const skipBtn = document.getElementById('em-native-splash-skip');
    skipBtn?.addEventListener('click', onSkip);

    timersRef.current.max = window.setTimeout(finishAuto, MAX_SHOW_MS);
    if (document.readyState === 'complete') {
      finishAuto();
    } else {
      window.addEventListener('load', finishAuto, { once: true });
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        startLeave(quiet);
      }
    };
    document.addEventListener('keydown', onKeyDown);

    cleanupRef.current = () => {
      leaveStartedRef.current = true;
      clearTimers();
      window.removeEventListener('load', finishAuto);
      document.removeEventListener('keydown', onKeyDown);
      skipBtn?.removeEventListener('click', onSkip);
      document.body.style.overflow = previousOverflow;
    };
  };

  useLayoutEffect(() => {
    if (!shouldShowMobileSplash()) {
      hideNativeSplashShell();
      return;
    }
    runSplashCycle();
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onRequest = () => {
      if (!shouldShowMobileSplash()) return;
      runSplashCycle();
    };
    window.addEventListener('em-mobile-splash-request', onRequest);
    return () => window.removeEventListener('em-mobile-splash-request', onRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
