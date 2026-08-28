'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { PartyPopper, Sun, Moon, Menu, X } from 'lucide-react';
import PublicAccentPicker from '@/components/PublicAccentPicker';

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
  { href: '/#parcours', label: 'Parcours' },
  { href: '/#tarifs', label: 'Tarifs' },
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

  const links = variant === 'minimal' ? [] : PUBLIC_LINKS;
  const iconBtn =
    'p-2.5 sm:p-2 min-w-[40px] min-h-[40px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface-muted transition active:scale-95 touch-manipulation focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary';

  return (
    <header
      className={cn(
        'sticky top-0 z-50 backdrop-blur-md bg-background/85 dark:bg-slate-950/80 border-b border-border/80 dark:border-white/10 transition-colors duration-200',
        className,
      )}
    >
      <div className="page-container h-14 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition shrink-0 group">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-lg shadow-sm shadow-primary/30 group-hover:scale-105 transition-transform">
            <PartyPopper className="w-4 h-4" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-foreground">{site.platformName}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-full bg-surface-muted/60 dark:bg-white/5 border border-border/60 dark:border-white/10 backdrop-blur-xs min-w-0">
          {links.map((item) => {
            const active =
              item.href === '/marketplace'
                ? pathname.startsWith('/marketplace') || pathname.startsWith('/evenements')
                : item.href === '/contact'
                  ? pathname === '/contact' || pathname === '/faq'
                  : item.href !== '/' && pathname === item.href;
            const className = cn(
              'px-3.5 py-1 text-xs font-semibold transition rounded-full',
              active
                ? 'text-primary bg-surface dark:bg-white/10 shadow-xs border border-primary/20'
                : 'text-muted hover:text-foreground hover:bg-surface/50 dark:hover:bg-white/5',
            );
            return item.href.startsWith('/#') ? (
              <a key={item.href} href={item.href} className={className}>
                {item.label}
              </a>
            ) : (
              <Link key={item.href} href={item.href} className={className}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="hidden sm:flex items-center">
            <PublicAccentPicker />
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className={iconBtn}
            aria-label="Changer de thème"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          <div className="hidden md:flex items-center gap-2 ml-1">
            {user ? (
              <Link href="/dashboard">
                <Button size="sm">Tableau de bord</Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-xs font-semibold text-muted hover:text-foreground px-2">
                  Connexion
                </Link>
                {site.allowRegistration ? (
                  <Link href="/register">
                    <Button size="sm">Démarrer</Button>
                  </Link>
                ) : null}
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={cn(iconBtn, 'md:hidden')}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="page-container py-3 space-y-1">
            {links.map((item) =>
              item.href.startsWith('/#') ? (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm text-muted hover:text-foreground py-2"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-sm text-muted hover:text-foreground py-2"
                >
                  {item.label}
                </Link>
              ),
            )}
            <div className="flex items-center gap-2 py-2">
              <PublicAccentPicker />
            </div>
            {user ? (
              <div className="flex flex-col gap-2 pt-2">
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" fullWidth>
                    Tableau de bord
                  </Button>
                </Link>
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
              <div className="flex flex-col gap-2 pt-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" variant="secondary" fullWidth>
                    Connexion
                  </Button>
                </Link>
                {site.allowRegistration ? (
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button size="sm" fullWidth>
                      Démarrer maintenant
                    </Button>
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
