'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Store,
  Ticket,
  Inbox,
  ScanLine,
  Building2,
  Clock,
  Briefcase,
  FileText,
  Menu,
  X,
  Sparkles,
  Images,
} from 'lucide-react';
import type { OrgAccess } from '@/context/AuthContext';
import type { TenantAccountKind } from '@/lib/marketplace';
import type { WorkspaceModules } from '@/lib/planAccess';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { cn } from '@/lib/cn';
import { scrollAppToTop, tapHaptic, useMobileRouteFade } from '@/lib/mobileNative';
import type { AdminPendingCounts } from '@/components/admin/useAdminPendingCounts';

export interface MobileBottomNavItem {
  id: string;
  name: string;
  href: string;
  tab?: string;
  icon: React.ComponentType<{ className?: string }>;
  isMenuTrigger?: boolean;
  /** Pastille « à traiter » */
  badge?: number;
}

interface DashboardMobileBottomBarProps {
  role?: string;
  access?: OrgAccess | null;
  workspace: WorkspaceModules;
  accountKind?: TenantAccountKind;
  isClientAccount?: boolean;
  showRealisations?: boolean;
  adminCounts?: AdminPendingCounts;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onCloseMobileMenu: () => void;
}

function isBottomItemActive(
  pathname: string,
  search: string,
  item: MobileBottomNavItem,
  currentTab: string,
) {
  if (item.isMenuTrigger) return false;
  if (item.tab) return pathname === '/dashboard' && currentTab === item.tab;

  const qIndex = item.href.indexOf('?');
  const path = qIndex >= 0 ? item.href.slice(0, qIndex) : item.href;
  const query = qIndex >= 0 ? item.href.slice(qIndex + 1) : '';
  const have = new URLSearchParams(search);
  const onCatalogueSimulator =
    pathname.startsWith('/dashboard/catalogue') &&
    (have.get('tab') === 'plan' || have.get('hub') === 'plan' || have.get('planView') === 'ai' || have.get('planView') === 'final');

  if (item.id === 'simulator') {
    return onCatalogueSimulator;
  }

  // Cas protocole
  if (path === '/dashboard/protocol') {
    return (
      pathname === '/dashboard/protocol' ||
      ((pathname === '/dashboard/events' || pathname.startsWith('/dashboard/events/')) &&
        have.get('mode') === 'protocol')
    );
  }

  const pathMatch =
    pathname === path ||
    (path !== '/dashboard' && pathname.startsWith(`${path}/`)) ||
    pathname.startsWith(`${path}?`);

  const eventsPathMatch =
    path === '/dashboard/events' &&
    (pathname === '/dashboard/events' || pathname.startsWith('/dashboard/events/'));

  const effectivePathMatch = path === '/dashboard/events' ? eventsPathMatch : pathMatch;
  if (!effectivePathMatch) return false;

  if (query) {
    const want = new URLSearchParams(query);
    for (const [key, value] of want.entries()) {
      if (have.get(key) !== value) return false;
    }
    if (path === '/dashboard/bookings' && want.has('tab')) {
      const haveTab = have.get('tab') || 'quotes';
      if (haveTab !== want.get('tab')) return false;
    }
    return pathname === path || (path === '/dashboard/events' && eventsPathMatch);
  }

  if (path === '/dashboard/events' && !query) {
    if (have.get('mode') === 'protocol') return false;
  }
  if (path === '/dashboard/bookings' && pathname === '/dashboard/bookings') {
    return true;
  }
  if (path === '/dashboard/catalogue' && pathname === '/dashboard/catalogue') {
    if (have.get('kind') === 'event') return false;
    if (onCatalogueSimulator) return false;
    if (have.get('tab') && have.get('tab') !== 'explore') return false;
    if (have.get('hub') && have.get('hub') !== 'explore') return false;
    return true;
  }

  return true;
}

const SIMULATOR_ITEM: MobileBottomNavItem = {
  id: 'simulator',
  name: 'Simulateur',
  href: '/dashboard/catalogue?tab=plan&planView=ai',
  icon: Sparkles,
};

function withSimulatorTab(items: MobileBottomNavItem[]): MobileBottomNavItem[] {
  if (items.some((item) => item.id === 'simulator')) return items;
  const menuIndex = items.findIndex((item) => item.isMenuTrigger);
  const insertAt = menuIndex >= 0 ? menuIndex : items.length;
  return [...items.slice(0, insertAt), SIMULATOR_ITEM, ...items.slice(insertAt)];
}

const REALISATIONS_ITEM: MobileBottomNavItem = {
  id: 'publications',
  name: 'Réalisations',
  href: '/dashboard/publications',
  icon: Images,
};

/** Une tab bar native tient en 5 onglets ; le reste passe dans le menu « Plus ». */
const MAX_BOTTOM_TABS = 5;

/**
 * Espaces organisation / client : 5 onglets au plus, avec Réalisations toujours visible
 * et le Simulateur au centre (bouton surélevé). Les onglets retirés restent
 * dans le menu « Plus » (filterNavForMobileSheet ne masque que ceux de la barre).
 */
function withRealisationsTab(items: MobileBottomNavItem[]): MobileBottomNavItem[] {
  const home = items.find((item) => item.id === 'home');
  const simulator = items.find((item) => item.id === 'simulator');
  const menu = items.find((item) => item.isMenuTrigger);
  const others = items.filter(
    (item) => item !== home && item !== simulator && item !== menu && item.id !== 'publications',
  );
  const pinnedCount = [home, simulator, REALISATIONS_ITEM, menu].filter(Boolean).length;
  const kept = others.slice(0, Math.max(0, MAX_BOTTOM_TABS - pinnedCount));
  return [home, ...kept, simulator, REALISATIONS_ITEM, menu].filter(
    (item): item is MobileBottomNavItem => Boolean(item),
  );
}

export function buildMobileBottomItems(
  input: {
    role?: string;
    access?: OrgAccess | null;
    workspace: WorkspaceModules;
    accountKind?: TenantAccountKind;
    isClientAccount?: boolean;
    allStudiosBlocked?: boolean;
    /** Le menu du compte donne accès aux Réalisations (même règle que la sidebar). */
    showRealisations?: boolean;
    adminCounts?: AdminPendingCounts;
  },
): MobileBottomNavItem[] {
  // Console Super Admin : pas de simulateur client, la barre reste dédiée au pilotage.
  if (input.role === 'SUPER_ADMIN') return buildRoleMobileBottomItems(input);
  const items = withSimulatorTab(buildRoleMobileBottomItems(input));
  return input.showRealisations ? withRealisationsTab(items) : items;
}

function buildRoleMobileBottomItems({
  role,
  access,
  workspace,
  accountKind,
  isClientAccount,
  allStudiosBlocked,
  adminCounts,
}: {
  adminCounts?: AdminPendingCounts;
  role?: string;
  access?: OrgAccess | null;
  workspace: WorkspaceModules;
  accountKind?: TenantAccountKind;
  isClientAccount?: boolean;
  allStudiosBlocked?: boolean;
}): MobileBottomNavItem[] {
  // 1. Super Admin
  if (role === 'SUPER_ADMIN') {
    return [
      { id: 'overview', name: 'Accueil', href: '/dashboard?tab=overview', tab: 'overview', icon: LayoutDashboard },
      { id: 'tenants', name: 'Orgas', href: '/dashboard?tab=tenants', tab: 'tenants', icon: Building2, badge: adminCounts?.licensesExpiring },
      { id: 'requests', name: 'Demandes', href: '/dashboard?tab=subscription-requests', tab: 'subscription-requests', icon: Clock, badge: adminCounts?.pendingRequests },
      { id: 'invoices', name: 'Factures', href: '/dashboard?tab=invoices', tab: 'invoices', icon: FileText, badge: adminCounts?.unpaidInvoices },
      { id: 'menu', name: 'Plus', href: '#menu', icon: Menu, isMenuTrigger: true },
    ];
  }

  // 2. Commercial Plateforme
  if (role === 'COMMERCIAL') {
    return [
      { id: 'tenants', name: 'Portefeuille', href: '/dashboard?tab=tenants', tab: 'tenants', icon: Building2 },
      { id: 'requests', name: 'Demandes', href: '/dashboard?tab=subscription-requests', tab: 'subscription-requests', icon: Clock },
      { id: 'commissions', name: 'Gains', href: '/dashboard/commercial', icon: Briefcase },
      { id: 'invoices', name: 'Factures', href: '/dashboard?tab=invoices', tab: 'invoices', icon: FileText },
      { id: 'menu', name: 'Plus', href: '#menu', icon: Menu, isMenuTrigger: true },
    ];
  }

  // 3. Commercial d'Organisation
  if (access?.level === 'commercial') {
    return [
      { id: 'network', name: 'Réseau', href: '/dashboard/org-commercial', icon: Briefcase },
      { id: 'catalogue', name: 'Explorer', href: '/dashboard/catalogue', icon: Store },
      { id: 'quotes', name: 'Devis', href: '/dashboard/bookings?tab=quotes', icon: Inbox },
      { id: 'menu', name: 'Plus', href: '#menu', icon: Menu, isMenuTrigger: true },
    ];
  }

  // 4. Staff Protocole seul
  if (access?.isProtocolOnly) {
    return [
      { id: 'home', name: 'Accueil', href: '/dashboard', icon: LayoutDashboard },
      { id: 'protocol', name: 'Protocole', href: '/dashboard/protocol', icon: ScanLine },
      { id: 'publications', name: 'Réalisations', href: '/dashboard/publications', icon: Images },
      { id: 'catalogue', name: 'Explorer', href: '/dashboard/catalogue', icon: Store },
      { id: 'menu', name: 'Plus', href: '#menu', icon: Menu, isMenuTrigger: true },
    ];
  }

  // 5. Compte Client
  if (isClientAccount) {
    return [
      { id: 'home', name: 'Accueil', href: '/dashboard', icon: LayoutDashboard },
      { id: 'catalogue', name: 'Explorer', href: '/dashboard/catalogue', icon: Store },
      allStudiosBlocked
        ? { id: 'quotes', name: 'Devis', href: '/dashboard/bookings?tab=quotes', icon: Inbox }
        : { id: 'simulator', name: 'Simulateur', href: '/dashboard/catalogue?tab=plan&planView=ai', icon: Sparkles },
      { id: 'tickets', name: 'Billets', href: '/dashboard/tickets', icon: Ticket },
      { id: 'menu', name: 'Plus', href: '#menu', icon: Menu, isMenuTrigger: true },
    ];
  }

  // 6. Prestataire / Vendeur pur
  if (accountKind === 'VENDOR' || (!workspace.showEvents && workspace.showMarketplace)) {
    return [
      { id: 'home', name: 'Accueil', href: '/dashboard', icon: LayoutDashboard },
      { id: 'offers', name: 'Mes offres', href: '/dashboard/marketplace', icon: Briefcase },
      { id: 'quotes', name: 'Devis', href: '/dashboard/bookings?tab=quotes', icon: Inbox },
      { id: 'catalogue', name: 'Explorer', href: '/dashboard/catalogue', icon: Store },
      { id: 'menu', name: 'Plus', href: '#menu', icon: Menu, isMenuTrigger: true },
    ];
  }

  // 7. Manager organisation — réalisations et simulateur au premier plan
  if (access?.level === 'manager' && !access?.isOwner) {
    const managerItems: MobileBottomNavItem[] = [
      { id: 'home', name: 'Accueil', href: '/dashboard', icon: LayoutDashboard },
    ];
    if (workspace.showEvents) {
      managerItems.push({ id: 'events', name: 'Événements', href: '/dashboard/events', icon: Calendar });
    }
    if (workspace.showBrowseCatalogue) {
      managerItems.push({ id: 'publications', name: 'Réalisations', href: '/dashboard/publications', icon: Images });
      managerItems.push({ id: 'catalogue', name: 'Explorer', href: '/dashboard/catalogue', icon: Store });
    } else if (workspace.showProtocol) {
      managerItems.push({ id: 'protocol', name: 'Protocole', href: '/dashboard/protocol', icon: ScanLine });
    }
    managerItems.push({ id: 'menu', name: 'Plus', href: '#menu', icon: Menu, isMenuTrigger: true });
    return managerItems;
  }

  // 8. Organisateur / propriétaire (B2C ou B2B)
  const items: MobileBottomNavItem[] = [
    { id: 'home', name: 'Accueil', href: '/dashboard', icon: LayoutDashboard },
  ];

  if (workspace.showEvents) {
    items.push({ id: 'events', name: 'Événements', href: '/dashboard/events', icon: Calendar });
  }

  if (workspace.showMarketplace) {
    items.push({ id: 'offers', name: 'Mes offres', href: '/dashboard/marketplace', icon: Briefcase });
  } else if (workspace.showRooms) {
    items.push({ id: 'rooms', name: 'Salles', href: '/dashboard/rooms', icon: Building2 });
  } else if (workspace.showProtocol) {
    items.push({ id: 'protocol', name: 'Protocole', href: '/dashboard/protocol', icon: ScanLine });
  }

  if (workspace.showMarketplace) {
    items.push({ id: 'quotes', name: 'Devis', href: '/dashboard/bookings?tab=quotes&role=vendor', icon: Inbox });
  } else if (workspace.showBrowseCatalogue) {
    items.push({ id: 'catalogue', name: 'Explorer', href: '/dashboard/catalogue', icon: Store });
  } else {
    items.push({ id: 'quotes', name: 'Devis', href: '/dashboard/bookings?tab=quotes', icon: Inbox });
  }

  items.push({ id: 'menu', name: 'Plus', href: '#menu', icon: Menu, isMenuTrigger: true });

  return items;
}

export default function DashboardMobileBottomBar({
  role,
  access,
  workspace,
  accountKind,
  isClientAccount,
  showRealisations,
  adminCounts,
  mobileMenuOpen,
  onToggleMobileMenu,
  onCloseMobileMenu,
}: DashboardMobileBottomBarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { site } = usePlatformSite();
  const visibility = site?.studioVisibility ?? { budget: true, invite: true, room: true };
  const allStudiosBlocked = !visibility.budget && !visibility.invite && !visibility.room;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fallbackTab = role === 'SUPER_ADMIN' ? 'overview' : 'tenants';
  const currentTab = searchParams.get('tab') || fallbackTab;

  const items = React.useMemo(() => {
    return buildMobileBottomItems({
      role,
      access,
      workspace,
      accountKind,
      isClientAccount,
      allStudiosBlocked,
      showRealisations,
      adminCounts,
    });
  }, [role, access, workspace, accountKind, isClientAccount, allStudiosBlocked, showRealisations, adminCounts]);

  useMobileRouteFade();

  const tabClassName = (active: boolean) =>
    cn(
      'em-tab relative flex flex-col items-center justify-center gap-0.5 min-h-[50px] py-1 px-0.5 rounded-2xl transition-colors duration-200 touch-manipulation cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
      active
        ? 'text-primary-solid dark:text-primary font-semibold'
        : 'text-muted hover:text-foreground',
    );

  const centerIndex = items.length % 2 === 1 ? Math.floor(items.length / 2) : -1;

  const nav = (
    <nav
      aria-label="Navigation principale mobile"
      className="em-dash-bottom-nav em-tabbar md:hidden pointer-events-none"
    >
      <div
        className="pointer-events-auto bg-surface/92 dark:bg-stage-elevated/95 backdrop-blur-2xl backdrop-saturate-150 border-t border-border/70 dark:border-border-subtle/30 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.18)] px-1.5 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] grid gap-0.5 items-end relative"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item, index) => {
          const isMenu = Boolean(item.isMenuTrigger);
          const Icon = isMenu && mobileMenuOpen ? X : item.icon;
          const active = isMenu ? mobileMenuOpen : isBottomItemActive(pathname, searchParams.toString(), item, currentTab);
          const raised = item.id === 'simulator' && index === centerIndex;

          const inner = (
            <>
              {raised ? (
                <span className="em-tab-fab">
                  <Icon className="w-6 h-6" aria-hidden />
                </span>
              ) : (
                <span className="em-tab-pill relative">
                  <Icon className="relative w-[20px] h-[20px]" aria-hidden />
                  {item.badge ? (
                    <span className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-festive-accent text-white text-[10px] font-bold tabular-nums ring-2 ring-surface">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </span>
              )}
              <span className="text-[10.5px] min-[400px]:text-[11px] leading-tight truncate max-w-full">
                {isMenu && mobileMenuOpen ? 'Fermer' : item.name}
              </span>
            </>
          );

          if (isMenu) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  tapHaptic();
                  onToggleMobileMenu();
                }}
                aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu Plus'}
                aria-expanded={mobileMenuOpen}
                aria-controls="dashboard-mobile-menu-sheet"
                className={tabClassName(active)}
              >
                {inner}
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={(e) => {
                if (document.body.dataset.emTour === '1') return;
                tapHaptic();
                onCloseMobileMenu();
                // Re-taper l'onglet courant remonte en haut, comme dans une app native.
                if (active && !item.href.includes('?') && pathname === item.href) {
                  e.preventDefault();
                  scrollAppToTop();
                  return;
                }
                if (typeof window !== 'undefined' && pathname === '/dashboard/catalogue') {
                  if (item.id === 'catalogue') {
                    window.dispatchEvent(new CustomEvent('em-switch-tab', { detail: 'explore' }));
                  } else if (item.id === 'simulator') {
                    window.dispatchEvent(new CustomEvent('em-switch-tab', { detail: 'plan' }));
                  }
                }
              }}
              aria-current={active ? 'page' : undefined}
              aria-label={item.badge ? `${item.name}, ${item.badge} à traiter` : undefined}
              className={tabClassName(active)}
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
