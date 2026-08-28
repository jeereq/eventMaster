'use client';

import React from 'react';
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
  Users,
  Clock,
  Briefcase,
  FileText,
  Menu,
  X,
  Sparkles,
  Bookmark,
} from 'lucide-react';
import type { OrgAccess } from '@/context/AuthContext';
import type { TenantAccountKind } from '@/lib/marketplace';
import type { WorkspaceModules } from '@/lib/planAccess';
import { cn } from '@/lib/cn';

export interface MobileBottomNavItem {
  id: string;
  name: string;
  href: string;
  tab?: string;
  icon: React.ComponentType<{ className?: string }>;
  isMenuTrigger?: boolean;
}

interface DashboardMobileBottomBarProps {
  role?: string;
  access?: OrgAccess | null;
  workspace: WorkspaceModules;
  accountKind?: TenantAccountKind;
  isClientAccount?: boolean;
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
    if (have.has('tab') && have.get('tab') !== 'explore') return false;
    return true;
  }

  return true;
}

export function buildMobileBottomItems({
  role,
  access,
  workspace,
  accountKind,
  isClientAccount,
}: {
  role?: string;
  access?: OrgAccess | null;
  workspace: WorkspaceModules;
  accountKind?: TenantAccountKind;
  isClientAccount?: boolean;
}): MobileBottomNavItem[] {
  // 1. Super Admin
  if (role === 'SUPER_ADMIN') {
    return [
      { id: 'overview', name: 'Synthèse', href: '/dashboard?tab=overview', tab: 'overview', icon: LayoutDashboard },
      { id: 'tenants', name: 'Organisations', href: '/dashboard?tab=tenants', tab: 'tenants', icon: Building2 },
      { id: 'users', name: 'Utilisateurs', href: '/dashboard?tab=users', tab: 'users', icon: Users },
      { id: 'requests', name: 'Demandes', href: '/dashboard?tab=subscription-requests', tab: 'subscription-requests', icon: Clock },
      { id: 'menu', name: 'Menu', href: '#menu', icon: Menu, isMenuTrigger: true },
    ];
  }

  // 2. Commercial Plateforme
  if (role === 'COMMERCIAL') {
    return [
      { id: 'tenants', name: 'Portefeuille', href: '/dashboard?tab=tenants', tab: 'tenants', icon: Building2 },
      { id: 'requests', name: 'Demandes', href: '/dashboard?tab=subscription-requests', tab: 'subscription-requests', icon: Clock },
      { id: 'commissions', name: 'Gains', href: '/dashboard/commercial', icon: Briefcase },
      { id: 'invoices', name: 'Factures', href: '/dashboard?tab=invoices', tab: 'invoices', icon: FileText },
      { id: 'menu', name: 'Menu', href: '#menu', icon: Menu, isMenuTrigger: true },
    ];
  }

  // 3. Commercial d'Organisation
  if (access?.level === 'commercial') {
    return [
      { id: 'network', name: 'Réseau', href: '/dashboard/org-commercial', icon: Briefcase },
      { id: 'catalogue', name: 'Explorer', href: '/dashboard/catalogue', icon: Store },
      { id: 'quotes', name: 'Devis', href: '/dashboard/bookings?tab=quotes', icon: Inbox },
      { id: 'menu', name: 'Menu', href: '#menu', icon: Menu, isMenuTrigger: true },
    ];
  }

  // 4. Staff Protocole seul
  if (access?.isProtocolOnly) {
    return [
      { id: 'home', name: 'Accueil', href: '/dashboard', icon: LayoutDashboard },
      { id: 'protocol', name: 'Protocole', href: '/dashboard/protocol', icon: ScanLine },
      { id: 'catalogue', name: 'Explorer', href: '/dashboard/catalogue', icon: Store },
      { id: 'bookings', name: 'Devis', href: '/dashboard/bookings?tab=quotes', icon: Inbox },
      { id: 'menu', name: 'Menu', href: '#menu', icon: Menu, isMenuTrigger: true },
    ];
  }

  // 5. Compte Client
  if (isClientAccount) {
    return [
      { id: 'home', name: 'Accueil', href: '/dashboard', icon: LayoutDashboard },
      { id: 'catalogue', name: 'Explorer', href: '/dashboard/catalogue', icon: Store },
      { id: 'simulator', name: 'Simulateur', href: '/dashboard/catalogue?tab=plan&planView=ai', icon: Sparkles },
      { id: 'packs', name: 'Mes packs', href: '/dashboard/catalogue?tab=packs', icon: Bookmark },
      { id: 'menu', name: 'Menu', href: '#menu', icon: Menu, isMenuTrigger: true },
    ];
  }

  // 6. Prestataire / Vendeur pur
  if (accountKind === 'VENDOR' || (!workspace.showEvents && workspace.showMarketplace)) {
    return [
      { id: 'home', name: 'Accueil', href: '/dashboard', icon: LayoutDashboard },
      { id: 'offers', name: 'Mes offres', href: '/dashboard/marketplace', icon: Briefcase },
      { id: 'quotes', name: 'Devis', href: '/dashboard/bookings?tab=quotes', icon: Inbox },
      { id: 'catalogue', name: 'Explorer', href: '/dashboard/catalogue', icon: Store },
      { id: 'menu', name: 'Menu', href: '#menu', icon: Menu, isMenuTrigger: true },
    ];
  }

  // 7. Organisateur standard (B2C ou B2B)
  const items: MobileBottomNavItem[] = [
    { id: 'home', name: 'Accueil', href: '/dashboard', icon: LayoutDashboard },
  ];

  if (workspace.showEvents) {
    items.push({ id: 'events', name: 'Événements', href: '/dashboard/events', icon: Calendar });
  }

  if (workspace.showProtocol) {
    items.push({ id: 'protocol', name: 'Protocole', href: '/dashboard/protocol', icon: ScanLine });
  } else if (workspace.showRooms) {
    items.push({ id: 'rooms', name: 'Salles', href: '/dashboard/rooms', icon: Building2 });
  }

  if (workspace.showBrowseCatalogue) {
    items.push({ id: 'catalogue', name: 'Explorer', href: '/dashboard/catalogue', icon: Store });
  } else {
    items.push({ id: 'quotes', name: 'Devis', href: '/dashboard/bookings?tab=quotes', icon: Inbox });
  }

  items.push({ id: 'menu', name: 'Menu', href: '#menu', icon: Menu, isMenuTrigger: true });

  return items;
}

export default function DashboardMobileBottomBar({
  role,
  access,
  workspace,
  accountKind,
  isClientAccount,
  mobileMenuOpen,
  onToggleMobileMenu,
  onCloseMobileMenu,
}: DashboardMobileBottomBarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const fallbackTab = role === 'SUPER_ADMIN' ? 'overview' : 'tenants';
  const currentTab = searchParams.get('tab') || fallbackTab;

  const items = React.useMemo(() => {
    return buildMobileBottomItems({
      role,
      access,
      workspace,
      accountKind,
      isClientAccount,
    });
  }, [role, access, workspace, accountKind, isClientAccount]);

  return (
    <nav
      aria-label="Navigation principale mobile"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/92 backdrop-blur-xl border-t border-border shadow-[0_-8px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.35)] pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1 px-1.5 transition-transform"
    >
      <div
        className="grid gap-1 items-center max-w-lg mx-auto"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const isMenu = Boolean(item.isMenuTrigger);
          const Icon = isMenu && mobileMenuOpen ? X : item.icon;
          const active = isMenu ? mobileMenuOpen : isBottomItemActive(pathname, searchParams.toString(), item, currentTab);

          if (isMenu) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={onToggleMobileMenu}
                aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir tout le menu'}
                aria-expanded={mobileMenuOpen}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 min-h-[48px] py-1 px-1 rounded-xl transition select-none touch-manipulation cursor-pointer active:scale-95',
                  active
                    ? 'text-primary font-bold'
                    : 'text-muted hover:text-foreground',
                )}
              >
                <div
                  className={cn(
                    'p-1.5 rounded-lg transition-all flex items-center justify-center',
                    active
                      ? 'bg-primary/15 text-primary scale-105'
                      : 'bg-transparent text-muted',
                  )}
                >
                  <Icon className="w-[19px] h-[19px]" />
                </div>
                <span className="text-[10px] tracking-tight leading-none truncate max-w-full">
                  {mobileMenuOpen ? 'Fermer' : item.name}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => {
                if (document.body.dataset.emTour === '1') return;
                onCloseMobileMenu();
              }}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-1 min-h-[48px] py-1 px-1 rounded-xl transition select-none touch-manipulation cursor-pointer active:scale-95',
                active
                  ? 'text-primary font-bold'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <div
                className={cn(
                  'p-1.5 rounded-lg transition-all flex items-center justify-center relative',
                  active
                    ? 'bg-primary/15 text-primary scale-105'
                    : 'bg-transparent text-muted',
                )}
              >
                <Icon className="w-[19px] h-[19px]" />
                {active && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[10px] tracking-tight leading-none truncate max-w-full">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
