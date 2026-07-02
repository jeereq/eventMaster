'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  CreditCard, Check, Loader2, Sparkles,
  Clock, XCircle, CheckCircle, Minus, ChevronDown, ChevronUp, ShieldCheck,
} from 'lucide-react';
import { Alert } from '@/components/ui';
import {
  LANDING_PLANS,
  FEATURE_COMPARISON,
  PLAN_IDS,
  ANNUAL_DISCOUNT_PERCENT,
  getPlanDisplayPrice,
  type BillingCycle,
  type PlanId,
} from '@/config/landingPricing';

interface BillingStatus {
  plan: PlanId;
  usage: { events: number; guests: number; templates: number };
  limits: {
    maxEvents: number;
    maxGuests: number;
    maxTemplates: number;
    customTemplates: boolean;
  };
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
  if (value === false) return <Minus className="w-4 h-4 text-slate-300 mx-auto" />;
  return <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{value}</span>;
}

const BILLING_TIERS: Array<{ label: string; ids: PlanId[] }> = [
  { label: 'Essentials & Business', ids: ['FREE', 'STANDARD'] },
  { label: 'Business Premium', ids: ['PREMIUM_1', 'PREMIUM_2'] },
  { label: 'Business Enterprise', ids: ['ENTERPRISE_1', 'ENTERPRISE_2', 'ENTERPRISE_3'] },
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

  const loadBillingStatus = async () => {
    try {
      const [billingData, plansData, requestsData] = await Promise.all([
        api.get('/billing/status'),
        api.get('/subscriptions/plans').catch(() => null),
        api.get('/subscriptions/my-requests').catch(() => []),
      ]);
      setBilling(billingData);
      setDynamicPlans(billingData.plans || plansData);
      if (requestsData) setRequests(requestsData);
    } catch (err: any) {
      setError('Impossible de charger les informations de facturation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingStatus();
  }, []);

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
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3 animate-pulse" />
        <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-10 w-full max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest">Facturation</p>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Forfait de {tenant?.name || 'votre organisation'}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Business Premium 1 & 2 · Business Enterprise 1 à 3 · réduction annuelle {ANNUAL_DISCOUNT_PERCENT} %
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {successMsg && <Alert variant="success">{successMsg}</Alert>}

      {billing && (
        <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 rounded-2xl border p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="text-xs text-slate-500 font-bold uppercase">Plan actuel</div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-2xl font-black">
                  {plans.find((p) => p.id === billing.plan)?.displayName || billing.plan}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-xs font-bold text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5" /> Actif
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {[
                { l: 'Événements', u: billing.usage.events, m: billing.limits.maxEvents },
                { l: 'Invités', u: billing.usage.guests, m: billing.limits.maxGuests },
                { l: 'Modèles', u: billing.usage.templates, m: billing.limits.maxTemplates },
              ].map((q) => (
                <div key={q.l} className="bg-white dark:bg-slate-900 p-3 rounded-xl border">
                  <div className="text-xs text-slate-500 font-bold uppercase">{q.l}</div>
                  <div className="font-extrabold mt-1">{q.u} / {q.m >= 9999 ? '∞' : q.m}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-full">
          {(['monthly', 'annual'] as BillingCycle[]).map((cycle) => (
            <button
              key={cycle}
              type="button"
              onClick={() => setBillingCycle(cycle)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
                billingCycle === cycle ? 'bg-white dark:bg-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              {cycle === 'monthly' ? 'Mensuel' : `Annuel (−${ANNUAL_DISCOUNT_PERCENT} %)`}
            </button>
          ))}
        </div>
      </div>

      {BILLING_TIERS.map(({ label, ids }) => (
        <div key={label}>
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4 text-center">{label}</h2>
          <div
            className={`grid gap-4 ${
              ids.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : ids.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 max-w-4xl mx-auto'
            }`}
          >
            {plans
              .filter((p) => ids.includes(p.id))
              .map((plan) => {
                const isCurrent = billing?.plan === plan.id;
                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-2xl border bg-white dark:bg-slate-900 p-6 ${
                      isCurrent ? 'ring-2 ring-indigo-600' : plan.highlighted ? 'border-indigo-500 shadow-lg' : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {plan.badge && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-3 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> {plan.badge}
                      </span>
                    )}
                    <h3 className="text-lg font-bold">{plan.displayName}</h3>
                    <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
                    <div className="mt-4 mb-4">
                      <span className="text-3xl font-extrabold">{plan.price}</span>
                      {plan.id !== 'FREE' && <span className="text-sm text-slate-500 ml-1">/ mois</span>}
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-600 flex-1 border-t pt-3">
                      {plan.highlights.map((h) => (
                        <li key={h} className="flex gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {h}
                        </li>
                      ))}
                    </ul>
                    <button
                      disabled={isCurrent || plan.id === 'FREE' || actionLoading !== null}
                      onClick={() => handleUpgrade(plan.id)}
                      className={`w-full py-2.5 mt-5 font-semibold rounded-xl text-xs disabled:opacity-50 ${
                        plan.highlighted ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                      }`}
                    >
                      {actionLoading === plan.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : isCurrent ? (
                        'Forfait actuel'
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

      <div className="border rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setShowComparison(!showComparison)}
          className="w-full flex items-center justify-between px-6 py-4 font-bold text-sm"
        >
          <span className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" /> Comparer les fonctionnalités
          </span>
          {showComparison ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        {showComparison && (
          <div className="overflow-x-auto border-t">
            <table className="w-full text-sm min-w-[960px]">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-4 py-2 text-xs">Fonctionnalité</th>
                  {PLAN_IDS.map((id) => (
                    <th key={id} className="px-2 py-2 text-[10px] text-center">
                      {LANDING_PLANS.find((p) => p.id === id)?.ms365Name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_COMPARISON.map((row) => (
                  <tr key={row.label} className="border-t">
                    <td className="px-4 py-2 text-xs">{row.label}</td>
                    {PLAN_IDS.map((id) => (
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

      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-6">
        <h3 className="font-bold">Historique des demandes</h3>
        {requests.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center italic">Aucune demande.</p>
        ) : (
          <table className="w-full text-xs mt-4">
            <thead>
              <tr className="text-slate-400 uppercase">
                <th className="py-2 text-left">Forfait</th>
                <th className="py-2 text-left">Durée</th>
                <th className="py-2 text-left">Date</th>
                <th className="py-2 text-left">Statut</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-t">
                  <td className="py-2 font-bold">{req.requestedPlan}</td>
                  <td className="py-2">{req.durationDays} j</td>
                  <td className="py-2">{new Date(req.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                      req.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {req.status === 'APPROVED' ? 'Approuvée' : req.status === 'REJECTED' ? 'Refusée' : 'En attente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
