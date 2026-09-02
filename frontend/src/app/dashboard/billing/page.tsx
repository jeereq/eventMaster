'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  CreditCard, Check, Loader2, Sparkles,
  Clock, XCircle, CheckCircle, Minus, ChevronDown, ChevronUp, ShieldCheck, FileText, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Alert, SkeletonBillingView, Button } from '@/components/ui';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import InvoiceListPanel, { type PlatformInvoiceItem } from '@/components/InvoiceListPanel';
import QuotaUsagePanel, { PlanQuotaLimits } from '@/components/QuotaUsagePanel';
import SubscriptionFlexPayModal from '@/components/SubscriptionFlexPayModal';
import { formatQuotaRemaining } from '@/lib/quotaDisplay';
import {
  LANDING_PLANS,
  FEATURE_COMPARISON,
  PLAN_IDS,
  B2C_PLAN_IDS,
  VENDOR_PLAN_IDS,
  paidPlanIdsForAccountKind,
  ANNUAL_DISCOUNT_PERCENT,
  formatFc,
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

const CAPABILITY_LABELS: Array<{ key: keyof NonNullable<BillingStatus['capabilities']>; label: string }> = [
  { key: 'protocolQr', label: 'Protocole QR & confirmation de présence' },
  { key: 'seatNotifications', label: 'Notifications de siège' },
  { key: 'customTemplates', label: 'Modèles personnalisés' },
  { key: 'customRsvpFields', label: 'Champs RSVP personnalisables' },
  { key: 'mockupOcr', label: 'OCR import maquette' },
  { key: 'roomThemesFixtures', label: 'Thèmes & fixtures salles' },
  { key: 'commercialNetwork', label: 'Réseau commercial (30 %)' },
  { key: 'adminReports', label: 'Rapports avancés' },
];

function formatQuotaSummary(u: number, m: number, guests = false) {
  return formatQuotaRemaining(u, m, guests);
}

interface SubscriptionRequest {
  id: string;
  requestedPlan: PlanId;
  durationDays: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  paymentProvider?: string | null;
  approvedAmount?: number | null;
  flexPayChannel?: string | null;
}

function FeatureCell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="w-4 h-4 text-emerald-600 mx-auto" />;
  if (value === false) return <Minus className="w-4 h-4 text-muted mx-auto" />;
  return <span className="text-xs font-medium text-foreground">{value}</span>;
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
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [dynamicPlans, setDynamicPlans] = useState<Record<string, any> | null>(null);
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [showComparison, setShowComparison] = useState(false);
  const [invoices, setInvoices] = useState<PlatformInvoiceItem[]>([]);

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

  const loadBillingStatus = async () => {
    try {
      const [billingData, plansData, requestsData, invoicesData] = await Promise.all([
        api.get('/billing/status'),
        api.get('/subscriptions/plans').catch(() => null),
        api.get('/subscriptions/my-requests').catch(() => []),
        api.get('/billing/invoices').catch(() => ({ invoices: [] })),
      ]);
      setBilling(billingData);
      setDynamicPlans(plansData || billingData.plans || null);
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
    } catch (err: any) {
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

  const allowedPaidIds = useMemo(
    () => paidPlanIdsForAccountKind(tenant?.accountKind),
    [tenant?.accountKind],
  );

  const visibleTiers = useMemo(() => {
    const current = billing?.plan;
    return BILLING_TIERS.map((tier) => ({
      ...tier,
      ids: tier.ids.filter((id) => id === current || allowedPaidIds.includes(id)),
    })).filter((tier) => tier.ids.length > 0);
  }, [allowedPaidIds, billing?.plan]);

  const comparisonIds = useMemo(() => {
    const current = billing?.plan;
    return PLAN_IDS.filter((id) => id === current || allowedPaidIds.includes(id) || id === 'FREE');
  }, [allowedPaidIds, billing?.plan]);

  const plans = useMemo(() => {
    return LANDING_PLANS.map((plan) => {
      const db = dynamicPlans?.[plan.id];
      const promoActive = Boolean(db?.promoActive && db?.promoMonthlyPriceFc != null && plan.id !== 'FREE');
      const promoFc = promoActive ? Number(db.promoMonthlyPriceFc) : null;
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
        promoLabel: (db?.promoLabel as string) || 'Offre promotionnelle',
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
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la demande.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <SkeletonBillingView />;
  }

  const isClientAccount = tenant?.accountKind === 'CLIENT';

  return (
    <div className="space-y-10 w-full">
      <div className="text-center space-y-3">
        <p className="text-sm font-semibold text-primary uppercase tracking-widest">Facturation & Forfaits</p>
        <h1 className="text-3xl font-bold text-foreground">
          {isClientAccount ? 'Espace Forfaits & Abonnements' : `Forfait de ${tenant?.name || 'votre organisation'}`}
        </h1>
        <p className="text-muted text-sm">
          {isClientAccount
            ? 'Information sur votre type de compte et découverte des forfaits d’organisation'
            : `Forfaits adaptés à votre type de compte · tarifs en ${CURRENCY_NAME} (FC) · annuel −${ANNUAL_DISCOUNT_PERCENT} % (y compris Particulier)`}
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {successMsg && <Alert variant="success">{successMsg}</Alert>}

      {isClientAccount && (
        <div className="rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-surface to-surface-muted p-6 sm:p-8 space-y-5 shadow-md animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Compte Client Actif · 100 % Gratuit à vie
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                Votre compte actuel est un Compte Client (Recherche & Réservations)
              </h2>
              <p className="text-sm text-muted leading-relaxed max-w-3xl">
                Vous êtes actuellement connecté avec un <strong>Compte Client Particulier</strong>. Ce compte est 100 % gratuit : il vous permet d&apos;explorer le catalogue, d&apos;effectuer des simulations IA, de demander des devis directs aux prestataires et d&apos;acheter vos billets d&apos;événements <strong>sans aucun abonnement SaaS payant</strong>.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-foreground text-sm">
                  Vous souhaitez créer vos propres événements ou publier vos prestations sur la plateforme ?
                </p>
                <p className="text-xs text-muted leading-relaxed">
                  Les forfaits d&apos;abonnement ci-dessous (Particulier Organisateur, Business B2B, Vitrine Prestataire) sont réservés aux espaces de gestion événementielle. Pour y souscrire et accéder aux outils d&apos;organisation (plans de table 2D/3D, invitations WhatsApp, pass QR), <strong>vous devez créer un compte dédié (Organisateur ou Prestataire) distinct de votre compte client actuel</strong>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
              <Link href="/register?kind=ORGANIZER&intent=personal">
                <Button size="md" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Créer un compte Organisateur
                </Button>
              </Link>
              <Link href="/register?kind=VENDOR&intent=vendor">
                <Button size="md" variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Créer un compte Prestataire / Salle
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="md" variant="ghost">
                  Retourner à mon tableau de bord client
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {!isClientAccount && (
        <div className="bg-surface border border-border rounded-[var(--radius-card)] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Versements de vos commerciaux</p>
            <p className="text-xs text-muted mt-1">
              Votre organisation verse hors plateforme, puis vous joignez une preuve. Distinct d’EventMaster.
            </p>
          </div>
          <Link
            href="/dashboard/billing/payouts"
            className="text-sm font-semibold text-primary hover:underline shrink-0"
          >
            Ouvrir la file →
          </Link>
        </div>
      )}

      {(!billing || billing.plan === 'FREE') && (
        <Alert variant="info">
          Aucun abonnement payant n&apos;est actif. Les forfaits ci-dessous correspondent à votre type de compte
          ({tenant?.accountKind === 'VENDOR' ? 'marketplace' : tenant?.accountKind === 'BOTH' ? 'organisation + marketplace' : 'organisation'}),
          exclusivement en {CURRENCY_NAME} (FC).
        </Alert>
      )}

      {billing && (
        <div className="bg-surface-muted rounded-[var(--radius-card)] border border-border p-6 md:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="text-xs text-muted font-bold uppercase">Plan actuel</div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-2xl font-black text-foreground">
                  {plans.find((p) => p.id === billing.plan)?.displayName || billing.plan}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  billing.plan === 'FREE'
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-emerald-50 text-emerald-700'
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {billing.plan === 'FREE' ? 'Sans abonnement payant' : 'Actif'}
                </span>
                {billing.plan !== 'FREE' && billing.billingCycle === 'annual' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                    Cycle annuel
                  </span>
                )}
              </div>
            </div>
          </div>
          <QuotaUsagePanel
            quota={{
              usage: billing.usage,
              limits: billing.limits,
            }}
          />
          {(tenant?.accountKind === 'VENDOR' || tenant?.accountKind === 'BOTH') && (
            <p className="text-xs text-muted leading-relaxed">
              Un seul forfait à la fois : il n’y a pas de cumul Salle + Business.
              {tenant?.accountKind === 'BOTH'
                ? ' Compte mixte : Particulier, Business, Salle, Prestataire ou Salle & presta.'
                : ' Compte marketplace : Salle, Prestataire ou Salle & presta (fiches publiées, pas un volume d’agence).'}
            </p>
          )}
          {billing.capabilities && (
            <div className="mt-6 pt-6 border-t border-border grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {CAPABILITY_LABELS.map(({ key, label }) => {
                const enabled = billing.capabilities![key];
                if (typeof enabled !== 'boolean') return null;
                return (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    {enabled ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Minus className="w-3.5 h-3.5 text-muted shrink-0" />
                    )}
                    <span className={enabled ? 'text-foreground' : 'text-muted'}>{label}</span>
                  </div>
                );
              })}
              <div className="flex items-center gap-2 text-xs text-muted sm:col-span-2 lg:col-span-3">
                <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                Éditeur salles : <strong className="ml-1 capitalize">{billing.capabilities.roomEditorLevel}</strong>
                {' · '}
                Support : <strong className="ml-1 capitalize">{billing.capabilities.supportLevel}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        <div className="inline-flex p-1 bg-surface-muted rounded-full">
          {(['monthly', 'annual'] as BillingCycle[]).map((cycle) => (
            <button
              key={cycle}
              type="button"
              onClick={() => setBillingCycle(cycle)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
 billingCycle === cycle ? 'bg-surface shadow-sm' : 'text-muted'
 }`}
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
        <div key={label}>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted mb-4 text-center">{label}</h2>
          <div
            className={`grid gap-4 ${
 ids.length === 2 ? 'md:grid-cols-2' : ids.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
 }`}
          >
            {plans
              .filter((p) => ids.includes(p.id))
              .map((plan) => {
                const isCurrent = billing?.plan === plan.id;
                const db = dynamicPlans?.[plan.id];
                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-[var(--radius-card)] border bg-surface p-6 ${
                      isCurrent ? 'ring-2 ring-primary' : plan.highlighted ? 'border-primary shadow-lg' : 'border-border'
                    }`}
                  >
                    {plan.badge && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-3 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> {plan.badge}
                      </span>
                    )}
                    <h3 className="text-lg font-bold">{plan.displayName}</h3>
                    <p className="text-xs text-muted mt-1">{plan.description}</p>
                    <div className="mt-4 mb-4">
                      {plan.promoActive && plan.catalogPrice && (
                        <p className="text-[10px] font-semibold text-amber-700 mb-1">
                          {plan.promoLabel} · <span className="line-through text-muted">{plan.catalogPrice}</span>
                        </p>
                      )}
                      <span className="text-3xl font-extrabold">{plan.price}</span>
                      {plan.id !== 'FREE' && <span className="text-sm text-muted ml-1">{planPricePeriodSuffix(plan.id, billingCycle)}</span>}
                      {billingCycle === 'annual' && plan.id !== 'FREE' && (
                        <>
                          <p className="text-[10px] text-muted mt-1">
                            {isB2cPlanId(plan.id) ? 'Soit le trimestre déjà réduit' : 'Soit le mois déjà réduit'}
                          </p>
                          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
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
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {h}
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
                      <p className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1.5 mt-2">
                        Événements : {formatQuotaSummary(billing.usage.events, billing.limits.maxEvents)}
                        {' · '}
                        Modèles : {formatQuotaSummary(billing.usage.templates, billing.limits.maxTemplates)}
                      </p>
                    )}
                    <button
                      disabled={
                        (isCurrent && plan.id === 'FREE') ||
                        plan.id === 'FREE' ||
                        actionLoading !== null ||
                        !allowedPaidIds.includes(plan.id)
                      }
                      onClick={() => handleUpgrade(plan.id)}
                      className={`w-full py-2.5 mt-5 font-semibold rounded-xl text-xs disabled:opacity-50 ${
                        plan.highlighted || (isCurrent && plan.id !== 'FREE')
                          ? 'bg-primary text-white'
                          : 'bg-foreground text-background'
                      }`}
                    >
                      {actionLoading === plan.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : isCurrent && plan.id === 'FREE' ? (
                        'Forfait actuel (gratuit)'
                      ) : isCurrent ? (
                        saasPaymentMode === 'flexpay' ? 'Renouveler maintenant' : 'Demander un renouvellement'
                      ) : plan.id === 'FREE' ? (
                        'Gratuit'
                      ) : saasPaymentMode === 'flexpay' ? (
                        `Payer ${plan.displayName}`
                      ) : (
                        `Demander ${plan.displayName}`
                      )}
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      <div className="border border-border rounded-[var(--radius-card)] overflow-hidden bg-surface">
        <button
          type="button"
          onClick={() => setShowComparison(!showComparison)}
          className="w-full flex items-center justify-between px-6 py-4 font-bold text-sm text-foreground"
        >
          <span className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" /> Comparer les fonctionnalités
          </span>
          {showComparison ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        {showComparison && (
          <div className="border-t border-border">
            <div className="sm:hidden px-4 py-2 bg-primary/5 text-primary text-xs font-medium flex items-center justify-between border-b border-border/80">
              <span>↔ Faites glisser pour comparer tous les forfaits</span>
              <span className="font-mono text-[10px] bg-primary/10 px-1.5 py-0.5 rounded">9 forfaits</span>
            </div>
            <div className="overflow-x-auto overscroll-x-contain touch-pan-x">
              <table className="w-full text-sm min-w-[960px]">
              <thead>
                <tr className="bg-surface-muted">
                  <th className="text-left px-4 py-2 text-xs text-muted">Fonctionnalité</th>
                  {comparisonIds.map((id) => (
                    <th key={id} className="px-2 py-2 text-[10px] text-center text-muted">
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

      <div className="bg-surface border border-border rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="font-bold flex items-center gap-2 text-foreground">
            <FileText className="w-5 h-5 text-primary" />
            Factures récentes
          </h3>
          <Link href="/dashboard/invoices" className="text-xs font-bold text-primary hover:underline">
            Voir tout →
          </Link>
        </div>
        <InvoiceListPanel
          invoices={invoices.slice(0, 5)}
          showFilters={false}
          emptyMessage="Les factures apparaissent ici après approbation de votre demande d'abonnement."
        />
      </div>

      <div className="bg-surface border border-border rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-soft)]">
        <h3 className="font-bold text-foreground">Historique des demandes</h3>
        {requests.length === 0 ? (
          <p className="text-xs text-muted py-6 text-center italic">Aucune demande.</p>
        ) : (
          <>
            <div className="md:hidden space-y-3 mt-4">
              {requests.map((req) => {
                const canRetryFlex =
                  saasPaymentMode === 'flexpay' &&
                  (req.status === 'PENDING' || req.status === 'REJECTED') &&
                  (req.paymentProvider === 'flexpay_card' || req.paymentProvider === 'flexpay_mobile');
                return (
                  <div key={req.id} className="rounded-xl border border-border p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm">{req.requestedPlan}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : req.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {req.status === 'APPROVED' ? 'Approuvée' : req.status === 'REJECTED' ? 'Refusée' : 'En attente'}
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                    {req.durationDays} jours · {new Date(req.createdAt).toLocaleDateString('fr-FR')}
                    {req.flexPayChannel ? ` · ${req.flexPayChannel}` : ''}
                  </p>
                    {canRetryFlex && (
                      <button
                        type="button"
                        className="text-xs font-semibold text-primary"
                        onClick={() => {
                          setFlexPayCheckout({
                            planName: req.requestedPlan,
                            priceLabel: req.approvedAmount ? formatFc(req.approvedAmount) : '',
                            retryRequestId: req.id,
                            initialMethod: req.paymentProvider === 'flexpay_mobile' ? 'mobile' : 'card',
                          });
                          setError('');
                          setSuccessMsg('');
                        }}
                      >
                        Reprendre / relancer le paiement
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs mt-4">
                <thead>
                  <tr className="text-muted uppercase">
                    <th className="py-2 text-left">Forfait</th>
                    <th className="py-2 text-left">Durée</th>
                    <th className="py-2 text-left">Date</th>
                    <th className="py-2 text-left">Statut</th>
                    <th className="py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => {
                    const canRetryFlex =
                      saasPaymentMode === 'flexpay' &&
                      (req.status === 'PENDING' || req.status === 'REJECTED') &&
                      (req.paymentProvider === 'flexpay_card' || req.paymentProvider === 'flexpay_mobile');
                    return (
                      <tr key={req.id} className="border-t border-border">
                        <td className="py-2 font-bold">{req.requestedPlan}</td>
                        <td className="py-2">{req.durationDays} j</td>
                        <td className="py-2">{new Date(req.createdAt).toLocaleDateString('fr-FR')}</td>
                        <td className="py-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              req.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : req.status === 'REJECTED'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {req.status === 'APPROVED' ? 'Approuvée' : req.status === 'REJECTED' ? 'Refusée' : 'En attente'}
                          </span>
                        </td>
                        <td className="py-2">
                          {canRetryFlex ? (
                            <button
                              type="button"
                              className="font-semibold text-primary"
                              onClick={() => {
                                setFlexPayCheckout({
                                  planName: req.requestedPlan,
                                  priceLabel: req.approvedAmount ? formatFc(req.approvedAmount) : '',
                                  retryRequestId: req.id,
                                  initialMethod: req.paymentProvider === 'flexpay_mobile' ? 'mobile' : 'card',
                                });
                                setError('');
                                setSuccessMsg('');
                              }}
                            >
                              Relancer
                            </button>
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

      {flexPayCheckout && saasPaymentMode === 'flexpay' ? (
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
          }}
        />
      ) : null}
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
