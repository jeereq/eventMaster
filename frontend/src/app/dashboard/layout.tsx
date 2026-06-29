'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Calendar, Users, Mail, CreditCard, LayoutDashboard, 
  LogOut, Menu, X, Loader2, ShieldCheck, PartyPopper, User
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, tenant, token, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Redirect if not authenticated and auth loading finished
    if (!loading && !token) {
      router.push('/login');
    }
  }, [token, loading, router]);

  if (loading || !token || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Chargement de votre espace sécurisé...</p>
        </div>
      </div>
    );
  }

  const navItems = user?.role === 'SUPER_ADMIN' 
    ? [
        { name: 'Tableau de bord Admin', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Mon Compte', href: '/dashboard/profile', icon: User },
      ]
    : [
        { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Événements', href: '/dashboard/events', icon: Calendar },
        { name: 'Modèles', href: '/dashboard/templates', icon: Mail },
        { name: 'Facturation & Plan', href: '/dashboard/billing', icon: CreditCard },
        { name: 'Mon Compte', href: '/dashboard/profile', icon: User },
      ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-slate-200 h-16 px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
            <PartyPopper className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-slate-900">EventMaster</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar for Desktop */}
      <aside className={`fixed inset-y-0 left-0 bg-white border-r border-slate-200 w-64 p-6 flex flex-col justify-between transform md:translate-x-0 md:sticky md:h-screen z-30 transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-md shadow-indigo-100">
              <PartyPopper className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-none text-slate-900">EventMaster</span>
              <span className="text-xs font-semibold text-indigo-600 mt-1 uppercase tracking-wider">Workspace</span>
            </div>
          </div>

          {/* Tenant Context Indicator */}
          {user?.role === 'SUPER_ADMIN' ? (
            <div className="p-3.5 bg-slate-900 text-white border border-slate-800 rounded-xl">
              <div className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-wider">Rôle Global</div>
              <div className="font-bold text-sm truncate mt-0.5">Super Admin</div>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-extrabold text-indigo-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                Plateforme SaaS
              </div>
            </div>
          ) : tenant ? (
            <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Organisation</div>
              <div className="font-bold text-slate-800 text-sm truncate mt-0.5">{tenant.name}</div>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-extrabold text-indigo-700">
                <ShieldCheck className="w-3.5 h-3.5" />
                Plan {tenant.plan}
              </div>
            </div>
          ) : null}

          {/* Nav Items */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile & Logout */}
        <div className="border-t border-slate-100 pt-6 mt-6 space-y-4">
          <Link 
            href="/dashboard/profile"
            className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-slate-50 transition group"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm group-hover:bg-indigo-100 transition-colors">
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-semibold text-slate-800 text-sm truncate group-hover:text-indigo-600 transition-colors">{user.name}</span>
              <span className="text-xs text-slate-500 truncate">{user.email}</span>
            </div>
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto max-w-full p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
