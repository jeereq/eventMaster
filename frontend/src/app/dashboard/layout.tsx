'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  Calendar, Users, Mail, CreditCard, LayoutDashboard,
  LogOut, Menu, X, Loader2, ShieldCheck, PartyPopper, User, Sun, Moon, BarChart3,
  Building2, FileText, Key, MessageSquare, ScanLine, Briefcase, Clock, BookOpen,
} from 'lucide-react';
import PWARestrictedScreen from '@/components/PWARestrictedScreen';
import UserLegalGate from '@/components/UserLegalGate';
import { NotificationBell } from '@/components/CommercialNotifications';
import { cn } from '@/lib/cn';
import { TourProvider } from '@/context/TourContext';
import ProductTourOverlay from '@/components/guide/ProductTourOverlay';

interface NavItem {
  name: string;
  href: string;
  tab?: string;
  tourId?: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

function SidebarNav({
  sections,
  pathname,
  setMobileMenuOpen,
}: {
  sections: NavSection[];
  pathname: string;
  setMobileMenuOpen: (open: boolean) => void;
}) {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'tenants';

  return (
    <nav className="space-y-5">
      {sections.map((section, sectionIdx) => (
        <div key={section.label ?? sectionIdx}>
          {section.label && (
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
              {section.label}
            </p>
          )}
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = item.tab
                ? pathname === '/dashboard' && currentTab === item.tab
                : pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  data-tour={item.tourId}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
                    isActive
                      ? 'bg-surface-muted text-primary'
                      : 'text-muted hover:text-foreground hover:bg-surface-muted/70',
                  )}
                >
                  <Icon className={cn('w-[18px] h-[18px] shrink-0', isActive && 'text-primary')} />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, tenant, token, loading, logout, access } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login');
    }
  }, [token, loading, router]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  if (loading || !token || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="bg-indigo-600 p-3 rounded-xl text-white">
            <PartyPopper className="w-8 h-8" />
          </div>
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-muted">
            Chargement de votre espace…
          </p>
        </div>
      </div>
    );
  }

  const isLicenseExpired = tenant?.licenseExpiresAt && new Date(tenant.licenseExpiresAt) < new Date();
  const isLicenseInactive = tenant && !tenant.licenseActive;
  const isBlocked = user.role !== 'SUPER_ADMIN' && user.role !== 'COMMERCIAL' && (isLicenseInactive || isLicenseExpired);

  if (isBlocked) {
    return <PWARestrictedScreen />;
  }

  const navSections: NavSection[] = user?.role === 'SUPER_ADMIN'
    ? [
        {
          label: 'Plateforme',
          items: [
            { name: 'Organisations', href: '/dashboard?tab=tenants', tab: 'tenants', tourId: 'nav-tenants', icon: Building2 },
            { name: 'Utilisateurs', href: '/dashboard?tab=users', tab: 'users', tourId: 'nav-users', icon: Users },
            { name: 'Événements', href: '/dashboard?tab=events', tab: 'events', tourId: 'nav-events-admin', icon: Calendar },
            { name: 'Invités', href: '/dashboard?tab=guests', tab: 'guests', tourId: 'nav-guests', icon: Users },
          ],
        },
        {
          label: 'Contenu',
          items: [
            { name: 'Modèles globaux', href: '/dashboard?tab=templates', tab: 'templates', tourId: 'nav-templates', icon: FileText },
            { name: 'Messages invités', href: '/dashboard?tab=message-templates', tab: 'message-templates', tourId: 'nav-message-templates', icon: MessageSquare },
          ],
        },
        {
          label: 'Administration',
          items: [
            { name: 'Analyses & stats', href: '/dashboard?tab=analytics&section=overview', tab: 'analytics', tourId: 'nav-analytics', icon: BarChart3 },
            { name: 'Demandes abonnement', href: '/dashboard?tab=subscription-requests', tab: 'subscription-requests', tourId: 'nav-subscription-requests', icon: Clock },
            { name: 'Forfaits', href: '/dashboard?tab=subscription-plans', tab: 'subscription-plans', tourId: 'nav-subscription-plans', icon: CreditCard },
            { name: 'Factures', href: '/dashboard?tab=invoices', tab: 'invoices', tourId: 'nav-invoices', icon: FileText },
            { name: 'Configurations', href: '/dashboard?tab=settings', tab: 'settings', tourId: 'nav-settings', icon: Key },
          ],
        },
        {
          items: [
            { name: 'Guide utilisateur', href: '/dashboard/guide', tourId: 'nav-guide', icon: BookOpen },
            { name: 'Mon compte', href: '/dashboard/profile', tourId: 'nav-profile', icon: User },
          ],
        },
      ]
    : user?.role === 'COMMERCIAL'
    ? [
        {
          label: 'Plateforme',
          items: [
            { name: 'Organisations', href: '/dashboard?tab=tenants', tab: 'tenants', tourId: 'nav-tenants', icon: Building2 },
            { name: 'Demandes abonnement', href: '/dashboard?tab=subscription-requests', tab: 'subscription-requests', tourId: 'nav-subscription-requests', icon: Clock },
            { name: 'Factures', href: '/dashboard?tab=invoices', tab: 'invoices', tourId: 'nav-invoices', icon: FileText },
          ],
        },
        {
          items: [
            { name: 'Parrainage & commissions', href: '/dashboard/commercial', tourId: 'nav-commercial', icon: Briefcase },
            { name: 'Guide utilisateur', href: '/dashboard/guide', tourId: 'nav-guide', icon: BookOpen },
            { name: 'Mon compte', href: '/dashboard/profile', tourId: 'nav-profile', icon: User },
          ],
        },
      ]
    : access?.level === 'commercial'
    ? [
        {
          items: [
            { name: 'Réseau commercial', href: '/dashboard/org-commercial', tourId: 'nav-org-commercial', icon: Briefcase },
            { name: 'Guide utilisateur', href: '/dashboard/guide', tourId: 'nav-guide', icon: BookOpen },
            { name: 'Mon compte', href: '/dashboard/profile', tourId: 'nav-profile', icon: User },
          ],
        },
      ]
    : access?.isProtocolOnly
    ? [
        {
          items: [
            { name: 'Événements', href: '/dashboard/events', tourId: 'nav-events', icon: Calendar },
            { name: 'Protocole', href: '/dashboard/events?mode=protocol', tourId: 'nav-protocol', icon: ScanLine },
            { name: 'Guide utilisateur', href: '/dashboard/guide', tourId: 'nav-guide', icon: BookOpen },
            { name: 'Mon compte', href: '/dashboard/profile', tourId: 'nav-profile', icon: User },
          ],
        },
      ]
    : [
        {
          items: [
            { name: 'Tableau de bord', href: '/dashboard', tourId: 'nav-dashboard', icon: LayoutDashboard },
            { name: 'Événements', href: '/dashboard/events', tourId: 'nav-events', icon: Calendar },
            ...(access?.canProtocolAllEvents || access?.level === 'staff'
              ? [{ name: 'Protocole', href: '/dashboard/events?mode=protocol', tourId: 'nav-protocol', icon: ScanLine }]
              : []),
            ...(!access?.isProtocolOnly ? [
              { name: 'Statistiques', href: '/dashboard/analytics', tourId: 'nav-analytics-org', icon: BarChart3 },
              { name: 'Modèles', href: '/dashboard/templates', tourId: 'nav-templates', icon: Mail },
            ] : []),
            ...(access?.canViewBilling ? [{ name: 'Facturation & plan', href: '/dashboard/billing', tourId: 'nav-billing', icon: CreditCard }] : []),
            ...(access?.canViewInvoices ? [{ name: 'Factures', href: '/dashboard/invoices', tourId: 'nav-invoices', icon: FileText }] : []),
            { name: 'Guide utilisateur', href: '/dashboard/guide', tourId: 'nav-guide', icon: BookOpen },
            { name: 'Mon compte', href: '/dashboard/profile', tourId: 'nav-profile', icon: User },
          ],
        },
      ];

  const showCommercialNotifications = user?.role === 'COMMERCIAL' || access?.level === 'commercial';

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        </div>
      }
    >
      <TourProvider>
        <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground transition-colors duration-200">
      {/* Overlay mobile */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Header mobile */}
      <header className="md:hidden bg-sidebar border-b border-border h-14 px-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
            <PartyPopper className="w-4 h-4" />
          </div>
          <span className="font-semibold text-base text-foreground">EventMaster</span>
        </div>
        <div className="flex items-center gap-1.5">
          {showCommercialNotifications && <NotificationBell />}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-border text-muted hover:bg-surface-muted hover:text-foreground transition"
            aria-label="Changer de thème"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-muted hover:bg-surface-muted hover:text-foreground transition"
            aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-14 bottom-0 left-0 z-40 w-72 max-w-[85vw] bg-sidebar border-r border-border',
          'flex flex-col transform transition-transform duration-300 ease-out',
          'md:top-0 md:bottom-auto md:inset-y-0 md:translate-x-0 md:sticky md:h-screen md:w-64 md:max-w-none md:z-30',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Logo desktop */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <PartyPopper className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-base text-foreground block leading-none">EventMaster</span>
                <span className="text-[10px] font-semibold text-muted uppercase tracking-wider mt-1 block">
                  Workspace
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {showCommercialNotifications && <NotificationBell />}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg border border-border text-muted hover:bg-surface-muted hover:text-foreground transition"
                aria-label="Changer de thème"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Contexte tenant / admin */}
          {user?.role === 'SUPER_ADMIN' ? (
            <div className="p-3 bg-surface border border-border rounded-lg">
              <div className="text-[10px] text-muted font-semibold uppercase tracking-wider">Rôle global</div>
              <div className="font-semibold text-sm mt-0.5 text-foreground">Super Admin</div>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/10 text-[10px] font-bold text-primary">
                <ShieldCheck className="w-3 h-3" />
                Plateforme SaaS
              </div>
            </div>
          ) : user?.role === 'COMMERCIAL' ? (
            <div className="p-3 bg-amber-950/40 text-white border border-amber-800/50 rounded-lg">
              <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">Rôle global</div>
              <div className="font-semibold text-sm mt-0.5">Commercial plateforme</div>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-[10px] font-bold text-amber-300">
                <Briefcase className="w-3 h-3" />
                Sans organisation
              </div>
            </div>
          ) : tenant ? (
            <div className="p-3 bg-surface border border-border rounded-lg">
              <div className="text-[10px] text-muted font-semibold uppercase tracking-wider">
                Organisation
              </div>
              <div className="font-semibold text-foreground text-sm truncate mt-0.5">
                {tenant.name}
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/10 text-[10px] font-bold text-primary">
                <ShieldCheck className="w-3 h-3" />
                Plan {tenant.plan}
              </div>
            </div>
          ) : null}

          <Suspense
            fallback={
              <div className="h-20 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              </div>
            }
          >
            <SidebarNav sections={navSections} pathname={pathname} setMobileMenuOpen={setMobileMenuOpen} />
          </Suspense>
        </div>

        {/* Profil & déconnexion */}
        <div className="border-t border-border p-4 space-y-2 shrink-0">
          <Link
            href="/dashboard/profile"
            data-tour="nav-profile"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-muted transition group"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-500/15 flex items-center justify-center font-bold text-primary text-xs">
              {user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-foreground text-sm truncate block group-hover:text-primary transition-colors">
                {user.name}
              </span>
              <span className="text-xs text-muted truncate block">{user.email}</span>
            </div>
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-rose-500 hover:bg-rose-500/10 transition"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 min-w-0 overflow-y-auto bg-background">
        <div className="max-w-7xl mx-auto p-5 sm:p-6 lg:p-8">
          <UserLegalGate>{children}</UserLegalGate>
        </div>
      </main>
        <ProductTourOverlay />
        </div>
      </TourProvider>
    </Suspense>
  );
}
