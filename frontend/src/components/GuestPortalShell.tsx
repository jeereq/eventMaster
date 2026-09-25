'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Calendar, HelpCircle, MapPin } from 'lucide-react';
import { cn } from '@/lib/cn';
import { scrollAppToTop, tapHaptic } from '@/lib/mobileNative';
import { prefersReducedMotion } from '@/lib/prefersReducedMotion';
import { guestCountdownLabel, guestLongDate } from '@/lib/guestDates';
import { GuestPortalHomeLink } from '@/components/GuestPortalNav';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import GuestThemeToggle from '@/components/GuestThemeToggle';
import CelebrateMood from '@/components/CelebrateMood';

interface GuestPortalShellProps {
  title: string;
  eyebrow?: string;
  guestId?: string;
  showBrand?: boolean;
  organizationName?: string;
  children: React.ReactNode;
  tabs?: React.ReactNode;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** Ids d’onglets pour le swipe horizontal (même ordre que la barre). */
  swipeTabIds?: string[];
  activeTabId?: string;
  onTabChange?: (id: string) => void;
  /** Masque le chrome aux lecteurs d’écran quand un dialog recouvre la page. */
  inert?: boolean;
}

function swipeBlocked(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest('[data-guest-no-swipe], input, textarea, select, [contenteditable="true"]'),
  );
}

export default function GuestPortalShell({
  title,
  eyebrow,
  guestId,
  showBrand = false,
  organizationName,
  children,
  tabs,
  headerRight,
  footer,
  className,
  contentClassName,
  swipeTabIds,
  activeTabId,
  onTabChange,
  inert = false,
}: GuestPortalShellProps) {
  const { site } = usePlatformSite();
  const brandLabel = organizationName?.trim() || site.platformName || 'EventMaster';
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const firstTab = useRef(true);

  // Fondu doux à chaque changement d’onglet, comme un écran d’app.
  useEffect(() => {
    if (firstTab.current) {
      firstTab.current = false;
      return;
    }
    const main = mainRef.current;
    if (!main || typeof main.animate !== 'function' || prefersReducedMotion()) return;
    main.animate([{ opacity: 0.35 }, { opacity: 1 }], {
      duration: 220,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    });
  }, [activeTabId]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!swipeTabIds?.length || !onTabChange) return;
    if (swipeBlocked(e.target)) return;
    const t = e.changedTouches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!swipeTabIds?.length || !onTabChange || !activeTabId) return;
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 56 || Math.abs(dy) > 48) return;
    const index = swipeTabIds.indexOf(activeTabId);
    if (index < 0) return;
    const next = dx < 0 ? swipeTabIds[index + 1] : swipeTabIds[index - 1];
    if (next) onTabChange(next);
  };

  return (
    <div className={cn('em-guest-page flex flex-col min-h-dvh', className)} inert={inert || undefined}>
      <CelebrateMood />
      <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="w-full max-w-xl mx-auto min-h-14 flex items-center justify-between gap-2 sm:gap-3 py-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
          {showBrand ? (
            <Link href="/" className="flex items-center gap-2.5 min-w-0 hover:opacity-90 transition">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-[10px] bg-primary-solid text-primary-foreground font-display text-base font-bold shrink-0">
                {brandLabel.slice(0, 1).toUpperCase()}
              </span>
              <span className="font-display text-lg font-semibold text-foreground truncate">{brandLabel}</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span
                aria-hidden
                className="inline-flex items-center justify-center w-9 h-9 rounded-[10px] bg-primary-solid text-primary-foreground font-display text-base font-bold shrink-0"
              >
                {brandLabel.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <h1 className="font-display text-[15px] sm:text-base font-semibold text-foreground truncate leading-tight">{title}</h1>
                <p className="text-xs text-muted truncate leading-snug">{eyebrow || brandLabel}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-1.5 shrink-0">
            {headerRight}
            <GuestThemeToggle className="!rounded-full !shadow-none !text-foreground" />
            {guestId && <GuestPortalHomeLink guestId={guestId} />}
            <Link
              href="/guide/invite"
              aria-label="Aide invité"
              title="Aide invité"
              className="inline-flex items-center justify-center h-11 w-11 rounded-full border border-border bg-surface text-foreground hover:bg-surface-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <HelpCircle className="w-[18px] h-[18px]" aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        ref={mainRef}
        className={cn(
          'mx-auto w-full flex-1 max-w-xl py-4 sm:py-6 relative z-[1]',
          'pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]',
          tabs ? 'pb-[calc(6rem+env(safe-area-inset-bottom))]' : 'pb-10',
          contentClassName,
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {showBrand && (
          <div className="mb-5 space-y-1">
            <h1 className="text-2xl sm:text-[1.75rem] font-display font-semibold text-foreground leading-tight">
              {title}
            </h1>
            {eyebrow ? (
              <p className="text-sm text-muted leading-snug">{eyebrow}</p>
            ) : null}
          </div>
        )}
        {children}
      </main>

      {tabs ? (
        <nav
          aria-label="Navigation de l’espace invité"
          className="em-tabbar fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface/92 dark:bg-stage-elevated/95 backdrop-blur-2xl backdrop-saturate-150 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.18)]"
        >
          {tabs}
        </nav>
      ) : null}

      {footer}
    </div>
  );
}

export function GuestHowTo({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-col gap-1.5 text-xs text-muted leading-relaxed">
      {steps.map((step, index) => (
        <li key={step} className="inline-flex items-start gap-1.5 min-w-0">
          <span className="font-semibold text-foreground tabular-nums shrink-0">{index + 1}.</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

export function GuestPortalTabBar({
  tabs,
  activeId,
  onChange,
}: {
  tabs: Array<{ id: string; label: string; shortLabel?: string; icon: React.ReactNode }>;
  activeId: string;
  onChange: (id: string) => void;
}) {
  const tabRefs = useRef<Partial<Record<string, HTMLButtonElement | null>>>({});

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const ids = tabs.map((tab) => tab.id);
    const current = Math.max(0, ids.indexOf(activeId));
    let next = current;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = (current + 1) % ids.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = (current - 1 + ids.length) % ids.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = ids.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    onChange(ids[next]);
    requestAnimationFrame(() => tabRefs.current[ids[next]]?.focus());
  };

  return (
    <div className="w-full max-w-xl mx-auto px-1.5 pt-1 pl-[max(0.375rem,env(safe-area-inset-left))] pr-[max(0.375rem,env(safe-area-inset-right))]">
      <div
        role="tablist"
        aria-label="Sections de l’invitation"
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          const isDonation = tab.id === 'donations';
          const short = tab.shortLabel || tab.label;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`guest-tab-${tab.id}`}
              aria-controls={`guest-panel-${tab.id}`}
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              ref={(node) => {
                tabRefs.current[tab.id] = node;
              }}
              onClick={() => {
                tapHaptic();
                // Re-taper l’onglet courant remonte en haut, comme dans une app native.
                if (active) {
                  scrollAppToTop();
                  return;
                }
                onChange(tab.id);
              }}
              aria-label={tab.label}
              className={cn(
                'em-tab relative flex flex-col items-center justify-center gap-0.5 min-h-[50px] py-1 px-0.5 rounded-2xl text-[10.5px] min-[400px]:text-[11px] transition-colors duration-200 touch-manipulation',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                active ? 'text-primary-solid dark:text-primary font-semibold' : 'text-muted hover:text-foreground font-medium',
              )}
            >
              <span aria-hidden className="em-tab-pill">
                <span className={cn('relative', isDonation && 'text-rose-600 dark:text-rose-400')}>{tab.icon}</span>
                {isDonation && !active && (
                  <span className="absolute top-0.5 right-2.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
                )}
              </span>
              <span className="truncate max-w-full leading-tight px-0.5">
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function GuestPortalCard({
  children,
  className,
  padding = 'md',
}: {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  /** Conservé pour compat — le chrome invité suit désormais le workspace. */
  festive?: boolean;
}) {
  const pad = padding === 'sm' ? 'p-4' : padding === 'lg' ? 'p-6' : 'p-5';
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-[1.125rem]',
        pad,
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Carte vert profond du nouveau design : compte à rebours, titre, date et lieu.
 * `badge` s’affiche à droite du compte à rebours (ex. « Confirmé »).
 */
export function GuestEventHero({
  greeting,
  title,
  date,
  location,
  badge,
  children,
  className,
}: {
  greeting?: string;
  title: string;
  date: string;
  location?: string | null;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('em-guest-hero__banner rounded-3xl', className)}>
      <div className="relative z-[1] flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="em-guest-chip em-guest-chip--count">{guestCountdownLabel(date)}</span>
          {badge}
        </div>
        <div className="space-y-1">
          {greeting ? <p className="text-sm text-[#a7f3d0]">{greeting}</p> : null}
          <h2 className="font-display text-[1.625rem] sm:text-[1.75rem] font-semibold leading-[1.15] text-white break-words">
            {title}
          </h2>
        </div>
        <div className="flex flex-col gap-2 text-sm text-[#d1fae5]">
          <span className="inline-flex items-start gap-2">
            <Calendar className="w-[18px] h-[18px] shrink-0 mt-px" aria-hidden />
            <span>{guestLongDate(date)}</span>
          </span>
          {location ? (
            <span className="inline-flex items-start gap-2 min-w-0">
              <MapPin className="w-[18px] h-[18px] shrink-0 mt-px" aria-hidden />
              <span className="line-clamp-2">{location}</span>
            </span>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}
