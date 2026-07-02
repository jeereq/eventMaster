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
  type BillingCycle,
} from '@/config/landingPricing';

interface BillingStatus {
  plan: 'FREE' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
  usage: {
    events: number;
    guests: number;
    templates: number;
  };
  limits: {
    maxEvents: number;
    maxGuests: number;
    maxTemplates: number;
    customTemplates: boolean;
  };
}

interface SubscriptionRequest {
  id: string;
  requestedPlan: 'FREE' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';
  durationDays: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

type PlanId = 'FREE' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';

function FeatureCell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="w-4 h-4 text-emerald-600 mx-auto" />;
  if (value === false) return <Minus className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />;
  return <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{value}</span>;
}

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
      if (billingData.plans) {
        setDynamicPlans(billingData.plans);
      } else if (plansData) {
        setDynamicPlans(plansData);
      }
      if (requestsData) setRequests(requestsData);
    } catch (err: any) {
      console.error('Error loading billing status:', err);
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
        price:
          billingCycle === 'monthly'
            ? db?.price && plan.id !== 'FREE'
              ? db.price
              : plan.monthlyPrice
            : plan.annualPrice,
        description: db?.description || plan.tagline,
        limits: db
          ? {
              events: db.maxEvents,
              guests: db.maxGuests,
              templates: db.maxTemplates,
              customTemplates: db.customTemplates,
            }
          : null,
      };
    });
  }, [dynamicPlans, billingCycle]);

  const handleUpgrade = async (plan: PlanId) => {
    setError('');
    setSuccessMsg('');
    setActionLoading(plan);

    try {
      await api.post('/subscriptions/request', {
        requestedPlan: plan,
        durationDays: billingCycle === 'annual' ? 365 : 30,
      });
      setSuccessMsg(
        `Demande d'activation du forfait ${plan} (${billingCycle === 'annual' ? '12 mois' : '30 jours'}) soumise au Super Admin. Une facture vous sera envoyée par e-mail après validation.`,
      );
      await loadBillingStatus();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors du changement de plan.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3 animate-pulse" />
        <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
        <div className="grid md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 w-full max-w-7xl mx-auto">
      {/* En-tête style Microsoft 365 */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
          Facturation & abonnements
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
          Gérez le forfait de {tenant?.name || 'votre organisation'}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-base">
          Tarification transparente par organisation. Les factures sont envoyées par SendGrid au propriétaire et aux managers après validation.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {successMsg && <Alert variant="success">{successMsg}</Alert>}

      {/* Plan actuel + quotas */}
      {billing && (
        <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Abonnement actuel</div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {plans.find((p) => p.id === billing.plan)?.displayName || billing.plan}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 text-xs font-bold text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Actif
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {[
                { label: 'Événements', used: billing.usage.events, max: billing.limits.maxEvents },
                { label: 'Invités', used: billing.usage.guests, max: billing.limits.maxGuests },
                { label: 'Modèles', used: billing.usage.templates, max: billing.limits.maxTemplates },
              ].map((q) => (
                <div key={q.label} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 text-xs font-bold uppercase">{q.label}</div>
                  <div className="font-extrabold text-slate-800 dark:text-slate-200 mt-1">
                    {q.used} / {q.max >= 9999 ? '∞' : q.max}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toggle mensuel / annuel */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-full">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
              billingCycle === 'monthly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Mensuel
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
              billingCycle === 'annual'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Annuel
            <span className="ml-1.5 text-xs text-emerald-600 font-bold">−17 %</span>
          </button>
        </div>
      </div>

      {/* Grille forfaits MS365 */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
        {plans.map((plan) => {
          const isCurrent = billing?.plan === plan.id;
          const isHighlighted = plan.highlighted;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border bg-white dark:bg-slate-900 p-6 ${
                isCurrent
                  ? 'ring-2 ring-indigo-600 border-indigo-200 dark:border-indigo-800'
                  : isHighlighted
                    ? 'border-2 border-indigo-500 shadow-lg shadow-indigo-500/10'
                    : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {plan.badge}
                </span>
              )}

              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{plan.displayName}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{plan.description}</p>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{plan.price}</span>
                  <span className="text-slate-500 text-sm ml-1">
                    {plan.id === 'FREE' ? '' : billingCycle === 'monthly' ? '/ mois' : '/ mois (annuel)'}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">{plan.monthlyNote}</p>
                </div>

                {plan.limits && (
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-4">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      {(plan.limits.events ?? 0) >= 9999 ? 'Événements illimités' : `${plan.limits.events} événements`}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      {(plan.limits.guests ?? 0) >= 99999 ? 'Invités illimités' : `${plan.limits.guests} invités`}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      {plan.limits.customTemplates ? 'Modèles personnalisés' : 'Modèles standards'}
                    </li>
                  </ul>
                )}
              </div>

              <button
                disabled={isCurrent || actionLoading !== null}
                onClick={() => handleUpgrade(plan.id)}
                className={`w-full py-2.5 mt-6 font-semibold rounded-xl text-xs transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  isHighlighted && !isCurrent
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                    : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-950 text-white'
                }`}
              >
                {actionLoading === plan.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : isCurrent ? (
                  'Forfait actuel'
                ) : (
                  `Demander ${plan.displayName}`
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Tableau comparatif */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setShowComparison(!showComparison)}
          className="w-full flex items-center justify-between px-6 py-4 text-left font-bold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
        >
          <span className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            Comparer toutes les fonctionnalités
          </span>
          {showComparison ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showComparison && (
          <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950">
                  <th className="text-left px-4 py-3 font-bold text-slate-600 w-1/3">Fonctionnalité</th>
                  {(['FREE', 'STANDARD', 'PREMIUM', 'ENTERPRISE'] as const).map((id) => (
                    <th key={id} className="px-3 py-3 font-bold text-slate-800 dark:text-slate-200 text-center text-xs">
                      {plans.find((p) => p.id === id)?.displayName || id}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_COMPARISON.map((row, idx) => (
                  <tr key={idx} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 text-xs">{row.label}</td>
                    {(['FREE', 'STANDARD', 'PREMIUM', 'ENTERPRISE'] as const).map((id) => (
                      <td key={id} className="px-3 py-2.5 text-center">
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

      {/* Historique demandes */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Historique des demandes</h3>
          <p className="text-xs text-slate-500 mt-1">
            Après approbation, une facture SendGrid est envoyée au propriétaire et aux managers.
          </p>
        </div>

        {requests.length === 0 ? (
          <p className="text-center py-8 text-slate-400 italic text-xs">Aucune demande soumise.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Forfait</th>
                  <th className="py-3 px-4">Durée</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {requests.map((req) => (
                  <tr key={req.id}>
                    <td className="py-3 px-4 font-bold">{req.requestedPlan}</td>
                    <td className="py-3 px-4">{req.durationDays} jours</td>
                    <td className="py-3 px-4">
                      {new Date(req.createdAt).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : req.status === 'REJECTED'
                              ? 'bg-rose-50 border-rose-200 text-rose-700'
                              : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}
                      >
                        {req.status === 'APPROVED' ? <CheckCircle className="w-3 h-3" /> : req.status === 'REJECTED' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {req.status === 'APPROVED' ? 'Approuvée' : req.status === 'REJECTED' ? 'Refusée' : 'En attente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
