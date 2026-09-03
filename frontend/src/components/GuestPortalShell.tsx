'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
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
}

function swipeBlocked(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest('[data-guest-no-swipe], input, textarea, select, [contenteditable="true"]'),
  );
}

export default function GuestPortalShell({
  title,
  eyebrow = 'Votre expérience invité',
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
}: GuestPortalShellProps) {
  const { site } = usePlatformSite();
  const brandLabel = organizationName?.trim() || site.platformName || 'EventMaster';
  const touchStart = useRef<{ x: number; y: number } | null>(null);

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
    <div className={cn('em-guest-page flex flex-col min-h-dvh', className)}>
      <CelebrateMood />
      <header className="sticky top-0 z-40 border-b border-border/70 bg-surface/85 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="page-container max-w-xl mx-auto min-h-12 sm:min-h-14 flex items-center justify-between gap-2 sm:gap-3 py-2.5 pl-[max(0px,env(safe-area-inset-left))] pr-[max(0px,env(safe-area-inset-right))]">
          {showBrand ? (
            <Link href="/" className="flex items-center gap-2.5 min-w-0 hover:opacity-90 transition">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-white text-[11px] font-bold shrink-0 shadow-sm">
                {brandLabel.slice(0, 1).toUpperCase()}
              </span>
              <span className="font-semibold text-foreground truncate tracking-tight">{brandLabel}</span>
            </Link>
          ) : (
            <div className="min-w-0 flex-1 space-y-0.5">
              <h1 className="text-sm font-semibold text-foreground truncate tracking-tight">{title}</h1>
              {eyebrow ? (
                <p className="text-[11px] text-muted truncate leading-snug">{eyebrow}</p>
              ) : null}
            </div>
          )}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {headerRight}
            <GuestThemeToggle />
            {guestId && <GuestPortalHomeLink guestId={guestId} />}
            <Link
              href="/guide/invite"
              aria-label="Aide invité"
              title="Aide invité"
              className="inline-flex items-center justify-center gap-1 min-h-11 min-w-11 sm:min-w-0 px-2.5 py-1.5 rounded-xl border border-border bg-surface text-[11px] font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <HelpCircle className="w-3.5 h-3.5" aria-hidden />
              <span className="hidden sm:inline">Aide</span>
            </Link>
          </div>
        </div>
      </header>

      <main
        className={cn(
          'page-container mx-auto w-full flex-1 max-w-xl py-4 sm:py-6 relative z-[1]',
          'pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]',
          tabs ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom))]' : 'pb-10',
          contentClassName,
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {showBrand && (
          <div className="mb-5 space-y-1">
            <h1 className="text-xl sm:text-2xl font-display font-semibold text-foreground tracking-tight leading-tight">
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
        <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/80 bg-surface/92 backdrop-blur-md pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.06)]">
          {tabs}
        </nav>
      ) : null}

      {footer}
    </div>
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
  return (
    <div className="page-container max-w-xl mx-auto px-1.5 sm:px-2.5 py-1.5 sm:py-2 pl-[max(0.375rem,env(safe-area-inset-left))] pr-[max(0.375rem,env(safe-area-inset-right))]">
      <div
        className="grid rounded-2xl border border-border bg-surface-muted/80 p-1 gap-0.5"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          const short = tab.shortLabel || tab.label;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-pressed={active}
              aria-label={tab.label}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-h-12 sm:min-h-[3.25rem] px-0.5 sm:px-1 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-semibold transition touch-manipulation',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-muted',
                active
                  ? 'bg-surface text-primary shadow-sm ring-1 ring-border'
                  : 'text-muted hover:text-foreground active:bg-surface/70',
              )}
            >
              <span className={cn('transition', active && 'scale-110')} aria-hidden>
                {tab.icon}
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
        'bg-surface border border-border/80 rounded-2xl shadow-[0_10px_40px_rgba(15,23,42,0.05)]',
        pad,
        className,
      )}
    >
      {children}
    </div>
  );
}
