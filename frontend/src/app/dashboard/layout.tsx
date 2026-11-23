'use client';
import { useMessagingChannels } from '@/hooks/useMessagingChannels';

import React, { useEffect, useState, useSyncExternalStore, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getWorkspaceModules } from '@/lib/planAccess';
import { useTheme } from '@/context/ThemeContext';
import {
 Calendar, Users, Mail, CreditCard, LayoutDashboard,
 LogOut, Loader2, ShieldCheck, Sun, Moon, BarChart3,
 Building2, FileText, Key, MessageSquare, ScanLine, Briefcase, Clock,
 PanelLeftClose, PanelLeft, Store, CalendarCheck, ScrollText, Ticket, Bell,
 Inbox, Sparkles, Heart, Rss, LayoutGrid, LineChart, User,
} from '@/components/icons';
import PWARestrictedScreen from '@/components/PWARestrictedScreen';
import PWAInstallCta from '@/components/PWAInstallCta';
import SiteBrandMark from '@/components/SiteBrandMark';
import UserLegalGate from '@/components/UserLegalGate';
import SupportSessionBanner from '@/components/admin/SupportSessionBanner';
import { NotificationBell } from '@/components/CommercialNotifications';
import {
  NotificationInboxProvider,
  UnreadCountBadge,
  useNotificationInbox,
} from '@/context/NotificationInboxContext';
import DashboardTopBar, { useDashboardTitle } from '@/components/DashboardTopBar';
import DashboardMobileBottomBar, {
  buildMobileBottomItems,
  type MobileBottomNavItem,
} from '@/components/dashboard/DashboardMobileBottomBar';
import DashboardMobileMenuSheet from '@/components/dashboard/DashboardMobileMenuSheet';
import UserAvatar from '@/components/UserAvatar';
import { Tooltip, OverflowMenu } from '@/components/ui';
import { cn } from '@/lib/cn';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { LANDING_PLANS } from '@/config/landingPricing';
import { planDisplayName } from '@/lib/planCatalogDb';
import { TourProvider } from '@/context/TourContext';
import ProductTourOverlay from '@/components/guide/ProductTourOverlay';
import FirstLoginTourHost from '@/components/guide/FirstLoginTourHost';
import { useAdminPendingCounts } from '@/components/admin/useAdminPendingCounts';
import {
 buildDashboardNav,
 isVenuePlan,
 navItemIsActive,
 type NavIconName,
 type NavSection,
} from '@/lib/dashboardNav';

const NAV_ICONS: Record<NavIconName, React.ComponentType<{ className?: string }>> = {
 LayoutDashboard, BarChart3, LineChart, Calendar, Ticket, ScanLine, Mail, Store, Sparkles, Inbox,
 CalendarCheck, Building2, Briefcase, Rss, Users, CreditCard, FileText, Bell,
 Clock, Heart, LayoutGrid, MessageSquare, Key, ScrollText,
};

function navHrefKey(href: string, tab?: string) {
  const qIndex = href.indexOf('?');
  const path = qIndex >= 0 ? href.slice(0, qIndex) : href;
  const query = qIndex >= 0 ? href.slice(qIndex + 1) : '';
  const params = new URLSearchParams(query);
  if (tab) params.set('tab', tab);
  return [path, params.get('hub') || params.get('tab') || '', params.get('kind') || '', params.get('mode') || ''].join('|');
}

function filterNavForMobileSheet(sections: NavSection[], bottomItems: MobileBottomNavItem[]): NavSection[] {
  const bottomKeys = new Set(
    bottomItems
      .filter((item) => !item.isMenuTrigger)
      .map((item) => navHrefKey(item.href, item.tab)),
  );
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !bottomKeys.has(navHrefKey(item.href, item.tab))),
    }))
    .filter((section) => section.items.length > 0);
}

/** Infobulles par défaut (sidebar réduite). */
const NAV_TOOLTIPS: Record<string, string> = {
 Accueil: 'File du jour : demandes, licences, factures',
 Organisations: 'Gérer les organisations et licences',
 Utilisateurs: 'Comptes plateforme et rôles',
 Événements: 'Créer et suivre vos événements',
 Invités: 'Liste globale des invités',
 'Modèles invitation': 'Modèles globaux et vitrine landing',
 'Messages automatiques': 'Textes e-mail / WhatsApp invités',
 Analyses: 'Statistiques et rapports plateforme',
 'Demandes abonnement': 'Approuver ou refuser les forfaits',
 'Forfaits & tarifs': 'Configurer les plans SaaS',
 Factures: 'Historique et détail des factures',
 'Réglages plateforme': 'Intégrations e-mail, WhatsApp…',
 'Guide utilisateur': 'Visite guidée de votre espace',
 Salles: 'Plans 2D, publication et disponibilités',
 Équipe: 'Managers et protocole d’accueil',
 Marketplace: 'Prestations, matériel & équipements et réservations reçues',
 'Devis & réservations': 'Devis envoyés, réservations, packs et favoris',
 'Parrainage & commissions': 'Code parrainage et gains',
 'Réseau commercial': 'Organisations que vous parrainez',
	Protocole: 'Scan QR et accueil invités',
	'Tableau de bord': 'Vue d’ensemble et quotas',
	'Mes réservations': 'Devis, réservations, packs et favoris',
	'Mes billets': 'Inscriptions, filtres et badge QR',
	Statistiques: 'Réponse à l’invitation, check-in, tâches et analyses d’événements',
 Modèles: 'Concepteur d’invitations',
 Forfait: 'Forfait, quotas et renouvellement',
 Notifications: 'Alertes tâches, devis, factures et réservations',
 'Journal d’audit': 'Actions Super Admin et Commercial',
 Catalogue: 'Fiches, demandes et réservations publiques',
 Réalisations: 'Fil des réalisations des salles et prestations',
};

function withNavTips(sections: NavSection[]): NavSection[] {
 return sections.map((section) => ({
 ...section,
 items: section.items.map((item) => ({
 ...item,
 description: item.description || NAV_TOOLTIPS[item.name],
 })),
 }));
}

function SidebarNav({
 sections,
 pathname,
 setMobileMenuOpen,
 collapsed,
 fallbackTab = 'tenants',
 variant = 'rail',
}: {
 sections: NavSection[];
 pathname: string;
 setMobileMenuOpen: (open: boolean) => void;
 collapsed: boolean;
 fallbackTab?: string;
 variant?: 'rail' | 'sheet';
}) {
  const messaging = useMessagingChannels();
 const searchParams = useSearchParams();
 const currentTab = searchParams.get('tab') || fallbackTab;
 const { unreadCount } = useNotificationInbox();

 const isSheet = variant === 'sheet';

 return (
 <nav className={cn(isSheet && 'space-y-3')} aria-label="Navigation principale">
 {sections.filter((section) => section.items.length > 0).map((section, sectionIdx) => (
 <div
  key={section.label ?? sectionIdx}
  className={cn(!isSheet && sectionIdx > 0 && 'mt-3 border-t border-border pt-3')}
 >
 {section.label && !collapsed && (
 <p className={cn('mb-1 text-xs font-medium text-muted', isSheet ? 'px-1 font-semibold' : 'px-2.5')}>
 {section.label}
 </p>
 )}
 <div className={cn(isSheet ? 'grid grid-cols-1 gap-1.5' : 'space-y-0.5')}>
 {section.items.map((item) => {
 const Icon = NAV_ICONS[item.icon];
 const isActive = navItemIsActive(pathname, searchParams.toString(), item, currentTab);

 const isNotifications = item.href === '/dashboard/notifications';
 const unreadLabel = isNotifications && unreadCount > 0
  ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
  : !isNotifications && item.badge
    ? `${item.badge} à traiter`
    : null;

 const tip = item.description ? (
 <span className="flex flex-col gap-0.5 text-left">
 <span className="font-semibold">{item.name}</span>
 <span className="font-normal opacity-80 max-w-[12rem] whitespace-normal leading-snug">
 {messaging.adapt(item.description)}
 </span>
 {unreadLabel ? <span className="font-semibold text-danger">{unreadLabel}</span> : null}
 </span>
 ) : (
 unreadLabel ? `${item.name} · ${unreadLabel}` : item.name
 );

 return (
 <Tooltip
 key={item.name}
 content={tip}
 side="right"
 disabled={!collapsed}
 className="flex w-full"
 >
 <Link
 href={item.href}
 data-tour={item.tourId}
 onClick={() => {
  if (document.body.dataset.emTour === '1') return;
  setMobileMenuOpen(false);
  if (typeof window !== 'undefined' && pathname === '/dashboard/catalogue') {
    if (item.href === '/dashboard/catalogue') {
      window.dispatchEvent(new CustomEvent('em-switch-tab', { detail: 'explore' }));
    } else if (item.href.includes('tab=plan') || item.href.includes('hub=plan')) {
      window.dispatchEvent(new CustomEvent('em-switch-tab', { detail: 'plan' }));
    } else if (item.href.includes('tab=favorites') || item.href.includes('hub=favorites')) {
      window.dispatchEvent(new CustomEvent('em-switch-tab', { detail: 'favorites' }));
    } else if (item.href.includes('tab=packs') || item.href.includes('hub=packs')) {
      window.dispatchEvent(new CustomEvent('em-switch-tab', { detail: 'packs' }));
    }
  }
 }}
 aria-current={isActive ? 'page' : undefined}
 aria-label={unreadLabel ? `${item.name}, ${unreadLabel}` : undefined}
 title={collapsed ? (unreadLabel ? `${item.name} · ${unreadLabel}` : item.name) : undefined}
 className={cn(
 'group relative flex w-full items-center rounded-xl text-sm font-medium transition-colors duration-150 touch-manipulation select-none active:scale-[0.99]',
 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
 isSheet
  ? 'justify-between min-h-14 gap-3 p-3 rounded-[var(--radius-card)] border'
  : collapsed
    ? 'justify-center h-10'
    : 'gap-3 px-2.5 min-h-10',
 isActive
  ? isSheet
    ? 'bg-primary/10 border-primary/30 text-foreground font-semibold'
    : 'bg-surface text-foreground shadow-sm ring-1 ring-border'
  : isSheet
    ? 'bg-surface border-border text-foreground hover:bg-surface-muted'
    : 'text-foreground/75 hover:text-foreground hover:bg-surface/70',
 )}
 >
 <span className={cn('relative shrink-0', isSheet && 'flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10')}>
 <Icon
 className={cn(
 'w-[18px] h-[18px] shrink-0 transition-colors',
 isSheet ? 'text-primary' : isActive ? 'text-foreground' : 'text-muted group-hover:text-foreground',
 )}
 />
 {collapsed && ((!isNotifications && item.badge) || (isNotifications && unreadCount > 0)) ? (
  <span aria-hidden className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
 ) : null}
 </span>
 {!collapsed && (
 <span className="min-w-0 flex-1 text-left">
  <span className="block truncate text-sm leading-snug">{item.name}</span>
 </span>
 )}
 {!collapsed && isNotifications ? (
  <UnreadCountBadge
    count={unreadCount}
    className={cn(
      'ml-auto tabular-nums text-xs',
      isSheet
        ? 'min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-danger text-primary-foreground font-bold'
        : 'font-semibold text-foreground',
    )}
  />
 ) : null}
 {!collapsed && !isNotifications && item.badge ? (
  <span
    className={cn(
      'ml-auto tabular-nums text-xs',
      isSheet
        ? 'min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full bg-festive-accent-soft text-festive-accent font-bold'
        : 'font-medium text-muted',
    )}
  >
    {item.badge > 99 ? '99+' : item.badge}
  </span>
 ) : null}
 </Link>
 </Tooltip>
 );
 })}
 </div>
 </div>
 ))}
 </nav>
 );
}

/** Forfait de l’organisation : badge, plus un lien « Changer » vers la page Forfait quand l’utilisateur peut la voir. */
function TenantPlanLink({
  isClient,
  planLabel,
  canOpen,
  onNavigate,
}: {
  isClient: boolean;
  planLabel: string;
  canOpen: boolean;
  onNavigate: () => void;
}) {
  const Icon = isClient ? ShieldCheck : Sparkles;
  return (
    <div className="mt-2 flex items-center justify-between gap-2">
      <span className="inline-flex min-w-0 items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-xs font-semibold text-primary">
        <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
        <span className="truncate">{isClient ? 'Compte client' : planLabel}</span>
      </span>
      {!isClient && canOpen ? (
        <Link
          href="/dashboard/billing"
          onClick={onNavigate}
          aria-label={`Changer le forfait ${planLabel}`}
          className="shrink-0 rounded-md px-1 text-xs font-semibold text-primary hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Changer
        </Link>
      ) : null}
    </div>
  );
}

function DashboardMobileTitle() {
 const { title } = useDashboardTitle();
 return <h1 className="em-dash-title font-semibold text-base text-foreground truncate">{title}</h1>;
}

const noopSubscribe = () => () => {};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
 const { user, tenant, token, loading, logout, access, planFeatures, planQuota, planName, supportSession } = useAuth();
 /**
  * false pendant l'hydratation, true ensuite. La session est souvent déjà chargée quand ce segment
  * s'hydrate (effet de l'AuthProvider) : sans ce garde, le client rend le tableau de bord là où le
  * serveur a rendu l'écran de chargement, et React reconstruit tout le segment.
  */
 const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
 /** Nom commercial du forfait actif (base) ; libellé marketing seulement en secours. */
 const tenantPlanLabel = planDisplayName(
  tenant?.plan,
  planName ? { name: planName } : null,
  LANDING_PLANS.find((p) => p.id === tenant?.plan)?.ms365Name,
 );
 const { site } = usePlatformSite();
 const visibility = site?.studioVisibility ?? { budget: true, invite: true, room: true };
 const allStudiosBlocked = !visibility.budget && !visibility.invite && !visibility.room;
 const { theme, toggleTheme } = useTheme();
 const router = useRouter();
 const pathname = usePathname();
 const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
 const adminCounts = useAdminPendingCounts(user?.role === 'SUPER_ADMIN' && !supportSession);
 const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
  if (typeof window === 'undefined') return false;
  try {
   return localStorage.getItem('em-sidebar-collapsed') === '1';
  } catch {
   return false;
  }
 });

 useEffect(() => {
  const onTourVisibility = (event: Event) => {
   const active = Boolean((event as CustomEvent<{ active?: boolean }>).detail?.active);
   if (!active) {
    try {
     if (localStorage.getItem('em-sidebar-collapsed') === '1') setSidebarCollapsed(true);
    } catch {
     /* ignore */
    }
    return;
   }
   setSidebarCollapsed(false);
   if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
    setMobileMenuOpen(true);
   }
  };
  window.addEventListener('em-tour-visibility', onTourVisibility);
  return () => window.removeEventListener('em-tour-visibility', onTourVisibility);
 }, []);

 const toggleSidebarCollapsed = () => {
 setSidebarCollapsed((prev) => {
 const next = !prev;
 try {
 localStorage.setItem('em-sidebar-collapsed', next ? '1' : '0');
 } catch {
 /* ignore */
 }
 return next;
 });
 };

 useEffect(() => {
   const onKeyDown = (e: KeyboardEvent) => {
     if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
       const tag = (e.target as HTMLElement)?.tagName;
       if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
         return;
       }
       e.preventDefault();
       toggleSidebarCollapsed();
     }
   };
   window.addEventListener('keydown', onKeyDown);
   return () => window.removeEventListener('keydown', onKeyDown);
 }, []);

 useEffect(() => {
 if (!loading && !token) {
   if (typeof window !== 'undefined') {
     window.location.assign('/login');
   } else {
     router.push('/login');
   }
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

 useEffect(() => {
   if (typeof document !== 'undefined' && document.body.dataset.emTour === '1') return;
   setMobileMenuOpen(false);
 }, [pathname]);

 useEffect(() => {
   const onTourVisibility = (event: Event) => {
     const active = Boolean((event as CustomEvent<{ active?: boolean }>).detail?.active);
     if (typeof window !== 'undefined' && window.innerWidth < 768) {
       setMobileMenuOpen(active);
     }
   };
   window.addEventListener('em-tour-visibility', onTourVisibility);
   return () => window.removeEventListener('em-tour-visibility', onTourVisibility);
 }, []);

 const isClientAccount = tenant?.accountKind === 'CLIENT' || access?.level === 'client';
 const canOpenBilling = !isClientAccount && Boolean(access?.isOwner || access?.canViewBilling);
 const workspace = getWorkspaceModules({
  accountKind: tenant?.accountKind,
  access,
  planQuota,
  planFeatures,
 });

 useEffect(() => {
 if (loading || !token || !user || !isClientAccount) return;
 const allowed = ['/dashboard', '/dashboard/bookings', '/dashboard/quotes', '/dashboard/profile', '/dashboard/guide', '/dashboard/notifications', '/dashboard/catalogue', '/dashboard/tickets', '/dashboard/publications'].some(
 (p) => pathname === p || (p !== '/dashboard' && pathname.startsWith(`${p}/`)),
 );
 if (pathname.startsWith('/dashboard') && !allowed) {
 router.replace('/dashboard');
 }
 }, [loading, token, user, isClientAccount, pathname, router]);

 useEffect(() => {
  if (loading || !token || !user || isClientAccount) return;
  if (user.role !== 'USER') return;
  if (!planQuota) return;
  // Les comptes protocole doivent pouvoir ouvrir le desk (événements + stats)
  if (access?.isProtocolOnly) {
    if (
      pathname.startsWith('/dashboard/templates') ||
      pathname.startsWith('/dashboard/rooms')
    ) {
      router.replace('/dashboard');
    }
    return;
  }
  const fallback = workspace.showMarketplace
    ? '/dashboard/marketplace'
    : workspace.showRooms
      ? '/dashboard/rooms'
      : '/dashboard';
  if (
   !workspace.showEvents &&
   (pathname.startsWith('/dashboard/events') ||
    pathname.startsWith('/dashboard/analytics') ||
    pathname.startsWith('/dashboard/templates'))
  ) {
   router.replace(fallback);
  }
  if (!workspace.showAnalytics && pathname.startsWith('/dashboard/analytics')) {
   router.replace('/dashboard');
  }
  if (!workspace.showRooms && pathname.startsWith('/dashboard/rooms')) {
   router.replace(fallback);
  }
  if (!workspace.showMarketplace && pathname.startsWith('/dashboard/marketplace')) {
   router.replace('/dashboard');
  }
 }, [
  loading,
  token,
  user,
  isClientAccount,
  access?.isProtocolOnly,
  planQuota,
  workspace.showEvents,
  workspace.showRooms,
  workspace.showMarketplace,
  workspace.showAnalytics,
  pathname,
  router,
 ]);

 if (!hydrated || loading || !token || !user) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-background px-4">
 <div className="flex flex-col items-center gap-4 animate-fade-in text-center max-w-sm">
 <SiteBrandMark href={null} size="lg" showLabel={false} />
 <Loader2 className="w-6 h-6 text-primary animate-spin" />
 <p className="text-sm font-medium text-muted">
  Chargement de votre espace…
 </p>
 {hydrated && !token && !loading && (
   <button
     type="button"
     onClick={() => {
       try {
         localStorage.clear();
       } catch {}
       window.location.assign('/login');
     }}
     className="text-xs text-primary hover:underline font-medium cursor-pointer"
   >
     Retourner à la page de connexion
   </button>
 )}
 </div>
 </div>
 );
 }

 const isLicenseExpired = tenant?.licenseExpiresAt && new Date(tenant.licenseExpiresAt) < new Date();
 const isLicenseInactive = tenant && !tenant.licenseActive;
 const isBlocked = !supportSession && !isClientAccount && user.role !== 'SUPER_ADMIN' && user.role !== 'COMMERCIAL' && (isLicenseInactive || isLicenseExpired);

 if (isBlocked) {
 return (
 <>
 <SupportSessionBanner />
 <PWARestrictedScreen />
 </>
 );
 }

 const navSections: NavSection[] = buildDashboardNav({
  role: user?.role,
  access,
  workspace,
  accountKind: tenant?.accountKind,
  isClientAccount,
  commercialNetwork: Boolean(planFeatures?.commercialNetwork),
  tenantPlan: tenant?.plan,
  audience: planFeatures?.audience,
  commercialPermissions: user?.commercialPermissions,
  allStudiosBlocked,
  adminCounts,
  venuePlan: isVenuePlan({
   audience: planFeatures?.audience,
   maxRooms: planQuota?.limits.maxRooms,
   quotaLoaded: Boolean(planQuota),
   workspace,
  }),
 });
 const showRealisations = navSections.some((section) =>
  section.items.some((item) => item.href === '/dashboard/publications'),
 );
 const bottomNavItems = buildMobileBottomItems({
  role: user?.role,
  access,
  workspace,
  accountKind: tenant?.accountKind,
  isClientAccount,
  allStudiosBlocked,
  showRealisations,
  adminCounts,
 });
 const sheetNavSections = filterNavForMobileSheet(navSections, bottomNavItems);

 const showNotifications = Boolean(user);

 return (
 <Suspense
 fallback={
 <div className="min-h-screen flex items-center justify-center bg-background">
 <Loader2 className="w-6 h-6 text-primary animate-spin" />
 </div>
 }
 >
 <TourProvider>
  <NotificationInboxProvider>
      <div className="h-dvh max-h-dvh min-h-0 overflow-hidden flex flex-col bg-background md:bg-surface text-foreground">
      <SupportSessionBanner />
      <div
        className="flex-1 min-h-0 flex flex-col md:flex-row"
        style={{ ['--em-sidebar-width' as string]: sidebarCollapsed ? '5.25rem' : '16.75rem' }}
      >
        {/* Header mobile */}
        <header className="md:hidden bg-surface/95 border-b border-border px-3 flex items-center justify-between fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top,0px)]">
          <div className="h-12 w-full flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <SiteBrandMark href="/dashboard" showLabel={false} />
              <DashboardMobileTitle />
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {showNotifications && <NotificationBell />}
              <button
                onClick={toggleTheme}
                className="inline-flex items-center justify-center min-h-11 min-w-11 p-2 rounded-full border border-border bg-surface text-foreground hover:bg-surface-muted transition touch-manipulation"
                aria-label="Changer de thème"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </header>
        <div
          aria-hidden
          className="md:hidden h-[calc(3rem+env(safe-area-inset-top,0px))] shrink-0"
        />

        {/* Sidebar — desktop uniquement ; mobile = bottom sheet */}
        <aside
          className={cn(
            'hidden md:flex md:flex-col relative shrink-0',
            'md:my-3 md:ml-3 md:z-30 md:rounded-2xl md:border md:border-border md:bg-background md:shadow-sm',
            'transition-[width] duration-200 ease-in-out',
            sidebarCollapsed ? 'md:w-[4.5rem]' : 'md:w-64',
          )}
        >
          <Tooltip content={sidebarCollapsed ? 'Agrandir le menu' : 'Réduire le menu'} side="right" className="absolute -right-3 top-5 z-10">
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-sm hover:text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label={sidebarCollapsed ? 'Agrandir la barre latérale' : 'Réduire la barre latérale'}
            >
              {sidebarCollapsed ? <PanelLeft className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
            </button>
          </Tooltip>

          {/* Marque */}
          <div className={cn('flex h-16 shrink-0 items-center border-b border-border', sidebarCollapsed ? 'justify-center' : 'px-4')}>
            <SiteBrandMark href="/dashboard" showLabel={!sidebarCollapsed} />
          </div>

          <div className={cn('flex-1 min-h-0 overflow-y-auto overscroll-contain', sidebarCollapsed ? 'px-2 py-3' : 'px-2.5 py-3')}>
            <Suspense
              fallback={
                <div className="h-20 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              }
            >
              {(() => {
                const filtered = withNavTips(navSections);
                return filtered.length > 0 ? (
                  <SidebarNav
                    sections={filtered}
                    pathname={pathname}
                    setMobileMenuOpen={setMobileMenuOpen}
                    collapsed={sidebarCollapsed}
                    fallbackTab={user.role === 'SUPER_ADMIN' ? 'overview' : 'tenants'}
                  />
                ) : (
                  <p className="px-2.5 py-2 text-sm text-muted">Aucun résultat</p>
                );
              })()}
            </Suspense>
          </div>

          {/* Forfait */}
          {user?.role !== 'SUPER_ADMIN' && user?.role !== 'COMMERCIAL' && tenant && !isClientAccount && canOpenBilling ? (
            sidebarCollapsed ? (
              <div className="flex shrink-0 justify-center pb-2">
                <Tooltip content={`Forfait ${tenantPlanLabel}`} side="right">
                  <Link
                    href="/dashboard/billing"
                    aria-label={`Changer le forfait ${tenantPlanLabel}`}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-solid text-primary-foreground shadow-sm hover:bg-primary-solid-hover transition"
                  >
                    <Sparkles className="w-[18px] h-[18px]" />
                  </Link>
                </Tooltip>
              </div>
            ) : (
              <div className="mx-2.5 mb-2.5 shrink-0 rounded-xl border border-border bg-surface p-3 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="w-4 h-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted">Forfait actuel</p>
                    <p className="truncate text-sm font-semibold text-foreground">{tenantPlanLabel}</p>
                  </div>
                </div>
                <Link
                  href="/dashboard/billing"
                  className="mt-3 flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary-solid px-3 text-sm font-semibold text-primary-foreground hover:bg-primary-solid-hover transition"
                >
                  <Sparkles className="w-4 h-4" aria-hidden />
                  Changer de forfait
                </Link>
              </div>
            )
          ) : null}

        </aside>

        <DashboardMobileMenuSheet
          open={mobileMenuOpen}
          onClose={() => {
            if (document.body.dataset.emTour === '1') return;
            setMobileMenuOpen(false);
          }}
          title="Menu & navigation"
          subtitle=""
        >
          {user?.role !== 'SUPER_ADMIN' && user?.role !== 'COMMERCIAL' && tenant ? (
            <div className="p-3 rounded-2xl bg-primary/5 border border-primary/15">
              <div className="font-bold text-foreground text-sm truncate" title={tenant.name}>{tenant.name}</div>
              <TenantPlanLink isClient={isClientAccount} planLabel={tenantPlanLabel} canOpen={canOpenBilling} onNavigate={() => setMobileMenuOpen(false)} />
            </div>
          ) : null}

          <Suspense
            fallback={
              <div className="h-20 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            }
          >
            <SidebarNav
              sections={withNavTips(sheetNavSections)}
              pathname={pathname}
              setMobileMenuOpen={setMobileMenuOpen}
              collapsed={false}
              fallbackTab={user.role === 'SUPER_ADMIN' ? 'overview' : 'tenants'}
              variant="sheet"
            />
          </Suspense>

          <div className="pt-2 border-t border-border/60 space-y-2">
            <Link
              href="/dashboard/profile"
              data-tour="nav-profile"
              onClick={() => {
                if (document.body.dataset.emTour === '1') return;
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 min-h-12 p-2.5 rounded-2xl bg-surface-muted/40 border border-border/60 hover:bg-surface-muted transition touch-manipulation"
            >
              <UserAvatar name={user.name} src={user.avatarUrl} size="md" />
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-foreground text-sm truncate block">{user.name}</span>
                <span className="text-xs text-muted truncate block">Mon compte</span>
              </div>
            </Link>
            <div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="flex w-full items-center justify-center gap-2 min-h-11 px-3 rounded-2xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition active:scale-95 touch-manipulation"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </div>
        </DashboardMobileMenuSheet>

      {/* Contenu principal */}
      <main id="main-content" className="flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain bg-surface flex flex-col md:ml-3">
        <DashboardTopBar
          accountMenu={
            <div data-tour="nav-profile">
              <OverflowMenu
                menuWidth={256}
                triggerLabel={`Menu du compte ${user.name}`}
                triggerClassName="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:ring-2 hover:ring-border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                trigger={<UserAvatar name={user.name} src={user.avatarUrl} size="md" />}
                header={
                  <div className="flex items-center gap-3">
                    <UserAvatar name={user.name} src={user.avatarUrl} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                      <p className="truncate text-xs text-muted">{user.email}</p>
                    </div>
                  </div>
                }
                items={[
                  { id: 'profile', label: 'Mon compte', icon: User, onSelect: () => router.push('/dashboard/profile') },
                  { id: 'notifications', label: 'Notifications', icon: Bell, onSelect: () => router.push('/dashboard/notifications') },
                  ...(canOpenBilling
                    ? [{ id: 'billing', label: 'Forfait', icon: CreditCard, onSelect: () => router.push('/dashboard/billing') }]
                    : []),
                  { id: 'logout', label: 'Déconnexion', icon: LogOut, onSelect: logout, danger: true, separatorBefore: true },
                ]}
              />
            </div>
          }
        />
        <div className="em-auth-container relative z-10 pt-3 sm:pt-6 lg:pt-8 pb-[calc(6.25rem+var(--em-site-install-bar)+env(safe-area-inset-bottom,0px))] md:pb-6 lg:pb-8 flex-1 em-dashboard-content">
          <UserLegalGate>
            {children}
            <FirstLoginTourHost />
          </UserLegalGate>
        </div>
      </main>

      {/* Barre de navigation mobile inférieure (Bottom Navigation Bar) */}
      <DashboardMobileBottomBar
        role={user?.role}
        access={access}
        workspace={workspace}
        accountKind={tenant?.accountKind}
        isClientAccount={isClientAccount}
        showRealisations={showRealisations}
        adminCounts={adminCounts}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
      />
      <PWAInstallCta variant="bar" />

      <div id="em-dashboard-stage" />

      <ProductTourOverlay />
    </div>
    </div>
  </NotificationInboxProvider>
  </TourProvider>
 </Suspense>
 );
}
