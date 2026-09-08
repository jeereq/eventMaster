'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  CreditCard, Check, Sparkles,
  ShieldCheck, FileText, ArrowRight, Inbox, LayoutDashboard, Minus,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert, SkeletonBillingView, Button, StatusPill, PageHeader, Breadcrumbs, EmptyState,
} from '@/components/ui';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import InvoiceListPanel, { type PlatformInvoiceItem } from '@/components/InvoiceListPanel';
import QuotaUsagePanel, { PlanQuotaLimits } from '@/components/QuotaUsagePanel';
import SubscriptionFlexPayModal from '@/components/SubscriptionFlexPayModal';
import SubscriptionDiscountRequestModal from '@/components/SubscriptionDiscountRequestModal';
import { formatQuotaRemaining } from '@/lib/quotaDisplay';
import { commercialPercent } from '@/lib/platformRates';
import { cn } from '@/lib/cn';
import {
  LANDING_PLANS,
  FEATURE_COMPARISON,
  PLAN_IDS,
  B2C_PLAN_IDS,
  VENDOR_PLAN_IDS,
  paidPlanIdsForAccountKind,
  ANNUAL_DISCOUNT_PERCENT,
  formatFc,
  getPlanBaseAmountFc,
  getPlanDisplayPrice,
  durationDaysForPlan,
  planPricePeriodSuffix,
  isB2cPlanId,
  CURRENCY_NAME,
  type BillingCycle,
  type PlanId,
} from '@/config/landingPricing';

interface BillingStatus {
  plan: PlanId;
  billingCycle?: BillingCycle;
  usage: { events: number; guests: number; templates: number; rooms: number; services: number; orgManagers: number };
  limits: {
    maxEvents: number;
    maxGuests: number;
    maxTemplates: number;
    maxRooms: number;
    maxServices: number;
    maxOrgManagers: number;
    customTemplates: boolean;
  };
  capabilities?: {
    protocolQr: boolean;
    seatNotifications: boolean;
    customTemplates: boolean;
    customRsvpFields?: boolean;
    mockupOcr: boolean;
    roomThemesFixtures: boolean;
    commercialNetwork: boolean;
    adminReports: boolean;
    roomEditorLevel: string;
    supportLevel: string;
  };
}

type DynamicPlanRow = {
  name?: string;
  description?: string;
  price?: string;
  monthlyPriceFc?: number;
  promoActive?: boolean;
  promoMonthlyPriceFc?: number | null;
  promoLabel?: string;
  maxEvents?: number;
  maxGuests?: number;
  maxTemplates?: number;
  maxRooms?: number;
  maxServices?: number;
  maxOrgManagers?: number;
};

type PlansCatalogResponse = {
  saasPaymentMode?: 'manual' | 'flexpay';
  discountRequestsAllowed?: boolean;
  discountCampaign?: {
    enabled: boolean;
    periodStart: string | null;
    periodEnd: string | null;
    periodActive: boolean;
  };
} & Record<string, DynamicPlanRow | unknown>;

function capabilityLabels(commercialPct: number): Array<{
  key: keyof NonNullable<BillingStatus['capabilities']>;
  label: string;
}> {
  return [
    { key: 'protocolQr', label: 'Protocole QR & confirmation de présence' },
    { key: 'seatNotifications', label: 'Notifications de siège' },
    { key: 'customTemplates', label: 'Modèles personnalisés' },
    { key: 'customRsvpFields', label: 'Champs RSVP personnalisables' },
    { key: 'mockupOcr', label: 'OCR import maquette' },
    { key: 'roomThemesFixtures', label: 'Thèmes & fixtures salles' },
    { key: 'commercialNetwork', label: `Réseau commercial (${commercialPct} %)` },
    { key: 'adminReports', label: 'Rapports avancés' },
  ];
}

function formatQuotaSummary(u: number, m: number, guests = false) {
  return formatQuotaRemaining(u, m, guests);
}

interface SubscriptionRequest {
  id: string;
  requestedPlan: PlanId;
  durationDays: number;
  status: 'PENDING' | 'QUOTED' | 'APPROVED' | 'REJECTED';
  requestKind?: string | null;
  createdAt: string;
  paymentProvider?: string | null;
  approvedAmount?: number | null;
  quoteExpiresAt?: string | null;
  flexPayChannel?: string | null;
}

type BillingTab = 'overview' | 'plans' | 'invoices' | 'requests';

const BILLING_TABS: Array<{
  id: BillingTab;
  label: string;
  icon: typeof CreditCard;
}> = [
  { id: 'overview', label: 'Aperçu', icon: LayoutDashboard },
  { id: 'plans', label: 'Forfaits', icon: CreditCard },
  { id: 'invoices', label: 'Factures', icon: FileText },
  { id: 'requests', label: 'Demandes', icon: Inbox },
];

function parseBillingTab(raw: string | null): BillingTab | null {
  if (raw === 'overview' || raw === 'plans' || raw === 'invoices' || raw === 'requests') return raw;
  return null;
}

function inferBillingTab(params: { tab: string | null; payRequest: string | null; requestId: string | null; flexpay: string | null; plan: string | null }): BillingTab {
  const explicit = parseBillingTab(params.tab);
  if (explicit) return explicit;
  if (params.payRequest || params.requestId || params.flexpay) return 'requests';
  if (params.plan) return 'plans';
  return 'overview';
}

function requestStatusTone(req: SubscriptionRequest): 'emerald' | 'rose' | 'primary' | 'amber' {
  if (req.status === 'APPROVED') return 'emerald';
  if (req.status === 'REJECTED') return 'rose';
  if (req.status === 'QUOTED') return 'primary';
  return 'amber';
}

function requestStatusLabel(req: SubscriptionRequest) {
  if (req.status === 'APPROVED') return 'Approuvée';
  if (req.status === 'REJECTED') return 'Refusée';
  if (req.status === 'QUOTED') return 'Rabais validé — à payer';
  if (req.requestKind === 'discount') return 'Rabais en examen';
  return 'En attente';
}

function canRetryFlexPay(req: SubscriptionRequest, saasPaymentMode: 'manual' | 'flexpay') {
  if (req.status === 'QUOTED') return true;
  return (
    saasPaymentMode === 'flexpay' &&
    (req.status === 'PENDING' || req.status === 'REJECTED') &&
    (req.paymentProvider === 'flexpay_card' || req.paymentProvider === 'flexpay_mobile')
  );
}

function formatCampaignWindow(start: string | null, end: string | null) {
  const fmt = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-FR');
  if (start && end) return `du ${fmt(start)} au ${fmt(end)}`;
  if (start) return `à partir du ${fmt(start)}`;
  if (end) return `jusqu’au ${fmt(end)}`;
  return null;
}

function FeatureCell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="w-4 h-4 text-primary mx-auto" aria-label="Inclus" />;
  if (value === false) return <Minus className="w-4 h-4 text-muted mx-auto" aria-label="Non inclus" />;
  return <span className="text-xs font-medium text-foreground">{value}</span>;
}

const BILLING_TIERS: Array<{ label: string; ids: PlanId[] }> = [
  { label: 'Salles & prestataires', ids: [...VENDOR_PLAN_IDS] },
  { label: 'Particuliers (B2C)', ids: [...B2C_PLAN_IDS] },
  { label: 'Essentials & Business (B2B)', ids: ['FREE', 'STANDARD'] },
  { label: 'Business Premium (B2B)', ids: ['PREMIUM_1', 'PREMIUM_2'] },
  { label: 'Business Enterprise (B2B)', ids: ['ENTERPRISE_1', 'ENTERPRISE_2', 'ENTERPRISE_3'] },
];

const TAB_BUTTON_CLASS =
  'inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-button)] px-3 py-2 text-xs sm:text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

function BillingPageInner() {
  const { tenant } = useAuth();
  const { site } = usePlatformSite();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [dynamicPlans, setDynamicPlans] = useState<Record<string, DynamicPlanRow> | null>(null);
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [showComparison, setShowComparison] = useState(false);
  const [invoices, setInvoices] = useState<PlatformInvoiceItem[]>([]);
  const [tab, setTab] = useState<BillingTab>(() =>
    inferBillingTab({
      tab: searchParams.get('tab'),
      payRequest: searchParams.get('payRequest'),
      requestId: searchParams.get('requestId'),
      flexpay: searchParams.get('flexpay'),
      plan: searchParams.get('plan'),
    }),
  );
  const didAutoTab = useRef(Boolean(parseBillingTab(searchParams.get('tab'))));

  const [saasPaymentMode, setSaasPaymentMode] = useState<'manual' | 'flexpay'>(
    site.saasPaymentMode === 'flexpay' ? 'flexpay' : 'manual',
  );
  const [flexPayCheckout, setFlexPayCheckout] = useState<{
    planId?: PlanId;
    planName: string;
    priceLabel: string;
    isRenew?: boolean;
    retryRequestId?: string | null;
    startPending?: boolean;
    initialMethod?: 'mobile' | 'card';
  } | null>(null);
  const [discountTarget, setDiscountTarget] = useState<{
    planId: PlanId;
    planName: string;
    catalogAmount: number;
  } | null>(null);
  const [discountSubmitting, setDiscountSubmitting] = useState(false);
  const [discountRequestsAllowed, setDiscountRequestsAllowed] = useState(true);
  const [discountCampaign, setDiscountCampaign] = useState<{
    enabled: boolean;
    periodStart: string | null;
    periodEnd: string | null;
    periodActive: boolean;
  } | null>(null);

  const loadBillingStatus = async () => {
    try {
      const [billingData, plansData, requestsData, invoicesData] = await Promise.all([
        api.get('/billing/status'),
        api.get('/subscriptions/plans').catch(() => null as PlansCatalogResponse | null),
        api.get('/subscriptions/my-requests').catch(() => []),
        api.get('/billing/invoices').catch(() => ({ invoices: [] })),
      ]);
      setBilling(billingData);
      const catalog = (plansData || billingData.plans || null) as PlansCatalogResponse | null;
      if (catalog) {
        const rows: Record<string, DynamicPlanRow> = {};
        for (const id of PLAN_IDS) {
          const row = catalog[id];
          if (row && typeof row === 'object') rows[id] = row as DynamicPlanRow;
        }
        setDynamicPlans(Object.keys(rows).length ? rows : null);
      } else {
        setDynamicPlans(null);
      }
      if (plansData?.saasPaymentMode === 'flexpay' || plansData?.saasPaymentMode === 'manual') {
        setSaasPaymentMode(plansData.saasPaymentMode);
      } else if (site.saasPaymentMode === 'flexpay' || site.saasPaymentMode === 'manual') {
        setSaasPaymentMode(site.saasPaymentMode);
      }
      if (billingData?.billingCycle === 'annual' || billingData?.billingCycle === 'monthly') {
        setBillingCycle(billingData.billingCycle);
      }
      if (requestsData) {
        setRequests(requestsData);
      }
      setInvoices(invoicesData.invoices || []);
      if (typeof plansData?.discountRequestsAllowed === 'boolean') {
        setDiscountRequestsAllowed(plansData.discountRequestsAllowed);
      }
      if (plansData?.discountCampaign) {
        setDiscountCampaign(plansData.discountCampaign);
      }
    } catch {
      setError('Impossible de charger les informations de facturation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingStatus();
  }, []);

  useEffect(() => {
    const flexpay = searchParams.get('flexpay');
    const requestId = searchParams.get('requestId');
    if (flexpay === 'canceled') {
      setError('Paiement annulé. Vous pouvez réessayer quand vous voulez.');
      return;
    }
    if (flexpay === 'error') {
      setError('Retour FlexPay invalide. Contactez le support si le montant a été débité.');
      return;
    }
    if (requestId && (flexpay === 'return' || flexpay === 'pending')) {
      setFlexPayCheckout({
        planName: 'Abonnement',
        priceLabel: '',
        retryRequestId: requestId,
        startPending: true,
        initialMethod: 'card',
      });
      setSuccessMsg('');
    }
  }, [searchParams]);

  useEffect(() => {
    const payRequest = searchParams.get('payRequest');
    if (!payRequest || loading) return;
    const match = requests.find((r) => r.id === payRequest);
    if (!match) return;
    if (match.status === 'QUOTED' || match.status === 'PENDING' || match.status === 'REJECTED') {
      setFlexPayCheckout({
        planId: match.requestedPlan,
        planName: match.requestedPlan,
        priceLabel: match.approvedAmount ? formatFc(match.approvedAmount) : '',
        retryRequestId: match.id,
        startPending: false,
        initialMethod: match.paymentProvider === 'flexpay_mobile' ? 'mobile' : 'card',
      });
      setSuccessMsg(
        match.status === 'QUOTED'
          ? 'Votre rabais a été validé. Finalisez le paiement pour activer le forfait.'
          : '',
      );
    }
  }, [searchParams, requests, loading]);

  const allowedPaidIds = useMemo(
    () => paidPlanIdsForAccountKind(tenant?.accountKind),
    [tenant?.accountKind],
  );
  const isClientAccount = tenant?.accountKind === 'CLIENT';

  const focusPlan = (searchParams.get('plan') || tenant?.pendingPlan || '') as PlanId | '';
  const pendingSignupPlan =
    tenant?.plan === 'FREE' && focusPlan && focusPlan !== 'FREE' ? focusPlan : null;

  useEffect(() => {
    const requested = parseBillingTab(searchParams.get('tab'));
    if (requested) {
      setTab(requested);
      didAutoTab.current = true;
    }
  }, [searchParams]);

  useEffect(() => {
    if (didAutoTab.current || loading) return;
    if (pendingSignupPlan) {
      setTab('plans');
      didAutoTab.current = true;
    }
  }, [pendingSignupPlan, loading]);

  useEffect(() => {
    if (!pendingSignupPlan || loading || tab !== 'plans') return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(`plan-${pendingSignupPlan}`)?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'center',
    });
  }, [pendingSignupPlan, loading, tab]);

  const setBillingTab = (id: BillingTab) => {
    setTab(id);
    didAutoTab.current = true;
    const params = new URLSearchParams(searchParams.toString());
    if (id === 'overview') params.delete('tab');
    else params.set('tab', id);
    const qs = params.toString();
    router.replace(qs ? `/dashboard/billing?${qs}` : '/dashboard/billing', { scroll: false });
  };

  const onTabListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const ids = BILLING_TABS.map((item) => item.id);
    const index = ids.indexOf(tab);
    let next: BillingTab | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = ids[(index + 1) % ids.length];
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = ids[(index - 1 + ids.length) % ids.length];
    } else if (event.key === 'Home') {
      next = ids[0];
    } else if (event.key === 'End') {
      next = ids[ids.length - 1];
    }
    if (!next) return;
    event.preventDefault();
    setBillingTab(next);
    requestAnimationFrame(() => {
      document.getElementById(`billing-tab-${next}`)?.focus();
    });
  };

  const visibleTiers = useMemo(() => {
    const current = billing?.plan;
    return BILLING_TIERS.map((tier) => ({
      ...tier,
      ids: tier.ids.filter((id) => isClientAccount || id === current || allowedPaidIds.includes(id)),
    })).filter((tier) => tier.ids.length > 0);
  }, [allowedPaidIds, billing?.plan, isClientAccount]);

  const comparisonIds = useMemo(() => {
    if (isClientAccount) return [...PLAN_IDS];
    const current = billing?.plan;
    return PLAN_IDS.filter((id) => id === current || allowedPaidIds.includes(id) || id === 'FREE');
  }, [allowedPaidIds, billing?.plan, isClientAccount]);

  const plans = useMemo(() => {
    return LANDING_PLANS.map((plan) => {
      const db = dynamicPlans?.[plan.id];
      const promoActive = Boolean(db?.promoActive && db?.promoMonthlyPriceFc != null && plan.id !== 'FREE');
      const promoFc = promoActive ? Number(db?.promoMonthlyPriceFc) : null;
      const catalogPrice = getPlanDisplayPrice(
        plan,
        billingCycle,
        db?.price,
        db?.monthlyPriceFc,
      );
      const price = getPlanDisplayPrice(
        plan,
        billingCycle,
        db?.price,
        db?.monthlyPriceFc,
        promoFc,
      );
      return {
        ...plan,
        displayName: db?.name?.replace('Plan ', '') || plan.ms365Name,
        price,
        catalogPrice: promoActive ? catalogPrice : null,
        promoActive,
        promoLabel: db?.promoLabel || 'Offre promotionnelle',
        description: db?.description || plan.tagline,
      };
    });
  }, [dynamicPlans, billingCycle]);

  const handleUpgrade = async (plan: PlanId) => {
    if (plan === 'FREE') return;
    if (!allowedPaidIds.includes(plan)) {
      setError('Ce forfait ne correspond pas à votre type de compte.');
      return;
    }
    if (saasPaymentMode === 'flexpay') {
      const meta = plans.find((item) => item.id === plan);
      setError('');
      setSuccessMsg('');
      setFlexPayCheckout({
        planId: plan,
        planName: meta?.displayName || plan,
        priceLabel: meta?.price || '',
        isRenew: billing?.plan === plan,
      });
      return;
    }
    setError('');
    setSuccessMsg('');
    setActionLoading(plan);
    try {
      const isRenew = billing?.plan === plan;
      const durationDays = durationDaysForPlan(plan, billingCycle);
      await api.post('/subscriptions/request', {
        requestedPlan: plan,
        durationDays,
      });
      setSuccessMsg(
        isRenew
          ? `Demande de renouvellement ${plan} soumise (${durationDays === 90 ? '90 jours / trimestre' : billingCycle === 'annual' ? '12 mois' : '30 jours'}${billingCycle === 'annual' ? `, −${ANNUAL_DISCOUNT_PERCENT} %` : ''}).`
          : `Demande ${plan} soumise (${durationDays === 90 ? '90 jours / trimestre' : billingCycle === 'annual' ? '12 mois' : '30 jours'}${billingCycle === 'annual' ? `, −${ANNUAL_DISCOUNT_PERCENT} %` : ''}). Facture SendGrid après validation.`,
      );
      await loadBillingStatus();
      setBillingTab('requests');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la demande.');
    } finally {
      setActionLoading(null);
    }
  };

  const openRetryCheckout = (req: SubscriptionRequest) => {
    setFlexPayCheckout({
      planName: req.requestedPlan,
      priceLabel: req.approvedAmount ? formatFc(req.approvedAmount) : '',
      retryRequestId: req.id,
      initialMethod: req.paymentProvider === 'flexpay_mobile' ? 'mobile' : 'card',
    });
    setError('');
    setSuccessMsg('');
  };

  if (loading) {
    return <SkeletonBillingView />;
  }

  const pendingRequestCount = requests.filter((r) => r.status === 'PENDING' || r.status === 'QUOTED').length;
  const currentPlanName = plans.find((p) => p.id === billing?.plan)?.displayName || billing?.plan || '—';

  const tabMeta: Record<BillingTab, { title: string; description: string }> = {
    overview: {
      title: isClientAccount ? 'Votre compte client' : `Forfait de ${tenant?.name || 'votre organisation'}`,
      description: isClientAccount
        ? 'Compte gratuit : catalogue, devis, billets. Le type de compte se change uniquement par un Super Admin.'
        : `Plan actuel, quotas et capacités · tarifs en ${CURRENCY_NAME} (FC).`,
    },
    plans: {
      title: 'Choisir un forfait',
      description: `Forfaits adaptés à votre type de compte · annuel −${ANNUAL_DISCOUNT_PERCENT} % (y compris Particulier).`,
    },
    invoices: {
      title: 'Factures',
      description: 'Reçus d’abonnement après validation ou paiement. L’historique complet est aussi dans Factures.',
    },
    requests: {
      title: 'Demandes d’abonnement',
      description: saasPaymentMode === 'flexpay'
        ? 'Suivi des demandes, rabais et paiements FlexPay à relancer.'
        : 'Suivi des demandes manuelles et des rabais en examen.',
    },
  };

  const tabCounts: Partial<Record<BillingTab, number>> = {
    invoices: invoices.length,
    requests: pendingRequestCount,
  };

  return (
    <div className="space-y-5 w-full">
      <PageHeader
        title={tabMeta[tab].title}
        description={tabMeta[tab].description}
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Accueil', href: '/dashboard' },
              { label: 'Facturation & plan', href: '/dashboard/billing' },
              { label: BILLING_TABS.find((item) => item.id === tab)?.label || 'Aperçu' },
            ]}
          />
        }
      />

      {error && <Alert variant="error">{error}</Alert>}
      {successMsg && <Alert variant="success">{successMsg}</Alert>}
      {discountCampaign?.enabled && discountCampaign.periodActive && formatCampaignWindow(discountCampaign.periodStart, discountCampaign.periodEnd) && (
        <Alert variant="info">
          Campagne de rabais ouverte {formatCampaignWindow(discountCampaign.periodStart, discountCampaign.periodEnd)}. Demandez un tarif négocié sur un forfait, puis payez le montant validé.
        </Alert>
      )}
      {pendingSignupPlan && (
        <Alert variant="info">
          Forfait choisi à l’inscription : <strong>{pendingSignupPlan}</strong>. Votre espace reste
          en gratuit tant que l’abonnement n’est pas activé.{' '}
          <button
            type="button"
            className="font-semibold text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-sm"
            onClick={() => setBillingTab('plans')}
          >
            Ouvrir l’onglet Forfaits
          </button>
        </Alert>
      )}

      <div
        role="tablist"
        aria-label="Sections facturation"
        aria-orientation="horizontal"
        onKeyDown={onTabListKeyDown}
        className="flex gap-1 overflow-x-auto overscroll-x-contain rounded-[var(--radius-button)] border border-border bg-surface-muted p-1"
      >
        {BILLING_TABS.map((item) => {
          const selected = tab === item.id;
          const count = tabCounts[item.id];
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`billing-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`billing-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setBillingTab(item.id)}
              className={cn(
                TAB_BUTTON_CLASS,
                'shrink-0',
                selected
                  ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
                  : 'text-muted hover:bg-surface/70 hover:text-foreground',
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" aria-hidden />
              <span>{item.label}</span>
              {typeof count === 'number' ? (
                <span
                  className={cn(
                    'ml-0.5 min-w-5 px-1.5 py-0.5 rounded-md text-xs font-bold tabular-nums',
                    selected ? 'bg-primary/10 text-primary' : 'bg-surface text-muted',
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <div id="billing-panel-overview" role="tabpanel" aria-labelledby="billing-tab-overview" tabIndex={0} className="space-y-5">
          {isClientAccount && (
            <div className="rounded-[var(--radius-card)] border border-primary/25 bg-surface p-5 sm:p-6 space-y-4">
              <div className="space-y-2">
                <StatusPill tone="primary">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
                    Compte client · gratuit
                  </span>
                </StatusPill>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                  Recherche, devis et billets — sans abonnement SaaS
                </h2>
                <p className="text-sm text-muted leading-relaxed max-w-3xl">
                  Ce compte permet d&apos;explorer le catalogue, de simuler un budget, de demander des devis et d&apos;acheter des billets.
                  Pour organiser un événement ou publier des offres, contactez le support EventMaster : seul un Super Admin peut changer le type de ce compte.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
                <Button href="/register?kind=ORGANIZER&intent=personal" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Compte organisateur
                </Button>
                <Button href="/register?kind=VENDOR&intent=vendor" size="md" variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Compte prestataire / salle
                </Button>
                <Button href="/dashboard" size="md" variant="ghost">
                  Tableau de bord
                </Button>
              </div>
            </div>
          )}

          {(!billing || billing.plan === 'FREE') && !isClientAccount && (
            <Alert variant="info">
              Aucun abonnement payant n&apos;est actif. Les forfaits correspondent à votre type de compte
              ({tenant?.accountKind === 'VENDOR' ? 'marketplace' : tenant?.accountKind === 'BOTH' ? 'organisation + marketplace' : 'organisation'}),
              exclusivement en {CURRENCY_NAME} (FC).
            </Alert>
          )}

          {billing && (
            <div className="bg-surface rounded-[var(--radius-card)] border border-border p-5 md:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-foreground">{currentPlanName}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={billing.plan === 'FREE' ? 'amber' : 'emerald'}>
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
                        {billing.plan === 'FREE' ? 'Sans abonnement payant' : 'Actif'}
                      </span>
                    </StatusPill>
                    {billing.plan !== 'FREE' && billing.billingCycle === 'annual' && (
                      <StatusPill tone="primary">Cycle annuel</StatusPill>
                    )}
                  </div>
                </div>
                {!isClientAccount && (
                  <Button size="md" variant="secondary" onClick={() => setBillingTab('plans')}>
                    {billing.plan === 'FREE' ? 'Voir les forfaits' : 'Changer de forfait'}
                  </Button>
                )}
              </div>
              {!isClientAccount && (
                <QuotaUsagePanel
                  quota={{
                    usage: billing.usage,
                    limits: billing.limits,
                  }}
                />
              )}
              {(tenant?.accountKind === 'VENDOR' || tenant?.accountKind === 'BOTH') && (
                <p className="text-xs text-muted leading-relaxed">
                  Un seul forfait à la fois : il n’y a pas de cumul Salle + Business.
                  {tenant?.accountKind === 'BOTH'
                    ? ' Compte mixte : Particulier, Business, Salle, Prestataire ou Salle & presta.'
                    : ' Compte marketplace : Salle, Prestataire ou Salle & presta (fiches publiées, pas un volume d’agence).'}
                </p>
              )}
              {billing.capabilities && !isClientAccount && (
                <div className="pt-5 border-t border-border grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {capabilityLabels(commercialPercent(site)).map(({ key, label }) => {
                    const enabled = billing.capabilities![key];
                    if (typeof enabled !== 'boolean') return null;
                    return (
                      <div key={key} className="flex items-center gap-2 text-xs">
                        {enabled ? (
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
                        ) : (
                          <Minus className="w-3.5 h-3.5 text-muted shrink-0" aria-hidden />
                        )}
                        <span className={enabled ? 'text-foreground' : 'text-muted'}>{label}</span>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-2 text-xs text-muted sm:col-span-2 lg:col-span-3">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
                    Éditeur salles : <strong className="ml-1 capitalize">{billing.capabilities.roomEditorLevel}</strong>
                    {' · '}
                    Support : <strong className="ml-1 capitalize">{billing.capabilities.supportLevel}</strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'plans' && (
        <div id="billing-panel-plans" role="tabpanel" aria-labelledby="billing-tab-plans" tabIndex={0} className="space-y-6">
          {isClientAccount && (
            <Alert variant="info">
              Ces forfaits s’activent après un changement de type de compte (Super Admin) ou sur un compte organisateur / prestataire distinct.
            </Alert>
          )}

          <div className="flex flex-col items-center gap-2">
            <div
              role="group"
              aria-label="Cycle de facturation"
              className="inline-flex p-1 bg-surface-muted rounded-full border border-border"
            >
              {(['monthly', 'annual'] as BillingCycle[]).map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  aria-pressed={billingCycle === cycle}
                  onClick={() => setBillingCycle(cycle)}
                  className={cn(
                    'min-h-11 px-5 rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    billingCycle === cycle ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]' : 'text-muted',
                  )}
                >
                  {cycle === 'monthly' ? 'Période de base' : `Annuel (−${ANNUAL_DISCOUNT_PERCENT} %)`}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted text-center max-w-lg">
              Période de base : mois (organisations et marketplace) ou trimestre 90 jours (particuliers).
              {billingCycle === 'annual'
                ? ` L’annuel facture 12 mois (ou 4 trimestres) d’un coup, avec −${ANNUAL_DISCOUNT_PERCENT} % sur ce total.`
                : ` L’annuel facture 12 mois ou 4 trimestres d’un coup, avec −${ANNUAL_DISCOUNT_PERCENT} %.`}
            </p>
          </div>

          {saasPaymentMode === 'flexpay' && (
            <p className="text-xs text-muted text-center max-w-lg mx-auto">
              Au clic sur un forfait, une fenêtre s’ouvre pour choisir Mobile Money ou Visa / Mastercard.
            </p>
          )}

          {visibleTiers.map(({ label, ids }) => (
            <div key={label} className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">{label}</h2>
              <div
                className={cn(
                  'grid gap-4',
                  ids.length === 2 ? 'md:grid-cols-2' : ids.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
                )}
              >
                {plans
                  .filter((p) => ids.includes(p.id))
                  .map((plan) => {
                    const isCurrent = billing?.plan === plan.id;
                    const isFocused = pendingSignupPlan === plan.id;
                    const db = dynamicPlans?.[plan.id];
                    const planDisabled =
                      (isCurrent && plan.id === 'FREE') ||
                      plan.id === 'FREE' ||
                      actionLoading !== null ||
                      !allowedPaidIds.includes(plan.id);
                    return (
                      <div
                        key={plan.id}
                        id={`plan-${plan.id}`}
                        className={cn(
                          'relative flex flex-col rounded-[var(--radius-card)] border bg-surface p-5 sm:p-6',
                          isCurrent || isFocused
                            ? 'border-primary ring-2 ring-primary/30'
                            : plan.highlighted
                              ? 'border-primary'
                              : 'border-border',
                        )}
                      >
                        {plan.badge && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3" aria-hidden /> {plan.badge}
                          </span>
                        )}
                        <h3 className="text-lg font-semibold">{plan.displayName}</h3>
                        <p className="text-xs text-muted mt-1">{plan.description}</p>
                        <div className="mt-4 mb-4">
                          {plan.promoActive && plan.catalogPrice && (
                            <p className="text-xs font-semibold text-festive-accent mb-1">
                              {plan.promoLabel} · <span className="line-through text-muted">{plan.catalogPrice}</span>
                            </p>
                          )}
                          <span className="text-3xl font-extrabold tabular-nums">{plan.price}</span>
                          {plan.id !== 'FREE' && (
                            <span className="text-sm text-muted ml-1">{planPricePeriodSuffix(plan.id, billingCycle)}</span>
                          )}
                          {billingCycle === 'annual' && plan.id !== 'FREE' && (
                            <>
                              <p className="text-xs text-muted mt-1">
                                {isB2cPlanId(plan.id) ? 'Soit le trimestre déjà réduit' : 'Soit le mois déjà réduit'}
                              </p>
                              <p className="text-xs text-primary font-semibold mt-0.5">
                                {plan.promoActive
                                  ? `Facturé ${isB2cPlanId(plan.id) ? '4 trimestres' : '12 mois'} · meilleur tarif (promo ou −${ANNUAL_DISCOUNT_PERCENT} % annuel)`
                                  : `Facturé ${isB2cPlanId(plan.id) ? '4 trimestres' : '12 mois'} d’un coup · −${ANNUAL_DISCOUNT_PERCENT} % vs période de base`}
                              </p>
                            </>
                          )}
                        </div>
                        <ul className="space-y-1.5 text-xs text-muted flex-1 border-t border-border pt-3">
                          {plan.highlights.map((h) => (
                            <li key={h} className="flex gap-2">
                              <Check className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden /> {h}
                            </li>
                          ))}
                        </ul>
                        {db && (
                          <PlanQuotaLimits
                            compact
                            maxEvents={db.maxEvents}
                            maxGuests={db.maxGuests}
                            maxTemplates={db.maxTemplates}
                            maxRooms={db.maxRooms}
                            maxServices={db.maxServices}
                            maxOrgManagers={db.maxOrgManagers}
                          />
                        )}
                        {isCurrent && billing && (
                          <p className="text-xs font-semibold text-primary bg-primary/10 rounded-[var(--radius-button)] px-2 py-1.5 mt-2">
                            Événements : {formatQuotaSummary(billing.usage.events, billing.limits.maxEvents)}
                            {' · '}
                            Modèles : {formatQuotaSummary(billing.usage.templates, billing.limits.maxTemplates)}
                          </p>
                        )}
                        <Button
                          type="button"
                          size="md"
                          variant={plan.highlighted || isFocused || (isCurrent && plan.id !== 'FREE') ? 'primary' : 'secondary'}
                          className="w-full mt-5"
                          disabled={planDisabled}
                          loading={actionLoading === plan.id}
                          onClick={() => handleUpgrade(plan.id)}
                        >
                          {isCurrent && plan.id === 'FREE'
                            ? 'Forfait actuel (gratuit)'
                            : isCurrent
                              ? saasPaymentMode === 'flexpay' ? 'Renouveler maintenant' : 'Demander un renouvellement'
                              : plan.id === 'FREE'
                                ? 'Gratuit'
                                : saasPaymentMode === 'flexpay'
                                  ? `Payer ${plan.displayName}`
                                  : `Demander ${plan.displayName}`}
                        </Button>
                        {plan.id !== 'FREE' && allowedPaidIds.includes(plan.id) && discountRequestsAllowed && (
                          <Button
                            type="button"
                            size="md"
                            variant="ghost"
                            className="w-full mt-2"
                            disabled={actionLoading !== null}
                            onClick={() => {
                              const durationDays = durationDaysForPlan(plan.id, billingCycle);
                              const periodFc = Number(db?.monthlyPriceFc);
                              const catalogAmount = getPlanBaseAmountFc(
                                Number.isFinite(periodFc) && periodFc > 0 ? periodFc : plan.monthlyPriceFc,
                                plan.id,
                                durationDays,
                              );
                              setDiscountTarget({
                                planId: plan.id,
                                planName: plan.displayName,
                                catalogAmount,
                              });
                            }}
                          >
                            Demander un rabais
                          </Button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}

          <div className="border border-border rounded-[var(--radius-card)] overflow-hidden bg-surface">
            <button
              type="button"
              aria-expanded={showComparison}
              onClick={() => setShowComparison(!showComparison)}
              className="w-full min-h-11 flex items-center justify-between px-5 py-3 font-semibold text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
            >
              <span className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" aria-hidden /> Comparer les fonctionnalités
              </span>
              <span className="text-xs text-muted">{showComparison ? 'Masquer' : 'Afficher'}</span>
            </button>
            {showComparison && (
              <div className="border-t border-border">
                <div className="sm:hidden px-4 py-2 bg-primary/5 text-primary text-xs font-medium flex items-center justify-between border-b border-border/80">
                  <span>Faites glisser pour comparer tous les forfaits</span>
                  <span className="font-mono text-xs bg-primary/10 px-1.5 py-0.5 rounded">{comparisonIds.length} forfaits</span>
                </div>
                <div className="overflow-x-auto overscroll-x-contain touch-pan-x">
                  <table className="w-full text-sm min-w-[960px]">
                    <thead>
                      <tr className="bg-surface-muted">
                        <th className="text-left px-4 py-2 text-xs text-muted">Fonctionnalité</th>
                        {comparisonIds.map((id) => (
                          <th key={id} className="px-2 py-2 text-xs text-center text-muted">
                            {LANDING_PLANS.find((p) => p.id === id)?.ms365Name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {FEATURE_COMPARISON.map((row) => (
                        <tr key={row.label} className="border-t border-border">
                          <td className="px-4 py-2 text-xs text-foreground">{row.label}</td>
                          {comparisonIds.map((id) => (
                            <td key={id} className="py-2 text-center">
                              <FeatureCell value={row.values[id]} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'invoices' && (
        <div id="billing-panel-invoices" role="tabpanel" aria-labelledby="billing-tab-invoices" tabIndex={0} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted">Les 5 plus récentes. L’historique complet reste dans Factures.</p>
            <Button href="/dashboard/invoices" size="md" variant="ghost">
              Voir tout
            </Button>
          </div>
          {invoices.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-5 h-5" />}
              title="Aucune facture pour l’instant"
              description="Les factures apparaissent ici après approbation ou paiement d’une demande d’abonnement."
              action={
                <Button size="md" variant="secondary" onClick={() => setBillingTab('plans')}>
                  Voir les forfaits
                </Button>
              }
            />
          ) : (
            <div className="bg-surface border border-border rounded-[var(--radius-card)] p-5 sm:p-6">
              <InvoiceListPanel
                invoices={invoices.slice(0, 5)}
                showFilters={false}
                emptyMessage="Les factures apparaissent ici après approbation de votre demande d'abonnement."
              />
            </div>
          )}
        </div>
      )}

      {tab === 'requests' && (
        <div id="billing-panel-requests" role="tabpanel" aria-labelledby="billing-tab-requests" tabIndex={0}>
          {requests.length === 0 ? (
            <EmptyState
              icon={<Inbox className="w-5 h-5" />}
              title="Aucune demande"
              description="Quand vous demandez un forfait ou un rabais, le suivi s’affiche ici."
              action={
                <Button size="md" onClick={() => setBillingTab('plans')}>
                  Choisir un forfait
                </Button>
              }
            />
          ) : (
            <>
              <div className="md:hidden space-y-3">
                {requests.map((req) => {
                  const canRetry = canRetryFlexPay(req, saasPaymentMode);
                  return (
                    <div key={req.id} className="rounded-[var(--radius-card)] border border-border p-4 space-y-2 bg-surface">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm">{req.requestedPlan}</span>
                        <StatusPill tone={requestStatusTone(req)}>{requestStatusLabel(req)}</StatusPill>
                      </div>
                      <p className="text-xs text-muted">
                        {req.durationDays} jours · {new Date(req.createdAt).toLocaleDateString('fr-FR')}
                        {req.flexPayChannel ? ` · ${req.flexPayChannel}` : ''}
                      </p>
                      {canRetry && (
                        <Button type="button" size="md" variant="secondary" onClick={() => openRetryCheckout(req)}>
                          {req.status === 'QUOTED' ? 'Payer le tarif négocié' : 'Reprendre / relancer le paiement'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="hidden md:block overflow-x-auto bg-surface border border-border rounded-[var(--radius-card)]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted text-left">
                      <th className="px-5 py-3 font-semibold">Forfait</th>
                      <th className="py-3 font-semibold">Durée</th>
                      <th className="py-3 font-semibold">Date</th>
                      <th className="py-3 font-semibold">Statut</th>
                      <th className="px-5 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req) => {
                      const canRetry = canRetryFlexPay(req, saasPaymentMode);
                      return (
                        <tr key={req.id} className="border-t border-border">
                          <td className="px-5 py-3 font-semibold">{req.requestedPlan}</td>
                          <td className="py-3 tabular-nums">{req.durationDays} j</td>
                          <td className="py-3">{new Date(req.createdAt).toLocaleDateString('fr-FR')}</td>
                          <td className="py-3">
                            <StatusPill tone={requestStatusTone(req)}>{requestStatusLabel(req)}</StatusPill>
                          </td>
                          <td className="px-5 py-3">
                            {canRetry ? (
                              <Button type="button" size="md" variant="secondary" onClick={() => openRetryCheckout(req)}>
                                {req.status === 'QUOTED' ? 'Payer le tarif négocié' : 'Relancer'}
                              </Button>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {flexPayCheckout && (saasPaymentMode === 'flexpay' || Boolean(flexPayCheckout.retryRequestId)) ? (
        <SubscriptionFlexPayModal
          open
          onClose={() => setFlexPayCheckout(null)}
          planId={flexPayCheckout.planId}
          planName={flexPayCheckout.planName}
          priceLabel={flexPayCheckout.priceLabel}
          billingCycle={billingCycle}
          isRenew={flexPayCheckout.isRenew}
          retryRequestId={flexPayCheckout.retryRequestId}
          startPending={flexPayCheckout.startPending}
          initialMethod={flexPayCheckout.initialMethod}
          onPaid={async () => {
            setSuccessMsg('Paiement confirmé. Forfait activé.');
            await loadBillingStatus();
            setBillingTab('overview');
          }}
        />
      ) : null}

      <SubscriptionDiscountRequestModal
        open={Boolean(discountTarget)}
        onClose={() => setDiscountTarget(null)}
        planName={discountTarget?.planName || ''}
        catalogAmount={discountTarget?.catalogAmount || 0}
        submitting={discountSubmitting}
        onSubmit={async (payload) => {
          if (!discountTarget) return;
          setDiscountSubmitting(true);
          try {
            await api.post('/subscriptions/request-discount', {
              requestedPlan: discountTarget.planId,
              durationDays: durationDaysForPlan(discountTarget.planId, billingCycle),
              ...payload,
            });
            setDiscountTarget(null);
            setSuccessMsg('Demande de rabais envoyée. Vous recevrez une notification avec un lien de paiement dès validation.');
            await loadBillingStatus();
            setBillingTab('requests');
          } finally {
            setDiscountSubmitting(false);
          }
        }}
      />
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<SkeletonBillingView />}>
      <BillingPageInner />
    </Suspense>
  );
}
