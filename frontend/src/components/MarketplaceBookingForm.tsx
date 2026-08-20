'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Alert, Button, Input } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import {
  eachDateKey,
  formatBookingPeriod,
  previewMarketplaceAmounts,
  type VenuePriceUnit,
} from '@/lib/marketplace';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import { Lock } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { clientLoginHref, clientRegisterHref } from '@/lib/safeAppPath';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { depositPercent } from '@/lib/platformRates';

export default function MarketplaceBookingForm({
  listingSlug,
  offeringSlug,
  unavailableDates = [],
  bookedDates = [],
  blockedDates = [],
  priceFromFc,
  priceUnit,
  eventDate,
  eventEndDate,
  onEventDateChange,
  onEventEndDateChange,
  showCalendar = true,
  eventId,
}: {
  listingSlug?: string;
  offeringSlug?: string;
  unavailableDates?: string[];
  bookedDates?: string[];
  blockedDates?: string[];
  priceFromFc: number | null;
  priceUnit?: VenuePriceUnit | string | null;
  eventDate?: string;
  eventEndDate?: string;
  onEventDateChange?: (value: string) => void;
  onEventEndDateChange?: (value: string) => void;
  showCalendar?: boolean;
  eventId?: string;
}) {
  const { token, loading, tenant } = useAuth();
  const { site } = usePlatformSite();
  const depositPct = depositPercent(site);
  const pathname = usePathname();
  const nextPath = pathname || '/marketplace';
  const [internalDate, setInternalDate] = useState('');
  const [internalEndDate, setInternalEndDate] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState('');
  const [formError, setFormError] = useState('');

  const selectedDate = eventDate ?? internalDate;
  const selectedEnd = (eventEndDate ?? internalEndDate) || selectedDate;
  const setRange = (from: string, to: string) => {
    if (onEventDateChange) onEventDateChange(from);
    else setInternalDate(from);
    if (onEventEndDateChange) onEventEndDateChange(to);
    else setInternalEndDate(to);
  };
  const blocked = useMemo(() => new Set(unavailableDates), [unavailableDates]);
  const rangeKeys = selectedDate ? eachDateKey(selectedDate, selectedEnd || selectedDate) : [];
  const dateTaken = rangeKeys.some((key) => blocked.has(key));
  const amounts = priceFromFc != null
    ? previewMarketplaceAmounts(priceFromFc, Math.max(1, rangeKeys.length), priceUnit, {
        commissionRate: site.marketplaceCommissionRate,
        depositRate: site.marketplaceDepositRate,
      })
    : null;
  const loggedIn = Boolean(token && tenant?.id);
  const bookingsHref = eventId
    ? `/dashboard/bookings?tab=bookings&event=${encodeURIComponent(eventId)}`
    : '/dashboard/bookings';
  const periodLabel = selectedDate ? formatBookingPeriod(selectedDate, selectedEnd) : '';

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSent('');
    if (!selectedDate) {
      setFormError('Choisissez une date, ou une période du… au…, sur le calendrier.');
      return;
    }
    if (rangeKeys.length > 31) {
      setFormError('La période ne peut pas dépasser 31 jours.');
      return;
    }
    if (dateTaken) {
      setFormError('Une ou plusieurs dates de cette période ne sont plus disponibles.');
      return;
    }
    setSending(true);
    try {
      const data = await api.post('/marketplace/bookings', {
        listingSlug,
        offeringSlug,
        eventDate: selectedDate,
        eventEndDate: selectedEnd && selectedEnd !== selectedDate ? selectedEnd : undefined,
        guestCount: guestCount || undefined,
        notes: notes || undefined,
        eventId: eventId || undefined,
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
      selectedEndDate={selectedEnd}
      onSelectRange={setRange}
    />
  ) : null;

  if (priceFromFc == null) {
    return (
      <div className="space-y-3">
        {calendar}
        <div className="border border-border rounded-[var(--radius-card)] p-4 sm:p-5 bg-surface">
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
        <div className="border border-border rounded-[var(--radius-card)] p-4 sm:p-5 bg-surface space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Réserver</h2>
          <p className="text-xs text-muted leading-relaxed">
            Créez un compte client (gratuit) pour demander une date ou une période. L’acompte ({depositPct} %) se verse hors
            plateforme au professionnel ; EventMaster n’encaisse pas ce paiement.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={clientLoginHref(nextPath)} className="inline-flex">
              <Button size="sm">Se connecter</Button>
            </Link>
            <Link href={clientRegisterHref(nextPath)} className="inline-flex">
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
      <div className="border border-border rounded-[var(--radius-card)] p-4 sm:p-5 bg-surface space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Réserver une date ou une période</h2>
        <p className="text-xs text-muted leading-relaxed">
          Cliquez un jour libre, puis éventuellement le dernier jour. Demande → acceptation → acompte {depositPct} % hors
          plateforme → confirmation.
        </p>
        {formError && <Alert variant="error">{formError}</Alert>}
        {sent && <Alert variant="success">{sent}</Alert>}
        {selectedDate ? (
          <p className="text-sm">
            Période : <strong>{periodLabel}</strong>
            {rangeKeys.length > 1 ? ` · ${rangeKeys.length} jours` : ''}
          </p>
        ) : (
          <p className="text-xs text-muted">Aucune date sélectionnée.</p>
        )}
        {dateTaken && (
          <p className="text-[11px] text-red-600">Cette période chevauche une date déjà bloquée ou réservée.</p>
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
            {priceUnit === 'DAY' && rangeKeys.length > 1 ? (
              <p className="text-muted">{formatFc(priceFromFc || 0)} / jour × {rangeKeys.length} jours</p>
            ) : null}
            <p>Acompte {depositPct} % à verser au professionnel : <strong>{formatFc(amounts.depositFc)}</strong></p>
            <p className="text-muted inline-flex items-center gap-1">
              <Lock className="w-3 h-3" /> Pas de paiement carte sur EventMaster.
            </p>
          </div>
        )}
        <Button type="submit" loading={sending} fullWidth disabled={dateTaken} className="min-h-11">
          Envoyer la demande de réservation
        </Button>
        <p className="text-[11px] text-muted">
          Suivi dans{' '}
          <Link href={`${bookingsHref}?tab=bookings`} className="font-semibold text-primary hover:underline">
            Devis & réservations
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
