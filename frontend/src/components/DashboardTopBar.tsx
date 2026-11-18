'use client';

import React, { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { isB2cPlanId } from '@/config/landingPricing';
import { useTheme } from '@/context/ThemeContext';
import { NotificationBell } from '@/components/CommercialNotifications';
import { ViewCustomizerTrigger } from '@/components/ViewCustomizer';
import { Tooltip } from '@/components/ui';
import PWAInstallCta from '@/components/PWAInstallCta';
import { Sun, Moon } from '@/components/icons';

/**
 * Titre unique de l’écran (barre du haut sur desktop, en-tête mobile).
 * Même libellé que l’entrée du menu : pas de sous-titre, pas de second titre dans la page.
 */
export function useDashboardTitle(): { title: string } {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, access, tenant, planFeatures } = useAuth();
  const tab = searchParams.get('tab');
  const isPersonal =
    isB2cPlanId(tenant?.plan || '') || isB2cPlanId(tenant?.pendingPlan || '') || planFeatures?.audience === 'B2C';

  const title = useMemo(() => {
    if (pathname.startsWith('/dashboard/events')) {
      if (searchParams.get('mode') === 'protocol') return 'Accueil jour J';
      return isPersonal ? 'Mes fêtes' : 'Événements';
    }
    if (pathname.startsWith('/dashboard/protocol')) return 'Accueil jour J';
    if (pathname.startsWith('/dashboard/templates')) return isPersonal ? 'Faire-part' : 'Modèles';
    if (pathname.startsWith('/dashboard/analytics')) return 'Statistiques';
    if (pathname.startsWith('/dashboard/billing')) return 'Forfait';
    if (pathname.startsWith('/dashboard/invoices')) return 'Factures';
    if (pathname.startsWith('/dashboard/rooms')) return isPersonal ? 'Plans de salle' : 'Salles';
    if (pathname.startsWith('/dashboard/team')) return isPersonal ? 'Co-organisateurs' : 'Équipe';
    if (pathname.startsWith('/dashboard/marketplace')) return 'Mes offres';
    if (pathname.startsWith('/dashboard/quotes')) return 'Demandes de devis';
    if (pathname.startsWith('/dashboard/bookings')) {
      if (tab === 'packs') return 'Mes packs';
      if (tab === 'favorites') return 'Favoris';
      return 'Réservations';
    }
    if (pathname.startsWith('/dashboard/profile')) return 'Mon compte';
    if (pathname.startsWith('/dashboard/guide')) return 'Guide utilisateur';
    if (pathname.startsWith('/dashboard/publications')) return 'Réalisations';
    if (pathname.startsWith('/dashboard/notifications')) return 'Notifications';
    if (pathname.startsWith('/dashboard/audit')) return 'Journal d’audit';
    if (pathname.startsWith('/dashboard/tickets')) {
      const isClient = tenant?.accountKind === 'CLIENT' || access?.level === 'client';
      const isOrg = !isClient && Boolean(access?.isOwner || access?.level === 'owner' || access?.level === 'manager' || access?.level === 'protocol' || access?.level === 'staff' || tenant?.accountKind === 'ORGANIZER');
      return isOrg && tab !== 'my' ? 'Billetterie' : 'Mes billets';
    }
    if (pathname.startsWith('/dashboard/catalogue/salles')) return 'Salle';
    if (pathname.startsWith('/dashboard/catalogue/prestataires')) return 'Prestation';
    if (pathname.startsWith('/dashboard/catalogue/locations')) return 'Matériel & Équipements';
    if (pathname.startsWith('/dashboard/catalogue')) {
      const hub = searchParams.get('hub') || tab;
      const kind = searchParams.get('kind');
      if (kind === 'event' && (!hub || hub === 'explore')) return 'Événements';
      if (hub === 'plan') return isPersonal ? 'Budget IA' : 'Simulateur';
      if (hub === 'favorites') return 'Mes favoris';
      if (hub === 'packs') return 'Mes packs';
      return isPersonal ? 'Salles & prestataires' : 'Explorer';
    }
    if (pathname.startsWith('/dashboard/admin/catalogue')) return 'Catalogue';
    if (pathname.startsWith('/dashboard/admin/payments')) return 'Paiements';
    if (pathname.startsWith('/dashboard/admin/donations')) return 'Dons solidaires';
    if (pathname.startsWith('/dashboard/admin/ai-tokens')) return 'Jetons IA';
    if (pathname.startsWith('/dashboard/admin/payouts')) return 'Versements SaaS';
    if (pathname.startsWith('/dashboard/admin/events')) return 'Événements';
    if (pathname.startsWith('/dashboard/admin/guests')) return 'Invités';
    if (pathname.startsWith('/dashboard/commercial')) return 'Parrainage & commissions';
    if (pathname.startsWith('/dashboard/org-commercial')) return 'Réseau commercial';

    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      if (user?.role === 'SUPER_ADMIN' || user?.role === 'COMMERCIAL') {
        const titles: Record<string, string> = {
          overview: 'Accueil',
          tenants: 'Organisations',
          users: 'Utilisateurs',
          templates: 'Modèles invitation',
          'message-templates': 'Messages automatiques',
          events: 'Événements',
          guests: 'Invités',
          analytics: 'Analyses',
          settings: 'Réglages plateforme',
          'subscription-requests': 'Demandes abonnement',
          'subscription-plans': 'Forfaits & tarifs',
          invoices: 'Factures',
        };
        const key = tab || (user.role === 'SUPER_ADMIN' ? 'overview' : 'tenants');
        return titles[key] || 'Accueil';
      }
      if (tenant?.accountKind === 'CLIENT' || access?.level === 'client') return 'Accueil';
      return isPersonal ? 'Ma fête' : 'Tableau de bord';
    }

    return 'EventMaster';
  }, [pathname, tab, searchParams, isPersonal, user?.role, access?.level, access?.isOwner, tenant?.accountKind]);

  return { title };
}

export default function DashboardTopBar() {
  const { theme, toggleTheme } = useTheme();
  const { title } = useDashboardTitle();

  // Utilisateur, déconnexion et repli du menu sont dans la barre latérale : pas de doublon ici.
  return (
    <header className="hidden md:block sticky top-0 z-30 shrink-0 border-b border-border bg-surface/95 isolate">
      <div className="em-auth-container h-16 flex items-center justify-between gap-4">
        <h1 className="em-dash-title min-w-0 text-base lg:text-lg font-semibold text-foreground truncate leading-tight">{title}</h1>

        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallCta variant="header" />
          <NotificationBell />
          <ViewCustomizerTrigger />
          <Tooltip content={theme === 'light' ? 'Mode sombre' : 'Mode clair'} side="bottom">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex min-h-11 min-w-11 items-center justify-center p-2 rounded-full border border-border bg-surface text-foreground hover:bg-surface-muted transition cursor-pointer"
              aria-label="Changer de thème"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
