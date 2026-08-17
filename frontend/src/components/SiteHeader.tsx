'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
  /** Lien hash landing (#modeles) vs route */
  external?: boolean;
};

interface SiteHeaderProps {
  /** Variante de navigation */
  variant?: 'landing' | 'contact' | 'minimal';
  /** Afficher le statut API */
  showServerStatus?: boolean;
  className?: string;
}

const LANDING_LINKS: SiteHeaderLink[] = [
  { href: '/#modeles', label: 'Modèles' },
  { href: '/marketplace/salles', label: 'Salles' },
  { href: '/#parcours', label: 'Parcours' },
  { href: '/#tarifs', label: 'Tarifs' },
  { href: '/contact', label: 'Contact' },
];

const CONTACT_LINKS: SiteHeaderLink[] = [
  { href: '/', label: 'Accueil' },
  { href: '/#modeles', label: 'Modèles' },
  { href: '/marketplace/salles', label: 'Salles' },
  { href: '/#parcours', label: 'Parcours' },
  { href: '/#tarifs', label: 'Tarifs' },
  { href: '/contact', label: 'Contact' },
  { href: '/faq', label: 'FAQ' },
];

export default function SiteHeader({
  variant = 'landing',
  showServerStatus = true,
  className,
}: SiteHeaderProps) {
  const { user, tenant, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { site } = usePlatformSite();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const links = variant === 'contact' ? CONTACT_LINKS : variant === 'minimal' ? [] : LANDING_LINKS;

  useEffect(() => {
    if (!showServerStatus) return;
    let cancelled = false;
    async function checkServer() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/health`,
          { cache: 'no-store' },
        );
        if (!cancelled) setServerStatus(response.ok ? 'online' : 'offline');
      } catch {
        if (!cancelled) setServerStatus('offline');
      }
    }
    checkServer();
    return () => {
      cancelled = true;
    };
  }, [showServerStatus]);

  const navLinkClass = 'text-sm font-medium text-muted hover:text-foreground transition';

  return (
    <header
      className={cn(
        'border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 z-50',
        className,
      )}
    >
      <div className="page-container h-14 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition shrink-0">
            <div className="bg-foreground p-1.5 rounded-[var(--radius-button)] text-background">
              <PartyPopper className="w-3.5 h-3.5" />
            </div>
            <span className="text-base font-semibold tracking-tight">{site.platformName}</span>
          </Link>
          {showServerStatus && (
            <div className="hidden sm:flex items-center gap-1.5 ml-1 px-2 py-0.5 rounded-md bg-surface-muted border border-border text-[10px] font-medium text-muted">
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  serverStatus === 'online'
                    ? 'bg-emerald-500'
                    : serverStatus === 'offline'
                      ? 'bg-rose-500'
                      : 'bg-amber-500 animate-pulse',
                )}
              />
              {serverStatus === 'online' ? 'En ligne' : serverStatus === 'offline' ? 'Hors ligne' : '…'}
            </div>
          )}
        </div>

        <nav className="hidden lg:flex items-center gap-5">
          <PublicAccentPicker />
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-[var(--radius-button)] border border-border text-muted hover:bg-surface-muted hover:text-foreground transition"
            aria-label="Changer de thème"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          {links.map((item) =>
            item.href.startsWith('/#') || item.href.startsWith('#') ? (
              <a key={item.href} href={item.href} className={navLinkClass}>
                {item.label}
              </a>
            ) : (
              <Link key={item.href} href={item.href} className={navLinkClass}>
                {item.label}
              </Link>
            ),
          )}
          {user ? (
            <>
              <span className="text-xs text-muted max-w-[180px] truncate">
                {user.name}
                {tenant ? ` · ${tenant.name}` : ''}
              </span>
              <Link href="/dashboard">
                <Button size="sm">Tableau de bord</Button>
              </Link>
              <Button type="button" size="sm" variant="secondary" onClick={logout}>
                Déconnexion
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className={navLinkClass}>
                Connexion
              </Link>
              {site.allowRegistration ? (
                <Link href="/register">
                  <Button size="sm">Créer mon entreprise</Button>
                </Link>
              ) : (
                <Button size="sm" disabled>
                  Inscriptions fermées
                </Button>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <PublicAccentPicker />
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-[var(--radius-button)] border border-border text-muted"
            aria-label="Changer de thème"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-[var(--radius-button)] border border-border text-muted"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-surface">
          <div className="page-container py-4 space-y-1">
          {links.map((item) =>
            item.href.startsWith('/#') || item.href.startsWith('#') ? (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-muted hover:text-foreground py-2.5 border-b border-border"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-muted hover:text-foreground py-2.5 border-b border-border"
              >
                {item.label}
              </Link>
            ),
          )}
          {user ? (
            <div className="flex flex-col gap-2 pt-3">
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
            <div className="flex flex-col gap-2 pt-3">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button size="sm" variant="secondary" fullWidth>
                  Connexion
                </Button>
              </Link>
              {site.allowRegistration ? (
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" fullWidth>
                    Créer mon entreprise
                  </Button>
                </Link>
              ) : (
                <Button size="sm" fullWidth disabled>
                  Inscriptions fermées
                </Button>
              )}
            </div>
          )}
          </div>
        </div>
      )}
    </header>
  );
}
