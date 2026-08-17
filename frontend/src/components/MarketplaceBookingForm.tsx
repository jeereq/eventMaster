'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Alert, Button, Input } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import { previewMarketplaceAmounts } from '@/lib/marketplace';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import { Lock } from 'lucide-react';

export default function MarketplaceBookingForm({
  listingSlug,
  offeringSlug,
  unavailableDates = [],
  bookedDates = [],
  blockedDates = [],
  priceFromFc,
  eventDate,
  onEventDateChange,
  showCalendar = true,
}: {
  listingSlug?: string;
  offeringSlug?: string;
  unavailableDates?: string[];
  bookedDates?: string[];
  blockedDates?: string[];
  priceFromFc: number | null;
  eventDate?: string;
  onEventDateChange?: (value: string) => void;
  showCalendar?: boolean;
}) {
  const { token, loading, tenant, access } = useAuth();
  const [internalDate, setInternalDate] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState('');
  const [formError, setFormError] = useState('');

  const selectedDate = eventDate ?? internalDate;
  const setSelectedDate = onEventDateChange ?? setInternalDate;
  const blocked = useMemo(() => new Set(unavailableDates), [unavailableDates]);
  const amounts = priceFromFc != null ? previewMarketplaceAmounts(priceFromFc) : null;
  const dateTaken = Boolean(selectedDate && blocked.has(selectedDate));
  const loggedIn = Boolean(token && tenant?.id);
  const isClient = access?.level === 'client' || tenant?.accountKind === 'CLIENT';
  const bookingsHref = isClient ? '/dashboard/bookings' : '/dashboard/marketplace';

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSent('');
    if (!selectedDate) {
      setFormError('Choisissez une date sur le calendrier.');
      return;
    }
    if (dateTaken) {
      setFormError('Cette date n’est plus disponible.');
      return;
    }
    setSending(true);
    try {
      const data = await api.post('/marketplace/bookings', {
        listingSlug,
        offeringSlug,
        eventDate: selectedDate,
        guestCount: guestCount || undefined,
        notes: notes || undefined,
      });
      setSent(data.message || 'Demande de réservation envoyée.');
      setNotes('');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Réservation impossible.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return null;

  const calendar = showCalendar ? (
    <AvailabilityCalendar
      title="Disponibilités"
      bookedDates={bookedDates}
      blockedDates={blockedDates.length ? blockedDates : unavailableDates}
      selectedDate={selectedDate}
      onSelectDate={setSelectedDate}
    />
  ) : null;

  if (priceFromFc == null) {
    return (
      <div className="space-y-3">
        {calendar}
        <div className="border border-border rounded-[var(--radius-card)] p-5 bg-surface">
          <p className="text-xs text-muted leading-relaxed">
            Cette offre est sur devis. Envoyez une demande ci-dessus : la réservation avec acompte n’est disponible
            que lorsqu’un tarif de départ est publié.
          </p>
        </div>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="space-y-3">
        {calendar}
        <div className="border border-border rounded-[var(--radius-card)] p-5 bg-surface space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Réserver</h2>
          <p className="text-xs text-muted leading-relaxed">
            Créez un compte client (gratuit) pour demander une date. L’acompte (30 %) se verse hors plateforme
            au professionnel ; EventMaster n’encaisse pas ce paiement.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/login" className="inline-flex">
              <Button size="sm">Se connecter</Button>
            </Link>
            <Link href="/register?kind=CLIENT" className="inline-flex">
              <Button size="sm" variant="secondary">Créer un compte client</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleBook} className="space-y-3">
      {calendar}
      <div className="border border-border rounded-[var(--radius-card)] p-5 bg-surface space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Réserver cette date</h2>
        <p className="text-xs text-muted leading-relaxed">
          Cliquez un jour libre sur le calendrier. Demande → acceptation → acompte 30 % hors plateforme → confirmation.
        </p>
        {formError && <Alert variant="error">{formError}</Alert>}
        {sent && <Alert variant="success">{sent}</Alert>}
        {selectedDate ? (
          <p className="text-sm">
            Date choisie : <strong>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString('fr-FR')}</strong>
          </p>
        ) : (
          <p className="text-xs text-muted">Aucune date sélectionnée.</p>
        )}
        {dateTaken && (
          <p className="text-[11px] text-red-600">Cette date est déjà bloquée ou réservée.</p>
        )}
        <Input
          label="Nombre d’invités (estimé)"
          type="number"
          min={1}
          value={guestCount}
          onChange={(e) => setGuestCount(e.target.value)}
        />
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">Note (optionnel)</span>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
            placeholder="Horaires, type d’événement…"
          />
        </label>
        {amounts && (
          <div className="rounded-md border border-border bg-surface-muted px-3 py-2 text-xs space-y-1">
            <p>Montant indicatif : <strong>{formatFc(amounts.amountFc)}</strong></p>
            <p>Acompte 30 % à verser au professionnel : <strong>{formatFc(amounts.depositFc)}</strong></p>
            <p className="text-muted inline-flex items-center gap-1">
              <Lock className="w-3 h-3" /> Pas de paiement carte sur EventMaster.
            </p>
          </div>
        )}
        <Button type="submit" loading={sending} fullWidth disabled={dateTaken}>
          Envoyer la demande de réservation
        </Button>
        <p className="text-[11px] text-muted">
          Suivi dans{' '}
          <Link href={bookingsHref} className="font-semibold text-primary hover:underline">
            {isClient ? 'Mes réservations' : 'Marketplace → Réservations'}
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
