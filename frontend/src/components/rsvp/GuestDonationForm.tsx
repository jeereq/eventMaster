'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  Heart,
  Sparkles,
  Smartphone,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  MessageSquare,
  Loader2,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { Button, Input, Alert } from '@/components/ui';
import type { GuestDonationsConfig } from '@/app/rsvp/guestRsvpTypes';
import PaymentPendingView, { type PaymentPendingStatus } from '@/components/PaymentPendingView';

export interface GuestDonationFormProps {
  guestId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  donations: GuestDonationsConfig;
  onDonationSuccess?: () => void;
  className?: string;
}

export default function GuestDonationForm({
  guestId,
  guestName,
  guestEmail,
  guestPhone,
  donations,
  onDonationSuccess,
  className,
}: GuestDonationFormProps) {
  const minAmount = donations.minAmountFc || 1000;
  const suggestedList = donations.suggestedAmountsFc?.length
    ? donations.suggestedAmountsFc
    : [2500, 5000, 10000, 25000, 50000];

  const [selectedAmount, setSelectedAmount] = useState<number>(suggestedList[0] || minAmount);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [donationNote, setDonationNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mobile' | 'card'>('mobile');
  const [mobilePhone, setMobilePhone] = useState(guestPhone || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Gestion du paiement en attente ou finalisé
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [donationSuccess, setDonationSuccess] = useState(false);
  const [confirmedAmount, setConfirmedAmount] = useState<number>(0);

  const effectiveAmount = useMemo(() => {
    if (customAmount.trim()) {
      const parsed = Number(customAmount.replace(/\D/g, ''));
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return selectedAmount;
  }, [customAmount, selectedAmount]);

  const handleSelectSuggested = (amt: number) => {
    setSelectedAmount(amt);
    setCustomAmount('');
    setError('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setCustomAmount(raw);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (effectiveAmount < minAmount) {
      setError(`Le montant minimum est de ${formatFc(minAmount)}.`);
      return;
    }

    if (paymentMethod === 'mobile' && !mobilePhone.trim()) {
      setError('Veuillez renseigner votre numéro Mobile Money (ex. 243…).');
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.post(`/rsvp/${guestId}/donations`, {
        amountFc: effectiveAmount,
        isAnonymous,
        donationNote: donationNote.trim() || undefined,
        paymentMethod,
        phone: paymentMethod === 'mobile' ? mobilePhone.trim() : undefined,
      });

      if (paymentMethod === 'card' && res.paymentUrl) {
        window.location.href = res.paymentUrl;
        return;
      }

      if (res.orderId) {
        setPendingOrderId(res.orderId);
        setConfirmedAmount(effectiveAmount);
      } else {
        setDonationSuccess(true);
        setConfirmedAmount(effectiveAmount);
        onDonationSuccess?.();
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de l’initialisation de votre don.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePollPayment = useCallback(async (): Promise<{ status: PaymentPendingStatus; message?: string }> => {
    if (!pendingOrderId) return { status: 'error', message: 'Commande manquante' };
    try {
      const res = await api.get(`/public/payments/flexpay/orders/${pendingOrderId}/verify`);
      if (res.paid) {
        setDonationSuccess(true);
        setPendingOrderId(null);
        onDonationSuccess?.();
        return { status: 'paid' };
      }
      if (res.status === 'failed') {
        return { status: 'failed', message: res.message || 'Le paiement a échoué ou a été refusé.' };
      }
      return { status: 'pending', message: res.message || 'En attente de validation sur votre téléphone…' };
    } catch (err: any) {
      return { status: 'error', message: err?.message || 'Vérification impossible.' };
    }
  }, [pendingOrderId, onDonationSuccess]);

  // Si le don a été validé avec succès
  if (donationSuccess) {
    return (
      <div className={cn('rounded-3xl border border-rose-500/25 bg-rose-500/5 p-6 sm:p-8 text-center space-y-4 shadow-sm animate-fade-in', className)}>
        <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center justify-center mx-auto">
          <Heart className="w-7 h-7 fill-rose-500/30" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-display font-semibold text-foreground">
            Merci infiniment pour votre don !
          </h3>
          <p className="text-sm text-rose-700 dark:text-rose-300 font-bold tabular-nums">
            Contribution solidaire de {formatFc(confirmedAmount)}
          </p>
          <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed pt-1">
            Votre soutien est bien enregistré et apporte une aide précieuse aux organisateurs de la cause.
          </p>
        </div>

        <div className="pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setDonationSuccess(false);
              setPendingOrderId(null);
            }}
          >
            Faire une autre contribution
          </Button>
        </div>
      </div>
    );
  }

  // Si le paiement Mobile Money est en attente de confirmation
  if (pendingOrderId) {
    return (
      <div className={cn('rounded-3xl border border-border bg-surface p-5 sm:p-6 space-y-4 shadow-sm', className)}>
        <PaymentPendingView
          method={paymentMethod}
          title="Validation de votre don solidaire"
          description={`Une demande de débit de ${formatFc(confirmedAmount)} a été envoyée sur votre téléphone. Validez avec votre code PIN pour confirmer votre don.`}
          onPoll={handlePollPayment}
          onPaid={() => {
            setDonationSuccess(true);
            setPendingOrderId(null);
            onDonationSuccess?.();
          }}
          onCancelPayment={async () => {
            await api.post(`/public/payments/flexpay/orders/${pendingOrderId}/cancel`, {}).catch(() => undefined);
            setPendingOrderId(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn('rounded-3xl border border-border bg-surface p-5 sm:p-6 space-y-6 shadow-sm', className)}>
      {/* En-tête de la campagne */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/25 text-rose-700 dark:text-rose-300 text-xs font-bold">
            <Heart className="w-3.5 h-3.5 fill-rose-500/30" />
            Campagne solidaire
          </span>
          {donations.progressPercent != null && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {donations.progressPercent}% de l’objectif
            </span>
          )}
        </div>

        <div>
          <h3 className="text-lg sm:text-xl font-display font-semibold text-foreground">
            {donations.cause || 'Soutenir cet événement solidaire'}
          </h3>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Participez librement à la collecte de fonds en choisissant votre contribution et votre moyen de paiement local.
          </p>
        </div>

        {/* Barre de progression si objectif fixé */}
        {donations.targetAmountFc && donations.targetAmountFc > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground tabular-nums">
                {formatFc(donations.collectedAmountFc)}
              </span>
              <span className="text-muted tabular-nums">
                Objectif : {formatFc(donations.targetAmountFc)}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Progression de la collecte de dons"
              aria-valuenow={donations.collectedAmountFc}
              aria-valuemin={0}
              aria-valuemax={donations.targetAmountFc}
              className="w-full h-2.5 rounded-full bg-surface-muted overflow-hidden border border-border/60"
            >
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-rose-600 transition-all duration-500 motion-reduce:transition-none rounded-full"
                style={{ width: `${Math.min(100, Math.max(3, donations.progressPercent || 0))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Choix des montants suggérés */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted">
            Choisissez un montant
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2" role="group" aria-label="Montants de dons suggérés">
            {suggestedList.map((amt) => {
              const isSelected = !customAmount && selectedAmount === amt;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleSelectSuggested(amt)}
                  aria-pressed={isSelected}
                  className={cn(
                    'min-h-11 px-2.5 py-2 rounded-xl text-xs font-bold border transition touch-manipulation text-center',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50',
                    isSelected
                      ? 'bg-rose-700 hover:bg-rose-800 text-white border-rose-800 shadow-sm dark:bg-rose-600 dark:border-rose-500'
                      : 'border-border bg-surface-muted/50 text-foreground hover:bg-surface-muted hover:border-border/80',
                  )}
                >
                  {formatFc(amt)}
                </button>
              );
            })}
          </div>

          {/* Saisie d'un montant personnalisé */}
          <div className="relative pt-1">
            <Input
              type="text"
              inputMode="numeric"
              placeholder={`Autre montant libre (min. ${formatFc(minAmount)})`}
              value={customAmount}
              onChange={handleCustomChange}
              aria-label="Montant libre de votre don en Francs Congolais"
              className="h-11 pl-3 pr-12 text-xs font-semibold"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted pointer-events-none">
              FC
            </span>
          </div>
        </div>

        {/* Option d'anonymat */}
        <div className="rounded-2xl border border-border bg-surface-muted/30 p-3.5 space-y-2">
          <label className="flex items-center justify-between cursor-pointer touch-manipulation">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              {isAnonymous ? (
                <EyeOff className="w-4 h-4 text-rose-700 dark:text-rose-300 shrink-0" />
              ) : (
                <Eye className="w-4 h-4 text-primary shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">
                  Faire ce don de manière anonyme
                </p>
                <p className="text-[11px] text-muted truncate">
                  {isAnonymous
                    ? 'Votre nom sera masqué dans les statistiques et listes publiques'
                    : `Votre don apparaîtra au nom de ${guestName}`}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              aria-label="Faire ce don de manière anonyme"
              className="w-5 h-5 rounded text-rose-600 focus:ring-rose-500 shrink-0 cursor-pointer"
            />
          </label>
        </div>

        {/* Mot d'encouragement / note */}
        <div className="space-y-1">
          <label htmlFor="guest-donation-note" className="block text-xs font-bold uppercase tracking-wider text-muted">
            Mot d’encouragement (optionnel)
          </label>
          <div className="relative">
            <Input
              id="guest-donation-note"
              type="text"
              placeholder="Ex. De tout cœur avec vous pour cette noble cause !"
              value={donationNote}
              onChange={(e) => setDonationNote(e.target.value)}
              className="h-11 text-xs"
              maxLength={300}
            />
          </div>
        </div>

        {/* Choix du moyen de paiement */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted">
            Mode de règlement
          </label>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Moyen de paiement">
            <button
              type="button"
              onClick={() => setPaymentMethod('mobile')}
              aria-pressed={paymentMethod === 'mobile'}
              className={cn(
                'min-h-12 p-3 rounded-2xl border text-left flex items-center gap-3 transition touch-manipulation',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                paymentMethod === 'mobile'
                  ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary'
                  : 'border-border bg-surface text-muted hover:text-foreground hover:bg-surface-muted',
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                paymentMethod === 'mobile' ? 'bg-primary text-primary-foreground' : 'bg-surface-muted text-muted',
              )}>
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">Mobile Money</p>
                <p className="text-[10px] text-muted truncate">M-Pesa, Orange, Airtel</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              aria-pressed={paymentMethod === 'card'}
              className={cn(
                'min-h-12 p-3 rounded-2xl border text-left flex items-center gap-3 transition touch-manipulation',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                paymentMethod === 'card'
                  ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary'
                  : 'border-border bg-surface text-muted hover:text-foreground hover:bg-surface-muted',
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                paymentMethod === 'card' ? 'bg-primary text-primary-foreground' : 'bg-surface-muted text-muted',
              )}>
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">Carte bancaire</p>
                <p className="text-[10px] text-muted truncate">Visa, Mastercard</p>
              </div>
            </button>
          </div>

          {/* Numéro Mobile Money */}
          {paymentMethod === 'mobile' && (
            <div className="space-y-1 pt-1 animate-fade-in">
              <label htmlFor="guest-donation-phone" className="block text-[11px] font-semibold text-muted">
                Numéro Mobile Money (RDC)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  id="guest-donation-phone"
                  type="tel"
                  placeholder="243812345678"
                  value={mobilePhone}
                  onChange={(e) => setMobilePhone(e.target.value)}
                  className="pl-9 h-11 text-xs"
                />
              </div>
              <p className="text-[10px] text-muted leading-tight">
                Une notification de validation de débit USSD vous sera directement envoyée sur ce numéro.
              </p>
            </div>
          )}
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {/* Bouton de confirmation */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={submitting || effectiveAmount < minAmount}
          className="w-full min-h-12 text-sm font-bold shadow-md bg-rose-700 hover:bg-rose-800 text-white dark:bg-rose-600 dark:hover:bg-rose-700"
          leftIcon={
            submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Heart className="w-4 h-4 fill-white" />
            )
          }
        >
          {submitting
            ? 'Préparation de votre don…'
            : `Faire un don solidaire de ${formatFc(effectiveAmount)}`}
        </Button>
      </form>
    </div>
  );
}
