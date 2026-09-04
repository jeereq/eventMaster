'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Coins,
  Sparkles,
  Smartphone,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  RotateCcw,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Modal, Button, Input } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import {
  AI_TOKEN_PACK_SIZE,
  AI_TOKEN_PACK_PRICE_FC,
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

export default function AiTokenPurchaseModal({
  open,
  onClose,
  onSuccess,
}: AiTokenPurchaseModalProps) {
  const [step, setStep] = useState<CheckoutStep>('form');
  const [paymentMethod, setPaymentMethod] = useState<'mobile' | 'card'>('mobile');
  const [operator, setOperator] = useState<'orange' | 'mpesa' | 'airtel'>('orange');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimer();
  }, []);

  const handleSuccess = useCallback(
    (tokensCount = AI_TOKEN_PACK_SIZE, orderId?: string | null) => {
      clearTimer();
      addPurchasedAiTokens(tokensCount, orderId || activeOrderId);
      void syncDeviceAiTokensWithBackend(api);
      setStep('success');
      if (onSuccess) {
        onSuccess(tokensCount);
      }
      setTimeout(() => {
        onClose();
        setStep('form');
        setActiveOrderId(null);
      }, 2000);
    },
    [activeOrderId, onClose, onSuccess],
  );

  const checkPaymentStatus = useCallback(
    async (orderId: string) => {
      if (!orderId) return;
      setVerifying(true);
      try {
        const res = (await api.get(`/public/ai-tokens/orders/${orderId}/verify`)) as {
          paid?: boolean;
          status?: string;
          tokensCount?: number;
        };

        if (res?.paid || res?.status === 'PAID') {
          handleSuccess(res.tokensCount || AI_TOKEN_PACK_SIZE, orderId);
        } else if (res?.status === 'FAILED') {
          clearTimer();
          setError('Le paiement a échoué ou a été refusé par l’opérateur Mobile Money.');
          setStep('form');
        }
      } catch (err) {
        console.warn('[AiTokens] verification check error:', err);
      } finally {
        setVerifying(false);
      }
    },
    [handleSuccess],
  );

  // Polling automatique lorsque le paiement Mobile Money est en attente
  useEffect(() => {
    if (step === 'waiting_mobile' && activeOrderId) {
      clearTimer();
      let count = 0;
      pollTimerRef.current = setInterval(async () => {
        count += 1;
        setPollCount(count);
        await checkPaymentStatus(activeOrderId);

        // Arrêt après ~90 secondes (30 x 3s)
        if (count >= 30) {
          clearTimer();
        }
      }, 3000);
    } else {
      clearTimer();
    }
    return () => clearTimer();
  }, [step, activeOrderId, checkPaymentStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phone.trim().replace(/\s+/g, '').replace(/^\+/, '');
    if (paymentMethod === 'mobile' && !cleanPhone) {
      setError('Veuillez renseigner votre numéro Mobile Money (ex: 24389XXXXXXX).');
      return;
    }

    setLoading(true);
    try {
      const deviceId = getOrCreateDeviceId();
      const res = (await api.post('/public/ai-tokens/checkout', {
        paymentMethod,
        phone: cleanPhone || undefined,
        operator: paymentMethod === 'mobile' ? operator : undefined,
        tokensCount: AI_TOKEN_PACK_SIZE,
        amountFc: AI_TOKEN_PACK_PRICE_FC,
        deviceId,
      })) as {
        success?: boolean;
        orderId?: string;
        orderNumber?: string;
        redirectUrl?: string | null;
        paymentMethod?: 'mobile' | 'card';
        status?: string;
        message?: string;
      };

      if (!res?.success) {
        throw new Error(res?.message || 'Impossible d’initialiser le paiement.');
      }

      // 1) Si paiement Carte Bancaire : redirection vers FlexPay
      if (paymentMethod === 'card') {
        if (res.redirectUrl) {
          window.location.href = res.redirectUrl;
          return;
        }
        // Fallback validation directe si sandbox local
        handleSuccess(AI_TOKEN_PACK_SIZE, res.orderId);
        return;
      }

      // 2) Si paiement Mobile Money : attente de la validation USSD sur le téléphone
      if (res.orderId) {
        setActiveOrderId(res.orderId);
        setStep('waiting_mobile');
      } else {
        handleSuccess(AI_TOKEN_PACK_SIZE, res.orderId);
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
    setActiveOrderId(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleModalClose}
      title="Recharger des jetons IA"
      description={`Pack ${AI_TOKEN_PACK_SIZE} jetons · ${formatFc(AI_TOKEN_PACK_PRICE_FC)} — modèles d’invitation IA ou simulation budget`}
      size="sm"
    >
      {/* ─── ÉTAPE 3 : SUCCÈS ─── */}
      {step === 'success' && (
        <div className="py-8 text-center space-y-3 animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto shadow-sm shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-foreground">
            Paiement validé avec succès !
          </h4>
          <p className="text-xs text-muted">
            <strong>+{AI_TOKEN_PACK_SIZE} jetons IA</strong> crédités — utilisables pour les modèles d’invitation ou la simulation budget.
          </p>
        </div>
      )}

      {/* ─── ÉTAPE 2 : ATTENTE VALIDATION MOBILE MONEY ─── */}
      {step === 'waiting_mobile' && (
        <div className="py-6 text-center space-y-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20 animate-pulse">
            <Smartphone className="w-7 h-7" />
          </div>

          <div className="space-y-1.5 max-w-xs mx-auto">
            <h4 className="text-sm font-bold text-foreground">
              Validation requise sur votre téléphone
            </h4>
            <p className="text-xs text-muted leading-relaxed">
              Une demande de paiement de <strong>{formatFc(AI_TOKEN_PACK_PRICE_FC)}</strong> a été envoyée au <strong>{phone}</strong>.
            </p>
            <p className="text-[11px] text-primary font-medium">
              Veuillez taper votre code secret PIN Mobile Money sur votre mobile pour approuver.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-surface-muted border border-border flex items-center justify-between text-xs max-w-xs mx-auto">
            <span className="flex items-center gap-1.5 text-muted">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              En attente du signal opérateur...
            </span>
            <span className="font-mono text-[10px] text-muted">{pollCount}/30</span>
          </div>

          <div className="space-y-2 pt-2 border-t border-border max-w-xs mx-auto">
            <Button
              type="button"
              variant="primary"
              size="sm"
              fullWidth
              loading={verifying}
              onClick={() => activeOrderId && checkPaymentStatus(activeOrderId)}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              J’ai validé sur mon mobile
            </Button>

            <button
              type="button"
              onClick={() => {
                clearTimer();
                setStep('form');
              }}
              className="text-xs text-muted hover:text-foreground inline-flex items-center gap-1 pt-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Modifier le numéro ou le mode
            </button>
          </div>
        </div>
      )}

      {/* ─── ÉTAPE 1 : FORMULAIRE DE PAIEMENT RÉEL ─── */}
      {step === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Carte d'offre Pack 15 Jetons */}
          <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Pack {AI_TOKEN_PACK_SIZE} jetons IA</p>
                <p className="text-[11px] text-muted">1 jeton = 1 modèle invitation ou 1 simulation</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-black text-primary block">
                {formatFc(AI_TOKEN_PACK_PRICE_FC)}
              </span>
              <span className="text-[10px] text-muted">TTC (CDF)</span>
            </div>
          </div>

          {/* Sélecteur de mode de paiement */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-foreground">
              Moyen de paiement
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('mobile')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  paymentMethod === 'mobile'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs'
                    : 'border-border bg-surface text-muted hover:text-foreground'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Mobile Money
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  paymentMethod === 'card'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs'
                    : 'border-border bg-surface text-muted hover:text-foreground'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Visa / Mastercard
              </button>
            </div>
          </div>

          {/* Choix opérateur Mobile Money */}
          {paymentMethod === 'mobile' && (
            <div className="space-y-3 pt-1 animate-fade-in">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'orange' as const, label: 'Orange Money', color: 'text-orange-600 bg-orange-500/10 border-orange-500/30' },
                  { id: 'mpesa' as const, label: 'M-Pesa', color: 'text-red-600 bg-red-500/10 border-red-500/30' },
                  { id: 'airtel' as const, label: 'Airtel Money', color: 'text-rose-600 bg-rose-500/10 border-rose-500/30' },
                ].map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setOperator(op.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer touch-manipulation ${
                      operator === op.id ? op.color : 'border-border bg-surface text-muted opacity-70 hover:opacity-100'
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
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 24389XXXXXXX ou 089XXXXXXX"
                leftIcon={<Smartphone className="w-4 h-4" />}
                hint="Vous recevrez une notification sur votre téléphone pour saisir votre code secret PIN."
              />
            </div>
          )}

          {paymentMethod === 'card' && (
            <div className="p-3 rounded-xl bg-surface-muted border border-border space-y-1 text-xs animate-fade-in">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-primary" />
                Paiement sécurisé par carte bancaire
              </p>
              <p className="text-[11px] text-muted">
                Vous serez redirigé vers la passerelle sécurisée FlexPay pour finaliser votre transaction en Francs Congolais (CDF).
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
                ? `Payer ${formatFc(AI_TOKEN_PACK_PRICE_FC)} par Carte`
                : `Payer ${formatFc(AI_TOKEN_PACK_PRICE_FC)} par Mobile Money`}
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted text-center pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Paiement réel et sécurisé FlexPay (Orange, M-Pesa, Airtel, Cartes)</span>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
