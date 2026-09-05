'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { cn } from '@/lib/cn';

const STORAGE_KEY = 'em_mobile_splash_seen_v1';
const MIN_SHOW_MS = 1100;
const MAX_SHOW_MS = 2000;

function isMobileViewport() {
  if (typeof window === 'undefined') return false;
  const narrow = window.matchMedia('(max-width: 767px)').matches;
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (typeof navigator !== 'undefined' &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true);
  return narrow || standalone;
}

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function markSeen() {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* private mode */
  }
}

/**
 * Splash d’accueil mobile / PWA — une fois par session.
 * Dialogue modal : focus piégé, Passer coupe le délai.
 */
export default function MobileSplashScreen() {
  const { site } = usePlatformSite();
  const titleId = useId();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const dismissNowRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isMobileViewport()) return;
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      /* private mode */
    }

    if (prefersReducedMotion()) {
      markSeen();
      return;
    }

    setVisible(true);
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
      setLeaving(true);
      leaveTimer = window.setTimeout(() => {
        setVisible(false);
        restore();
        markSeen();
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
  }, []);

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
        'bg-[radial-gradient(120%_80%_at_50%_18%,color-mix(in_oklab,var(--primary)_32%,transparent),transparent_58%),var(--background)]',
        'px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]',
        'transition-opacity duration-300 ease-out motion-reduce:transition-none',
        leaving ? 'opacity-0 pointer-events-none' : 'opacity-100',
      )}
    >
      <div
        className={cn(
          'flex flex-col items-center gap-4 w-full max-w-[20rem] text-center transition duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none',
          leaving ? 'scale-[0.98] opacity-0' : 'scale-100 opacity-100',
        )}
      >
        <span className="w-16 h-16 rounded-[1.25rem] bg-primary-solid text-primary-foreground shadow-md flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- marque PWA, pas de hop next/image */}
          <img src="/icon.svg" alt="" width={36} height={36} className="w-9 h-9" />
        </span>
        <div className="space-y-1.5 w-full">
          <p id={titleId} className="text-xl font-display font-semibold tracking-tight text-foreground leading-tight break-words">
            {name}
          </p>
          {site.platformTagline ? (
            <p className="text-xs font-medium text-muted leading-snug break-words">
              {site.platformTagline}
            </p>
          ) : null}
        </div>
        <span
          className="mt-1 w-7 h-7 rounded-full border-2 border-primary/30 border-t-primary animate-spin motion-reduce:animate-none"
          aria-hidden
        />
        <button
          ref={skipRef}
          type="button"
          onClick={() => dismissNowRef.current()}
          className="mt-2 min-h-11 px-4 rounded-[var(--radius-button)] text-sm font-medium text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Passer
        </button>
      </div>
    </div>
  );
}
