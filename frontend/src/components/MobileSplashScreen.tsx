'use client';

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { cn } from '@/lib/cn';
import {
  clearMobileSplashBootClass,
  markMobileSplashSeen,
  shouldShowMobileSplash,
} from '@/lib/mobileSplash';

const MIN_SHOW_MS = 1200;
const MAX_SHOW_MS = 2200;

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Splash d’accueil mobile / PWA.
 * Couleurs marque fixes (pas le fond dark) pour éviter un premier écran noir.
 * Affiché aussi après login via `requestMobileSplashAfterAuth`.
 */
export default function MobileSplashScreen() {
  const { site } = usePlatformSite();
  const titleId = useId();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const dismissNowRef = useRef<() => void>(() => {});

  // Afficher dès le premier paint client (avant paint paint si possible)
  useLayoutEffect(() => {
    if (!shouldShowMobileSplash()) {
      clearMobileSplashBootClass();
      return;
    }
    setVisible(true);
  }, []);

  // Rejouer après login (le composant reste monté dans le layout racine)
  useEffect(() => {
    const onRequest = () => {
      if (!shouldShowMobileSplash()) return;
      setLeaving(false);
      setVisible(true);
    };
    window.addEventListener('em-mobile-splash-request', onRequest);
    return () => window.removeEventListener('em-mobile-splash-request', onRequest);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const quiet = prefersReducedMotion();
    const started = Date.now();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let waitTimer = 0;
    let leaveTimer = 0;
    let maxTimer = 0;
    let leaveStarted = false;

    const restore = () => {
      document.body.style.overflow = previousOverflow;
    };

    const startLeave = () => {
      if (leaveStarted) return;
      leaveStarted = true;
      window.clearTimeout(waitTimer);
      window.clearTimeout(maxTimer);
      if (quiet) {
        setVisible(false);
        restore();
        markMobileSplashSeen();
        return;
      }
      setLeaving(true);
      leaveTimer = window.setTimeout(() => {
        setVisible(false);
        restore();
        markMobileSplashSeen();
      }, 280);
    };

    const finishAuto = () => {
      if (leaveStarted) return;
      const wait = Math.max(0, MIN_SHOW_MS - (Date.now() - started));
      waitTimer = window.setTimeout(startLeave, wait);
    };

    dismissNowRef.current = () => {
      window.clearTimeout(waitTimer);
      window.clearTimeout(maxTimer);
      startLeave();
    };

    maxTimer = window.setTimeout(finishAuto, MAX_SHOW_MS);
    if (document.readyState === 'complete') {
      finishAuto();
    } else {
      window.addEventListener('load', finishAuto, { once: true });
    }

    return () => {
      leaveStarted = true;
      window.clearTimeout(waitTimer);
      window.clearTimeout(leaveTimer);
      window.clearTimeout(maxTimer);
      window.removeEventListener('load', finishAuto);
      restore();
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    skipRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismissNowRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      event.preventDefault();
      skipRef.current?.focus();
    };

    const onFocusIn = (event: FocusEvent) => {
      const root = rootRef.current;
      if (!root || root.contains(event.target as Node)) return;
      skipRef.current?.focus();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [visible]);

  if (!visible) return null;

  const name = site.platformName || 'EventMaster';

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-busy={!leaving}
      className={cn(
        'fixed inset-0 z-[10050] flex flex-col items-center justify-center',
        /* Fond marque clair — indépendant du mode sombre (évite écran noir). */
        'bg-[#f6f7f8]',
        'px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]',
        'transition-opacity duration-300 ease-out motion-reduce:transition-none',
        leaving ? 'opacity-0 pointer-events-none' : 'opacity-100',
      )}
      style={{
        backgroundImage:
          'radial-gradient(120% 80% at 50% 18%, color-mix(in oklab, #059669 22%, transparent), transparent 58%)',
      }}
    >
      <div
        className={cn(
          'flex flex-col items-center gap-4 w-full max-w-[20rem] text-center transition duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none',
          leaving ? 'scale-[0.98] opacity-0' : 'scale-100 opacity-100',
        )}
      >
        <span className="w-16 h-16 rounded-[1.25rem] shadow-lg flex items-center justify-center overflow-hidden bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element -- marque PWA, pas de hop next/image */}
          <img src="/icon.svg" alt="" width={64} height={64} className="w-16 h-16 rounded-[1.25rem]" />
        </span>
        <div className="space-y-1.5 w-full">
          <p
            id={titleId}
            className="text-xl font-display font-semibold tracking-tight text-[#1e1f21] leading-tight break-words"
          >
            {name}
          </p>
          {site.platformTagline ? (
            <p className="text-xs font-medium text-[#6d6e6f] leading-snug break-words">
              {site.platformTagline}
            </p>
          ) : null}
        </div>
        <span
          className="mt-1 w-7 h-7 rounded-full border-2 border-[#059669]/30 border-t-[#059669] animate-spin motion-reduce:hidden"
          aria-hidden
        />
        <button
          ref={skipRef}
          type="button"
          onClick={() => dismissNowRef.current()}
          className="mt-2 min-h-11 px-4 rounded-[var(--radius-button)] text-sm font-medium text-[#6d6e6f] hover:text-[#1e1f21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#059669]/40"
        >
          Passer
        </button>
      </div>
    </div>
  );
}
