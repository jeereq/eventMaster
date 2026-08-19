'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Alert, Button, EmptyState, Input, Pagination, paginateItems, StatusPill, usePageSize } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import {
  BOOKING_PIPELINE_STEPS,
  BOOKING_STATUS_LABELS,
  bookingDateKeys,
  bookingNextStep,
  bookingPipelineIndex,
  dashboardServiceHref,
  formatBookingPeriod,
  isServiceRentalCategory,
  parseBlockedDates,
  type MarketplaceBookingItem,
  type MarketplaceBookingStatus,
} from '@/lib/marketplace';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import { CalendarCheck, CheckCircle2, XCircle } from 'lucide-react';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { commissionPercent, depositPercent } from '@/lib/platformRates';

function toneFor(status: MarketplaceBookingStatus): 'amber' | 'emerald' | 'slate' | 'rose' {
  if (status === 'CONFIRMED' || status === 'COMPLETED') return 'emerald';
  if (status === 'ACCEPTED') return 'amber';
  if (status === 'CANCELLED') return 'rose';
  return 'slate';
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-semibold border',
        active ? 'bg-primary text-white border-primary' : 'border-border text-muted',
      )}
    >
      {children}
    </button>
  );
}

function BookingStepper({ item }: { item: MarketplaceBookingItem }) {
  if (item.status === 'CANCELLED') {
    return (
      <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">Réservation annulée</p>
    );
  }
  const idx = bookingPipelineIndex(item);
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label="Étapes de la réservation">
      {BOOKING_PIPELINE_STEPS.map((step, i) => (
        <li key={step.id} className="flex items-center gap-1.5">
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border',
              i <= idx
                ? 'bg-primary text-white border-primary'
                : 'border-border text-muted bg-surface',
            )}
          >
            {step.label}
          </span>
          {i < BOOKING_PIPELINE_STEPS.length - 1 && (
            <span className="text-border text-[10px]" aria-hidden>
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

export default function MarketplaceBookingsPanel({
  bookings,
  commissionDueFc,
  onChanged,
  organizerView = false,
}: {
  bookings: MarketplaceBookingItem[];
  commissionDueFc: number;
  onChanged: () => Promise<void> | void;
  organizerView?: boolean;
}) {
  const { site } = usePlatformSite();
  const commissionPct = commissionPercent(site);
  const depositPct = depositPercent(site);
  const [filter, setFilter] = useState<'all' | 'received' | 'sent'>(organizerView ? 'sent' : 'all');
  const [status, setStatus] = useState<'all' | MarketplaceBookingStatus>('all');
  const [kind, setKind] = useState<'all' | 'venue' | 'service' | 'rental'>('all');
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [acceptAmount, setAcceptAmount] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('marketplace-desk-bookings', 8);

  const visible = useMemo(() => bookings.filter((b) => {
    if (filter === 'received') {
      if (b.viewerRole !== 'vendor') return false;
    } else if (filter === 'sent') {
      if (b.viewerRole !== 'organizer') return false;
    }
    if (status !== 'all' && b.status !== status) return false;
    if (kind === 'venue' && b.kind !== 'venue') return false;
    if (kind === 'service' && (b.kind !== 'service' || isServiceRentalCategory(b.offeringCategory))) return false;
    if (kind === 'rental' && (b.kind !== 'service' || !isServiceRentalCategory(b.offeringCategory))) return false;
    const q = query.trim().toLowerCase();
    if (q) {
      const hay = [b.title, b.vendorName, b.organizerName, b.notes].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    const day = (b.eventDate || '').slice(0, 10);
    if (fromDate && day && day < fromDate) return false;
    if (toDate && day && day > toDate) return false;
    return true;
  }), [bookings, filter, status, kind, query, fromDate, toDate]);

  useEffect(() => {
    setPage(1);
  }, [filter, status, kind, query, fromDate, toDate, pageSize]);

  const calendarDates = parseBlockedDates(
    visible
      .filter((b) => b.status !== 'CANCELLED')
      .flatMap((b) => bookingDateKeys(b)),
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
      {!organizerView && (
      <div className="border border-border rounded-[var(--radius-card)] bg-surface p-4 text-sm">
        <p className="font-semibold text-foreground">Commission marketplace due</p>
        <p className="text-lg font-semibold mt-1">{formatFc(commissionDueFc)}</p>
        <p className="text-xs text-muted mt-1 leading-relaxed">
          {commissionPct} % sur les réservations confirmées dont vous êtes le vendeur. Distincte de l’abonnement SaaS.
          L’acompte ({depositPct} %) se verse hors plateforme.
        </p>
      </div>
      )}

      {calendarDates.length > 0 && (
        <AvailabilityCalendar title="Calendrier des réservations" bookedDates={calendarDates} />
      )}

      {error && <Alert variant="error">{error}</Alert>}

      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3 sm:p-4 space-y-3">
        {!organizerView && (
        <div className="flex gap-1.5 flex-wrap">
          {([
            ['all', 'Toutes'],
            ['received', 'Reçues'],
            ['sent', 'Envoyées'],
          ] as const).map(([id, label]) => (
            <Chip key={id} active={filter === id} onClick={() => setFilter(id)}>{label}</Chip>
          ))}
        </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          <Chip active={status === 'all'} onClick={() => setStatus('all')}>Tous statuts</Chip>
          {(Object.keys(BOOKING_STATUS_LABELS) as MarketplaceBookingStatus[]).map((id) => (
            <Chip key={id} active={status === id} onClick={() => setStatus(id)}>
              {BOOKING_STATUS_LABELS[id]}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {([
            ['all', 'Tous'],
            ['venue', 'Salles'],
            ['service', 'Prestataires'],
            ['rental', 'Locations'],
          ] as const).map(([id, label]) => (
            <Chip key={id} active={kind === id} onClick={() => setKind(id)}>{label}</Chip>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Titre, organisation…" />
          <Input label="Du" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Input label="Au" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="w-5 h-5" />}
          title={bookings.length ? 'Aucune réservation pour ces filtres' : 'Aucune réservation'}
          description={bookings.length
            ? 'Changez le statut, le type ou les dates pour élargir la recherche.'
            : 'Les demandes de date (salles, prestations et locations) apparaîtront ici.'}
        />
      ) : (
        <>
        <div className="space-y-3">
          {paginateItems(visible, page, pageSize).map((item) => {
            const isVendor = item.viewerRole === 'vendor';
            const busy = busyId === item.id;
            const amountDraft = acceptAmount[item.id] ?? String(item.amountFc);
            const next = bookingNextStep(item, depositPct);
            const listingHref = item.listingSlug
              ? `/dashboard/catalogue/salles/${item.listingSlug}`
              : item.offeringSlug
                ? dashboardServiceHref(item.offeringSlug, item.offeringCategory)
                : null;
            const isRental = isServiceRentalCategory(item.offeringCategory);
            return (
              <article key={item.id} className="border border-border rounded-[var(--radius-card)] bg-surface p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                      {item.kind === 'venue' ? 'Salle' : isRental ? 'Location' : 'Prestation'} · {isVendor ? 'Reçue' : 'Envoyée'}
                    </p>
                    <h3 className="font-semibold text-sm mt-0.5">{item.title}</h3>
                    <p className="text-xs text-muted mt-0.5">
                      {isVendor ? item.organizerName || 'Organisateur' : item.vendorName}
                      {' · '}
                      {formatBookingPeriod(item.eventDate, item.eventEndDate)}
                    </p>
                  </div>
                  <StatusPill tone={toneFor(item.status)}>{BOOKING_STATUS_LABELS[item.status]}</StatusPill>
                </div>

                <BookingStepper item={item} />

                <p className="text-xs text-muted">
                  {formatFc(item.amountFc)} · acompte {formatFc(item.depositFc)}
                  {isVendor ? ` · commission ${formatFc(item.commissionFc)}` : ''}
                  {item.depositMarkedAt ? ' · acompte marqué' : ''}
                </p>
                {item.notes && <p className="text-sm text-muted whitespace-pre-line">{item.notes}</p>}

                <div className="rounded-lg border border-border bg-surface-muted/70 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Prochaine étape</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{next.title}</p>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">{next.detail}</p>
                </div>

                <div className="flex flex-wrap gap-2 pt-0.5 items-end">
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
                    <Button size="sm" loading={busy} onClick={() => run(item.id, 'mark-deposit')}>
                      {isVendor ? 'Marquer l’acompte reçu' : 'J’ai versé l’acompte'}
                    </Button>
                  )}
                  {isVendor && item.status === 'ACCEPTED' && item.depositMarkedAt && (
                    <Button size="sm" loading={busy} onClick={() => run(item.id, 'confirm')}>
                      Confirmer et bloquer la date
                    </Button>
                  )}
                  {(item.status === 'ACCEPTED' || (item.status === 'REQUESTED' && !isVendor)) && (
                    <Button size="sm" variant="ghost" loading={busy} onClick={() => run(item.id, 'cancel')}>
                      Annuler
                    </Button>
                  )}
                  {listingHref && (
                    <Link href={listingHref} className="inline-flex">
                      <Button size="sm" variant="ghost">Voir la fiche</Button>
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <Pagination
          page={page}
          pageSize={pageSize}
          total={visible.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="réservations"
        />
        </>
      )}
    </div>
  );
}
