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
        'em-site-bottom-nav md:hidden',
        // Style Netflix signature : fond noir obsidienne cinématographique avec flou de verre
        'bg-[#121212]/96 backdrop-blur-2xl',
        'border-t border-white/[0.08]',
        'shadow-[0_-8px_30px_rgba(0,0,0,0.6)]',
        'pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5',
        'pl-[max(0.25rem,env(safe-area-inset-left))] pr-[max(0.25rem,env(safe-area-inset-right))]',
        className,
      )}
    >
      <div className="grid grid-cols-5 gap-0 items-center max-w-xl mx-auto relative">
        {SITE_MOBILE_NAV_ITEMS.map((item) => {
          const active = isItemActive(item.href, pathname, currentHash);
          const Icon = item.icon;
          const isHashHref = item.href.startsWith('/#');
          const isSimulatorUpcoming = item.id === 'simulator' && isBudgetBlocked;

          const classNameItem = cn(
            'relative flex flex-col items-center justify-center gap-1 min-h-[48px] py-1 px-0.5 rounded-lg transition-all duration-150 select-none touch-manipulation cursor-pointer',
            'active:scale-95 active:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40',
            active
              ? 'text-white'
              : 'text-[#8c8c8c] hover:text-[#e5e5e5]',
          );

          const inner = (
            <>
              {/* Ligne indicatrice supérieure rouge signature Netflix */}
              {active && (
                <span
                  className="absolute -top-1.5 w-6 h-[2.5px] rounded-full bg-[#e50914] shadow-[0_0_8px_#e50914] transition-all duration-200"
                  aria-hidden
                />
              )}

              {/* Icône sans conteneur superflu, typique de l'application mobile Netflix */}
              <div className="relative flex items-center justify-center">
                <Icon
                  className={cn(
                    'w-5 h-5 transition-transform duration-200',
                    active ? 'scale-105 stroke-[2.2px] text-white' : 'stroke-[1.75px] text-[#8c8c8c]',
                  )}
                  aria-hidden
                />

                {/* Badge d'alerte / fonctionnalité à venir style Netflix */}
                {isSimulatorUpcoming && (
                  <span
                    className="absolute -top-1 -right-1.5 flex h-2 w-2"
                    title="Fonctionnalité à venir"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e50914] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e50914] ring-2 ring-[#121212]" />
                  </span>
                )}
              </div>

              {/* Typographie nette, compacte, fidèle à l'interface Netflix */}
              <span
                className={cn(
                  'text-[10px] tracking-tight leading-none truncate max-w-full text-center transition-colors',
                  active ? 'font-semibold text-white' : 'font-medium text-[#8c8c8c]',
                )}
              >
                {isSimulatorUpcoming ? (
                  <>
                    <span>Simulateur</span>
                    <span className="block text-[8px] font-bold text-[#e50914] uppercase tracking-wider mt-0.5">
                      Bientôt
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
