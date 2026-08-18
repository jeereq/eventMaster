'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Alert, Button, Input } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import { Ticket } from 'lucide-react';
import ClientAuthChoice from '@/components/ClientAuthChoice';
import { clientLoginHref, clientRegisterHref, eventPublicHref } from '@/lib/safeAppPath';
import type { PublicEventCard } from '@/lib/marketplace';

export default function EventTicketCheckoutForm({ event }: { event: PublicEventCard }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { user, token, loading: authLoading } = useAuth();
  const slug = event.slug || '';
  const nextPath = pathname || eventPublicHref(slug);
  const [busy, setBusy] = useState(false);
  const [guestCheckout, setGuestCheckout] = useState(false);
  const [error, setError] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!user) return;
    setBuyerName((prev) => prev || user.name || '');
    setBuyerEmail((prev) => prev || user.email || '');
    setBuyerPhone((prev) => prev || user.phone || '');
    setGuestCheckout(false);
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      router.push(`${eventPublicHref(slug)}/succes?order=${data.orderId || ''}${rsvp}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Inscription impossible.');
    } finally {
      setBusy(false);
    }
  };

  const showAuthChoice = !authLoading && !token && !guestCheckout;

  return (
    <form onSubmit={submit} className="border border-border rounded-[var(--radius-card)] p-4 sm:p-5 bg-surface space-y-3">
      <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
        <Ticket className="w-4 h-4" />
        {event.paid ? 'Acheter un billet' : 'S’inscrire'}
      </h2>
      {search.get('canceled') && (
        <Alert variant="error">Paiement annulé. Vous pouvez réessayer.</Alert>
      )}
      {error && <Alert variant="error">{error}</Alert>}
      {event.soldOut ? (
        <p className="text-sm text-muted">Plus de places disponibles.</p>
      ) : showAuthChoice ? (
        <ClientAuthChoice
          nextPath={nextPath}
          description="Connectez-vous pour retrouver vos billets dans le tableau de bord, ou continuez en invité."
          onGuest={() => setGuestCheckout(true)}
        />
      ) : (
        <>
          {token && user && (
            <p className="text-xs text-muted">
              Connecté en tant que {user.name || user.email}. Les billets apparaîtront dans{' '}
              <Link href="/dashboard/tickets" className="font-semibold text-primary hover:underline">Mes billets</Link>.
            </p>
          )}
          {!token && (
            <p className="text-xs text-muted">
              Inscription invité.{' '}
              <Link href={clientLoginHref(nextPath)} className="font-semibold text-primary hover:underline">Se connecter</Link>
              {' · '}
              <Link href={clientRegisterHref(nextPath)} className="font-semibold text-primary hover:underline">Créer un compte</Link>
            </p>
          )}
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
          <Button type="submit" loading={busy} fullWidth className="min-h-11">
            {event.paid ? 'Payer et réserver' : 'Confirmer l’inscription'}
          </Button>
        </>
      )}
    </form>
  );
}
