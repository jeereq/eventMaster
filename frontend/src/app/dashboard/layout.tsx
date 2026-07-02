'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  Calendar, Users, Mail, CreditCard, LayoutDashboard,
  LogOut, Menu, X, Loader2, ShieldCheck, PartyPopper, User, Sun, Moon, BarChart3,
  Building2, FileText, Key, MessageSquare, ScanLine, Briefcase,
} from 'lucide-react';
import PWARestrictedScreen from '@/components/PWARestrictedScreen';
import UserLegalGate from '@/components/UserLegalGate';
import { cn } from '@/lib/cn';

interface NavItem {
  name: string;
  href: string;
  tab?: string;
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
            <p className="px-4 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {section.label}
            </p>
          )}
          <div className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = item.tab
                ? pathname === '/dashboard' && currentTab === item.tab
                : pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800',
                  )}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
            <PartyPopper className="w-8 h-8" />
          </div>
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Chargement de votre espace…
          </p>
        </div>
      </div>
    );
  }

  const isLicenseExpired = tenant?.licenseExpiresAt && new Date(tenant.licenseExpiresAt) < new Date();
  const isLicenseInactive = tenant && !tenant.licenseActive;
  const isBlocked = user.role !== 'SUPER_ADMIN' && (isLicenseInactive || isLicenseExpired);

  if (isBlocked) {
    return <PWARestrictedScreen />;
  }

  const navSections: NavSection[] = user?.role === 'SUPER_ADMIN'
    ? [
        {
          label: 'Plateforme',
          items: [
            { name: 'Organisations', href: '/dashboard?tab=tenants', tab: 'tenants', icon: Building2 },
            { name: 'Utilisateurs', href: '/dashboard?tab=users', tab: 'users', icon: Users },
            { name: 'Événements', href: '/dashboard?tab=events', tab: 'events', icon: Calendar },
            { name: 'Invités', href: '/dashboard?tab=guests', tab: 'guests', icon: Users },
          ],
        },
        {
          label: 'Contenu',
          items: [
            { name: 'Modèles globaux', href: '/dashboard?tab=templates', tab: 'templates', icon: FileText },
            { name: 'Messages invités', href: '/dashboard?tab=message-templates', tab: 'message-templates', icon: MessageSquare },
          ],
        },
        {
          label: 'Administration',
          items: [
            { name: 'Analyses & stats', href: '/dashboard?tab=analytics', tab: 'analytics', icon: BarChart3 },
            { name: 'Abonnements', href: '/dashboard?tab=subscriptions', tab: 'subscriptions', icon: CreditCard },
            { name: 'Configurations', href: '/dashboard?tab=settings', tab: 'settings', icon: Key },
          ],
        },
        {
          items: [{ name: 'Mon compte', href: '/dashboard/profile', icon: User }],
        },
      ]
    : user?.role === 'COMMERCIAL'
    ? [
        {
          items: [
            { name: 'Espace commercial', href: '/dashboard/commercial', icon: Briefcase },
            { name: 'Mon compte', href: '/dashboard/profile', icon: User },
          ],
        },
      ]
    : access?.isProtocolOnly
    ? [
        {
          items: [
            { name: 'Événements', href: '/dashboard/events', icon: Calendar },
            { name: 'Mon compte', href: '/dashboard/profile', icon: User },
          ],
        },
      ]
    : [
        {
          items: [
            { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
            { name: 'Événements', href: '/dashboard/events', icon: Calendar },
            ...(access?.canProtocolAllEvents || access?.level === 'staff'
              ? [{ name: 'Protocole', href: '/dashboard/events?mode=protocol', icon: ScanLine }]
              : []),
            ...(!access?.isProtocolOnly ? [
              { name: 'Statistiques', href: '/dashboard/analytics', icon: BarChart3 },
              { name: 'Modèles', href: '/dashboard/templates', icon: Mail },
            ] : []),
            ...(access?.canViewBilling ? [{ name: 'Facturation & plan', href: '/dashboard/billing', icon: CreditCard }] : []),
            { name: 'Mon compte', href: '/dashboard/profile', icon: User },
          ],
        },
      ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Overlay mobile */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Header mobile */}
      <header className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-14 px-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
            <PartyPopper className="w-4 h-4" />
          </div>
          <span className="font-bold text-base text-slate-900 dark:text-white">EventMaster</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            aria-label="Changer de thème"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
          'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800',
          'flex flex-col transform transition-transform duration-300 ease-out',
          'md:translate-x-0 md:sticky md:top-0 md:h-screen md:w-64 md:max-w-none md:z-30',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Logo desktop */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md shadow-indigo-500/20">
                <PartyPopper className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-base text-slate-900 dark:text-white block leading-none">EventMaster</span>
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mt-1 block">
                  Workspace
                </span>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              aria-label="Changer de thème"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>

          {/* Contexte tenant / admin */}
          {user?.role === 'SUPER_ADMIN' ? (
            <div className="p-3.5 bg-slate-900 dark:bg-slate-950 text-white border border-slate-800 rounded-xl">
              <div className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Rôle global</div>
              <div className="font-semibold text-sm mt-0.5">Super Admin</div>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-300">
                <ShieldCheck className="w-3 h-3" />
                Plateforme SaaS
              </div>
            </div>
          ) : tenant ? (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                Organisation
              </div>
              <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate mt-0.5">
                {tenant.name}
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
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
        <div className="border-t border-slate-200 dark:border-slate-800 p-5 space-y-3 shrink-0">
          <Link
            href="/dashboard/profile"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition group"
          >
            <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-300 text-xs">
              {user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {user.name}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">{user.email}</span>
            </div>
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <UserLegalGate>{children}</UserLegalGate>
        </div>
      </main>
    </div>
  );
}
