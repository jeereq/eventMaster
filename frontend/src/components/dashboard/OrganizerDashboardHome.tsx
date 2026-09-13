'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Calendar,
  Users,
  Sparkles,
  Search,
  ArrowRight,
  Building2,
  ScanLine,
  Mail,
  Compass,
  FileText,
  Award,
  PlusCircle,
  CalendarDays,
  Ticket,
  Utensils,
  Wallet,
  Zap,
  MapPin,
  ChevronRight,
  Shield,
  Clock,
  Briefcase,
  CheckCircle2,
  Crown,
  Layers,
  ArrowUpRight,
  CreditCard,
  Percent,
  Check,
  Smartphone,
  Sliders,
  Rss,
  TrendingUp,
  Heart,
  AlertTriangle,
  UserCheck,
  LayoutDashboard,
  Loader2,
  CalendarCheck,
  Inbox,
  Store,
  BarChart3,
  HelpCircle,
  Eye,
  Filter,
} from 'lucide-react';
import type { MarketplaceBookingItem, MarketplaceInquiryItem } from '@/lib/marketplace';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Button,
  ViewModeToggle,
  ProjectCard,
  ListRowAction,
  Pagination,
  listStackClass,
  Card,
  type GridColumns,
} from '@/components/ui';
import GettingStartedChecklist from '@/components/GettingStartedChecklist';
import QuotaUsagePanel from '@/components/QuotaUsagePanel';
import type { QuotaSnapshot } from '@/lib/quotaDisplay';
import type { PlanId } from '@/config/landingPricing';
import {
  LANDING_PLANS,
  planPricePeriodSuffix,
  formatFc,
} from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import { canSellOnMarketplace } from '@/lib/planAccess';

export interface OrganizerEventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
}

export type OrganizerDashboardTab =
  | 'overview'
  | 'reservations'
  | 'quotes'
  | 'explore'
  | 'analytics'
  | 'spaces'
  | 'events'
  | 'guests'
  | 'team'
  | 'billing';

const DynamicTeamManagement = dynamic(() => import('@/app/dashboard/TeamManagement'), {
  loading: () => (
    <div className="p-8 text-center text-muted">
      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
      <p className="text-xs">Chargement de la gestion de l’équipe…</p>
    </div>
  ),
});

const DynamicMarketplaceBookingsPanel = dynamic(() => import('@/components/MarketplaceBookingsPanel'), {
  loading: () => (
    <div className="p-8 text-center text-muted">
      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
      <p className="text-xs">Chargement des réservations…</p>
    </div>
  ),
});

const DynamicMarketplaceInquiriesPanel = dynamic(() => import('@/components/MarketplaceInquiriesPanel'), {
  loading: () => (
    <div className="p-8 text-center text-muted">
      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
      <p className="text-xs">Chargement des demandes de devis…</p>
    </div>
  ),
});

interface OrganizerDashboardHomeProps {
  events: OrganizerEventItem[];
  billing: {
    plan: PlanId;
    limits: QuotaSnapshot['limits'] & {
      customTemplates?: boolean;
    };
    usage?: QuotaSnapshot['usage'];
  } | null;
  orgQuota: QuotaSnapshot | null;
  homeEventsMode: 'grid' | 'list';
  setHomeEventsMode: (mode: 'grid' | 'list') => void;
  homeEventsColumns: GridColumns;
  setHomeEventsColumns: (cols: GridColumns) => void;
  homeEventsGridClass: string;
  homeEventsPage: number;
  setHomeEventsPage: (page: number) => void;
  homeEventsPageSize: number;
  setHomeEventsPageSize: (size: number) => void;
}

export default function OrganizerDashboardHome({
  events,
  billing,
  orgQuota,
  homeEventsMode,
  setHomeEventsMode,
  homeEventsColumns,
  setHomeEventsColumns,
  homeEventsGridClass,
  homeEventsPage,
  setHomeEventsPage,
  homeEventsPageSize,
  setHomeEventsPageSize,
}: OrganizerDashboardHomeProps) {
  const { user, tenant, planQuota, access, planFeatures } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');

  const isVendor = tenant?.accountKind === 'VENDOR';
  const isBoth = tenant?.accountKind === 'BOTH';
  const isOwner = Boolean(access?.isOwner) || (Boolean(user?.id) && user?.id === tenant?.managerId);
  const isManager = access?.level === 'manager' && !isOwner;
  const canManageTeam = isOwner || Boolean(access?.canManageTeam);

  const canSell = canSellOnMarketplace({
    accountKind: tenant?.accountKind,
    planFeatures,
    planQuota,
    planId: tenant?.plan,
  });
  const hasOrgEvents = (planQuota?.limits.maxEvents ?? 0) > 0;
  /** Organisation B2B (ou essai) qui vend aussi : ne pas basculer en « prestataire / salle pur ». */
  const isOrgWithCatalog = canSell && hasOrgEvents && !isVendor;

  const isServiceProvider =
    tenant?.plan === 'SERVICE' ||
    planFeatures?.audience === 'SERVICE' ||
    (isVendor && (!access?.canManageRooms || (planQuota?.limits.maxRooms ?? 0) <= 0));

  const isVenueProvider =
    !isServiceProvider &&
    !isOrgWithCatalog &&
    (tenant?.plan === 'VENUE' || planFeatures?.audience === 'VENUE' || (Boolean(access?.canManageRooms) && (planQuota?.limits.maxRooms ?? 0) > 0));

  const isCatalogProvider =
    !isServiceProvider &&
    !isVenueProvider &&
    (tenant?.plan === 'CATALOG' || planFeatures?.audience === 'CATALOG' || isBoth);

  const isB2cPlan = Boolean(
    tenant?.plan?.startsWith('PERSONAL') ||
      planFeatures?.audience === 'B2C'
  );
  const isB2bPaidPlan = Boolean(
    planFeatures?.audience === 'B2B' &&
      tenant?.plan &&
      tenant.plan !== 'FREE',
  );
  const showB2cUpsellCard = !isB2bPaidPlan && (tenant?.plan === 'FREE' || isB2cPlan || tenant?.accountKind === 'BOTH');
  const showB2bUpsellCards = !isB2cPlan;

  const isVenueOrVendorOrCatalog =
    isServiceProvider ||
    isVenueProvider ||
    isCatalogProvider ||
    isOrgWithCatalog ||
    isVendor ||
    isBoth ||
    canSell ||
    tenant?.plan === 'VENUE' ||
    tenant?.plan === 'SERVICE' ||
    tenant?.plan === 'CATALOG' ||
    planFeatures?.audience === 'VENUE' ||
    planFeatures?.audience === 'SERVICE' ||
    planFeatures?.audience === 'CATALOG' ||
    Boolean(access?.canManageRooms);

  const normalizeDashboardTab = (raw: string | null): OrganizerDashboardTab => {
    if (!raw) return 'overview';
    const val = raw.toLowerCase();
    if (val === 'reservations' || val === 'bookings') return 'reservations';
    if (val === 'quotes' || val === 'devis' || val === 'inquiries') return 'quotes';
    if (val === 'explore' || val === 'catalogue' || val === 'marketplace') return 'explore';
    if (val === 'analytics' || val === 'analyses' || val === 'stats' || val === 'statistiques') return 'analytics';
    if (val === 'spaces' || val === 'salles' || val === 'rooms' || val === 'prestations' || val === 'offres') return 'spaces';
    if (val === 'events' || val === 'evenements') return 'events';
    if (val === 'guests' || val === 'invites') return 'guests';
    if (val === 'team' || val === 'equipe') return 'team';
    if (val === 'billing' || val === 'abonnement' || val === 'quotas') return 'billing';
    return 'overview';
  };

  // Onglet actif initialisé depuis l'URL ou par défaut 'overview'
  const [activeTab, setActiveTab] = useState<OrganizerDashboardTab>(() => {
    return normalizeDashboardTab(searchParams.get('tab'));
  });

  // Synchronisation avec les changements d'historique (boutons précédent/suivant)
  useEffect(() => {
    const raw = searchParams.get('tab');
    setActiveTab(normalizeDashboardTab(raw));
  }, [searchParams]);

  const handleTabChange = (tabId: OrganizerDashboardTab) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      const currentSearchParams = searchParams ? new URLSearchParams(searchParams.toString()) : new URLSearchParams();
      if (tabId === 'overview') {
        currentSearchParams.delete('tab');
      } else {
        currentSearchParams.set('tab', tabId);
      }
      const qs = currentSearchParams.toString();
      const targetUrl = qs ? `/dashboard?${qs}` : '/dashboard';
      router.replace(targetUrl, { scroll: false });
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // ÉTAT ET CHARGEMENT DU HUB COMMERCE / RÉSERVATIONS / DEVIS
  // ══════════════════════════════════════════════════════════════════════════
  const [inquiries, setInquiries] = useState<MarketplaceInquiryItem[]>([]);
  const [bookings, setBookings] = useState<MarketplaceBookingItem[]>([]);
  const [commissionDueFc, setCommissionDueFc] = useState(0);
  const [vendorHubLoading, setVendorHubLoading] = useState(false);
  const [vendorRolePerspective, setVendorRolePerspective] = useState<'vendor' | 'organizer'>(
    isVenueOrVendorOrCatalog ? 'vendor' : 'organizer'
  );

  const loadVendorHubData = useCallback(async (perspectiveRole: 'vendor' | 'organizer') => {
    if (!tenant?.id) return;
    setVendorHubLoading(true);
    try {
      const [bData, iData] = await Promise.all([
        api.get(`/marketplace/bookings?role=${perspectiveRole}`).catch(() => ({ bookings: [], commissionDueFc: 0 })),
        api.get(`/marketplace/inquiries?role=${perspectiveRole}`).catch(() => ({ inquiries: [] })),
      ]);
      setBookings(Array.isArray(bData?.bookings) ? bData.bookings : []);
      setCommissionDueFc(Number(bData?.commissionDueFc) || 0);
      setInquiries(Array.isArray(iData?.inquiries) ? iData.inquiries : []);
    } catch {
      // Tolérance aux erreurs réseau
    } finally {
      setVendorHubLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => {
    if (tenant?.id) {
      loadVendorHubData(vendorRolePerspective);
    }
  }, [tenant?.id, vendorRolePerspective, loadVendorHubData]);

  const pendingQuotesCount = useMemo(
    () => inquiries.filter((i) => i.status === 'NEW' || i.status === 'CONTACTED').length,
    [inquiries]
  );
  const acceptedQuotesCount = useMemo(
    () => inquiries.filter((i) => i.status === 'QUOTED' || Boolean(i.hasBooking)).length,
    [inquiries]
  );
  const confirmedBookingsCount = useMemo(
    () => bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED').length,
    [bookings]
  );
  const pendingBookingsCount = useMemo(
    () => bookings.filter((b) => b.status === 'REQUESTED' || b.status === 'ACCEPTED').length,
    [bookings]
  );
  const totalBookingsVolumeFc = useMemo(
    () => bookings.reduce((sum, b) => sum + (Number(b.amountFc) || 0), 0),
    [bookings]
  );

  const [ticketingSummary, setTicketingSummary] = useState<{
    totalRevenueFc: number;
    ticketsRevenueFc?: number;
    donationsRevenueFc?: number;
    paidTicketsCount: number;
    donationsCount?: number;
    pendingRevenueFc?: number;
    pendingTicketsCount?: number;
    paidOrdersCount: number;
    pendingOrdersCount: number;
    totalOrdersCount: number;
    checkedInGuestsCount: number;
  } | null>(null);

  useEffect(() => {
    if (isOwner || access?.canViewBilling) {
      let isMounted = true;
      api
        .get('/events/ticketing/summary')
        .then((res) => {
          if (isMounted && res?.summary) {
            setTicketingSummary(res.summary);
          }
        })
        .catch(() => {
          // Si l'organisation n'a pas encore de commandes
        });
      return () => {
        isMounted = false;
      };
    }
  }, [isOwner, access?.canViewBilling]);

  const licenseExpiresAt = tenant?.licenseExpiresAt;
  const daysUntilExpiry = licenseExpiresAt
    ? Math.ceil((new Date(licenseExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const usage = planQuota?.usage || billing?.usage;
  const limits = planQuota?.limits || billing?.limits;

  const currentPlanMeta = useMemo(() => {
    const rawPlan = tenant?.plan || billing?.plan;
    return LANDING_PLANS.find((p) => p.id === rawPlan);
  }, [tenant?.plan, billing?.plan]);

  const currentPlanDisplayName = currentPlanMeta?.ms365Name || tenant?.plan || billing?.plan || 'Forfait';

  const formatQuota = (used: number | undefined, max: number | undefined) => {
    if (used == null) return '0';
    if (max == null || max < 0) return String(used);
    return `${used} / ${max}`;
  };

  const greetingHour = new Date().getHours();
  const greetingLabel =
    greetingHour < 12 ? 'Bonjour' : greetingHour < 18 ? 'Bon après-midi' : 'Bonsoir';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/dashboard/events?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  // Pagination des événements récents
  const startIdx = (homeEventsPage - 1) * homeEventsPageSize;
  const paginatedEvents = events.slice(startIdx, startIdx + homeEventsPageSize);

  // Définition des onglets ergonomiques du tableau de bord
  const tabs = useMemo(() => {
    // ════════════════════════════════════════════════════════════════════════
    // 1. PROFIL PRESTATAIRE DE SERVICES : Priorité aux prestations, devis & planning
    // ════════════════════════════════════════════════════════════════════════
    if (isServiceProvider) {
      return [
        {
          id: 'overview' as const,
          label: 'Vue d’ensemble',
          shortLabel: 'Synthèse',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: 'spaces' as const,
          label: 'Prestations & Offres',
          shortLabel: 'Prestations',
          icon: Briefcase,
          badge: usage?.services != null ? String(usage.services) : null,
        },
        {
          id: 'quotes' as const,
          label: 'Demandes de devis',
          shortLabel: 'Devis',
          icon: Inbox,
          badge: pendingQuotesCount > 0 ? String(pendingQuotesCount) : (inquiries.length > 0 ? String(inquiries.length) : null),
        },
        {
          id: 'reservations' as const,
          label: 'Réservations & Planning',
          shortLabel: 'Planning',
          icon: CalendarCheck,
          badge: bookings.length > 0 ? String(bookings.length) : null,
        },
        {
          id: 'analytics' as const,
          label: 'Analyses & Revenus',
          shortLabel: 'Analyses',
          icon: BarChart3,
          badge: null,
        },
        {
          id: 'explore' as const,
          label: 'Explorer le catalogue',
          shortLabel: 'Explorer',
          icon: Store,
          badge: null,
        },
        ...((limits?.maxEvents ?? 0) > 0 || events.length > 0
          ? [
              {
                id: 'events' as const,
                label: 'Événements & Billetterie',
                shortLabel: 'Événements',
                icon: Calendar,
                badge: events.length > 0 ? String(events.length) : null,
              },
              {
                id: 'guests' as const,
                label: 'Invités & Protocole',
                shortLabel: 'Invités',
                icon: Users,
                badge: usage?.guests != null ? String(usage.guests) : null,
              },
            ]
          : []),
        ...(canManageTeam
          ? [
              {
                id: 'team' as const,
                label: 'Équipe & Staff',
                shortLabel: 'Équipe',
                icon: UserCheck,
                badge: null,
              },
            ]
          : []),
        {
          id: 'billing' as const,
          label: isManager ? 'Organisation & Quotas' : 'Abonnement Prestataire',
          shortLabel: isManager ? 'Quotas' : 'Abonnement',
          icon: isManager ? Shield : Crown,
          badge: currentPlanDisplayName,
        },
      ];
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. PROFIL GESTIONNAIRE DE SALLES OU CATALOGUE MIXTE
    // ════════════════════════════════════════════════════════════════════════
    if (isVenueOrVendorOrCatalog) {
      return [
        {
          id: 'overview' as const,
          label: 'Vue d’ensemble',
          shortLabel: 'Synthèse',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: 'spaces' as const,
          label: isVenueProvider ? 'Salles & Plans 3D' : 'Espaces & Prestations',
          shortLabel: isVenueProvider ? 'Salles & 3D' : 'Espaces',
          icon: isVenueProvider ? Building2 : Store,
          badge: usage?.rooms != null ? String(usage.rooms) : null,
        },
        {
          id: 'reservations' as const,
          label: 'Réservations & Planning',
          shortLabel: 'Réservations',
          icon: CalendarCheck,
          badge: bookings.length > 0 ? String(bookings.length) : null,
        },
        {
          id: 'quotes' as const,
          label: 'Demandes de devis',
          shortLabel: 'Devis',
          icon: Inbox,
          badge: pendingQuotesCount > 0 ? String(pendingQuotesCount) : (inquiries.length > 0 ? String(inquiries.length) : null),
        },
        {
          id: 'analytics' as const,
          label: 'Analyses & Performance',
          shortLabel: 'Analyses',
          icon: BarChart3,
          badge: null,
        },
        {
          id: 'explore' as const,
          label: 'Explorer le catalogue',
          shortLabel: 'Explorer',
          icon: Store,
          badge: null,
        },
        ...((limits?.maxEvents ?? 0) > 0 || events.length > 0
          ? [
              {
                id: 'events' as const,
                label: 'Événements & Billetterie',
                shortLabel: 'Événements',
                icon: Calendar,
                badge: events.length > 0 ? String(events.length) : null,
              },
              {
                id: 'guests' as const,
                label: 'Invités & Protocole',
                shortLabel: 'Invités',
                icon: Users,
                badge: usage?.guests != null ? String(usage.guests) : null,
              },
            ]
          : []),
        ...(canManageTeam
          ? [
              {
                id: 'team' as const,
                label: 'Équipe & Rôles',
                shortLabel: 'Équipe',
                icon: UserCheck,
                badge: null,
              },
            ]
          : []),
        {
          id: 'billing' as const,
          label: isManager ? 'Organisation & Quotas' : 'Abonnement & Quotas',
          shortLabel: isManager ? 'Quotas' : 'Abonnement',
          icon: isManager ? Shield : Crown,
          badge: currentPlanDisplayName,
        },
      ];
    }

    return [
      {
        id: 'overview' as const,
        label: 'Vue d’ensemble',
        shortLabel: 'Synthèse',
        icon: LayoutDashboard,
        badge: null,
      },
      {
        id: 'events' as const,
        label: 'Événements & Billetterie',
        shortLabel: 'Événements',
        icon: Calendar,
        badge: events.length > 0 ? String(events.length) : null,
      },
      {
        id: 'guests' as const,
        label: 'Invités & Protocole',
        shortLabel: 'Invités',
        icon: Users,
        badge: usage?.guests != null ? String(usage.guests) : null,
      },
      {
        id: 'reservations' as const,
        label: 'Mes réservations',
        shortLabel: 'Réservations',
        icon: CalendarCheck,
        badge: bookings.length > 0 ? String(bookings.length) : null,
      },
      {
        id: 'quotes' as const,
        label: 'Mes devis',
        shortLabel: 'Devis',
        icon: Inbox,
        badge: inquiries.length > 0 ? String(inquiries.length) : null,
      },
      {
        id: 'explore' as const,
        label: 'Explorer le catalogue',
        shortLabel: 'Explorer',
        icon: Store,
        badge: null,
      },
      {
        id: 'analytics' as const,
        label: 'Analyses & Statistiques',
        shortLabel: 'Analyses',
        icon: BarChart3,
        badge: null,
      },
      {
        id: 'spaces' as const,
        label: 'Salles & Marketplace',
        shortLabel: 'Salles & 3D',
        icon: Building2,
        badge: null,
      },
      ...(canManageTeam
        ? [
            {
              id: 'team' as const,
              label: 'Équipe & Rôles',
              shortLabel: 'Équipe',
              icon: UserCheck,
              badge: null,
            },
          ]
        : []),
      {
        id: 'billing' as const,
        label: isManager ? 'Organisation & Quotas' : 'Abonnement & Quotas',
        shortLabel: isManager ? 'Quotas' : 'Abonnement',
        icon: isManager ? Shield : Crown,
        badge: currentPlanDisplayName,
      },
    ];
  }, [
    isServiceProvider,
    isVenueProvider,
    isVenueOrVendorOrCatalog,
    bookings.length,
    pendingQuotesCount,
    inquiries.length,
    isVendor,
    limits?.maxEvents,
    events.length,
    usage?.services,
    usage?.rooms,
    usage?.guests,
    canManageTeam,
    isManager,
    currentPlanDisplayName,
  ]);

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const currentIndex = tabs.findIndex((t) => t.id === activeTab);
    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    }
    const nextTab = tabs[nextIndex].id;
    handleTabChange(nextTab);
    window.requestAnimationFrame(() => {
      document.getElementById(`org-tab-${nextTab}`)?.focus();
    });
  };

  return (
    <div className="space-y-8 pb-16 animate-fade-in em-dashboard-home">
      {/* ══════════════════════════════════════════════════════════════════════════
          HERO BANNER & ALERTE DE LICENCE (TOUJOURS ACCESSIBLES EN EN-TÊTE)
      ══════════════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        {/* Alerte proactive d'échéance de licence pour le Propriétaire */}
        {isOwner && daysUntilExpiry != null && daysUntilExpiry <= 15 && (
          <div
            className={cn(
              'p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm transition',
              daysUntilExpiry <= 0
                ? 'bg-danger/10 border-danger/30 text-danger'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'p-2 rounded-xl shrink-0',
                  daysUntilExpiry <= 0 ? 'bg-danger/20 text-danger' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                )}
              >
                {daysUntilExpiry <= 0 ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-bold">
                  {daysUntilExpiry <= 0
                    ? 'Abonnement expiré'
                    : `Expiration dans ${daysUntilExpiry} jour${daysUntilExpiry > 1 ? 's' : ''}`}
                </p>
                <p className="text-xs opacity-90 mt-0.5">
                  {daysUntilExpiry <= 0
                    ? 'Renouvelez votre formule pour réactiver vos services et quotas.'
                    : 'Renouvelez pour maintenir les invitations WhatsApp et le contrôle d’accès.'}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary-solid text-primary-foreground hover:bg-primary-solid-hover transition shrink-0"
            >
              <span>Renouveler</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Bannière Hero avec recherche intégrée et raccourcis en 1 clic */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-surface to-surface-muted p-5 sm:p-7 shadow-xs">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative space-y-4 max-w-3xl">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/15 text-primary border border-primary/25">
                  <Sparkles className="w-3.5 h-3.5" />
                  {isManager
                    ? 'Espace Manager'
                    : isServiceProvider
                    ? 'Espace Prestataire de Services'
                    : isOrgWithCatalog
                    ? 'Espace Organisation & Vitrine'
                    : isVenueProvider
                    ? 'Espace Gestionnaire de Salle'
                    : isCatalogProvider
                    ? 'Espace Vitrine & Catalogue'
                    : isVendor
                    ? 'Espace Prestataire / Salles'
                    : isBoth
                    ? 'Espace Organisation & Vitrine'
                    : isOwner
                    ? 'Espace Propriétaire'
                    : 'Espace Organisateur'}
                </span>
                {tenant?.name && (
                  <span className="text-xs font-semibold text-muted">
                    · {tenant.name}
                  </span>
                )}
                {tenant?.plan && (
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-surface border border-border text-foreground">
                    Forfait {currentPlanDisplayName}
                  </span>
                )}
                {isOwner && daysUntilExpiry != null && (
                  <span
                    className={cn(
                      'text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border',
                      daysUntilExpiry <= 0
                        ? 'bg-danger/10 border-danger/30 text-danger'
                        : daysUntilExpiry <= 15
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    )}
                  >
                    {daysUntilExpiry <= 0 ? 'Expiré' : `Licence · ${daysUntilExpiry}j restants`}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
                {greetingLabel}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
              </h1>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                {isServiceProvider
                  ? 'Gérez vos prestations, répondez aux demandes de devis des organisateurs et suivez votre planning d’interventions.'
                  : isOrgWithCatalog
                  ? 'Organisez vos événements et publiez votre vitrine (salles et prestations) sur le marketplace.'
                  : isVenueProvider
                  ? 'Modélisez vos salles en 2D/3D, gérez vos dates de privatisation et traitez vos demandes de réservation.'
                  : isOwner
                  ? 'Pilotage stratégique et financier de votre organisation, événements et équipe.'
                  : isManager
                  ? 'Gestion opérationnelle quotidienne de vos événements, équipe et devis.'
                  : isVendor
                  ? 'Gestion de vos prestations, fiches marketplace et réponses aux devis.'
                  : 'Créez vos événements, invitations WhatsApp et plans de table 2D/3D.'}
              </p>
            </div>

            {/* Barre de recherche universelle */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="relative flex items-center">
                <Search className="w-5 h-5 text-muted absolute left-4 pointer-events-none" />
                <label htmlFor="org-home-search" className="sr-only">Rechercher</label>
                <input
                  id="org-home-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un événement, un invité, une salle…"
                  className="w-full min-h-11 pl-11 pr-32 py-3 rounded-xl border border-border bg-surface text-sm text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent shadow-xs transition"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 min-h-9 px-3.5 py-1.5 rounded-lg bg-primary-solid text-primary-foreground text-xs font-bold hover:bg-primary-solid-hover transition flex items-center gap-1.5 touch-manipulation cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary-solid"
                >
                  <span>Rechercher</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {/* Raccourcis directs en 1 clic */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
              <span className="text-xs font-medium text-muted mr-1">Raccourcis :</span>
              {isServiceProvider ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleTabChange('spaces')}
                    className="min-h-9 px-3 py-1.5 rounded-lg bg-primary-solid text-primary-foreground hover:bg-primary-solid-hover text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    Mes prestations
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('quotes')}
                    className="min-h-9 px-3 py-1.5 rounded-lg bg-surface/80 border border-border hover:border-amber-500/40 text-xs font-medium text-foreground transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Inbox className="w-3.5 h-3.5 text-amber-500" />
                    Devis reçus
                    {pendingQuotesCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-amber-500 text-white font-bold">
                        {pendingQuotesCount}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('reservations')}
                    className="min-h-9 px-3 py-1.5 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-xs font-medium text-foreground transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <CalendarCheck className="w-3.5 h-3.5 text-primary" />
                    Planning réservations
                    {bookings.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-primary text-primary-foreground font-bold">
                        {bookings.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('analytics')}
                    className="min-h-9 px-3 py-1.5 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-xs font-medium text-foreground transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
                    Analyses & CA
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('explore')}
                    className="min-h-9 px-3 py-1.5 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-xs font-medium text-foreground transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Store className="w-3.5 h-3.5 text-primary" />
                    Explorer catalogue
                  </button>
                  <Link
                    href="/dashboard/marketplace?new=1"
                    className="min-h-9 px-3 py-1.5 rounded-lg bg-surface-muted hover:bg-primary/10 hover:text-primary border border-border text-xs font-medium text-muted transition inline-flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-primary" />
                    + Nouvelle offre
                  </Link>
                </>
              ) : isVenueOrVendorOrCatalog ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleTabChange('spaces')}
                    className="min-h-9 px-3 py-1.5 rounded-lg bg-primary-solid text-primary-foreground hover:bg-primary-solid-hover text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Mes salles
                  </button>
                  {canSell ? (
                    <Link
                      href="/dashboard/marketplace"
                      className="min-h-9 px-3 py-1.5 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-xs font-medium text-foreground transition inline-flex items-center gap-1"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-primary" />
                      Mes offres
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleTabChange('reservations')}
                    className="min-h-9 px-3 py-1.5 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-xs font-medium text-foreground transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <CalendarCheck className="w-3.5 h-3.5 text-primary" />
                    Réservations
                    {bookings.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-primary text-primary-foreground font-bold">
                        {bookings.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('quotes')}
                    className="min-h-9 px-3 py-1.5 rounded-lg bg-surface/80 border border-border hover:border-amber-500/40 text-xs font-medium text-foreground transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Inbox className="w-3.5 h-3.5 text-amber-500" />
                    Devis reçus
                    {pendingQuotesCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-amber-500 text-white font-bold">
                        {pendingQuotesCount}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('explore')}
                    className="min-h-9 px-3 py-1.5 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-xs font-medium text-foreground transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Store className="w-3.5 h-3.5 text-primary" />
                    Explorer catalogue
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('analytics')}
                    className="min-h-9 px-3 py-1.5 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-xs font-medium text-foreground transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
                    Analyses
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard/events"
                    className="min-h-9 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:border-primary text-xs font-bold text-primary transition inline-flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Créer un événement
                  </Link>
                  <Link
                    href="/dashboard/tickets"
                    className="min-h-9 px-3 py-1.5 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-xs font-medium text-foreground transition inline-flex items-center gap-1"
                  >
                    <Ticket className="w-3.5 h-3.5 text-primary" />
                    Billetterie
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleTabChange('reservations')}
                    className="min-h-9 px-3 py-1.5 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-xs font-medium text-foreground transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <CalendarCheck className="w-3.5 h-3.5 text-primary" />
                    Réservations
                  </button>
                </>
              )}
              {isOwner ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleTabChange('team')}
                    className="min-h-9 px-3 py-1.5 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-xs font-medium text-foreground transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-primary" />
                    Équipe
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('billing')}
                    className="min-h-9 px-3 py-1.5 rounded-lg bg-surface/80 border border-border hover:border-primary/40 text-xs font-medium text-foreground transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    Abonnement
                  </button>
                </>
              ) : null}
              <Link
                href="/dashboard/catalogue?tab=plan&planView=ai"
                className="min-h-9 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:border-primary text-xs font-bold text-primary transition inline-flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Simulateur IA
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════════
          BARRE D'ONGLETS ERGONOMIQUE DU TABLEAU DE BORD (TABS)
      ══════════════════════════════════════════════════════════════════════════ */}
      <nav aria-label="Navigation des sections du tableau de bord" className="space-y-1">
        <div
          role="tablist"
          aria-label="Sections du tableau de bord"
          onKeyDown={handleTabKeyDown}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar rounded-2xl border border-border bg-surface/90 p-1.5 shadow-2xs"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                id={`org-tab-${tab.id}`}
                role="tab"
                type="button"
                aria-selected={active}
                aria-controls={`org-panel-${tab.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition whitespace-nowrap shrink-0 cursor-pointer',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  active
                    ? 'bg-primary-solid text-primary-foreground shadow-xs'
                    : 'text-muted hover:bg-surface-muted hover:text-foreground',
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
                {tab.badge && (
                  <span
                    className={cn(
                      'ml-1 px-2 py-0.5 rounded-full text-xs font-bold',
                      active
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-surface-muted text-muted border border-border',
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════════
          ONGLET 1 : 🚀 VUE D'ENSEMBLE (SYNTHÈSE & KPIs EXÉCUTIFS)
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div
          role="tabpanel"
          id="org-panel-overview"
          aria-labelledby="org-tab-overview"
          tabIndex={0}
          className="space-y-6 focus-visible:outline-none animate-in fade-in-50 duration-150"
        >
          {/* Checklist de démarrage */}
          {user?.role === 'USER' && (
            <GettingStartedChecklist
              hasEvents={events.length > 0}
              hasGuests={(planQuota?.usage.guests ?? 0) > 0}
              firstEventId={events[0]?.id}
              variant={isVendor || (planQuota != null && (planQuota.limits.maxEvents ?? 0) <= 0) ? 'vendor' : 'organizer'}
              hasRooms={(planQuota?.usage.rooms ?? 0) > 0}
              hasServices={(planQuota?.usage.services ?? 0) > 0}
              preferServices={(planQuota?.limits.maxRooms ?? 1) <= 0}
              canSell={canSell && !isVendor}
            />
          )}

          {/* Indicateurs clés en temps réel (5 Cartes KPI adaptatives) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {isServiceProvider ? (
              <>
                {/* Carte 1 (Prestataire) : Mes Prestations */}
                <button
                  type="button"
                  onClick={() => handleTabChange('spaces')}
                  className="p-4 rounded-2xl border border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/10 transition group flex flex-col justify-between h-full text-left cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">Prestations</span>
                    <div className="p-2 rounded-xl bg-primary/15 text-primary group-hover:scale-110 transition">
                      <Briefcase className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-black text-foreground tracking-tight">
                      {formatQuota(usage?.services, limits?.maxServices)}
                    </p>
                    <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                      <span>Offres au catalogue</span>
                      <span className="text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition">&rarr; Gérer</span>
                    </p>
                  </div>
                </button>

                {/* Carte 2 (Prestataire) : Demandes de devis */}
                <button
                  type="button"
                  onClick={() => handleTabChange('quotes')}
                  className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-amber-500/40 hover:bg-amber-500/5 transition group flex flex-col justify-between h-full text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">Devis Reçus</span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition">
                      <Inbox className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-black text-foreground tracking-tight">
                      {inquiries.length}
                    </p>
                    <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                      <span>{pendingQuotesCount > 0 ? `${pendingQuotesCount} en attente` : 'Chiffrages'}</span>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold opacity-0 group-hover:opacity-100 transition">&rarr; Répondre</span>
                    </p>
                  </div>
                </button>

                {/* Carte 3 (Prestataire) : Réservations confirmées */}
                <button
                  type="button"
                  onClick={() => handleTabChange('reservations')}
                  className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-primary/50 hover:bg-primary/5 transition group flex flex-col justify-between h-full text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">Réservations</span>
                    <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition">
                      <CalendarCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-black text-foreground tracking-tight">
                      {bookings.length}
                    </p>
                    <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                      <span>{confirmedBookingsCount} confirmée{confirmedBookingsCount > 1 ? 's' : ''}</span>
                      <span className="text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition">&rarr; Planning</span>
                    </p>
                  </div>
                </button>

                {/* Carte 4 (Prestataire) : Volume financier / CA */}
                <button
                  type="button"
                  onClick={() => handleTabChange('analytics')}
                  className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition group flex flex-col justify-between h-full text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">Volume d'affaires</span>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition">
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight truncate">
                      {totalBookingsVolumeFc > 0 ? formatFc(totalBookingsVolumeFc) : (ticketingSummary?.totalRevenueFc ? formatFc(ticketingSummary.totalRevenueFc) : '0 FC')}
                    </p>
                    <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                      <span>{bookings.length > 0 ? `${bookings.length} résa validées` : 'Revenus & Devis'}</span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold opacity-0 group-hover:opacity-100 transition">&rarr; Analyse</span>
                    </p>
                  </div>
                </button>

                {/* Carte 5 (Prestataire) : Équipe ou Forfait Prestataire */}
                {canManageTeam ? (
                  <button
                    type="button"
                    onClick={() => handleTabChange('team')}
                    className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-blue-500/40 hover:bg-blue-500/5 transition group flex flex-col justify-between h-full text-left cursor-pointer col-span-2 md:col-span-1"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-muted uppercase tracking-wider">Équipe</span>
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition">
                        <UserCheck className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-black text-foreground tracking-tight">
                        {usage ? formatQuota(usage.orgManagers, limits?.maxOrgManagers) : '—'}
                      </p>
                      <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                        <span>Staff & Rôles</span>
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition">&rarr; Gérer</span>
                      </p>
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleTabChange('billing')}
                    className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-primary/50 hover:bg-primary/5 transition group flex flex-col justify-between h-full col-span-2 md:col-span-1 text-left cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-muted uppercase tracking-wider">Forfait</span>
                      <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition">
                        <Award className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-xl font-black text-foreground tracking-tight truncate">
                        {currentPlanDisplayName}
                      </p>
                      <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                        <span>Vitrine active</span>
                        <span className="text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition">&rarr; Gérer</span>
                      </p>
                    </div>
                  </button>
                )}
              </>
            ) : isVenueOrVendorOrCatalog ? (
              <>
                {/* Carte 1 (Venue/Vendor) : Réservations */}
                <button
                  type="button"
                  onClick={() => handleTabChange('reservations')}
                  className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-primary/50 hover:bg-primary/5 transition group flex flex-col justify-between h-full text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">Réservations</span>
                    <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition">
                      <CalendarCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-black text-foreground tracking-tight">
                      {bookings.length}
                    </p>
                    <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                      <span>{confirmedBookingsCount} confirmée{confirmedBookingsCount > 1 ? 's' : ''}</span>
                      <span className="text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition">&rarr; Gérer</span>
                    </p>
                  </div>
                </button>

                {/* Carte 2 (Venue/Vendor) : Demandes de devis */}
                <button
                  type="button"
                  onClick={() => handleTabChange('quotes')}
                  className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-amber-500/40 hover:bg-amber-500/5 transition group flex flex-col justify-between h-full text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">Devis Reçus</span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition">
                      <Inbox className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-black text-foreground tracking-tight">
                      {inquiries.length}
                    </p>
                    <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                      <span>{pendingQuotesCount > 0 ? `${pendingQuotesCount} en attente` : 'Chiffrages'}</span>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold opacity-0 group-hover:opacity-100 transition">&rarr; Répondre</span>
                    </p>
                  </div>
                </button>

                {/* Carte 3 (Venue/Vendor) : Salles ou Prestations */}
                <button
                  type="button"
                  onClick={() => handleTabChange('spaces')}
                  className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-purple-500/40 hover:bg-purple-500/5 transition group flex flex-col justify-between h-full text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">
                      {isVendor ? 'Prestations' : 'Salles & Plans'}
                    </span>
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition">
                      {isVendor ? <Briefcase className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-black text-foreground tracking-tight">
                      {isVendor ? formatQuota(usage?.services, limits?.maxServices) : formatQuota(usage?.rooms, limits?.maxRooms)}
                    </p>
                    <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                      <span>{isVendor ? 'Offres actives' : 'Modélisées 2D/3D'}</span>
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold opacity-0 group-hover:opacity-100 transition">&rarr; Configurer</span>
                    </p>
                  </div>
                </button>

                {/* Carte 4 (Venue/Vendor) : Volume financier / Revenus */}
                <button
                  type="button"
                  onClick={() => handleTabChange('analytics')}
                  className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition group flex flex-col justify-between h-full text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">Volume d'affaires</span>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition">
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight truncate">
                      {totalBookingsVolumeFc > 0 ? formatFc(totalBookingsVolumeFc) : (ticketingSummary?.totalRevenueFc ? formatFc(ticketingSummary.totalRevenueFc) : '0 FC')}
                    </p>
                    <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                      <span>{bookings.length > 0 ? `${bookings.length} résa validées` : 'Revenus & Devis'}</span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold opacity-0 group-hover:opacity-100 transition">&rarr; Analyse</span>
                    </p>
                  </div>
                </button>

                {/* Carte 5 (Venue/Vendor) : Équipe ou Forfait */}
                {canManageTeam ? (
                  <button
                    type="button"
                    onClick={() => handleTabChange('team')}
                    className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-blue-500/40 hover:bg-blue-500/5 transition group flex flex-col justify-between h-full text-left cursor-pointer col-span-2 md:col-span-1"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-muted uppercase tracking-wider">Équipe</span>
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition">
                        <UserCheck className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-black text-foreground tracking-tight">
                        {usage ? formatQuota(usage.orgManagers, limits?.maxOrgManagers) : '—'}
                      </p>
                      <p className="text-xs text-muted mt-0.5">Membres actifs</p>
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleTabChange('billing')}
                    className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-primary/50 hover:bg-primary/5 transition group flex flex-col justify-between h-full col-span-2 md:col-span-1 text-left cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-muted uppercase tracking-wider">Mon Forfait</span>
                      <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition">
                        <Award className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-xl font-black text-foreground tracking-tight truncate">
                        {currentPlanDisplayName}
                      </p>
                      <p className="text-xs text-muted mt-0.5">Quotas & Validité</p>
                    </div>
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleTabChange('events')}
                  className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-primary/50 hover:bg-primary/5 transition group flex flex-col justify-between h-full text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">Événements</span>
                    <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-black text-foreground tracking-tight">
                      {usage ? formatQuota(usage.events, limits?.maxEvents) : events.length}
                    </p>
                    <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                      <span>Total créés</span>
                      <span className="text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 transition">&rarr; Gérer</span>
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange('guests')}
                  className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-amber-500/40 hover:bg-amber-500/5 transition group flex flex-col justify-between h-full text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">Invités</span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-black text-foreground tracking-tight">
                      {usage ? formatQuota(usage.guests, limits?.maxGuests) : '—'}
                    </p>
                    <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                      <span>Enregistrés</span>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold opacity-0 group-hover:opacity-100 transition">&rarr; Suivi</span>
                    </p>
                  </div>
                </button>

                {isOwner ? (
                  <Link
                    href="/dashboard/team"
                    className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-blue-500/40 hover:bg-blue-500/5 transition group flex flex-col justify-between h-full"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-muted uppercase tracking-wider">Équipe</span>
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition">
                        <UserCheck className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-black text-foreground tracking-tight">
                        {usage ? formatQuota(usage.orgManagers, limits?.maxOrgManagers) : '—'}
                      </p>
                      <p className="text-xs text-muted mt-0.5">Membres actifs</p>
                    </div>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleTabChange('spaces')}
                    className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-purple-500/40 hover:bg-purple-500/5 transition group flex flex-col justify-between h-full text-left cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-muted uppercase tracking-wider">
                        {isVendor ? 'Prestations' : 'Salles & Plans'}
                      </span>
                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition">
                        {isVendor ? <Briefcase className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-black text-foreground tracking-tight">
                        {usage ? formatQuota(usage.rooms, limits?.maxRooms) : '—'}
                      </p>
                      <p className="text-xs text-muted mt-0.5">Modélisées 2D/3D</p>
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleTabChange('spaces')}
                  className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition group flex flex-col justify-between h-full text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">Devis & Packs</span>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition">
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-black text-foreground tracking-tight flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                      Actifs
                    </p>
                    <p className="text-xs text-muted mt-0.5">En cours</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange('billing')}
                  className="p-4 rounded-2xl border border-border/80 bg-surface/90 hover:border-primary/50 hover:bg-primary/5 transition group flex flex-col justify-between h-full col-span-2 md:col-span-1 text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">
                      {isManager ? 'Factures' : 'Mon Forfait'}
                    </span>
                    <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition">
                      {isManager ? <FileText className="w-4 h-4" /> : <Award className="w-4 h-4" />}
                    </div>
                  </div>
                    <div className="mt-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xl font-black text-foreground tracking-tight truncate">
                        {currentPlanDisplayName}
                      </p>
                      {isOwner && daysUntilExpiry != null && (
                        <span
                          className={cn(
                            'text-xs font-bold px-2 py-0.5 rounded-full',
                            daysUntilExpiry <= 0
                              ? 'bg-danger/10 text-danger border border-danger/20'
                              : daysUntilExpiry <= 15
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          )}
                        >
                          {daysUntilExpiry <= 0 ? 'Expiré' : `${daysUntilExpiry}j`}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-0.5 truncate">
                      {isManager
                        ? 'Géré par le propriétaire'
                        : daysUntilExpiry != null
                        ? daysUntilExpiry <= 0
                          ? 'Renouvellement requis'
                          : `${daysUntilExpiry}j restants`
                        : 'Gérer l’abonnement'}
                    </p>
                  </div>
                </button>
              </>
            )}
          </div>

          {/* Pilotage financier & billetterie express (si direction ou owner) */}
          {(isOwner || access?.canViewBilling) && (
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface p-4 sm:p-5 rounded-2xl border border-border shadow-2xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="w-4 h-4" />
                    </span>
                    <h2 className="text-base font-bold text-foreground">
                      Finances & Billetterie
                    </h2>
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      Direction
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    Recettes de billetterie, dons solidaires et émargement en direct.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleTabChange('events')}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15 transition inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>Détails de billetterie</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  <Link
                    href="/dashboard/billing"
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-surface-muted hover:bg-surface border border-border text-foreground transition inline-flex items-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5 text-primary" />
                    <span>Abonnement</span>
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl border border-border/80 bg-surface/90 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">Recettes Globales</span>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                      {formatFc(ticketingSummary?.totalRevenueFc ?? 0)}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {ticketingSummary?.paidOrdersCount ?? 0} commande{(ticketingSummary?.paidOrdersCount ?? 0) > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-border/80 bg-surface/90 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">Ventes Billets</span>
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Ticket className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                      {formatFc(ticketingSummary?.ticketsRevenueFc ?? (ticketingSummary?.totalRevenueFc ?? 0))}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {ticketingSummary?.paidTicketsCount ?? 0} billet{(ticketingSummary?.paidTicketsCount ?? 0) > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-border/80 bg-surface/90 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">Dons Solidaires</span>
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <Heart className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                      {formatFc(ticketingSummary?.donationsRevenueFc ?? 0)}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {ticketingSummary?.donationsCount ?? 0} don{(ticketingSummary?.donationsCount ?? 0) > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-border/80 bg-surface/90 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">Émargement Jour J</span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <ScanLine className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                      {ticketingSummary?.checkedInGuestsCount ?? 0}
                      <span className="text-sm font-semibold text-muted ml-1">
                        / {ticketingSummary?.paidTicketsCount || ticketingSummary?.totalOrdersCount || 0}
                      </span>
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {(ticketingSummary?.paidTicketsCount ?? 0) > 0
                        ? `${Math.round(((ticketingSummary?.checkedInGuestsCount ?? 0) / (ticketingSummary?.paidTicketsCount || 1)) * 100)} % présents`
                        : 'Scannés'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aperçu express des Événements récents */}
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Vos réceptions récentes
                </h3>
                <p className="text-xs text-muted">
                  Aperçu de vos événements en cours de préparation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTabChange('events')}
                className="text-xs font-bold text-primary hover:text-primary-hover transition flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 cursor-pointer"
              >
                <span>Voir tout ({events.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-8 bg-surface-muted/60 border border-dashed border-border rounded-xl">
                <Calendar className="w-10 h-10 text-muted mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-foreground">Aucun événement configuré</p>
                <p className="text-xs text-muted mt-0.5">Créez votre première réception pour lancer vos invitations.</p>
                <Link
                  href="/dashboard/events"
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary-solid text-primary-foreground text-xs font-bold hover:bg-primary-solid-hover transition"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Créer un événement</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {events.slice(0, 3).map((event) => {
                  const dateLabel = new Date(event.date).toLocaleDateString('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  });
                  return (
                    <Link
                      key={event.id}
                      href={`/dashboard/events/${event.id}`}
                      className="p-3.5 rounded-xl border border-border bg-surface-muted/30 hover:border-primary/40 hover:bg-primary/5 transition group flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted">
                          <span className="font-semibold text-primary">{dateLabel}</span>
                          <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition" />
                        </div>
                        <h4 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition">
                          {event.title}
                        </h4>
                        {event.location && (
                          <p className="text-xs text-muted truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {event.location}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cartes d'accès rapide vers les modules spécialisés */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => handleTabChange('guests')}
              className="p-4 rounded-2xl border border-border bg-surface hover:border-blue-500/40 hover:bg-blue-500/5 transition text-left flex flex-col justify-between gap-3 group cursor-pointer"
            >
              <div className="space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                  Invités & Protocole
                </h4>
                <p className="text-xs text-muted leading-relaxed">
                  Faire-part WhatsApp, suivi RSVP et scan smartphone jour J.
                </p>
              </div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
                <span>Ouvrir l’onglet</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('spaces')}
              className="p-4 rounded-2xl border border-border bg-surface hover:border-purple-500/40 hover:bg-purple-500/5 transition text-left flex flex-col justify-between gap-3 group cursor-pointer"
            >
              <div className="space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                  Salles & Marketplace
                </h4>
                <p className="text-xs text-muted leading-relaxed">
                  Modélisation de plans 2D/3D, simulateur IA et devis.
                </p>
              </div>
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 inline-flex items-center gap-1">
                <span>Ouvrir l’onglet</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('billing')}
              className="p-4 rounded-2xl border border-border bg-surface hover:border-emerald-500/40 hover:bg-emerald-500/5 transition text-left flex flex-col justify-between gap-3 group cursor-pointer"
            >
              <div className="space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-sm text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                  Abonnement & Quotas
                </h4>
                <p className="text-xs text-muted leading-relaxed">
                  Suivi des jauges, licence, équipe et formules d’upgrade.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                <span>Ouvrir l’onglet</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
          </div>

          {/* Centre d'assistance & Conseils */}
          <section className="p-4 sm:p-5 rounded-2xl border border-border bg-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  {isManager ? 'Besoin d’aide sur votre espace ?' : 'Besoin d’aide ou de conseils ?'}
                </p>
                <p className="text-xs text-muted">
                  {isManager
                    ? 'Consultez le guide des fonctionnalités manager et de l’équipe.'
                    : 'Consultez notre guide pratique étape par étape.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <Link
                href="/dashboard/guide"
                className="flex-1 sm:flex-none min-h-11 inline-flex items-center justify-center text-center px-3.5 py-2 rounded-xl border border-border hover:bg-surface-muted text-xs font-semibold text-foreground transition"
              >
                Guide utilisateur
              </Link>
              <Link
                href={isManager ? '/dashboard/publications' : '/dashboard/catalogue'}
                className="flex-1 sm:flex-none min-h-11 inline-flex items-center justify-center text-center px-3.5 py-2 rounded-xl bg-primary-solid text-primary-foreground text-xs font-bold hover:bg-primary-solid-hover transition shadow-xs"
              >
                {isManager ? 'Réalisations' : 'Marketplace'}
              </Link>
            </div>
          </section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          ONGLET 2 : 📋 ÉVÉNEMENTS & BILLETTERIE
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'events' && (
        <div
          role="tabpanel"
          id="org-panel-events"
          aria-labelledby="org-tab-events"
          tabIndex={0}
          className="space-y-6 focus-visible:outline-none animate-in fade-in-50 duration-150"
        >
          {/* Pilotage financier & billetterie complet (direction / owner) */}
          {(isOwner || access?.canViewBilling) && (
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface p-4 sm:p-5 rounded-2xl border border-border shadow-2xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="w-4 h-4" />
                    </span>
                    <h2 className="text-base font-bold text-foreground">
                      Bilan Financier & Billetterie des Événements
                    </h2>
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      Direction
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    Totalisation des ventes de billets, dons solidaires et taux d’émargement.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href="/dashboard/tickets"
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-primary-solid text-primary-foreground hover:bg-primary-solid-hover transition inline-flex items-center gap-1.5"
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>Console Billetterie</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl border border-border/80 bg-surface/90 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">Recettes Globales</span>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                      {formatFc(ticketingSummary?.totalRevenueFc ?? 0)}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {ticketingSummary?.paidOrdersCount ?? 0} commande{(ticketingSummary?.paidOrdersCount ?? 0) > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-border/80 bg-surface/90 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">Ventes Billets</span>
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Ticket className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                      {formatFc(ticketingSummary?.ticketsRevenueFc ?? (ticketingSummary?.totalRevenueFc ?? 0))}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {ticketingSummary?.paidTicketsCount ?? 0} billet{(ticketingSummary?.paidTicketsCount ?? 0) > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-border/80 bg-surface/90 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">Dons Solidaires</span>
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <Heart className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                      {formatFc(ticketingSummary?.donationsRevenueFc ?? 0)}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {ticketingSummary?.donationsCount ?? 0} don{(ticketingSummary?.donationsCount ?? 0) > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-border/80 bg-surface/90 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">Émargement Jour J</span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <ScanLine className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                      {ticketingSummary?.checkedInGuestsCount ?? 0}
                      <span className="text-sm font-semibold text-muted ml-1">
                        / {ticketingSummary?.paidTicketsCount || ticketingSummary?.totalOrdersCount || 0}
                      </span>
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {(ticketingSummary?.paidTicketsCount ?? 0) > 0
                        ? `${Math.round(((ticketingSummary?.checkedInGuestsCount ?? 0) / (ticketingSummary?.paidTicketsCount || 1)) * 100)} % présents`
                        : 'Scannés'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section principale Événements avec filtres et modes d'affichage */}
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Tous vos événements
                </h2>
                <p className="text-xs text-muted">
                  Consultez, modifiez et pilotez l’organisation de vos réceptions.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <ViewModeToggle
                  storageKey="em-view-home-events"
                  value={homeEventsMode}
                  onChange={setHomeEventsMode}
                  columns={homeEventsColumns}
                  onColumnsChange={setHomeEventsColumns}
                  defaultMode="grid"
                  defaultColumns={2}
                />
                <Link
                  href="/dashboard/events"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-solid text-primary-foreground text-xs font-bold hover:bg-primary-solid-hover transition shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Nouvel événement</span>
                </Link>
              </div>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-12 bg-surface-muted/60 border border-dashed border-border rounded-xl">
                <Calendar className="w-12 h-12 text-muted mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold text-foreground">Aucun événement pour le moment</h3>
                <p className="text-sm text-muted mt-1 max-w-xs mx-auto">
                  Créez votre premier événement pour lancer vos invitations et gérer vos invités.
                </p>
                <Link
                  href="/dashboard/events"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-solid hover:bg-primary-solid-hover text-primary-foreground font-semibold rounded-lg text-sm transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Créer un événement</span>
                </Link>
              </div>
            ) : (
              <>
                <div className={homeEventsMode === 'list' ? listStackClass : homeEventsGridClass}>
                  {paginatedEvents.map((event) => {
                    const dateLabel = new Date(event.date).toLocaleDateString('fr-FR', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    });
                    return (
                      <ProjectCard
                        key={event.id}
                        id={event.id}
                        title={event.title}
                        layout={homeEventsMode}
                        icon={<Calendar className="w-4 h-4" />}
                        overlayMeta={dateLabel}
                        ctaLabel="Ouvrir"
                        meta={
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 shrink-0 opacity-70" />
                            {event.location}
                          </span>
                        }
                        value={homeEventsMode === 'list' ? dateLabel : undefined}
                        description={homeEventsMode === 'grid' ? event.description : undefined}
                        onClick={() => router.push(`/dashboard/events/${event.id}`)}
                        actions={
                          homeEventsMode === 'list' ? (
                            <Link
                              href={`/dashboard/events/${event.id}`}
                              className="inline-flex items-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ListRowAction />
                            </Link>
                          ) : undefined
                        }
                      />
                    );
                  })}
                </div>
                <Pagination
                  page={homeEventsPage}
                  pageSize={homeEventsPageSize}
                  total={events.length}
                  onPageChange={setHomeEventsPage}
                  onPageSizeChange={setHomeEventsPageSize}
                  itemLabel="événements"
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          ONGLET 3 : 👥 INVITÉS & PROTOCOLE
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'guests' && (
        <div
          role="tabpanel"
          id="org-panel-guests"
          aria-labelledby="org-tab-guests"
          tabIndex={0}
          className="space-y-6 focus-visible:outline-none animate-in fade-in-50 duration-150"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Users className="w-4 h-4" />
                </span>
                <h2 className="text-lg font-bold text-foreground">Invités & Accueil Jour J</h2>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Invitations WhatsApp, confirmations RSVP et émargement par scan QR.
              </p>
            </div>
            <Link
              href="/dashboard/events"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>Tous les événements</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Carte 1 : Faire-part & Invitations WhatsApp */}
            <div className="p-5 rounded-2xl border border-border bg-surface hover:border-blue-500/40 hover:shadow-xs transition group flex flex-col justify-between h-full gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                    Faire-part & RSVP
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                    Invitations & Faire-part
                  </h3>
                  <p className="text-xs text-muted leading-relaxed mt-1">
                    Faire-part personnalisés, envois nominatifs WhatsApp et suivi des confirmations en direct.
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Envois individuels WhatsApp et e-mail</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>RSVP et préférences alimentaires</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Pass d&apos;accès numérique avec QR code</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between gap-2 mt-auto">
                <Link
                  href="/dashboard/templates"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-surface-muted hover:bg-primary/10 hover:text-primary transition text-muted"
                >
                  Modèles de messages
                </Link>
                <Button
                  size="sm"
                  onClick={() => router.push(events.length > 0 ? `/dashboard/events/${events[0].id}` : '/dashboard/events')}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Gérer les invités
                </Button>
              </div>
            </div>

            {/* Carte 2 : Protocole & Contrôle d'Accès QR */}
            <div className="p-5 rounded-2xl border border-border bg-surface hover:border-amber-500/40 hover:shadow-xs transition group flex flex-col justify-between h-full gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <ScanLine className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                    Accueil Jour J
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                    Protocole & Contrôle d’Accès
                  </h3>
                  <p className="text-xs text-muted leading-relaxed mt-1">
                    Scan smartphone rapide à l’entrée, détection des doublons et affectation des tables en direct.
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Scan instantané sans application native à installer</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Checklist protocolaire et affectation de portes</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Contrôle anti-doublon et numéro de table</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between gap-2 mt-auto">
                <span className="text-xs text-muted">
                  Émargement sécurisé
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => router.push('/dashboard/protocol')}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Ouvrir le Protocole
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          ONGLET : 💼 PRESTATIONS & OFFRES (OU 🏛️ SALLES POUR VENUES)
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'spaces' && (
        <div
          role="tabpanel"
          id="org-panel-spaces"
          aria-labelledby="org-tab-spaces"
          tabIndex={0}
          className="space-y-6 focus-visible:outline-none animate-in fade-in-50 duration-150"
        >
          {isServiceProvider ? (
            <div className="space-y-6">
              {/* En-tête de section spécifique prestataire */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl border border-border bg-surface/90 shadow-2xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">
                        Catalogue de vos Prestations & Services
                      </h2>
                      <p className="text-xs text-muted">
                        Publiez vos offres, ajustez vos tarifs, gérez vos stocks de matériel et soignez votre vitrine auprès des organisateurs.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href="/dashboard/marketplace"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-surface border border-border hover:border-primary/40 text-foreground transition shadow-2xs"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-primary" />
                    <span>Console Vendeur</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href="/dashboard/marketplace?new=1"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary-solid text-primary-foreground hover:bg-primary-solid-hover transition shadow-2xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Nouvelle prestation</span>
                  </Link>
                </div>
              </div>

              {/* Statut de visibilité & Quotas du plan prestataire */}
              <div className="p-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-surface to-surface-muted flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-foreground">
                        Forfait Prestataire · {formatQuota(usage?.services, limits?.maxServices)} offres publiées
                      </p>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        En ligne
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      Vos prestations sont visibles par tous les organisateurs d’événements, mariés et entreprises de la plateforme.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/dashboard/billing"
                    className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <span>Gérer mon forfait</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Cartes d'action métier pour le prestataire */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Prestations & Services au catalogue */}
                <div className="p-5 rounded-2xl border border-primary/30 bg-surface hover:border-primary hover:shadow-xs transition group flex flex-col justify-between h-full gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        Offres phares
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                        Prestations & Forfaits
                      </h3>
                      <p className="text-xs text-muted leading-relaxed mt-1">
                        Traiteur, Décoration, DJ, Photographe, Hôtesses… Définissez vos tarifs par personne ou par événement.
                      </p>
                    </div>

                    <div className="space-y-1 pt-1 text-xs text-muted">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>Tarification par heure, jour ou invité</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>Photos HD & fiches descriptives</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-border">
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => router.push('/dashboard/marketplace')}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      Gérer mes prestations
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      onClick={() => router.push('/dashboard/marketplace?new=1')}
                      leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
                    >
                      Nouvelle prestation
                    </Button>
                  </div>
                </div>

                {/* 2. Matériel & Équipements à la location */}
                <div className="p-5 rounded-2xl border border-border bg-surface hover:border-purple-500/40 hover:shadow-xs transition group flex flex-col justify-between h-full gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition">
                        <Layers className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                        Location
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                        Matériel & Mobilier
                      </h3>
                      <p className="text-xs text-muted leading-relaxed mt-1">
                        Chaises Chiavari, mange-debout, chapiteaux, sonorisation, vaisselle & éclairages en location.
                      </p>
                    </div>

                    <div className="space-y-1 pt-1 text-xs text-muted">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>Stock disponible par date</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>Options livraison & montage</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-2 border-t border-border">
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      onClick={() => router.push('/dashboard/marketplace?tab=rentals')}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      Gérer la location
                    </Button>
                  </div>
                </div>

                {/* 3. Demandes de devis & Chiffrages */}
                <div className="p-5 rounded-2xl border border-border bg-surface hover:border-amber-500/40 hover:shadow-xs transition group flex flex-col justify-between h-full gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition">
                        <Inbox className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                        {pendingQuotesCount > 0 ? `${pendingQuotesCount} en attente` : 'Opportunités'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                        Devis & Chiffrages
                      </h3>
                      <p className="text-xs text-muted leading-relaxed mt-1">
                        Répondez aux demandes des organisateurs avec des propositions tarifaires claires en Franc Congolais.
                      </p>
                    </div>

                    <div className="space-y-1 pt-1 text-xs text-muted">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Chiffrage direct et rapide</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Acomptes sécurisés par Mobile Money</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-2 border-t border-border">
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      onClick={() => handleTabChange('quotes')}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      Voir les demandes de devis
                    </Button>
                  </div>
                </div>

                {/* 4. Portfolio & Réalisations */}
                <div className="p-5 rounded-2xl border border-border bg-surface hover:border-blue-500/40 hover:shadow-xs transition group flex flex-col justify-between h-full gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition">
                        <Rss className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                        Vitrine
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                        Réalisations & Portfolio
                      </h3>
                      <p className="text-xs text-muted leading-relaxed mt-1">
                        Partagez des photos et actualités de vos prestations pour prouver votre expertise et rassurer les clients.
                      </p>
                    </div>

                    <div className="space-y-1 pt-1 text-xs text-muted">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Posts d’événements réussis</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Partage direct sur WhatsApp</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-2 border-t border-border">
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      onClick={() => router.push('/dashboard/publications')}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      Publier une réalisation
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Building2 className="w-4 h-4" />
                  </span>
                  <h2 className="text-lg font-bold text-foreground">
                    {isVendor ? 'Prestations & Devis' : 'Salles & Marketplace'}
                  </h2>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {canSell
                    ? 'Plans de table 2D/3D, vitrine marketplace (salles & prestations), packs et devis.'
                    : 'Plans de table 2D/3D, simulateur IA, assemblage de packs et devis prestataires.'}
                </p>
              </div>

              <div className={cn('grid grid-cols-1 gap-4', isManager ? 'md:grid-cols-2 xl:grid-cols-4' : canSell ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-3')}>
                {canSell ? (
                  <div className="p-5 rounded-2xl border border-primary/30 bg-primary/5 hover:border-primary hover:shadow-xs transition group flex flex-col justify-between h-full gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 text-primary flex items-center justify-center">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                          Vitrine
                        </span>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                          Mes offres marketplace
                        </h3>
                        <p className="text-xs text-muted leading-relaxed mt-1">
                          Publiez salles et prestations, répondez aux devis et suivez les acomptes.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => router.push('/dashboard/marketplace')}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      className="mt-auto"
                    >
                      Ouvrir Mes offres
                    </Button>
                  </div>
                ) : null}

                {isManager ? (
                  <div className="p-5 rounded-2xl border border-primary/25 bg-primary/5 hover:border-primary/50 hover:shadow-xs transition group flex flex-col justify-between h-full gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 text-primary flex items-center justify-center">
                          <Rss className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                          Réalisations
                        </span>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                          Photos & Actualités
                        </h3>
                        <p className="text-xs text-muted leading-relaxed mt-1">
                          Partagez vos photos d&apos;événements et actualités sur le catalogue.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => router.push('/dashboard/publications')}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      className="mt-auto"
                    >
                      Voir les réalisations
                    </Button>
                  </div>
                ) : null}

                {/* Carte 1 : Plan de Salle 2D/3D */}
                <div className="p-5 rounded-2xl border border-border bg-surface hover:border-purple-500/40 hover:shadow-xs transition group flex flex-col justify-between h-full gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                        Plan 2D/3D
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                        Plan de salle & Placement
                      </h3>
                      <p className="text-xs text-muted leading-relaxed mt-1">
                        Disposition des tables, scène, buffet et placement visuel des invités.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-xs px-2.5 py-1 rounded bg-surface-muted text-muted">Tables rondes & rect.</span>
                      <span className="text-xs px-2.5 py-1 rounded bg-surface-muted text-muted">Scène & Buffet</span>
                      <span className="text-xs px-2.5 py-1 rounded bg-surface-muted text-muted">Vue 3D WebGL</span>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => router.push('/dashboard/rooms')}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    className="mt-auto"
                  >
                    Éditeur 2D/3D
                  </Button>
                </div>

                {/* Carte 2 : Trouver des prestataires & Packs IA */}
                <div className="p-5 rounded-2xl border border-primary/30 bg-primary/5 hover:border-primary hover:shadow-xs transition group flex flex-col justify-between h-full gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 text-primary flex items-center justify-center">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                        Simulateur IA
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                        Simulateur IA & Packs
                      </h3>
                      <p className="text-xs text-muted leading-relaxed mt-1">
                        3 combinaisons budgétaires instantanées (éco, confort, prestige) avec prestataires certifiés.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <Link
                        href="/dashboard/catalogue?tab=plan&planView=ai"
                        className="text-xs font-bold px-2.5 py-1 rounded-[var(--radius-button)] bg-primary-solid text-primary-foreground hover:bg-primary-solid-hover transition inline-flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> Simuler 3 packs
                      </Link>
                      <Link
                        href="/dashboard/catalogue?kind=venue"
                        className="text-xs font-medium px-2.5 py-1 rounded-lg bg-surface border border-border hover:bg-primary/10 hover:text-primary transition text-muted min-h-[30px] inline-flex items-center"
                      >
                        Salles
                      </Link>
                      <Link
                        href="/dashboard/catalogue?kind=service"
                        className="text-xs font-medium px-2.5 py-1 rounded-lg bg-surface border border-border hover:bg-primary/10 hover:text-primary transition text-muted min-h-[30px] inline-flex items-center"
                      >
                        Prestataires
                      </Link>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-auto">
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => router.push('/dashboard/catalogue?tab=plan&planView=ai')}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      className="shadow-xs shadow-primary/20"
                    >
                      Lancer la simulation
                    </Button>
                    {isManager ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        fullWidth
                        onClick={() => router.push('/dashboard/catalogue?tab=plan&planView=ai&buyTokens=1')}
                      >
                        Acheter des jetons
                      </Button>
                    ) : null}
                  </div>
                </div>

                {/* Carte 3 : Devis, Réservations & Suivi */}
                <div className="p-5 rounded-2xl border border-border bg-surface hover:border-emerald-500/40 hover:shadow-xs transition group flex flex-col justify-between h-full gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        Devis & Contrats
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                        Devis & Réservations
                      </h3>
                      <p className="text-xs text-muted leading-relaxed mt-1">
                        Suivi des demandes prestataires, dates confirmées et devis en cours.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <Link
                        href="/dashboard/bookings?tab=quotes"
                        className="text-xs font-medium px-2.5 py-1 rounded-lg bg-surface-muted hover:bg-primary/10 hover:text-primary transition text-muted min-h-[30px] inline-flex items-center"
                      >
                        Devis en cours
                      </Link>
                      <Link
                        href="/dashboard/bookings?tab=bookings"
                        className="text-xs font-medium px-2.5 py-1 rounded-lg bg-surface-muted hover:bg-primary/10 hover:text-primary transition text-muted min-h-[30px] inline-flex items-center"
                      >
                        Dates réservées
                      </Link>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => router.push('/dashboard/bookings')}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    className="mt-auto"
                  >
                    Gérer mes devis
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          ONGLET : 📅 RÉSERVATIONS & PLANNING D'OCCUPATION
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'reservations' && (
        <div
          role="tabpanel"
          id="org-panel-reservations"
          aria-labelledby="org-tab-reservations"
          tabIndex={0}
          className="space-y-6 focus-visible:outline-none animate-in fade-in-50 duration-150"
        >
          {/* En-tête de section avec bascule de perspective */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl border border-border bg-surface/90 shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    Réservations & Dates Bloquées
                  </h2>
                  <p className="text-xs text-muted">
                    Suivi des réservations confirmées, acomptes et disponibilités de vos espaces et prestations.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isVenueOrVendorOrCatalog && (
                <div className="flex items-center p-1 rounded-xl border border-border bg-surface-muted/60 text-xs">
                  <button
                    type="button"
                    aria-pressed={vendorRolePerspective === 'vendor'}
                    onClick={() => {
                      setVendorRolePerspective('vendor');
                      loadVendorHubData('vendor');
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer',
                      vendorRolePerspective === 'vendor'
                        ? 'bg-surface text-foreground shadow-2xs font-bold'
                        : 'text-muted hover:text-foreground'
                    )}
                  >
                    Reçues (Prestataire/Salle)
                  </button>
                  <button
                    type="button"
                    aria-pressed={vendorRolePerspective === 'organizer'}
                    onClick={() => {
                      setVendorRolePerspective('organizer');
                      loadVendorHubData('organizer');
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer',
                      vendorRolePerspective === 'organizer'
                        ? 'bg-surface text-foreground shadow-2xs font-bold'
                        : 'text-muted hover:text-foreground'
                    )}
                  >
                    Mes réservations
                  </button>
                </div>
              )}

              <Link
                href="/dashboard/bookings?tab=bookings"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary-solid text-primary-foreground hover:bg-primary-solid-hover transition shadow-2xs"
              >
                <span>Plein écran</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 4 KPIs clés des réservations */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl border border-border/80 bg-surface/90">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Total Réservations</span>
              <p className="text-2xl font-black text-foreground mt-2">{bookings.length}</p>
              <p className="text-xs text-muted mt-0.5">Dossiers enregistrés</p>
            </div>
            <div className="p-4 rounded-2xl border border-border/80 bg-surface/90">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Confirmées / En cours</span>
              <p className="text-2xl font-black text-emerald-600 mt-2">{confirmedBookingsCount}</p>
              <p className="text-xs text-muted mt-0.5">Dates garanties</p>
            </div>
            <div className="p-4 rounded-2xl border border-border/80 bg-surface/90">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">En attente</span>
              <p className="text-2xl font-black text-amber-600 mt-2">{pendingBookingsCount}</p>
              <p className="text-xs text-muted mt-0.5">À valider / acompte requis</p>
            </div>
            <div className="p-4 rounded-2xl border border-border/80 bg-surface/90">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Volume financier</span>
              <p className="text-2xl font-black text-foreground mt-2">
                {totalBookingsVolumeFc > 0 ? formatFc(totalBookingsVolumeFc) : '0 FC'}
              </p>
              <p className="text-xs text-muted mt-0.5">Total réservations brutes</p>
            </div>
          </div>

          {/* Panneau interactif de gestion des réservations */}
          {vendorHubLoading ? (
            <div className="p-12 text-center text-muted">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
              <p className="text-xs">Actualisation des réservations…</p>
            </div>
          ) : (
            <DynamicMarketplaceBookingsPanel
              bookings={bookings}
              commissionDueFc={vendorRolePerspective === 'vendor' ? commissionDueFc : 0}
              onChanged={() => loadVendorHubData(vendorRolePerspective)}
              organizerView={vendorRolePerspective === 'organizer'}
            />
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          ONGLET : 💬 DEMANDES DE DEVIS & PROPOSITIONS
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'quotes' && (
        <div
          role="tabpanel"
          id="org-panel-quotes"
          aria-labelledby="org-tab-quotes"
          tabIndex={0}
          className="space-y-6 focus-visible:outline-none animate-in fade-in-50 duration-150"
        >
          {/* En-tête de section avec bascule de perspective */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl border border-border bg-surface/90 shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                  <Inbox className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    Demandes de Devis & Échanges
                  </h2>
                  <p className="text-xs text-muted">
                    Répondez aux demandes des organisateurs, proposez vos tarifs sur-mesure et convertissez vos prospects.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isVenueOrVendorOrCatalog && (
                <div className="flex items-center p-1 rounded-xl border border-border bg-surface-muted/60 text-xs">
                  <button
                    type="button"
                    aria-pressed={vendorRolePerspective === 'vendor'}
                    onClick={() => {
                      setVendorRolePerspective('vendor');
                      loadVendorHubData('vendor');
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer',
                      vendorRolePerspective === 'vendor'
                        ? 'bg-surface text-foreground shadow-2xs font-bold'
                        : 'text-muted hover:text-foreground'
                    )}
                  >
                    Demandes reçues
                  </button>
                  <button
                    type="button"
                    aria-pressed={vendorRolePerspective === 'organizer'}
                    onClick={() => {
                      setVendorRolePerspective('organizer');
                      loadVendorHubData('organizer');
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer',
                      vendorRolePerspective === 'organizer'
                        ? 'bg-surface text-foreground shadow-2xs font-bold'
                        : 'text-muted hover:text-foreground'
                    )}
                  >
                    Mes demandes
                  </button>
                </div>
              )}

              <Link
                href="/dashboard/bookings?tab=quotes"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary-solid text-primary-foreground hover:bg-primary-solid-hover transition shadow-2xs"
              >
                <span>Plein écran</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 4 KPIs Devis */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl border border-border/80 bg-surface/90">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Demandes Reçues</span>
              <p className="text-2xl font-black text-foreground mt-2">{inquiries.length}</p>
              <p className="text-xs text-muted mt-0.5">Organisateurs intéressés</p>
            </div>
            <div className="p-4 rounded-2xl border border-border/80 bg-surface/90">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">En Attente de Réponse</span>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-2xl font-black text-amber-600">{pendingQuotesCount}</p>
                {pendingQuotesCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 animate-pulse">
                    À traiter
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5">Réponse rapide recommandée</p>
            </div>
            <div className="p-4 rounded-2xl border border-border/80 bg-surface/90">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Devis Acceptés</span>
              <p className="text-2xl font-black text-emerald-600 mt-2">{acceptedQuotesCount}</p>
              <p className="text-xs text-muted mt-0.5">Accords de principe</p>
            </div>
            <div className="p-4 rounded-2xl border border-border/80 bg-surface/90">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Taux d'Acceptation</span>
              <p className="text-2xl font-black text-primary mt-2">
                {inquiries.length > 0 ? `${Math.round((acceptedQuotesCount / inquiries.length) * 100)} %` : '—'}
              </p>
              <p className="text-xs text-muted mt-0.5">Efficacité commerciale</p>
            </div>
          </div>

          {/* Panneau interactif des devis */}
          {vendorHubLoading ? (
            <div className="p-12 text-center text-muted">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
              <p className="text-xs">Actualisation des devis…</p>
            </div>
          ) : (
            <DynamicMarketplaceInquiriesPanel
              inquiries={inquiries}
              organizerView={vendorRolePerspective === 'organizer'}
              onChanged={() => loadVendorHubData(vendorRolePerspective)}
            />
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          ONGLET : 🏬 EXPLORER LE MARKETPLACE & CATALOGUE
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'explore' && (
        <div
          role="tabpanel"
          id="org-panel-explore"
          aria-labelledby="org-tab-explore"
          tabIndex={0}
          className="space-y-6 focus-visible:outline-none animate-in fade-in-50 duration-150"
        >
          {/* En-tête */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-surface to-surface shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary text-primary-foreground">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    Explorer le Catalogue & Marketplace
                  </h2>
                  <p className="text-xs text-muted">
                    Salles de réception, prestataires événementiels, matériel en location et simulateur de budget.
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/dashboard/catalogue"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary-solid text-primary-foreground hover:bg-primary-solid-hover transition shadow-2xs shrink-0"
            >
              <Store className="w-4 h-4" />
              <span>Ouvrir le catalogue complet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Recherche rapide */}
          <div className="p-4 rounded-2xl border border-border bg-surface/90 space-y-3">
            <p className="text-xs font-bold text-muted uppercase tracking-wider">Recherche ciblée dans le catalogue</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <label htmlFor="org-catalogue-quick-search" className="sr-only">Rechercher dans le catalogue</label>
                <input
                  id="org-catalogue-quick-search"
                  type="search"
                  aria-label="Rechercher une salle, un traiteur, un DJ ou du matériel"
                  placeholder="Rechercher une salle, un traiteur, un DJ, du matériel…"
                  className="w-full min-h-11 pl-10 pr-4 rounded-xl border border-border bg-surface text-sm text-foreground placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-primary shadow-2xs transition"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.currentTarget as HTMLInputElement).value.trim();
                      if (val) router.push(`/dashboard/catalogue?q=${encodeURIComponent(val)}`);
                    }
                  }}
                />
              </div>
              <Button
                variant="primary"
                onClick={() => router.push('/dashboard/catalogue')}
                leftIcon={<Compass className="w-4 h-4" />}
                className="shrink-0"
              >
                Explorer tout
              </Button>
            </div>
          </div>

          {/* 4 Grandes Cartes d'exploration thématique */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-border/80 bg-surface/90 hover:border-primary/50 hover:bg-primary/5 transition flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:scale-110 transition">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition">
                    Salles & Lieux
                  </h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Halls de réception, terrasses, domaines et espaces modulables avec rendus 2D/3D et plans interactifs.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/catalogue?kind=venue"
                className="mt-4 inline-flex items-center justify-between text-xs font-bold text-primary group-hover:translate-x-0.5 transition"
              >
                <span>Voir les salles</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-5 rounded-2xl border border-border/80 bg-surface/90 hover:border-blue-500/50 hover:bg-blue-500/5 transition flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-blue-600 transition">
                    Prestataires
                  </h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Traiteurs, décorateurs, photographes, DJ, sonorisation, sécurité et hôtesses qualifiés.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/catalogue?kind=service"
                className="mt-4 inline-flex items-center justify-between text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition"
              >
                <span>Trouver des prestataires</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-5 rounded-2xl border border-border/80 bg-surface/90 hover:border-amber-500/50 hover:bg-amber-500/5 transition flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-amber-600 transition">
                    Location de Matériel
                  </h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Mobilier, chaises Napoléon, chapiteaux, écrans géants LED, podiums et vaisselle de réception.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/catalogue?kind=rental"
                className="mt-4 inline-flex items-center justify-between text-xs font-bold text-amber-600 group-hover:translate-x-0.5 transition"
              >
                <span>Louer du matériel</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-5 rounded-2xl border border-border/80 bg-surface/90 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-emerald-600 transition">
                    Simulateur IA & Packs
                  </h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Estimez votre budget global, générez 3 propositions équilibrées et contactez les prestataires en 1 clic.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/catalogue?tab=plan&planView=ai"
                className="mt-4 inline-flex items-center justify-between text-xs font-bold text-emerald-600 group-hover:translate-x-0.5 transition"
              >
                <span>Lancer le simulateur</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Bannière vers Réalisations & Vitrine */}
          <div className="p-5 rounded-2xl border border-border bg-surface flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-surface-muted text-foreground">
                <Rss className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Fil des Réalisations & Vitrine Publique</h4>
                <p className="text-xs text-muted">Consultez les photos des réceptions réussies et publiez vos propres réalisations.</p>
              </div>
            </div>
            <Link
              href="/dashboard/publications"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-surface-muted hover:bg-surface-muted/80 text-foreground border border-border transition shrink-0"
            >
              <span>Voir les réalisations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          ONGLET : 📊 ANALYSES & PERFORMANCE COMMERCIALE
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div
          role="tabpanel"
          id="org-panel-analytics"
          aria-labelledby="org-tab-analytics"
          tabIndex={0}
          className="space-y-6 focus-visible:outline-none animate-in fade-in-50 duration-150"
        >
          {/* En-tête */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl border border-border bg-surface/90 shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    Analyses & Indicateurs de Performance
                  </h2>
                  <p className="text-xs text-muted">
                    Indicateurs de conversion, volume financier, bilan d'activité et recommandations d’optimisation.
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/dashboard/analytics"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary-solid text-primary-foreground hover:bg-primary-solid-hover transition shadow-2xs"
            >
              <span>Rapports approfondis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 4 KPIs analytiques */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl border border-border/80 bg-surface/90">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Volume Engagé</span>
              <p className="text-2xl font-black text-foreground mt-2">
                {totalBookingsVolumeFc > 0 ? formatFc(totalBookingsVolumeFc) : '0 FC'}
              </p>
              <p className="text-xs text-muted mt-0.5">Sur {bookings.length} réservation{bookings.length > 1 ? 's' : ''}</p>
            </div>
            <div className="p-4 rounded-2xl border border-border/80 bg-surface/90">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Taux de Conversion</span>
              <p className="text-2xl font-black text-emerald-600 mt-2">
                {inquiries.length > 0 ? `${Math.round((confirmedBookingsCount / inquiries.length) * 100)} %` : '—'}
              </p>
              <p className="text-xs text-muted mt-0.5">Devis &rarr; Réservations validées</p>
            </div>
            <div className="p-4 rounded-2xl border border-border/80 bg-surface/90">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Demandes Actives</span>
              <p className="text-2xl font-black text-blue-600 mt-2">{inquiries.length + bookings.length}</p>
              <p className="text-xs text-muted mt-0.5">Intéractions clients cumulées</p>
            </div>
            <div className="p-4 rounded-2xl border border-border/80 bg-surface/90">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Billetterie directe</span>
              <p className="text-2xl font-black text-foreground mt-2">
                {ticketingSummary?.totalRevenueFc ? formatFc(ticketingSummary.totalRevenueFc) : '0 FC'}
              </p>
              <p className="text-xs text-muted mt-0.5">{ticketingSummary?.paidOrdersCount ?? 0} commandes réglées</p>
            </div>
          </div>

          {/* Deux colonnes d'analyse détaillée */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Colonne 1 : Répartition des statuts de réservations et devis */}
            <div className="p-5 rounded-2xl border border-border bg-surface/90 space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span>Statut du Pipeline Commercial</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-muted">Réservations confirmées</span>
                    <span className="text-emerald-600 font-bold">{confirmedBookingsCount}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${bookings.length > 0 ? Math.round((confirmedBookingsCount / bookings.length) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-muted">Réservations en attente</span>
                    <span className="text-amber-600 font-bold">{pendingBookingsCount}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${bookings.length > 0 ? Math.round((pendingBookingsCount / bookings.length) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-muted">Devis en attente de réponse</span>
                    <span className="text-primary font-bold">{pendingQuotesCount}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${inquiries.length > 0 ? Math.round((pendingQuotesCount / inquiries.length) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-muted">Devis acceptés</span>
                    <span className="text-blue-600 font-bold">{acceptedQuotesCount}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${inquiries.length > 0 ? Math.round((acceptedQuotesCount / inquiries.length) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Colonne 2 : Bonnes pratiques et conseils de visibilité */}
            <div className="p-5 rounded-2xl border border-border bg-surface/90 space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Conseils d'Optimisation & Visibilité</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-surface-muted/60 border border-border/60">
                  <p className="font-bold text-foreground">Photos HD et présentation soignée</p>
                  <p className="text-muted mt-0.5">
                    Les fiches disposant d'au moins 3 photos haute définition reçoivent 2,4 fois plus de demandes de devis.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-surface-muted/60 border border-border/60">
                  <p className="font-bold text-foreground">Réactivité sous 24h</p>
                  <p className="text-muted mt-0.5">
                    Une réponse rapide par message ou WhatsApp multiplie par 3 les chances de conversion en réservation ferme.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-surface-muted/60 border border-border/60">
                  <p className="font-bold text-foreground">Plans 2D/3D et normes d'accessibilité PMR</p>
                  <p className="text-muted mt-0.5">
                    Mettez en valeur les dimensions exactes et l'accès PMR pour rassurer les organisateurs corporate et institutionnels.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          ONGLET : 👥 ÉQUIPE & RÔLES DE L'ORGANISATION
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'team' && canManageTeam && (
        <div
          role="tabpanel"
          id="org-panel-team"
          aria-labelledby="org-tab-team"
          tabIndex={0}
          className="space-y-6 focus-visible:outline-none animate-in fade-in-50 duration-150"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface p-4 sm:p-5 rounded-2xl border border-border shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <UserCheck className="w-4 h-4" />
                </span>
                <h2 className="text-base font-bold text-foreground">
                  Gestion de l’Équipe & Rôles
                </h2>
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {isOwner ? 'Propriétaire' : 'Manager'}
                </span>
              </div>
              <p className="text-xs text-muted">
                Invitez vos collaborateurs, attribuez les accès (Manager, Protocole émargement, Commercial) et suivez leur statut.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/team"
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-surface border border-border hover:border-primary/40 text-foreground transition inline-flex items-center gap-1.5"
              >
                <span>Page dédiée</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
          <DynamicTeamManagement />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          ONGLET 5 : 💎 ABONNEMENT & QUOTAS / ORGANISATION
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'billing' && (
        <div
          role="tabpanel"
          id="org-panel-billing"
          aria-labelledby="org-tab-billing"
          tabIndex={0}
          className="space-y-6 focus-visible:outline-none animate-in fade-in-50 duration-150"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Award className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold text-foreground">
                {isManager ? 'Quotas de l’organisation' : 'Abonnement & Quotas'}
              </h2>
            </div>
            <p className="text-xs text-muted mt-0.5">
              {isManager
                ? 'Consultez les quotas alloués à votre organisation. Le forfait est géré par le propriétaire.'
                : 'Suivi de vos quotas consommés et gestion de votre formule d’abonnement.'}
            </p>
          </div>

          {/* Panneau de suivi des quotas actuels */}
          {orgQuota && (
            <div className="space-y-2">
              <QuotaUsagePanel quota={orgQuota} />
            </div>
          )}

          {isOwner && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <Shield className="w-4 h-4" />
                  </span>
                  <p className="text-sm font-bold text-foreground">
                    Titulaire : Forfait {currentPlanDisplayName}
                  </p>
                  {daysUntilExpiry != null && (
                    <span
                      className={cn(
                        'text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border',
                        daysUntilExpiry <= 0
                          ? 'bg-danger/10 border-danger/30 text-danger'
                          : daysUntilExpiry <= 15
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      )}
                    >
                      {daysUntilExpiry <= 0 ? 'Expiré' : `Échéance dans ${daysUntilExpiry} jours`}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted">
                  Modifiez votre formule, renouvelez votre licence ou appliquez un code promo.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/dashboard/billing"
                  className="px-4 py-2 rounded-xl bg-primary-solid hover:bg-primary-solid-hover text-primary-foreground text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <span>Gérer l’abonnement</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {isManager ? (
            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-bold text-foreground">Forfait {currentPlanDisplayName}</p>
                <p className="text-xs text-muted leading-relaxed">
                  Factures consultables. Le forfait est géré par le propriétaire.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => router.push('/dashboard/invoices')}
                  leftIcon={<FileText className="w-3.5 h-3.5" />}
                >
                  Factures
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => router.push('/dashboard/publications')}
                  leftIcon={<Rss className="w-3.5 h-3.5" />}
                >
                  Réalisations
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl sm:rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/5 via-surface to-surface-muted p-5 sm:p-7 space-y-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-border/80">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      <Crown className="w-3.5 h-3.5" />
                      Formules
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/40">
                      <Percent className="w-3 h-3" /> −10 % en paiement annuel
                    </span>
                    <span className="text-xs font-medium text-primary flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                      <Sparkles className="w-3 h-3" /> Codes promos acceptés
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Faites évoluer votre organisation</h3>
                  <p className="text-xs text-muted max-w-2xl">
                    Tarifs clairs en Franc Congolais (FC) avec Mobile Money (M-Pesa, Airtel, Orange, Afrimoney) ou Carte bancaire.
                  </p>
                </div>
                <Link
                  href="/dashboard/billing"
                  className="px-4 py-2.5 rounded-xl bg-primary-solid hover:bg-primary-solid-hover text-primary-foreground text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shrink-0"
                >
                  <span>Changer de formule</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Grille adaptative des forfaits selon le type de compte */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">
                    {tenant?.accountKind === 'VENDOR'
                      ? 'Abonnements disponibles pour compte Prestataire / Salles'
                      : tenant?.accountKind === 'CLIENT'
                      ? 'Abonnements pour compte Client catalogue'
                      : 'Abonnements disponibles pour votre organisation'}
                  </span>
                  <Link
                    href="/dashboard/billing"
                    className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <span>Tous les détails</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* 1. CAS COMPTE PRESTATAIRE / VENDEUR (VENDOR) */}
                {tenant?.accountKind === 'VENDOR' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Prestataire */}
                    <div className={cn('p-4 rounded-2xl border bg-surface flex flex-col justify-between transition', tenant?.plan === 'SERVICE' ? 'border-primary ring-2 ring-primary/20 shadow-xs' : 'border-border hover:border-primary/40')}>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-primary uppercase tracking-wider">Prestataire</span>
                          {tenant?.plan === 'SERVICE' && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-solid text-primary-foreground">Actuel</span>
                          )}
                        </div>
                        <p className="text-lg font-black text-foreground">9 900 FC <span className="text-xs font-normal text-muted">/ mois</span></p>
                        <div className="space-y-1 text-xs text-muted pt-1">
                          <p>• <strong>Offres</strong> : Prestations illimitées</p>
                          <p>• <strong>Visibilité</strong> : Traiteur, DJ, Déco, Photo, etc.</p>
                          <p>• <strong>Outils</strong> : Devis directs & gestion planning</p>
                          <p>• <strong>Inclus</strong> : Portfolio et réalisations en ligne</p>
                        </div>
                      </div>
                      <Link
                        href="/dashboard/billing"
                        className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 pt-3 border-t border-border mt-3"
                      >
                        {tenant?.plan === 'SERVICE' ? 'Gérer mon forfait' : 'Activer Prestataire'} <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>

                    {/* Salle */}
                    <div className={cn('p-4 rounded-2xl border bg-surface flex flex-col justify-between transition', tenant?.plan === 'VENUE' ? 'border-primary ring-2 ring-primary/20 shadow-xs' : 'border-border hover:border-purple-500/40')}>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Salle</span>
                          {tenant?.plan === 'VENUE' && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-solid text-primary-foreground">Actuel</span>
                          )}
                        </div>
                        <p className="text-lg font-black text-foreground">14 900 FC <span className="text-xs font-normal text-muted">/ mois</span></p>
                        <div className="space-y-1 text-xs text-muted pt-1">
                          <p>• <strong>Espaces</strong> : Salles illimitées au catalogue</p>
                          <p>• <strong>Plans</strong> : Éditeur 2D/3D complet (80 tables)</p>
                          <p>• <strong>Réservations</strong> : Dates bloquées et acomptes</p>
                          <p>• <strong>Inclus</strong> : Simulateur IA et vitrine 3D</p>
                        </div>
                      </div>
                      <Link
                        href="/dashboard/billing"
                        className="text-xs font-bold text-purple-600 hover:underline inline-flex items-center gap-1 pt-3 border-t border-border mt-3"
                      >
                        {tenant?.plan === 'VENUE' ? 'Gérer mon forfait' : 'Activer Forfait Salle'} <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>

                    {/* Salle & Presta */}
                    <div className={cn('p-4 rounded-2xl border bg-surface flex flex-col justify-between transition', tenant?.plan === 'CATALOG' ? 'border-primary ring-2 ring-primary/20 shadow-xs' : 'border-border hover:border-emerald-500/40')}>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Salle & Presta</span>
                          {tenant?.plan === 'CATALOG' && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-solid text-primary-foreground">Actuel</span>
                          )}
                        </div>
                        <p className="text-lg font-black text-foreground">19 900 FC <span className="text-xs font-normal text-muted">/ mois</span></p>
                        <div className="space-y-1 text-xs text-muted pt-1">
                          <p>• <strong>Salle & presta</strong> : Salles ∞ + Prestations ∞</p>
                          <p>• <strong>Complet</strong> : Plans 3D + Gestion de matériel</p>
                          <p>• <strong>Devis</strong> : Centralisation complète des demandes</p>
                          <p>• <strong>Inclus</strong> : Visibilité maximale catalogue</p>
                        </div>
                      </div>
                      <Link
                        href="/dashboard/billing"
                        className="text-xs font-bold text-emerald-600 hover:underline inline-flex items-center gap-1 pt-3 border-t border-border mt-3"
                      >
                        {tenant?.plan === 'CATALOG' ? 'Gérer mon forfait' : 'Activer Salle & Presta'} <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* 2. CAS COMPTE ORGANISATEUR (ORGANIZER ; BOTH legacy = même parcours) */}
                {tenant?.accountKind !== 'VENDOR' && (
                  <div className={cn(
                    'grid grid-cols-1 gap-4',
                    showB2cUpsellCard && showB2bUpsellCards ? 'md:grid-cols-3' : 'md:grid-cols-2',
                  )}>
                    {/* Particuliers & Familles */}
                    {showB2cUpsellCard && (
                    <div className={cn('p-4 rounded-2xl border bg-surface flex flex-col justify-between transition', isB2cPlan ? 'border-primary ring-2 ring-primary/20 shadow-xs' : 'border-border hover:border-primary/40')}>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground uppercase tracking-wider">Particuliers (B2C)</span>
                          {isB2cPlan && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-solid text-primary-foreground">Actuel</span>
                          )}
                        </div>
                        <p className="text-lg font-black text-foreground">Dès 60 000 FC <span className="text-xs font-normal text-muted">/ trimestre</span></p>
                        <div className="space-y-1 text-xs text-muted pt-1">
                          <p>• <strong>Particulier 50</strong> : 60 000 FC (50 invités)</p>
                          <p>• <strong>Particulier 100</strong> : 90 000 FC (100 invités)</p>
                          <p>• <strong>Particulier 200</strong> : 120 000 FC (200 invités)</p>
                          <p>• <strong>Particulier +200</strong> : 180 000 FC (invités ∞)</p>
                          <p>• <strong>Inclus</strong> : WhatsApp nominatif, QR & Plans 2D/3D</p>
                        </div>
                      </div>
                      <Link
                        href="/dashboard/billing"
                        className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 pt-3 border-t border-border mt-3"
                      >
                        Voir les forfaits Particuliers <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                    )}

                    {/* Professionnels Business & Premium */}
                    {showB2bUpsellCards && (
                    <div className={cn('p-4 rounded-2xl border-2 bg-surface flex flex-col justify-between transition shadow-xs', (tenant?.plan === 'STANDARD' || tenant?.plan?.startsWith('PREMIUM')) ? 'border-primary ring-2 ring-primary/20' : 'border-primary/40 hover:border-primary')}>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-primary uppercase tracking-wider">Business & Agences</span>
                          {(tenant?.plan === 'STANDARD' || tenant?.plan?.startsWith('PREMIUM')) && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-solid text-primary-foreground">Actuel</span>
                          )}
                        </div>
                        <p className="text-lg font-black text-foreground">Dès 30 000 FC <span className="text-xs font-normal text-muted">/ mois</span></p>
                        <div className="space-y-1 text-xs text-muted pt-1">
                          <p>• <strong>Business</strong> : 30 000 FC (8 évts · 150 invités)</p>
                          <p>• <strong>Premium</strong> : 55 000 FC (12 évts · 500 invités)</p>
                          <p>• <strong>Premium Plus</strong> : 85 000 FC (20 évts · 1 000 invités)</p>
                          <p>• <strong>Inclus</strong> : Catalogue salle + presta, équipe & billetterie</p>
                        </div>
                      </div>
                      <Link
                        href="/dashboard/billing"
                        className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 pt-3 border-t border-border mt-3"
                      >
                        Voir Business & Premium <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                    )}

                    {/* Grandes Organisations & Entreprises */}
                    {showB2bUpsellCards && (
                    <div className={cn('p-4 rounded-2xl border bg-surface flex flex-col justify-between transition', tenant?.plan?.startsWith('ENTERPRISE') ? 'border-primary ring-2 ring-primary/20 shadow-xs' : 'border-border hover:border-purple-500/40')}>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Entreprise & Grandes Envergures</span>
                          {tenant?.plan?.startsWith('ENTERPRISE') && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-solid text-primary-foreground">Actuel</span>
                          )}
                        </div>
                        <p className="text-lg font-black text-foreground">Dès 350 000 FC <span className="text-xs font-normal text-muted">/ mois</span></p>
                        <div className="space-y-1 text-xs text-muted pt-1">
                          <p>• <strong>Enterprise</strong> : 350 000 FC (3 500 invités)</p>
                          <p>• <strong>Enterprise Pro</strong> : 525 000 FC (5 000 invités)</p>
                          <p>• <strong>Unlimited</strong> : 700 000 FC (Quotas illimités)</p>
                          <p>• <strong>Inclus</strong> : SLA 24/7, catalogue salle + presta & support dédié</p>
                        </div>
                      </div>
                      <Link
                        href="/dashboard/billing"
                        className="text-xs font-bold text-purple-600 hover:underline inline-flex items-center gap-1 pt-3 border-t border-border mt-3"
                      >
                        Voir Gamme Enterprise <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section Équipe & Accompagnement */}
          {isOwner && (
            <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm text-foreground">Gestion de l’Équipe</h3>
                </div>
                <p className="text-xs text-muted">
                  Invitez vos managers, protocoles et collaborateurs avec des droits d’accès sur mesure.
                </p>
              </div>
              <Link
                href="/dashboard/team"
                className="px-4 py-2 rounded-xl bg-surface-muted hover:bg-surface border border-border text-xs font-bold text-foreground transition inline-flex items-center gap-1.5 shrink-0"
              >
                <span>Gérer l’équipe</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
