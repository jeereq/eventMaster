'use client';

import React, { useEffect, useState, useRef, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  Calendar, Users, Mail, CreditCard, 
  PlusCircle, AlertCircle, Award, CheckCircle, Shield,
  Building2, Activity, TrendingUp, Clock, Trash2, Edit2, Key,
  CalendarDays, Globe, Search, Filter, Check, X, FileText, Plus, Loader2, Copy, Eye,
  BarChart3, PieChart, ChevronLeft, ChevronRight, CheckSquare, Sparkles, MapPin, Download, MessageSquare, History, Briefcase, Wallet
} from 'lucide-react';
import GuestMessageTemplatesPanel from './GuestMessageTemplatesPanel';
import { cn } from '@/lib/cn';
import InvoiceListPanel, { type PlatformInvoiceItem } from '@/components/InvoiceListPanel';
import QuotaUsagePanel from '@/components/QuotaUsagePanel';
import SubscriptionApprovalModal, { type SubscriptionApprovalRequest } from '@/components/SubscriptionApprovalModal';
import BillingDiscountFields, { getBillingPricingFromFields } from '@/components/BillingDiscountFields';
import type { QuotaSnapshot } from '@/lib/quotaDisplay';
import { PageHeader, Alert, Button, ProjectCard, ListRowAction, StatusPill, SkeletonDashboardHome, SkeletonTabContent, ViewModeToggle, useViewMode, listStackClass, Breadcrumbs, Pagination, paginateItems, PhoneInput } from '@/components/ui';
import { DEFAULT_PHONE_COUNTRY_CODE, composeE164 } from '@/lib/phone';
import { parseStoredPhone } from '@/components/ui/PhoneInput';
import GettingStartedChecklist from '@/components/GettingStartedChecklist';
import { useViewPreferencesOptional } from '@/context/ViewPreferencesContext';
import { PLAN_IDS, type PlanId } from '@/config/landingPricing';
import TemplatePreviewThumb from '@/components/TemplatePreviewThumb';
import TemplateCardGrid from '@/components/templates/TemplateCardGrid';
import { getTemplateElementSummary } from '@/lib/landingTemplateAdapter';
import AdminDetailsModal from '@/components/admin/AdminDetailsModal';

function isPlatformStaff(role?: string) {
  return role === 'SUPER_ADMIN' || role === 'COMMERCIAL';
}

const COMMERCIAL_PLATFORM_TABS = ['tenants', 'subscription-requests', 'invoices'] as const;

function planBadgeClass(plan: string): string {
  if (plan === 'FREE') return 'bg-slate-50 border-slate-200 text-slate-600';
  if (plan === 'STANDARD') return 'bg-blue-50 border-blue-100 text-blue-700';
  if (plan.startsWith('PREMIUM')) return 'bg-primary/10 border-primary/20 text-primary';
  if (plan.startsWith('ENTERPRISE')) return 'bg-amber-50 border-amber-100 text-amber-700';
  return 'bg-slate-50 border-slate-200 text-slate-600';
}

function planBarClass(plan: string): string {
  if (plan === 'FREE') return 'bg-slate-400';
  if (plan === 'STANDARD') return 'bg-blue-500';
  if (plan.startsWith('PREMIUM')) return 'bg-primary';
  if (plan.startsWith('ENTERPRISE')) return 'bg-amber-500';
  return 'bg-slate-400';
}

interface BillingStatus extends QuotaSnapshot {
  plan: PlanId;
  limits: QuotaSnapshot['limits'] & {
    customTemplates: boolean;
  };
}

interface EventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
}

interface AdminStats {
  stats: {
    tenants: number;
    users: number;
    events: number;
    guests: number;
  };
  tenants: Array<{
    id: string;
    name: string;
    plan: PlanId;
    licenseActive: boolean;
    licenseExpiresAt: string | null;
    licenseKey: string | null;
    createdAt: string;
    managerName: string;
    managerEmail: string;
    eventsCount: number;
    usersCount: number;
  }>;
}

interface AdminUserItem {
  id: string;
  name: string | null;
  email: string;
  role: 'SUPER_ADMIN' | 'COMMERCIAL' | 'USER';
  isEmailVerified: boolean;
  tenantId: string | null;
  tenantName: string;
  createdAt: string;
}

interface AdminTemplateItem {
  id: string;
  name: string;
  content: any;
  isGlobal: boolean;
  showOnLanding: boolean;
  tenantName: string;
  createdAt: string;
}

interface RevenueReport {
  period: string;
  summary: {
    totalRevenue: number;
    totalRevenueFormatted: string;
    invoiceCount: number;
    totalCommissions: number;
    totalCommissionsFormatted: string;
    netRevenue: number;
    netRevenueFormatted: string;
  };
  byPlan: Record<string, { count: number; amount: number }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    tenantName: string;
    plan: string;
    amountFormatted: string;
    type: string;
    status: string;
    createdAt: string;
  }>;
  commercialCommissions: Array<{
    commercialId: string;
    name: string | null;
    email: string;
    referralCode: string | null;
    totalInvoiceAmount: number;
    totalCommission: number;
    entries: Array<{
      tenantName: string;
      plan: string;
      invoiceAmount: number;
      commissionAmount: number;
      source: string;
    }>;
  }>;
  monthlyTrend: Array<{
    period: string;
    revenue: number;
    revenueFormatted: string;
    invoiceCount: number;
  }>;
}

type AnalyticsSection = 'overview' | 'plans' | 'organisations' | 'revenus' | 'modeles' | 'utilisateurs' | 'evenements';

const ANALYTICS_SECTIONS: Array<{ id: AnalyticsSection; label: string }> = [
  { id: 'overview', label: 'Vue d\'ensemble' },
  { id: 'plans', label: 'Plans & licences' },
  { id: 'organisations', label: 'Organisations' },
  { id: 'revenus', label: 'Revenus' },
  { id: 'modeles', label: 'Modèles' },
  { id: 'utilisateurs', label: 'Utilisateurs' },
  { id: 'evenements', label: 'Événements' },
];

type AdminTabId =
  | 'tenants' | 'users' | 'templates' | 'message-templates' | 'events'
  | 'analytics' | 'guests' | 'settings' | 'subscription-requests'
  | 'subscription-plans' | 'invoices';

const ADMIN_TAB_META: Record<AdminTabId, { title: string; description: string; tip?: string }> = {
  tenants: {
    title: 'Organisations',
    description: 'Comptes clients SaaS : licence, forfait, gérant et quotas.',
    tip: 'Créer une organisation génère aussi le compte manager associé.',
  },
  users: {
    title: 'Utilisateurs plateforme',
    description: 'Tous les comptes (Super Admin, Commercial, membres d’organisations).',
    tip: 'Les Super Admins n’appartiennent à aucune organisation.',
  },
  templates: {
    title: 'Catalogue modèles (Super Admin)',
    description: 'Supervision globale : modèles publics EventMaster + modèles privés des organisations. Activez « Vitrine landing » ici.',
    tip: 'Créer / Modifier ouvre le concepteur visuel, puis vous revient automatiquement sur ce catalogue.',
  },
  'message-templates': {
    title: 'Messages automatiques',
    description: 'Textes WhatsApp / e-mail envoyés aux invités (invitation, rappel, confirmation…).',
    tip: 'Utilisez les variables {{firstName}}, {{rsvpLink}}, etc. dans le corps du message.',
  },
  events: {
    title: 'Événements (supervision)',
    description: 'Vue transversale de tous les événements créés par les organisations.',
  },
  guests: {
    title: 'Invités (supervision)',
    description: 'Liste globale des invités et export CSV pour audit ou support.',
  },
  analytics: {
    title: 'Analyses & statistiques',
    description: 'Adoption des forfaits, revenus, activité organisations et modèles.',
  },
  settings: {
    title: 'Réglages plateforme',
    description: 'Identité, contact public, maintenance, inscriptions, UltraMsg et SendGrid — appliqués au site et à l’API.',
    tip: 'Après sauvegarde, landing, contact, footer et inscriptions se mettent à jour immédiatement. Les forfaits sont dans l’onglet dédié.',
  },
  'subscription-requests': {
    title: 'Demandes d’abonnement',
    description: 'Validez ou refusez les demandes d’upgrade / renouvellement avec preuve de paiement.',
  },
  'subscription-plans': {
    title: 'Forfaits & tarifs',
    description: 'Prix, quotas et fonctionnalités affichés sur la landing et appliqués à la facturation.',
    tip: 'Ces forfaits alimentent directement la section tarifs de la page d’accueil.',
  },
  invoices: {
    title: 'Factures plateforme',
    description: 'Factures générées après approbation, paiement ou renouvellement.',
  },
};

interface TenantSubscriptionHistoryEntry {
  id: string;
  kind: 'REQUEST' | 'INVOICE';
  date: string;
  plan: string;
  durationDays?: number | null;
  status?: string;
  statusLabel?: string;
  proofOfPayment?: string | null;
  processedAt?: string | null;
  invoice?: {
    invoiceNumber: string;
    amountFormatted: string;
    statusLabel: string;
    typeLabel: string;
    periodStart?: string | null;
    periodEnd?: string | null;
  } | null;
}

function DashboardPageContent() {
  const { user, tenant, access, planQuota } = useAuth();
  const viewPrefs = useViewPreferencesOptional();
  const widgets = viewPrefs?.prefs.widgets;
  const {
    mode: homeEventsMode,
    setViewMode: setHomeEventsMode,
    columns: homeEventsColumns,
    setGridColumns: setHomeEventsColumns,
    gridClassName: homeEventsGridClass,
  } = useViewMode('em-view-home-events', 'grid', 2);
  const {
    mode: tenantsViewMode,
    setViewMode: setTenantsViewMode,
    columns: tenantsColumns,
    setGridColumns: setTenantsColumns,
    gridClassName: tenantsGridClass,
  } = useViewMode('em-view-admin-tenants', 'grid', 3);
  const {
    mode: usersViewMode,
    setViewMode: setUsersViewMode,
    columns: usersColumns,
    setGridColumns: setUsersColumns,
    gridClassName: usersGridClass,
  } = useViewMode('em-view-admin-users', 'grid', 3);
  const {
    mode: adminEventsViewMode,
    setViewMode: setAdminEventsViewMode,
    columns: adminEventsColumns,
    setGridColumns: setAdminEventsColumns,
    gridClassName: adminEventsGridClass,
  } = useViewMode('em-view-admin-events', 'grid', 3);
  const {
    mode: guestsViewMode,
    setViewMode: setGuestsViewMode,
    columns: guestsColumns,
    setGridColumns: setGuestsColumns,
    gridClassName: guestsGridClass,
  } = useViewMode('em-view-admin-guests', 'grid', 3);
  const {
    mode: subRequestsViewMode,
    setViewMode: setSubRequestsViewMode,
    columns: subRequestsColumns,
    setGridColumns: setSubRequestsColumns,
    gridClassName: subRequestsGridClass,
  } = useViewMode('em-view-admin-sub-requests', 'grid', 2);
  const {
    mode: plansViewMode,
    setViewMode: setPlansViewMode,
    columns: plansColumns,
    setGridColumns: setPlansColumns,
    gridClassName: plansGridClass,
  } = useViewMode('em-view-admin-plans', 'grid', 4);
  const {
    mode: invoicesViewMode,
    setViewMode: setInvoicesViewMode,
    columns: invoicesColumns,
    setGridColumns: setInvoicesColumns,
    gridClassName: invoicesGridClass,
  } = useViewMode('em-view-admin-invoices', 'list', 3);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [adminData, setAdminData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');
  const sectionParam = searchParams.get('section');
  const activeAnalyticsSection: AnalyticsSection =
    sectionParam && ANALYTICS_SECTIONS.some((s) => s.id === sectionParam)
      ? (sectionParam as AnalyticsSection)
      : 'overview';

  const setAnalyticsSection = (section: AnalyticsSection) => {
    router.replace(`/dashboard?tab=analytics&section=${section}`, { scroll: false });
  };

  // Super Admin specific states
  const [activeTab, setActiveTab] = useState<
    'tenants' | 'users' | 'templates' | 'message-templates' | 'events' | 'analytics' | 'guests' | 'settings'
    | 'subscription-requests' | 'subscription-plans' | 'invoices'
  >('tenants');

  useEffect(() => {
    if (isPlatformStaff(user?.role) && tabParam) {
      const legacySubscriptions = tabParam === 'subscriptions' ? 'subscription-requests' : tabParam;
      const allowedTabs = user?.role === 'COMMERCIAL'
        ? ['tenants', 'subscription-requests', 'invoices']
        : [
            'tenants', 'users', 'templates', 'message-templates', 'events', 'analytics', 'guests', 'settings',
            'subscription-requests', 'subscription-plans', 'invoices',
          ];
      if (allowedTabs.includes(legacySubscriptions)) {
        setActiveTab(legacySubscriptions as typeof activeTab);
      }
    }
  }, [tabParam, user]);

  useEffect(() => {
    if (searchParams.get('saved') !== '1' || tabParam !== 'templates') return;
    setTemplateSavedFlash(true);
    if (user?.role === 'SUPER_ADMIN') {
      void loadTemplates();
    }
    const t = setTimeout(() => setTemplateSavedFlash(false), 4500);
    router.replace('/dashboard?tab=templates');
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flash one-shot après retour concepteur
  }, [searchParams, tabParam, router, user?.role]);

  useEffect(() => {
    if (user?.role !== 'COMMERCIAL') return;
    if (!COMMERCIAL_PLATFORM_TABS.includes(activeTab as (typeof COMMERCIAL_PLATFORM_TABS)[number])) {
      setActiveTab('tenants');
      router.replace('/dashboard?tab=tenants');
    }
  }, [user?.role, activeTab, router]);

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [templates, setTemplates] = useState<AdminTemplateItem[]>([]);
  const [adminEvents, setAdminEvents] = useState<any[]>([]);
  const [adminGuests, setAdminGuests] = useState<any[]>([]);
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const [templateSavedFlash, setTemplateSavedFlash] = useState(false);

  const planCatalogPrices = useMemo(() => {
    if (!adminSettings?.plans) return undefined;
    const map: Record<string, number> = {};
    for (const key of PLAN_IDS) {
      const p = adminSettings.plans[key];
      if (p?.monthlyPriceFc != null) map[key] = p.monthlyPriceFc;
    }
    return map;
  }, [adminSettings]);

  const planPromoByPlan = useMemo(() => {
    if (!adminSettings?.plans) return undefined;
    const map: Record<string, { price: number; label?: string }> = {};
    for (const key of PLAN_IDS) {
      const p = adminSettings.plans[key];
      if (p?.promoActive && p.promoMonthlyPriceFc != null) {
        map[key] = { price: p.promoMonthlyPriceFc, label: p.promoLabel };
      }
    }
    return map;
  }, [adminSettings]);

  const [subscriptionRequests, setSubscriptionRequests] = useState<any[]>([]);
  const [adminInvoices, setAdminInvoices] = useState<PlatformInvoiceItem[]>([]);
  const [loadingAdminInvoices, setLoadingAdminInvoices] = useState(false);
  const [revenueReport, setRevenueReport] = useState<RevenueReport | null>(null);
  const [revenuePeriod, setRevenuePeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loadingRevenueReport, setLoadingRevenueReport] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [adminEventsLoading, setAdminEventsLoading] = useState(false);
  const [adminGuestsLoading, setAdminGuestsLoading] = useState(false);
  const [adminSettingsLoading, setAdminSettingsLoading] = useState(false);
  const [subRequestsLoading, setSubRequestsLoading] = useState(false);
  const [approvalModalRequest, setApprovalModalRequest] = useState<SubscriptionApprovalRequest | null>(null);
  const [commercialOverview, setCommercialOverview] = useState<{
    stats?: { monthlyCommission?: number; totalCommission?: number };
    commissionRate?: number;
  } | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('ALL');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'GLOBAL' | 'TENANT'>('GLOBAL');
  const [filterRsvp, setFilterRsvp] = useState<string>('ALL');

  // Pagination states
  const [tenantsPage, setTenantsPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const [templatesPage, setTemplatesPage] = useState(1);
  const [eventsPage, setEventsPage] = useState(1);
  const [guestsPage, setGuestsPage] = useState(1);
  const [subRequestsPage, setSubRequestsPage] = useState(1);
  const [homeEventsPage, setHomeEventsPage] = useState(1);
  const [plansPage, setPlansPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  const TENANTS_PER_PAGE = 8;
  const TEMPLATE_CARDS_PER_PAGE = 8;
  const SUB_REQUESTS_PER_PAGE = 8;
  const HOME_EVENTS_PER_PAGE = 6;
  const PLANS_PER_PAGE = 4;

  // Guest CRUD Modals states (Super Admin)
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [guestModalMode, setGuestModalMode] = useState<'create' | 'edit'>('create');
  const [selectedGuest, setSelectedGuest] = useState<any | null>(null);
  const [modalGuestFirstName, setGuestFirstName] = useState('');
  const [modalGuestLastName, setGuestLastName] = useState('');
  const [modalGuestEmail, setGuestEmail] = useState('');
  const [modalGuestCategory, setGuestCategory] = useState('Général');
  const [modalGuestRsvp, setGuestRsvp] = useState('PENDING');
  const [modalGuestEventId, setGuestEventId] = useState('');
  const [modalGuestPhoneCountryCode, setModalGuestPhoneCountryCode] = useState(DEFAULT_PHONE_COUNTRY_CODE);
  const [modalGuestPhoneNational, setModalGuestPhoneNational] = useState('');
  const [updatingGuest, setUpdatingGuest] = useState(false);

  // Event CRUD Modals states
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventModalMode, setEventModalMode] = useState<'create' | 'edit'>('create');
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [modalEventTitle, setEventTitle] = useState('');
  const [modalEventDescription, setEventDescription] = useState('');
  const [modalEventDate, setEventDate] = useState('');
  const [modalEventLocation, setEventLocation] = useState('');
  const [modalEventReminderFrequency, setEventReminderFrequency] = useState<'NONE' | 'DAILY' | 'WEEKLY'>('NONE');
  const [modalEventLatitude, setEventLatitude] = useState('');
  const [modalEventLongitude, setEventLongitude] = useState('');
  const [modalEventTenantId, setEventTenantId] = useState('');
  const [updatingEvent, setUpdatingEvent] = useState(false);

  // Map refs for event modal
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Details Modal states
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsType, setDetailsType] = useState<'tenant' | 'user' | 'template' | 'event' | 'guest' | null>(null);
  const [detailsData, setDetailsData] = useState<any>(null);
  const [tenantSubscriptionHistory, setTenantSubscriptionHistory] = useState<TenantSubscriptionHistoryEntry[]>([]);
  const [loadingTenantHistory, setLoadingTenantHistory] = useState(false);

  // Tenant CRUD Modals states
  const [isCreateTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [tenantModalMode, setTenantModalMode] = useState<'create' | 'edit'>('create');
  const [selectedTenant, setSelectedTenant] = useState<AdminStats['tenants'][0] | null>(null);
  const [modalTenantName, setTenantName] = useState('');
  const [modalPlan, setModalPlan] = useState<PlanId>('FREE');
  const [modalLicenseActive, setModalLicenseActive] = useState(true);
  const [modalLicenseExpiresAt, setModalLicenseExpiresAt] = useState('');
  const [modalLicenseKey, setModalLicenseKey] = useState('');
  const [modalIssueInvoice, setModalIssueInvoice] = useState(false);
  const [modalExtendLicense, setModalExtendLicense] = useState(true);
  const [modalBillingDurationDays, setModalBillingDurationDays] = useState('30');
  const [modalBillingAction, setModalBillingAction] = useState<'AUTO' | 'RENEWAL' | 'PLAN_CHANGE' | 'ACTIVATION'>('AUTO');
  const [modalDiscountMode, setModalDiscountMode] = useState<'percent' | 'amount'>('percent');
  const [modalDiscountPercent, setModalDiscountPercent] = useState('0');
  const [modalApprovedAmount, setModalApprovedAmount] = useState('');
  const [updatingTenant, setUpdatingTenant] = useState(false);

  // User CRUD Modals states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userModalMode, setUserModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [modalUserName, setUserName] = useState('');
  const [modalUserEmail, setUserEmail] = useState('');
  const [modalUserPassword, setUserPassword] = useState('');
  const [modalRole, setModalRole] = useState<'SUPER_ADMIN' | 'COMMERCIAL' | 'USER'>('USER');
  const [modalIsEmailVerified, setModalIsEmailVerified] = useState(false);
  const [modalUserTenantId, setUserTenantId] = useState('');
  const [updatingUser, setUpdatingUser] = useState(false);

  // Template CRUD Modals states — édition via concepteur visuel uniquement

  // Load initial data
  useEffect(() => {
    async function loadDashboardData() {
      setError('');
      try {
        if (isPlatformStaff(user?.role)) {
          const data = await api.get('/admin/stats');
          setAdminData(data);
          return;
        }

        if (!tenant?.id) {
          return;
        }

        let eventsLoaded = false;

        try {
          const eventsData = await api.get('/events');
          const eventsList = Array.isArray(eventsData) ? eventsData : eventsData.events || [];
          setEvents(eventsList);
          eventsLoaded = true;
        } catch (err) {
          console.error('Error loading events:', err);
        }

        try {
          if (access?.canViewBilling) {
            const billingData = await api.get('/billing/status');
            setBilling(billingData);
          } else {
            const planData = await api.get('/billing/plan-features');
            setBilling({
              plan: planData.plan,
              usage: {
                events: planData.usage.events,
                guests: planData.usage.guests,
                templates: planData.usage.templates,
                rooms: planData.usage.rooms,
                orgManagers: planData.usage.orgManagers,
              },
              limits: {
                maxEvents: planData.limits.maxEvents,
                maxGuests: planData.limits.maxGuests,
                maxTemplates: planData.limits.maxTemplates,
                maxRooms: planData.limits.maxRooms,
                maxOrgManagers: planData.limits.maxOrgManagers,
                customTemplates: planData.capabilities?.customTemplates ?? false,
              },
            });
          }
        } catch (err) {
          console.error('Error loading quotas:', err);
        }

        if (!eventsLoaded) {
          setError('Impossible de charger les données du tableau de bord.');
        }
      } catch (err: any) {
        console.error('Error loading dashboard data:', err);
        setError('Impossible de charger les données du tableau de bord.');
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      loadDashboardData();
    }
  }, [user, tenant?.id, access?.canViewBilling]);

  // Load users when users tab is active
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' && activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab, user]);

  // Load templates when templates tab is active
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' && activeTab === 'templates') {
      loadTemplates();
    }
  }, [activeTab, user]);

  // Load events when events tab is active
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' && activeTab === 'events') {
      loadAdminEvents();
    }
  }, [activeTab, user]);

  // Load guests when guests tab is active
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' && activeTab === 'guests') {
      loadAdminGuests();
      loadAdminEvents(); // Also load events for the dropdown
    }
  }, [activeTab, user]);

  // Load settings when settings tab is active
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' && activeTab === 'settings') {
      loadAdminSettings();
    }
  }, [activeTab, user]);

  // Load subscription requests
  useEffect(() => {
    if (isPlatformStaff(user?.role) && activeTab === 'subscription-requests') {
      loadSubscriptionRequests();
    }
  }, [activeTab, user]);

  // Load subscription plans config
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' && (activeTab === 'subscription-plans' || activeTab === 'subscription-requests')) {
      loadAdminSettings();
    }
  }, [activeTab, user]);

  // Load platform invoices
  useEffect(() => {
    if (isPlatformStaff(user?.role) && activeTab === 'invoices') {
      setLoadingAdminInvoices(true);
      api.get('/admin/invoices')
        .then((data) => setAdminInvoices(data.invoices || []))
        .catch(console.error)
        .finally(() => setLoadingAdminInvoices(false));
    }
  }, [activeTab, user]);

  // Load revenue report when analytics tab is active
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' && activeTab === 'analytics') {
      loadRevenueReport(revenuePeriod);
      loadUsers();
      loadTemplates();
      loadAdminEvents();
    }
  }, [activeTab, user, revenuePeriod]);

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' && tabParam === 'analytics' && !sectionParam) {
      router.replace('/dashboard?tab=analytics&section=overview', { scroll: false });
    }
  }, [tabParam, sectionParam, user, router]);

  // Reset pages on search or filter change
  useEffect(() => {
    setTenantsPage(1);
    setUsersPage(1);
    setTemplatesPage(1);
    setEventsPage(1);
    setGuestsPage(1);
    setSubRequestsPage(1);
  }, [searchTerm, filterPlan, filterRole, filterType, filterRsvp]);

  // Leaflet Map Initialization Effect for Super Admin Event Modal
  useEffect(() => {
    if (!isEventModalOpen) {
      mapRef.current = null;
      markerRef.current = null;
      return;
    }

    let mapInstance: any = null;
    let markerInstance: any = null;

    const initMap = () => {
      const L = (window as any).L;
      if (!L) return;

      // Default coordinates: Kinshasa (-4.3224, 15.3070)
      const initialLat = modalEventLatitude ? parseFloat(modalEventLatitude) : -4.3224;
      const initialLng = modalEventLongitude ? parseFloat(modalEventLongitude) : 15.3070;

      const mapContainer = document.getElementById('admin-map-picker');
      if (!mapContainer) return;

      // Clear existing map container content
      mapContainer.innerHTML = '';
      const mapDiv = document.createElement('div');
      mapDiv.style.height = '100%';
      mapDiv.style.width = '100%';
      mapContainer.appendChild(mapDiv);

      try {
        mapInstance = L.map(mapDiv).setView([initialLat, initialLng], 13);
        mapRef.current = mapInstance;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapInstance);

        // Add marker if coordinates exist
        if (modalEventLatitude && modalEventLongitude) {
          markerInstance = L.marker([initialLat, initialLng], { draggable: true }).addTo(mapInstance);
          markerRef.current = markerInstance;
        }

        // Map click handler
        mapInstance.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          setEventLatitude(lat.toFixed(6));
          setEventLongitude(lng.toFixed(6));

          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            const newMarker = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
            markerRef.current = newMarker;
            
            newMarker.on('dragend', (de: any) => {
              const position = newMarker.getLatLng();
              setEventLatitude(position.lat.toFixed(6));
              setEventLongitude(position.lng.toFixed(6));
            });
          }
        });

        if (markerInstance) {
          markerInstance.on('dragend', (de: any) => {
            const position = markerInstance.getLatLng();
            setEventLatitude(position.lat.toFixed(6));
            setEventLongitude(position.lng.toFixed(6));
          });
        }
      } catch (err) {
        console.error('Error initializing Leaflet map for admin:', err);
      }
    };

    // Check if Leaflet is already loaded
    if (!(window as any).L) {
      // Load CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      // Load JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        initMap();
      };
      document.body.appendChild(script);
    } else {
      // Wait a brief moment for the modal transition to complete and container to be rendered
      const timer = setTimeout(initMap, 200);
      return () => clearTimeout(timer);
    }

    return () => {
      if (mapInstance) {
        try {
          mapInstance.remove();
        } catch (e) {
          console.error('Error removing map instance:', e);
        }
      }
    };
  }, [isEventModalOpen]);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await api.get('/admin/users');
      setUsers(data);
    } catch (err: any) {
      console.error('Error loading users:', err);
      setError('Impossible de charger la liste des utilisateurs.');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const data = await api.get('/admin/templates');
      setTemplates(data);
    } catch (err: any) {
      console.error('Error loading templates:', err);
      setError('Impossible de charger la liste des modèles.');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const loadAdminEvents = async () => {
    setAdminEventsLoading(true);
    try {
      const data = await api.get('/admin/events');
      setAdminEvents(data);
    } catch (err: any) {
      console.error('Error loading admin events:', err);
      setError('Impossible de charger la liste des événements.');
    } finally {
      setAdminEventsLoading(false);
    }
  };

  const loadAdminGuests = async () => {
    setAdminGuestsLoading(true);
    try {
      const data = await api.get('/admin/guests');
      setAdminGuests(data);
    } catch (err: any) {
      console.error('Error loading admin guests:', err);
      setError('Impossible de charger la liste des invités.');
    } finally {
      setAdminGuestsLoading(false);
    }
  };

  const loadAdminSettings = async () => {
    setAdminSettingsLoading(true);
    try {
      const data = await api.get('/admin/settings');
      setAdminSettings(data);
    } catch (err: any) {
      console.error('Error loading admin settings:', err);
      setError('Impossible de charger les configurations.');
    } finally {
      setAdminSettingsLoading(false);
    }
  };

  const loadSubscriptionRequests = async () => {
    setSubRequestsLoading(true);
    try {
      const data = await api.get('/admin/subscriptions/requests');
      setSubscriptionRequests(data);
    } catch (err: any) {
      console.error('Error loading subscription requests:', err);
      setError('Impossible de charger les demandes d\'abonnement.');
    } finally {
      setSubRequestsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'COMMERCIAL') return;
    loadSubscriptionRequests();
    api.get('/commercial/dashboard')
      .then((data) => setCommercialOverview(data))
      .catch(() => setCommercialOverview(null));
    api.get('/public/plans')
      .then((plans) => setAdminSettings((prev: any) => ({ ...(prev || {}), plans })))
      .catch(console.error);
  }, [user?.role]);

  const loadRevenueReport = async (period: string) => {
    setLoadingRevenueReport(true);
    try {
      const data = await api.get(`/admin/reports/revenue?period=${period}`);
      setRevenueReport(data);
    } catch (err: any) {
      console.error('Error loading revenue report:', err);
      setError('Impossible de charger le rapport de revenus.');
    } finally {
      setLoadingRevenueReport(false);
    }
  };

  const exportRevenueReport = async (format: 'csv' | 'pdf') => {
    try {
      await api.download(
        `/admin/reports/revenue/export?period=${revenuePeriod}&format=${format}`,
        `eventmaster-revenus-${revenuePeriod}.${format}`,
      );
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'export du rapport.');
    }
  };

  const handleApproveSubscription = async (
    id: string,
    options?: { discountPercent?: number; approvedAmount?: number },
  ) => {
    try {
      const response = await api.post(`/admin/subscriptions/requests/${id}/approve`, {
        discountPercent: options?.discountPercent ?? 0,
        approvedAmount: options?.approvedAmount,
      });
      await loadSubscriptionRequests();
      await refreshStats();
      if (activeTab === 'invoices') {
        const data = await api.get('/admin/invoices');
        setAdminInvoices(data.invoices || []);
      }
      return {
        message: response.message || 'Demande approuvée avec succès !',
        billingAction: response.billingAction,
        tenant: response.tenant,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'approbation.';
      throw new Error(message);
    }
  };

  const handleRejectSubscription = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir rejeter cette demande d\'abonnement ?')) {
      return;
    }
    try {
      const response = await api.post(`/admin/subscriptions/requests/${id}/reject`);
      alert(response.message || 'Demande rejetée.');
      await loadSubscriptionRequests();
    } catch (err: any) {
      alert(err.message || 'Erreur lors du rejet de la demande.');
    }
  };

  const refreshStats = async () => {
    try {
      const data = await api.get('/admin/stats');
      setAdminData(data);
    } catch (err) {
      console.error('Error refreshing stats:', err);
    }
  };

  // Tenant handlers
  const handleOpenCreateTenantModal = () => {
    setTenantModalMode('create');
    setSelectedTenant(null);
    setTenantName('');
    setModalPlan('FREE');
    setModalLicenseActive(true);
    setModalLicenseExpiresAt('');
    setModalLicenseKey('');
    setModalIssueInvoice(false);
    setModalExtendLicense(true);
    setModalBillingDurationDays('30');
    setModalBillingAction('AUTO');
    setModalDiscountPercent('0');
    setModalApprovedAmount('');
    setIsTenantModalOpen(true);
  };

  const handleOpenEditTenantModal = (t: AdminStats['tenants'][0]) => {
    setTenantModalMode('edit');
    setSelectedTenant(t);
    setTenantName(t.name);
    setModalPlan(t.plan);
    setModalLicenseActive(t.licenseActive);
    setModalLicenseExpiresAt(t.licenseExpiresAt ? t.licenseExpiresAt.split('T')[0] : '');
    setModalLicenseKey(t.licenseKey || '');
    setModalIssueInvoice(false);
    setModalExtendLicense(false);
    setModalBillingDurationDays('30');
    setModalBillingAction('AUTO');
    setModalDiscountPercent('0');
    setModalApprovedAmount('');
    setIsTenantModalOpen(true);
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTenantName) {
      alert('Le nom de l\'organisation est requis.');
      return;
    }

    setUpdatingTenant(true);
    try {
      if (tenantModalMode === 'create') {
        await api.post('/admin/tenants', {
          name: modalTenantName,
          plan: modalPlan,
          licenseActive: modalLicenseActive,
          licenseExpiresAt: modalLicenseExpiresAt ? new Date(modalLicenseExpiresAt).toISOString() : null,
          licenseKey: modalLicenseKey || null,
        });
      } else if (selectedTenant) {
        const pricing = getBillingPricingFromFields(
          modalPlan,
          modalDiscountMode,
          modalDiscountPercent,
          modalApprovedAmount,
          planCatalogPrices?.[modalPlan],
        );
        const payload: Record<string, unknown> = {
          name: modalTenantName,
          plan: modalPlan,
          licenseActive: modalLicenseActive,
          licenseExpiresAt: modalLicenseExpiresAt ? new Date(modalLicenseExpiresAt).toISOString() : null,
          licenseKey: modalLicenseKey || null,
        };
        if (modalIssueInvoice && modalPlan !== 'FREE') {
          payload.billing = {
            issueInvoice: true,
            action: modalBillingAction === 'AUTO' ? undefined : modalBillingAction,
            durationDays: parseInt(modalBillingDurationDays, 10) || 30,
            extendLicense: modalExtendLicense,
            discountPercent: pricing.discountPercent,
            approvedAmount: pricing.approvedAmount,
          };
        }
        const response = await api.put(`/admin/tenants/${selectedTenant.id}`, payload);
        if (response.billing?.invoice) {
          alert(
            `${response.message || 'Organisation mise à jour.'}\n\nFacture ${response.billing.invoice.invoiceNumber} — ${response.billing.invoice.amount?.toLocaleString('fr-FR')} FC`,
          );
        }
      }
      setIsTenantModalOpen(false);
      await refreshStats();
      if (activeTab === 'invoices') {
        const data = await api.get('/admin/invoices');
        setAdminInvoices(data.invoices || []);
      }
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'enregistrement de l\'organisation');
    } finally {
      setUpdatingTenant(false);
    }
  };

  const handleDeleteTenant = async (id: string, name: string) => {
    if (!confirm(`Êtes-vous absolument sûr de vouloir supprimer définitivement l'organisation "${name}" ? Cette action supprimera également tous ses utilisateurs, événements, invités et invitations associés.`)) {
      return;
    }
    if (!confirm(`CONFIRMATION FINALE : Tapez OK pour confirmer la destruction de "${name}".`)) {
      return;
    }

    try {
      await api.delete(`/admin/tenants/${id}`);
      await refreshStats();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression de l\'organisation');
    }
  };

  // User handlers
  const handleOpenCreateUserModal = () => {
    setUserModalMode('create');
    setSelectedUser(null);
    setUserName('');
    setUserEmail('');
    setUserPassword('');
    setModalRole('USER');
    setModalIsEmailVerified(false);
    setUserTenantId('');
    setIsUserModalOpen(true);
  };

  const handleOpenEditUserModal = (u: AdminUserItem) => {
    setUserModalMode('edit');
    setSelectedUser(u);
    setUserName(u.name || '');
    setUserEmail(u.email);
    setUserPassword(''); // Keep empty, only fill if changing password
    setModalRole(u.role);
    setModalIsEmailVerified(u.isEmailVerified);
    setUserTenantId(u.tenantId || '');
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalUserEmail) {
      alert('L\'adresse email est requise.');
      return;
    }
    if (userModalMode === 'create' && !modalUserPassword) {
      alert('Le mot de passe est requis pour un nouvel utilisateur.');
      return;
    }

    setUpdatingUser(true);
    try {
      if (userModalMode === 'create') {
        await api.post('/admin/users', {
          name: modalUserName || null,
          email: modalUserEmail,
          password: modalUserPassword,
          role: modalRole,
          isEmailVerified: modalIsEmailVerified,
          tenantId: modalUserTenantId || null,
        });
      } else if (selectedUser) {
        await api.put(`/admin/users/${selectedUser.id}`, {
          name: modalUserName || null,
          email: modalUserEmail,
          password: modalUserPassword || undefined,
          role: modalRole,
          isEmailVerified: modalIsEmailVerified,
          tenantId: modalUserTenantId || null,
        });
      }
      setIsUserModalOpen(false);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'enregistrement de l\'utilisateur');
    } finally {
      setUpdatingUser(false);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${email}" ?`)) {
      return;
    }

    try {
      await api.delete(`/admin/users/${id}`);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression de l\'utilisateur');
    }
  };

  // Template handlers — création/édition via /dashboard/templates (concepteur visuel)
  const handleToggleTemplateLanding = async (id: string, currentStatus: boolean) => {
    try {
      await api.put(`/admin/templates/${id}/landing`, {
        showOnLanding: !currentStatus,
      });
      await loadTemplates();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour de la visibilité sur la landing page');
    }
  };

  const handleDuplicateAdminTemplate = async (t: any) => {
    try {
      // For admin templates, we can duplicate by posting to /templates using the visual editor's endpoint
      const payload = {
        name: `${t.name} (Copie)`,
        content: t.content,
        targetTenantId: t.tenantId || null
      };
      await api.post('/templates', payload);
      alert(`Modèle "${t.name}" dupliqué avec succès !`);
      await loadTemplates();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la duplication du modèle');
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le modèle "${name}" ?`)) {
      return;
    }

    try {
      await api.delete(`/admin/templates/${id}`);
      await loadTemplates();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression du modèle');
    }
  };

  // Event handlers for Super Admin
  const handleOpenCreateEventModal = () => {
    setEventModalMode('create');
    setSelectedEvent(null);
    setEventTitle('');
    setEventDescription('');
    setEventDate('');
    setEventLocation('');
    setEventReminderFrequency('NONE');
    setEventLatitude('');
    setEventLongitude('');
    setEventTenantId('');
    setIsEventModalOpen(true);
  };

  const handleOpenEditEventModal = (e: any) => {
    setEventModalMode('edit');
    setSelectedEvent(e);
    setEventTitle(e.title);
    setEventDescription(e.description || '');
    setEventDate(e.date ? new Date(e.date).toISOString().slice(0, 16) : '');
    setEventLocation(e.location);
    setEventReminderFrequency(e.reminderFrequency || 'NONE');
    setEventLatitude(e.latitude !== null && e.latitude !== undefined ? e.latitude.toString() : '');
    setEventLongitude(e.longitude !== null && e.longitude !== undefined ? e.longitude.toString() : '');
    setEventTenantId(e.tenantId || '');
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEventTitle || !modalEventDate || !modalEventLocation || !modalEventTenantId) {
      alert('Veuillez remplir tous les champs obligatoires (Titre, Date, Lieu, Organisation).');
      return;
    }

    setUpdatingEvent(true);
    try {
      const payload = {
        title: modalEventTitle,
        description: modalEventDescription,
        date: modalEventDate,
        location: modalEventLocation,
        reminderFrequency: modalEventReminderFrequency,
        latitude: modalEventLatitude ? parseFloat(modalEventLatitude) : null,
        longitude: modalEventLongitude ? parseFloat(modalEventLongitude) : null,
        tenantId: modalEventTenantId,
      };

      if (eventModalMode === 'create') {
        await api.post('/admin/events', payload);
        alert('Événement créé avec succès !');
      } else {
        await api.put(`/admin/events/${selectedEvent.id}`, payload);
        alert('Événement mis à jour avec succès !');
      }

      setIsEventModalOpen(false);
      await loadAdminEvents();
      await refreshStats();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'enregistrement de l\'événement');
    } finally {
      setUpdatingEvent(false);
    }
  };

  const handleDeleteEvent = async (id: string, title: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'événement "${title}" ?`)) {
      return;
    }

    try {
      await api.delete(`/admin/events/${id}`);
      await loadAdminEvents();
      await refreshStats();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression de l\'événement');
    }
  };

  const handleOpenCreateGuestModal = () => {
    setGuestModalMode('create');
    setSelectedGuest(null);
    setGuestFirstName('');
    setGuestLastName('');
    setGuestEmail('');
    setGuestCategory('Général');
    setGuestRsvp('PENDING');
    setGuestEventId(adminEvents[0]?.id || '');
    setModalGuestPhoneCountryCode(DEFAULT_PHONE_COUNTRY_CODE);
    setModalGuestPhoneNational('');
    setIsGuestModalOpen(true);
  };

  const handleOpenEditGuestModal = (guest: any) => {
    setGuestModalMode('edit');
    setSelectedGuest(guest);
    setGuestFirstName(guest.firstName);
    setGuestLastName(guest.lastName);
    setGuestEmail(guest.email);
    setGuestCategory(guest.category || 'Général');
    setGuestRsvp(guest.rsvp || 'PENDING');
    setGuestEventId(guest.eventId);
    const parts = parseStoredPhone(
      guest.phone || guest.preferences?.phone || guest.preferences?.telephone,
      guest.phoneCountryCode,
    );
    setModalGuestPhoneCountryCode(parts.countryCode);
    setModalGuestPhoneNational(parts.national);
    setIsGuestModalOpen(true);
  };

  const handleSaveGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalGuestFirstName || !modalGuestLastName || !modalGuestEmail || !modalGuestEventId) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setUpdatingGuest(true);
    try {
      const e164 = composeE164(modalGuestPhoneCountryCode, modalGuestPhoneNational) || undefined;
      const payload = {
        eventId: modalGuestEventId,
        firstName: modalGuestFirstName,
        lastName: modalGuestLastName,
        email: modalGuestEmail,
        category: modalGuestCategory,
        rsvp: modalGuestRsvp,
        phone: e164,
        phoneCountryCode: modalGuestPhoneCountryCode,
        nationalNumber: modalGuestPhoneNational,
        preferences: selectedGuest?.preferences || {},
      };

      if (guestModalMode === 'create') {
        await api.post('/admin/guests', payload);
        alert('Invité créé avec succès !');
      } else {
        await api.put(`/admin/guests/${selectedGuest.id}`, payload);
        alert('Invité mis à jour avec succès !');
      }

      setIsGuestModalOpen(false);
      await loadAdminGuests();
      await refreshStats();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'enregistrement de l\'invité');
    } finally {
      setUpdatingGuest(false);
    }
  };

  const handleDeleteGuest = async (id: string, name: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'invité "${name}" ?`)) {
      return;
    }

    try {
      await api.delete(`/admin/guests/${id}`);
      await loadAdminGuests();
      await refreshStats();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression de l\'invité');
    }
  };

  const handleExportAdminGuests = () => {
    if (adminGuests.length === 0) {
      alert("Aucun invité à exporter.");
      return;
    }
    
    const headers = ["Prénom", "Nom", "Email", "Téléphone", "Catégorie", "Statut RSVP", "Événement", "Organisation"];
    const rows = adminGuests.map(g => {
      const phone = g.phone || g.preferences?.phone || g.preferences?.telephone || "";
      return [
        g.firstName,
        g.lastName,
        g.email,
        phone,
        g.category || "Général",
        g.rsvp === "ACCEPTED" ? "Accepté" : g.rsvp === "DECLINED" ? "Décliné" : "En attente",
        g.eventTitle,
        g.tenantName
      ];
    });
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tous_les_invites_eventmaster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.put('/admin/settings', adminSettings);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('em-platform-settings-updated'));
      }
      alert('Paramètres enregistrés. Le site public applique immédiatement les changements.');
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'enregistrement des configurations');
    } finally {
      setSavingSettings(false);
    }
  };

  const loadTenantSubscriptionHistory = async (tenantId: string) => {
    setLoadingTenantHistory(true);
    setTenantSubscriptionHistory([]);
    try {
      const data = await api.get(`/admin/tenants/${tenantId}/subscription-history`);
      setTenantSubscriptionHistory(data.history || []);
    } catch (err) {
      console.error(err);
      setTenantSubscriptionHistory([]);
    } finally {
      setLoadingTenantHistory(false);
    }
  };

  const handleOpenDetailsModal = (type: 'tenant' | 'user' | 'template' | 'event' | 'guest', data: any) => {
    setDetailsType(type as any);
    setDetailsData(data);
    setIsDetailsModalOpen(true);
    if (type === 'tenant') {
      loadTenantSubscriptionHistory(data.id);
    } else {
      setTenantSubscriptionHistory([]);
    }
  };

  const orgQuota: QuotaSnapshot | null = React.useMemo(() => {
    if (isPlatformStaff(user?.role)) return null;
    if (billing) {
      return { usage: billing.usage, limits: billing.limits };
    }
    if (planQuota) {
      return {
        usage: planQuota.usage,
        limits: planQuota.limits,
      };
    }
    return null;
  }, [billing, planQuota, user?.role]);

  if (loading) {
    return <SkeletonDashboardHome />;
  }

  const getPercentage = (value: number, max: number) => {
    if (max === 0) return 0;
    return Math.min(Math.round((value / max) * 100), 100);
  };

  // Render Super Admin / Commercial plateforme Dashboard
  if (isPlatformStaff(user?.role)) {
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const isCommercialPlatform = user?.role === 'COMMERCIAL';
    const pendingSubscriptionCount = subscriptionRequests.filter((r) => r.status === 'PENDING').length;
    // Filter tenants
    const filteredTenants = adminData?.tenants.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.managerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.managerEmail.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPlan = filterPlan === 'ALL' || t.plan === filterPlan;
      return matchesSearch && matchesPlan;
    }) || [];

    // Filter users
    const filteredUsers = users.filter(u => {
      const matchesSearch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            u.tenantName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === 'ALL' || u.role === filterRole;
      return matchesSearch && matchesRole;
    });

    // Filter templates
    const filteredTemplates = templates.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.tenantName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'ALL' || 
                          (filterType === 'GLOBAL' && t.isGlobal) || 
                          (filterType === 'TENANT' && !t.isGlobal);
      return matchesSearch && matchesType;
    });

    // Filter events
    const filteredEvents = adminEvents.filter(e => 
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.location.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.tenantName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filter guests
    const filteredGuests = adminGuests.filter(g => {
      const matchesSearch = g.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            g.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            g.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            g.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            g.eventTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            g.tenantName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRsvp = filterRsvp === 'ALL' || g.rsvp === filterRsvp;
      return matchesSearch && matchesRsvp;
    });

    const paginatedTenants = paginateItems(filteredTenants, tenantsPage, TENANTS_PER_PAGE);
    const paginatedUsers = paginateItems(filteredUsers, usersPage, ITEMS_PER_PAGE);
    const paginatedTemplates = paginateItems(filteredTemplates, templatesPage, TEMPLATE_CARDS_PER_PAGE);
    const paginatedEvents = paginateItems(filteredEvents, eventsPage, ITEMS_PER_PAGE);
    const paginatedGuests = paginateItems(filteredGuests, guestsPage, ITEMS_PER_PAGE);
    const paginatedSubRequests = paginateItems(subscriptionRequests, subRequestsPage, SUB_REQUESTS_PER_PAGE);
    const paginatedPlanIds = paginateItems([...PLAN_IDS], plansPage, PLANS_PER_PAGE);

    const activeLicensesCount = (adminData?.tenants || []).filter((t) => {
      const expired = Boolean(t.licenseExpiresAt && new Date(t.licenseExpiresAt) < new Date());
      return t.licenseActive && !expired;
    }).length;
    const paidPlansCount = (adminData?.tenants || []).filter((t) => t.plan !== 'FREE').length;

    const tabMeta = ADMIN_TAB_META[activeTab as AdminTabId] || ADMIN_TAB_META.tenants;
    const commercialOverrides: Partial<Record<AdminTabId, { description: string }>> = {
      tenants: { description: 'Organisations liées à votre code de parrainage (plan, licence, gérant).' },
      'subscription-requests': { description: 'Approuvez ou refusez les demandes de vos organisations parrainées.' },
      invoices: { description: 'Factures de vos organisations parrainées et commissions associées.' },
    };
    const panelDescription = isCommercialPlatform && commercialOverrides[activeTab as AdminTabId]
      ? commercialOverrides[activeTab as AdminTabId]!.description
      : tabMeta.description;

    const statCardClass = 'bg-surface border border-border rounded-[var(--radius-card)] p-4 sm:p-5 space-y-3';

    return (
      <>
      <div className="space-y-6">
        <PageHeader
          title={isCommercialPlatform ? 'Espace commercial' : 'Console Super Admin'}
          description={
            isCommercialPlatform
              ? 'Parrainage, validation des abonnements et suivi des commissions.'
              : 'Pilotage global de la plateforme EventMaster : organisations, contenu, facturation.'
          }
          breadcrumbs={
            <Breadcrumbs
              items={[
                { label: isCommercialPlatform ? 'Commercial' : 'Super Admin' },
                { label: tabMeta.title },
              ]}
            />
          }
        />

        {error && <Alert variant="error">{error}</Alert>}

        {adminData && (
          <div className={`grid gap-3 ${isCommercialPlatform ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-2 xl:grid-cols-4'}`}>
            <div className={statCardClass}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                  {isCommercialPlatform ? 'Parrainées' : 'Organisations'}
                </span>
                <div className="bg-primary/10 text-primary p-1.5 rounded-[var(--radius-button)]">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-semibold text-foreground tracking-tight">{adminData.stats.tenants}</span>
                <p className="text-[11px] text-muted mt-1">
                  {isCommercialPlatform
                    ? 'Liées à votre code'
                    : `${activeLicensesCount} licence${activeLicensesCount !== 1 ? 's' : ''} active${activeLicensesCount !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>

            {isCommercialPlatform ? (
              <>
                <div className={statCardClass}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Membres liés</span>
                    <div className="bg-primary/10 text-primary p-1.5 rounded-[var(--radius-button)]">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-semibold text-foreground tracking-tight">{adminData.stats.users}</span>
                    <p className="text-[11px] text-muted mt-1">
                      {adminData.stats.events} événement{adminData.stats.events !== 1 ? 's' : ''} · {adminData.stats.guests} invité{adminData.stats.guests !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className={statCardClass}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">En attente</span>
                    <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 p-1.5 rounded-[var(--radius-button)]">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-semibold text-foreground tracking-tight">{pendingSubscriptionCount}</span>
                    <p className="text-[11px] text-muted mt-1">Demandes à traiter</p>
                  </div>
                </div>
                <div className={statCardClass}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Commission</span>
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 p-1.5 rounded-[var(--radius-button)]">
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-semibold text-foreground tracking-tight">
                      {(commercialOverview?.stats?.monthlyCommission ?? 0).toLocaleString('fr-FR')} FC
                    </span>
                    <p className="text-[11px] text-muted mt-1">
                      {(commercialOverview?.stats?.totalCommission ?? 0).toLocaleString('fr-FR')} FC au total
                      {commercialOverview?.commissionRate != null
                        ? ` · ${Math.round(commercialOverview.commissionRate * 100)} %`
                        : ''}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className={statCardClass}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Utilisateurs</span>
                    <div className="bg-primary/10 text-primary p-1.5 rounded-[var(--radius-button)]">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-semibold text-foreground tracking-tight">{adminData.stats.users}</span>
                    <p className="text-[11px] text-muted mt-1">
                      {paidPlansCount} org. payante{paidPlansCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className={statCardClass}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Événements</span>
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 p-1.5 rounded-[var(--radius-button)]">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-semibold text-foreground tracking-tight">{adminData.stats.events}</span>
                    <p className="text-[11px] text-muted mt-1">Tous tenants confondus</p>
                  </div>
                </div>
                <div className={statCardClass}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                      {pendingSubscriptionCount > 0 ? 'Demandes' : 'Invités'}
                    </span>
                    <div className={cn(
                      'p-1.5 rounded-[var(--radius-button)]',
                      pendingSubscriptionCount > 0
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600',
                    )}>
                      {pendingSubscriptionCount > 0 ? <Clock className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-semibold text-foreground tracking-tight">
                      {pendingSubscriptionCount > 0 ? pendingSubscriptionCount : adminData.stats.guests}
                    </span>
                    <p className="text-[11px] text-muted mt-1">
                      {pendingSubscriptionCount > 0
                        ? `Abonnements en attente · ${adminData.stats.guests} invités`
                        : 'Enregistrés au total'}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <div className="bg-surface border border-border rounded-[var(--radius-card)] overflow-hidden">
          <div className="border-b border-border bg-surface-muted/50 px-5 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
                {activeTab === 'tenants' && <Building2 className="w-4.5 h-4.5 text-primary shrink-0" />}
                {activeTab === 'users' && <Users className="w-4.5 h-4.5 text-primary shrink-0" />}
                {activeTab === 'templates' && <FileText className="w-4.5 h-4.5 text-primary shrink-0" />}
                {activeTab === 'message-templates' && <MessageSquare className="w-4.5 h-4.5 text-primary shrink-0" />}
                {activeTab === 'events' && <Calendar className="w-4.5 h-4.5 text-primary shrink-0" />}
                {activeTab === 'guests' && <Users className="w-4.5 h-4.5 text-primary shrink-0" />}
                {activeTab === 'analytics' && <BarChart3 className="w-4.5 h-4.5 text-primary shrink-0" />}
                {activeTab === 'settings' && <Key className="w-4.5 h-4.5 text-primary shrink-0" />}
                {activeTab === 'subscription-requests' && <Clock className="w-4.5 h-4.5 text-primary shrink-0" />}
                {activeTab === 'subscription-plans' && <CreditCard className="w-4.5 h-4.5 text-primary shrink-0" />}
                {activeTab === 'invoices' && <FileText className="w-4.5 h-4.5 text-primary shrink-0" />}
                {tabMeta.title}
              </h2>
              <p className="text-xs text-muted mt-1 leading-relaxed max-w-2xl">{panelDescription}</p>
              {!isCommercialPlatform && tabMeta.tip && (
                <p className="text-[11px] text-primary mt-2 font-medium">{tabMeta.tip}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {activeTab === 'tenants' && (
                isCommercialPlatform ? (
                  <Link href="/dashboard/commercial">
                    <Button type="button" size="sm" variant="secondary" leftIcon={<Plus className="w-4 h-4" />}>
                      Nouvelle organisation
                    </Button>
                  </Link>
                ) : (
                  <Button type="button" size="sm" onClick={handleOpenCreateTenantModal} leftIcon={<Plus className="w-4 h-4" />}>
                    Créer une organisation
                  </Button>
                )
              )}

              {activeTab === 'users' && isSuperAdmin && (
                <Button type="button" size="sm" onClick={handleOpenCreateUserModal} leftIcon={<Plus className="w-4 h-4" />}>
                  Créer un utilisateur
                </Button>
              )}

              {activeTab === 'templates' && isSuperAdmin && (
                <Link href="/dashboard/templates?new=1&from=admin">
                  <Button type="button" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                    Nouveau modèle
                  </Button>
                </Link>
              )}

              {activeTab === 'events' && isSuperAdmin && (
                <Button type="button" size="sm" onClick={handleOpenCreateEventModal} leftIcon={<Plus className="w-4 h-4" />}>
                  Créer un événement
                </Button>
              )}

              {activeTab === 'guests' && isSuperAdmin && (
                <div className="flex gap-2">
                  {adminGuests.length > 0 && (
                    <Button type="button" size="sm" variant="secondary" onClick={handleExportAdminGuests} leftIcon={<Download className="w-4 h-4" />}>
                      Exporter CSV
                    </Button>
                  )}
                  <Button type="button" size="sm" onClick={handleOpenCreateGuestModal} leftIcon={<Plus className="w-4 h-4" />}>
                    Créer un invité
                  </Button>
                </div>
              )}
            </div>
          </div>

          {activeTab === 'analytics' && user?.role === 'SUPER_ADMIN' && (
            <div className="px-5 py-3 border-b border-border bg-surface">
              <div className="inline-flex flex-wrap gap-0.5 p-0.5 bg-surface-muted border border-border rounded-[var(--radius-button)]">
                {ANALYTICS_SECTIONS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAnalyticsSection(id)}
                    className={cn(
                      'inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      activeAnalyticsSection === id
                        ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
                        : 'text-muted hover:text-foreground',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filters and search */}
          {activeTab !== 'analytics' && activeTab !== 'settings' && activeTab !== 'subscription-requests' && activeTab !== 'subscription-plans' && activeTab !== 'invoices' && activeTab !== 'message-templates' && (
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input
                type="text"
                placeholder={
                  activeTab === 'tenants' ? "Rechercher une organisation, un gérant..." :
                  activeTab === 'users' ? "Rechercher un utilisateur, un email, une organisation..." :
                  activeTab === 'events' ? "Rechercher un événement, un lieu, une organisation..." :
                  activeTab === 'guests' ? "Rechercher un invité, un email, une catégorie..." :
                  "Rechercher un modèle..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition"
              />
            </div>

            {activeTab === 'tenants' && (
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="w-4.5 h-4.5 text-slate-400 flex-shrink-0" />
                <select
                  value={filterPlan}
                  onChange={(e) => setFilterPlan(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition"
                >
                  <option value="ALL">Tous les plans</option>
                  {PLAN_IDS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <ViewModeToggle
                  storageKey="em-view-admin-tenants"
                  value={tenantsViewMode}
                  onChange={setTenantsViewMode}
                  columns={tenantsColumns}
                  onColumnsChange={setTenantsColumns}
                  defaultMode="grid"
                  defaultColumns={3}
                />
              </div>
            )}

            {activeTab === 'users' && (
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="w-4.5 h-4.5 text-slate-400 flex-shrink-0" />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition"
                >
                  <option value="ALL">Tous les rôles</option>
                  <option value="USER">USER</option>
                  <option value="COMMERCIAL">COMMERCIAL</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
                <ViewModeToggle
                  storageKey="em-view-admin-users"
                  value={usersViewMode}
                  onChange={setUsersViewMode}
                  columns={usersColumns}
                  onColumnsChange={setUsersColumns}
                  defaultMode="grid"
                  defaultColumns={3}
                />
              </div>
            )}

            {activeTab === 'events' && (
              <div className="flex flex-wrap items-center gap-2">
                <ViewModeToggle
                  storageKey="em-view-admin-events"
                  value={adminEventsViewMode}
                  onChange={setAdminEventsViewMode}
                  columns={adminEventsColumns}
                  onColumnsChange={setAdminEventsColumns}
                  defaultMode="grid"
                  defaultColumns={3}
                />
              </div>
            )}

            {activeTab === 'templates' && isSuperAdmin && (
              <div className="flex items-center gap-2">
                <Filter className="w-4.5 h-4.5 text-slate-400 flex-shrink-0" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition"
                >
                  <option value="ALL">Tous les modèles</option>
                  <option value="GLOBAL">Modèles Globaux (Publics)</option>
                  <option value="TENANT">Modèles d'organisations</option>
                </select>
              </div>
            )}

            {activeTab === 'guests' && (
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="w-4.5 h-4.5 text-slate-400 flex-shrink-0" />
                <select
                  value={filterRsvp}
                  onChange={(e) => setFilterRsvp(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition"
                >
                  <option value="ALL">Tous les statuts RSVP</option>
                  <option value="PENDING">En attente (PENDING)</option>
                  <option value="ACCEPTED">Accepté (ACCEPTED)</option>
                  <option value="DECLINED">Décliné (DECLINED)</option>
                </select>
                <ViewModeToggle
                  storageKey="em-view-admin-guests"
                  value={guestsViewMode}
                  onChange={setGuestsViewMode}
                  columns={guestsColumns}
                  onColumnsChange={setGuestsColumns}
                  defaultMode="grid"
                  defaultColumns={3}
                />
              </div>
            )}
          </div>
          )}

          {/* Content area */}
          <div className="p-5 sm:p-6 bg-surface">
            {/* Tenants Tab */}
            {activeTab === 'tenants' && (
              <div className="space-y-4">
                {filteredTenants.length === 0 ? (
                  <p className="text-center text-muted text-sm py-10">Aucune organisation trouvée.</p>
                ) : (
                  <div
                    className={
                      tenantsViewMode === 'grid'
                        ? tenantsGridClass
                        : listStackClass
                    }
                  >
                    {paginatedTenants.map((t) => {
                      const licenseExpired = Boolean(t.licenseExpiresAt && new Date(t.licenseExpiresAt) < new Date());
                      const licenseLabel = t.licenseActive
                        ? (licenseExpired ? 'Licence expirée' : 'Licence active')
                        : 'Licence désactivée';
                      const licenseShort = licenseLabel.replace('Licence ', '');
                      const planChip = (
                        <StatusPill tone={t.plan === 'FREE' ? 'slate' : t.plan.startsWith('ENTERPRISE') ? 'amber' : 'primary'}>
                          {t.plan}
                        </StatusPill>
                      );
                      const licenseChip = (
                        <StatusPill
                          tone={t.licenseActive && !licenseExpired ? 'emerald' : 'rose'}
                        >
                          {licenseShort}
                        </StatusPill>
                      );

                      const actions = (
                        <>
                          {tenantsViewMode === 'list' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenDetailsModal('tenant', t)}
                              className="inline-flex items-center"
                              title="Voir détails"
                            >
                              <ListRowAction />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDetailsModal('tenant', t)}
                              className="p-1.5 text-muted hover:text-foreground hover:bg-surface-muted rounded-md transition"
                              title="Détails"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {!isCommercialPlatform && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditTenantModal(t)}
                                className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded-md transition"
                                title="Modifier"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTenant(t.id, t.name)}
                                className="p-1.5 text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </>
                      );

                      return (
                        <ProjectCard
                          key={t.id}
                          id={t.id}
                          title={t.name}
                          layout={tenantsViewMode}
                          onClick={() => handleOpenDetailsModal('tenant', t)}
                          meta={
                            tenantsViewMode === 'list' ? (
                              <span>
                                {t.managerName || t.managerEmail || 'Sans gérant'}
                                {' · '}
                                {t.usersCount} membre{t.usersCount !== 1 ? 's' : ''}
                              </span>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {planChip}
                                  {licenseChip}
                                </div>
                                <p className="truncate">
                                  {t.managerName || 'Sans gérant'}
                                  {t.managerEmail ? ` · ${t.managerEmail}` : ''}
                                </p>
                              </div>
                            )
                          }
                          value={
                            tenantsViewMode === 'list'
                              ? `${t.eventsCount} évén.`
                              : undefined
                          }
                          valueMeta={
                            tenantsViewMode === 'list'
                              ? `Inscrite le ${new Date(t.createdAt).toLocaleDateString('fr-FR')}`
                              : undefined
                          }
                          status={tenantsViewMode === 'list' ? planChip : undefined}
                          aside={tenantsViewMode === 'list' ? licenseChip : undefined}
                          description={
                            tenantsViewMode === 'grid'
                              ? `Inscrite le ${new Date(t.createdAt).toLocaleDateString('fr-FR')}`
                              : undefined
                          }
                          footer={
                            tenantsViewMode === 'grid' ? (
                              <span className="text-[11px] text-muted">
                                {t.usersCount} membre{t.usersCount !== 1 ? 's' : ''} · {t.eventsCount} événement{t.eventsCount !== 1 ? 's' : ''}
                              </span>
                            ) : undefined
                          }
                          actions={actions}
                        />
                      );
                    })}
                  </div>
                )}

                <Pagination
                  page={tenantsPage}
                  pageSize={TENANTS_PER_PAGE}
                  total={filteredTenants.length}
                  onPageChange={setTenantsPage}
                  itemLabel="organisations"
                />
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                {usersLoading ? (
                  <SkeletonTabContent mode={usersViewMode === 'list' ? 'list' : 'grid'} count={6} columns={3} />
                ) : filteredUsers.length === 0 ? (
                  <p className="text-center text-muted text-sm py-10">Aucun utilisateur trouvé.</p>
                ) : (
                  <>
                    <div
                      className={
                        usersViewMode === 'grid' ? usersGridClass : listStackClass
                      }
                    >
                      {paginatedUsers.map((u) => {
                        const roleTone =
                          u.role === 'SUPER_ADMIN' ? 'rose' : u.role === 'COMMERCIAL' ? 'amber' : 'slate';
                        const roleChip = (
                          <StatusPill tone={roleTone as 'rose' | 'amber' | 'slate'}>{u.role}</StatusPill>
                        );
                        const verifiedChip = (
                          <StatusPill tone={u.isEmailVerified ? 'emerald' : 'slate'}>
                            {u.isEmailVerified ? 'Vérifié' : 'Non vérifié'}
                          </StatusPill>
                        );
                        const actions = (
                          <>
                            {usersViewMode === 'list' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenDetailsModal('user', u)}
                                className="inline-flex items-center"
                                title="Voir détails"
                              >
                                <ListRowAction />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenDetailsModal('user', u)}
                                className="p-1.5 text-muted hover:text-foreground hover:bg-surface-muted rounded-md transition"
                                title="Détails"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditUserModal(u)}
                              className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded-md transition"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              disabled={u.id === user?.id}
                              className="p-1.5 text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        );

                        return (
                          <ProjectCard
                            key={u.id}
                            id={u.id}
                            title={u.name || 'Sans nom'}
                            layout={usersViewMode}
                            icon={<Users className="w-4 h-4" />}
                            onClick={() => handleOpenDetailsModal('user', u)}
                            meta={
                              usersViewMode === 'list' ? (
                                <span className="truncate">
                                  {u.email}
                                  {' · '}
                                  {u.tenantName || '—'}
                                </span>
                              ) : (
                                <div className="space-y-1.5">
                                  <p className="truncate text-xs">{u.email}</p>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {roleChip}
                                    {verifiedChip}
                                  </div>
                                  <p className="truncate text-xs text-muted">{u.tenantName || 'Sans organisation'}</p>
                                </div>
                              )
                            }
                            status={usersViewMode === 'list' ? roleChip : undefined}
                            aside={usersViewMode === 'list' ? verifiedChip : undefined}
                            footer={
                              usersViewMode === 'grid' ? (
                                <span className="text-[11px] text-muted truncate">{u.tenantName || '—'}</span>
                              ) : undefined
                            }
                            actions={actions}
                          />
                        );
                      })}
                    </div>

                    <Pagination
                      page={usersPage}
                      pageSize={ITEMS_PER_PAGE}
                      total={filteredUsers.length}
                      onPageChange={setUsersPage}
                      itemLabel="utilisateurs"
                    />
                  </>
                )}
              </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && isSuperAdmin && (
              <div className="space-y-6">
                {templateSavedFlash && (
                  <Alert variant="success">
                    Modèle enregistré. Vous êtes de retour sur le catalogue Super Admin (filtres & vitrine landing).
                  </Alert>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Modèles globaux</p>
                    <p className="text-2xl font-extrabold text-primary mt-1">{templates.filter((t) => t.isGlobal).length}</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Sur la landing</p>
                    <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">{templates.filter((t) => t.isGlobal && t.showOnLanding).length}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Organisations</p>
                    <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-200 mt-1">{templates.filter((t) => !t.isGlobal).length}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Affichés (filtre)</p>
                    <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-200 mt-1">{filteredTemplates.length}</p>
                  </div>
                </div>

                <div>
                {templatesLoading ? (
                  <SkeletonTabContent mode="grid" count={6} columns={3} />
                ) : (
                  <>
                    <TemplateCardGrid
                      templates={paginatedTemplates.map((t) => ({
                        id: t.id,
                        name: t.name,
                        content: t.content,
                        createdAt: t.createdAt,
                        tenantId: t.isGlobal ? null : t.tenantName,
                        tenantName: t.tenantName,
                        showOnLanding: t.showOnLanding,
                        isGlobal: t.isGlobal,
                      }))}
                      isSuperAdmin
                      emptyMessage="Aucun modèle trouvé pour ce filtre."
                      emptyAction={
                        <Link
                          href="/dashboard/templates?new=1&from=admin"
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-sm transition"
                        >
                          <Plus className="w-4 h-4" />
                          Créer un modèle dans le concepteur visuel
                        </Link>
                      }
                      editHref={(t) => `/dashboard/templates?edit=${t.id}&from=admin`}
                      onViewDetails={(t) => handleOpenDetailsModal('template', paginatedTemplates.find((x) => x.id === t.id))}
                      onDuplicate={(t) => handleDuplicateAdminTemplate(paginatedTemplates.find((x) => x.id === t.id))}
                      onDelete={handleDeleteTemplate}
                      onToggleLanding={handleToggleTemplateLanding}
                    />

                  <Pagination
                    page={templatesPage}
                    pageSize={TEMPLATE_CARDS_PER_PAGE}
                    total={filteredTemplates.length}
                    onPageChange={setTemplatesPage}
                    itemLabel="modèles"
                  />
                  </>
                )}
                </div>
              </div>
            )}

            {activeTab === 'message-templates' && (
              <GuestMessageTemplatesPanel />
            )}

            {/* Events Tab */}
            {activeTab === 'events' && (
              <div className="space-y-4">
                {adminEventsLoading ? (
                  <SkeletonTabContent mode={adminEventsViewMode === 'list' ? 'list' : 'grid'} count={6} columns={3} />
                ) : filteredEvents.length === 0 ? (
                  <p className="text-center text-muted text-sm py-10">Aucun événement trouvé.</p>
                ) : (
                  <>
                    <div
                      className={
                        adminEventsViewMode === 'grid' ? adminEventsGridClass : listStackClass
                      }
                    >
                      {paginatedEvents.map((e) => {
                        const dateLabel = new Date(e.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        const guestsChip = (
                          <StatusPill tone="primary">{e.guestCount} invités</StatusPill>
                        );
                        const invitesChip = (
                          <StatusPill tone="emerald">{e.invitationCount} invitations</StatusPill>
                        );
                        const actions = (
                          <>
                            {adminEventsViewMode === 'list' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenDetailsModal('event', e)}
                                className="inline-flex items-center"
                                title="Voir détails"
                              >
                                <ListRowAction />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenDetailsModal('event', e)}
                                className="p-1.5 text-muted hover:text-foreground hover:bg-surface-muted rounded-md transition"
                                title="Détails"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditEventModal(e)}
                              className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded-md transition"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(e.id, e.title)}
                              className="p-1.5 text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        );

                        return (
                          <ProjectCard
                            key={e.id}
                            id={e.id}
                            title={e.title}
                            layout={adminEventsViewMode}
                            icon={<Calendar className="w-4 h-4" />}
                            onClick={() => handleOpenDetailsModal('event', e)}
                            meta={
                              adminEventsViewMode === 'list' ? (
                                <span className="truncate">
                                  {e.tenantName}
                                  {' · '}
                                  {e.location || 'Sans lieu'}
                                  {' · '}
                                  {dateLabel}
                                </span>
                              ) : (
                                <div className="space-y-1.5">
                                  <p className="truncate text-xs font-medium">{e.tenantName}</p>
                                  <p className="truncate text-xs text-muted">{e.location || 'Sans lieu'}</p>
                                  <p className="text-[11px] text-muted">{dateLabel}</p>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {guestsChip}
                                    {invitesChip}
                                  </div>
                                </div>
                              )
                            }
                            value={
                              adminEventsViewMode === 'list'
                                ? `${e.guestCount} inv.`
                                : undefined
                            }
                            valueMeta={
                              adminEventsViewMode === 'list'
                                ? `${e.invitationCount} invitations`
                                : undefined
                            }
                            status={adminEventsViewMode === 'list' ? guestsChip : undefined}
                            actions={actions}
                          />
                        );
                      })}
                    </div>

                    <Pagination
                      page={eventsPage}
                      pageSize={ITEMS_PER_PAGE}
                      total={filteredEvents.length}
                      onPageChange={setEventsPage}
                      itemLabel="événements"
                    />
                  </>
                )}
              </div>
            )}

            {/* Guests Tab */}
            {activeTab === 'guests' && (
              <div className="space-y-4">
                {adminGuestsLoading ? (
                  <SkeletonTabContent mode={guestsViewMode === 'list' ? 'list' : 'grid'} count={6} columns={3} />
                ) : filteredGuests.length === 0 ? (
                  <p className="text-center text-muted text-sm py-10">Aucun invité trouvé.</p>
                ) : (
                  <>
                    <div className={guestsViewMode === 'grid' ? guestsGridClass : listStackClass}>
                      {paginatedGuests.map((g) => {
                        const rsvpTone =
                          g.rsvp === 'ACCEPTED' ? 'emerald' : g.rsvp === 'DECLINED' ? 'rose' : 'amber';
                        const rsvpLabel =
                          g.rsvp === 'ACCEPTED' ? 'Accepté' : g.rsvp === 'DECLINED' ? 'Décliné' : 'En attente';
                        const rsvpChip = <StatusPill tone={rsvpTone}>{rsvpLabel}</StatusPill>;
                        const categoryChip = <StatusPill tone="slate">{g.category || 'Général'}</StatusPill>;
                        const actions = (
                          <>
                            {guestsViewMode === 'list' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenDetailsModal('guest', g)}
                                className="inline-flex items-center"
                                title="Voir détails"
                              >
                                <ListRowAction />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenDetailsModal('guest', g)}
                                className="p-1.5 text-muted hover:text-foreground hover:bg-surface-muted rounded-md transition"
                                title="Détails"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditGuestModal(g)}
                              className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded-md transition"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteGuest(g.id, `${g.firstName} ${g.lastName}`)}
                              className="p-1.5 text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        );

                        return (
                          <ProjectCard
                            key={g.id}
                            id={g.id}
                            title={`${g.lastName} ${g.firstName}`}
                            layout={guestsViewMode}
                            icon={<Users className="w-4 h-4" />}
                            onClick={() => handleOpenDetailsModal('guest', g)}
                            meta={
                              guestsViewMode === 'list' ? (
                                <span className="truncate">
                                  {g.email}
                                  {' · '}
                                  {g.eventTitle}
                                  {' · '}
                                  {g.tenantName}
                                </span>
                              ) : (
                                <div className="space-y-1.5">
                                  <p className="truncate text-xs">{g.email}</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {rsvpChip}
                                    {categoryChip}
                                  </div>
                                  <p className="truncate text-xs font-medium">{g.eventTitle}</p>
                                  <p className="truncate text-[11px] text-muted">{g.tenantName}</p>
                                </div>
                              )
                            }
                            status={guestsViewMode === 'list' ? rsvpChip : undefined}
                            aside={guestsViewMode === 'list' ? categoryChip : undefined}
                            actions={actions}
                          />
                        );
                      })}
                    </div>

                    <Pagination
                      page={guestsPage}
                      pageSize={ITEMS_PER_PAGE}
                      total={filteredGuests.length}
                      onPageChange={setGuestsPage}
                      itemLabel="invités"
                    />
                  </>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="w-full">
                {adminSettingsLoading ? (
                  <SkeletonTabContent mode="grid" count={6} columns={3} />
                ) : (
                  adminSettings && (
                    <form onSubmit={handleSaveSettings} className="space-y-8 animate-in fade-in duration-200">
                      {/* Section 1: Plateforme */}
                      <div className="bg-surface-muted border border-border rounded-[var(--radius-card)] p-5 space-y-4">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
                          <Globe className="w-4 h-4 text-primary" />
                          Identité & accès
                        </h3>
                        <p className="text-xs text-muted -mt-2">
                          Ces valeurs alimentent la landing, le contact, le footer, les e-mails et les inscriptions.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nom de la plateforme</label>
                            <input
                              type="text"
                              value={adminSettings.platformName || ''}
                              onChange={(e) => setAdminSettings({ ...adminSettings, platformName: e.target.value })}
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition font-medium"
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Accroche (hero)</label>
                            <input
                              type="text"
                              value={adminSettings.platformTagline || ''}
                              onChange={(e) => setAdminSettings({ ...adminSettings, platformTagline: e.target.value })}
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition font-medium"
                              placeholder="Organisez vos événements…"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Couleur primaire (hex)</label>
                            <input
                              type="text"
                              value={adminSettings.brandPrimary || ''}
                              onChange={(e) => setAdminSettings({ ...adminSettings, brandPrimary: e.target.value })}
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono"
                              placeholder="#4f46e5"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Couleur accent (hex)</label>
                            <input
                              type="text"
                              value={adminSettings.brandAccent || ''}
                              onChange={(e) => setAdminSettings({ ...adminSettings, brandAccent: e.target.value })}
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono"
                              placeholder="#6366f1"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                          <label className="flex items-center gap-3 cursor-pointer bg-white dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-900 transition">
                            <input
                              type="checkbox"
                              checked={Boolean(adminSettings.maintenanceMode)}
                              onChange={(e) => setAdminSettings({ ...adminSettings, maintenanceMode: e.target.checked })}
                              className="w-4.5 h-4.5 text-primary border-slate-300 rounded focus:ring-primary"
                            />
                            <div>
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block">Mode maintenance</span>
                              <span className="text-xs text-slate-500 font-medium">Bloque l&apos;API (sauf Super Admin, login, RSVP, site public).</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer bg-white dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-900 transition">
                            <input
                              type="checkbox"
                              checked={adminSettings.allowRegistration !== false}
                              onChange={(e) => setAdminSettings({ ...adminSettings, allowRegistration: e.target.checked })}
                              className="w-4.5 h-4.5 text-primary border-slate-300 rounded focus:ring-primary"
                            />
                            <div>
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block">Inscriptions ouvertes</span>
                              <span className="text-xs text-slate-500 font-medium">Autorise la création de nouvelles organisations.</span>
                            </div>
                          </label>
                        </div>

                        {adminSettings.maintenanceMode && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Message de maintenance</label>
                            <textarea
                              value={adminSettings.maintenanceMessage || ''}
                              onChange={(e) => setAdminSettings({ ...adminSettings, maintenanceMessage: e.target.value })}
                              rows={2}
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm resize-none"
                            />
                          </div>
                        )}
                      </div>

                      {/* Section Contact public */}
                      <div className="bg-surface-muted border border-border rounded-[var(--radius-card)] p-5 space-y-4">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
                          <Mail className="w-4 h-4 text-primary" />
                          Contact & support (site public)
                        </h3>
                        <p className="text-xs text-muted -mt-2">
                          Affiché sur Contact, Footer, FAQ et utilisés comme destinataires du formulaire.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">E-mail support</label>
                            <input
                              type="email"
                              value={adminSettings.supportEmail || ''}
                              onChange={(e) => setAdminSettings({ ...adminSettings, supportEmail: e.target.value })}
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">WhatsApp (destinataire contact)</label>
                            <input
                              type="text"
                              value={adminSettings.supportWhatsApp || ''}
                              onChange={(e) => setAdminSettings({ ...adminSettings, supportWhatsApp: e.target.value })}
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono"
                              placeholder="+243817125577"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Téléphone affiché</label>
                            <input
                              type="text"
                              value={adminSettings.supportPhone || ''}
                              onChange={(e) => setAdminSettings({ ...adminSettings, supportPhone: e.target.value })}
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Note WhatsApp</label>
                            <input
                              type="text"
                              value={adminSettings.whatsappNote || ''}
                              onChange={(e) => setAdminSettings({ ...adminSettings, whatsappNote: e.target.value })}
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Adresse ligne 1</label>
                            <input
                              type="text"
                              value={adminSettings.addressLine1 || ''}
                              onChange={(e) => setAdminSettings({ ...adminSettings, addressLine1: e.target.value })}
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Adresse ligne 2</label>
                            <input
                              type="text"
                              value={adminSettings.addressLine2 || ''}
                              onChange={(e) => setAdminSettings({ ...adminSettings, addressLine2: e.target.value })}
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                            />
                          </div>
                          <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Adresse courte (footer)</label>
                            <input
                              type="text"
                              value={adminSettings.addressShort || ''}
                              onChange={(e) => setAdminSettings({ ...adminSettings, addressShort: e.target.value })}
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                            />
                          </div>
                          <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Horaires support</label>
                            <input
                              type="text"
                              value={adminSettings.supportHours || ''}
                              onChange={(e) => setAdminSettings({ ...adminSettings, supportHours: e.target.value })}
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 2: WhatsApp */}
                      <div className="bg-surface-muted border border-border rounded-[var(--radius-card)] p-5 space-y-4">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
                          <Mail className="w-4 h-4 text-primary" />
                          WhatsApp (UltraMsg)
                        </h3>
                        <p className="text-xs text-muted -mt-2">
                          Requis pour OTP WhatsApp, invitations et rappels via WhatsApp.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">UltraMsg Instance ID</label>
                            <input
                              type="text"
                              value={adminSettings.ultramsgInstanceId || ''}
                              onChange={(e) => setAdminSettings({ ...adminSettings, ultramsgInstanceId: e.target.value })}
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition font-mono"
                              placeholder="ex: instance12345"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">UltraMsg Token</label>
                            <input
                              type="password"
                              value={adminSettings.ultramsgToken || ''}
                              onChange={(e) => setAdminSettings({ ...adminSettings, ultramsgToken: e.target.value })}
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition font-mono"
                              placeholder="••••••••••••••••••••••••••••••••"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Email */}
                      <div className="bg-surface-muted border border-border rounded-[var(--radius-card)] p-5 space-y-4">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b border-border pb-3">
                          <Mail className="w-4 h-4 text-primary" />
                          E-mail (SendGrid)
                        </h3>
                        <p className="text-xs text-muted -mt-2">
                          Requis pour OTP e-mail, invitations et notifications transactionnelles.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">SendGrid API Key</label>
                            <input
                              type="password"
                              value={adminSettings.sendgridApiKey || ''}
                              onChange={(e) => setAdminSettings({ ...adminSettings, sendgridApiKey: e.target.value })}
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition font-mono"
                              placeholder="ex: SG.••••••••••••••••••••••••••••••••"
                            />
                          </div>
                          <div className="space-y-1.5 md:col-span-2">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Expéditeur (From)</label>
                            <input
                              type="email"
                              value={adminSettings.sendgridFrom || ''}
                              onChange={(e) => setAdminSettings({ ...adminSettings, sendgridFrom: e.target.value })}
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm"
                              placeholder="no-reply@votredomaine.com"
                            />
                            <p className="text-[11px] text-muted">Doit être un domaine vérifié dans SendGrid.</p>
                          </div>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <div className="flex justify-end gap-3">
                        <button
                          type="submit"
                          disabled={savingSettings}
                          className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-sm transition flex items-center gap-2 disabled:opacity-50"
                        >
                          {savingSettings ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Enregistrement...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              Sauvegarder les configurations
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )
                )}
              </div>
            )}

            {/* Demandes d'abonnement */}
            {activeTab === 'subscription-requests' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      Demandes reçues ({subscriptionRequests.length})
                    </h4>
                    <ViewModeToggle
                      storageKey="em-view-admin-sub-requests"
                      value={subRequestsViewMode}
                      onChange={setSubRequestsViewMode}
                      columns={subRequestsColumns}
                      onColumnsChange={setSubRequestsColumns}
                      defaultMode="grid"
                      defaultColumns={2}
                    />
                  </div>

                  {subRequestsLoading ? (
                    <SkeletonTabContent mode={subRequestsViewMode === 'list' ? 'list' : 'grid'} count={6} columns={2} />
                  ) : subscriptionRequests.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-150 p-6">
                      <p className="text-slate-500 text-xs font-medium">Aucune demande d&apos;abonnement soumise pour le moment.</p>
                    </div>
                  ) : (
                    <>
                      <div className={subRequestsViewMode === 'grid' ? subRequestsGridClass : listStackClass}>
                        {paginatedSubRequests.map((req) => {
                          const statusTone =
                            req.status === 'APPROVED' ? 'emerald' : req.status === 'REJECTED' ? 'rose' : 'amber';
                          const statusLabel =
                            req.status === 'APPROVED' ? 'Approuvée' : req.status === 'REJECTED' ? 'Rejetée' : 'En attente';
                          const statusChip = <StatusPill tone={statusTone}>{statusLabel}</StatusPill>;
                          const planChip = (
                            <StatusPill tone="primary">
                              {(req.tenant?.plan || 'FREE')} → {req.requestedPlan}
                            </StatusPill>
                          );
                          const commercial =
                            req.tenant?.referredByCommercial?.name ||
                            (req.tenant?.referredByOrgUser?.orgRole === 'COMMERCIAL'
                              ? req.tenant.referredByOrgUser.name
                              : null);
                          const actions =
                            req.status === 'PENDING' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setApprovalModalRequest({
                                      id: req.id,
                                      requestedPlan: req.requestedPlan,
                                      durationDays: req.durationDays,
                                      tenant: req.tenant,
                                    });
                                  }}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition"
                                >
                                  Approuver
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleRejectSubscription(req.id);
                                  }}
                                  className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition"
                                >
                                  Rejeter
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-muted italic">Traitée</span>
                            );

                          return (
                            <ProjectCard
                              key={req.id}
                              id={req.id}
                              title={req.tenant?.name || 'Organisation inconnue'}
                              layout={subRequestsViewMode}
                              icon={<CreditCard className="w-4 h-4" />}
                              meta={
                                subRequestsViewMode === 'list' ? (
                                  <span className="truncate">
                                    {req.durationDays} j
                                    {' · '}
                                    {new Date(req.createdAt).toLocaleDateString('fr-FR', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                    {commercial ? ` · ${commercial}` : ''}
                                    {req.proofOfPayment ? ` · ${req.proofOfPayment}` : ''}
                                  </span>
                                ) : (
                                  <div className="space-y-1.5">
                                    <div className="flex flex-wrap gap-1.5">
                                      {statusChip}
                                      {planChip}
                                    </div>
                                    <p className="text-xs font-semibold">{req.durationDays} jours</p>
                                    {req.proofOfPayment && (
                                      <p className="text-[11px] text-muted italic truncate" title={req.proofOfPayment}>
                                        &quot;{req.proofOfPayment}&quot;
                                      </p>
                                    )}
                                    {commercial && (
                                      <p className="text-[11px] text-primary font-medium truncate">{commercial}</p>
                                    )}
                                    <p className="text-[11px] text-muted">
                                      {new Date(req.createdAt).toLocaleDateString('fr-FR', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </p>
                                  </div>
                                )
                              }
                              status={subRequestsViewMode === 'list' ? statusChip : undefined}
                              aside={subRequestsViewMode === 'list' ? planChip : undefined}
                              actions={actions}
                            />
                          );
                        })}
                      </div>
                      <Pagination
                        page={subRequestsPage}
                        pageSize={SUB_REQUESTS_PER_PAGE}
                        total={subscriptionRequests.length}
                        onPageChange={setSubRequestsPage}
                        itemLabel="demandes"
                      />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Forfaits & abonnements */}
            {activeTab === 'subscription-plans' && isSuperAdmin && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {adminSettingsLoading ? (
                  <SkeletonTabContent mode="grid" count={4} columns={2} />
                ) : adminSettings && adminSettings.plans ? (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
                    <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-primary" />
                        Configuration des forfaits ({PLAN_IDS.length})
                      </h4>
                      <ViewModeToggle
                        storageKey="em-view-admin-plans"
                        value={plansViewMode}
                        onChange={setPlansViewMode}
                        columns={plansColumns}
                        onColumnsChange={setPlansColumns}
                        defaultMode="grid"
                        defaultColumns={4}
                      />
                    </div>

                    <div className={plansViewMode === 'grid' ? plansGridClass : listStackClass}>
                      {paginatedPlanIds.map((planKey) => {
                        const plan = adminSettings.plans[planKey];
                        if (!plan) return null;

                        return (
                          <div
                            key={planKey}
                            className={
                              plansViewMode === 'list'
                                ? 'bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-4 md:space-y-0'
                                : 'bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4'
                            }
                          >
                            <div className={`flex items-center justify-between ${plansViewMode === 'list' ? 'md:col-span-full' : ''}`}>
                              <span className="text-xs font-extrabold text-primary uppercase tracking-wider">{planKey}</span>
                              <span className="text-xs bg-primary/10 text-primary font-bold px-2.5 py-0.5 rounded-full">
                                {planKey === 'FREE' ? 'Gratuit' : 'Mensuel'}
                              </span>
                            </div>

                            <div className={plansViewMode === 'list' ? 'contents' : 'space-y-3'}>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nom du Plan</label>
                                <input
                                  type="text"
                                  value={plan.name}
                                  onChange={(e) => {
                                    const updatedPlans = { ...adminSettings.plans };
                                    updatedPlans[planKey] = { ...plan, name: e.target.value };
                                    setAdminSettings({ ...adminSettings, plans: updatedPlans });
                                  }}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-primary transition"
                                  required
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</label>
                                <textarea
                                  value={plan.description || ''}
                                  onChange={(e) => {
                                    const updatedPlans = { ...adminSettings.plans };
                                    updatedPlans[planKey] = { ...plan, description: e.target.value };
                                    setAdminSettings({ ...adminSettings, plans: updatedPlans });
                                  }}
                                  rows={2}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-primary transition resize-none"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Prix mensuel</label>
                                <input
                                  type="text"
                                  value={plan.price}
                                  onChange={(e) => {
                                    const updatedPlans = { ...adminSettings.plans };
                                    const digits = e.target.value.replace(/[^\d]/g, '');
                                    updatedPlans[planKey] = {
                                      ...plan,
                                      price: e.target.value,
                                      monthlyPriceFc: digits ? parseInt(digits, 10) : plan.monthlyPriceFc,
                                    };
                                    setAdminSettings({ ...adminSettings, plans: updatedPlans });
                                  }}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-primary transition"
                                  required
                                />
                              </div>

                              {planKey !== 'FREE' && (
                                <div className="space-y-2 p-3 bg-amber-50/80 border border-amber-100 rounded-xl">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(plan.promoActive)}
                                      onChange={(e) => {
                                        const updatedPlans = { ...adminSettings.plans };
                                        updatedPlans[planKey] = { ...plan, promoActive: e.target.checked };
                                        setAdminSettings({ ...adminSettings, plans: updatedPlans });
                                      }}
                                      className="w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
                                    />
                                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                                      Promotion active
                                    </span>
                                  </label>
                                  {plan.promoActive && (
                                    <>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Prix promo (mensuel)</label>
                                        <input
                                          type="text"
                                          value={plan.promoPrice || ''}
                                          placeholder="Ex: 25.000 FC"
                                          onChange={(e) => {
                                            const updatedPlans = { ...adminSettings.plans };
                                            const digits = e.target.value.replace(/[^\d]/g, '');
                                            updatedPlans[planKey] = {
                                              ...plan,
                                              promoPrice: e.target.value,
                                              promoMonthlyPriceFc: digits ? parseInt(digits, 10) : plan.promoMonthlyPriceFc,
                                            };
                                            setAdminSettings({ ...adminSettings, plans: updatedPlans });
                                          }}
                                          className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500 transition"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Libellé promo</label>
                                        <input
                                          type="text"
                                          value={plan.promoLabel || ''}
                                          placeholder="Ex: Offre de lancement"
                                          onChange={(e) => {
                                            const updatedPlans = { ...adminSettings.plans };
                                            updatedPlans[planKey] = { ...plan, promoLabel: e.target.value };
                                            setAdminSettings({ ...adminSettings, plans: updatedPlans });
                                          }}
                                          className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500 transition"
                                        />
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Max Événements</label>
                                  <input
                                    type="number"
                                    value={plan.maxEvents}
                                    onChange={(e) => {
                                      const updatedPlans = { ...adminSettings.plans };
                                      updatedPlans[planKey] = { ...plan, maxEvents: parseInt(e.target.value) || 0 };
                                      setAdminSettings({ ...adminSettings, plans: updatedPlans });
                                    }}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-primary transition"
                                    required
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Max Invités</label>
                                  <input
                                    type="number"
                                    value={plan.maxGuests}
                                    onChange={(e) => {
                                      const updatedPlans = { ...adminSettings.plans };
                                      updatedPlans[planKey] = { ...plan, maxGuests: parseInt(e.target.value) || 0 };
                                      setAdminSettings({ ...adminSettings, plans: updatedPlans });
                                    }}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-primary transition"
                                    required
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Max Modèles</label>
                                  <input
                                    type="number"
                                    value={plan.maxTemplates}
                                    onChange={(e) => {
                                      const updatedPlans = { ...adminSettings.plans };
                                      updatedPlans[planKey] = { ...plan, maxTemplates: parseInt(e.target.value) || 0 };
                                      setAdminSettings({ ...adminSettings, plans: updatedPlans });
                                    }}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-primary transition"
                                    required
                                  />
                                </div>

                                <div className="flex items-center gap-2 pt-5">
                                  <input
                                    type="checkbox"
                                    id={`custom-templates-${planKey}`}
                                    checked={plan.customTemplates}
                                    onChange={(e) => {
                                      const updatedPlans = { ...adminSettings.plans };
                                      updatedPlans[planKey] = { ...plan, customTemplates: e.target.checked };
                                      setAdminSettings({ ...adminSettings, plans: updatedPlans });
                                    }}
                                    className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                                  />
                                  <label htmlFor={`custom-templates-${planKey}`} className="text-[10px] font-bold text-slate-600 uppercase tracking-wider cursor-pointer">
                                    Modèles Perso.
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <Pagination
                      page={plansPage}
                      pageSize={PLANS_PER_PAGE}
                      total={PLAN_IDS.length}
                      onPageChange={setPlansPage}
                      itemLabel="forfaits"
                    />

                    <div className="flex justify-end border-t border-slate-100 pt-4">
                      <button
                        onClick={async () => {
                          setSavingSettings(true);
                          try {
                            await api.put('/admin/settings', { plans: adminSettings.plans });
                            alert('Forfaits d\'abonnement mis à jour avec succès !');
                            await loadAdminSettings();
                          } catch (err: any) {
                            alert(err.message || 'Erreur lors de la mise à jour des forfaits.');
                          } finally {
                            setSavingSettings(false);
                          }
                        }}
                        disabled={savingSettings}
                        className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                      >
                        {savingSettings ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Enregistrement...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Enregistrer les modifications de forfaits
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">Impossible de charger la configuration des forfaits.</p>
                )}
              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Toutes les factures ({adminInvoices.length})
                    </h4>
                    <ViewModeToggle
                      storageKey="em-view-admin-invoices"
                      value={invoicesViewMode}
                      onChange={setInvoicesViewMode}
                      columns={invoicesColumns}
                      onColumnsChange={setInvoicesColumns}
                      defaultMode="list"
                      defaultColumns={3}
                    />
                  </div>
                  {loadingAdminInvoices ? (
                    <SkeletonTabContent mode={invoicesViewMode === 'list' ? 'list' : 'grid'} count={5} columns={3} />
                  ) : (
                    <InvoiceListPanel
                      invoices={adminInvoices}
                      showOrganization
                      showCommissions
                      apiPrefix="admin"
                      layout={invoicesViewMode}
                      gridClassName={invoicesGridClass}
                      emptyMessage="Aucune facture générée. Les factures apparaissent ici dès qu'une demande d'abonnement est approuvée."
                    />
                  )}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-8 animate-in fade-in duration-200">
                {activeAnalyticsSection === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4">
                      <div className="p-3 bg-primary/10 text-primary rounded-xl">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="block text-2xl font-extrabold text-slate-900 dark:text-white">{adminData?.stats.tenants ?? 0}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Organisations</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4">
                      <div className="p-3 bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 rounded-xl">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="block text-2xl font-extrabold text-slate-900 dark:text-white">{adminData?.stats.users ?? 0}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Utilisateurs</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="block text-2xl font-extrabold text-slate-900 dark:text-white">{adminData?.stats.events ?? 0}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Événements</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4">
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
                        <Mail className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="block text-2xl font-extrabold text-slate-900 dark:text-white">{adminData?.stats.guests ?? 0}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Invités</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4">
                      <div className="p-3 bg-primary/10 text-primary rounded-xl">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="block text-2xl font-extrabold text-slate-900 dark:text-white">
                          {adminData?.tenants.length
                            ? (adminData.tenants.reduce((acc, t) => acc + t.usersCount, 0) / adminData.tenants.length).toFixed(1)
                            : '0'}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Membres / Organisation</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="block text-2xl font-extrabold text-slate-900 dark:text-white">
                          {adminData?.tenants.length
                            ? (adminData.tenants.reduce((acc, t) => acc + t.eventsCount, 0) / adminData.tenants.length).toFixed(1)
                            : '0'}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Événements / Organisation</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4">
                      <div className="p-3 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-xl">
                        <Award className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="block text-2xl font-extrabold text-slate-900 dark:text-white">
                          {adminData?.tenants.filter(t => t.licenseActive && (!t.licenseExpiresAt || new Date(t.licenseExpiresAt) > new Date())).length || 0}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Licences actives</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="block text-2xl font-extrabold text-slate-900 dark:text-white">
                          {users.length ? `${Math.round((users.filter(u => u.isEmailVerified).length / users.length) * 100)}%` : '0%'}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Utilisateurs vérifiés</span>
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {activeAnalyticsSection === 'plans' && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-primary" />
                      Répartition des Plans d'Abonnement
                    </h3>
                    
                    <div className="space-y-4">
                      {PLAN_IDS.map((plan) => {
                        const count = adminData?.tenants.filter(t => t.plan === plan).length || 0;
                        const total = adminData?.tenants.length || 1;
                        const pct = Math.round((count / total) * 100);
                        
                        return (
                          <div key={plan} className="space-y-1.5">
                            <div className="flex justify-between text-sm font-bold">
                              <span className={`px-2 py-0.5 rounded text-xs font-extrabold border ${planBadgeClass(plan)}`}>
                                {plan}
                              </span>
                              <span className="text-slate-600">{count} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${planBarClass(plan)}`}
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                      <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Statut des Licences Contractuelles
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                          <span className="block text-2xl font-extrabold text-emerald-700">
                            {adminData?.tenants.filter(t => t.licenseActive && (!t.licenseExpiresAt || new Date(t.licenseExpiresAt) > new Date())).length || 0}
                          </span>
                          <span className="text-xs text-emerald-600 font-bold">Valides / Actives</span>
                        </div>
                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-center">
                          <span className="block text-2xl font-extrabold text-rose-700">
                            {adminData?.tenants.filter(t => !t.licenseActive || (t.licenseExpiresAt && new Date(t.licenseExpiresAt) < new Date())).length || 0}
                          </span>
                          <span className="text-xs text-rose-600 font-bold">Inactives / Expirées</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeAnalyticsSection === 'organisations' && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Organisations les Plus Actives
                    </h3>
                    
                    <div className="divide-y divide-slate-100">
                      {(adminData?.tenants || [])
                        .slice()
                        .sort((a, b) => b.eventsCount - a.eventsCount)
                        .slice(0, 5)
                        .map((t, idx) => (
                          <div key={t.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                              </span>
                              <div>
                                <span className="font-bold text-slate-800 block">{t.name}</span>
                                <span className="text-xs text-slate-400">Gérant : {t.managerName}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-extrabold text-primary block">{t.eventsCount} events</span>
                              <span className="text-xs text-slate-500 font-medium">{t.usersCount} membres</span>
                            </div>
                          </div>
                        ))}
                      {(!adminData?.tenants || adminData.tenants.length === 0) && (
                        <p className="text-sm text-slate-500 text-center py-8">Aucune donnée disponible.</p>
                      )}
                    </div>
                  </div>
                )}

                {activeAnalyticsSection === 'revenus' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      Revenus & Commissions Commerciales
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="month"
                        value={revenuePeriod}
                        onChange={(e) => setRevenuePeriod(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium"
                      />
                      <button
                        onClick={() => loadRevenueReport(revenuePeriod)}
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition"
                      >
                        Actualiser
                      </button>
                      <button
                        onClick={() => exportRevenueReport('csv')}
                        className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        CSV
                      </button>
                      <button
                        onClick={() => exportRevenueReport('pdf')}
                        className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </button>
                    </div>
                  </div>

                  {loadingRevenueReport ? (
                    <div className="flex items-center justify-center py-12 text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mr-2" />
                      Chargement du rapport...
                    </div>
                  ) : revenueReport ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                          <span className="text-xs font-bold text-primary uppercase">Revenus bruts</span>
                          <p className="text-xl font-extrabold text-primary mt-1">{revenueReport.summary.totalRevenueFormatted}</p>
                          <span className="text-xs text-primary">{revenueReport.summary.invoiceCount} facture(s)</span>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                          <span className="text-xs font-bold text-amber-600 uppercase">Commissions (20 %)</span>
                          <p className="text-xl font-extrabold text-amber-900 mt-1">{revenueReport.summary.totalCommissionsFormatted}</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                          <span className="text-xs font-bold text-emerald-600 uppercase">Revenu net plateforme</span>
                          <p className="text-xl font-extrabold text-emerald-900 mt-1">{revenueReport.summary.netRevenueFormatted}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                          <span className="text-xs font-bold text-slate-500 uppercase">Période</span>
                          <p className="text-xl font-extrabold text-slate-900 mt-1">{revenueReport.period}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 mb-3">Tendance sur 6 mois</h4>
                          <div className="space-y-2">
                            {revenueReport.monthlyTrend.map((m) => (
                              <div key={m.period} className="flex items-center justify-between text-sm py-2 border-b border-slate-50">
                                <span className="font-medium text-slate-600">{m.period}</span>
                                <span className="font-bold text-primary">{m.revenueFormatted}</span>
                                <span className="text-xs text-slate-400">{m.invoiceCount} fact.</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-slate-900 mb-3">Commissions par commercial</h4>
                          {revenueReport.commercialCommissions.length === 0 ? (
                            <p className="text-sm text-slate-500">Aucune commission ce mois-ci.</p>
                          ) : (
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                              {revenueReport.commercialCommissions.map((c) => (
                                <div key={c.commercialId} className="border border-slate-100 rounded-xl p-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-bold text-slate-800">{c.name || c.email}</p>
                                      <p className="text-xs text-slate-400">{c.referralCode || '—'}</p>
                                    </div>
                                    <span className="font-extrabold text-amber-600">
                                      {c.totalCommission.toLocaleString('fr-FR')} FC
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1">
                                    CA parrainé : {c.totalInvoiceAmount.toLocaleString('fr-FR')} FC · {c.entries.length} org.
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {revenueReport.invoices.length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 mb-3">Factures du mois</h4>
                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-50">
                                <tr>
                                  <th className="text-left px-4 py-2 font-bold text-slate-600">N°</th>
                                  <th className="text-left px-4 py-2 font-bold text-slate-600">Organisation</th>
                                  <th className="text-left px-4 py-2 font-bold text-slate-600">Forfait</th>
                                  <th className="text-left px-4 py-2 font-bold text-slate-600">Montant</th>
                                  <th className="text-left px-4 py-2 font-bold text-slate-600">Type</th>
                                </tr>
                              </thead>
                              <tbody>
                                {revenueReport.invoices.map((inv) => (
                                  <tr key={inv.id} className="border-t border-slate-50">
                                    <td className="px-4 py-2 font-mono text-xs">{inv.invoiceNumber}</td>
                                    <td className="px-4 py-2">{inv.tenantName}</td>
                                    <td className="px-4 py-2">{inv.plan}</td>
                                    <td className="px-4 py-2 font-bold text-primary">{inv.amountFormatted}</td>
                                    <td className="px-4 py-2 text-xs text-slate-500">{inv.type}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-8">Aucune donnée de facturation disponible.</p>
                  )}
                </div>
                )}

                {activeAnalyticsSection === 'modeles' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <FileText className="w-5 h-5 text-primary" />
                        Répartition des modèles
                      </h3>
                      <div className="space-y-3">
                        {[
                          { label: 'Total des modèles', value: templates.length, color: 'text-slate-800 dark:text-slate-200' },
                          { label: 'Modèles globaux (publics)', value: templates.filter(t => t.isGlobal).length, color: 'text-primary' },
                          { label: 'Modèles d\'organisations', value: templates.filter(t => !t.isGlobal).length, color: 'text-slate-800 dark:text-slate-200' },
                          { label: 'Affichés sur la landing page', value: templates.filter(t => t.showOnLanding).length, color: 'text-emerald-600 dark:text-emerald-400' },
                        ].map((row) => (
                          <div key={row.label} className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">{row.label}</span>
                            <span className={`font-bold ${row.color}`}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                      <Link
                        href="/dashboard?tab=templates"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline pt-2"
                      >
                        Gérer les modèles globaux
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        Modèles visibles sur la landing
                      </h3>
                      {templates.filter(t => t.isGlobal && t.showOnLanding).length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                          Aucun modèle global activé pour la landing. Activez « Sur la Landing Page » depuis l&apos;onglet Modèles.
                        </p>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
                          {templates.filter(t => t.isGlobal && t.showOnLanding).map((t) => (
                            <div key={t.id} className="py-3 flex items-center gap-3 first:pt-0 last:pb-0">
                              <TemplatePreviewThumb content={t.content} name={t.name} />
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{t.name}</p>
                                <p className="text-xs text-slate-400">{getTemplateElementSummary(t.content)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeAnalyticsSection === 'utilisateurs' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <Users className="w-5 h-5 text-primary" />
                        Rôles des utilisateurs
                      </h3>
                      <div className="space-y-3">
                        {[
                          { label: 'Total', value: users.length, color: 'text-slate-800 dark:text-slate-200' },
                          { label: 'Super administrateurs', value: users.filter(u => u.role === 'SUPER_ADMIN').length, color: 'text-rose-600 dark:text-rose-400' },
                          { label: 'Commerciaux', value: users.filter(u => u.role === 'COMMERCIAL').length, color: 'text-amber-600 dark:text-amber-400' },
                          { label: 'Utilisateurs standards', value: users.filter(u => u.role === 'USER').length, color: 'text-slate-800 dark:text-slate-200' },
                          { label: 'E-mails vérifiés', value: users.filter(u => u.isEmailVerified).length, color: 'text-emerald-600 dark:text-emerald-400' },
                        ].map((row) => (
                          <div key={row.label} className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">{row.label}</span>
                            <span className={`font-bold ${row.color}`}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Inscriptions récentes
                      </h3>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
                        {users.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8).map((u) => (
                          <div key={u.id} className="py-2.5 flex items-center justify-between gap-2 first:pt-0 last:pb-0">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate text-sm">{u.name || u.email}</p>
                              <p className="text-xs text-slate-400 truncate">{u.tenantName}</p>
                            </div>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">{u.role}</span>
                          </div>
                        ))}
                        {users.length === 0 && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">Aucun utilisateur.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeAnalyticsSection === 'evenements' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <Calendar className="w-5 h-5 text-primary" />
                        Statistiques des événements
                      </h3>
                      <div className="space-y-3">
                        {[
                          { label: 'Total des événements', value: adminEvents.length },
                          { label: 'Avec localisation GPS', value: adminEvents.filter(e => e.latitude && e.longitude).length },
                          { label: 'Rappels quotidiens', value: adminEvents.filter(e => e.reminderFrequency === 'DAILY').length },
                          { label: 'Rappels hebdomadaires', value: adminEvents.filter(e => e.reminderFrequency === 'WEEKLY').length },
                        ].map((row) => (
                          <div key={row.label} className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">{row.label}</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        Événements récents
                      </h3>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
                        {adminEvents.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8).map((e) => (
                          <div key={e.id} className="py-2.5 flex items-center justify-between gap-2 first:pt-0 last:pb-0">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate text-sm">{e.title}</p>
                              <p className="text-xs text-slate-400 truncate">{e.tenantName} · {e.location || 'Lieu non défini'}</p>
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{new Date(e.date).toLocaleDateString('fr-FR')}</span>
                          </div>
                        ))}
                        {adminEvents.length === 0 && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">Aucun événement.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal: Create or Edit Guest (Super Admin) */}
        {isGuestModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm">
            <div className="bg-surface rounded-2xl border border-border shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  {guestModalMode === 'create' ? 'Créer un Invité' : 'Modifier l\'Invité'}
                </h3>
                <button 
                  onClick={() => setIsGuestModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveGuest} className="p-6 space-y-5">
                {/* Événement */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Événement de destination</label>
                  <select
                    value={modalGuestEventId}
                    onChange={(e) => setGuestEventId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition font-medium"
                    required
                  >
                    <option value="" disabled>Sélectionner un événement</option>
                    {adminEvents.map((evt) => (
                      <option key={evt.id} value={evt.id}>
                        {evt.title} ({evt.tenantName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Prénom & Nom */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Prénom</label>
                    <input
                      type="text"
                      value={modalGuestFirstName}
                      onChange={(e) => setGuestFirstName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition font-medium"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Nom de famille</label>
                    <input
                      type="text"
                      value={modalGuestLastName}
                      onChange={(e) => setGuestLastName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition font-medium"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Adresse Email</label>
                  <input
                    type="email"
                    value={modalGuestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition font-medium"
                    required
                  />
                </div>

                <PhoneInput
                  label="Téléphone (WhatsApp)"
                  countryCode={modalGuestPhoneCountryCode}
                  national={modalGuestPhoneNational}
                  onCountryCodeChange={setModalGuestPhoneCountryCode}
                  onNationalChange={setModalGuestPhoneNational}
                  hint="Indicatif + numéro national (sans le 0)."
                />

                {/* Catégorie */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Catégorie</label>
                  <input
                    type="text"
                    value={modalGuestCategory}
                    onChange={(e) => setGuestCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition font-medium"
                    placeholder="ex: Famille, VIP, Collègue..."
                  />
                </div>

                {/* Statut RSVP */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Statut RSVP</label>
                  <select
                    value={modalGuestRsvp}
                    onChange={(e) => setGuestRsvp(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition font-medium"
                  >
                    <option value="PENDING">En attente (PENDING)</option>
                    <option value="ACCEPTED">Accepté (ACCEPTED)</option>
                    <option value="DECLINED">Décliné (DECLINED)</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsGuestModalOpen(false)}
                    className="px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={updatingGuest}
                    className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-md disabled:opacity-50"
                  >
                    {updatingGuest ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      'Enregistrer'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create or Edit Tenant */}
        {isCreateTenantModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm">
            <div className="bg-surface rounded-2xl border border-border shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  {tenantModalMode === 'create' ? 'Créer une Organisation' : `Modifier l'Organisation : ${selectedTenant?.name}`}
                </h3>
                <button 
                  onClick={() => setIsTenantModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTenant} className="p-6 space-y-5">
                {/* Nom */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nom de l'organisation</label>
                  <input
                    type="text"
                    placeholder="Ex: ITM Africa, Agence Événementielle..."
                    value={modalTenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition font-semibold"
                    required
                  />
                </div>

                {/* Forfait / Plan */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Forfait d'Abonnement</label>
                  <select
                    value={modalPlan}
                    onChange={(e) => setModalPlan(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition"
                  >
                    {PLAN_IDS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* License Active */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-150">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-slate-800">Statut de la Licence</div>
                    <div className="text-xs text-slate-500">Activer ou suspendre l'accès de l'organisation</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalLicenseActive(!modalLicenseActive)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${modalLicenseActive ? 'bg-primary' : 'bg-slate-200'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${modalLicenseActive ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Expiration Date */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                    Date d'Expiration
                  </label>
                  <input
                    type="date"
                    value={modalLicenseExpiresAt}
                    onChange={(e) => setModalLicenseExpiresAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition"
                  />
                  <p className="text-[11px] text-slate-400">Laissez vide pour une licence à durée illimitée.</p>
                </div>

                {/* License Key */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clé de Licence Personnalisée</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Générer ou saisir une clé..."
                      value={modalLicenseKey}
                      onChange={(e) => setModalLicenseKey(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition"
                    />
                    <button
                      type="button"
                      onClick={() => setModalLicenseKey(`LIC-${Math.random().toString(36).substring(2, 11).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition"
                    >
                      Générer
                    </button>
                  </div>
                </div>

                {tenantModalMode === 'edit' && modalPlan !== 'FREE' && (
                  <div className="space-y-4 p-4 bg-primary/10/50 rounded-xl border border-primary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-slate-800">Facturation</div>
                        <div className="text-xs text-slate-500">Renouvellement ou changement de forfait</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setModalIssueInvoice(!modalIssueInvoice)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${modalIssueInvoice ? 'bg-primary' : 'bg-slate-200'}`}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${modalIssueInvoice ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {modalIssueInvoice && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type d&apos;opération</label>
                          <select
                            value={modalBillingAction}
                            onChange={(e) => setModalBillingAction(e.target.value as typeof modalBillingAction)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold"
                          >
                            <option value="AUTO">Automatique (selon changement)</option>
                            <option value="RENEWAL">Renouvellement</option>
                            <option value="PLAN_CHANGE">Changement de forfait</option>
                            <option value="ACTIVATION">Activation</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Durée (jours)</label>
                            <input
                              type="number"
                              min={1}
                              value={modalBillingDurationDays}
                              onChange={(e) => setModalBillingDurationDays(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                            />
                          </div>
                          <div className="flex items-end pb-1">
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={modalExtendLicense}
                                onChange={(e) => setModalExtendLicense(e.target.checked)}
                                className="rounded border-slate-300"
                              />
                              Prolonger la licence
                            </label>
                          </div>
                        </div>
                        <BillingDiscountFields
                          planId={modalPlan}
                          catalogPriceFc={planCatalogPrices?.[modalPlan]}
                          discountMode={modalDiscountMode}
                          onDiscountModeChange={setModalDiscountMode}
                          discountPercent={modalDiscountPercent}
                          onDiscountPercentChange={setModalDiscountPercent}
                          approvedAmount={modalApprovedAmount}
                          onApprovedAmountChange={setModalApprovedAmount}
                          compact
                        />
                        <p className="text-[10px] text-slate-500">
                          Facture au propriétaire et managers. Commerciaux liés informés par e-mail.
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsTenantModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={updatingTenant}
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md"
                  >
                    {updatingTenant ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create or Edit User */}
        {isUserModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm">
            <div className="bg-surface rounded-2xl border border-border shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  {userModalMode === 'create' ? 'Créer un Utilisateur' : `Modifier l'Utilisateur : ${selectedUser?.email}`}
                </h3>
                <button 
                  onClick={() => setIsUserModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="p-6 space-y-5">
                {/* Nom complet */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nom complet</label>
                  <input
                    type="text"
                    placeholder="Ex: Jean Dupont"
                    value={modalUserName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Adresse Email</label>
                  <input
                    type="email"
                    placeholder="Ex: jean.dupont@gmail.com"
                    value={modalUserEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition"
                    required
                  />
                </div>

                {/* Mot de passe */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {userModalMode === 'create' ? 'Mot de passe' : 'Nouveau mot de passe'}
                  </label>
                  <input
                    type="password"
                    placeholder={userModalMode === 'create' ? "Saisir le mot de passe..." : "Laisser vide pour ne pas modifier..."}
                    value={modalUserPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition"
                    required={userModalMode === 'create'}
                  />
                </div>

                {/* Rôle */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rôle de l'Utilisateur</label>
                  <select
                    value={modalRole}
                    onChange={(e) => setModalRole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition"
                  >
                    <option value="USER">USER</option>
                    <option value="COMMERCIAL">COMMERCIAL</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </div>

                {/* Rattachement Tenant */}
                {modalRole !== 'SUPER_ADMIN' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rattachement à une Organisation</label>
                    <select
                      value={modalUserTenantId}
                      onChange={(e) => setUserTenantId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition"
                    >
                      <option value="">Aucun rattachement</option>
                      {adminData?.tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Email Verified */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-150">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-slate-800">Vérification de l'Email</div>
                    <div className="text-xs text-slate-500">Marquer l'adresse email comme confirmée</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalIsEmailVerified(!modalIsEmailVerified)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${modalIsEmailVerified ? 'bg-primary' : 'bg-slate-200'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${modalIsEmailVerified ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={updatingUser}
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md"
                  >
                    {updatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create or Edit Event (Super Admin) */}
        {isEventModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm">
            <div className="bg-surface rounded-2xl border border-border shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  {eventModalMode === 'create' ? 'Créer un Événement' : `Modifier l'Événement : ${selectedEvent?.title}`}
                </h3>
                <button 
                  onClick={() => setIsEventModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Organisation */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Organisation (Tenant) *</label>
                  <select
                    value={modalEventTenantId}
                    onChange={(e) => setEventTenantId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition"
                    required
                  >
                    <option value="">Sélectionner une organisation</option>
                    {adminData?.tenants?.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Titre */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Titre de l'événement *</label>
                  <input
                    type="text"
                    placeholder="Ex: Mariage de Marc & Sophie"
                    value={modalEventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition font-semibold"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                  <textarea
                    placeholder="Détails de l'événement..."
                    value={modalEventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition font-semibold min-h-[80px]"
                  />
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date et Heure *</label>
                  <input
                    type="datetime-local"
                    value={modalEventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition font-semibold"
                    required
                  />
                </div>

                {/* Lieu */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lieu *</label>
                  <input
                    type="text"
                    placeholder="Ex: Salle de fête Palace, Paris"
                    value={modalEventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition font-semibold"
                    required
                  />
                </div>

                {/* Fréquence de rappel */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fréquence de rappel</label>
                  <select
                    value={modalEventReminderFrequency}
                    onChange={(e) => setEventReminderFrequency(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition"
                  >
                    <option value="NONE">Aucun rappel automatique</option>
                    <option value="DAILY">Quotidien (Tous les jours)</option>
                    <option value="WEEKLY">Hebdomadaire (Toutes les semaines)</option>
                  </select>
                </div>

                {/* Coordonnées GPS */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Sélectionner sur la carte</label>
                  <div 
                    id="admin-map-picker" 
                    className="w-full h-48 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden relative"
                    style={{ minHeight: '180px' }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">
                      Chargement de la carte...
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Latitude (GPS)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Ex: -4.325"
                      value={modalEventLatitude}
                      onChange={(e) => {
                        setEventLatitude(e.target.value);
                        const lat = parseFloat(e.target.value);
                        const lng = parseFloat(modalEventLongitude);
                        const L = (window as any).L;
                        if (!isNaN(lat) && !isNaN(lng) && L && mapRef.current) {
                          mapRef.current.setView([lat, lng]);
                          if (markerRef.current) {
                            markerRef.current.setLatLng([lat, lng]);
                          } else {
                            markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
                          }
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Longitude (GPS)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Ex: 15.305"
                      value={modalEventLongitude}
                      onChange={(e) => {
                        setEventLongitude(e.target.value);
                        const lat = parseFloat(modalEventLatitude);
                        const lng = parseFloat(e.target.value);
                        const L = (window as any).L;
                        if (!isNaN(lat) && !isNaN(lng) && L && mapRef.current) {
                          mapRef.current.setView([lat, lng]);
                          if (markerRef.current) {
                            markerRef.current.setLatLng([lat, lng]);
                          } else {
                            markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
                          }
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition font-semibold"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEventModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={updatingEvent}
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md"
                  >
                    {updatingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {eventModalMode === 'create' ? 'Créer' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <AdminDetailsModal
          open={isDetailsModalOpen && Boolean(detailsData)}
          type={detailsType}
          data={detailsData}
          onClose={() => setIsDetailsModalOpen(false)}
          planBadgeClass={planBadgeClass}
          tenantSubscriptionHistory={tenantSubscriptionHistory}
          loadingTenantHistory={loadingTenantHistory}
          onEdit={
            detailsType === 'tenant'
              ? () => {
                  setIsDetailsModalOpen(false);
                  handleOpenEditTenantModal(detailsData);
                }
              : detailsType === 'user'
                ? () => {
                    setIsDetailsModalOpen(false);
                    handleOpenEditUserModal(detailsData);
                  }
                : detailsType === 'guest'
                  ? () => {
                      setIsDetailsModalOpen(false);
                      handleOpenEditGuestModal(detailsData);
                    }
                  : detailsType === 'event'
                    ? () => {
                        setIsDetailsModalOpen(false);
                        handleOpenEditEventModal(detailsData);
                      }
                    : undefined
          }
        />
      </div>

      <SubscriptionApprovalModal
        request={approvalModalRequest}
        onClose={() => setApprovalModalRequest(null)}
        catalogPrices={planCatalogPrices}
        promoByPlan={planPromoByPlan}
        onConfirm={async (requestId, { discountPercent, approvedAmount }) =>
          handleApproveSubscription(requestId, { discountPercent, approvedAmount })
        }
      />
      </>
    );
  }

  // Render Regular Tenant Dashboard
  const homeEvents = paginateItems(events, homeEventsPage, HOME_EVENTS_PER_PAGE);
  const usage = orgQuota?.usage;
  const limits = orgQuota?.limits;
  const formatQuota = (used?: number, max?: number) => {
    if (used == null) return '—';
    if (max == null || max < 0) return String(used);
    return `${used} / ${max}`;
  };

  const showGreeting = widgets?.greeting !== false;
  const showStats = widgets?.stats !== false;
  const showQuota = widgets?.quota !== false;
  const showRecentEvents = widgets?.recentEvents !== false;
  const showBillingCard = widgets?.billingCard !== false;
  const showAnalyticsPromo = widgets?.analyticsPromo !== false;

  const greetingHour = new Date().getHours();
  const greetingLabel =
    greetingHour < 12 ? 'Bonjour' : greetingHour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const dateLabelLong = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6 em-dashboard-home">
      {showGreeting ? (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted capitalize">{dateLabelLong}</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
            {greetingLabel}, {(user?.name || 'là').split(' ')[0]}
          </h2>
          <p className="text-sm text-muted">
            Voici l&apos;état de vos événements et quotas aujourd&apos;hui.
          </p>
        </div>
      ) : null}

      <PageHeader
        title="Tableau de bord"
        description={
          tenant?.name
            ? `Bienvenue — ${tenant.name}. Suivez vos événements, quotas et abonnement.`
            : "Bienvenue dans votre espace de gestion d'événements."
        }
        breadcrumbs={<Breadcrumbs items={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Tableau de bord' }]} />}
        action={
          <Button onClick={() => router.push('/dashboard/events')} leftIcon={<PlusCircle className="w-4 h-4" />}>
            Créer un événement
          </Button>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      {user?.role === 'USER' && (
        <GettingStartedChecklist
          hasEvents={events.length > 0}
          firstEventId={events[0]?.id}
        />
      )}

      {showStats && (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-surface border border-border rounded-[var(--radius-card)] p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Événements</span>
            <div className="bg-primary/10 text-primary p-1.5 rounded-[var(--radius-button)]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-semibold text-foreground tracking-tight">
              {usage ? formatQuota(usage.events, limits?.maxEvents) : events.length}
            </span>
            <p className="text-[11px] text-muted mt-1">Créés dans votre organisation</p>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-[var(--radius-card)] p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Invités</span>
            <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 p-1.5 rounded-[var(--radius-button)]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-semibold text-foreground tracking-tight">
              {usage ? formatQuota(usage.guests, limits?.maxGuests) : '—'}
            </span>
            <p className="text-[11px] text-muted mt-1">Quota du forfait actuel</p>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-[var(--radius-card)] p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Modèles</span>
            <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 p-1.5 rounded-[var(--radius-button)]">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-semibold text-foreground tracking-tight">
              {usage ? formatQuota(usage.templates, limits?.maxTemplates) : '—'}
            </span>
            <p className="text-[11px] text-muted mt-1">Bibliothèque d&apos;invitations</p>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-[var(--radius-card)] p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">Forfait</span>
            <div className="bg-violet-50 dark:bg-violet-950/40 text-violet-600 p-1.5 rounded-[var(--radius-button)]">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-semibold text-foreground tracking-tight">
              {tenant?.plan || billing?.plan || '—'}
            </span>
            <p className="text-[11px] text-muted mt-1">
              {usage ? `${formatQuota(usage.rooms, limits?.maxRooms)} salles` : 'Abonnement organisation'}
            </p>
          </div>
        </div>
      </div>
      )}

      {showQuota && orgQuota && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
            Quotas restants — forfait {tenant?.plan || billing?.plan}
          </h2>
          <QuotaUsagePanel quota={orgQuota} />
        </div>
      )}

      {/* Main Row */}
      <div className={cn('grid gap-6', showBillingCard ? 'lg:grid-cols-3' : 'lg:grid-cols-1')}>
        {/* Events List */}
        <div className={cn('space-y-6', showBillingCard && 'lg:col-span-2')}>
          {showRecentEvents && (
          <div className="bg-surface border border-border rounded-[var(--radius-card)] p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">Événements récents</h2>
              <div className="flex items-center gap-2">
                <ViewModeToggle
                  storageKey="em-view-home-events"
                  value={homeEventsMode}
                  onChange={setHomeEventsMode}
                  columns={homeEventsColumns}
                  onColumnsChange={setHomeEventsColumns}
                  defaultMode="grid"
                  defaultColumns={2}
                />
                <Link href="/dashboard/events" className="text-sm font-semibold text-primary hover:text-primary-hover transition flex items-center gap-1">
                  Voir tout
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-12 bg-surface-muted border border-dashed border-border rounded-[var(--radius-card)]">
                <Calendar className="w-12 h-12 text-muted mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold text-foreground">Aucun événement</h3>
                <p className="text-sm text-muted mt-1 max-w-xs mx-auto">Vous n&apos;avez pas encore d&apos;événement. Créez-en un pour commencer à inviter des personnes.</p>
                <Link
                  href="/dashboard/events"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg text-sm transition"
                >
                  Créer mon premier événement
                </Link>
              </div>
            ) : (
              <>
              <div
                className={
                  homeEventsMode === 'list'
                    ? listStackClass
                    : homeEventsGridClass
                }
              >
                {homeEvents.map((event) => {
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
                      meta={
                        homeEventsMode === 'list' ? (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 shrink-0 opacity-70" />
                            {event.location}
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="font-medium text-primary">{dateLabel}</span>
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 shrink-0 opacity-70" />
                              {event.location}
                            </span>
                          </div>
                        )
                      }
                      value={homeEventsMode === 'list' ? dateLabel : undefined}
                      description={homeEventsMode === 'grid' ? event.description : undefined}
                      onClick={() => router.push(`/dashboard/events?id=${event.id}`)}
                      actions={
                        <Link
                          href={`/dashboard/events?id=${event.id}`}
                          className="inline-flex items-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {homeEventsMode === 'list' ? (
                            <ListRowAction />
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-primary hover:bg-surface-muted transition">
                              Ouvrir
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </Link>
                      }
                    />
                  );
                })}
              </div>
              <Pagination
                page={homeEventsPage}
                pageSize={HOME_EVENTS_PER_PAGE}
                total={events.length}
                onPageChange={setHomeEventsPage}
                itemLabel="événements"
              />
              </>
            )}
          </div>
          )}

          {/* Analytics Promo Card */}
          {showAnalyticsPromo && (
          <div className="bg-gradient-to-br from-[color-mix(in_srgb,var(--primary)_55%,#0f172a)] via-[color-mix(in_srgb,var(--primary)_25%,#020617)] to-slate-950 text-white rounded-2xl p-6 shadow-md border border-border flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[80px] pointer-events-none" />
            <div className="space-y-2 relative z-10">
              <span className="text-[10px] bg-primary/20 border border-primary/30 text-primary/80 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Nouveau</span>
              <h3 className="text-lg font-bold">Analyses & Statistiques Avancées</h3>
              <p className="text-xs text-slate-300 max-w-md leading-relaxed">
                Visualisez les régimes alimentaires de vos invités, les réponses aux questions personnalisées et exportez vos données en un clic pour une organisation parfaite.
              </p>
            </div>
            <Link 
              href="/dashboard/analytics" 
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs transition shadow-lg shadow-primary/20 whitespace-nowrap relative z-10"
            >
              <BarChart3 className="w-4 h-4" />
              Consulter les statistiques
            </Link>
          </div>
          )}
        </div>

        {/* Plan Summary Card */}
        {showBillingCard && (
        <div className="bg-surface border border-border rounded-[var(--radius-card)] p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Statut d&apos;abonnement</h2>
            
            {billing && (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-2xl flex items-center gap-4">
                  <div className="bg-primary text-white p-2.5 rounded-xl shadow-md">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Forfait Actuel</div>
                    <div className="text-xl font-black text-foreground mt-0.5">{billing.plan}</div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Isolation Stricte des Données</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>RSVP Web Dynamique</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    {billing.limits.customTemplates ? (
                      <span>Modèles d&apos;Invitation Customisés</span>
                    ) : (
                      <span className="line-through text-slate-400">Modèles d&apos;Invitation Customisés</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8">
            <Link 
              href="/dashboard/billing" 
              className="w-full flex items-center justify-center gap-2 py-3 bg-foreground hover:opacity-90 text-background font-semibold rounded-xl text-sm transition"
            >
              <CreditCard className="w-4.5 h-4.5" />
              Gérer la facturation
            </Link>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Chargement de votre espace sécurisé...</p>
        </div>
      </div>
    }>
      <DashboardPageContent />
    </Suspense>
  );
}
