'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { api } from '@/lib/api';
import type { FlexPayMobileOperatorId } from '@/lib/flexPayOperators';
import type { BillingCycle, PlanId } from '@/config/landingPricing';
import { durationDaysForPlan } from '@/config/landingPricing';
import PaymentPendingView from '@/components/PaymentPendingView';
import PaymentAccountPicker from '@/components/PaymentAccountPicker';

export type FlexPayMethod = 'mobile' | 'card';

type CheckoutStep = 'form' | 'waiting' | 'success';

export default function SubscriptionFlexPayModal({
  open,
  onClose,
  planId,
  planName,
  priceLabel,
  billingCycle = 'monthly',
  isRenew = false,
  retryRequestId = null,
  startPending = false,
  initialMethod = 'mobile',
  onPaid,
}: {
  open: boolean;
  onClose: () => void;
  planId?: PlanId | null;
  planName: string;
  priceLabel: string;
  billingCycle?: BillingCycle;
  isRenew?: boolean;
  retryRequestId?: string | null;
  startPending?: boolean;
  initialMethod?: FlexPayMethod;
  onPaid?: () => Promise<void> | void;
}) {
  const [step, setStep] = useState<CheckoutStep>('form');
  const [paymentMethod, setPaymentMethod] = useState<FlexPayMethod>(initialMethod);
  const [operator, setOperator] = useState<FlexPayMobileOperatorId>('orange');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState<string | null>(retryRequestId);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setPaymentMethod(initialMethod);
    setRequestId(retryRequestId);
    if (startPending && retryRequestId) {
      setStep('waiting');
    } else {
      setStep('form');
    }
  }, [open, initialMethod, retryRequestId, startPending]);

  const finishPaid = useCallback(
    async (message?: string) => {
      setSuccessMessage(message || 'Paiement confirmé. Forfait activé.');
      setStep('success');
      await onPaid?.();
      setTimeout(() => {
        onClose();
        setStep('form');
      }, 1800);
    },
    [onClose, onPaid],
  );

  const pollRequest = useCallback(async () => {
    const id = requestId || retryRequestId;
    if (!id) {
      return { status: 'error' as const, message: 'Demande manquante.' };
    }
    const data = await api.get(`/subscriptions/requests/${id}/verify`);
    if (data.paid) {
      return { status: 'paid' as const, message: data.message };
    }
    if (data.status === 'failed') {
      return {
        status: 'failed' as const,
        message: data.message || 'Paiement non confirmé. Vous pouvez relancer.',
      };
    }
    return {
      status: 'pending' as const,
      message: data.message || 'Paiement encore en cours…',
    };
  }, [requestId, retryRequestId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const cleanPhone = phone.trim().replace(/\s+/g, '').replace(/^\+/, '');
    if (paymentMethod === 'mobile' && !cleanPhone) {
      setError('Saisissez votre numéro Mobile Money (ex. 24389XXXXXXX).');
      return;
    }

    setLoading(true);
    try {
      const retryId = retryRequestId;
      const data = retryId
        ? await api.post(`/subscriptions/requests/${retryId}/retry-payment`, {
            paymentMethod,
            ...(paymentMethod === 'mobile' ? { phone: cleanPhone, operator } : {}),
          })
        : await api.post('/subscriptions/checkout', {
            requestedPlan: planId,
            durationDays: planId ? durationDaysForPlan(planId, billingCycle) : undefined,
            paymentMethod,
            ...(paymentMethod === 'mobile' ? { phone: cleanPhone, operator } : {}),
          });

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      if (data.paid) {
        await finishPaid(
          data.message ||
            (isRenew ? `Renouvellement ${planName} activé.` : `Forfait ${planName} activé.`),
        );
        return;
      }
      if (data.requestId) {
        setRequestId(data.requestId);
      }
      if (paymentMethod === 'mobile') {
        setStep('waiting');
        return;
      }
      setError(data.message || 'Paiement initié. Vérifiez le statut dans un instant.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de lancer le paiement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={retryRequestId ? 'Reprendre le paiement' : isRenew ? 'Renouveler le forfait' : 'Payer l’abonnement'}
      description={`${planName}${priceLabel ? ` · ${priceLabel}` : ''} · FlexPay (CDF)`}
    >
      {step === 'success' && (
        <div className="py-8 text-center space-y-3 animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-foreground">Paiement validé</h4>
          <p className="text-xs text-muted">{successMessage}</p>
        </div>
      )}

      {step === 'waiting' && (
        <PaymentPendingView
          method={paymentMethod}
          title="Paiement FlexPay en cours"
          description={
            paymentMethod === 'mobile'
              ? `Confirmez ${priceLabel} sur votre téléphone (USSD / app). Cette fenêtre se met à jour automatiquement.`
              : 'Nous confirmons votre paiement carte. Cette fenêtre se met à jour automatiquement.'
          }
          onPoll={pollRequest}
          onRetry={() => setStep('form')}
          retryLabel="Changer de moyen de paiement"
          onPaid={() => {
            void finishPaid();
          }}
        />
      )}

      {step === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{planName}</p>
              <p className="text-[11px] text-muted">
                {isRenew ? 'Renouvellement' : retryRequestId ? 'Nouvelle tentative' : 'Activation du forfait'}
              </p>
            </div>
            {priceLabel ? (
              <div className="text-right shrink-0">
                <span className="text-sm font-black text-primary block">{priceLabel}</span>
                <span className="text-[10px] text-muted">TTC (CDF)</span>
              </div>
            ) : null}
          </div>

          <PaymentAccountPicker
            method={paymentMethod}
            onMethodChange={setPaymentMethod}
            operator={operator}
            onOperatorChange={setOperator}
            phone={phone}
            onPhoneChange={setPhone}
            amountFc={parseInt(priceLabel.replace(/\D/g, ''), 10) || undefined}
            amountHint="Montant du forfait prélevé"
          />

          {error ? (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="pt-2 border-t border-border space-y-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              loading={loading}
              leftIcon={
                loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : paymentMethod === 'card' ? (
                  <CreditCard className="w-4 h-4" />
                ) : (
                  <Smartphone className="w-4 h-4" />
                )
              }
              className="font-bold shadow-sm shadow-primary/30"
            >
              {paymentMethod === 'card'
                ? `Payer ${priceLabel || 'par carte'}`
                : `Payer ${priceLabel || 'par Mobile Money'}`}
            </Button>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted text-center pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Paiement réel FlexPay · Orange, M-Pesa, Airtel, Visa / Mastercard</span>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
