'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldAlert, Send, Clock, CheckCircle2, XCircle,
  Loader2, CreditCard, Check, LogOut, RefreshCw,
} from 'lucide-react';
import {
  LANDING_PLANS,
  paidPlanIdsForAccountKind,
  CURRENCY_NAME,
  ensureFcPrice,
  getPlanDisplayPrice,
  type PlanId,
} from '@/config/landingPricing';
import { cn } from '@/lib/cn';

export default function PWARestrictedScreen() {
  const { tenant, logout, refreshProfile } = useAuth();
  const [requestedPlan, setRequestedPlan] = useState<PlanId>('STANDARD');
  const [proofOfPayment, setProofOfPayment] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [dynamicPlans, setDynamicPlans] = useState<Record<string, any> | null>(null);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadMyRequests = async () => {
    try {
      setLoadingRequests(true);
      const [requestsData, plansData] = await Promise.all([
        api.get('/subscriptions/my-requests'),
        api.get('/subscriptions/plans').catch(() => null),
      ]);
      setRequests(requestsData);
      if (plansData) setDynamicPlans(plansData);
    } catch (err) {
      console.error('Error loading subscription requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadMyRequests();
  }, []);

  const allowedPlanIds = useMemo(
    () => paidPlanIdsForAccountKind(tenant?.accountKind),
    [tenant?.accountKind],
  );

  const plans = useMemo(() => {
    return LANDING_PLANS.filter((plan) => allowedPlanIds.includes(plan.id)).map((plan) => {
      const db = dynamicPlans?.[plan.id];
      return {
        id: plan.id,
        name: db?.name?.replace('Plan ', '') || plan.ms365Name,
        price: ensureFcPrice(db?.price, plan.monthlyPriceFc),
        highlights: plan.highlights,
        highlighted: plan.highlighted,
        badge: plan.badge,
      };
    });
  }, [dynamicPlans, allowedPlanIds]);

  useEffect(() => {
    if (plans.length && !plans.some((p) => p.id === requestedPlan)) {
      setRequestedPlan(plans[0].id);
    }
  }, [plans, requestedPlan]);

  const selectedPlan = plans.find((p) => p.id === requestedPlan) || plans[0];

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    setError('');
    setSuccess('');
    try {
      await refreshProfile();
      await loadMyRequests();
      setSuccess('Statut rafraîchi avec succès depuis le serveur !');
    } catch {
      setError('Impossible de rafraîchir le statut.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const response = await api.post('/subscriptions/request', {
        requestedPlan,
        durationDays: 30,
        proofOfPayment: proofOfPayment.trim() || null,
      });

      setSuccess(response.message || 'Votre demande a été transmise avec succès.');
      setProofOfPayment('');
      loadMyRequests();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l\'envoi de votre demande.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasPendingRequest = requests.some((r) => r.status === 'PENDING');

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between font-sans antialiased relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

      <header className="border-b border-border bg-surface/50 backdrop-blur-md px-6 py-4 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-xl text-white">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-foreground block">EventMaster</span>
            <span className="text-[10px] text-muted font-semibold uppercase tracking-wider">Accès restreint</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefreshStatus}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-primary hover:bg-primary/10 transition border border-primary/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Rafraîchissement...' : 'Rafraîchir mon statut'}
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition border border-rose-500/20"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-12 grid lg:grid-cols-5 gap-8 items-start relative z-10">
        <div className="lg:col-span-3 space-y-8">
          <div className="bg-surface/40 border border-border rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
              <ShieldAlert className="w-4 h-4" />
              <span>Abonnement expiré ou licence inactive</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-tight">
              Votre espace {tenant?.name ? `"${tenant.name}"` : ''} requiert une activation.
            </h1>
            <p className="text-sm text-muted leading-relaxed">
              Les forfaits payants adaptés à votre type de compte sont proposés ci-dessous. Les tarifs sont exclusivement en {CURRENCY_NAME} ({'FC'}).
              Choisissez l&apos;offre adaptée, puis soumettez votre demande d&apos;activation.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setRequestedPlan(plan.id)}
                className={cn(
                  'border rounded-2xl p-5 text-left transition relative flex flex-col justify-between h-full',
                  requestedPlan === plan.id
                    ? 'bg-primary/10 border-primary ring-2 ring-primary/30'
                    : 'bg-surface/20 border-border hover:border-border',
                )}
              >
                {plan.badge && (
                  <span className="absolute top-0 right-4 transform -translate-y-1/2 bg-primary text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {plan.badge}
                  </span>
                )}
                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-black text-foreground">{plan.price}</span>
                      <span className="text-[10px] text-muted">/ mois</span>
                    </div>
                  </div>
                  <ul className="space-y-1.5 border-t border-border pt-3">
                    {plan.highlights.slice(0, 3).map((feat) => (
                      <li key={feat} className="flex items-center gap-1.5 text-[10px] text-foreground">
                        <Check className="w-3 h-3 text-primary flex-shrink-0" />
                        <span className="truncate">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-4">
                  <div
                    className={cn(
                      'w-full py-1.5 rounded-lg text-center text-[10px] font-bold transition',
                      requestedPlan === plan.id
                        ? 'bg-primary text-white'
                        : 'bg-surface-muted text-foreground',
                    )}
                  >
                    {requestedPlan === plan.id ? 'Sélectionné' : 'Choisir ce forfait'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface/60 border border-border rounded-3xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Demande d&apos;activation
            </h3>

            {error && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 bg-surface-muted/60 border border-border rounded-xl space-y-1">
                <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">Forfait sélectionné</span>
                <span className="text-sm font-extrabold text-primary">
                  {selectedPlan
                    ? `${selectedPlan.name} — ${selectedPlan.price} / mois`
                    : getPlanDisplayPrice(LANDING_PLANS[1], 'monthly')}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider">
                  Référence de paiement / Message
                </label>
                <textarea
                  value={proofOfPayment}
                  onChange={(e) => setProofOfPayment(e.target.value)}
                  placeholder="Saisissez la référence de votre virement, transaction mobile money, ou un message pour le Super Admin..."
                  rows={4}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary focus:bg-surface-muted/80 transition resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting || hasPendingRequest}
                className="w-full py-3 bg-primary hover:bg-primary-hover disabled:bg-surface-muted disabled:text-muted disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition shadow-lg shadow-primary/10 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : hasPendingRequest ? (
                  <>
                    <Clock className="w-4 h-4" />
                    Demande en attente de validation
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Soumettre ma demande d&apos;activation
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="bg-surface/40 border border-border rounded-3xl p-6">
            <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" />
              Historique des demandes ({requests.length})
            </h4>

            {loadingRequests ? (
              <div className="py-6 flex justify-center">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : requests.length === 0 ? (
              <p className="text-center py-4 text-xs text-muted">Aucune demande soumise pour le moment.</p>
            ) : (
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {requests.map((req) => (
                  <div key={req.id} className="bg-surface-muted/60 border border-border rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        {LANDING_PLANS.find((p) => p.id === req.requestedPlan)?.ms365Name || req.requestedPlan}
                      </span>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        req.status === 'APPROVED' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                        req.status === 'REJECTED' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' :
                        'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                      }`}>
                        {req.status === 'APPROVED' ? 'Approuvée' :
                         req.status === 'REJECTED' ? 'Rejetée' : 'En attente'}
                      </span>
                    </div>
                    {req.proofOfPayment && (
                      <p className="text-[10px] text-muted italic truncate" title={req.proofOfPayment}>
                        &quot;{req.proofOfPayment}&quot;
                      </p>
                    )}
                    <div className="text-[9px] text-muted">
                      Soumise le {new Date(req.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-background border-t border-border py-6 text-center text-[10px] text-muted">
        <p>© {new Date().getFullYear()} EventMaster SaaS. Isolation stricte garantie. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
