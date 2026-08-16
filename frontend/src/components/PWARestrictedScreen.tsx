'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  ShieldAlert, Send, Clock, CheckCircle2, XCircle, 
  Loader2, CreditCard, Sparkles, Check, LogOut, ArrowRight, RefreshCw
} from 'lucide-react';

export default function PWARestrictedScreen() {
  const { tenant, logout, refreshProfile } = useAuth();
  const [requestedPlan, setRequestedPlan] = useState<'STANDARD' | 'PREMIUM' | 'ENTERPRISE'>('PREMIUM');
  const [proofOfPayment, setProofOfPayment] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [dynamicPlans, setDynamicPlans] = useState<any>(null);
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
        api.get('/subscriptions/plans').catch(() => null)
      ]);
      setRequests(requestsData);
      if (plansData) {
        setDynamicPlans(plansData);
      }
    } catch (err) {
      console.error('Error loading subscription requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadMyRequests();
  }, []);

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    setError('');
    setSuccess('');
    try {
      await refreshProfile();
      await loadMyRequests();
      setSuccess('Statut rafraîchi avec succès depuis le serveur !');
    } catch (err: any) {
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

  const plans = [
    {
      id: 'STANDARD',
      name: dynamicPlans?.STANDARD?.name || 'Plan Standard',
      price: dynamicPlans?.STANDARD?.price || '49 $',
      features: [
        `Jusqu'à ${dynamicPlans?.STANDARD?.maxEvents ?? 8} événements`,
        `Jusqu'à ${dynamicPlans?.STANDARD?.maxGuests ?? 150} invités`,
        `${dynamicPlans?.STANDARD?.maxTemplates ?? 5} modèles d'invitations`,
        'Support standard'
      ],
    },
    {
      id: 'PREMIUM',
      name: dynamicPlans?.PREMIUM?.name || 'Plan Premium',
      price: dynamicPlans?.PREMIUM?.price || '99 $',
      features: [
        `Jusqu'à ${dynamicPlans?.PREMIUM?.maxEvents ?? 20} événements`,
        `Jusqu'à ${dynamicPlans?.PREMIUM?.maxGuests ?? 500} invités`,
        `${dynamicPlans?.PREMIUM?.maxTemplates ?? 10} modèles d'invitations`,
        (dynamicPlans?.PREMIUM?.customTemplates ?? true) ? 'Modèles personnalisés' : 'Modèles standards',
        'Support prioritaire'
      ],
      popular: true,
    },
    {
      id: 'ENTERPRISE',
      name: dynamicPlans?.ENTERPRISE?.name || 'Plan Enterprise',
      price: dynamicPlans?.ENTERPRISE?.price || '249 $',
      features: [
        (dynamicPlans?.ENTERPRISE?.maxEvents ?? 9999) >= 9999 ? 'Événements illimités' : `Jusqu'à ${dynamicPlans?.ENTERPRISE?.maxEvents} événements`,
        (dynamicPlans?.ENTERPRISE?.maxGuests ?? 99999) >= 9999 ? 'Invités illimités' : `Jusqu'à ${dynamicPlans?.ENTERPRISE?.maxGuests} invités`,
        (dynamicPlans?.ENTERPRISE?.maxTemplates ?? 9999) >= 9999 ? 'Modèles illimités' : `${dynamicPlans?.ENTERPRISE?.maxTemplates} modèles d'invitations`,
        'Modèles personnalisés',
        'Support dédié 24/7'
      ],
    },
  ];

  const hasPendingRequest = requests.some(r => r.status === 'PENDING');

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between font-sans antialiased relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-md px-6 py-4 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-xl text-white">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-foreground block">EventMaster</span>
            <span className="text-[10px] text-muted font-semibold uppercase tracking-wider">Accès Restreint</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshStatus}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-primary hover:bg-primary/10 transition border border-primary/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Rafraîchissement...' : 'Rafraîchrir mon statut'}
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition border border-rose-500/20"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-12 grid lg:grid-cols-5 gap-8 items-start relative z-10">
        {/* Left Column: Warning & Plans (3 cols) */}
        <div className="lg:col-span-3 space-y-8">
          <div className="bg-surface/40 border border-border rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
              <ShieldAlert className="w-4 h-4" />
              <span>Abonnement Expiré ou Licence Inactive</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-tight">
              Votre espace {tenant?.name ? `"${tenant.name}"` : ''} requiert une activation.
            </h1>
            <p className="text-sm text-muted leading-relaxed">
              Pour continuer à utiliser la plateforme EventMaster, organiser vos événements, gérer vos invités et concevoir vos invitations, vous devez souscrire à un abonnement mensuel de 30 jours. Sélectionnez le forfait de votre choix ci-dessous et soumettez votre demande d'activation.
            </p>
          </div>

          {/* Plans Grid */}
          <div className="grid sm:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => setRequestedPlan(plan.id as any)}
                className={`border rounded-2xl p-5 cursor-pointer transition relative flex flex-col justify-between h-full ${
                  requestedPlan === plan.id
                    ? 'bg-primary/10 border-primary ring-2 ring-primary/30'
                    : 'bg-surface/20 border-border hover:border-border'
                }`}
              >
                {plan.popular && (
                  <span className="absolute top-0 right-4 transform -translate-y-1/2 bg-primary text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Populaire
                  </span>
                )}
                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-black text-foreground">{plan.price}</span>
                      <span className="text-[10px] text-muted">/30j</span>
                    </div>
                  </div>
                  <ul className="space-y-1.5 border-t border-border pt-3">
                    {plan.features.slice(0, 3).map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-1.5 text-[10px] text-foreground">
                        <Check className="w-3 h-3 text-primary flex-shrink-0" />
                        <span className="truncate">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-4">
                  <div className={`w-full py-1.5 rounded-lg text-center text-[10px] font-bold transition ${
                    requestedPlan === plan.id
                      ? 'bg-primary text-white'
                      : 'bg-surface-muted text-foreground hover:bg-surface-muted'
                  }`}>
                    {requestedPlan === plan.id ? 'Sélectionné' : 'Choisir ce plan'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Request Form & History (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Form */}
          <div className="bg-surface/60 border border-border rounded-3xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Demande d'activation
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
                <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">Plan Sélectionné</span>
                <span className="text-sm font-extrabold text-primary">
                  {requestedPlan === 'STANDARD' ? 'Plan Standard (49 $ / 30 jours)' : 
                   requestedPlan === 'PREMIUM' ? 'Plan Premium (99 $ / 30 jours)' : 
                   'Plan Enterprise (249 $ / 30 jours)'}
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
                    Soumettre ma demande d'activation
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Request History */}
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
                      <span className="text-xs font-bold text-foreground">Plan {req.requestedPlan}</span>
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
                        "{req.proofOfPayment}"
                      </p>
                    )}
                    <div className="text-[9px] text-muted">
                      Soumise le {new Date(req.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-6 text-center text-[10px] text-muted">
        <p>© 2026 EventMaster SaaS. Isolation stricte garantie. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
