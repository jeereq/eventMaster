'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { PartyPopper, Sun, Moon, Menu, X, Sparkles, LayoutDashboard, ArrowRight } from 'lucide-react';
import PublicAccentPicker from '@/components/PublicAccentPicker';
import SiteMobileBottomBar from '@/components/SiteMobileBottomBar';

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
  { href: '/activite', label: 'Publications' },
  { href: '/plans-3d', label: 'Plans 2D/3D' },
  { href: '/modeles', label: 'Modèles' },
  { href: '/tarifs', label: 'Tarifs' },
  { href: '/contact', label: 'Contact' },
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
      return pathname === '/contact' || pathname === '/faq';
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
          'sticky top-0 z-50 backdrop-blur-md bg-background/85 dark:bg-slate-950/80 border-b border-border/80 dark:border-white/10 transition-colors duration-200',
          className,
        )}
      >
        <div className="page-container h-14 flex items-center justify-between gap-4 sm:gap-6">
        {/* Logo & Nom de la plateforme */}
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition shrink-0 group">
          <div className="bg-primary-solid text-primary-foreground p-1.5 rounded-lg shadow-sm shadow-primary/30 group-hover:scale-105 transition-transform">
            <PartyPopper className="w-4 h-4" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-foreground">{site.platformName}</span>
        </Link>

        {/* Barre de navigation HUD centrale */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-surface-muted/60 dark:bg-white/5 border border-border/60 dark:border-white/10 backdrop-blur-xs min-w-0">
          {links.map((item) => {
            const active = isLinkActive(item.href);
            const itemClass = cn(
              'px-3.5 py-1 text-xs font-semibold transition rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary',
              active
                ? 'text-primary bg-surface dark:bg-white/10 shadow-xs border border-primary/20 font-bold'
                : 'text-muted hover:text-foreground hover:bg-surface/50 dark:hover:bg-white/5',
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
              <Button
                href="/dashboard"
                size="sm"
                className="sm:hidden ml-1 text-xs px-2.5 font-semibold shadow-xs"
                rightIcon={<LayoutDashboard className="w-3 h-3" />}
              >
                Dashboard
              </Button>
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
        <div className="page-container py-4 space-y-3">
            <div className="space-y-1">
              {links.map((item) => {
                const active = isLinkActive(item.href);
                const mobileClass = cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition',
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

    {variant !== 'minimal' && <SiteMobileBottomBar />}
  </>
  );
}
