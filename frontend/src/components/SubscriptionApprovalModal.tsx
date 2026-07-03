'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Percent, UserCheck, Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { LANDING_PLANS } from '@/config/landingPricing';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

export interface SubscriptionApprovalRequest {
  id: string;
  requestedPlan: string;
  durationDays: number;
  tenant?: {
    name?: string;
    plan?: string;
    licenseActive?: boolean;
    licenseExpiresAt?: string | null;
    referredByCommercial?: { id: string; name: string | null; email: string } | null;
    referredByOrgUser?: { id: string; name: string | null; email: string; orgRole?: string | null } | null;
  };
}

export interface SubscriptionApprovalResult {
  message: string;
  billingAction?: string;
  tenant?: { previousPlan?: string; plan?: string };
}

interface SubscriptionApprovalModalProps {
  request: SubscriptionApprovalRequest | null;
  onClose: () => void;
  onConfirm: (
    requestId: string,
    params: { discountPercent: number; approvedAmount?: number },
  ) => Promise<SubscriptionApprovalResult>;
  catalogPrices?: Record<string, number>;
  promoByPlan?: Record<string, { price: number; label?: string }>;
}

function getPlanPriceFc(planId: string, catalogPrices?: Record<string, number>): number {
  if (catalogPrices?.[planId] != null) return catalogPrices[planId];
  return LANDING_PLANS.find((p) => p.id === planId)?.monthlyPriceFc ?? 0;
}

function formatExpiry(iso?: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function SubscriptionApprovalModal({
  request,
  onClose,
  onConfirm,
  catalogPrices,
  promoByPlan,
}: SubscriptionApprovalModalProps) {
  const [discountMode, setDiscountMode] = useState<'percent' | 'amount'>('percent');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const baseAmount = useMemo(
    () => (request ? getPlanPriceFc(request.requestedPlan, catalogPrices) : 0),
    [request, catalogPrices],
  );

  const activePromo = request ? promoByPlan?.[request.requestedPlan] : undefined;
  const currentPlan = request?.tenant?.plan;
  const isPlanChange = currentPlan && currentPlan !== 'FREE' && currentPlan !== request?.requestedPlan;

  useEffect(() => {
    if (!request) return;
    setFeedback(null);
    setSubmitting(false);
    if (activePromo?.price != null) {
      setDiscountMode('amount');
      setApprovedAmount(String(activePromo.price));
      setDiscountPercent('0');
    } else {
      setDiscountMode('percent');
      setDiscountPercent('0');
      setApprovedAmount('');
    }
  }, [request?.id, activePromo?.price]);

  const pricing = useMemo(() => {
    if (!request) return { discountAmount: 0, finalAmount: 0, discountPercent: 0 };
    if (discountMode === 'amount' && approvedAmount !== '') {
      const final = Math.max(0, Math.round(parseFloat(approvedAmount) || 0));
      const discountAmount = Math.max(0, baseAmount - final);
      const pct = baseAmount > 0 ? Math.round((discountAmount / baseAmount) * 1000) / 10 : 0;
      return { discountAmount, finalAmount: final, discountPercent: pct };
    }
    const pct = Math.min(100, Math.max(0, parseFloat(discountPercent) || 0));
    const discountAmount = Math.round(baseAmount * (pct / 100));
    return { discountAmount, finalAmount: Math.max(0, baseAmount - discountAmount), discountPercent: pct };
  }, [request, baseAmount, discountMode, discountPercent, approvedAmount]);

  const commercials = useMemo(() => {
    if (!request?.tenant) return [];
    const list: Array<{ name: string; email: string; kind: string }> = [];
    if (request.tenant.referredByCommercial) {
      list.push({
        name: request.tenant.referredByCommercial.name || 'Commercial plateforme',
        email: request.tenant.referredByCommercial.email,
        kind: 'Plateforme',
      });
    }
    if (request.tenant.referredByOrgUser?.orgRole === 'COMMERCIAL') {
      list.push({
        name: request.tenant.referredByOrgUser.name || 'Commercial organisation',
        email: request.tenant.referredByOrgUser.email,
        kind: 'Organisation',
      });
    }
    return list;
  }, [request]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request?.id) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const result = await onConfirm(request.id, {
        discountPercent: pricing.discountPercent,
        approvedAmount: discountMode === 'amount' ? pricing.finalAmount : undefined,
      });
      setFeedback({ type: 'success', message: result.message || 'Demande approuvée avec succès.' });
      window.setTimeout(() => {
        onClose();
        setFeedback(null);
      }, 1800);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de l\'approbation de la demande.';
      setFeedback({ type: 'error', message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={Boolean(request)}
      onClose={onClose}
      title="Approuver l'abonnement"
      size="sm"
      dismissible={!submitting}
      containerClassName="z-[10000]"
    >
      {request && (
        <form onSubmit={handleSubmit} className="space-y-5 -mt-2">
          {feedback && (
            <div
              className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <p className="font-medium leading-snug">{feedback.message}</p>
            </div>
          )}

          <div className="text-sm space-y-2">
            <p className="font-bold text-slate-900 dark:text-white">{request.tenant?.name || 'Organisation'}</p>

            {currentPlan && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500">Forfait actuel :</span>
                <span className="font-bold px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700">
                  {currentPlan}
                </span>
                {isPlanChange && (
                  <>
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="font-bold px-2 py-0.5 rounded border border-indigo-200 bg-indigo-50 text-indigo-700">
                      {request.requestedPlan}
                    </span>
                  </>
                )}
              </div>
            )}

            {request.tenant?.licenseActive && request.tenant.licenseExpiresAt && (
              <p className="text-xs text-slate-500">
                Licence actuelle expire le{' '}
                <span className="font-semibold">{formatExpiry(request.tenant.licenseExpiresAt)}</span>
                {isPlanChange && ' — une nouvelle période sera appliquée au nouveau forfait.'}
              </p>
            )}

            <p className="text-slate-500">
              Forfait demandé :{' '}
              <span className="font-semibold text-indigo-600">{request.requestedPlan}</span> ·{' '}
              {request.durationDays} jours
            </p>
            <p className="text-slate-600">
              Prix catalogue :{' '}
              <span className="font-bold">{baseAmount.toLocaleString('fr-FR')} FC</span>
            </p>
            {activePromo && (
              <p className="text-amber-700 dark:text-amber-400 text-xs font-semibold">
                Promotion « {activePromo.label || 'active'} » : {activePromo.price.toLocaleString('fr-FR')} FC pré-rempli
              </p>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5" />
              Réduction spéciale (optionnelle)
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDiscountMode('percent')}
                disabled={submitting || feedback?.type === 'success'}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
                  discountMode === 'percent'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Pourcentage
              </button>
              <button
                type="button"
                onClick={() => setDiscountMode('amount')}
                disabled={submitting || feedback?.type === 'success'}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
                  discountMode === 'amount'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Montant final
              </button>
            </div>

            {discountMode === 'percent' ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  disabled={submitting || feedback?.type === 'success'}
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-slate-50 dark:bg-slate-950"
                />
                <span className="text-sm font-semibold text-slate-500">%</span>
              </div>
            ) : (
              <input
                type="number"
                min={0}
                step={1000}
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
                disabled={submitting || feedback?.type === 'success'}
                placeholder={`Ex: ${baseAmount}`}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-slate-50 dark:bg-slate-950"
              />
            )}

            <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3 text-xs space-y-1">
              {pricing.discountAmount > 0 && (
                <p className="text-emerald-600 font-semibold">
                  Réduction : − {pricing.discountAmount.toLocaleString('fr-FR')} FC ({pricing.discountPercent} %)
                </p>
              )}
              <p className="text-slate-700 dark:text-slate-300">
                Montant facturé :{' '}
                <span className="font-bold text-indigo-600">{pricing.finalAmount.toLocaleString('fr-FR')} FC</span>
              </p>
            </div>
          </div>

          {commercials.length > 0 ? (
            <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                Commerciaux liés — seront informés par e-mail
              </p>
              <ul className="text-xs text-indigo-600 dark:text-indigo-400 space-y-1">
                {commercials.map((c) => (
                  <li key={c.email}>
                    {c.name} ({c.kind}) — {c.email}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Aucun commercial rattaché à cette organisation.</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
              className="flex-1"
            >
              {feedback?.type === 'success' ? 'Fermer' : 'Annuler'}
            </Button>
            <Button
              type="submit"
              disabled={submitting || feedback?.type === 'success'}
              loading={submitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {isPlanChange ? 'Changer le forfait' : 'Approuver & facturer'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
