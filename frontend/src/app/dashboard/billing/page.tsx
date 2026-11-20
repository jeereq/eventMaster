'use client';
import { ChannelText } from '@/components/ChannelText';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Check, ShieldCheck, ArrowRight } from '@/components/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  SkeletonBillingView,
  Button,
  StatusPill,
  Modal,
} from '@/components/ui';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import InvoiceListPanel, { type PlatformInvoiceItem } from '@/components/InvoiceListPanel';
import QuotaUsagePanel from '@/components/QuotaUsagePanel';
import SubscriptionFlexPayModal from '@/components/SubscriptionFlexPayModal';
import SubscriptionDiscountRequestModal from '@/components/SubscriptionDiscountRequestModal';
import { commercialPercent } from '@/lib/platformRates';
import { cn } from '@/lib/cn';
import {
  LANDING_PLANS,
  PLAN_IDS,
  B2C_PLAN_IDS,
  VENDOR_PLAN_IDS,
  billingPlanIdsForContext,
  paidPlanIdsForBillingContext,
  planAudience,
  ANNUAL_DISCOUNT_PERCENT,
  formatFc,
  getPlanBaseAmountFc,
  getPlanDisplayPrice,
  durationDaysForPlan,
  planPricePeriodSuffix,
  type BillingCycle,
  type PlanId,
} from '@/config/landingPricing';
import {
  editorLevelLabel,
  guestsBadgeFromDb,
  highlightsFromDb,
  planDisplayName,
  supportLevelLabel,
  type DbPlanCatalogEntry,
} from '@/lib/planCatalogDb';

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
    guestPhotoAvatars?: boolean;
    guestAvatars?: boolean;
    commercialNetwork: boolean;
    adminReports: boolean;
    roomEditorLevel: string;
    supportLevel: string;
  };
}

/** Ligne du catalogue en base (`GET /subscriptions/plans`). */
type DynamicPlanRow = DbPlanCatalogEntry;

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
    { key: 'customRsvpFields', label: 'Champs de réponse à l’invitation personnalisables' },
    { key: 'mockupOcr', label: 'OCR import maquette' },
    { key: 'roomThemesFixtures', label: 'Thèmes & fixtures salles' },
    { key: 'guestAvatars', label: 'Invités simulés (avatars) dans la salle' },
    { key: 'guestPhotoAvatars', label: 'Avatars d’invités avec photo' },
    { key: 'commercialNetwork', label: `Réseau commercial (${commercialPct} %)` },
    { key: 'adminReports', label: 'Rapports avancés' },
  ];
}

/** Segment de puce déjà chiffré dans le tableau des quotas (événements, invités, salles, prestations…). */
const QUOTA_SEGMENT =
  /^(\d[\d\s\u00a0\u202f.]*\s(événements?|invités?|salles?|prestations?|modèles?|managers?)\b|(quotas?|événements?|invités?|salles?|prestations?)\b.*illimit)/i;

/** Retire des puces ce que le tableau des quotas affiche déjà ; null si rien d'autre ne reste. */
function highlightBeyondQuotas(text: string): string | null {
  const rest = text
    .split('·')
    .map((part) => part.trim())
    .filter((part) => part && !QUOTA_SEGMENT.test(part));
  if (rest.length === 0) return null;
  const joined = rest.join(' · ');
  return joined.charAt(0).toUpperCase() + joined.slice(1);
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

const BILLING_TIERS: Array<{ label: string; ids: PlanId[] }> = [
  { label: 'Salles & prestataires', ids: [...VENDOR_PLAN_IDS] },
  { label: 'Particuliers (B2C)', ids: [...B2C_PLAN_IDS] },
  { label: 'Essentials & Business (B2B)', ids: ['FREE', 'STANDARD'] },
  { label: 'Business Premium (B2B)', ids: ['PREMIUM_1', 'PREMIUM_2'] },
  { label: 'Business Enterprise (B2B)', ids: ['ENTERPRISE_1', 'ENTERPRISE_2', 'ENTERPRISE_3'] },
];

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
  const [invoices, setInvoices] = useState<PlatformInvoiceItem[]>([]);
  /** Grille des forfaits : panneau latéral ouvert depuis « Changer de forfait » (ou ?tab=plans / ?plan=). */
  const [plansOpen, setPlansOpen] = useState(
    () => searchParams.get('tab') === 'plans' || Boolean(searchParams.get('plan')),
  );
  const didAutoOpen = useRef(searchParams.get('tab') === 'plans');
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId | null>(null);
  /** Le rabais s'ouvre seul (pas par-dessus le panneau) ; « Annuler » rouvre le panneau. */
  const [discountFromPanel, setDiscountFromPanel] = useState(false);

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

  const billingContext = useMemo(
    () => ({
      accountKind: tenant?.accountKind,
      currentPlan: billing?.plan || tenant?.plan,
      pendingPlan: tenant?.pendingPlan,
    }),
    [tenant?.accountKind, tenant?.plan, tenant?.pendingPlan, billing?.plan],
  );
  const visiblePlanIds = useMemo(
    () => billingPlanIdsForContext(billingContext),
    [billingContext],
  );
  const allowedPaidIds = useMemo(
    () => paidPlanIdsForBillingContext(billingContext),
    [billingContext],
  );
  const isClientAccount = tenant?.accountKind === 'CLIENT';
  const lockedGenre = useMemo(() => {
    const current = (billing?.plan || tenant?.plan || 'FREE') as PlanId;
    if (current !== 'FREE' && (PLAN_IDS as string[]).includes(current)) {
      return planAudience(current);
    }
    const pending = tenant?.pendingPlan;
    if (pending && pending !== 'FREE' && (PLAN_IDS as string[]).includes(pending)) {
      return planAudience(pending as PlanId);
    }
    return null;
  }, [billing?.plan, tenant?.plan, tenant?.pendingPlan]);

  const focusPlan = (searchParams.get('plan') || tenant?.pendingPlan || '') as PlanId | '';
  const pendingSignupPlan =
    tenant?.plan === 'FREE' && focusPlan && focusPlan !== 'FREE' ? focusPlan : null;

  useEffect(() => {
    if (searchParams.get('tab') === 'plans') {
      setPlansOpen(true);
      didAutoOpen.current = true;
    }
  }, [searchParams]);

  useEffect(() => {
    if (didAutoOpen.current || loading || !pendingSignupPlan) return;
    setPlansOpen(true);
    didAutoOpen.current = true;
  }, [pendingSignupPlan, loading]);

  useEffect(() => {
    if (!pendingSignupPlan || loading || !plansOpen) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => {
      document.getElementById(`plan-${pendingSignupPlan}`)?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'center',
      });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [pendingSignupPlan, loading, plansOpen]);

  const setPlansPanel = (open: boolean) => {
    setPlansOpen(open);
    didAutoOpen.current = true;
    const params = new URLSearchParams(searchParams.toString());
    if (open) params.set('tab', 'plans');
    else {
      params.delete('tab');
      params.delete('plan');
    }
    const qs = params.toString();
    router.replace(qs ? `/dashboard/billing?${qs}` : '/dashboard/billing', { scroll: false });
  };

  const visibleTiers = useMemo(() => {
    const current = billing?.plan;
    return BILLING_TIERS.map((tier) => ({
      ...tier,
      ids: tier.ids.filter((id) => isClientAccount || id === current || visiblePlanIds.includes(id)),
    })).filter((tier) => tier.ids.length > 0);
  }, [visiblePlanIds, billing?.plan, isClientAccount]);

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
      // Badge « N invités » : quota de la base (landing seulement si l'API a échoué).
      const isGuestsBadge = Boolean(plan.badge && /invités/i.test(plan.badge));
      return {
        ...plan,
        displayName: planDisplayName(plan.id, db, plan.ms365Name),
        badge: isGuestsBadge && db ? guestsBadgeFromDb(plan.id, db) ?? undefined : plan.badge,
        highlights: highlightsFromDb(plan.id, plan.highlights, db),
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
      setError(
        lockedGenre
          ? 'Ce forfait n’est pas du même genre que votre abonnement actuel.'
          : 'Ce forfait ne correspond pas à votre type de compte.',
      );
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
          ? `Demande de renouvellement envoyée : ${plans.find((p) => p.id === plan)?.displayName || plan}.`
          : `Demande envoyée : ${plans.find((p) => p.id === plan)?.displayName || plan}.`,
      );
      await loadBillingStatus();
      setPlansPanel(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la demande.');
    } finally {
      setActionLoading(null);
    }
  };

  const openRetryCheckout = (req: SubscriptionRequest) => {
    setFlexPayCheckout({
      planName: planLabel(req.requestedPlan),
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

  const currentPlanName = plans.find((p) => p.id === billing?.plan)?.displayName || billing?.plan || '—';
  const planLabel = (id?: string | null) => plans.find((p) => p.id === id)?.displayName || id || '—';
  const expiresAt = tenant?.licenseExpiresAt ? new Date(tenant.licenseExpiresAt) : null;


  const activeRequests = requests.filter((r) => r.status === 'PENDING' || r.status === 'QUOTED');
  const pastRequests = requests.filter((r) => r.status !== 'PENDING' && r.status !== 'QUOTED');

  const renderRequestRow = (req: SubscriptionRequest) => {
    const canRetry = canRetryFlexPay(req, saasPaymentMode);
    return (
      <li key={req.id} className="flex flex-wrap items-center justify-between gap-3 py-3 border-t border-border first:border-t-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{planLabel(req.requestedPlan)}</span>
            <StatusPill tone={requestStatusTone(req)}>{requestStatusLabel(req)}</StatusPill>
          </div>
          <p className="text-xs text-muted mt-0.5">
            {req.durationDays} jours · {new Date(req.createdAt).toLocaleDateString('fr-FR')}
            {req.flexPayChannel ? ` · ${req.flexPayChannel}` : ''}
          </p>
        </div>
        {canRetry && (
          <Button type="button" size="sm" variant={req.status === 'QUOTED' ? 'primary' : 'secondary'} onClick={() => openRetryCheckout(req)}>
            {req.status === 'QUOTED' ? 'Payer le tarif négocié' : 'Relancer le paiement'}
          </Button>
        )}
      </li>
    );
  };

  const cleanHighlights = (planId: PlanId, list: string[]) =>
    list
      .map((h) => (dynamicPlans?.[planId] ? highlightBeyondQuotas(h) : h))
      .filter((h): h is string => Boolean(h));

  /** Par groupe : avantages communs affichés une fois, chaque forfait ne garde que ce qui le distingue. */
  const paidPlansInPanel = visibleTiers
    .map(({ label, ids }) => {
      const items = plans.filter((p) => ids.includes(p.id) && p.id !== 'FREE');
      const lists = items.map((p) => cleanHighlights(p.id, p.highlights));
      const shared = items.length > 1 ? lists[0].filter((h) => lists.every((l) => l.includes(h))) : [];
      return {
        label,
        items: items.map((p, i) => ({ ...p, own: lists[i].filter((h) => !shared.includes(h)).slice(0, 3) })),
      };
    })
    .filter((tier) => tier.items.length > 0);

  const panelPlans = paidPlansInPanel.flatMap((tier) => tier.items);
  const selectedPlan =
    panelPlans.find((p) => p.id === selectedPlanId) ??
    panelPlans.find((p) => p.id === pendingSignupPlan) ??
    panelPlans.find((p) => p.id === billing?.plan) ??
    panelPlans.find((p) => p.highlighted && allowedPaidIds.includes(p.id)) ??
    panelPlans.find((p) => allowedPaidIds.includes(p.id)) ??
    null;
  const selectedIsCurrent = Boolean(selectedPlan && billing?.plan === selectedPlan.id);
  const selectedAllowed = Boolean(selectedPlan && allowedPaidIds.includes(selectedPlan.id));
  const selectedActionLabel = selectedIsCurrent
    ? saasPaymentMode === 'flexpay' ? 'Renouveler' : 'Demander le renouvellement'
    : saasPaymentMode === 'flexpay' ? 'Payer' : 'Demander'

  return (
    <div className="space-y-4 w-full">

      {error && <Alert variant="error">{error}</Alert>}
      {successMsg && <Alert variant="success">{successMsg}</Alert>}
      {discountCampaign?.enabled && discountCampaign.periodActive && formatCampaignWindow(discountCampaign.periodStart, discountCampaign.periodEnd) && (
        <Alert variant="info">
          Campagne de rabais ouverte {formatCampaignWindow(discountCampaign.periodStart, discountCampaign.periodEnd)}. Demandez un tarif négocié sur un forfait, puis payez le montant validé.
        </Alert>
      )}
      {pendingSignupPlan && (
        <Alert variant="info">
          Forfait choisi à l’inscription : <strong>{planLabel(pendingSignupPlan)}</strong>. Votre espace reste
          en gratuit tant que l’abonnement n’est pas activé.
        </Alert>
      )}

      {isClientAccount && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-6 flex flex-wrap items-center justify-between gap-3">
          <StatusPill tone="primary">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
              Compte client · gratuit
            </span>
          </StatusPill>
          <Button type="button" size="md" onClick={() => setPlansPanel(true)} rightIcon={<ArrowRight className="w-4 h-4" />}>
            Choisir un forfait
          </Button>
        </div>
      )}

      {billing && !isClientAccount && (
        <section className="bg-surface rounded-[var(--radius-card)] border border-border p-5 md:p-6 space-y-5" aria-labelledby="billing-current-plan">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="space-y-0.5">
              <h2 id="billing-current-plan" className="text-lg font-semibold text-foreground">{currentPlanName}</h2>
              {billing.plan !== 'FREE' && (billing.billingCycle === 'annual' || expiresAt) ? (
                <p className="text-sm text-muted">
                  {[
                    billing.billingCycle === 'annual' ? 'Annuel' : null,
                    expiresAt
                      ? `expire le ${expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              ) : null}
            </div>
            <Button size="md" onClick={() => setPlansPanel(true)}>
              Changer de forfait
            </Button>
          </div>
          <QuotaUsagePanel
            quota={{
              usage: billing.usage,
              limits: billing.limits,
            }}
          />
          {billing.capabilities && (
            <p className="pt-4 border-t border-border text-xs text-muted leading-relaxed">
              {[
                ...capabilityLabels(commercialPercent(site))
                  .filter(({ key }) => billing.capabilities![key] === true)
                  .map(({ label }) => label),
                `Éditeur salles ${(editorLevelLabel(billing.capabilities.roomEditorLevel) ?? billing.capabilities.roomEditorLevel)?.toLowerCase()}`,
                `Support ${(supportLevelLabel(billing.capabilities.supportLevel) ?? billing.capabilities.supportLevel)?.toLowerCase()}`,
              ].join(' · ')}
            </p>
          )}
        </section>
      )}

      {activeRequests.length > 0 && (
        <section className="bg-surface rounded-[var(--radius-card)] border border-border px-5 md:px-6 py-3" aria-label="Demandes en cours">
          <ul>{activeRequests.map(renderRequestRow)}</ul>
        </section>
      )}

      {invoices.length > 0 && (
        <section className="bg-surface rounded-[var(--radius-card)] border border-border p-5 md:p-6 space-y-3" aria-labelledby="billing-invoices">
          <div className="flex items-center justify-between gap-3">
            <h2 id="billing-invoices" className="text-sm font-semibold text-foreground">Factures</h2>
            <Button href="/dashboard/invoices" size="sm" variant="ghost">
              Tout voir
            </Button>
          </div>
          <InvoiceListPanel invoices={invoices.slice(0, 3)} showFilters={false} />
        </section>
      )}

      {pastRequests.length > 0 && (
        <details className="group rounded-[var(--radius-card)] border border-border bg-surface px-5 md:px-6">
          <summary className="min-h-12 flex items-center justify-between gap-2 cursor-pointer list-none text-sm font-medium text-muted hover:text-foreground focus-visible:outline-none [&::-webkit-details-marker]:hidden">
            Demandes précédentes ({pastRequests.length})
            <span className="text-xs group-open:hidden">Afficher</span>
            <span className="text-xs hidden group-open:inline">Masquer</span>
          </summary>
          <ul className="pb-3">{pastRequests.map(renderRequestRow)}</ul>
        </details>
      )}

      <Modal
        open={plansOpen}
        onClose={() => setPlansPanel(false)}
        placement="right"
        title={isClientAccount ? 'Choisir un forfait' : 'Changer de forfait'}
        contentClassName="space-y-6"
        footer={
          selectedPlan ? (
            <div className="w-full space-y-2">
              <Button
                type="button"
                size="lg"
                className="w-full justify-center"
                disabled={!selectedAllowed || actionLoading !== null}
                onClick={() => handleUpgrade(selectedPlan.id)}
              >
                {actionLoading === selectedPlan.id
                  ? 'Patientez…'
                  : `${selectedActionLabel} ${selectedPlan.displayName} · ${selectedPlan.price}`}
              </Button>
              {selectedAllowed && discountRequestsAllowed && (
                <button
                  type="button"
                  className="w-full min-h-10 text-xs font-medium text-muted hover:text-foreground underline-offset-2 hover:underline disabled:opacity-50"
                  disabled={actionLoading !== null}
                  onClick={() => {
                    const db = dynamicPlans?.[selectedPlan.id];
                    const durationDays = durationDaysForPlan(selectedPlan.id, billingCycle);
                    const periodFc = Number(db?.monthlyPriceFc);
                    const catalogAmount = getPlanBaseAmountFc(
                      Number.isFinite(periodFc) && periodFc > 0 ? periodFc : selectedPlan.monthlyPriceFc,
                      selectedPlan.id,
                      durationDays,
                    );
                    setPlansPanel(false);
                    setDiscountFromPanel(true);
                    setDiscountTarget({ planId: selectedPlan.id, planName: selectedPlan.displayName, catalogAmount });
                  }}
                >
                  Demander un rabais sur ce forfait
                </button>
              )}
            </div>
          ) : undefined
        }
      >
        {isClientAccount && (
          <Alert variant="info">
            Payer un forfait transforme votre compte : organisateur pour les forfaits Particulier et Business, catalogue pour Salle et Prestataire.
          </Alert>
        )}

        <div role="group" aria-label="Cycle de facturation" className="flex p-1 bg-surface-muted rounded-full border border-border">
          {(['monthly', 'annual'] as BillingCycle[]).map((cycle) => (
            <button
              key={cycle}
              type="button"
              aria-pressed={billingCycle === cycle}
              onClick={() => setBillingCycle(cycle)}
              className={cn(
                'flex-1 min-h-10 px-3 rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                billingCycle === cycle ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]' : 'text-muted',
              )}
            >
              {cycle === 'monthly' ? 'Période de base' : `Annuel −${ANNUAL_DISCOUNT_PERCENT} %`}
            </button>
          ))}
        </div>

        {paidPlansInPanel.map(({ label, items }) => (
          <section key={label} className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">{label}</h3>
            <div role="radiogroup" aria-label={label} className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
              {items.map((plan) => {
                const isCurrent = billing?.plan === plan.id;
                const isSelected = selectedPlan?.id === plan.id;
                const allowed = allowedPaidIds.includes(plan.id);
                return (
                  <button
                    key={plan.id}
                    id={`plan-${plan.id}`}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={!allowed}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={cn(
                      'relative w-full text-left px-4 py-3.5 flex items-start gap-3 transition scroll-mt-4',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50',
                      isSelected ? 'bg-primary/[0.07]' : 'bg-surface hover:bg-surface-muted/60',
                      !allowed && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    {isSelected && <span className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden />}
                    <span
                      className={cn(
                        'mt-0.5 w-[18px] h-[18px] shrink-0 rounded-full border-2 flex items-center justify-center',
                        isSelected ? 'border-primary' : 'border-border',
                      )}
                      aria-hidden
                    >
                      {isSelected && <span className="w-2 h-2 rounded-full bg-primary" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-foreground">{plan.displayName}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">Actuel</span>
                        )}
                        {!isCurrent && plan.highlighted && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[11px] font-semibold">Le plus choisi</span>
                        )}
                      </span>
                      {plan.badge && <span className="block text-xs text-muted mt-0.5">{plan.badge}</span>}
                      {isSelected && plan.own.length > 0 && (
                        <span className="mt-2 block space-y-1">
                          {plan.own.map((h) => (
                            <span key={h} className="flex items-start gap-1.5 text-xs text-foreground">
                              <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-px" aria-hidden />
                              <ChannelText text={h} />
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                    <span className="text-right shrink-0">
                      <span className={cn('block font-bold tabular-nums tracking-tight', isSelected ? 'text-lg text-foreground' : 'text-base text-foreground')}>
                        {plan.price}
                      </span>
                      <span className="block text-[11px] text-muted">{planPricePeriodSuffix(plan.id, billingCycle)}</span>
                      {plan.promoActive && plan.catalogPrice && (
                        <span className="block text-[11px] text-muted line-through tabular-nums">{plan.catalogPrice}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <a
          href="/tarifs"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 min-h-11 text-sm font-semibold text-primary hover:underline underline-offset-2"
        >
          Comparer toutes les fonctionnalités
          <ArrowRight className="w-4 h-4" aria-hidden />
        </a>
      </Modal>

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
            setPlansPanel(false);
          }}
        />
      ) : null}

      <SubscriptionDiscountRequestModal
        open={Boolean(discountTarget)}
        onClose={() => {
          setDiscountTarget(null);
          if (discountFromPanel) {
            setDiscountFromPanel(false);
            setPlansPanel(true);
          }
        }}
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
            setDiscountFromPanel(false);
            setSuccessMsg('Demande de rabais envoyée. Vous recevrez une notification avec un lien de paiement dès validation.');
            await loadBillingStatus();
            setPlansPanel(false);
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
