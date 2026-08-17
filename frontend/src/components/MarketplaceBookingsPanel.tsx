'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Alert, Button, EmptyState, Input, StatusPill } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import {
  BOOKING_STATUS_LABELS,
  parseBlockedDates,
  type MarketplaceBookingItem,
  type MarketplaceBookingStatus,
} from '@/lib/marketplace';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import { CalendarCheck, CheckCircle2, XCircle } from 'lucide-react';

function toneFor(status: MarketplaceBookingStatus): 'amber' | 'emerald' | 'slate' | 'rose' {
  if (status === 'CONFIRMED' || status === 'COMPLETED') return 'emerald';
  if (status === 'ACCEPTED') return 'amber';
  if (status === 'CANCELLED') return 'rose';
  return 'slate';
}

export default function MarketplaceBookingsPanel({
  bookings,
  commissionDueFc,
  onChanged,
}: {
  bookings: MarketplaceBookingItem[];
  commissionDueFc: number;
  onChanged: () => Promise<void> | void;
}) {
  const [filter, setFilter] = useState<'all' | 'received' | 'sent'>('all');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [acceptAmount, setAcceptAmount] = useState<Record<string, string>>({});

  const visible = bookings.filter((b) => {
    if (filter === 'received') return b.viewerRole === 'vendor';
    if (filter === 'sent') return b.viewerRole === 'organizer';
    return true;
  });
  const calendarDates = parseBlockedDates(
    visible
      .filter((b) => b.status !== 'CANCELLED')
      .map((b) => b.eventDate),
  );

  const run = async (id: string, action: string, extra?: Record<string, unknown>) => {
    setBusyId(id);
    setError('');
    try {
      await api.patch(`/marketplace/bookings/${id}`, { action, ...extra });
      await onChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action impossible.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-[var(--radius-card)] bg-surface p-4 text-sm">
        <p className="font-semibold text-foreground">Commission marketplace due</p>
        <p className="text-lg font-semibold mt-1">{formatFc(commissionDueFc)}</p>
        <p className="text-xs text-muted mt-1 leading-relaxed">
          8 % sur les réservations confirmées dont vous êtes le vendeur. Distincte de l’abonnement SaaS.
          L’acompte (30 %) se verse hors plateforme.
        </p>
      </div>

      {calendarDates.length > 0 && (
        <AvailabilityCalendar title="Calendrier des réservations" bookedDates={calendarDates} />
      )}

      <div className="flex gap-1.5">
        {([
          ['all', 'Toutes'],
          ['received', 'Reçues'],
          ['sent', 'Envoyées'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              filter === id ? 'bg-primary text-white border-primary' : 'border-border text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {visible.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="w-5 h-5" />}
          title="Aucune réservation"
          description="Les demandes de date (salles et prestations) apparaîtront ici."
        />
      ) : (
        <div className="space-y-3">
          {visible.map((item) => {
            const isVendor = item.viewerRole === 'vendor';
            const busy = busyId === item.id;
            const amountDraft = acceptAmount[item.id] ?? String(item.amountFc);
            return (
              <div key={item.id} className="border border-border rounded-[var(--radius-card)] bg-surface p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                      {item.kind === 'venue' ? 'Salle' : 'Prestation'} · {isVendor ? 'Reçue' : 'Envoyée'}
                    </p>
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                    <p className="text-xs text-muted">
                      {isVendor ? item.organizerName || 'Organisateur' : item.vendorName}
                      {' · '}
                      {new Date(item.eventDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <StatusPill tone={toneFor(item.status)}>{BOOKING_STATUS_LABELS[item.status]}</StatusPill>
                </div>
                <p className="text-xs text-muted">
                  {formatFc(item.amountFc)} · acompte {formatFc(item.depositFc)}
                  {isVendor ? ` · commission ${formatFc(item.commissionFc)}` : ''}
                  {item.depositMarkedAt ? ' · acompte marqué' : ''}
                </p>
                {item.notes && <p className="text-sm text-muted whitespace-pre-line">{item.notes}</p>}
                <div className="flex flex-wrap gap-2 pt-1 items-end">
                  {isVendor && item.status === 'REQUESTED' && (
                    <>
                      <div className="w-36">
                        <Input
                          label="Montant (FC)"
                          type="number"
                          min={0}
                          value={amountDraft}
                          onChange={(e) => setAcceptAmount((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        />
                      </div>
                      <Button
                        size="sm"
                        loading={busy}
                        onClick={() => run(item.id, 'accept', { amountFc: Number(amountDraft) })}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        Accepter
                      </Button>
                      <Button size="sm" variant="ghost" loading={busy} onClick={() => run(item.id, 'decline')} leftIcon={<XCircle className="w-3.5 h-3.5" />}>
                        Refuser
                      </Button>
                    </>
                  )}
                  {item.status === 'ACCEPTED' && !item.depositMarkedAt && (
                    <Button size="sm" variant="secondary" loading={busy} onClick={() => run(item.id, 'mark-deposit')}>
                      Marquer l’acompte reçu
                    </Button>
                  )}
                  {isVendor && item.status === 'ACCEPTED' && item.depositMarkedAt && (
                    <Button size="sm" loading={busy} onClick={() => run(item.id, 'confirm')}>
                      Confirmer et bloquer la date
                    </Button>
                  )}
                  {(item.status === 'REQUESTED' || item.status === 'ACCEPTED') && (
                    <Button size="sm" variant="ghost" loading={busy} onClick={() => run(item.id, 'cancel')}>
                      Annuler
                    </Button>
                  )}
                  {item.listingSlug && (
                    <Link href={`/marketplace/salles/${item.listingSlug}`} className="inline-flex">
                      <Button size="sm" variant="ghost">Voir la fiche</Button>
                    </Link>
                  )}
                  {item.offeringSlug && (
                    <Link href={`/marketplace/prestataires/${item.offeringSlug}`} className="inline-flex">
                      <Button size="sm" variant="ghost">Voir la fiche</Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
