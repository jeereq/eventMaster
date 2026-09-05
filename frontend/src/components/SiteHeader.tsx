'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { Sun, Moon, Menu, X, Sparkles, LayoutDashboard, ArrowRight, Download } from 'lucide-react';
import PublicAccentPicker from '@/components/PublicAccentPicker';
import SiteMobileBottomBar from '@/components/SiteMobileBottomBar';
import SiteBrandMark from '@/components/SiteBrandMark';
import PWAInstallCta from '@/components/PWAInstallCta';
import usePwaInstall from '@/hooks/usePwaInstall';

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
  { href: '/activite', label: 'Réalisations' },
  { href: '/plans-3d', label: 'Plans 2D/3D' },
  { href: '/modeles', label: 'Modèles' },
  { href: '/tarifs', label: 'Tarifs' },
  { href: '/contact', label: 'Contact' },
];

const LEGAL_LINKS: SiteHeaderLink[] = [
  { href: '/faq', label: 'FAQ' },
  { href: '/terms', label: 'Conditions d’utilisation' },
  { href: '/privacy', label: 'Confidentialité' },
];

export default function SiteHeader({
  variant = 'landing',
  className,
}: SiteHeaderProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { site } = usePlatformSite();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState('');
  const { visible: showInstall, install, busy: installBusy } = usePwaInstall();

  useEffect(() => {
    const onHashChange = () => {
      setCurrentHash(window.location.hash);
    };
    onHashChange();
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const links = variant === 'minimal' ? [] : PUBLIC_LINKS;
  const iconBtn =
    'p-2.5 sm:p-2 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface-muted transition active:scale-95 touch-manipulation focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary cursor-pointer';

  const isLinkActive = (href: string) => {
    if (href === '/marketplace') {
      return pathname.startsWith('/marketplace') || pathname.startsWith('/evenements');
    }
    if (href === '/activite') {
      return pathname === '/activite' || pathname.startsWith('/activite/');
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
      const elem = document.getElementById(targetId);
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState(null, '', href);
        setCurrentHash(`#${targetId}`);
      }
    }
    setMobileMenuOpen(false);
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
              'px-3.5 py-1.5 text-xs font-semibold transition rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
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
                {item.label}
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
            aria-label="Changer de thème"
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
            <div className="hidden md:flex items-center gap-2 ml-1">
              <Link
                href="/login"
                className="text-xs font-semibold text-muted hover:text-foreground px-2 py-1.5 rounded-md transition hover:bg-surface-muted"
              >
                Connexion
              </Link>
              {site.allowRegistration ? (
                <Button href="/register" size="sm" rightIcon={<Sparkles className="w-3.5 h-3.5" />}>
                  Démarrer
                </Button>
              ) : null}
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={cn(iconBtn, 'md:hidden')}
            aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="site-mobile-nav"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Tiroir de navigation mobile HUD */}
      <div
        id="site-mobile-nav"
        hidden={!mobileMenuOpen}
        className="md:hidden border-t border-border/80 bg-background/95 backdrop-blur-xl shadow-xl"
      >
        <div className="page-container py-4 space-y-3 pb-[calc(var(--em-site-bottom-nav)+var(--em-site-install-bar)+1rem)]">
            <div className="space-y-1">
              {links.map((item) => {
                const active = isLinkActive(item.href);
                const mobileClass = cn(
                  'flex items-center justify-between min-h-11 px-3 py-2.5 rounded-xl text-sm font-semibold transition touch-manipulation',
                  active
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted hover:text-foreground hover:bg-surface-muted/50',
                );

                return item.href.startsWith('/#') ? (
                  <a
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={(e) => handleAnchorClick(e, item.href)}
                    className={mobileClass}
                  >
                    <span>{item.label}</span>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                    className={mobileClass}
                  >
                    <span>{item.label}</span>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </Link>
                );
              })}
            </div>

            {variant !== 'minimal' ? (
              <div className="pt-2 border-t border-border/60 space-y-1">
                <p className="px-3 pb-1 text-xs font-semibold text-muted">Infos & légal</p>
                {LEGAL_LINKS.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center justify-between min-h-11 px-3 py-2.5 rounded-xl text-sm font-semibold transition touch-manipulation',
                        active
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'text-muted hover:text-foreground hover:bg-surface-muted/50',
                      )}
                    >
                      <span>{item.label}</span>
                      {active ? <span className="w-1.5 h-1.5 rounded-full bg-primary" /> : null}
                    </Link>
                  );
                })}
              </div>
            ) : null}

            {showInstall ? (
              <Button
                type="button"
                size="sm"
                fullWidth
                loading={installBusy}
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={() => {
                  void install();
                  setMobileMenuOpen(false);
                }}
              >
                Installer l’application
              </Button>
            ) : null}

            {/* Accent Picker & Options en mobile */}
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-surface-muted/50 border border-border/60">
              <span className="text-xs font-semibold text-muted">Couleur d’accent</span>
              <PublicAccentPicker />
            </div>

            {/* Connexion / Inscription en mobile */}
            {user ? (
              <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
                <Button
                  href="/dashboard"
                  size="sm"
                  fullWidth
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Tableau de bord
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                >
                  Déconnexion
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
                {site.allowRegistration ? (
                  <Button
                    href="/register"
                    size="sm"
                    fullWidth
                    rightIcon={<Sparkles className="w-3.5 h-3.5" />}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Créer un compte gratuit
                  </Button>
                ) : null}
                <Button
                  href="/login"
                  size="sm"
                  variant="secondary"
                  fullWidth
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Connexion
                </Button>
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
