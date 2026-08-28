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

export function useDashboardTitle(): { title: string; subtitle?: string } {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const tab = searchParams.get('tab');

  return useMemo(() => {
    if (pathname.startsWith('/dashboard/events')) return { title: 'Événements', subtitle: 'Vos réceptions et invités' };
    if (pathname.startsWith('/dashboard/templates')) return { title: 'Modèles', subtitle: 'Faire-part et invitations' };
    if (pathname.startsWith('/dashboard/analytics')) return { title: 'Statistiques', subtitle: 'Réponses RSVP et présences' };
    if (pathname.startsWith('/dashboard/billing/payouts')) return { title: 'Versements commerciaux', subtitle: 'Commissions de votre réseau' };
    if (pathname.startsWith('/dashboard/billing')) return { title: 'Abonnement', subtitle: 'Formule et quotas' };
    if (pathname.startsWith('/dashboard/invoices')) return { title: 'Factures', subtitle: 'Historique des paiements' };
    if (pathname.startsWith('/dashboard/rooms')) return { title: 'Salles', subtitle: 'Plans 2D et fiches' };
    if (pathname.startsWith('/dashboard/team')) return { title: 'Équipe', subtitle: 'Membres et rôles' };
    if (pathname.startsWith('/dashboard/marketplace')) return { title: 'Marketplace', subtitle: 'Offres, locations et réservations' };
    if (pathname.startsWith('/dashboard/bookings')) return { title: 'Devis & Réservations', subtitle: 'Échanges et dates confirmées' };
    if (pathname.startsWith('/dashboard/profile')) return { title: 'Mon compte', subtitle: 'Profil et sécurité' };
    if (pathname.startsWith('/dashboard/notifications')) return { title: 'Notifications', subtitle: 'Alertes de votre compte' };
    if (pathname.startsWith('/dashboard/audit')) return { title: 'Journal d’audit', subtitle: 'Actions plateforme' };
    if (pathname.startsWith('/dashboard/tickets')) return { title: 'Mes billets', subtitle: 'Pass d’accès et QR codes' };
    if (pathname.startsWith('/dashboard/catalogue/salles')) return { title: 'Salle', subtitle: 'Fiche du lieu' };
    if (pathname.startsWith('/dashboard/catalogue/prestataires')) return { title: 'Prestation', subtitle: 'Fiche professionnelle' };
    if (pathname.startsWith('/dashboard/catalogue/locations')) return { title: 'Location', subtitle: 'Fiche équipement' };
    if (pathname.startsWith('/dashboard/catalogue')) {
      const hub = searchParams.get('hub');
      const kind = searchParams.get('kind');
      if (kind === 'event' && (!hub || hub === 'explore')) {
        return { title: 'Agenda', subtitle: 'Événements et billetterie' };
      }
      if (hub === 'plan') return { title: 'Préparer un événement', subtitle: 'Simulateur et packs clé en main' };
      if (hub === 'favorites') return { title: 'Favoris', subtitle: 'Vos coups de cœur enregistrés' };
      if (hub === 'packs') return { title: 'Mes packs', subtitle: 'Vos sélections sur mesure' };
      return { title: 'Marketplace', subtitle: 'Salles, prestataires et location de matériel' };
    }
    if (pathname.startsWith('/dashboard/admin/catalogue')) return { title: 'Catalogue', subtitle: 'Modération marketplace' };
    if (pathname.startsWith('/dashboard/admin/payouts')) return { title: 'Versements SaaS', subtitle: 'Commissions hors plateforme' };
    if (pathname.startsWith('/dashboard/admin/events')) return { title: 'Événements', subtitle: 'Console Super Admin' };
    if (pathname.startsWith('/dashboard/admin/guests')) return { title: 'Invités', subtitle: 'Console Super Admin' };
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
