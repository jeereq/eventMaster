'use client';

import React, { Suspense, useCallback, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import PaymentPendingView from '@/components/PaymentPendingView';
import { Alert, Button } from '@/components/ui';
import { eventPublicHref, eventPublicListHref } from '@/lib/safeAppPath';
import { CheckCircle2, ArrowLeft, QrCode, Ticket, HelpCircle } from 'lucide-react';

type SuccessGuestItem = {
  id: string;
  firstName: string;
  email: string;
  rsvpUrl: string;
};

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
  const [guestsList, setGuestsList] = useState<SuccessGuestItem[]>([]);
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
    if (Array.isArray(data.guests)) setGuestsList(data.guests);
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
    if (Array.isArray(data.guests)) setGuestsList(data.guests);
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
        title={paid ? 'C’est confirmé' : showPending ? 'Paiement en cours' : 'Confirmation'}
        description={
          paid
            ? title
              ? `Votre réservation pour « ${title} » est enregistrée.`
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
          <div className="space-y-3">
            <PaymentPendingView
              method={method || (provider === 'flexpay' ? 'mobile' : 'card')}
              description={
                method === 'mobile' || (!method && provider === 'flexpay')
                  ? 'Une demande Mobile Money a été envoyée. Confirmez sur votre téléphone : cette page se met à jour toute seule.'
                  : 'Nous confirmons votre paiement carte FlexPay…'
              }
              backHref={eventPublicHref(slug)}
              backLabel="Retour à l’événement"
              onPoll={orderId && provider === 'flexpay' ? pollFlexPay : pollSession}
              onRetry={orderId && provider === 'flexpay' ? retryFlexPay : undefined}
              onPaid={() => {
                setPaid(true);
                setPending(false);
              }}
            />
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-1 text-xs text-muted">
              <Link
                href={eventPublicHref(slug)}
                className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Retourner à la fiche de l’événement
              </Link>
              <Link href={eventPublicListHref()} className="text-muted hover:text-foreground">
                Tous les événements
              </Link>
            </div>
          </div>
        )}

        {paid && (
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-emerald-600 font-bold">
              <CheckCircle2 className="w-7 h-7 shrink-0" />
              <span>Paiement validé avec succès</span>
            </div>
            {error && <Alert variant="error">{error}</Alert>}
            <p className="text-sm text-muted leading-relaxed">
              Conservez les liens de vos espaces invités : badges QR, consignes, itinéraire et plan de table.
            </p>

            {guestsList.length > 1 ? (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-primary" />
                  Vos {guestsList.length} billets réservés
                </p>
                <div className="space-y-2">
                  {guestsList.map((g, idx) => (
                    <div
                      key={g.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-surface-muted"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {idx === 0 ? `Billet 1 (Principal) · ${g.firstName}` : `Billet ${idx + 1} · ${g.firstName}`}
                        </p>
                        <p className="text-[11px] text-muted truncate">{g.email}</p>
                      </div>
                      <a href={g.rsvpUrl} className="shrink-0 inline-flex">
                        <Button size="sm" className="inline-flex items-center gap-1 text-xs">
                          <QrCode className="w-3.5 h-3.5" />
                          Badge QR
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ) : rsvpUrl ? (
              <div className="pt-2">
                <a href={rsvpUrl} className="inline-flex">
                  <Button className="inline-flex items-center gap-2">
                    <QrCode className="w-4 h-4" />
                    Ouvrir mon badge QR
                  </Button>
                </a>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 pt-3 border-t border-border">
              <Link
                href="/dashboard/tickets"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                <Ticket className="w-3.5 h-3.5" />
                Voir tous mes billets dans mon compte
              </Link>
              <Link
                href="/guide/invite"
                className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Aide espace invité
              </Link>
              <Link
                href={eventPublicHref(slug)}
                className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Retour à l’événement
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
            <Link
              href={eventPublicHref(slug)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
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
