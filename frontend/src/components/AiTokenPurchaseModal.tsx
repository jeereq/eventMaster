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
  AI_TOKEN_MIN_AMOUNT_FC,
  AI_TOKEN_MIN_COUNT,
  AI_TOKEN_PACK_SIZE,
  AI_TOKEN_PACK_PRICE_FC,
  aiTokenCostLegend,
  calculateTokensForAmount,
  calculateNextTokenAmount,
  addPurchasedAiTokens,
  getOrCreateDeviceId,
  syncDeviceAiTokensWithBackend,
} from '@/lib/aiTokens';
import { api } from '@/lib/api';

interface AiTokenPurchaseModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (addedTokens: number) => void;
}

type CheckoutStep = 'form' | 'waiting_mobile' | 'success';

const AMOUNT_PRESETS_FC = [2500, 5000, 7500, 10000] as const;
const POLL_MAX = 30;

const OPERATORS = [
  {
    id: 'orange' as const,
    label: 'Orange Money',
    selected:
      'text-orange-800 dark:text-orange-200 bg-orange-500/15 border-orange-700/40 dark:border-orange-400/40',
  },
  {
    id: 'mpesa' as const,
    label: 'M-Pesa',
    selected:
      'text-red-800 dark:text-red-200 bg-red-500/15 border-red-700/40 dark:border-red-400/40',
  },
  {
    id: 'airtel' as const,
    label: 'Airtel Money',
    selected:
      'text-rose-800 dark:text-rose-200 bg-rose-500/15 border-rose-700/40 dark:border-rose-400/40',
  },
] as const;

export default function AiTokenPurchaseModal({
  open,
  onClose,
  onSuccess,
}: AiTokenPurchaseModalProps) {
  const [step, setStep] = useState<CheckoutStep>('form');
  const [paymentMethod, setPaymentMethod] = useState<'mobile' | 'card'>('mobile');
  const [operator, setOperator] = useState<'orange' | 'mpesa' | 'airtel'>('orange');
  const [phone, setPhone] = useState('');
  const [amountInput, setAmountInput] = useState(String(AI_TOKEN_MIN_AMOUNT_FC));
  const [checkoutAmountFc, setCheckoutAmountFc] = useState(AI_TOKEN_PACK_PRICE_FC);
  const [checkoutTokens, setCheckoutTokens] = useState(AI_TOKEN_PACK_SIZE);
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
  const isValidAmount = Number.isFinite(parsedAmount) && parsedAmount >= AI_TOKEN_MIN_AMOUNT_FC;
  const previewTokens = isValidAmount ? calculateTokensForAmount(parsedAmount) : 0;
  const nextTokenAtFc = isValidAmount ? calculateNextTokenAmount(parsedAmount) : null;
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
      setAmountInput((current) => current || String(AI_TOKEN_MIN_AMOUNT_FC));
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
      const credited = Math.max(AI_TOKEN_MIN_COUNT, tokensCount);
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
    [activeOrderId, checkoutTokens, onSuccess],
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
        `Le montant minimum payable est de ${formatFc(AI_TOKEN_MIN_AMOUNT_FC)} (soit ${AI_TOKEN_MIN_COUNT} jetons).`,
      );
      return;
    }

    const amountFc = Math.round(parsedAmount);
    const tokensCount = calculateTokensForAmount(amountFc);
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
      description={`${formatFc(AI_TOKEN_PACK_PRICE_FC)} = ${AI_TOKEN_PACK_SIZE} jetons · minimum ${formatFc(AI_TOKEN_MIN_AMOUNT_FC)} · montant libre au-dessus`}
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
                    {formatFc(AI_TOKEN_PACK_PRICE_FC)} = {AI_TOKEN_PACK_SIZE} jetons · {aiTokenCostLegend()}
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
                {AMOUNT_PRESETS_FC.map((preset) => {
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
                min={AI_TOKEN_MIN_AMOUNT_FC}
                step={100}
                inputMode="numeric"
                autoComplete="off"
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value);
                  setError('');
                }}
                hint={`Minimum ${formatFc(AI_TOKEN_MIN_AMOUNT_FC)}. Au-dessus, les jetons suivent au prorata (≈ 417 FC / jeton).`}
                error={
                  amountInput !== '' && !isValidAmount
                    ? `Montant minimum : ${formatFc(AI_TOKEN_MIN_AMOUNT_FC)}`
                    : undefined
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <p id="token-pay-label" className="block text-xs font-bold text-foreground">
              Moyen de paiement
            </p>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="token-pay-label">
              <button
                type="button"
                role="radio"
                aria-checked={paymentMethod === 'mobile'}
                onClick={() => setPaymentMethod('mobile')}
                className={`min-h-11 p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  paymentMethod === 'mobile'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs'
                    : 'border-border bg-surface text-muted hover:text-foreground'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" aria-hidden />
                Mobile Money
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={paymentMethod === 'card'}
                onClick={() => setPaymentMethod('card')}
                className={`min-h-11 p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  paymentMethod === 'card'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs'
                    : 'border-border bg-surface text-muted hover:text-foreground'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" aria-hidden />
                Visa / Mastercard
              </button>
            </div>
          </div>

          {paymentMethod === 'mobile' && (
            <div className="space-y-3 pt-1 animate-fade-in">
              <p id="token-op-label" className="text-xs font-bold text-foreground">
                Opérateur
              </p>
              <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-labelledby="token-op-label">
                {OPERATORS.map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    role="radio"
                    aria-checked={operator === op.id}
                    onClick={() => setOperator(op.id)}
                    className={`min-h-11 px-3 rounded-xl text-xs font-bold border transition cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                      operator === op.id
                        ? op.selected
                        : 'border-border bg-surface text-muted hover:text-foreground hover:opacity-100'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>

              <Input
                label="Numéro de téléphone Mobile Money"
                required
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 24389XXXXXXX ou 089XXXXXXX"
                leftIcon={<Smartphone className="w-4 h-4" />}
                hint="Vous recevrez une notification pour saisir votre code secret PIN."
              />
            </div>
          )}

          {paymentMethod === 'card' && (
            <div className="p-3 rounded-xl bg-surface-muted border border-border space-y-1 text-xs animate-fade-in">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-primary" aria-hidden />
                Paiement sécurisé par carte bancaire
              </p>
              <p className="text-[11px] text-muted">
                Redirection vers FlexPay pour finaliser la transaction en francs congolais (FC).
              </p>
            </div>
          )}

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
                ? `Payer ${isValidAmount ? formatFc(parsedAmount) : formatFc(AI_TOKEN_MIN_AMOUNT_FC)} par carte`
                : `Payer ${isValidAmount ? formatFc(parsedAmount) : formatFc(AI_TOKEN_MIN_AMOUNT_FC)} par Mobile Money`}
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
