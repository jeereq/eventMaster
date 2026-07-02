'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  CreditCard, Check, ShieldCheck, Loader2, AlertCircle, Sparkles,
  Clock, XCircle, CheckCircle, HelpCircle
} from 'lucide-react';

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

export default function BillingPage() {
  const { refreshBilling } = useAuth();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [dynamicPlans, setDynamicPlans] = useState<any>(null);
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadBillingStatus = async () => {
    try {
      const [billingData, plansData, requestsData] = await Promise.all([
        api.get('/billing/status'),
        api.get('/subscriptions/plans').catch(() => null),
        api.get('/subscriptions/my-requests').catch(() => [])
      ]);
      setBilling(billingData);
      if (plansData) {
        setDynamicPlans(plansData);
      }
      if (requestsData) {
        setRequests(requestsData);
      }
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

  const handleUpgrade = async (plan: 'FREE' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE') => {
    setError('');
    setSuccessMsg('');
    setActionLoading(plan);

    try {
      // Submit a subscription request to the Super Admin for validation
      await api.post('/subscriptions/request', { 
        requestedPlan: plan, 
        durationDays: 30 
      });
      setSuccessMsg(`Votre demande d'activation du forfait ${plan} pour 30 jours a été soumise avec succès au Super Admin ! Veuillez attendre sa validation pour y accéder.`);
      await loadBillingStatus(); // Reload status and requests list
    } catch (err: any) {
      console.error('Error upgrading:', err);
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
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Facturation & Plan</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Gérez votre formule SaaS Multi-tenant et découvrez vos quotas d'utilisation.</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-xl flex items-center gap-3 text-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Current Plan Card */}
      {billing && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Abonnement Actuel</div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-slate-900 dark:text-white">Plan {billing.plan}</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                Actif
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Isolation stricte garantie de l'organisation tenant ID.
            </p>
          </div>

          <div className="flex flex-wrap gap-6 text-sm">
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-150 dark:border-slate-800 min-w-[120px]">
              <div className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">Événements</div>
              <div className="font-extrabold text-slate-800 dark:text-slate-200 mt-1">{billing.usage.events} / {billing.limits.maxEvents === 9999 ? '∞' : billing.limits.maxEvents}</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-150 dark:border-slate-800 min-w-[120px]">
              <div className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">Invités Totaux</div>
              <div className="font-extrabold text-slate-800 dark:text-slate-200 mt-1">{billing.usage.guests} / {billing.limits.maxGuests === 99999 ? '∞' : billing.limits.maxGuests}</div>
            </div>
          </div>
        </div>
      )}

      {/* Plans Comparison Grid */}
      <div className="grid md:grid-cols-4 gap-6 items-stretch">
        {/* FREE Plan */}
        <div className={`border rounded-3xl p-6 bg-white dark:bg-slate-900 flex flex-col justify-between ${billing?.plan === 'FREE' ? 'ring-2 ring-slate-800 dark:ring-slate-200' : 'border-slate-200 dark:border-slate-800'}`}>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Plan Gratuit (Free)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Idéal pour tester l'application.</p>
              <div className="flex items-baseline gap-1 mt-4">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">0 FC</span>
                <span className="text-slate-500 dark:text-slate-400 text-sm">/mois</span>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-4">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>3 événements actifs</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>50 invités maximum</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>2 modèles d'invitations simples</span>
              </li>
              <li className="flex items-center gap-2.5 line-through text-slate-400 dark:text-slate-500">
                <span>Modèles d'Invitation Customisés</span>
              </li>
            </ul>
          </div>

          <button
            disabled={billing?.plan === 'FREE' || actionLoading !== null}
            onClick={() => handleUpgrade('FREE')}
            className="w-full text-center py-2.5 mt-6 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed text-xs cursor-pointer"
          >
            {actionLoading === 'FREE' ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : billing?.plan === 'FREE' ? (
              'Votre plan actuel'
            ) : (
              'Demander le Plan Gratuit'
            )}
          </button>
        </div>

        {/* STANDARD Plan */}
        <div className={`border rounded-3xl p-6 bg-white dark:bg-slate-900 flex flex-col justify-between ${billing?.plan === 'STANDARD' ? 'ring-2 ring-slate-800 dark:ring-slate-200' : 'border-slate-200 dark:border-slate-800'}`}>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{dynamicPlans?.STANDARD?.name || 'Plan Standard'}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Idéal pour les événements de taille moyenne.</p>
              <div className="flex items-baseline gap-1 mt-4">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{dynamicPlans?.STANDARD?.price || '30.000 FC'}</span>
                <span className="text-slate-500 dark:text-slate-400 text-sm">/mois</span>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-4">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>{dynamicPlans?.STANDARD?.maxEvents ?? 8} événements actifs</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>{dynamicPlans?.STANDARD?.maxGuests ?? 150} invités maximum</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>{dynamicPlans?.STANDARD?.maxTemplates ?? 5} modèles d'invitations</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>{dynamicPlans?.STANDARD?.customTemplates ? "Modèles d'invitations personnalisés" : "Modèles d'invitations simples"}</span>
              </li>
            </ul>
          </div>

          <button
            disabled={billing?.plan === 'STANDARD' || actionLoading !== null}
            onClick={() => handleUpgrade('STANDARD')}
            className="w-full flex items-center justify-center gap-2 py-2.5 mt-6 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-950 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed text-xs cursor-pointer"
          >
            {actionLoading === 'STANDARD' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : billing?.plan === 'STANDARD' ? (
              'Votre plan actuel'
            ) : (
              'Demander le Plan Standard'
            )}
          </button>
        </div>

        {/* PREMIUM Plan */}
        <div className={`border-2 rounded-3xl p-6 flex flex-col justify-between relative bg-white dark:bg-slate-900 ${billing?.plan === 'PREMIUM' ? 'border-indigo-600 shadow-lg' : 'border-slate-200 dark:border-slate-800'}`}>
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Recommandé
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{dynamicPlans?.PREMIUM?.name || 'Plan Premium'}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Pour les organisateurs d'événements.</p>
              <div className="flex items-baseline gap-1 mt-4">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{dynamicPlans?.PREMIUM?.price || '80.000 FC'}</span>
                <span className="text-slate-500 dark:text-slate-400 text-sm">/mois</span>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-4">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>{dynamicPlans?.PREMIUM?.maxEvents ?? 20} événements actifs</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>{dynamicPlans?.PREMIUM?.maxGuests ?? 500} invités maximum</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>{dynamicPlans?.PREMIUM?.maxTemplates ?? 10} modèles d'invitations</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="font-semibold text-slate-900 dark:text-slate-100">{(dynamicPlans?.PREMIUM?.customTemplates ?? true) ? "Modèles d'Invitation Customisés" : "Modèles d'invitations simples"}</span>
              </li>
            </ul>
          </div>

          <button
            disabled={billing?.plan === 'PREMIUM' || actionLoading !== null}
            onClick={() => handleUpgrade('PREMIUM')}
            className="w-full flex items-center justify-center gap-2 py-2.5 mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition shadow-lg shadow-indigo-100 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed text-xs cursor-pointer"
          >
            {actionLoading === 'PREMIUM' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : billing?.plan === 'PREMIUM' ? (
              'Votre plan actuel'
            ) : (
              'Demander le Plan Premium'
            )}
          </button>
        </div>

        {/* ENTERPRISE Plan */}
        <div className={`border rounded-3xl p-6 bg-white dark:bg-slate-900 flex flex-col justify-between ${billing?.plan === 'ENTERPRISE' ? 'ring-2 ring-slate-800 dark:ring-slate-200' : 'border-slate-200 dark:border-slate-800'}`}>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{dynamicPlans?.ENTERPRISE?.name || 'Plan Enterprise'}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Pour les grandes organisations.</p>
              <div className="flex items-baseline gap-1 mt-4">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{dynamicPlans?.ENTERPRISE?.price || '275.000 FC'}</span>
                <span className="text-slate-500 dark:text-slate-400 text-sm">/mois</span>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-4">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>{(dynamicPlans?.ENTERPRISE?.maxEvents ?? 9999) >= 9999 ? 'Événements Illimités' : `${dynamicPlans?.ENTERPRISE?.maxEvents} événements actifs`}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>{(dynamicPlans?.ENTERPRISE?.maxGuests ?? 99999) >= 9999 ? 'Invités Illimités' : `${dynamicPlans?.ENTERPRISE?.maxGuests} invités maximum`}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>{(dynamicPlans?.ENTERPRISE?.maxTemplates ?? 9999) >= 9999 ? 'Modèles Illimités' : `${dynamicPlans?.ENTERPRISE?.maxTemplates} modèles d'invitations`}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="font-semibold text-slate-900 dark:text-slate-100">Support Dédié & SLA</span>
              </li>
            </ul>
          </div>

          <button
            disabled={billing?.plan === 'ENTERPRISE' || actionLoading !== null}
            onClick={() => handleUpgrade('ENTERPRISE')}
            className="w-full flex items-center justify-center gap-2 py-2.5 mt-6 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-950 text-white font-semibold rounded-xl transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-xs cursor-pointer"
          >
            {actionLoading === 'ENTERPRISE' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : billing?.plan === 'ENTERPRISE' ? (
              'Votre plan actuel'
            ) : (
              'Demander le Plan Enterprise'
            )}
          </button>
        </div>
      </div>

      {/* Subscription Requests History */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Historique de vos demandes d'activation</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Suivez le statut de validation de vos demandes d'abonnement par le Super Admin.</p>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 italic text-xs">
            Aucune demande d'activation soumise pour le moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Forfait Demandé</th>
                  <th className="py-3 px-4">Durée</th>
                  <th className="py-3 px-4">Date de Demande</th>
                  <th className="py-3 px-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      Plan {req.requestedPlan}
                    </td>
                    <td className="py-3.5 px-4">{req.durationDays} jours</td>
                    <td className="py-3.5 px-4">
                      {new Date(req.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        req.status === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400' :
                        req.status === 'REJECTED' ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400' :
                        'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400'
                      }`}>
                        {req.status === 'APPROVED' ? <CheckCircle className="w-3 h-3" /> :
                         req.status === 'REJECTED' ? <XCircle className="w-3 h-3" /> :
                         <Clock className="w-3 h-3" />}
                        {req.status === 'APPROVED' ? 'Approuvée' :
                         req.status === 'REJECTED' ? 'Refusée' :
                         'En attente'}
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
