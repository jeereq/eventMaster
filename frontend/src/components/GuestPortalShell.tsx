'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { GuestPortalHomeLink } from '@/components/GuestPortalNav';

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
  eyebrow = 'Espace invité',
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
  const brandLabel = organizationName?.trim() || 'EventMaster';
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
      <header className="sticky top-0 z-40 border-b border-border bg-surface">
        <div className="page-container max-w-xl mx-auto h-14 flex items-center justify-between gap-3">
          {showBrand ? (
            <Link href="/" className="flex items-center gap-2.5 min-w-0 hover:opacity-90 transition">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-button)] bg-primary text-white text-[11px] font-semibold shrink-0">
                {brandLabel.slice(0, 1).toUpperCase()}
              </span>
              <span className="font-semibold text-foreground truncate tracking-tight">{brandLabel}</span>
            </Link>
          ) : (
            <div className="min-w-0 space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{eyebrow}</p>
              <h1 className="text-sm font-semibold text-foreground truncate tracking-tight">{title}</h1>
            </div>
          )}
          <div className="flex items-center gap-2 shrink-0">
            {headerRight}
            {guestId && <GuestPortalHomeLink guestId={guestId} />}
            <Link
              href="/guide/invite"
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-[var(--radius-button)] border border-border bg-surface text-[11px] font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition"
              title="Aide invité"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Aide</span>
            </Link>
          </div>
        </div>
      </header>

      <main
        className={cn(
          'page-container mx-auto w-full flex-1 max-w-xl py-5',
          tabs ? 'pb-[calc(4.75rem+env(safe-area-inset-bottom))]' : 'pb-8',
          contentClassName,
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {showBrand && (
          <div className="mb-5 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{eyebrow}</p>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">{title}</h1>
          </div>
        )}
        {children}
      </main>

      {tabs ? (
        <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
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
  tabs: Array<{ id: string; label: string; icon: React.ReactNode }>;
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="page-container max-w-xl mx-auto px-2 py-2">
      <div
        className="grid rounded-[var(--radius-button)] border border-border bg-surface-muted p-0.5"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-pressed={active}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-h-[3.15rem] px-1 py-1.5 rounded-[var(--radius-button)] text-[10px] font-semibold transition',
                active
                  ? 'bg-surface text-primary shadow-sm ring-1 ring-border'
                  : 'text-muted hover:text-foreground',
              )}
            >
              {tab.icon}
              <span className="truncate max-w-full leading-tight">{tab.label}</span>
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
        'bg-surface border border-border rounded-[var(--radius-card)] shadow-[var(--shadow-soft)]',
        pad,
        className,
      )}
    >
      {children}
    </div>
  );
}
