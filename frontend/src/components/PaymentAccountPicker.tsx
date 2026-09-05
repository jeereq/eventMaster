'use client';

import React, { useEffect, useRef } from 'react';
import { CreditCard, Smartphone } from 'lucide-react';
import { Input } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import {
  FLEXPAY_MOBILE_ACCOUNTS,
  FLEXPAY_MOBILE_OPERATORS_LABEL,
  suggestMobileOperator,
  type FlexPayMobileOperatorId,
} from '@/lib/flexPayOperators';

export type PaymentAccountMethod = 'mobile' | 'card';

export default function PaymentAccountPicker({
  method,
  onMethodChange,
  operator,
  onOperatorChange,
  phone,
  onPhoneChange,
  amountFc,
  amountHint,
}: {
  method: PaymentAccountMethod;
  onMethodChange: (method: PaymentAccountMethod) => void;
  operator: FlexPayMobileOperatorId;
  onOperatorChange: (operator: FlexPayMobileOperatorId) => void;
  phone: string;
  onPhoneChange: (phone: string) => void;
  amountFc?: number;
  amountHint?: string;
}) {
  const userPickedOperator = useRef(false);
  const suggested = suggestMobileOperator(phone);

  useEffect(() => {
    if (userPickedOperator.current || !suggested || suggested === operator) return;
    onOperatorChange(suggested);
  }, [suggested, operator, onOperatorChange]);

  return (
    <div className="space-y-3">
      {typeof amountFc === 'number' && amountFc > 0 ? (
        <div className="p-3 rounded-xl bg-surface-muted border border-border flex items-center justify-between gap-3">
          <p className="text-xs text-muted">{amountHint || 'Montant prélevé'}</p>
          <p className="text-sm font-black text-foreground tabular-nums">{formatFc(amountFc)}</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-bold text-foreground">Compte de paiement</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Compte de paiement">
          <button
            type="button"
            role="radio"
            aria-checked={method === 'mobile'}
            onClick={() => onMethodChange('mobile')}
            className={`min-h-11 p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              method === 'mobile'
                ? 'border-primary bg-primary/10 text-primary shadow-xs'
                : 'border-border bg-surface text-muted hover:text-foreground'
            }`}
          >
            <Smartphone className="w-4 h-4" aria-hidden />
            Mobile Money
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={method === 'card'}
            onClick={() => onMethodChange('card')}
            className={`min-h-11 p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              method === 'card'
                ? 'border-primary bg-primary/10 text-primary shadow-xs'
                : 'border-border bg-surface text-muted hover:text-foreground'
            }`}
          >
            <CreditCard className="w-4 h-4" aria-hidden />
            Visa / Mastercard
          </button>
        </div>
      </div>

      {method === 'mobile' ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-foreground">Compte Mobile Money disponible</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Opérateur Mobile Money">
              {FLEXPAY_MOBILE_ACCOUNTS.map((account) => {
                const selected = operator === account.id;
                const available = !suggested || suggested === account.id;
                return (
                  <button
                    key={account.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      userPickedOperator.current = true;
                      onOperatorChange(account.id);
                    }}
                    className={`min-h-11 px-3 rounded-lg text-xs font-bold border transition cursor-pointer touch-manipulation ${
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : available
                          ? 'border-border bg-surface text-muted hover:text-foreground'
                          : 'border-border bg-surface-muted text-muted/70'
                    }`}
                  >
                    {account.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted">
              {suggested
                ? `Compte détecté pour ce numéro : ${FLEXPAY_MOBILE_ACCOUNTS.find((item) => item.id === suggested)?.label}.`
                : `Choisissez le compte disponible sur votre ligne (${FLEXPAY_MOBILE_OPERATORS_LABEL}).`}
            </p>
          </div>
          <Input
            label="Numéro Mobile Money"
            required
            type="tel"
            value={phone}
            onChange={(event) => onPhoneChange(event.target.value)}
            placeholder="Ex. 24389XXXXXXX ou 089XXXXXXX"
            leftIcon={<Smartphone className="w-4 h-4" />}
            hint="Le montant ci-dessus est prélevé en francs congolais (CDF)."
          />
        </div>
      ) : (
        <p className="text-xs text-muted leading-relaxed">
          Vous serez redirigé vers FlexPay. Le montant débité est en francs congolais (CDF).
        </p>
      )}
    </div>
  );
}
