'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Store,
  LayoutGrid,
  Sparkles,
  Menu,
  X,
  FileText,
  CreditCard,
  Mail,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Sun,
  Moon,
  Download,
  Shield,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { revealAndScrollToSection } from '@/lib/aiFabPlacement';
import { motionSafeScrollBehavior } from '@/lib/prefersReducedMotion';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import PublicAccentPicker from '@/components/PublicAccentPicker';
import usePwaInstall from '@/hooks/usePwaInstall';
import { Button } from '@/components/ui';

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
    id: 'more',
    label: 'Plus',
    href: '#more',
    icon: Menu,
  },
];

const MORE_LINKS = [
  {
    href: '/modeles',
    label: 'Modèles d’invitations',
    description: 'Faire-part & templates interactifs',
    icon: FileText,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
  },
  {
    href: '/activite',
    label: 'Réalisations & Événements',
    description: 'Vitrine et retours d’expérience',
    icon: Compass,
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/10 dark:bg-amber-500/15',
  },
  {
    href: '/tarifs',
    label: 'Tarifs & Abonnements',
    description: 'Offres personnelles et professionnelles',
    icon: CreditCard,
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-500/10 dark:bg-blue-500/15',
  },
  {
    href: '/contact',
    label: 'Contact & Assistance',
    description: 'Assistance et devis personnalisés',
    icon: Mail,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
  },
];

const LEGAL_LINKS = [
  { href: '/faq', label: 'FAQ & Aide', icon: HelpCircle },
  { href: '/terms', label: 'Conditions d’utilisation', icon: Shield },
  { href: '/privacy', label: 'Confidentialité', icon: Shield },
  { href: '/refund', label: 'Remboursements', icon: Shield },
];

function isItemActive(
  itemHref: string,
  pathname: string,
  currentHash: string,
  sheetOpen: boolean,
): boolean {
  if (itemHref === '#more') {
    return (
      sheetOpen ||
      [
        '/modeles',
        '/activite',
        '/tarifs',
        '/contact',
        '/faq',
        '/terms',
        '/privacy',
        '/refund',
      ].some((p) => pathname === p || pathname.startsWith(`${p}/`))
    );
  }
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
  return pathname === itemHref;
}

export default function SiteMobileBottomBar({
  className,
}: {
  className?: string;
}) {
  const pathname = usePathname();
  const { site } = usePlatformSite();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { visible: showInstall, install, busy: installBusy } = usePwaInstall();
  const isBudgetBlocked = site?.studioVisibility?.budget === false;
  const [currentHash, setCurrentHash] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
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

  // Fermer la bottom sheet au changement de page
  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  // Gestion de la touche Escape et verrouillage du défilement lors de l'ouverture du Bottom Sheet
  useEffect(() => {
    if (!sheetOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSheetOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [sheetOpen]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, item: MobileNavItem) => {
    if (item.id === 'more') {
      e.preventDefault();
      setSheetOpen((prev) => !prev);
      return;
    }
    if (sheetOpen) {
      setSheetOpen(false);
    }
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
    <>
      <nav
        aria-label="Navigation mobile principale"
        className={cn(
          'em-site-bottom-nav md:hidden pointer-events-none px-3 sm:px-4 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-1',
          className,
        )}
      >
        <div className="pointer-events-auto max-w-md mx-auto bg-surface/92 dark:bg-[#18181b]/92 backdrop-blur-2xl border border-border/80 dark:border-white/10 rounded-full shadow-[0_12px_36px_-6px_rgba(0,0,0,0.14),0_4px_16px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.6)] px-1.5 py-1 grid grid-cols-5 gap-0.5 items-center relative">
          {SITE_MOBILE_NAV_ITEMS.map((item) => {
            const active = isItemActive(item.href, pathname, currentHash, sheetOpen);
            const Icon = item.icon;
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

            if (item.href === '#more') {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={(e) => handleClick(e as unknown as React.MouseEvent<HTMLAnchorElement>, item)}
                  aria-expanded={sheetOpen}
                  aria-controls="site-mobile-more-sheet"
                  className={classNameItem}
                >
                  {inner}
                </button>
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

      {/* ─── Bottom Sheet ergonomique "Plus" (Sans répétition de la bottom bar) ─── */}
      {sheetOpen && (
        <div className="md:hidden">
          {/* Arrière-plan flouté d'occlusion */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity animate-in fade-in duration-200"
            onClick={() => setSheetOpen(false)}
            aria-hidden
          />

          {/* Panneau Bottom Sheet glissant depuis le bas */}
          <div
            id="site-mobile-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Options et navigation complémentaire"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[82vh] overflow-y-auto rounded-t-3xl bg-surface dark:bg-[#18181b] border-t border-border/80 dark:border-white/10 shadow-[0_-16px_48px_rgba(0,0,0,0.35)] px-4 sm:px-6 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-250 ease-out space-y-4"
          >
            {/* Poignée tactile de fermeture */}
            <div className="w-10 h-1 rounded-full bg-border-subtle dark:bg-white/20 mx-auto" />

            {/* En-tête du Bottom Sheet */}
            <div className="flex items-center justify-between pb-2 border-b border-border/60 dark:border-white/10">
              <div>
                <h3 className="text-sm font-bold text-foreground">Menu & Services</h3>
                <p className="text-xs text-muted">Pages et accès complémentaires</p>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="p-2 min-h-11 min-w-11 rounded-full text-muted hover:text-foreground hover:bg-surface-muted transition flex items-center justify-center cursor-pointer active:scale-95"
                aria-label="Fermer le menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Section 1 : Pages secondaires (sans Accueil, Marketplace, Simulateur, Plans) */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider px-1">
                Explorer
              </span>
              <div className="grid grid-cols-1 gap-1.5 pt-1">
                {MORE_LINKS.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSheetOpen(false)}
                      className={cn(
                        'flex items-center justify-between min-h-12 p-2.5 rounded-2xl transition border touch-manipulation',
                        active
                          ? 'bg-primary/10 border-primary/30 text-primary-solid dark:text-primary font-bold'
                          : 'bg-surface-muted/40 dark:bg-white/5 border-border/60 dark:border-white/5 text-foreground hover:bg-surface-muted',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'p-2 rounded-xl flex items-center justify-center',
                            item.iconBg,
                            item.iconColor,
                          )}
                        >
                          <Icon className="w-4 h-4" aria-hidden />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-semibold leading-tight">{item.label}</p>
                          <p className="text-[10px] text-muted leading-tight mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted shrink-0" aria-hidden />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Section 2 : Espace Utilisateur & Compte */}
            <div className="space-y-1 pt-1">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider px-1">
                Compte
              </span>
              {user ? (
                <div className="p-3 rounded-2xl bg-surface-muted/40 dark:bg-white/5 border border-border/60 dark:border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        {user.name || user.email}
                      </p>
                      <p className="text-[10px] text-muted truncate max-w-[200px]">
                        {user.email}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary/15 text-primary-solid dark:text-primary border border-primary/20">
                      Connecté
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      href="/dashboard"
                      size="sm"
                      fullWidth
                      leftIcon={<LayoutDashboard className="w-3.5 h-3.5" />}
                      onClick={() => setSheetOpen(false)}
                    >
                      Dashboard
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      fullWidth
                      leftIcon={<LogOut className="w-3.5 h-3.5" />}
                      onClick={() => {
                        logout();
                        setSheetOpen(false);
                      }}
                    >
                      Déconnexion
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    href="/login"
                    size="sm"
                    variant="secondary"
                    fullWidth
                    onClick={() => setSheetOpen(false)}
                  >
                    Connexion
                  </Button>
                  {site?.allowRegistration ? (
                    <Button
                      href="/register"
                      size="sm"
                      fullWidth
                      rightIcon={<Sparkles className="w-3.5 h-3.5" />}
                      onClick={() => setSheetOpen(false)}
                    >
                      S’inscrire
                    </Button>
                  ) : null}
                </div>
              )}
            </div>

            {/* Section 3 : Préférences rapides & PWA */}
            <div className="space-y-1 pt-1">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider px-1">
                Préférences
              </span>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex items-center justify-center gap-2 min-h-11 px-3 rounded-2xl bg-surface-muted/40 dark:bg-white/5 border border-border/60 dark:border-white/5 text-xs font-semibold text-foreground hover:bg-surface-muted transition active:scale-95"
                >
                  {theme === 'light' ? (
                    <>
                      <Moon className="w-4 h-4 text-muted" /> Mode sombre
                    </>
                  ) : (
                    <>
                      <Sun className="w-4 h-4 text-amber-500" /> Mode clair
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between px-3 min-h-11 rounded-2xl bg-surface-muted/40 dark:bg-white/5 border border-border/60 dark:border-white/5">
                  <span className="text-xs font-medium text-muted">Couleur</span>
                  <PublicAccentPicker />
                </div>
              </div>

              {showInstall ? (
                <div className="pt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    fullWidth
                    loading={installBusy}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                    onClick={() => {
                      void install();
                      setSheetOpen(false);
                    }}
                  >
                    Installer l’application sur l’écran d’accueil
                  </Button>
                </div>
              ) : null}
            </div>

            {/* Section 4 : Légal & FAQ */}
            <div className="pt-2 border-t border-border/60 dark:border-white/10">
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-muted">
                {LEGAL_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSheetOpen(false)}
                    className="hover:text-foreground transition underline-offset-4 hover:underline"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (!mounted) return nav;
  return createPortal(nav, document.body);
}
