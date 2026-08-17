'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  CreditCard, Check, Loader2, Sparkles,
  Clock, XCircle, CheckCircle, Minus, ChevronDown, ChevronUp, ShieldCheck, FileText,
} from 'lucide-react';
import Link from 'next/link';
import { Alert, SkeletonBillingView } from '@/components/ui';
import InvoiceListPanel, { type PlatformInvoiceItem } from '@/components/InvoiceListPanel';
import QuotaUsagePanel, { PlanQuotaLimits } from '@/components/QuotaUsagePanel';
import { formatQuotaRemaining } from '@/lib/quotaDisplay';
import {
  LANDING_PLANS,
  FEATURE_COMPARISON,
  PLAN_IDS,
  VENDOR_PLAN_IDS,
  paidPlanIdsForAccountKind,
  ANNUAL_DISCOUNT_PERCENT,
  getPlanDisplayPrice,
  CURRENCY_NAME,
  type BillingCycle,
  type PlanId,
} from '@/config/landingPricing';

interface BillingStatus {
  plan: PlanId;
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
  { key: 'mockupOcr', label: 'OCR import maquette' },
  { key: 'roomThemesFixtures', label: 'Thèmes & fixtures salles' },
  { key: 'commercialNetwork', label: 'Réseau commercial (20 %)' },
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
}

function FeatureCell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="w-4 h-4 text-emerald-600 mx-auto" />;
  if (value === false) return <Minus className="w-4 h-4 text-muted mx-auto" />;
  return <span className="text-xs font-medium text-foreground">{value}</span>;
}

const BILLING_TIERS: Array<{ label: string; ids: PlanId[] }> = [
  { label: 'Salles & prestataires', ids: [...VENDOR_PLAN_IDS] },
  { label: 'Particuliers (B2C)', ids: ['PERSONAL'] },
  { label: 'Essentials & Business (B2B)', ids: ['FREE', 'STANDARD'] },
  { label: 'Business Premium (B2B)', ids: ['PREMIUM_1', 'PREMIUM_2'] },
  { label: 'Business Enterprise (B2B)', ids: ['ENTERPRISE_1', 'ENTERPRISE_2', 'ENTERPRISE_3'] },
];

export default function BillingPage() {
  const { tenant } = useAuth();
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
      if (requestsData) setRequests(requestsData);
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
      return {
        ...plan,
        displayName: db?.name?.replace('Plan ', '') || plan.ms365Name,
        price: getPlanDisplayPrice(plan, billingCycle, db?.price),
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
    setError('');
    setSuccessMsg('');
    setActionLoading(plan);
    try {
      await api.post('/subscriptions/request', {
        requestedPlan: plan,
        durationDays: billingCycle === 'annual' ? 365 : 30,
      });
      setSuccessMsg(
        `Demande ${plan} soumise (${billingCycle === 'annual' ? '12 mois' : '30 jours'}, −${ANNUAL_DISCOUNT_PERCENT} % si annuel). Facture SendGrid après validation.`,
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

  return (
    <div className="space-y-10 w-full">
      <div className="text-center space-y-3">
        <p className="text-sm font-semibold text-primary uppercase tracking-widest">Facturation</p>
        <h1 className="text-3xl font-bold text-foreground">
          Forfait de {tenant?.name || 'votre organisation'}
        </h1>
        <p className="text-muted text-sm">
          Forfaits adaptés à votre type de compte · tarifs en {CURRENCY_NAME} (FC) · réduction annuelle {ANNUAL_DISCOUNT_PERCENT} %
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {successMsg && <Alert variant="success">{successMsg}</Alert>}

      {(!billing || billing.plan === 'FREE') && (
        <Alert variant="info">
          Aucun abonnement payant n&apos;est actif. Les forfaits ci-dessous correspondent à votre type de compte
          ({tenant?.accountKind === 'VENDOR' ? 'catalogue' : tenant?.accountKind === 'BOTH' ? 'organisation + catalogue' : 'organisation'}),
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
                : ' Compte catalogue : Salle, Prestataire ou Salle & presta (fiches publiées, pas un volume d’agence).'}
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

      <div className="flex justify-center">
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
              {cycle === 'monthly' ? 'Mensuel' : `Annuel (−${ANNUAL_DISCOUNT_PERCENT} %)`}
            </button>
          ))}
        </div>
      </div>

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
                      <span className="text-3xl font-extrabold">{plan.price}</span>
                      {plan.id !== 'FREE' && <span className="text-sm text-muted ml-1">/ mois</span>}
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
                        isCurrent ||
                        plan.id === 'FREE' ||
                        actionLoading !== null ||
                        !allowedPaidIds.includes(plan.id)
                      }
                      onClick={() => handleUpgrade(plan.id)}
                      className={`w-full py-2.5 mt-5 font-semibold rounded-xl text-xs disabled:opacity-50 ${
                        plan.highlighted ? 'bg-primary text-white' : 'bg-foreground text-background'
                      }`}
                    >
                      {actionLoading === plan.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : isCurrent ? (
                        billing?.plan === 'FREE' ? 'Forfait actuel (gratuit)' : 'Forfait actuel'
                      ) : plan.id === 'FREE' ? (
                        'Gratuit'
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
          <div className="overflow-x-auto border-t border-border">
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
              {requests.map((req) => (
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
                  <p className="text-xs text-muted">{req.durationDays} jours · {new Date(req.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs mt-4">
                <thead>
                  <tr className="text-muted uppercase">
                    <th className="py-2 text-left">Forfait</th>
                    <th className="py-2 text-left">Durée</th>
                    <th className="py-2 text-left">Date</th>
                    <th className="py-2 text-left">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
