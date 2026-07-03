'use client';

import React, { useMemo, useState } from 'react';
import { Percent } from 'lucide-react';
import { LANDING_PLANS, type PlanId } from '@/config/landingPricing';

interface BillingDiscountFieldsProps {
  planId: string;
  discountMode: 'percent' | 'amount';
  onDiscountModeChange: (mode: 'percent' | 'amount') => void;
  discountPercent: string;
  onDiscountPercentChange: (value: string) => void;
  approvedAmount: string;
  onApprovedAmountChange: (value: string) => void;
  compact?: boolean;
}

function getPlanPriceFc(planId: string): number {
  return LANDING_PLANS.find((p) => p.id === planId)?.monthlyPriceFc ?? 0;
}

export default function BillingDiscountFields({
  planId,
  discountMode,
  onDiscountModeChange,
  discountPercent,
  onDiscountPercentChange,
  approvedAmount,
  onApprovedAmountChange,
  compact = false,
}: BillingDiscountFieldsProps) {
  const baseAmount = useMemo(() => getPlanPriceFc(planId), [planId]);

  const pricing = useMemo(() => {
    if (planId === 'FREE' || baseAmount <= 0) {
      return { discountAmount: 0, finalAmount: 0, discountPercent: 0 };
    }
    if (discountMode === 'amount' && approvedAmount !== '') {
      const final = Math.max(0, Math.round(parseFloat(approvedAmount) || 0));
      const discountAmount = Math.max(0, baseAmount - final);
      const pct = baseAmount > 0 ? Math.round((discountAmount / baseAmount) * 1000) / 10 : 0;
      return { discountAmount, finalAmount: final, discountPercent: pct };
    }
    const pct = Math.min(100, Math.max(0, parseFloat(discountPercent) || 0));
    const discountAmount = Math.round(baseAmount * (pct / 100));
    return { discountAmount, finalAmount: Math.max(0, baseAmount - discountAmount), discountPercent: pct };
  }, [planId, baseAmount, discountMode, discountPercent, approvedAmount]);

  if (planId === 'FREE' || baseAmount <= 0) return null;

  return (
    <div className={`space-y-3 ${compact ? '' : 'pt-1'}`}>
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
        <Percent className="w-3.5 h-3.5" />
        Réduction spéciale
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onDiscountModeChange('percent')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
            discountMode === 'percent'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'border-slate-200 dark:border-slate-700 text-slate-600'
          }`}
        >
          %
        </button>
        <button
          type="button"
          onClick={() => onDiscountModeChange('amount')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
            discountMode === 'amount'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'border-slate-200 dark:border-slate-700 text-slate-600'
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
            onChange={(e) => onDiscountPercentChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50"
          />
          <span className="text-sm font-semibold text-slate-500">%</span>
        </div>
      ) : (
        <input
          type="number"
          min={0}
          step={1000}
          value={approvedAmount}
          onChange={(e) => onApprovedAmountChange(e.target.value)}
          placeholder={`Ex: ${baseAmount}`}
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50"
        />
      )}
      <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1">
        <p className="text-slate-600">
          Catalogue : <span className="font-bold">{baseAmount.toLocaleString('fr-FR')} FC</span>
        </p>
        {pricing.discountAmount > 0 && (
          <p className="text-emerald-600 font-semibold">
            − {pricing.discountAmount.toLocaleString('fr-FR')} FC ({pricing.discountPercent} %)
          </p>
        )}
        <p className="text-slate-800">
          Facturé : <span className="font-bold text-indigo-600">{pricing.finalAmount.toLocaleString('fr-FR')} FC</span>
        </p>
      </div>
    </div>
  );
}

export function getBillingPricingFromFields(
  planId: PlanId | string,
  discountMode: 'percent' | 'amount',
  discountPercent: string,
  approvedAmount: string,
) {
  const baseAmount = getPlanPriceFc(planId);
  if (discountMode === 'amount' && approvedAmount !== '') {
    const final = Math.max(0, Math.round(parseFloat(approvedAmount) || 0));
    const discountAmount = Math.max(0, baseAmount - final);
    const pct = baseAmount > 0 ? Math.round((discountAmount / baseAmount) * 1000) / 10 : 0;
    return { discountPercent: pct, approvedAmount: final, baseAmount };
  }
  const pct = Math.min(100, Math.max(0, parseFloat(discountPercent) || 0));
  return { discountPercent: pct, approvedAmount: undefined, baseAmount };
}
