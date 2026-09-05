'use client';

import React, { useEffect, useRef, useState } from 'react';
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

/**
 * Splash d’accueil mobile / PWA — une fois par session.
 * Marque lisible, zone sûre (encoche), possible de passer.
 */
export default function MobileSplashScreen() {
  const { site } = usePlatformSite();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const finishRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isMobileViewport()) return;
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      /* private mode */
    }

    if (prefersReducedMotion()) {
      try {
        sessionStorage.setItem(STORAGE_KEY, '1');
      } catch {
        /* ignore */
      }
      return;
    }

    setVisible(true);
    const started = Date.now();
    let closed = false;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const finish = () => {
      if (closed) return;
      closed = true;
      const elapsed = Date.now() - started;
      const wait = Math.max(0, MIN_SHOW_MS - elapsed);
      window.setTimeout(() => {
        setLeaving(true);
        window.setTimeout(() => {
          setVisible(false);
          document.body.style.overflow = previousOverflow;
          try {
            sessionStorage.setItem(STORAGE_KEY, '1');
          } catch {
            /* ignore */
          }
        }, 280);
      }, wait);
    };
    finishRef.current = finish;

    const maxTimer = window.setTimeout(finish, MAX_SHOW_MS);
    if (document.readyState === 'complete') {
      finish();
    } else {
      window.addEventListener('load', finish, { once: true });
    }

    return () => {
      closed = true;
      window.clearTimeout(maxTimer);
      window.removeEventListener('load', finish);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!visible) return null;

  const name = site.platformName || 'EventMaster';

  const dismissNow = () => {
    finishRef.current();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!leaving}
      aria-label={`Chargement ${name}`}
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
          <p className="text-xl font-bold tracking-tight text-foreground leading-tight break-words">
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
          type="button"
          onClick={dismissNow}
          className="mt-2 min-h-11 px-4 rounded-[var(--radius-button)] text-sm font-medium text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Passer
        </button>
      </div>
    </div>
  );
}
