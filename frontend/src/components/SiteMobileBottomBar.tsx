'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Store, Rss, LayoutGrid, FileText } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface MobileNavItem {
  id: string;
  label: string;
  shortLabel?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SITE_MOBILE_NAV_ITEMS: MobileNavItem[] = [
  {
    id: 'home',
    label: 'Accueil',
    href: '/',
    icon: Home,
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    shortLabel: 'Market',
    href: '/marketplace',
    icon: Store,
  },
  {
    id: 'publications',
    label: 'Publications',
    shortLabel: 'Publi',
    href: '/activite',
    icon: Rss,
  },
  {
    id: 'editor',
    label: 'Plans 2D/3D',
    shortLabel: 'Plans',
    href: '/plans-3d',
    icon: LayoutGrid,
  },
  {
    id: 'modeles',
    label: 'Modèles',
    href: '/modeles',
    icon: FileText,
  },
];

function isItemActive(itemHref: string, pathname: string, currentHash: string): boolean {
  if (itemHref === '/') {
    return pathname === '/' && (!currentHash || currentHash === '#' || currentHash === '');
  }
  if (itemHref === '/plans-3d') {
    return pathname === '/plans-3d' || pathname === '/editeur' || pathname.startsWith('/plans-3d/');
  }
  if (itemHref === '/marketplace') {
    return pathname.startsWith('/marketplace') || pathname.startsWith('/evenements');
  }
  if (itemHref === '/activite') {
    return pathname === '/activite' || pathname.startsWith('/activite/');
  }
  if (itemHref === '/modeles') {
    return pathname === '/modeles' || pathname.startsWith('/modeles/');
  }
  return pathname === itemHref;
}

export default function SiteMobileBottomBar({
  className,
}: {
  className?: string;
}) {
  const pathname = usePathname();
  const [currentHash, setCurrentHash] = useState('');

  useEffect(() => {
    const handleHash = () => {
      if (typeof window !== 'undefined') {
        setCurrentHash(window.location.hash);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, item: MobileNavItem) => {
    if (item.href === '/') {
      if (pathname === '/') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (currentHash) {
          window.history.replaceState(null, '', '/');
          setCurrentHash('');
        }
      }
      return;
    }
  };

  return (
    <nav
      aria-label="Navigation mobile principale"
      className={cn(
        'md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 dark:bg-background/95 backdrop-blur-xl border-t border-border/80 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.35)] pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1 pl-[max(0.25rem,env(safe-area-inset-left))] pr-[max(0.25rem,env(safe-area-inset-right))] transition-transform',
        className,
      )}
    >
      <div className="grid grid-cols-5 gap-0.5 items-center max-w-lg mx-auto">
        {SITE_MOBILE_NAV_ITEMS.map((item) => {
          const active = isItemActive(item.href, pathname, currentHash);
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={(e) => handleClick(e, item)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-h-[48px] py-1 px-0.5 rounded-xl transition-all select-none touch-manipulation cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                active
                  ? 'text-primary font-bold'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <div
                className={cn(
                  'p-1 sm:p-1.5 rounded-lg transition-all flex items-center justify-center relative',
                  active
                    ? 'bg-primary/15 text-primary scale-105'
                    : 'bg-transparent text-muted',
                )}
              >
                <Icon className="w-[18px] h-[18px] sm:w-[19px] sm:h-[19px]" />
                {active && (
                  <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[11px] tracking-tight leading-tight truncate max-w-full text-center">
                {item.shortLabel ? (
                  <>
                    <span className="hidden min-[400px]:inline">{item.label}</span>
                    <span className="inline min-[400px]:hidden">{item.shortLabel}</span>
                  </>
                ) : (
                  item.label
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
