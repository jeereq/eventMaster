'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { X, Percent, UserCheck, Loader2 } from 'lucide-react';
import { LANDING_PLANS } from '@/config/landingPricing';

export interface SubscriptionApprovalRequest {
  id: string;
  requestedPlan: string;
  durationDays: number;
  tenant?: {
    name?: string;
    referredByCommercial?: { id: string; name: string | null; email: string } | null;
    referredByOrgUser?: { id: string; name: string | null; email: string; orgRole?: string | null } | null;
  };
}

interface SubscriptionApprovalModalProps {
  request: SubscriptionApprovalRequest | null;
  onClose: () => void;
  onConfirm: (params: { discountPercent: number; approvedAmount?: number }) => Promise<void>;
  catalogPrices?: Record<string, number>;
  promoByPlan?: Record<string, { price: number; label?: string }>;
}

function getPlanPriceFc(planId: string, catalogPrices?: Record<string, number>): number {
  if (catalogPrices?.[planId] != null) return catalogPrices[planId];
  return LANDING_PLANS.find((p) => p.id === planId)?.monthlyPriceFc ?? 0;
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

  const baseAmount = useMemo(
    () => (request ? getPlanPriceFc(request.requestedPlan, catalogPrices) : 0),
    [request, catalogPrices],
  );

  const activePromo = request ? promoByPlan?.[request.requestedPlan] : undefined;

  useEffect(() => {
    if (!request) return;
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

  if (!request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConfirm({
        discountPercent: pricing.discountPercent,
        approvedAmount: discountMode === 'amount' ? pricing.finalAmount : undefined,
      });
      onClose();
    } catch {
      // L'erreur est affichée par handleApproveSubscription (alert)
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Approuver l&apos;abonnement</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="text-sm space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">{request.tenant?.name || 'Organisation'}</p>
            <p className="text-slate-500">
              Forfait <span className="font-semibold text-indigo-600">{request.requestedPlan}</span> ·{' '}
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
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Approuver & facturer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
