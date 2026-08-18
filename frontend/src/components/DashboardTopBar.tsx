'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { NotificationBell } from '@/components/CommercialNotifications';
import UserAvatar from '@/components/UserAvatar';
import { ViewCustomizerTrigger } from '@/components/ViewCustomizer';
import { Sun, Moon, User } from 'lucide-react';

function useDashboardTitle(): { title: string; subtitle?: string } {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const tab = searchParams.get('tab');

  return useMemo(() => {
    if (pathname.startsWith('/dashboard/events')) return { title: 'Événements', subtitle: 'Organisation & invités' };
    if (pathname.startsWith('/dashboard/templates')) return { title: 'Modèles', subtitle: 'Invitations visuelles' };
    if (pathname.startsWith('/dashboard/analytics')) return { title: 'Analyses', subtitle: 'Statistiques RSVP' };
    if (pathname.startsWith('/dashboard/billing')) return { title: 'Facturation', subtitle: 'Forfait & quotas' };
    if (pathname.startsWith('/dashboard/invoices')) return { title: 'Factures', subtitle: 'Historique' };
    if (pathname.startsWith('/dashboard/rooms')) return { title: 'Salles', subtitle: 'Plans 2D & publication' };
    if (pathname.startsWith('/dashboard/team')) return { title: 'Équipe', subtitle: 'Membres de l’organisation' };
    if (pathname.startsWith('/dashboard/marketplace')) return { title: 'Marketplace', subtitle: 'Prestations & réservations' };
    if (pathname.startsWith('/dashboard/bookings')) return { title: 'Mes réservations', subtitle: 'Demandes de dates' };
    if (pathname.startsWith('/dashboard/profile')) return { title: 'Mon compte', subtitle: 'Profil et sécurité' };
    if (pathname.startsWith('/dashboard/notifications')) return { title: 'Notifications', subtitle: 'Alertes de votre compte' };
    if (pathname.startsWith('/dashboard/audit')) return { title: 'Journal d’audit', subtitle: 'Actions plateforme' };
    if (pathname.startsWith('/dashboard/catalogue/salles')) return { title: 'Salle', subtitle: 'Fiche marketplace' };
    if (pathname.startsWith('/dashboard/catalogue/prestataires')) return { title: 'Prestation', subtitle: 'Fiche marketplace' };
    if (pathname.startsWith('/dashboard/catalogue')) return { title: 'Marketplace', subtitle: 'Salles, prestataires et préparation' };
    if (pathname.startsWith('/dashboard/admin/catalogue')) return { title: 'Catalogue', subtitle: 'Modération marketplace' };
    if (pathname.startsWith('/dashboard/commercial')) return { title: 'Parrainage', subtitle: 'Commissions plateforme' };
    if (pathname.startsWith('/dashboard/org-commercial')) return { title: 'Réseau commercial', subtitle: 'Parrainage organisation' };

    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      if (user?.role === 'SUPER_ADMIN' || user?.role === 'COMMERCIAL') {
        const titles: Record<string, string> = {
          overview: 'Accueil opérationnel',
          tenants: 'Organisations',
          users: 'Utilisateurs',
          templates: 'Modèles globaux',
          'message-templates': 'Messages invités',
          events: 'Événements',
          guests: 'Invités',
          analytics: 'Analytique',
          settings: 'Réglages',
          'subscription-requests': 'Demandes d’abonnement',
          'subscription-plans': 'Forfaits',
          invoices: 'Factures',
        };
        const key = tab || (user.role === 'SUPER_ADMIN' ? 'overview' : 'tenants');
        return {
          title: user.role === 'COMMERCIAL' ? 'Espace commercial' : 'Console Super Admin',
          subtitle: titles[key] || 'Pilotage',
        };
      }
      return { title: 'Tableau de bord', subtitle: 'Vue d’ensemble' };
    }

    return { title: 'EventMaster', subtitle: undefined };
  }, [pathname, tab, user?.role]);
}

export default function DashboardTopBar() {
  const { user, tenant } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { title, subtitle } = useDashboardTitle();

  const roleLabel =
    user?.role === 'SUPER_ADMIN'
      ? 'Super Admin'
      : user?.role === 'COMMERCIAL'
        ? 'Commercial'
        : tenant?.name || 'Organisation';

  return (
    <header className="hidden md:block sticky top-0 z-20 shrink-0 border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="page-container h-14 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-sm font-semibold text-foreground tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-[11px] text-muted truncate">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <NotificationBell />
        <ViewCustomizerTrigger />
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-[var(--radius-button)] border border-border text-muted hover:bg-surface-muted hover:text-foreground transition"
          aria-label="Changer de thème"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
        <Link
          href="/dashboard/profile"
          className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-[var(--radius-button)] border border-border hover:bg-surface-muted transition max-w-[14rem]"
        >
          <UserAvatar name={user?.name} src={user?.avatarUrl} size="sm" className="rounded-md" />
          <span className="min-w-0 hidden lg:block">
            <span className="block text-xs font-semibold text-foreground truncate">{user?.name || 'Compte'}</span>
            <span className="block text-[10px] text-muted truncate">{roleLabel}</span>
          </span>
          <User className="w-3.5 h-3.5 text-muted lg:hidden" />
        </Link>
      </div>
      </div>
    </header>
  );
}
