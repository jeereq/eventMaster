'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth, type OrgAccess } from '@/context/AuthContext';
import { getWorkspaceModules, type WorkspaceModules } from '@/lib/planAccess';
import { useTheme } from '@/context/ThemeContext';
import {
 Calendar, Users, Mail, CreditCard, LayoutDashboard,
 LogOut, Menu, X, Loader2, ShieldCheck, User, Sun, Moon, BarChart3,
 Building2, FileText, Key, MessageSquare, ScanLine, Briefcase, Clock, BookOpen,
 PanelLeftClose, PanelLeft, Store, CalendarCheck, ScrollText, Ticket, Wallet, Bell,
 Inbox, Sparkles, Bookmark, Heart, Rss,
} from 'lucide-react';
import PWARestrictedScreen from '@/components/PWARestrictedScreen';
import PWAInstallCta from '@/components/PWAInstallCta';
import SiteBrandMark from '@/components/SiteBrandMark';
import UserLegalGate from '@/components/UserLegalGate';
import SupportSessionBanner from '@/components/admin/SupportSessionBanner';
import { NotificationBell } from '@/components/CommercialNotifications';
import DashboardTopBar, { useDashboardTitle } from '@/components/DashboardTopBar';
import DashboardMobileBottomBar from '@/components/dashboard/DashboardMobileBottomBar';
import UserAvatar from '@/components/UserAvatar';
import ViewCustomizerDrawer, {
 ViewCustomizerEdgeHandle,
 ViewCustomizerTrigger,
} from '@/components/ViewCustomizer';
import { Tooltip } from '@/components/ui';
import { cn } from '@/lib/cn';
import { TourProvider } from '@/context/TourContext';
import ProductTourOverlay from '@/components/guide/ProductTourOverlay';
import FirstLoginTourHost from '@/components/guide/FirstLoginTourHost';

interface NavItem {
 name: string;
 href: string;
 tab?: string;
 tourId?: string;
 /** Texte d’aide pour l’infobulle */
 description?: string;
 icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
 label?: string;
 items: NavItem[];
}

function navItemIsActive(pathname: string, search: string, item: NavItem, currentTab: string) {
 if (item.tab) return pathname === '/dashboard' && currentTab === item.tab;
 const qIndex = item.href.indexOf('?');
 const path = qIndex >= 0 ? item.href.slice(0, qIndex) : item.href;
 const query = qIndex >= 0 ? item.href.slice(qIndex + 1) : '';
 const have = new URLSearchParams(search);
 const protocolDeskActive =
  pathname === '/dashboard/protocol'
  || ((pathname === '/dashboard/events' || pathname.startsWith('/dashboard/events/'))
    && have.get('mode') === 'protocol');

 // Entrée dédiée /dashboard/protocol + desk events?mode=protocol
 if (path === '/dashboard/protocol' || (path === '/dashboard/events' && new URLSearchParams(query).get('mode') === 'protocol')) {
  return protocolDeskActive;
 }

 const pathMatch = pathname === path || (path !== '/dashboard' && pathname.startsWith(`${path}/`)) || pathname.startsWith(`${path}?`);
 // /dashboard/events et /dashboard/events/:id
 const eventsPathMatch =
  path === '/dashboard/events' &&
  (pathname === '/dashboard/events' || pathname.startsWith('/dashboard/events/'));
 const effectivePathMatch = path === '/dashboard/events' ? eventsPathMatch : pathMatch;
 if (!effectivePathMatch) return false;
 if (item.href === '/dashboard/billing' && pathname.startsWith('/dashboard/billing/')) return false;
 if (query) {
  const want = new URLSearchParams(query);
  for (const [key, value] of want.entries()) {
    if (have.get(key) !== value) return false;
  }
  // Devis vs Réservations (même path /dashboard/bookings)
  if (path === '/dashboard/bookings' && want.has('tab')) {
   const haveTab = have.get('tab') || 'quotes';
   if (haveTab !== want.get('tab')) return false;
  }
  return pathname === path || (path === '/dashboard/events' && eventsPathMatch);
 }
 // « Événements » (sans mode) : pas actif quand on est en desk protocole
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
 'Versements SaaS': 'Commissions commerciaux plateforme, hors EventMaster',
 'Réglages plateforme': 'Intégrations e-mail, WhatsApp…',
 'Guide utilisateur': 'Documentation et visite guidée',
 'Mon compte': 'Profil et sécurité du compte',
 Salles: 'Plans 2D, publication et disponibilités',
 Équipe: 'Managers et protocole d’accueil',
 Marketplace: 'Prestations, matériel & équipements et réservations reçues',
 'Devis & réservations': 'Devis envoyés, réservations, packs et favoris',
 'Parrainage & commissions': 'Code parrainage et gains',
 'Réseau commercial': 'Organisations que vous parrainez',
 Protocole: 'Scan QR et accueil invités',
 'Tableau de bord': 'Vue d’ensemble et quotas',
 'Mes réservations': 'Devis, réservations, packs et favoris',
 Agenda: 'Événements publics du marketplace',
 'Mes billets': 'Inscriptions, filtres et badge QR',
 Statistiques: 'RSVP, check-in, tâches et analyses d’événements',
 Modèles: 'Concepteur d’invitations',
 'Facturation & plan': 'Forfait, quotas et upgrade',
 'Versements commerciaux': 'Commissions de vos commerciaux org., hors plateforme',
 Notifications: 'Alertes tâches, devis, factures et réservations',
 'Journal d’audit': 'Actions Super Admin et Commercial',
 Catalogue: 'Fiches, demandes et réservations publiques',
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

function navSection(label: string | undefined, items: NavItem[]): NavSection | null {
 return items.length ? { label, items } : null;
}

function buildNavSections(...sections: Array<NavSection | null>): NavSection[] {
 return sections.filter((section): section is NavSection => Boolean(section?.items.length));
}

function compteNavItems(): NavItem[] {
 return [
  { name: 'Notifications', href: '/dashboard/notifications', tourId: 'nav-notifications', icon: Bell },
  { name: 'Guide utilisateur', href: '/dashboard/guide', tourId: 'nav-guide', icon: BookOpen },
  { name: 'Mon compte', href: '/dashboard/profile', tourId: 'nav-profile', icon: User },
 ];
}

function buildDashboardNav(opts: {
 role?: string;
 access?: OrgAccess | null;
 workspace: WorkspaceModules;
 accountKind?: string | null;
 isClientAccount: boolean;
 commercialNetwork?: boolean;
}): NavSection[] {
 const { role, access, workspace, accountKind, isClientAccount, commercialNetwork } = opts;
 const vendorOnly = accountKind === 'VENDOR';

 if (role === 'SUPER_ADMIN') {
  return buildNavSections(
   navSection('Pilotage', [
    { name: 'Accueil', href: '/dashboard?tab=overview', tab: 'overview', tourId: 'nav-overview', icon: LayoutDashboard },
    { name: 'Analyses', href: '/dashboard?tab=analytics&section=overview', tab: 'analytics', tourId: 'nav-analytics', icon: BarChart3 },
    { name: 'Journal d’audit', href: '/dashboard/audit', tourId: 'nav-audit', icon: ScrollText },
   ]),
   navSection('Organisations', [
    { name: 'Organisations', href: '/dashboard?tab=tenants', tab: 'tenants', tourId: 'nav-tenants', icon: Building2 },
    { name: 'Utilisateurs', href: '/dashboard?tab=users', tab: 'users', tourId: 'nav-users', icon: Users },
    { name: 'Événements', href: '/dashboard/admin/events', tourId: 'nav-events-admin', icon: Calendar },
    { name: 'Invités', href: '/dashboard/admin/guests', tourId: 'nav-guests', icon: Users },
   ]),
   navSection('Contenu & vitrine', [
    { name: 'Modèles invitation', href: '/dashboard?tab=templates', tab: 'templates', tourId: 'nav-templates', icon: FileText },
    { name: 'Messages automatiques', href: '/dashboard?tab=message-templates', tab: 'message-templates', tourId: 'nav-message-templates', icon: MessageSquare },
    { name: 'Catalogue', href: '/dashboard/admin/catalogue', tourId: 'nav-catalog-admin', icon: Store },
   ]),
   navSection('Facturation', [
    { name: 'Demandes abonnement', href: '/dashboard?tab=subscription-requests', tab: 'subscription-requests', tourId: 'nav-subscription-requests', icon: Clock },
    { name: 'Forfaits & tarifs', href: '/dashboard?tab=subscription-plans', tab: 'subscription-plans', tourId: 'nav-subscription-plans', icon: CreditCard },
    { name: 'Paiements', href: '/dashboard/admin/payments', tourId: 'nav-payments-admin', icon: CreditCard },
    { name: 'Factures', href: '/dashboard?tab=invoices', tab: 'invoices', tourId: 'nav-invoices', icon: FileText },
    { name: 'Versements SaaS', href: '/dashboard/admin/payouts', tourId: 'nav-payouts', icon: Wallet },
   ]),
   navSection('Système', [
    { name: 'Réglages plateforme', href: '/dashboard?tab=settings', tab: 'settings', tourId: 'nav-settings', icon: Key },
   ]),
   navSection('Compte', compteNavItems()),
  );
 }

 if (role === 'COMMERCIAL') {
  return buildNavSections(
   navSection('Portefeuille', [
    { name: 'Organisations', href: '/dashboard?tab=tenants', tab: 'tenants', tourId: 'nav-tenants', icon: Building2 },
    { name: 'Demandes abonnement', href: '/dashboard?tab=subscription-requests', tab: 'subscription-requests', tourId: 'nav-subscription-requests', icon: Clock },
    { name: 'Factures', href: '/dashboard?tab=invoices', tab: 'invoices', tourId: 'nav-invoices', icon: FileText },
   ]),
   navSection('Gains', [
    { name: 'Parrainage & commissions', href: '/dashboard/commercial', tourId: 'nav-commercial', icon: Briefcase },
   ]),
   navSection('Compte', compteNavItems()),
  );
 }

 if (access?.level === 'commercial') {
  return buildNavSections(
   navSection('Réseau', [
    { name: 'Réseau commercial', href: '/dashboard/org-commercial', tourId: 'nav-org-commercial', icon: Briefcase },
   ]),
   navSection('Compte', compteNavItems()),
  );
 }

 if (access?.isProtocolOnly) {
  return buildNavSections(
   navSection('Accueil', [
    { name: 'Tableau de bord', href: '/dashboard', tourId: 'nav-dashboard', icon: LayoutDashboard, description: 'Accueils du jour, check-in et tâches' },
   ]),
   navSection('Jour J', [
    { name: 'Protocole', href: '/dashboard/protocol', tourId: 'nav-protocol', icon: ScanLine, description: 'Accueil QR, événements et tâches du jour' },
   ]),
   navSection('Marketplace', [
    { name: 'Explorer', href: '/dashboard/catalogue', tourId: 'nav-catalogue', icon: Store, description: 'Salles, prestataires et matériel & équipements — comme le catalogue client' },
    { name: 'Demandes de devis', href: '/dashboard/bookings?tab=quotes', tourId: 'nav-quotes', icon: Inbox },
    { name: 'Réservations', href: '/dashboard/bookings?tab=bookings', tourId: 'nav-reservations', icon: CalendarCheck },
   ]),
   navSection('Suivi', [
    { name: 'Statistiques', href: '/dashboard/analytics', tourId: 'nav-analytics-org', icon: BarChart3 },
   ]),
   navSection('Compte', compteNavItems()),
  );
 }

 if (isClientAccount) {
  return buildNavSections(
   navSection('Mon Espace', [
    { name: 'Tableau de bord', href: '/dashboard', tourId: 'nav-client-dashboard', icon: LayoutDashboard, description: 'Définir vos objectifs, recommandations et synthèse de vos activités' },
    { name: 'Marketplace', href: '/dashboard/catalogue', tourId: 'nav-catalogue', icon: Store, description: 'Salles, prestataires, matériel & équipements et fiches publiques' },
    { name: 'Simulateur de pack', href: '/dashboard/catalogue?tab=plan&planView=ai', tourId: 'nav-simulator', icon: Sparkles, description: 'Simulateur budget IA, assemblage de packs et devis groupés' },
    { name: 'Mes packs créés', href: '/dashboard/catalogue?tab=packs', tourId: 'nav-my-packs', icon: Bookmark, description: 'Retrouver et gérer tous vos packs d’événements enregistrés' },
    { name: 'Agenda & Billets', href: '/dashboard/catalogue?kind=event', tourId: 'nav-agenda', icon: Calendar, description: 'Événements publics du marketplace — inscriptions et billets' },
   ]),
   navSection('Mes activités', [
    { name: 'Mes billets', href: '/dashboard/tickets', tourId: 'nav-tickets', icon: Ticket, description: 'Inscriptions, filtres, vue grille/liste et badges QR' },
    { name: 'Réalisations', href: '/dashboard/publications', tourId: 'nav-publications', icon: Rss, description: 'Fil des réalisations des salles et prestations' },
    { name: 'Demandes de devis', href: '/dashboard/bookings?tab=quotes', tourId: 'nav-quotes', icon: Inbox },
    { name: 'Réservations', href: '/dashboard/bookings?tab=bookings', tourId: 'nav-reservations', icon: CalendarCheck },
    { name: 'Mes favoris', href: '/dashboard/catalogue?tab=favorites', tourId: 'nav-favorites', icon: Heart, description: 'Salles et prestataires mis de côté' },
   ]),
   navSection('Compte', compteNavItems()),
  );
 }

 const eventItems: NavItem[] = [
  ...(workspace.showEvents
   ? [{ name: 'Événements', href: '/dashboard/events', tourId: 'nav-events', icon: Calendar }]
   : []),
  ...(workspace.showProtocol
   ? [{ name: 'Protocole', href: '/dashboard/protocol', tourId: 'nav-protocol', icon: ScanLine }]
   : []),
  ...(workspace.showAnalytics
   ? [{ name: 'Statistiques', href: '/dashboard/analytics', tourId: 'nav-analytics-org', icon: BarChart3 }]
   : []),
  ...(workspace.showTemplates
   ? [{ name: 'Modèles', href: '/dashboard/templates', tourId: 'nav-templates', icon: Mail }]
   : []),
 ];

 const marketItems: NavItem[] = [
  ...(workspace.showBrowseCatalogue
   ? [
      { name: 'Explorer', href: '/dashboard/catalogue', tourId: 'nav-catalogue', icon: Store, description: 'Catalogue acheteur : salles, prestataires, matériel & équipements (comme le client)' },
      { name: 'Simulateur IA', href: '/dashboard/catalogue?tab=plan&planView=ai', tourId: 'nav-simulator-org', icon: Sparkles, description: 'Simulateur budget IA, 3 formules clés en main et devis' },
      { name: 'Réalisations', href: '/dashboard/publications', tourId: 'nav-publications', icon: Rss, description: 'Grille de réalisations et création de posts liés aux salles / prestations' },
     ]
   : []),
  ...(workspace.showEvents || workspace.showBrowseCatalogue
   ? [
      { name: 'Demandes de devis', href: '/dashboard/bookings?tab=quotes', tourId: 'nav-quotes', icon: Inbox },
      { name: 'Réservations', href: '/dashboard/bookings?tab=bookings', tourId: 'nav-reservations', icon: CalendarCheck },
     ]
   : []),
  ...(workspace.showMarketplace
   ? [{ name: 'Mes offres', href: '/dashboard/marketplace', tourId: 'nav-marketplace', icon: Briefcase, description: 'Publier et gérer vos fiches vendeur (salle / prestataire / matériel & équipements)' }]
   : []),
  ...(workspace.showRooms
   ? [{ name: 'Salles', href: '/dashboard/rooms', tourId: 'nav-rooms', icon: Building2 }]
   : []),
 ];

 const billingItems: NavItem[] = [
  ...(access?.canViewBilling
   ? [{ name: 'Facturation & plan', href: '/dashboard/billing', tourId: 'nav-billing', icon: CreditCard }]
   : []),
  ...(access?.canViewBilling && commercialNetwork
   ? [{ name: 'Versements commerciaux', href: '/dashboard/billing/payouts', tourId: 'nav-org-payouts', icon: Wallet }]
   : []),
  ...(access?.canViewInvoices
   ? [{ name: 'Factures', href: '/dashboard/invoices', tourId: 'nav-invoices', icon: FileText }]
   : []),
 ];

 return buildNavSections(
  navSection('Accueil', [
   { name: 'Tableau de bord', href: '/dashboard', tourId: 'nav-dashboard', icon: LayoutDashboard },
  ]),
  navSection('Événements', eventItems),
  navSection(vendorOnly ? 'Offre' : 'Marketplace', marketItems),
  navSection('Organisation', workspace.showTeam
   ? [{ name: 'Équipe', href: '/dashboard/team', tourId: 'nav-team', icon: Users }]
   : []),
  navSection('Facturation', billingItems),
  navSection('Compte', compteNavItems()),
 );
}

function SidebarNav({
 sections,
 pathname,
 setMobileMenuOpen,
 collapsed,
 fallbackTab = 'tenants',
}: {
 sections: NavSection[];
 pathname: string;
 setMobileMenuOpen: (open: boolean) => void;
 collapsed: boolean;
 fallbackTab?: string;
}) {
 const searchParams = useSearchParams();
 const currentTab = searchParams.get('tab') || fallbackTab;

 return (
 <nav className={cn('space-y-4', collapsed && 'space-y-2.5')} aria-label="Navigation principale">
 {sections.filter((section) => section.items.length > 0).map((section, sectionIdx) => (
 <div key={section.label ?? sectionIdx}>
 {section.label && !collapsed && (
 <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
 {section.label}
 </p>
 )}
 {section.label && collapsed && (
 <div className="mx-auto mb-1.5 h-px w-5 bg-border" aria-hidden title={section.label} />
 )}
 <div className="space-y-0.5">
 {section.items.map((item) => {
 const Icon = item.icon;
 const isActive = navItemIsActive(pathname, searchParams.toString(), item, currentTab);

 const tip = item.description ? (
 <span className="flex flex-col gap-0.5 text-left">
 <span className="font-semibold">{item.name}</span>
 <span className="font-normal opacity-80 max-w-[12rem] whitespace-normal leading-snug">
 {item.description}
 </span>
 </span>
 ) : (
 item.name
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
 }}
 aria-current={isActive ? 'page' : undefined}
 title={collapsed ? item.name : undefined}
 className={cn(
 'group relative flex w-full items-center rounded-[var(--radius-button)] text-sm font-medium transition-colors duration-150 touch-manipulation select-none active:scale-[0.99]',
 collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5 min-h-[40px]',
 isActive
 ? 'bg-surface text-foreground shadow-[var(--shadow-soft)] font-semibold'
 : 'text-muted hover:text-foreground hover:bg-surface-muted/80',
 )}
 >
 {isActive && (
 <span
 className={cn(
 'absolute bg-primary rounded-full',
 collapsed
 ? 'left-1 top-1/2 -translate-y-1/2 h-4 w-0.5'
 : 'left-0 top-1/2 -translate-y-1/2 h-5 w-0.5',
 )}
 aria-hidden
 />
 )}
 <Icon
 className={cn(
 'w-[18px] h-[18px] shrink-0 transition-colors',
 isActive ? 'text-primary' : 'text-muted group-hover:text-foreground',
 )}
 />
 {!collapsed && (
 <span className="truncate text-[13px] leading-snug">{item.name}</span>
 )}
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

function DashboardMobileTitle() {
 const { title } = useDashboardTitle();
 return <span className="font-semibold text-sm text-foreground truncate">{title}</span>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
 const { user, tenant, token, loading, logout, access, planFeatures, planQuota, supportSession } = useAuth();
 const { theme, toggleTheme } = useTheme();
 const router = useRouter();
 const pathname = usePathname();
 const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
 const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

 useEffect(() => {
 try {
 const stored = localStorage.getItem('em-sidebar-collapsed');
 if (stored === '1') setSidebarCollapsed(true);
 } catch {
 /* ignore */
 }
 }, []);

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

 const isClientAccount = tenant?.accountKind === 'CLIENT' || access?.level === 'client';
 const workspace = getWorkspaceModules({
  accountKind: tenant?.accountKind,
  access,
  planQuota,
  planFeatures,
 });

 useEffect(() => {
 if (loading || !token || !user || !isClientAccount) return;
 const allowed = ['/dashboard', '/dashboard/bookings', '/dashboard/profile', '/dashboard/guide', '/dashboard/notifications', '/dashboard/catalogue', '/dashboard/tickets', '/dashboard/publications'].some(
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
  if (access?.isProtocolOnly) return;
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
  pathname,
  router,
 ]);

 if (loading || !token || !user) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-background">
 <div className="flex flex-col items-center gap-4 animate-fade-in">
 <SiteBrandMark href={null} size="lg" showLabel={false} />
 <Loader2 className="w-6 h-6 text-primary animate-spin" />
 <p className="text-sm font-medium text-muted">
 Chargement de votre espace…
 </p>
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
 });

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
 <SupportSessionBanner />
      <div
        className="min-h-screen flex flex-col md:flex-row bg-background text-foreground"
        style={{ ['--em-sidebar-width' as string]: sidebarCollapsed ? '4.5rem' : '16rem' }}
      >
        {/* Overlay mobile */}
        {mobileMenuOpen && (
          <button
            type="button"
            aria-label="Fermer le menu"
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden animate-fade-in"
            onClick={() => {
              if (document.body.dataset.emTour === '1') return;
              setMobileMenuOpen(false);
            }}
          />
        )}

        {/* Header mobile */}
        <header className="md:hidden bg-sidebar border-b border-border px-3 flex items-center justify-between sticky top-0 z-30 pt-[env(safe-area-inset-top,0px)]">
          <div className="h-12 w-full flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <SiteBrandMark href="/dashboard" showLabel={false} />
            <DashboardMobileTitle />
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {showNotifications && <NotificationBell />}
            <ViewCustomizerTrigger />
            <button
              onClick={toggleTheme}
              className="inline-flex items-center justify-center min-h-11 min-w-11 p-2 rounded-lg border border-border text-muted hover:bg-surface-muted hover:text-foreground transition touch-manipulation"
              aria-label="Changer de thème"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center min-h-11 min-w-11 p-2 rounded-lg text-muted hover:bg-surface-muted hover:text-foreground transition touch-manipulation"
              aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
          </div>
        </header>

        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-[70] w-[min(86vw,20rem)] bg-sidebar border-r border-border shadow-2xl',
            'flex flex-col transition-[width,transform] duration-200 ease-in-out',
            'md:top-0 md:bottom-auto md:inset-y-0 md:translate-x-0 md:sticky md:h-screen md:max-w-none md:z-30 md:shadow-none',
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
            sidebarCollapsed ? 'md:w-[4.5rem]' : 'md:w-64',
          )}
        >
          {/* Header spécifique du drawer mobile */}
          <div className="flex md:hidden items-center justify-between p-3.5 border-b border-border bg-surface shrink-0">
            <SiteBrandMark
              href="/dashboard"
              size="sm"
              meta={
                user?.role === 'SUPER_ADMIN'
                  ? 'Console plateforme'
                  : user?.role === 'COMMERCIAL'
                    ? 'Espace commercial'
                    : isClientAccount
                      ? 'Espace client'
                      : tenant?.accountKind === 'VENDOR'
                        ? 'Espace marketplace'
                        : 'Workspace'
              }
            />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex items-center justify-center min-h-11 min-w-11 p-1.5 rounded-lg bg-surface-muted hover:bg-border text-foreground transition touch-manipulation cursor-pointer"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className={cn('flex-1 overflow-y-auto overscroll-contain space-y-4', sidebarCollapsed ? 'p-2 md:p-2' : 'p-3.5 sm:p-4')}>
            {/* Logo desktop */}
            <div className={cn('hidden md:flex items-center', sidebarCollapsed ? 'flex-col gap-2' : 'justify-between')}>
              <SiteBrandMark
                href="/dashboard"
                showLabel={!sidebarCollapsed}
                meta={
                  sidebarCollapsed
                    ? undefined
                    : user?.role === 'SUPER_ADMIN'
                      ? 'Console plateforme'
                      : user?.role === 'COMMERCIAL'
                        ? 'Espace commercial'
                        : isClientAccount
                          ? 'Espace client'
                          : tenant?.accountKind === 'VENDOR'
                            ? 'Espace marketplace'
                            : 'Workspace'
                }
              />
              <div className={cn('flex items-center gap-1', sidebarCollapsed && 'flex-col')}>
                <Tooltip content={sidebarCollapsed ? 'Agrandir le menu' : 'Réduire le menu'} side="right">
                  <button
                    type="button"
                    onClick={toggleSidebarCollapsed}
                    className="p-2 rounded-[var(--radius-button)] border border-border text-muted hover:bg-surface-muted hover:text-foreground transition"
                    aria-label={sidebarCollapsed ? 'Agrandir la barre latérale' : 'Réduire la barre latérale'}
                  >
                    {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                  </button>
                </Tooltip>
                {!sidebarCollapsed && (
                  <Tooltip content={theme === 'light' ? 'Passer en sombre' : 'Passer en clair'} side="bottom">
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="p-2 rounded-[var(--radius-button)] border border-border text-muted hover:bg-surface-muted hover:text-foreground transition"
                      aria-label="Changer de thème"
                    >
                      {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>

            {/* Contexte tenant / admin */}
            {(!sidebarCollapsed || mobileMenuOpen) && (
              <>
                {user?.role === 'SUPER_ADMIN' ? (
                  <div className="p-3 bg-surface border border-border rounded-lg">
                    <div className="text-[10px] text-muted font-semibold uppercase tracking-wider">Rôle global</div>
                    <div className="font-semibold text-sm mt-0.5 text-foreground">Super Admin</div>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                      <ShieldCheck className="w-3 h-3" />
                      Plateforme SaaS
                    </div>
                  </div>
                ) : user?.role === 'COMMERCIAL' ? (
                  <div className="p-3 bg-surface border border-border rounded-lg">
                    <div className="text-[10px] text-muted font-semibold uppercase tracking-wider">Rôle global</div>
                    <div className="font-semibold text-sm mt-0.5 text-foreground">Commercial plateforme</div>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                      <Briefcase className="w-3 h-3" />
                      Parrainage
                    </div>
                  </div>
                ) : tenant ? (
                  <div className="p-3 bg-surface border border-border rounded-lg">
                    <div className="text-[10px] text-muted font-semibold uppercase tracking-wider">
                      {isClientAccount ? 'Compte' : 'Organisation'}
                    </div>
                    <div className="font-semibold text-foreground text-sm truncate mt-0.5">
                      {tenant.name}
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                      <ShieldCheck className="w-3 h-3" />
                      {isClientAccount ? 'Client' : `Plan ${tenant.plan}`}
                    </div>
                  </div>
                ) : null}
              </>
            )}

            <Suspense
              fallback={
                <div className="h-20 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              }
            >
              <SidebarNav
                sections={withNavTips(navSections)}
                pathname={pathname}
                setMobileMenuOpen={setMobileMenuOpen}
                collapsed={sidebarCollapsed}
                fallbackTab={user.role === 'SUPER_ADMIN' ? 'overview' : 'tenants'}
              />
            </Suspense>
          </div>

          {/* Profil & déconnexion */}
          <div className={cn('border-t border-border bg-surface shrink-0', sidebarCollapsed ? 'p-2 space-y-1' : 'p-3.5 sm:p-4 space-y-2 pb-[max(1rem,env(safe-area-inset-bottom))]')}>
            <Tooltip
              content={
                <span className="flex flex-col gap-0.5 text-left">
                  <span className="font-semibold">{user.name}</span>
                  <span className="opacity-80 font-normal">Mon compte</span>
                </span>
              }
              side="right"
              disabled={!sidebarCollapsed}
              className="flex w-full"
            >
              <Link
                href="/dashboard/profile"
                data-tour="nav-profile"
                onClick={() => {
                  if (document.body.dataset.emTour === '1') return;
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  'flex w-full items-center rounded-[var(--radius-button)] hover:bg-surface-muted transition group',
                  sidebarCollapsed ? 'justify-center p-2' : 'gap-3 p-2',
                )}
              >
                <UserAvatar name={user.name} src={user.avatarUrl} size="md" />
                {!sidebarCollapsed && (
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-foreground text-sm truncate block group-hover:text-primary transition-colors">
                      {user.name}
                    </span>
                    <span className="text-xs text-muted truncate block">{user.email}</span>
                  </div>
                )}
              </Link>
            </Tooltip>
            <Tooltip content="Se déconnecter" side="right" disabled={!sidebarCollapsed} className="flex w-full">
              <button
                type="button"
                onClick={logout}
                className={cn(
                  'flex w-full items-center rounded-[var(--radius-button)] text-sm font-medium text-rose-500 hover:bg-rose-500/10 transition touch-manipulation',
                  sidebarCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2',
                )}
              >
                <LogOut className="w-4 h-4" />
                {!sidebarCollapsed && 'Déconnexion'}
              </button>
            </Tooltip>
            {sidebarCollapsed && (
              <Tooltip content={theme === 'light' ? 'Passer en sombre' : 'Passer en clair'} side="right" className="flex w-full">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex w-full items-center justify-center p-2 rounded-[var(--radius-button)] border border-border text-muted hover:bg-surface-muted hover:text-foreground transition"
                  aria-label="Changer de thème"
                >
                  {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>
              </Tooltip>
            )}
          </div>
        </aside>

      {/* Contenu principal */}
      <main id="main-content" className="flex-1 min-w-0 overflow-y-auto bg-background flex flex-col em-dashboard-glow-bg">
        <DashboardTopBar
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebarCollapsed}
        />
        <div className="page-container relative z-10 pt-3 sm:pt-6 lg:pt-8 pb-[calc(6.25rem+var(--em-site-install-bar)+env(safe-area-inset-bottom,0px))] md:pb-6 lg:pb-8 flex-1 em-dashboard-content">
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
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
      />
      <PWAInstallCta variant="bar" />

      <div id="em-dashboard-stage" />

      <ViewCustomizerEdgeHandle />
      <ViewCustomizerDrawer />
      <ProductTourOverlay />
    </div>
  </TourProvider>
 </Suspense>
 );
}
