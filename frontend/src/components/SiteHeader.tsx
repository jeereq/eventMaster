'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { Sun, Moon, LayoutDashboard, ArrowRight, Menu, X } from 'lucide-react';
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

/** Navigation publique : Réalisations et Plans 2D/3D restent accessibles depuis le pied de page. */
const PUBLIC_LINKS: SiteHeaderLink[] = [
  { href: '/', label: 'Accueil' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/evenements', label: 'Événements' },
  { href: '/simulateur', label: 'Simulateur' },
  { href: '/modeles', label: 'Modèles' },
  { href: '/tarifs', label: 'Tarifs' },
  { href: '/contact', label: 'Contact' },
];

/** Liens complémentaires du menu tablette (la barre mobile du bas n'existe pas à partir de md). */
const TABLET_EXTRA_LINKS: SiteHeaderLink[] = [
  { href: '/plans-3d', label: 'Plans 2D/3D' },
  { href: '/activite', label: 'Réalisations' },
  { href: '/faq', label: 'FAQ' },
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
  // Le menu tablette mémorise la page où il a été ouvert : il se referme seul à la navigation.
  const [tabletMenuPath, setTabletMenuPath] = useState<string | null>(null);
  const tabletMenuOpen = tabletMenuPath === pathname;
  const setTabletMenuOpen = (open: boolean) => setTabletMenuPath(open ? pathname : null);
  const tabletMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tabletMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (tabletMenuRef.current && !tabletMenuRef.current.contains(e.target as Node)) {
        setTabletMenuPath(null);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTabletMenuPath(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [tabletMenuOpen]);

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
    if (href === '/') {
      return pathname === '/';
    }
    if (href === '/marketplace') {
      return pathname.startsWith('/marketplace') && !pathname.startsWith('/marketplace/evenements');
    }
    if (href === '/evenements') {
      return pathname.startsWith('/evenements') || pathname.startsWith('/marketplace/evenements');
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
          'fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md bg-surface/95 dark:bg-background/85 border-b border-border transition-colors duration-200',
          className,
        )}
      >
        <div className="page-container h-12 md:h-[4.75rem] flex items-center justify-between gap-3 sm:gap-6">
        <SiteBrandMark />

        {/* Navigation principale */}
        <nav className="hidden xl:flex items-center gap-4 2xl:gap-7 min-w-0">
          {links.map((item) => {
            const active = isLinkActive(item.href);
            const itemClass = cn(
              'inline-flex items-center min-h-11 text-sm lg:text-[15px] transition rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              active
                ? 'text-primary font-bold'
                : 'text-foreground font-medium hover:text-primary',
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
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs font-bold rounded-full bg-festive-accent-soft text-festive-accent border border-festive-accent/20">
                    À venir
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Actions à droite : Palette de couleurs, Thème Nuit/Jour, Auth */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Masqué de xl à 2xl pour laisser la place aux liens de navigation. */}
          <div className="flex xl:hidden 2xl:flex items-center">
            <PWAInstallCta variant="header" />
          </div>
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
                size="md"
                className="hidden sm:inline-flex ml-1 font-semibold"
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
            <div className="flex items-center gap-1 sm:gap-1.5 ml-1">
              <Link
                href="/login"
                className="hidden min-[420px]:inline-flex items-center min-h-11 text-sm md:text-[15px] font-semibold text-foreground hover:text-primary px-2 sm:px-4 rounded-md transition"
              >
                Connexion
              </Link>
              {site.allowRegistration ? (
                <Button
                  href="/register"
                  size="md"
                  className="inline-flex text-sm md:text-[15px] px-3 sm:px-5 font-semibold"
                >
                  Créer un compte
                </Button>
              ) : null}
            </div>
          )}

          {links.length > 0 ? (
            <div ref={tabletMenuRef} className="relative hidden md:block xl:hidden">
              <button
                type="button"
                onClick={() => setTabletMenuOpen(!tabletMenuOpen)}
                className={cn(iconBtn, 'text-foreground')}
                aria-expanded={tabletMenuOpen}
                aria-controls="site-tablet-menu"
                aria-label={tabletMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              >
                {tabletMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              {tabletMenuOpen ? (
                <div
                  id="site-tablet-menu"
                  className="absolute right-0 top-full mt-2 w-72 rounded-[var(--radius-card)] border border-border bg-surface shadow-xl p-2 flex flex-col gap-0.5"
                >
                  {[...links, ...TABLET_EXTRA_LINKS].map((item) => {
                    const active = isLinkActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setTabletMenuOpen(false)}
                        className={cn(
                          'flex items-center min-h-11 px-3 rounded-lg text-[15px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                          active
                            ? 'bg-primary/10 text-primary font-bold'
                            : 'text-foreground font-medium hover:bg-surface-muted',
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
    <div
      aria-hidden
      className="h-[calc(3rem+env(safe-area-inset-top,0px))] md:h-[calc(4.75rem+env(safe-area-inset-top,0px))] shrink-0"
    />

    {variant !== 'minimal' && (
      <>
        <SiteMobileBottomBar />
      </>
    )}
  </>
  );
}
