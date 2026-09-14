'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Store, LayoutGrid, FileText, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { revealAndScrollToSection } from '@/lib/aiFabPlacement';
import { motionSafeScrollBehavior } from '@/lib/prefersReducedMotion';
import { usePlatformSite } from '@/context/PlatformSiteContext';

const SIMULATOR_HREF = '/simulateur';

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
    id: 'simulator',
    label: 'Simulateur',
    href: SIMULATOR_HREF,
    icon: Sparkles,
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
  if (itemHref === SIMULATOR_HREF) {
    return pathname === '/simulateur' || pathname.startsWith('/simulateur');
  }
  if (itemHref === '/plans-3d') {
    return pathname === '/plans-3d' || pathname === '/editeur' || pathname.startsWith('/plans-3d/');
  }
  if (itemHref === '/marketplace') {
    return pathname.startsWith('/marketplace') || pathname.startsWith('/evenements');
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
  const { site } = usePlatformSite();
  const isBudgetBlocked = site?.studioVisibility?.budget === false;
  const [currentHash, setCurrentHash] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const handleHash = () => {
      if (typeof window !== 'undefined') {
        setCurrentHash(window.location.hash);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    setMounted(true);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, item: MobileNavItem) => {
    if (item.href === '/') {
      if (pathname === '/') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: motionSafeScrollBehavior() });
        if (currentHash) {
          window.history.replaceState(null, '', '/');
          setCurrentHash('');
        }
      }
      return;
    }
  };

  const nav = (
    <nav
      aria-label="Navigation mobile principale"
      className={cn(
        'em-site-bottom-nav md:hidden pointer-events-none px-3 sm:px-4 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-1',
        className,
      )}
    >
      <div className="pointer-events-auto max-w-md mx-auto bg-surface/92 dark:bg-[#18181b]/92 backdrop-blur-2xl border border-border/80 dark:border-white/10 rounded-full shadow-[0_12px_36px_-6px_rgba(0,0,0,0.14),0_4px_16px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.6)] px-1.5 py-1 grid grid-cols-5 gap-0.5 items-center relative">
        {SITE_MOBILE_NAV_ITEMS.map((item) => {
          const active = isItemActive(item.href, pathname, currentHash);
          const Icon = item.icon;
          const isHashHref = item.href.startsWith('/#');
          const isSimulatorUpcoming = item.id === 'simulator' && isBudgetBlocked;

          const classNameItem = cn(
            'relative flex flex-col items-center justify-center gap-0.5 min-h-[46px] py-1 px-1 rounded-full transition-all duration-200 select-none touch-manipulation cursor-pointer',
            'active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            active
              ? 'text-primary-solid dark:text-primary font-bold'
              : 'text-muted hover:text-foreground',
          );

          const inner = (
            <>
              {/* Icône avec pastille d'état actif et badge événementiel */}
              <div
                className={cn(
                  'p-1.5 rounded-full transition-all duration-200 flex items-center justify-center relative',
                  active
                    ? 'bg-primary/12 text-primary-solid dark:text-primary scale-105'
                    : 'bg-transparent text-muted group-hover:text-foreground',
                )}
              >
                <Icon className="w-[18px] h-[18px]" aria-hidden />

                {/* Badge d'alerte fonctionnalité à venir */}
                {isSimulatorUpcoming ? (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-surface dark:ring-[#18181b]"
                    title="Fonctionnalité à venir"
                  />
                ) : null}

                {/* Point indicateur discret sous l'icône active */}
                {active && !isSimulatorUpcoming && (
                  <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary-solid dark:bg-primary" />
                )}
              </div>

              {/* Typographie propre aux codes de la plateforme */}
              <span className="text-[10px] tracking-tight leading-tight truncate max-w-full text-center">
                {isSimulatorUpcoming ? (
                  <>
                    <span>Simulateur</span>
                    <span className="block text-[8px] font-bold text-amber-600 dark:text-amber-400 -mt-0.5">
                      À venir
                    </span>
                  </>
                ) : item.shortLabel ? (
                  <>
                    <span className="hidden min-[400px]:inline">{item.label}</span>
                    <span className="inline min-[400px]:hidden">{item.shortLabel}</span>
                  </>
                ) : (
                  item.label
                )}
              </span>
            </>
          );

          if (isHashHref) {
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => handleClick(e, item)}
                aria-current={active ? 'page' : undefined}
                className={classNameItem}
              >
                {inner}
              </a>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={(e) => handleClick(e, item)}
              aria-current={active ? 'page' : undefined}
              className={classNameItem}
            >
              {inner}
            </Link>
          );
        })}
      </div>
    </nav>
  );

  if (!mounted) return nav;
  return createPortal(nav, document.body);
}
