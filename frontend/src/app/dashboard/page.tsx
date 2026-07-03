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
import { PageHeader, Alert, Button } from '@/components/ui';
import { PLAN_IDS, type PlanId } from '@/config/landingPricing';
import TemplatePreviewThumb from '@/components/TemplatePreviewThumb';
import TemplateCardGrid from '@/components/templates/TemplateCardGrid';
import { getTemplateElementSummary } from '@/lib/landingTemplateAdapter';

function isPlatformStaff(role?: string) {
  return role === 'SUPER_ADMIN' || role === 'COMMERCIAL';
}

const COMMERCIAL_PLATFORM_TABS = ['tenants', 'subscription-requests', 'invoices'] as const;

function planBadgeClass(plan: string): string {
  if (plan === 'FREE') return 'bg-slate-50 border-slate-200 text-slate-600';
  if (plan === 'STANDARD') return 'bg-blue-50 border-blue-100 text-blue-700';
  if (plan.startsWith('PREMIUM')) return 'bg-indigo-50 border-indigo-100 text-indigo-700';
  if (plan.startsWith('ENTERPRISE')) return 'bg-amber-50 border-amber-100 text-amber-700';
  return 'bg-slate-50 border-slate-200 text-slate-600';
}

function planBarClass(plan: string): string {
  if (plan === 'FREE') return 'bg-slate-400';
  if (plan === 'STANDARD') return 'bg-blue-500';
  if (plan.startsWith('PREMIUM')) return 'bg-indigo-600';
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
  const ITEMS_PER_PAGE = 5;
  const TEMPLATE_CARDS_PER_PAGE = 6;

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
          setEvents(eventsList.slice(0, 3));
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
      const payload = {
        eventId: modalGuestEventId,
        firstName: modalGuestFirstName,
        lastName: modalGuestLastName,
        email: modalGuestEmail,
        category: modalGuestCategory,
        rsvp: modalGuestRsvp,
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
      const phone = g.preferences?.phone || g.preferences?.telephone || "";
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
      alert('Configurations enregistrées avec succès !');
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
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 rounded-lg w-1/3 animate-pulse" />
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="h-32 bg-slate-200 rounded-2xl animate-pulse" />
          <div className="h-32 bg-slate-200 rounded-2xl animate-pulse" />
          <div className="h-32 bg-slate-200 rounded-2xl animate-pulse" />
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
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

    // Paginated arrays
    const paginatedTenants = filteredTenants.slice((tenantsPage - 1) * ITEMS_PER_PAGE, tenantsPage * ITEMS_PER_PAGE);
    const paginatedUsers = filteredUsers.slice((usersPage - 1) * ITEMS_PER_PAGE, usersPage * ITEMS_PER_PAGE);
    const paginatedTemplates = filteredTemplates.slice((templatesPage - 1) * TEMPLATE_CARDS_PER_PAGE, templatesPage * TEMPLATE_CARDS_PER_PAGE);
    const paginatedEvents = filteredEvents.slice((eventsPage - 1) * ITEMS_PER_PAGE, eventsPage * ITEMS_PER_PAGE);
    const paginatedGuests = filteredGuests.slice((guestsPage - 1) * ITEMS_PER_PAGE, guestsPage * ITEMS_PER_PAGE);

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              {isCommercialPlatform ? (
                <Briefcase className="w-8 h-8 text-amber-600" />
              ) : (
                <Shield className="w-8 h-8 text-indigo-600" />
              )}
              {isCommercialPlatform ? 'Espace Commercial' : 'Espace Super Admin'}
            </h1>
            <p className="text-slate-500 mt-1">
              {isCommercialPlatform
                ? 'Organisations parrainées, validation des abonnements et suivi de vos commissions.'
                : "Vue d'ensemble globale et gestion de la plateforme SaaS EventMaster."}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Global Statistics Widgets */}
        {adminData && (
          <div className={`grid gap-6 ${isCommercialPlatform ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
            {/* Tenants Widget */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {isCommercialPlatform ? 'Organisations parrainées' : 'Organisations'}
                </span>
                <div className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 p-2 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{adminData.stats.tenants}</span>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
                  {isCommercialPlatform ? 'Liées à votre code parrainage' : 'Inscrites sur la plateforme'}
                </p>
              </div>
            </div>

            {isCommercialPlatform ? (
              <>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Demandes en attente</span>
                    <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 p-2 rounded-xl">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{pendingSubscriptionCount}</span>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-medium">Abonnements à valider</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Commission ce mois</span>
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 p-2 rounded-xl">
                      <Wallet className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                      {(commercialOverview?.stats?.monthlyCommission ?? 0).toLocaleString('fr-FR')} FC
                    </span>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
                      {commercialOverview?.commissionRate != null
                        ? `${Math.round(commercialOverview.commissionRate * 100)} % sur factures validées`
                        : 'Commissions sur factures validées'}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
            {/* Users Widget */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Utilisateurs</span>
                <div className="bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 p-2 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{adminData.stats.users}</span>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-medium">Comptes actifs créés</p>
              </div>
            </div>

            {/* Events Widget */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Événements</span>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 p-2 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{adminData.stats.events}</span>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-medium">Organisés au total</p>
              </div>
            </div>

            {/* Guests Widget */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Invités</span>
                <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 p-2 rounded-xl">
                  <Mail className="w-5 h-5" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{adminData.stats.guests}</span>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-medium">Enregistrés dans le système</p>
              </div>
            </div>
              </>
            )}
          </div>
        )}

        {/* Global Management Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Section header */}
          <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                {activeTab === 'tenants' && <Building2 className="w-5.5 h-5.5 text-indigo-600 dark:text-indigo-400" />}
                {activeTab === 'users' && <Users className="w-5.5 h-5.5 text-indigo-600 dark:text-indigo-400" />}
                {activeTab === 'templates' && <FileText className="w-5.5 h-5.5 text-indigo-600 dark:text-indigo-400" />}
                {activeTab === 'message-templates' && <MessageSquare className="w-5.5 h-5.5 text-indigo-600 dark:text-indigo-400" />}
                {activeTab === 'events' && <Calendar className="w-5.5 h-5.5 text-indigo-600 dark:text-indigo-400" />}
                {activeTab === 'guests' && <Users className="w-5.5 h-5.5 text-indigo-600 dark:text-indigo-400" />}
                {activeTab === 'analytics' && <BarChart3 className="w-5.5 h-5.5 text-indigo-600 dark:text-indigo-400" />}
                {activeTab === 'settings' && <Key className="w-5.5 h-5.5 text-indigo-600 dark:text-indigo-400" />}
                {activeTab === 'subscription-requests' && <Clock className="w-5.5 h-5.5 text-indigo-600 dark:text-indigo-400" />}
                {activeTab === 'subscription-plans' && <CreditCard className="w-5.5 h-5.5 text-indigo-600 dark:text-indigo-400" />}
                {activeTab === 'invoices' && <FileText className="w-5.5 h-5.5 text-indigo-600 dark:text-indigo-400" />}
                
                {activeTab === 'tenants' && "Gestion des Organisations"}
                {activeTab === 'users' && "Gestion des Utilisateurs"}
                {activeTab === 'templates' && "Modèles d'Invitation Globaux"}
                {activeTab === 'message-templates' && "Modèles de Messages Invités"}
                {activeTab === 'events' && "Supervision des Événements"}
                {activeTab === 'guests' && "Supervision des Invités"}
                {activeTab === 'analytics' && "Analyses & Statistiques Globales"}
                {activeTab === 'settings' && "Configuration des Plans & Tarifs"}
                {activeTab === 'subscription-requests' && "Demandes d'abonnement"}
                {activeTab === 'subscription-plans' && 'Forfaits & abonnements'}
                {activeTab === 'invoices' && 'Factures plateforme'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {activeTab === 'tenants' && (isCommercialPlatform
                  ? "Consultez les organisations que vous avez parrainées (plan, licence, contact manager)."
                  : "Gérez les organisations enregistrées, leurs abonnements et l'état de leurs licences.")}
                {activeTab === 'users' && "Consultez et administrez l'ensemble des comptes d'utilisateurs de la plateforme."}
                {activeTab === 'templates' && "Créez et configurez des modèles d'invitation globaux réutilisables par tous."}
                {activeTab === 'message-templates' && "Personnalisez les messages WhatsApp et e-mails envoyés automatiquement aux invités."}
                {activeTab === 'events' && "Supervisez tous les événements créés par les organisations sur la plateforme."}
                {activeTab === 'guests' && "Consultez et gérez la liste globale de tous les invités enregistrés."}
                {activeTab === 'analytics' && "Visualisez les performances, l'adoption des forfaits et l'activité globale."}
                {activeTab === 'settings' && "Configurez les caractéristiques, limites et prix des différents forfaits."}
                {activeTab === 'subscription-requests' && (isCommercialPlatform
                  ? "Approuvez ou rejetez les demandes d'abonnement de vos organisations parrainées (réduction promo possible)."
                  : "Validez ou rejetez les demandes d'activation ou de changement de forfait.")}
                {activeTab === 'subscription-plans' && 'Configurez les tarifs, quotas et fonctionnalités de chaque forfait.'}
                {activeTab === 'invoices' && (isCommercialPlatform
                  ? "Factures de vos organisations parrainées et commissions associées."
                  : "Consultez toutes les factures générées après approbation, paiement ou renouvellement.")}
              </p>
            </div>

            {/* Action buttons on the right */}
            <div className="flex flex-wrap items-center gap-2">
              {activeTab === 'tenants' && (
                isCommercialPlatform ? (
                  <Link
                    href="/dashboard/commercial"
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Nouvelle organisation parrainée
                  </Link>
                ) : (
                <button
                  onClick={handleOpenCreateTenantModal}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-indigo-100 dark:shadow-none"
                >
                  <Plus className="w-4 h-4" />
                  Créer une Organisation
                </button>
                )
              )}

              {activeTab === 'users' && isSuperAdmin && (
                <button
                  onClick={handleOpenCreateUserModal}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-indigo-100 dark:shadow-none"
                >
                  <Plus className="w-4 h-4" />
                  Créer un Utilisateur
                </button>
              )}

              {activeTab === 'templates' && isSuperAdmin && (
                <Link
                  href="/dashboard/templates?new=1"
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-indigo-100 dark:shadow-none"
                >
                  <Plus className="w-4 h-4" />
                  Nouveau modèle (concepteur visuel)
                </Link>
              )}

              {activeTab === 'events' && isSuperAdmin && (
                <button
                  onClick={handleOpenCreateEventModal}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-indigo-100 dark:shadow-none"
                >
                  <Plus className="w-4 h-4" />
                  Créer un Événement
                </button>
              )}

              {activeTab === 'guests' && isSuperAdmin && (
                <div className="flex gap-2">
                  {adminGuests.length > 0 && (
                    <button
                      onClick={handleExportAdminGuests}
                      className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl text-xs transition flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Download className="w-4 h-4" />
                      Exporter CSV
                    </button>
                  )}
                  <button
                    onClick={handleOpenCreateGuestModal}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-indigo-100 dark:shadow-none"
                  >
                    <Plus className="w-4 h-4" />
                    Créer un Invité
                  </button>
                </div>
              )}
            </div>
          </div>

          {activeTab === 'analytics' && user?.role === 'SUPER_ADMIN' && (
            <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
                {ANALYTICS_SECTIONS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAnalyticsSection(id)}
                    className={cn(
                      'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all',
                      activeAnalyticsSection === id
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
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
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            {activeTab === 'tenants' && (
              <div className="flex items-center gap-2">
                <Filter className="w-4.5 h-4.5 text-slate-400 flex-shrink-0" />
                <select
                  value={filterPlan}
                  onChange={(e) => setFilterPlan(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  <option value="ALL">Tous les plans</option>
                  {PLAN_IDS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="flex items-center gap-2">
                <Filter className="w-4.5 h-4.5 text-slate-400 flex-shrink-0" />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  <option value="ALL">Tous les rôles</option>
                  <option value="USER">USER</option>
                  <option value="COMMERCIAL">COMMERCIAL</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
              </div>
            )}

            {activeTab === 'templates' && isSuperAdmin && (
              <div className="flex items-center gap-2">
                <Filter className="w-4.5 h-4.5 text-slate-400 flex-shrink-0" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  <option value="ALL">Tous les modèles</option>
                  <option value="GLOBAL">Modèles Globaux (Publics)</option>
                  <option value="TENANT">Modèles d'organisations</option>
                </select>
              </div>
            )}

            {activeTab === 'guests' && (
              <div className="flex items-center gap-2">
                <Filter className="w-4.5 h-4.5 text-slate-400 flex-shrink-0" />
                <select
                  value={filterRsvp}
                  onChange={(e) => setFilterRsvp(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  <option value="ALL">Tous les statuts RSVP</option>
                  <option value="PENDING">En attente (PENDING)</option>
                  <option value="ACCEPTED">Accepté (ACCEPTED)</option>
                  <option value="DECLINED">Décliné (DECLINED)</option>
                </select>
              </div>
            )}
          </div>
          )}

          {/* Content area */}
          <div className="p-6 bg-white dark:bg-slate-950">
            {/* Tenants Tab */}
            {activeTab === 'tenants' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Nom de l'organisation</th>
                      <th className="pb-3 font-semibold">Plan</th>
                      <th className="pb-3 font-semibold">Licence / Clé</th>
                      <th className="pb-3 font-semibold">Administrateur</th>
                      <th className="pb-3 font-semibold text-center">Membres</th>
                      <th className="pb-3 font-semibold text-center">Événements</th>
                      <th className="pb-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredTenants.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 font-medium">
                          Aucune organisation trouvée.
                        </td>
                      </tr>
                    ) : (
                      paginatedTenants.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{t.name}</span>
                              <span className="text-xs text-slate-400">Inscrite le {new Date(t.createdAt).toLocaleDateString('fr-FR')}</span>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${planBadgeClass(t.plan)}`}>
                              {t.plan}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                t.licenseActive 
                                  ? (t.licenseExpiresAt && new Date(t.licenseExpiresAt) < new Date() ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700')
                                  : 'bg-slate-100 border-slate-200 text-slate-600'
                              }`}>
                                {t.licenseActive 
                                  ? (t.licenseExpiresAt && new Date(t.licenseExpiresAt) < new Date() ? 'Expirée' : 'Active')
                                  : 'Désactivée'
                                }
                              </span>
                              {t.licenseExpiresAt && (
                                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  Exp : {new Date(t.licenseExpiresAt).toLocaleDateString('fr-FR')}
                                </span>
                              )}
                              {t.licenseKey && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-150 font-mono select-all truncate max-w-[120px]" title={t.licenseKey}>
                                  {t.licenseKey}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800">{t.managerName}</span>
                              <span className="text-xs text-slate-400">{t.managerEmail}</span>
                            </div>
                          </td>
                          <td className="py-4 text-center font-bold text-slate-700">{t.usersCount}</td>
                          <td className="py-4 text-center font-bold text-indigo-600">{t.eventsCount}</td>
                          <td className="py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenDetailsModal('tenant', t)}
                                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                                title="Voir les détails"
                              >
                                <Eye className="w-4.5 h-4.5" />
                              </button>
                              {!isCommercialPlatform && (
                                <>
                              <button
                                onClick={() => handleOpenEditTenantModal(t)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="Modifier l'organisation & licence"
                              >
                                <Edit2 className="w-4.5 h-4.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTenant(t.id, t.name)}
                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Supprimer l'organisation"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Pagination pour les organisations */}
                {filteredTenants.length > ITEMS_PER_PAGE && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-4 mt-4 bg-white">
                    <span className="text-xs text-slate-500 font-medium">
                      Affichage de {(tenantsPage - 1) * ITEMS_PER_PAGE + 1} à {Math.min(tenantsPage * ITEMS_PER_PAGE, filteredTenants.length)} sur {filteredTenants.length} organisations
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setTenantsPage(prev => Math.max(prev - 1, 1))}
                        disabled={tenantsPage === 1}
                        className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: Math.ceil(filteredTenants.length / ITEMS_PER_PAGE) }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setTenantsPage(i + 1)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            tenantsPage === i + 1 
                              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100' 
                              : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setTenantsPage(prev => Math.min(prev + 1, Math.ceil(filteredTenants.length / ITEMS_PER_PAGE)))}
                        disabled={tenantsPage === Math.ceil(filteredTenants.length / ITEMS_PER_PAGE)}
                        className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="overflow-x-auto">
                {usersLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    <p className="text-sm font-medium text-slate-500">Chargement des utilisateurs...</p>
                  </div>
                ) : (
                  <>
                    <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Utilisateur</th>
                        <th className="pb-3 font-semibold">Rôle</th>
                        <th className="pb-3 font-semibold">Vérification Email</th>
                        <th className="pb-3 font-semibold">Organisation (Tenant)</th>
                        <th className="pb-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500 font-medium">
                            Aucun utilisateur trouvé.
                          </td>
                        </tr>
                      ) : (
                        paginatedUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{u.name || 'Sans nom'}</span>
                                <span className="text-xs text-slate-400">{u.email}</span>
                              </div>
                            </td>
                            <td className="py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                                u.role === 'SUPER_ADMIN' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                                u.role === 'COMMERCIAL' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                                'bg-slate-50 border-slate-200 text-slate-600'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="py-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                u.isEmailVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {u.isEmailVerified ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                {u.isEmailVerified ? 'Vérifié' : 'Non vérifié'}
                              </span>
                            </td>
                            <td className="py-4 font-semibold text-slate-700">{u.tenantName}</td>
                            <td className="py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenDetailsModal('user', u)}
                                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                                  title="Voir les détails"
                                >
                                  <Eye className="w-4.5 h-4.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditUserModal(u)}
                                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                  title="Modifier l'utilisateur"
                                >
                                  <Edit2 className="w-4.5 h-4.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.email)}
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Supprimer l'utilisateur"
                                  disabled={u.id === user.id} // Cannot delete self
                                >
                                  <Trash2 className={`w-4.5 h-4.5 ${u.id === user.id ? 'opacity-30 cursor-not-allowed' : ''}`} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Pagination pour les utilisateurs */}
                  {filteredUsers.length > ITEMS_PER_PAGE && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-4 mt-4 bg-white">
                      <span className="text-xs text-slate-500 font-medium">
                        Affichage de {(usersPage - 1) * ITEMS_PER_PAGE + 1} à {Math.min(usersPage * ITEMS_PER_PAGE, filteredUsers.length)} sur {filteredUsers.length} utilisateurs
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setUsersPage(prev => Math.max(prev - 1, 1))}
                          disabled={usersPage === 1}
                          className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        {Array.from({ length: Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setUsersPage(i + 1)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                              usersPage === i + 1 
                                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100' 
                                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => setUsersPage(prev => Math.min(prev + 1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)))}
                          disabled={usersPage === Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)}
                          className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  </>
                )}
              </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && isSuperAdmin && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Modèles globaux</p>
                    <p className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-300 mt-1">{templates.filter((t) => t.isGlobal).length}</p>
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
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    <p className="text-sm font-medium text-slate-500">Chargement des modèles...</p>
                  </div>
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
                          href="/dashboard/templates?new=1"
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition"
                        >
                          <Plus className="w-4 h-4" />
                          Créer un modèle dans le concepteur visuel
                        </Link>
                      }
                      editHref={(t) => `/dashboard/templates?edit=${t.id}`}
                      onViewDetails={(t) => handleOpenDetailsModal('template', paginatedTemplates.find((x) => x.id === t.id))}
                      onDuplicate={(t) => handleDuplicateAdminTemplate(paginatedTemplates.find((x) => x.id === t.id))}
                      onDelete={handleDeleteTemplate}
                      onToggleLanding={handleToggleTemplateLanding}
                    />

                  {filteredTemplates.length > TEMPLATE_CARDS_PER_PAGE && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 mt-6">
                      <span className="text-xs text-slate-500 font-medium">
                        Affichage de {(templatesPage - 1) * TEMPLATE_CARDS_PER_PAGE + 1} à {Math.min(templatesPage * TEMPLATE_CARDS_PER_PAGE, filteredTemplates.length)} sur {filteredTemplates.length} modèles
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setTemplatesPage(prev => Math.max(prev - 1, 1))}
                          disabled={templatesPage === 1}
                          className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent transition"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        {Array.from({ length: Math.ceil(filteredTemplates.length / TEMPLATE_CARDS_PER_PAGE) }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setTemplatesPage(i + 1)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                              templatesPage === i + 1
                                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
                                : 'border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => setTemplatesPage(prev => Math.min(prev + 1, Math.ceil(filteredTemplates.length / TEMPLATE_CARDS_PER_PAGE)))}
                          disabled={templatesPage === Math.ceil(filteredTemplates.length / TEMPLATE_CARDS_PER_PAGE)}
                          className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent transition"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
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
              <div className="overflow-x-auto">
                {adminEventsLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    <p className="text-sm font-medium text-slate-500">Chargement des événements...</p>
                  </div>
                ) : (
                  <>
                    <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Événement</th>
                        <th className="pb-3 font-semibold">Organisation</th>
                        <th className="pb-3 font-semibold">Lieu</th>
                        <th className="pb-3 font-semibold">Statistiques</th>
                        <th className="pb-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredEvents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500 font-medium">
                            Aucun événement trouvé.
                          </td>
                        </tr>
                      ) : (
                        paginatedEvents.map((e) => (
                          <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{e.title}</span>
                                <span className="text-xs text-slate-400">
                                  Prévu le {new Date(e.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 font-semibold text-slate-700">{e.tenantName}</td>
                            <td className="py-4 text-slate-600 font-medium">{e.location}</td>
                            <td className="py-4">
                              <div className="flex items-center gap-3 text-xs font-bold">
                                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  {e.guestCount} invités
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                                  {e.invitationCount} invitations
                                </span>
                              </div>
                            </td>
                            <td className="py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenDetailsModal('event', e)}
                                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                                  title="Voir les détails"
                                >
                                  <Eye className="w-4.5 h-4.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditEventModal(e)}
                                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                  title="Modifier l'événement"
                                >
                                  <Edit2 className="w-4.5 h-4.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEvent(e.id, e.title)}
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Supprimer l'événement"
                                >
                                  <Trash2 className="w-4.5 h-4.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Pagination pour les événements */}
                  {filteredEvents.length > ITEMS_PER_PAGE && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-4 mt-4 bg-white">
                      <span className="text-xs text-slate-500 font-medium">
                        Affichage de {(eventsPage - 1) * ITEMS_PER_PAGE + 1} à {Math.min(eventsPage * ITEMS_PER_PAGE, filteredEvents.length)} sur {filteredEvents.length} événements
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEventsPage(prev => Math.max(prev - 1, 1))}
                          disabled={eventsPage === 1}
                          className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        {Array.from({ length: Math.ceil(filteredEvents.length / ITEMS_PER_PAGE) }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setEventsPage(i + 1)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                              eventsPage === i + 1 
                                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100' 
                                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => setEventsPage(prev => Math.min(prev + 1, Math.ceil(filteredEvents.length / ITEMS_PER_PAGE)))}
                          disabled={eventsPage === Math.ceil(filteredEvents.length / ITEMS_PER_PAGE)}
                          className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  </>
                )}
              </div>
            )}

            {/* Guests Tab */}
            {activeTab === 'guests' && (
              <div className="overflow-x-auto">
                {adminGuestsLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    <p className="text-sm font-medium text-slate-500">Chargement des invités...</p>
                  </div>
                ) : (
                  <>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <th className="pb-3 font-semibold">Invité</th>
                          <th className="pb-3 font-semibold">Email</th>
                          <th className="pb-3 font-semibold">Catégorie</th>
                          <th className="pb-3 font-semibold">Statut RSVP</th>
                          <th className="pb-3 font-semibold">Événement / Organisation</th>
                          <th className="pb-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredGuests.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                              Aucun invité trouvé.
                            </td>
                          </tr>
                        ) : (
                          paginatedGuests.map((g) => (
                            <tr key={g.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4">
                                <span className="font-bold text-slate-900">{g.lastName} {g.firstName}</span>
                              </td>
                              <td className="py-4 text-slate-600 font-medium">{g.email}</td>
                              <td className="py-4">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                  {g.category}
                                </span>
                              </td>
                              <td className="py-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                                  g.rsvp === 'ACCEPTED' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                                  g.rsvp === 'DECLINED' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                                  'bg-amber-50 border-amber-100 text-amber-700'
                                }`}>
                                  {g.rsvp === 'ACCEPTED' ? 'Accepté' :
                                   g.rsvp === 'DECLINED' ? 'Décliné' :
                                   'En attente'}
                                </span>
                              </td>
                              <td className="py-4">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-800">{g.eventTitle}</span>
                                  <span className="text-xs text-slate-400">{g.tenantName}</span>
                                </div>
                              </td>
                              <td className="py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenDetailsModal('guest', g)}
                                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                                    title="Voir les détails"
                                  >
                                    <Eye className="w-4.5 h-4.5" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditGuestModal(g)}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                    title="Modifier l'invité"
                                  >
                                    <Edit2 className="w-4.5 h-4.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteGuest(g.id, `${g.firstName} ${g.lastName}`)}
                                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                    title="Supprimer l'invité"
                                  >
                                    <Trash2 className="w-4.5 h-4.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {/* Pagination pour les invités */}
                    {filteredGuests.length > ITEMS_PER_PAGE && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-4 mt-4 bg-white">
                        <span className="text-xs text-slate-500 font-medium">
                          Affichage de {(guestsPage - 1) * ITEMS_PER_PAGE + 1} à {Math.min(guestsPage * ITEMS_PER_PAGE, filteredGuests.length)} sur {filteredGuests.length} invités
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setGuestsPage(prev => Math.max(prev - 1, 1))}
                            disabled={guestsPage === 1}
                            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          {Array.from({ length: Math.ceil(filteredGuests.length / ITEMS_PER_PAGE) }).map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setGuestsPage(i + 1)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                guestsPage === i + 1 
                                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100' 
                                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {i + 1}
                            </button>
                          ))}
                          <button
                            onClick={() => setGuestsPage(prev => Math.min(prev + 1, Math.ceil(filteredGuests.length / ITEMS_PER_PAGE)))}
                            disabled={guestsPage === Math.ceil(filteredGuests.length / ITEMS_PER_PAGE)}
                            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="max-w-4xl mx-auto">
                {adminSettingsLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    <p className="text-sm font-medium text-slate-500">Chargement des configurations...</p>
                  </div>
                ) : (
                  adminSettings && (
                    <form onSubmit={handleSaveSettings} className="space-y-8 animate-in fade-in duration-200">
                      {/* Section 1: Plateforme */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
                          <Globe className="w-5 h-5 text-indigo-600" />
                          Paramètres Généraux de la Plateforme
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nom de la plateforme</label>
                            <input
                              type="text"
                              value={adminSettings.platformName}
                              onChange={(e) => setAdminSettings({ ...adminSettings, platformName: e.target.value })}
                              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Email de support</label>
                            <input
                              type="email"
                              value={adminSettings.supportEmail}
                              onChange={(e) => setAdminSettings({ ...adminSettings, supportEmail: e.target.value })}
                              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                          <label className="flex items-center gap-3 cursor-pointer bg-white p-4 border border-slate-200 rounded-xl hover:bg-slate-50/50 transition">
                            <input
                              type="checkbox"
                              checked={adminSettings.maintenanceMode}
                              onChange={(e) => setAdminSettings({ ...adminSettings, maintenanceMode: e.target.checked })}
                              className="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                            />
                            <div>
                              <span className="text-sm font-bold text-slate-800 block">Mode Maintenance</span>
                              <span className="text-xs text-slate-500 font-medium">Bloquer temporairement l'accès à l'application pour les utilisateurs.</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 cursor-pointer bg-white p-4 border border-slate-200 rounded-xl hover:bg-slate-50/50 transition">
                            <input
                              type="checkbox"
                              checked={adminSettings.allowRegistration}
                              onChange={(e) => setAdminSettings({ ...adminSettings, allowRegistration: e.target.checked })}
                              className="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                            />
                            <div>
                              <span className="text-sm font-bold text-slate-800 block">Inscriptions Ouvertes</span>
                              <span className="text-xs text-slate-500 font-medium">Permettre aux nouveaux utilisateurs de créer un compte.</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Section 2: WhatsApp */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
                          <Mail className="w-5 h-5 text-indigo-600" />
                          Configuration UltraMsg (WhatsApp)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">UltraMsg Instance ID</label>
                            <input
                              type="text"
                              value={adminSettings.ultramsgInstanceId}
                              onChange={(e) => setAdminSettings({ ...adminSettings, ultramsgInstanceId: e.target.value })}
                              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono"
                              placeholder="ex: instance12345"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">UltraMsg Token</label>
                            <input
                              type="password"
                              value={adminSettings.ultramsgToken}
                              onChange={(e) => setAdminSettings({ ...adminSettings, ultramsgToken: e.target.value })}
                              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono"
                              placeholder="••••••••••••••••••••••••••••••••"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Email */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
                          <Mail className="w-5 h-5 text-indigo-600" />
                          Configurations SendGrid (Email)
                        </h3>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">SendGrid API Key</label>
                          <input
                            type="password"
                            value={adminSettings.sendgridApiKey}
                            onChange={(e) => setAdminSettings({ ...adminSettings, sendgridApiKey: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono"
                            placeholder="ex: SG.••••••••••••••••••••••••••••••••"
                          />
                        </div>
                      </div>

                      {/* Submit Button */}
                      <div className="flex justify-end gap-3">
                        <button
                          type="submit"
                          disabled={savingSettings}
                          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-50"
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
                  <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    Demandes reçues ({subscriptionRequests.length})
                  </h4>

                  {subRequestsLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                      <p className="text-sm font-medium text-slate-500">Chargement des demandes d'abonnement...</p>
                    </div>
                  ) : subscriptionRequests.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-150 p-6">
                      <p className="text-slate-500 text-xs font-medium">Aucune demande d'abonnement soumise pour le moment.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <th className="pb-3 font-semibold">Organisation</th>
                            <th className="pb-3 font-semibold">Forfait actuel</th>
                            <th className="pb-3 font-semibold">Plan Demandé</th>
                            <th className="pb-3 font-semibold">Durée</th>
                            <th className="pb-3 font-semibold">Preuve / Référence</th>
                            <th className="pb-3 font-semibold">Date de Demande</th>
                            <th className="pb-3 font-semibold">Commercial</th>
                            <th className="pb-3 font-semibold">Statut</th>
                            <th className="pb-3 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {subscriptionRequests.map((req) => (
                            <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4">
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-900">{req.tenant?.name || 'Inconnue'}</span>
                                  <span className="text-xs text-slate-400">ID: {req.tenantId}</span>
                                </div>
                              </td>
                              <td className="py-4">
                                <span className={`px-2 py-0.5 rounded text-xs font-extrabold border ${planBadgeClass(req.tenant?.plan || 'FREE')}`}>
                                  {req.tenant?.plan || 'FREE'}
                                </span>
                                {req.tenant?.licenseExpiresAt && req.tenant?.licenseActive && (
                                  <p className="text-[10px] text-slate-400 mt-1">
                                    exp. {new Date(req.tenant.licenseExpiresAt).toLocaleDateString('fr-FR')}
                                  </p>
                                )}
                              </td>
                              <td className="py-4">
                                <span className={`px-2 py-0.5 rounded text-xs font-extrabold border ${planBadgeClass(req.requestedPlan)}`}>
                                  {req.requestedPlan}
                                </span>
                              </td>
                              <td className="py-4 font-semibold text-slate-700">
                                {req.durationDays} jours
                              </td>
                              <td className="py-4">
                                <div className="max-w-xs truncate text-xs text-slate-600 font-medium italic" title={req.proofOfPayment}>
                                  {req.proofOfPayment ? `"${req.proofOfPayment}"` : 'Aucune preuve fournie'}
                                </div>
                              </td>
                              <td className="py-4 text-xs text-slate-500">
                                {new Date(req.createdAt).toLocaleDateString('fr-FR', {
                                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                              </td>
                              <td className="py-4">
                                {req.tenant?.referredByCommercial || req.tenant?.referredByOrgUser ? (
                                  <div className="text-xs space-y-0.5">
                                    {req.tenant.referredByCommercial && (
                                      <span className="block text-indigo-600 font-semibold" title={req.tenant.referredByCommercial.email}>
                                        {req.tenant.referredByCommercial.name || 'Commercial plateforme'}
                                      </span>
                                    )}
                                    {req.tenant?.referredByOrgUser?.orgRole === 'COMMERCIAL' && (
                                      <span className="block text-violet-600 font-semibold" title={req.tenant.referredByOrgUser.email}>
                                        {req.tenant.referredByOrgUser.name || 'Commercial org.'}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">—</span>
                                )}
                              </td>
                              <td className="py-4">
                                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                                  req.status === 'APPROVED' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                                  req.status === 'REJECTED' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                                  'bg-amber-50 border-amber-100 text-amber-700'
                                }`}>
                                  {req.status === 'APPROVED' ? 'Approuvée' :
                                   req.status === 'REJECTED' ? 'Rejetée' : 'En attente'}
                                </span>
                              </td>
                              <td className="py-4 text-right">
                                {req.status === 'PENDING' ? (
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={() => setApprovalModalRequest(req)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-sm"
                                    >
                                      Approuver
                                    </button>
                                    <button
                                      onClick={() => handleRejectSubscription(req.id)}
                                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition shadow-sm"
                                    >
                                      Rejeter
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 font-medium italic">Traitée</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Forfaits & abonnements */}
            {activeTab === 'subscription-plans' && isSuperAdmin && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {adminSettingsLoading ? (
                  <div className="py-12 flex justify-center">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  </div>
                ) : adminSettings && adminSettings.plans ? (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-indigo-600" />
                        Configuration des forfaits ({PLAN_IDS.length})
                      </h4>
                    </div>

                    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
                      {PLAN_IDS.map((planKey) => {
                        const plan = adminSettings.plans[planKey];
                        if (!plan) return null;

                        return (
                          <div key={planKey} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider">{planKey}</span>
                              <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full">
                                {planKey === 'FREE' ? 'Gratuit' : 'Mensuel'}
                              </span>
                            </div>

                            <div className="space-y-3">
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
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 transition"
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
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 transition resize-none"
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
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 transition"
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
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 transition"
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
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 transition"
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
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 transition"
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
                                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
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
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-indigo-100 disabled:opacity-50 cursor-pointer"
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
                  <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Toutes les factures ({adminInvoices.length})
                  </h4>
                  {loadingAdminInvoices ? (
                    <div className="py-12 flex justify-center">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    </div>
                  ) : (
                    <InvoiceListPanel
                      invoices={adminInvoices}
                      showOrganization
                      showCommissions
                      apiPrefix="admin"
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
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
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
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
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
                      <PieChart className="w-5 h-5 text-indigo-600" />
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
                        <Sparkles className="w-4 h-4 text-indigo-500" />
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
                      <TrendingUp className="w-5 h-5 text-indigo-600" />
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
                              <span className="font-extrabold text-indigo-600 block">{t.eventsCount} events</span>
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
                      <CreditCard className="w-5 h-5 text-indigo-600" />
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
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition"
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
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                          <span className="text-xs font-bold text-indigo-600 uppercase">Revenus bruts</span>
                          <p className="text-xl font-extrabold text-indigo-900 mt-1">{revenueReport.summary.totalRevenueFormatted}</p>
                          <span className="text-xs text-indigo-500">{revenueReport.summary.invoiceCount} facture(s)</span>
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
                                <span className="font-bold text-indigo-600">{m.revenueFormatted}</span>
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
                                    <td className="px-4 py-2 font-bold text-indigo-600">{inv.amountFormatted}</td>
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
                        <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Répartition des modèles
                      </h3>
                      <div className="space-y-3">
                        {[
                          { label: 'Total des modèles', value: templates.length, color: 'text-slate-800 dark:text-slate-200' },
                          { label: 'Modèles globaux (publics)', value: templates.filter(t => t.isGlobal).length, color: 'text-indigo-600 dark:text-indigo-400' },
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
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline pt-2"
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
                        <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
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
                        <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
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
                        <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
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
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
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
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
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
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Nom de famille</label>
                    <input
                      type="text"
                      value={modalGuestLastName}
                      onChange={(e) => setGuestLastName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
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
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                    required
                  />
                </div>

                {/* Catégorie */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Catégorie</label>
                  <input
                    type="text"
                    value={modalGuestCategory}
                    onChange={(e) => setGuestCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                    placeholder="ex: Famille, VIP, Collègue..."
                  />
                </div>

                {/* Statut RSVP */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Statut RSVP</label>
                  <select
                    value={modalGuestRsvp}
                    onChange={(e) => setGuestRsvp(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
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
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-md shadow-indigo-100 disabled:opacity-50"
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
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-semibold"
                    required
                  />
                </div>

                {/* Forfait / Plan */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Forfait d'Abonnement</label>
                  <select
                    value={modalPlan}
                    onChange={(e) => setModalPlan(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${modalLicenseActive ? 'bg-indigo-600' : 'bg-slate-200'}`}
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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
                  <div className="space-y-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-slate-800">Facturation</div>
                        <div className="text-xs text-slate-500">Renouvellement ou changement de forfait</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setModalIssueInvoice(!modalIssueInvoice)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${modalIssueInvoice ? 'bg-indigo-600' : 'bg-slate-200'}`}
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
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md shadow-indigo-100"
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
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    required={userModalMode === 'create'}
                  />
                </div>

                {/* Rôle */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rôle de l'Utilisateur</label>
                  <select
                    value={modalRole}
                    onChange={(e) => setModalRole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${modalIsEmailVerified ? 'bg-indigo-600' : 'bg-slate-200'}`}
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
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md shadow-indigo-100"
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
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-semibold"
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-semibold min-h-[80px]"
                  />
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date et Heure *</label>
                  <input
                    type="datetime-local"
                    value={modalEventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-semibold"
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-semibold"
                    required
                  />
                </div>

                {/* Fréquence de rappel */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fréquence de rappel</label>
                  <select
                    value={modalEventReminderFrequency}
                    onChange={(e) => setEventReminderFrequency(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-semibold"
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
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-semibold"
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
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md shadow-indigo-100"
                  >
                    {updatingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {eventModalMode === 'create' ? 'Créer' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: View Details (Super Admin) */}
        {isDetailsModalOpen && detailsData && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`bg-white rounded-2xl border border-slate-200 shadow-xl w-full overflow-hidden animate-in fade-in zoom-in duration-200 ${detailsType === 'tenant' ? 'max-w-2xl' : 'max-w-lg'}`}>
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-600" />
                  {detailsType === 'tenant' && "Détails de l'Organisation"}
                  {detailsType === 'user' && "Détails de l'Utilisateur"}
                  {detailsType === 'template' && "Détails du Modèle d'Invitation"}
                  {detailsType === 'event' && "Détails de l'Événement"}
                  {detailsType === 'guest' && "Détails de l'Invité"}
                </h3>
                <button 
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* 1. TENANT DETAILS */}
                {detailsType === 'tenant' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="bg-indigo-100 text-indigo-700 p-2.5 rounded-xl">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-lg">{detailsData.name}</h4>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">ID: {detailsData.id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Forfait</span>
                        <span className="text-sm font-extrabold text-indigo-600 mt-1 block">{detailsData.plan}</span>
                      </div>
                      <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date d'inscription</span>
                        <span className="text-sm font-bold text-slate-700 mt-1 block">
                          {new Date(detailsData.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1.5">Gérant de l'organisation</h5>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-xs text-slate-400 block">Nom</span>
                          <span className="font-bold text-slate-800">{detailsData.managerName || 'Aucun'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 block">Email</span>
                          <span className="font-bold text-slate-800 break-all">{detailsData.managerEmail || 'Aucun'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1.5">Licence d'Accès</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Statut de la licence :</span>
                          <span className={`font-bold ${detailsData.licenseActive ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {detailsData.licenseActive ? 'Active' : 'Désactivée'}
                          </span>
                        </div>
                        {detailsData.licenseExpiresAt && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Date d'expiration :</span>
                            <span className="font-bold text-slate-800">
                              {new Date(detailsData.licenseExpiresAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                        {detailsData.licenseKey && (
                          <div className="space-y-1">
                            <span className="text-xs text-slate-400 block">Clé de licence :</span>
                            <div className="bg-slate-100 p-2 rounded border border-slate-200 font-mono text-xs select-all break-all">
                              {detailsData.licenseKey}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-indigo-50/30 p-3.5 rounded-xl border border-indigo-100 text-center">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">Utilisateurs</span>
                        <span className="text-2xl font-black text-indigo-700 mt-1 block">{detailsData.usersCount}</span>
                      </div>
                      <div className="bg-violet-50/30 p-3.5 rounded-xl border border-violet-100 text-center">
                        <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider block">Événements</span>
                        <span className="text-2xl font-black text-violet-700 mt-1 block">{detailsData.eventsCount}</span>
                      </div>
                    </div>

                    <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-2">
                        <History className="w-3.5 h-3.5" />
                        Historique des abonnements ({tenantSubscriptionHistory.length})
                      </h5>
                      {loadingTenantHistory ? (
                        <div className="py-6 flex justify-center">
                          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                        </div>
                      ) : tenantSubscriptionHistory.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-4">Aucune demande ni facture enregistrée pour cette organisation.</p>
                      ) : (
                        <div className="overflow-x-auto max-h-64 overflow-y-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase">
                                <th className="pb-2 pr-2">Date</th>
                                <th className="pb-2 pr-2">Type</th>
                                <th className="pb-2 pr-2">Forfait</th>
                                <th className="pb-2 pr-2">Durée</th>
                                <th className="pb-2 pr-2">Statut</th>
                                <th className="pb-2">Facture</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {tenantSubscriptionHistory.map((entry) => (
                                <tr key={`${entry.kind}-${entry.id}`}>
                                  <td className="py-2 pr-2 text-slate-600 whitespace-nowrap">
                                    {new Date(entry.date).toLocaleDateString('fr-FR', {
                                      day: 'numeric', month: 'short', year: 'numeric',
                                    })}
                                  </td>
                                  <td className="py-2 pr-2">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      entry.kind === 'REQUEST' ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'
                                    }`}>
                                      {entry.kind === 'REQUEST' ? 'Demande' : 'Facture'}
                                    </span>
                                  </td>
                                  <td className="py-2 pr-2">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${planBadgeClass(entry.plan)}`}>
                                      {entry.plan}
                                    </span>
                                  </td>
                                  <td className="py-2 pr-2 text-slate-600">
                                    {entry.durationDays ? `${entry.durationDays} j` : '—'}
                                  </td>
                                  <td className="py-2 pr-2">
                                    {entry.kind === 'REQUEST' ? (
                                      <span className={`text-[10px] font-bold ${
                                        entry.status === 'APPROVED' ? 'text-emerald-600' :
                                        entry.status === 'REJECTED' ? 'text-rose-600' : 'text-amber-600'
                                      }`}>
                                        {entry.statusLabel}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-slate-500">
                                        {entry.invoice?.statusLabel || '—'}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2">
                                    {entry.invoice ? (
                                      <div className="flex flex-col">
                                        <span className="font-mono text-[10px] text-slate-700">{entry.invoice.invoiceNumber}</span>
                                        <span className="font-bold text-indigo-600">{entry.invoice.amountFormatted}</span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. USER DETAILS */}
                {detailsType === 'user' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="bg-violet-100 text-violet-700 p-2.5 rounded-xl">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-lg">{detailsData.name || 'Sans nom'}</h4>
                        <p className="text-xs text-slate-400 font-semibold">{detailsData.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rôle</span>
                        <span className="font-extrabold text-indigo-600 mt-1 block">{detailsData.role}</span>
                      </div>
                      <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vérification Email</span>
                        <span className={`font-bold mt-1 block ${detailsData.isEmailVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {detailsData.isEmailVerified ? 'Vérifié' : 'Non vérifié'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Organisation rattachée :</span>
                        <span className="font-bold text-slate-800">{detailsData.tenantName}</span>
                      </div>
                      {detailsData.tenantId && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">ID Organisation :</span>
                          <span className="font-mono text-xs text-slate-600">{detailsData.tenantId}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500">ID Utilisateur :</span>
                        <span className="font-mono text-xs text-slate-600">{detailsData.id}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. TEMPLATE DETAILS */}
                {detailsType === 'template' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="bg-amber-100 text-amber-700 p-2.5 rounded-xl">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-lg">{detailsData.name}</h4>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">ID: {detailsData.id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Type de modèle</span>
                        <span className="font-extrabold text-indigo-600 mt-1 block">
                          {detailsData.isGlobal ? 'Global (Public)' : 'Privé'}
                        </span>
                      </div>
                      <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Créateur / Organisation</span>
                        <span className="font-bold text-slate-700 mt-1 block">{detailsData.tenantName}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Affiché sur la landing page :</span>
                        <span className={`font-bold ${detailsData.showOnLanding ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {detailsData.showOnLanding ? 'Oui' : 'Non'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Date de création :</span>
                        <span className="font-bold text-slate-800">
                          {new Date(detailsData.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Template Content Preview */}
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1.5">Aperçu du contenu</h5>
                      {detailsData.content?.subject && (
                        <div>
                          <span className="text-xs text-slate-400 block">Sujet par défaut :</span>
                          <span className="text-sm font-bold text-slate-800">{detailsData.content.subject}</span>
                        </div>
                      )}
                      {detailsData.content?.body && (
                        <div>
                          <span className="text-xs text-slate-400 block">Message par défaut :</span>
                          <p className="text-xs bg-white p-2.5 rounded border border-slate-200 text-slate-700 whitespace-pre-wrap font-medium">
                            {detailsData.content.body}
                          </p>
                        </div>
                      )}
                      {detailsData.content?.elements && (
                        <div>
                          <span className="text-xs text-slate-400 block">Composants visuels ({detailsData.content.elements.length}) :</span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {detailsData.content.elements.map((el: any, idx: number) => (
                              <span key={idx} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                                {el.type} {el.text ? `("${el.text.slice(0, 15)}")` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. EVENT DETAILS */}
                {detailsType === 'event' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="bg-emerald-100 text-emerald-700 p-2.5 rounded-xl">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-lg">{detailsData.title}</h4>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">ID: {detailsData.id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date et Heure</span>
                        <span className="font-bold text-slate-800 mt-1 block">
                          {new Date(detailsData.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lieu</span>
                        <span className="font-bold text-slate-800 mt-1 block">{detailsData.location}</span>
                      </div>
                    </div>

                    {detailsData.description && (
                      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-sm">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Description</span>
                        <p className="text-slate-700 mt-1 font-medium whitespace-pre-wrap">{detailsData.description}</p>
                      </div>
                    )}

                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Organisation rattachée :</span>
                        <span className="font-bold text-slate-800">{detailsData.tenantName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Fréquence de rappel :</span>
                        <span className="font-bold text-indigo-600">{detailsData.reminderFrequency}</span>
                      </div>
                      {(detailsData.latitude || detailsData.longitude) && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Coordonnées GPS :</span>
                          <span className="font-mono text-xs font-bold text-slate-700">
                            {detailsData.latitude}, {detailsData.longitude}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-indigo-50/30 p-3.5 rounded-xl border border-indigo-100 text-center">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">Invités enregistrés</span>
                        <span className="text-2xl font-black text-indigo-700 mt-1 block">{detailsData.guestCount}</span>
                      </div>
                      <div className="bg-emerald-50/30 p-3.5 rounded-xl border border-emerald-100 text-center">
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">Invitations associées</span>
                        <span className="text-2xl font-black text-emerald-700 mt-1 block">{detailsData.invitationCount}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. GUEST DETAILS */}
                {detailsType === 'guest' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="bg-indigo-100 text-indigo-700 p-2.5 rounded-xl">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-lg">{detailsData.lastName} {detailsData.firstName}</h4>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">ID: {detailsData.id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Adresse Email</span>
                        <span className="font-bold text-slate-800 mt-1 block select-all">{detailsData.email}</span>
                      </div>
                      <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Catégorie</span>
                        <span className="font-bold text-slate-800 mt-1 block">{detailsData.category}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Statut de réponse (RSVP) :</span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                          detailsData.rsvp === 'ACCEPTED' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                          detailsData.rsvp === 'DECLINED' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                          'bg-amber-50 border-amber-100 text-amber-700'
                        }`}>
                          {detailsData.rsvp === 'ACCEPTED' ? 'Accepté' :
                           detailsData.rsvp === 'DECLINED' ? 'Décliné' :
                           'En attente'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Événement associé :</span>
                        <span className="font-bold text-slate-800">{detailsData.eventTitle}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Organisation rattachée :</span>
                        <span className="font-bold text-slate-800">{detailsData.tenantName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Enregistré le :</span>
                        <span className="font-bold text-slate-800">
                          {new Date(detailsData.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {detailsData.preferences && Object.keys(detailsData.preferences).length > 0 && (
                      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-sm space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Préférences & Infos supplémentaires</span>
                        <div className="grid grid-cols-1 gap-2 pt-1">
                          {Object.entries(detailsData.preferences).map(([key, value]: [string, any]) => (
                            <div key={key} className="flex justify-between border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                              <span className="text-slate-500 font-medium capitalize">{key} :</span>
                              <span className="font-bold text-slate-800">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition shadow-md shadow-indigo-100"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Regular Tenant Dashboard
  return (
    <div className="space-y-8">
      <PageHeader
        title="Tableau de bord"
        description="Bienvenue dans votre espace d'administration de gestion d'événements privés."
        action={
          <Button onClick={() => router.push('/dashboard/events')} leftIcon={<PlusCircle className="w-4 h-4" />}>
            Créer un événement
          </Button>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      {orgQuota && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
            Quotas restants — forfait {tenant?.plan || billing?.plan}
          </h2>
          <QuotaUsagePanel quota={orgQuota} />
        </div>
      )}

      {/* Main Row */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Events List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Événements Récents</h2>
              <Link href="/dashboard/events" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition flex items-center gap-1">
                Voir tout
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-semibold text-slate-700">Aucun événement</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">Vous n'avez pas encore d'événement. Créez-en un pour commencer à inviter des personnes.</p>
                <Link 
                  href="/dashboard/events" 
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition"
                >
                  Créer mon premier événement
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="p-4 border border-slate-150 rounded-xl hover:bg-slate-50 transition flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-900">{event.title}</h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • {event.location}
                      </p>
                      {event.description && <p className="text-sm text-slate-600 line-clamp-1">{event.description}</p>}
                    </div>
                    <Link 
                      href={`/dashboard/events?id=${event.id}`}
                      className="p-2 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg transition"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Analytics Promo Card */}
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none" />
            <div className="space-y-2 relative z-10">
              <span className="text-[10px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Nouveau</span>
              <h3 className="text-lg font-bold">Analyses & Statistiques Avancées</h3>
              <p className="text-xs text-slate-300 max-w-md leading-relaxed">
                Visualisez les régimes alimentaires de vos invités, les réponses aux questions personnalisées et exportez vos données en un clic pour une organisation parfaite.
              </p>
            </div>
            <Link 
              href="/dashboard/analytics" 
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-500/20 whitespace-nowrap relative z-10"
            >
              <BarChart3 className="w-4 h-4" />
              Consulter les statistiques
            </Link>
          </div>
        </div>

        {/* Plan Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 font-sans">Statut d'Abonnement</h2>
            
            {billing && (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl flex items-center gap-4">
                  <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md shadow-indigo-150">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Forfait Actuel</div>
                    <div className="text-xl font-black text-indigo-950 mt-0.5">{billing.plan}</div>
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
                      <span>Modèles d'Invitation Customisés</span>
                    ) : (
                      <span className="line-through text-slate-400">Modèles d'Invitation Customisés</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8">
            <Link 
              href="/dashboard/billing" 
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-slate-100"
            >
              <CreditCard className="w-4.5 h-4.5" />
              Gérer la facturation
            </Link>
          </div>
        </div>
      </div>

      <SubscriptionApprovalModal
        request={approvalModalRequest}
        onClose={() => setApprovalModalRequest(null)}
        catalogPrices={planCatalogPrices}
        promoByPlan={planPromoByPlan}
        onConfirm={async ({ discountPercent, approvedAmount }) => {
          if (!approvalModalRequest) {
            throw new Error('Demande introuvable.');
          }
          return handleApproveSubscription(approvalModalRequest.id, { discountPercent, approvedAmount });
        }}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Chargement de votre espace sécurisé...</p>
        </div>
      </div>
    }>
      <DashboardPageContent />
    </Suspense>
  );
}
