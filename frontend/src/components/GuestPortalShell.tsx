'use client';

import React from 'react';
import Link from 'next/link';
import { PartyPopper } from 'lucide-react';
import { cn } from '@/lib/cn';
import { GuestPortalHomeLink } from '@/components/GuestPortalNav';
import CelebrateMood from '@/components/CelebrateMood';

interface GuestPortalShellProps {
  title: string;
  eyebrow?: string;
  guestId?: string;
  showBrand?: boolean;
  children: React.ReactNode;
  tabs?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

/**
 * Chrome commun des vues invité — Celebrate (surfaces tièdes + stripe accent).
 */
export default function GuestPortalShell({
  title,
  eyebrow = 'Espace invité',
  guestId,
  showBrand = false,
  children,
  tabs,
  footer,
  className,
  contentClassName,
}: GuestPortalShellProps) {
  return (
    <div className={cn('min-h-screen bg-background flex flex-col', className)}>
      <CelebrateMood />
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-sm em-celebrate-stripe">
        <div className="page-container max-w-xl mx-auto h-14 flex items-center justify-between gap-3 pl-1">
          {showBrand ? (
            <Link href="/" className="flex items-center gap-2.5 min-w-0 hover:opacity-90 transition">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-button)] bg-primary text-white shrink-0">
                <PartyPopper className="w-3.5 h-3.5" />
              </span>
              <span className="font-display font-semibold text-foreground truncate">EventMaster</span>
            </Link>
          ) : (
            <div className="min-w-0 space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--festive-accent)]">
                {eyebrow}
              </p>
              <h1 className="text-sm font-display font-semibold text-foreground truncate">{title}</h1>
            </div>
          )}
          <div className="flex items-center gap-2 shrink-0">
            {showBrand && (
              <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wider text-muted">
                {eyebrow}
              </span>
            )}
            {guestId && <GuestPortalHomeLink guestId={guestId} />}
          </div>
        </div>
        {tabs}
      </header>

      <main className={cn('page-container mx-auto w-full flex-1 py-5 pb-8 max-w-xl', contentClassName)}>
        {showBrand && (
          <div className="mb-5 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--festive-accent)]">
              {eyebrow}
            </p>
            <h1 className="text-xl sm:text-2xl font-display font-semibold text-foreground tracking-tight">
              {title}
            </h1>
          </div>
        )}
        {children}
      </main>

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
    <div className="border-t border-border bg-surface">
      <div className="page-container max-w-xl mx-auto p-2 flex gap-1 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-button)] text-xs font-semibold whitespace-nowrap transition',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:text-foreground hover:bg-surface-muted',
              )}
            >
              {tab.icon}
              {tab.label}
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
