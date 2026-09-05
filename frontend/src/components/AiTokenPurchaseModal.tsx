'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Coins,
  Smartphone,
  CreditCard,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { Modal, Button, Input, Alert } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import {
  aiTokenAmountPresets,
  aiTokenCostLegend,
  calculateTokensForAmount,
  calculateNextTokenAmount,
  addPurchasedAiTokens,
  getOrCreateDeviceId,
  resolveAiTokenPricing,
  syncDeviceAiTokensWithBackend,
} from '@/lib/aiTokens';
import { api } from '@/lib/api';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import PaymentAccountPicker from '@/components/PaymentAccountPicker';
import type { FlexPayMobileOperatorId } from '@/lib/flexPayOperators';

interface AiTokenPurchaseModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (addedTokens: number) => void;
}

type CheckoutStep = 'form' | 'waiting_mobile' | 'success';

const POLL_MAX = 30;

export default function AiTokenPurchaseModal({
  open,
  onClose,
  onSuccess,
}: AiTokenPurchaseModalProps) {
  const { site } = usePlatformSite();
  const pricing = resolveAiTokenPricing(site);
  const presets = aiTokenAmountPresets(pricing);
  const [step, setStep] = useState<CheckoutStep>('form');
  const [paymentMethod, setPaymentMethod] = useState<'mobile' | 'card'>('mobile');
  const [operator, setOperator] = useState<FlexPayMobileOperatorId>('orange');
  const [phone, setPhone] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [checkoutAmountFc, setCheckoutAmountFc] = useState(0);
  const [checkoutTokens, setCheckoutTokens] = useState(0);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const errorRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const parsedAmount = parseInt(amountInput.replace(/\s+/g, ''), 10);
  const isValidAmount = Number.isFinite(parsedAmount) && parsedAmount >= pricing.minAmountCdf;
  const previewTokens = isValidAmount ? calculateTokensForAmount(parsedAmount, pricing) : 0;
  const nextTokenAtFc = isValidAmount ? calculateNextTokenAmount(parsedAmount, pricing) : null;
  const showsLeftoverHint =
    isValidAmount && nextTokenAtFc !== null && parsedAmount < nextTokenAtFc;

  const clearTimer = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimer();
  }, []);

  useEffect(() => {
    if (open && step === 'form') {
      setAmountInput((current) => current || String(pricing.minAmountCdf));
    }
  }, [open, step]);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus();
    }
  }, [error]);

  const resetToForm = (keepError = false) => {
    clearTimer();
    setStep('form');
    setPollTimedOut(false);
    setVerifyError('');
    setPollCount(0);
    if (!keepError) setError('');
  };

  const handleSuccess = useCallback(
    (tokensCount = checkoutTokens, orderId?: string | null) => {
      const credited = Math.max(pricing.minCount, tokensCount);
      clearTimer();
      addPurchasedAiTokens(credited, orderId || activeOrderId);
      void syncDeviceAiTokensWithBackend(api);
      setCheckoutTokens(credited);
      setPollTimedOut(false);
      setVerifyError('');
      setStep('success');
      if (onSuccess) {
        onSuccess(credited);
      }
    },
    [activeOrderId, checkoutTokens, onSuccess, pricing.minCount],
  );

  const checkPaymentStatus = useCallback(
    async (orderId: string) => {
      if (!orderId) return;
      setVerifying(true);
      setVerifyError('');
      try {
        const res = (await api.get(`/public/ai-tokens/orders/${orderId}/verify`)) as {
          paid?: boolean;
          status?: string;
          tokensCount?: number;
        };

        if (res?.paid || res?.status === 'PAID') {
          handleSuccess(res.tokensCount || checkoutTokens, orderId);
        } else if (res?.status === 'FAILED') {
          clearTimer();
          setError(
            'Le paiement a échoué ou a été refusé par l’opérateur Mobile Money. Vérifiez votre solde puis réessayez.',
          );
          setStep('form');
          setPollTimedOut(false);
          setVerifyError('');
          setPollCount(0);
        }
      } catch {
        setVerifyError('Vérifiez votre connexion. La confirmation n’a pas pu aboutir — réessayez.');
      } finally {
        setVerifying(false);
      }
    },
    [handleSuccess, checkoutTokens],
  );

  const checkPaymentStatusRef = useRef(checkPaymentStatus);
  checkPaymentStatusRef.current = checkPaymentStatus;

  useEffect(() => {
    if (step !== 'waiting_mobile' || !activeOrderId || pollTimedOut) {
      return;
    }
    clearTimer();
    let count = 0;
    setPollCount(0);
    pollTimerRef.current = setInterval(async () => {
      count += 1;
      setPollCount(count);
      await checkPaymentStatusRef.current(activeOrderId);
      if (count >= POLL_MAX) {
        clearTimer();
        setPollTimedOut(true);
      }
    }, 3000);
    return () => clearTimer();
  }, [step, activeOrderId, pollTimedOut]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phone.trim().replace(/\s+/g, '').replace(/^\+/, '');
    if (paymentMethod === 'mobile' && !cleanPhone) {
      setError('Veuillez renseigner votre numéro Mobile Money (ex: 24389XXXXXXX).');
      return;
    }
    if (!isValidAmount) {
      setError(
        `Le montant minimum payable est de ${formatFc(pricing.minAmountCdf)} (soit ${pricing.minCount} jeton${pricing.minCount > 1 ? 's' : ''}).`,
      );
      return;
    }

    const amountFc = Math.round(parsedAmount);
    const tokensCount = calculateTokensForAmount(amountFc, pricing);
    setCheckoutAmountFc(amountFc);
    setCheckoutTokens(tokensCount);

    setLoading(true);
    try {
      const deviceId = getOrCreateDeviceId();
      const res = (await api.post('/public/ai-tokens/checkout', {
        paymentMethod,
        phone: cleanPhone || undefined,
        operator: paymentMethod === 'mobile' ? operator : undefined,
        amountFc,
        deviceId,
      })) as {
        success?: boolean;
        orderId?: string;
        orderNumber?: string;
        redirectUrl?: string | null;
        paymentMethod?: 'mobile' | 'card';
        status?: string;
        tokensCount?: number;
        amountFc?: number;
        message?: string;
      };

      if (!res?.success) {
        throw new Error(res?.message || 'Impossible d’initialiser le paiement.');
      }

      const credited = res.tokensCount && res.tokensCount > 0 ? res.tokensCount : tokensCount;
      if (typeof res.amountFc === 'number' && res.amountFc > 0) {
        setCheckoutAmountFc(res.amountFc);
      }
      setCheckoutTokens(credited);

      if (paymentMethod === 'card') {
        if (res.redirectUrl) {
          window.location.href = res.redirectUrl;
          return;
        }
        handleSuccess(credited, res.orderId);
        return;
      }

      if (res.orderId) {
        setActiveOrderId(res.orderId);
        setPollTimedOut(false);
        setVerifyError('');
        setStep('waiting_mobile');
      } else {
        handleSuccess(credited, res.orderId);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de lancer le paiement.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    clearTimer();
    setStep('form');
    setError('');
    setVerifyError('');
    setPollTimedOut(false);
    setActiveOrderId(null);
    setPollCount(0);
    onClose();
  };

  const restartPolling = () => {
    if (!activeOrderId) return;
    setVerifyError('');
    setPollTimedOut(false);
  };

  return (
    <Modal
      open={open}
      onClose={handleModalClose}
      title="Recharger des jetons IA"
      description={`${formatFc(pricing.minAmountCdf)} = ${pricing.minCount} jeton${pricing.minCount > 1 ? 's' : ''} · ${formatFc(pricing.priceCdf)} / jeton · montant libre au-dessus`}
      size="md"
    >
      {step === 'success' && (
        <div className="py-6 text-center space-y-4 animate-fade-in" role="status" aria-live="polite">
          <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-base font-bold text-foreground">Paiement validé</h4>
            <p className="text-sm text-muted">
              <strong className="text-foreground">
                +{checkoutTokens} jeton{checkoutTokens === 1 ? '' : 's'} IA
              </strong>{' '}
              crédités — budget, invitation ou plan de salle.
            </p>
          </div>
          <Button type="button" variant="primary" onClick={handleModalClose} fullWidth>
            Fermer
          </Button>
        </div>
      )}

      {step === 'waiting_mobile' && (
        <div className="py-6 text-center space-y-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20 motion-reduce:animate-none animate-pulse">
            <Smartphone className="w-7 h-7" />
          </div>

          <div className="space-y-1.5 max-w-xs mx-auto">
            <h4 className="text-sm font-bold text-foreground">Validation requise sur votre téléphone</h4>
            <p className="text-xs text-muted leading-relaxed">
              Une demande de <strong className="text-foreground">{formatFc(checkoutAmountFc)}</strong> (
              {checkoutTokens} jeton{checkoutTokens === 1 ? '' : 's'}) a été envoyée au{' '}
              <strong className="text-foreground">{phone}</strong>.
            </p>
            <p className="text-xs text-foreground font-medium">
              Saisissez votre code secret PIN Mobile Money pour approuver.
            </p>
          </div>

          {pollTimedOut ? (
            <Alert variant="warning" title="Délai dépassé" className="!p-3 text-left text-xs max-w-sm mx-auto">
              Le paiement peut encore aboutir chez l’opérateur. Vérifiez à nouveau, ou modifiez le numéro.
            </Alert>
          ) : (
            <div className="p-3 rounded-xl bg-surface-muted border border-border flex items-center justify-between text-xs max-w-xs mx-auto">
              <span className="flex items-center gap-1.5 text-muted">
                <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden />
                En attente du signal opérateur…
              </span>
              <span className="font-mono text-[10px] text-muted tabular-nums">
                {pollCount}/{POLL_MAX}
              </span>
            </div>
          )}

          {verifyError ? (
            <Alert variant="error" className="!p-3 text-left text-xs max-w-sm mx-auto">
              {verifyError}
            </Alert>
          ) : null}

          <div className="space-y-2 pt-2 border-t border-border max-w-xs mx-auto">
            <Button
              type="button"
              variant="primary"
              size="md"
              fullWidth
              loading={verifying}
              onClick={() => {
                if (pollTimedOut) {
                  restartPolling();
                } else if (activeOrderId) {
                  void checkPaymentStatus(activeOrderId);
                }
              }}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              {pollTimedOut ? 'Vérifier à nouveau' : 'J’ai validé sur mon mobile'}
            </Button>

            <button
              type="button"
              onClick={() => resetToForm()}
              className="min-h-11 w-full text-xs font-semibold text-muted hover:text-foreground inline-flex items-center justify-center gap-1.5 rounded-xl hover:bg-surface-muted transition cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden />
              Modifier le numéro ou le mode
            </button>
          </div>
        </div>
      )}

      {step === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/25 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs shrink-0">
                  <Coins className="w-4 h-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">Recharge proportionnelle</p>
                  <p className="text-[11px] text-muted">
                    {formatFc(pricing.minAmountCdf)} = {pricing.minCount} jeton{pricing.minCount > 1 ? 's' : ''} · {aiTokenCostLegend()}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0" aria-live="polite" aria-atomic="true">
                <span className="text-sm font-black text-primary block tabular-nums">
                  {isValidAmount ? `${previewTokens} jeton${previewTokens === 1 ? '' : 's'}` : '—'}
                </span>
                <span className="text-[10px] text-muted">crédités</span>
              </div>
            </div>

            {showsLeftoverHint && nextTokenAtFc ? (
              <p className="text-[11px] text-foreground/80 leading-relaxed" aria-live="polite">
                Ce montant crédite {previewTokens} jetons. Le prochain jeton s’obtient à{' '}
                <strong>{formatFc(nextTokenAtFc)}</strong>.
              </p>
            ) : null}

            <div className="space-y-2">
              <p id="token-amount-label" className="text-xs font-bold text-foreground">
                Montant à payer (FC)
              </p>
              <div
                className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                role="radiogroup"
                aria-labelledby="token-amount-label"
              >
                {presets.map((preset) => {
                  const selected = parsedAmount === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setAmountInput(String(preset));
                        setError('');
                      }}
                      className={`min-h-11 px-2 py-2 rounded-xl text-xs font-bold border transition cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                        selected
                          ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                          : 'border-border bg-surface text-muted hover:text-foreground hover:border-primary/40'
                      }`}
                    >
                      {formatFc(preset)}
                    </button>
                  );
                })}
              </div>
              <Input
                label="Montant libre"
                type="number"
                min={pricing.minAmountCdf}
                step={100}
                inputMode="numeric"
                autoComplete="off"
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value);
                  setError('');
                }}
                hint={`Minimum ${formatFc(pricing.minAmountCdf)}. ${formatFc(pricing.priceCdf)} par jeton.`}
                error={
                  amountInput !== '' && !isValidAmount
                    ? `Montant minimum : ${formatFc(pricing.minAmountCdf)}`
                    : undefined
                }
              />
            </div>
          </div>

          <PaymentAccountPicker
            method={paymentMethod}
            onMethodChange={setPaymentMethod}
            operator={operator}
            onOperatorChange={setOperator}
            phone={phone}
            onPhoneChange={setPhone}
            amountFc={isValidAmount ? parsedAmount : pricing.minAmountCdf}
            amountHint="Montant prélevé en francs congolais"
          />

          {error ? (
            <div ref={errorRef} tabIndex={-1} className="outline-none">
              <Alert variant="error" title="Paiement interrompu" className="!p-3 text-xs">
                {error}
              </Alert>
            </div>
          ) : null}

          <div className="pt-2 border-t border-border space-y-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              disabled={!isValidAmount}
              loading={loading}
              leftIcon={
                loading ? (
                  <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
                ) : paymentMethod === 'card' ? (
                  <CreditCard className="w-4 h-4" />
                ) : (
                  <Smartphone className="w-4 h-4" />
                )
              }
              className="font-bold shadow-sm shadow-primary/30"
            >
              {paymentMethod === 'card'
                ? `Payer ${isValidAmount ? formatFc(parsedAmount) : formatFc(pricing.minAmountCdf)} par carte`
                : `Payer ${isValidAmount ? formatFc(parsedAmount) : formatFc(pricing.minAmountCdf)} par Mobile Money`}
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted text-center pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" aria-hidden />
              <span>Paiement réel FlexPay (Orange, M-Pesa, Airtel, cartes)</span>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
