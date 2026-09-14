'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { Sun, Moon, Sparkles, LayoutDashboard, ArrowRight } from 'lucide-react';
import PublicAccentPicker from '@/components/PublicAccentPicker';
import SiteMobileBottomBar from '@/components/SiteMobileBottomBar';
import SiteBrandMark from '@/components/SiteBrandMark';
import PWAInstallCta from '@/components/PWAInstallCta';
import { revealAndScrollToSection } from '@/lib/aiFabPlacement';

export type SiteHeaderLink = {
  href: string;
  label: string;
};

interface SiteHeaderProps {
  variant?: 'landing' | 'contact' | 'minimal';
  className?: string;
}

const PUBLIC_LINKS: SiteHeaderLink[] = [
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/simulateur', label: 'Simulateur' },
  { href: '/activite', label: 'Réalisations' },
  { href: '/plans-3d', label: 'Plans 2D/3D' },
  { href: '/modeles', label: 'Modèles' },
  { href: '/tarifs', label: 'Tarifs' },
  { href: '/contact', label: 'Contact' },
];

export default function SiteHeader({
  variant = 'landing',
  className,
}: SiteHeaderProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { site } = usePlatformSite();
  const pathname = usePathname();
  const [currentHash, setCurrentHash] = useState('');

  useEffect(() => {
    const onHashChange = () => {
      setCurrentHash(window.location.hash);
    };
    onHashChange();
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const links = variant === 'minimal' ? [] : PUBLIC_LINKS;
  const iconBtn =
    'p-2.5 min-w-11 min-h-11 flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface-muted transition active:scale-95 touch-manipulation focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary cursor-pointer';

  const isLinkActive = (href: string) => {
    if (href === '/marketplace') {
      return pathname.startsWith('/marketplace') || pathname.startsWith('/evenements');
    }
    if (href === '/activite') {
      return pathname === '/activite' || pathname.startsWith('/activite/');
    }
    if (href === '/simulateur') {
      return pathname === '/simulateur' || pathname.startsWith('/simulateur');
    }
    if (href === '/contact') {
      return pathname === '/contact';
    }
    if (href.startsWith('/#') && pathname === '/') {
      const hash = href.replace('/', '');
      return currentHash === hash;
    }
    return pathname === href;
  };

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('/#') && pathname === '/') {
      e.preventDefault();
      const targetId = href.replace('/#', '');
      revealAndScrollToSection(targetId);
      setCurrentHash(`#${targetId}`);
    }
  };

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md bg-background/85 dark:bg-background/80 border-b border-border/80 transition-colors duration-200',
          className,
        )}
      >
        <div className="page-container h-12 md:h-14 flex items-center justify-between gap-3 sm:gap-6">
        <SiteBrandMark />

        {/* Barre de navigation HUD centrale */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-surface-muted/60 dark:bg-surface-muted/50 border border-border/60 backdrop-blur-xs min-w-0">
          {links.map((item) => {
            const active = isLinkActive(item.href);
            const itemClass = cn(
              'inline-flex items-center min-h-11 px-3.5 text-xs font-semibold transition rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              active
                ? 'text-primary bg-surface dark:bg-surface shadow-xs border border-primary/20 font-bold'
                : 'text-muted hover:text-foreground hover:bg-surface/50 dark:hover:bg-surface-muted',
            );

            return item.href.startsWith('/#') ? (
              <a
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                onClick={(e) => handleAnchorClick(e, item.href)}
                className={itemClass}
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={itemClass}
              >
                <span>{item.label}</span>
                {item.href === '/simulateur' && site?.studioVisibility?.budget === false && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs font-bold rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                    À venir
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Actions à droite : Palette de couleurs, Thème Nuit/Jour, Auth */}
        <div className="flex items-center gap-1.5 shrink-0">
          <PWAInstallCta variant="header" />
          <div className="hidden sm:flex items-center">
            <PublicAccentPicker />
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className={iconBtn}
            aria-pressed={theme === 'dark'}
            aria-label={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
            title={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {user ? (
            <>
              <Button
                href="/dashboard"
                size="sm"
                className="hidden sm:inline-flex ml-1 shadow-sm shadow-primary/20"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Tableau de bord
              </Button>
              <Link
                href="/dashboard"
                className={cn(iconBtn, 'sm:hidden text-primary')}
                aria-label="Tableau de bord"
              >
                <LayoutDashboard className="w-4 h-4" />
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-1.5 ml-1">
              <Link
                href="/login"
                className="inline-flex items-center min-h-11 text-xs font-semibold text-muted hover:text-foreground px-2.5 sm:px-3 rounded-md transition hover:bg-surface-muted"
              >
                Connexion
              </Link>
              {site.allowRegistration ? (
                <Button href="/register" size="sm" className="hidden sm:inline-flex" rightIcon={<Sparkles className="w-3.5 h-3.5" />}>
                  Démarrer
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </header>
    <div
      aria-hidden
      className="h-[calc(3rem+env(safe-area-inset-top,0px))] md:h-[calc(3.5rem+env(safe-area-inset-top,0px))] shrink-0"
    />

    {variant !== 'minimal' && (
      <>
        <SiteMobileBottomBar />
        <PWAInstallCta variant="bar" />
      </>
    )}
  </>
  );
}
