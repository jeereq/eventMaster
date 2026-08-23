'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
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
  const rsvpFromQuery = search.get('rsvp');
  const [rsvpUrl, setRsvpUrl] = useState(rsvpFromQuery || '');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (rsvpFromQuery) return;
    let cancelled = false;

    (async () => {
      try {
        if (provider === 'flexpay' && orderId) {
          const data = await api.get(`/public/payments/flexpay/orders/${orderId}/verify`);
          if (cancelled) return;
          setRsvpUrl(data.rsvpUrl || '');
          setTitle(data.event?.title || '');
          if (!data.paid) {
            setError('Paiement encore en cours. Rechargez cette page dans un instant.');
          }
          return;
        }

        if (!sessionId) return;
        const data = await api.get(`/public/ticket-orders/session/${sessionId}`);
        if (cancelled) return;
        setRsvpUrl(data.rsvpUrl || '');
        setTitle(data.event?.title || '');
        if (data.status && data.status !== 'PAID') {
          setError('Paiement encore en cours. Rechargez cette page dans un instant.');
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Commande introuvable.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, orderId, provider, rsvpFromQuery]);

  return (
    <PublicPageShell>
      <PublicPageHero
        chip="Billetterie"
        title="C’est confirmé"
        description={title ? `Votre place pour « ${title} » est enregistrée.` : 'Votre inscription est enregistrée.'}
        compact
      />
      <section className="page-container py-10 max-w-lg space-y-4">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          {error && <Alert variant="error">{error}</Alert>}
          <p className="text-sm text-muted leading-relaxed">
            Conservez le lien de votre espace invité : badge QR, consignes et, selon le forfait de l’organisateur, plan de table.
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
