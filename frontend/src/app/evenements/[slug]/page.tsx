'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import { Alert, Button, Input } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import { Calendar, MapPin, Ticket } from 'lucide-react';

type PublicEventCard = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  date: string;
  location: string;
  orgName: string;
  paid: boolean;
  ticketPriceFc: number;
  ticketsRemaining: number | null;
  soldOut: boolean;
};

function PublicEventDetailInner() {
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const slug = params.slug as string;
  const [event, setEvent] = useState<PublicEventCard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.get(`/public/events/${slug}`);
        if (!cancelled) setEvent(data.event);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Événement introuvable.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    setBusy(true);
    setError('');
    try {
      const data = await api.post(`/public/events/${slug}/checkout`, {
        buyerName,
        buyerEmail,
        buyerPhone,
        quantity,
      });
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      const rsvp = data.rsvpUrl ? `&rsvp=${encodeURIComponent(data.rsvpUrl)}` : '';
      router.push(`/evenements/${slug}/succes?order=${data.orderId || ''}${rsvp}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Inscription impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicPageShell>
      {loading ? (
        <div className="page-container py-16 text-sm text-muted">Chargement…</div>
      ) : !event ? (
        <div className="page-container py-16 space-y-3">
          <Alert variant="error">{error || 'Événement introuvable ou privé.'}</Alert>
          <Link href="/evenements" className="text-sm font-semibold text-primary">Retour à l’agenda</Link>
        </div>
      ) : (
        <>
          <PublicPageHero
            chip={event.orgName}
            title={event.title}
            description={event.description || undefined}
            compact
          >
            <div className="flex flex-wrap gap-2 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(event.date).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {event.location}
              </span>
            </div>
          </PublicPageHero>
          <section className="page-container py-10 grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-3 space-y-3 text-sm text-muted leading-relaxed">
              {event.description ? <p className="whitespace-pre-line">{event.description}</p> : <p>Inscription ouverte au public.</p>}
              <p>
                {event.paid
                  ? `Billet : ${formatFc(event.ticketPriceFc)} · paiement en ligne (carte).`
                  : 'Entrée libre : inscrivez-vous pour recevoir votre badge QR.'}
              </p>
              {event.ticketsRemaining != null && (
                <p>{event.soldOut ? 'Complet.' : `${event.ticketsRemaining} place${event.ticketsRemaining > 1 ? 's' : ''} restante${event.ticketsRemaining > 1 ? 's' : ''}.`}</p>
              )}
            </div>
            <div className="lg:col-span-2">
              <form onSubmit={submit} className="rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-3">
                <h2 className="font-semibold text-foreground inline-flex items-center gap-2">
                  <Ticket className="w-4 h-4" />
                  {event.paid ? 'Acheter un billet' : 'S’inscrire'}
                </h2>
                {search.get('canceled') && (
                  <Alert variant="error">Paiement annulé. Vous pouvez réessayer.</Alert>
                )}
                {error && <Alert variant="error">{error}</Alert>}
                {event.soldOut ? (
                  <p className="text-sm text-muted">Plus de places disponibles.</p>
                ) : (
                  <>
                    <Input label="Nom complet" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} required />
                    <Input label="E-mail" type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} required />
                    <Input label="Téléphone (optionnel)" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} />
                    <Input
                      label="Nombre de places"
                      type="number"
                      min={1}
                      max={8}
                      value={String(quantity)}
                      onChange={(e) => setQuantity(Math.min(8, Math.max(1, Number(e.target.value) || 1)))}
                    />
                    {event.paid && (
                      <p className="text-sm font-semibold">
                        Total : {formatFc(event.ticketPriceFc * quantity)}
                      </p>
                    )}
                    <Button type="submit" loading={busy} fullWidth>
                      {event.paid ? 'Payer et réserver' : 'Confirmer l’inscription'}
                    </Button>
                  </>
                )}
              </form>
            </div>
          </section>
        </>
      )}
    </PublicPageShell>
  );
}

export default function PublicEventDetailPage() {
  return (
    <Suspense fallback={<div className="page-container py-16 text-sm text-muted">Chargement…</div>}>
      <PublicEventDetailInner />
    </Suspense>
  );
}
