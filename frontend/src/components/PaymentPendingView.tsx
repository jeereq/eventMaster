'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Smartphone, CreditCard, CheckCircle2, RefreshCw } from 'lucide-react';
import { Alert, Button } from '@/components/ui';

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
  className?: string;
};

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
  className = '',
}: PaymentPendingViewProps) {
  const [status, setStatus] = useState<PaymentPendingStatus>('pending');
  const [message, setMessage] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [checking, setChecking] = useState(false);
  const [retrying, setRetrying] = useState(false);
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
  const isMobile = method === 'mobile' || method === 'flexpay_mobile';
  const waiting = status === 'pending' || status === 'error';

  if (status === 'paid') {
    return (
      <div className={`rounded-[var(--radius-card)] border border-emerald-200 bg-emerald-50/60 p-5 space-y-3 ${className}`}>
        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        <h2 className="text-lg font-bold text-foreground">Paiement confirmé</h2>
        <p className="text-sm text-muted">Votre paiement a bien été reçu.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-[var(--radius-card)] border border-amber-200 bg-amber-50/50 p-5 space-y-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="relative mt-0.5">
          {isMobile ? (
            <Smartphone className="w-8 h-8 text-amber-700" />
          ) : (
            <CreditCard className="w-8 h-8 text-amber-700" />
          )}
          {waiting && (
            <Loader2 className="w-4 h-4 text-amber-600 absolute -right-1 -bottom-1 animate-spin" />
          )}
        </div>
        <div className="space-y-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <p className="text-sm text-muted leading-relaxed">
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
          </>
        ) : (
          <>
            <li>Terminez le paiement sur la page FlexPay si elle est encore ouverte</li>
            <li>Revenez sur cette page</li>
            <li>La confirmation apparaît dès réception du callback</li>
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
          disabled={checking || retrying}
          className="inline-flex items-center gap-2"
        >
          {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {checking ? 'Vérification…' : 'Vérifier maintenant'}
        </Button>
        {onRetry && (status === 'failed' || status === 'error' || attempts >= Math.min(8, maxAttempts)) && (
          <Button
            type="button"
            variant="secondary"
            disabled={checking || retrying}
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
            {retrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {retrying ? 'Relance…' : retryLabel}
          </Button>
        )}
        {attempts >= maxAttempts && status === 'pending' && (
          <p className="text-xs text-muted self-center">
            Toujours en attente ? Vérifiez sur le téléphone puis cliquez à nouveau, ou relancez le paiement.
          </p>
        )}
      </div>
    </div>
  );
}
