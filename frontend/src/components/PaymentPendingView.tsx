'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Smartphone, CreditCard, CheckCircle2, RefreshCw, ArrowLeft, XCircle } from 'lucide-react';
import { Alert, Button, ConfirmDialog } from '@/components/ui';
import { FLEXPAY_MOBILE_OPERATORS_LABEL } from '@/lib/flexPayOperators';
import { CANCEL_PAYMENT_CONFIRM, CLOSE_PAYMENT_CONFIRM } from '@/lib/pendingTicketPayment';

export type PaymentPendingStatus = 'pending' | 'paid' | 'failed' | 'error';

type PaymentPendingViewProps = {
  title?: string;
  description?: string;
  method?: 'card' | 'mobile' | string | null;
  /** Appelé périodiquement ; doit renvoyer le statut courant. */
  onPoll: () => Promise<{ status: PaymentPendingStatus; message?: string }>;
  /** Intervalle de polling (ms). */
  intervalMs?: number;
  /** Nombre max de tentatives auto (ensuite bouton manuel). */
  maxAttempts?: number;
  onPaid?: () => void;
  /** Relancer une nouvelle session de paiement (FlexPay). */
  onRetry?: () => Promise<void> | void;
  retryLabel?: string;
  /** Annuler volontairement la commande en cours. */
  onCancelPayment?: () => Promise<void> | void;
  cancelLabel?: string;
  /** Confirmer avant de quitter pendant un paiement en cours. */
  confirmLeave?: boolean;
  confirmLeaveMessage?: string;
  /** Lien ou action retour */
  backHref?: string;
  backLabel?: string;
  onBack?: () => void;
  className?: string;
};

function statusAnnouncement(status: PaymentPendingStatus, title: string, message: string) {
  if (status === 'paid') return 'Paiement confirmé. Votre paiement a bien été reçu.';
  if (status === 'failed') return message || 'Le paiement a échoué ou a été refusé.';
  if (status === 'error') return message || 'Vérification impossible.';
  return message || `${title}. Vérification automatique en cours.`;
}

export default function PaymentPendingView({
  title = 'Paiement en cours',
  description,
  method,
  onPoll,
  intervalMs = 4000,
  maxAttempts = 45,
  onPaid,
  onRetry,
  retryLabel = 'Relancer le paiement',
  onCancelPayment,
  cancelLabel = 'Annuler la commande',
  confirmLeave = true,
  confirmLeaveMessage = CLOSE_PAYMENT_CONFIRM,
  backHref,
  backLabel = 'Retour',
  onBack,
  className = '',
}: PaymentPendingViewProps) {
  const [status, setStatus] = useState<PaymentPendingStatus>('pending');
  const [message, setMessage] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [checking, setChecking] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmKind, setConfirmKind] = useState<'leave' | 'cancel' | null>(null);
  const paidRef = useRef(false);

  const runCheck = async (manual = false) => {
    if (paidRef.current) return;
    setChecking(true);
    try {
      const result = await onPoll();
      setStatus(result.status);
      if (result.message) setMessage(result.message);
      if (result.status === 'paid') {
        paidRef.current = true;
        onPaid?.();
      }
      if (!manual) setAttempts((n) => n + 1);
    } catch (err: unknown) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Vérification impossible.');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let count = 0;

    const tick = async () => {
      if (cancelled || paidRef.current || count >= maxAttempts) return;
      count += 1;
      setAttempts(count);
      setChecking(true);
      try {
        const result = await onPoll();
        if (cancelled) return;
        setStatus(result.status);
        if (result.message) setMessage(result.message);
        if (result.status === 'paid') {
          paidRef.current = true;
          onPaid?.();
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Vérification impossible.');
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    void tick();
    const id = window.setInterval(() => {
      void tick();
    }, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll on mount + interval
  }, [intervalMs, maxAttempts]);

  useEffect(() => {
    if (!confirmLeave || status === 'paid' || status === 'failed') return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = confirmLeaveMessage;
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [confirmLeave, confirmLeaveMessage, status]);

  const needsLeaveConfirm = confirmLeave && (status === 'pending' || status === 'error');

  const leave = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (backHref) window.location.assign(backHref);
  };

  const handleBack = () => {
    if (needsLeaveConfirm) {
      setConfirmKind('leave');
      return;
    }
    leave();
  };

  const handleCancel = () => {
    if (!onCancelPayment) return;
    setConfirmKind('cancel');
  };

  const confirmAction = async () => {
    if (confirmKind === 'leave') {
      setConfirmKind(null);
      leave();
      return;
    }
    if (confirmKind === 'cancel' && onCancelPayment) {
      setCancelling(true);
      try {
        await onCancelPayment();
        setConfirmKind(null);
      } finally {
        setCancelling(false);
      }
    }
  };

  const isMobile = method === 'mobile' || method === 'flexpay_mobile';
  const waiting = status === 'pending' || status === 'error';
  const liveText = statusAnnouncement(status, title, message);

  if (status === 'paid') {
    return (
      <div
        className={`rounded-[var(--radius-card)] border border-primary/35 bg-primary/10 p-5 space-y-3 ${className}`}
      >
        <p className="sr-only" role="status" aria-live="polite">
          {liveText}
        </p>
        <CheckCircle2 className="w-8 h-8 text-primary" aria-hidden />
        <h2 className="text-lg font-bold text-foreground">Paiement confirmé</h2>
        <p className="text-sm text-foreground/80">Votre paiement a bien été reçu.</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-[var(--radius-card)] border border-festive-accent/35 bg-festive-accent-soft p-5 space-y-4 ${className}`}
    >
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveText}
      </p>
      <div className="flex items-start gap-3">
        <div className="relative mt-0.5">
          {isMobile ? (
            <Smartphone className="w-8 h-8 text-festive-accent" aria-hidden />
          ) : (
            <CreditCard className="w-8 h-8 text-festive-accent" aria-hidden />
          )}
          {waiting && (
            <Loader2 className="w-4 h-4 text-festive-accent absolute -right-1 -bottom-1 animate-spin" aria-hidden />
          )}
        </div>
        <div className="space-y-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {description ||
              (isMobile
                ? 'Validez la demande sur votre téléphone (USSD / app Mobile Money). Cette page se met à jour automatiquement.'
                : 'Le paiement est en cours de confirmation. Cette page se met à jour automatiquement.')}
          </p>
        </div>
      </div>

      <ol className="text-sm text-foreground/90 space-y-2 list-decimal list-inside">
        {isMobile ? (
          <>
            <li>Ouvrez la notification ou le menu USSD sur votre téléphone</li>
            <li>Confirmez le montant avec votre code secret</li>
            <li>Attendez la confirmation ici (vérification automatique)</li>
            <li>Fermer cette fenêtre ne coupe pas le paiement — vous pourrez le reprendre</li>
            <li className="list-none text-xs text-muted pl-0 mt-1">
              Compatible : {FLEXPAY_MOBILE_OPERATORS_LABEL}
            </li>
          </>
        ) : (
          <>
            <li>Terminez le paiement sur la page FlexPay si elle est encore ouverte</li>
            <li>Revenez sur cette page</li>
            <li>La confirmation apparaît dès réception du callback</li>
            <li>Si vous fermez par erreur, reprenez le paiement depuis la fiche événement</li>
          </>
        )}
      </ol>

      {(message || status === 'failed' || status === 'error') && (
        <Alert variant={status === 'failed' || status === 'error' ? 'error' : 'info'}>
          {message ||
            (status === 'failed'
              ? 'Le paiement a échoué ou a été refusé.'
              : 'Paiement encore en cours…')}
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
        <Button
          type="button"
          onClick={() => void runCheck(true)}
          disabled={checking || retrying || cancelling}
          className="inline-flex items-center gap-2"
        >
          {checking ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <RefreshCw className="w-4 h-4" aria-hidden />}
          {checking ? 'Vérification…' : 'Vérifier maintenant'}
        </Button>
        {onRetry && (status === 'failed' || status === 'error' || attempts >= Math.min(8, maxAttempts)) && (
          <Button
            type="button"
            variant="secondary"
            disabled={checking || retrying || cancelling}
            className="inline-flex items-center gap-2"
            onClick={async () => {
              setRetrying(true);
              try {
                await onRetry();
                paidRef.current = false;
                setStatus('pending');
                setMessage('Nouvelle tentative envoyée…');
                setAttempts(0);
              } catch (err: unknown) {
                setStatus('error');
                setMessage(err instanceof Error ? err.message : 'Relance impossible.');
              } finally {
                setRetrying(false);
              }
            }}
          >
            {retrying ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <RefreshCw className="w-4 h-4" aria-hidden />}
            {retrying ? 'Relance…' : retryLabel}
          </Button>
        )}
        {(backHref || onBack) && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleBack}
            disabled={checking || retrying || cancelling}
            className="inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            {backLabel}
          </Button>
        )}
        {onCancelPayment && waiting && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            disabled={checking || retrying || cancelling}
            className="inline-flex items-center gap-2 text-danger hover:text-danger"
          >
            {cancelling ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <XCircle className="w-4 h-4" aria-hidden />}
            {cancelling ? 'Annulation…' : cancelLabel}
          </Button>
        )}
        {attempts >= maxAttempts && status === 'pending' && (
          <p className="text-xs text-muted self-center">
            Toujours en attente ? Vérifiez sur le téléphone puis cliquez à nouveau, ou relancez le paiement.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirmKind === 'leave'}
        onClose={() => setConfirmKind(null)}
        onConfirm={() => void confirmAction()}
        title="Fermer sans annuler"
        description={confirmLeaveMessage}
        confirmLabel="Fermer quand même"
        cancelLabel="Rester ici"
      />
      <ConfirmDialog
        open={confirmKind === 'cancel'}
        onClose={() => setConfirmKind(null)}
        onConfirm={() => void confirmAction()}
        title="Annuler la commande"
        description={CANCEL_PAYMENT_CONFIRM}
        confirmLabel="Annuler la commande"
        cancelLabel="Garder la commande"
        tone="danger"
        loading={cancelling}
      />
    </div>
  );
}
