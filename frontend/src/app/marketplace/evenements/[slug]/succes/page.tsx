'use client';

import React, { Suspense, useCallback, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import PaymentPendingView from '@/components/PaymentPendingView';
import { Alert, Button } from '@/components/ui';
import { eventPublicHref, eventPublicListHref } from '@/lib/safeAppPath';
import { CheckCircle2 } from 'lucide-react';

function SuccessInner() {
  const params = useParams();
  const search = useSearchParams();
  const slug = params.slug as string;
  const sessionId = search.get('session_id');
  const orderId = search.get('order');
  const provider = search.get('provider');
  const method = search.get('method'); // card | mobile
  const rsvpFromQuery = search.get('rsvp');
  const forcePending = search.get('pending') === '1';

  const [rsvpUrl, setRsvpUrl] = useState(rsvpFromQuery || '');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [paid, setPaid] = useState(Boolean(rsvpFromQuery) && !forcePending);
  const [pending, setPending] = useState(
    forcePending || (provider === 'flexpay' && Boolean(orderId) && !rsvpFromQuery),
  );

  const pollFlexPay = useCallback(async () => {
    if (!orderId) return { status: 'error' as const, message: 'Commande manquante.' };
    const data = await api.get(`/public/payments/flexpay/orders/${orderId}/verify`);
    if (data.event?.title) setTitle(data.event.title);
    if (data.paid) {
      setRsvpUrl(data.rsvpUrl || '');
      setPaid(true);
      setPending(false);
      setError('');
      return { status: 'paid' as const };
    }
    if (data.status === 'failed') {
      return {
        status: 'failed' as const,
        message: data.message || 'Le paiement a échoué ou a été refusé.',
      };
    }
    return {
      status: 'pending' as const,
      message: data.message || 'En attente de confirmation FlexPay…',
    };
  }, [orderId]);

  const retryFlexPay = useCallback(async () => {
    if (!orderId) return;
    const data = await api.post(`/public/payments/flexpay/orders/${orderId}/retry`, {
      paymentMethod: method === 'card' ? 'card' : 'mobile',
    });
    if (data.checkoutUrl && typeof window !== 'undefined') {
      window.location.href = data.checkoutUrl;
      return;
    }
    setPending(true);
    setError('');
  }, [orderId, method]);

  const pollSession = useCallback(async () => {
    if (!sessionId) return { status: 'error' as const, message: 'Session manquante.' };
    const data = await api.get(`/public/ticket-orders/session/${sessionId}`);
    if (data.event?.title) setTitle(data.event.title);
    if (data.rsvpUrl) setRsvpUrl(data.rsvpUrl);
    if (data.status === 'PAID' || data.paid) {
      setPaid(true);
      setPending(false);
      setError('');
      return { status: 'paid' as const };
    }
    return { status: 'pending' as const, message: 'Paiement encore en cours…' };
  }, [sessionId]);

  const showPending = pending && !paid && (Boolean(orderId) || Boolean(sessionId));

  return (
    <PublicPageShell>
      <PublicPageHero
        chip="Billetterie"
        title={paid ? 'C’est confirmé' : showPending ? 'Paiement en cours' : 'Confirmation'}
        description={
          paid
            ? title
              ? `Votre place pour « ${title} » est enregistrée.`
              : 'Votre inscription est enregistrée.'
            : showPending
              ? 'Validez le paiement : la confirmation s’affiche ici automatiquement.'
              : title
                ? `Votre place pour « ${title} ».`
                : 'Vérification de votre inscription…'
        }
        compact
      />
      <section className="page-container py-10 max-w-lg space-y-4">
        {showPending && (
          <PaymentPendingView
            method={method || (provider === 'flexpay' ? 'mobile' : 'card')}
            description={
              method === 'mobile' || (!method && provider === 'flexpay')
                ? 'Une demande Mobile Money a été envoyée. Confirmez sur votre téléphone : cette page se met à jour toute seule.'
                : 'Nous confirmons votre paiement carte FlexPay…'
            }
            onPoll={orderId && provider === 'flexpay' ? pollFlexPay : pollSession}
            onRetry={orderId && provider === 'flexpay' ? retryFlexPay : undefined}
            onPaid={() => {
              setPaid(true);
              setPending(false);
            }}
          />
        )}

        {paid && (
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            {error && <Alert variant="error">{error}</Alert>}
            <p className="text-sm text-muted leading-relaxed">
              Conservez le lien de votre espace invité : badge QR, consignes et, selon le forfait de
              l’organisateur, plan de table.
            </p>
            {rsvpUrl && (
              <a href={rsvpUrl} className="inline-flex">
                <Button>Ouvrir mon badge QR</Button>
              </a>
            )}
            <div className="flex flex-col gap-2">
              <Link href={eventPublicHref(slug)} className="text-sm font-semibold text-primary">
                Retour à l’événement
              </Link>
              <Link href={eventPublicListHref()} className="text-sm text-muted hover:text-foreground">
                Tous les événements
              </Link>
            </div>
          </div>
        )}

        {!paid && !showPending && (
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 space-y-3">
            {error ? (
              <Alert variant="error">{error}</Alert>
            ) : (
              <p className="text-sm text-muted">Chargement de la confirmation…</p>
            )}
            <Link href={eventPublicHref(slug)} className="text-sm font-semibold text-primary">
              Retour à l’événement
            </Link>
          </div>
        )}
      </section>
    </PublicPageShell>
  );
}

export default function MarketplaceEventSuccessPage() {
  return (
    <Suspense fallback={<div className="page-container py-16 text-sm text-muted">Chargement…</div>}>
      <SuccessInner />
    </Suspense>
  );
}
