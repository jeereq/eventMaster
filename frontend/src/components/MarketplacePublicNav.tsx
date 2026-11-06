'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Building2, Calendar, KeyRound, Sparkles, Store, Wine } from 'lucide-react';
import { cn } from '@/lib/cn';
import { folderTab } from '@/components/ui/segmented';

export type MarketplaceNavId = 'hub' | 'venues' | 'services' | 'rentals' | 'drinks' | 'events';

export default function MarketplacePublicNav({
  active,
  className,
  dense = false,
  variant = 'pill',
}: {
  active: MarketplaceNavId;
  className?: string;
  /** Une ligne scrollable — carte / focus mobile. */
  dense?: boolean;
  /** `tabs` : languettes du simulateur, à poser en bas d’un bandeau vert (`PublicPageHero tabs`). */
  variant?: 'pill' | 'tabs';
}) {
  const railRef = useRef<HTMLElement | null>(null);
  const activeRef = useRef<HTMLAnchorElement | null>(null);
  useEffect(() => {
    // Sur mobile la rangée défile : on garde la rubrique courante visible, sans bouger la page.
    const rail = railRef.current;
    const tab = activeRef.current;
    if (variant !== 'tabs' || !rail || !tab) return;
    const overflowRight = tab.offsetLeft + tab.offsetWidth - (rail.scrollLeft + rail.clientWidth);
    if (overflowRight > 0) rail.scrollLeft += overflowRight + 16;
    else if (tab.offsetLeft < rail.scrollLeft) rail.scrollLeft = tab.offsetLeft;
  }, [variant, active]);

  const items = [
    { id: 'hub' as const, href: '/marketplace', label: 'Marketplace', short: 'Hub', icon: Store },
    { id: 'venues' as const, href: '/marketplace/salles', label: 'Salles', short: 'Salles', icon: Building2 },
    { id: 'services' as const, href: '/marketplace/prestataires', label: 'Prestataires', short: 'Prestataires', icon: Sparkles },
    { id: 'rentals' as const, href: '/marketplace/locations', label: 'Matériel & Équipements', short: 'Matériel', icon: KeyRound },
    { id: 'drinks' as const, href: '/marketplace/boissons', label: 'Boissons', short: 'Boissons', icon: Wine },
    { id: 'events' as const, href: '/marketplace/evenements', label: 'Événements', short: 'Agenda', icon: Calendar },
  ];
  if (variant === 'tabs') {
    return (
      <nav
        ref={railRef}
        aria-label="Rubriques du marketplace"
        className={cn('relative flex gap-1 overflow-x-auto scrollbar-none', className)}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const selected = active === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              ref={selected ? activeRef : undefined}
              aria-current={selected ? 'page' : undefined}
              className={folderTab(selected, 'shrink-0 whitespace-nowrap px-3.5 sm:px-4 lg:px-5')}
            >
              <Icon aria-hidden className={cn('hidden sm:block w-4 h-4', selected ? 'text-primary-solid' : 'text-[#b0eed5]')} />
              <span className="xl:hidden">{item.short}</span>
              <span className="hidden xl:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <div
      className={cn(
        'gap-0.5 p-0.5 rounded-[var(--radius-button)] border border-border bg-surface-muted',
        // Mobile : deux rangées de trois onglets, tout reste visible sans défilement caché.
        'grid grid-cols-3 w-full max-w-full md:inline-flex md:w-auto md:flex-wrap',
        className,
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              'inline-flex items-center justify-center md:justify-start rounded-[var(--radius-button)] text-xs font-semibold transition shrink-0 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              dense ? 'min-h-11 gap-1 px-2.5' : 'min-h-11 gap-1.5 px-3.5',
              active === item.id
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-muted hover:text-foreground',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="md:hidden">{item.short}</span>
            <span className="hidden md:inline">{dense ? item.short : item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
