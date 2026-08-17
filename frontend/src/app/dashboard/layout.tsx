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
 PanelLeftClose, PanelLeft, Store, CalendarCheck,
} from 'lucide-react';
import PWARestrictedScreen from '@/components/PWARestrictedScreen';
import UserLegalGate from '@/components/UserLegalGate';
import { NotificationBell } from '@/components/CommercialNotifications';
import DashboardTopBar from '@/components/DashboardTopBar';
import ViewCustomizerDrawer, {
 ViewCustomizerEdgeHandle,
 ViewCustomizerTrigger,
} from '@/components/ViewCustomizer';
import { Tooltip } from '@/components/ui';
import { cn } from '@/lib/cn';
import { TourProvider } from '@/context/TourContext';
import ProductTourOverlay from '@/components/guide/ProductTourOverlay';

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

/** Infobulles par défaut (sidebar réduite). */
const NAV_TOOLTIPS: Record<string, string> = {
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
 'Guide utilisateur': 'Documentation et visite guidée',
 'Mon compte': 'Profil, salles et équipe',
 'Parrainage & commissions': 'Code parrainage et gains',
 'Réseau commercial': 'Organisations que vous parrainez',
 Protocole: 'Scan QR et accueil invités',
 'Tableau de bord': 'Vue d’ensemble et quotas',
 Catalogue: 'Salles et prestataires publics',
 'Mes réservations': 'Demandes de dates envoyées',
 Statistiques: 'RSVP et analyses d’événements',
 Modèles: 'Concepteur d’invitations',
 'Facturation & plan': 'Forfait, quotas et upgrade',
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
}: {
 sections: NavSection[];
 pathname: string;
 setMobileMenuOpen: (open: boolean) => void;
 collapsed: boolean;
}) {
 const searchParams = useSearchParams();
 const currentTab = searchParams.get('tab') || 'tenants';

 return (
 <nav className={cn('space-y-4', collapsed && 'space-y-2.5')} aria-label="Navigation principale">
 {sections.map((section, sectionIdx) => (
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
 const isActive = item.tab
 ? pathname === '/dashboard' && currentTab === item.tab
 : pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

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
 onClick={() => setMobileMenuOpen(false)}
 aria-current={isActive ? 'page' : undefined}
 title={collapsed ? item.name : undefined}
 className={cn(
 'group relative flex w-full items-center rounded-[var(--radius-button)] text-sm font-medium transition-colors duration-150',
 collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2',
 isActive
 ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
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
 <span className="truncate text-[13px] font-medium leading-snug">{item.name}</span>
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
 const { user, tenant, token, loading, logout, access, planFeatures } = useAuth();
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

 useEffect(() => {
 if (loading || !token || !user || !isClientAccount) return;
 const allowed = ['/dashboard/bookings', '/dashboard/profile', '/dashboard/guide'].some(
 (p) => pathname === p || pathname.startsWith(`${p}/`),
 );
 if (pathname.startsWith('/dashboard') && !allowed) {
 router.replace('/dashboard/bookings');
 }
 }, [loading, token, user, isClientAccount, pathname, router]);

 if (loading || !token || !user) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-background">
 <div className="flex flex-col items-center gap-4 animate-fade-in">
 <div className="bg-primary p-3 rounded-xl text-white">
 <PartyPopper className="w-8 h-8" />
 </div>
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
 const isBlocked = !isClientAccount && user.role !== 'SUPER_ADMIN' && user.role !== 'COMMERCIAL' && (isLicenseInactive || isLicenseExpired);

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
 label: 'Contenu & vitrine',
 items: [
 { name: 'Modèles invitation', href: '/dashboard?tab=templates', tab: 'templates', tourId: 'nav-templates', icon: FileText },
 { name: 'Messages automatiques', href: '/dashboard?tab=message-templates', tab: 'message-templates', tourId: 'nav-message-templates', icon: MessageSquare },
 ],
 },
 {
 label: 'Billing & système',
 items: [
 { name: 'Analyses', href: '/dashboard?tab=analytics&section=overview', tab: 'analytics', tourId: 'nav-analytics', icon: BarChart3 },
 { name: 'Demandes abonnement', href: '/dashboard?tab=subscription-requests', tab: 'subscription-requests', tourId: 'nav-subscription-requests', icon: Clock },
 { name: 'Forfaits & tarifs', href: '/dashboard?tab=subscription-plans', tab: 'subscription-plans', tourId: 'nav-subscription-plans', icon: CreditCard },
 { name: 'Factures', href: '/dashboard?tab=invoices', tab: 'invoices', tourId: 'nav-invoices', icon: FileText },
 { name: 'Réglages plateforme', href: '/dashboard?tab=settings', tab: 'settings', tourId: 'nav-settings', icon: Key },
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
 : isClientAccount
 ? [
 {
 items: [
 { name: 'Catalogue', href: '/marketplace', tourId: 'nav-catalogue', icon: Store },
 { name: 'Mes réservations', href: '/dashboard/bookings', tourId: 'nav-bookings', icon: CalendarCheck },
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
 ...(access?.canManageRooms
 ? [{ name: 'Marketplace', href: '/dashboard/marketplace', tourId: 'nav-marketplace', icon: Store }]
 : []),
 ...(access?.canProtocolAllEvents || access?.level === 'staff'
 ? planFeatures?.protocolQr === false
 ? []
 : [{ name: 'Protocole', href: '/dashboard/events?mode=protocol', tourId: 'nav-protocol', icon: ScanLine }]
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
 <Loader2 className="w-6 h-6 text-primary animate-spin" />
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
 <div className="bg-primary p-1.5 rounded-lg text-white">
 <PartyPopper className="w-4 h-4" />
 </div>
 <span className="font-semibold text-base text-foreground">EventMaster</span>
 </div>
 <div className="flex items-center gap-1.5">
 {showCommercialNotifications && <NotificationBell />}
 <ViewCustomizerTrigger />
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
 'fixed top-14 bottom-0 left-0 z-40 max-w-[85vw] bg-sidebar border-r border-border',
 'flex flex-col transform transition-[transform,width] duration-300 ease-out',
 'md:top-0 md:bottom-auto md:inset-y-0 md:translate-x-0 md:sticky md:h-screen md:max-w-none md:z-30',
 mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
 /* Mobile always full width drawer; desktop follows collapse */
 'w-72',
 sidebarCollapsed ? 'md:w-[4.5rem]' : 'md:w-64',
 )}
 >
 <div className={cn('flex-1 overflow-y-auto space-y-5', sidebarCollapsed ? 'p-2 md:p-2' : 'p-4')}>
 {/* Logo desktop */}
 <div className={cn('hidden md:flex items-center', sidebarCollapsed ? 'flex-col gap-2' : 'justify-between')}>
 <div className={cn('flex items-center', sidebarCollapsed ? 'justify-center' : 'gap-2.5')}>
 <div className="bg-primary p-1.5 rounded-[var(--radius-button)] text-white shrink-0">
 <PartyPopper className="w-4 h-4" />
 </div>
 {!sidebarCollapsed && (
 <div>
 <span className="font-semibold text-[15px] text-foreground block leading-none tracking-tight">EventMaster</span>
 <span className="text-[10px] font-medium text-muted mt-1 block">
 {user?.role === 'SUPER_ADMIN'
 ? 'Console plateforme'
 : user?.role === 'COMMERCIAL'
 ? 'Espace commercial'
 : isClientAccount
 ? 'Espace client'
 : 'Workspace'}
 </span>
 </div>
 )}
 </div>
 <div className={cn('flex items-center gap-1', sidebarCollapsed && 'flex-col')}>
 {showCommercialNotifications && !sidebarCollapsed && <NotificationBell />}
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
 {!sidebarCollapsed && (
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
 />
 </Suspense>
 </div>

 {/* Profil & déconnexion */}
 <div className={cn('border-t border-border shrink-0', sidebarCollapsed ? 'p-2 space-y-1' : 'p-4 space-y-2')}>
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
 onClick={() => setMobileMenuOpen(false)}
 className={cn(
 'flex w-full items-center rounded-[var(--radius-button)] hover:bg-surface-muted transition group',
 sidebarCollapsed ? 'justify-center p-2' : 'gap-3 p-2',
 )}
 >
 <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center font-bold text-primary text-xs shrink-0 ring-1 ring-primary/20">
 {user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
 </div>
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
 'flex w-full items-center rounded-[var(--radius-button)] text-sm font-medium text-rose-500 hover:bg-rose-500/10 transition',
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
 <main id="main-content" className="flex-1 min-w-0 overflow-y-auto bg-background flex flex-col">
 <DashboardTopBar showCommercialNotifications={showCommercialNotifications} />
 <div className="page-container py-5 sm:py-6 lg:py-8 flex-1 em-dashboard-content">
 <UserLegalGate>{children}</UserLegalGate>
 </div>
 </main>
 <ViewCustomizerEdgeHandle />
 <ViewCustomizerDrawer />
 <ProductTourOverlay />
 </div>
 </TourProvider>
 </Suspense>
 );
}
