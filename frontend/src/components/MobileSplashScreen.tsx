'use client';

import React, { useEffect, useState } from 'react';
import { PartyPopper } from 'lucide-react';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { cn } from '@/lib/cn';

const STORAGE_KEY = 'em_mobile_splash_seen_v1';
const MIN_SHOW_MS = 900;
const MAX_SHOW_MS = 1600;

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
 * Splash d’accueil mobile / PWA — affiché une fois par session.
 * Nom de plateforme volontairement compact.
 */
export default function MobileSplashScreen() {
  const { site } = usePlatformSite();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isMobileViewport()) return;
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      /* private mode */
    }

    // Reduced motion : marque comme vu sans bloquer l’interface.
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
        }, 320);
      }, wait);
    };

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

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!leaving}
      aria-label={`Chargement ${name}`}
      inert={!leaving ? true : undefined}
      className={cn(
        'fixed inset-0 z-[10050] flex flex-col items-center justify-center md:hidden',
        'bg-[radial-gradient(120%_80%_at_50%_20%,color-mix(in_oklab,var(--primary)_28%,transparent),transparent_55%),var(--background)]',
        'transition-opacity duration-300 ease-out motion-reduce:transition-none',
        leaving ? 'opacity-0 pointer-events-none' : 'opacity-100',
      )}
    >
      <div
        className={cn(
          'flex flex-col items-center gap-3 px-6 text-center transition duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none',
          leaving ? 'scale-[0.98] opacity-0' : 'scale-100 opacity-100',
        )}
      >
        <span className="w-12 h-12 rounded-2xl bg-primary-solid text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center">
          <PartyPopper className="w-5 h-5" aria-hidden />
        </span>
        <p className="text-sm font-bold tracking-tight text-foreground leading-none max-w-[14rem] truncate">
          {name}
        </p>
        {site.platformTagline ? (
          <p className="text-[10px] font-medium text-muted leading-snug max-w-[16rem] line-clamp-2 break-words">
            {site.platformTagline}
          </p>
        ) : null}
        <span
          className="mt-3 w-5 h-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin motion-reduce:animate-none"
          aria-hidden
        />
      </div>
    </div>
  );
}
