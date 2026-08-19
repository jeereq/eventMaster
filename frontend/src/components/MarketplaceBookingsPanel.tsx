'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Alert,
  Button,
  EmptyState,
  Input,
  Pagination,
  paginateItems,
  ProjectCard,
  StatusPill,
  ListRowAction,
  listStackClass,
  usePageSize,
  useViewMode,
  ViewModeToggle,
} from '@/components/ui';
import CatalogueFilterBar, {
  CatalogueChoicePills,
  CatalogueFilterField,
  type CatalogueFilterChip,
} from '@/components/CatalogueFilterBar';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import {
  BOOKING_PIPELINE_STEPS,
  BOOKING_STATUS_LABELS,
  bookingDateKeys,
  bookingNextStep,
  bookingPipelineIndex,
  dashboardServiceHref,
  dashboardVenueHref,
  formatBookingPeriod,
  isServiceRentalCategory,
  parseBlockedDates,
  type MarketplaceBookingItem,
  type MarketplaceBookingStatus,
} from '@/lib/marketplace';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import { Building2, CalendarCheck, CheckCircle2, KeyRound, Sparkles, XCircle } from 'lucide-react';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { commissionPercent, depositPercent } from '@/lib/platformRates';

const KIND_OPTIONS = [
  { id: 'all', label: 'Tous' },
  { id: 'venue', label: 'Salles' },
  { id: 'service', label: 'Métiers' },
  { id: 'rental', label: 'Locations' },
] as const;

function toneFor(status: MarketplaceBookingStatus): 'amber' | 'emerald' | 'slate' | 'rose' {
  if (status === 'CONFIRMED' || status === 'COMPLETED') return 'emerald';
  if (status === 'ACCEPTED') return 'amber';
  if (status === 'CANCELLED') return 'rose';
  return 'slate';
}

function kindLabel(item: MarketplaceBookingItem) {
  if (item.kind === 'venue') return 'Salle';
  return isServiceRentalCategory(item.offeringCategory) ? 'Location' : 'Métier';
}

function kindIcon(item: MarketplaceBookingItem) {
  if (item.kind === 'venue') return <Building2 className="w-4 h-4" />;
  if (isServiceRentalCategory(item.offeringCategory)) return <KeyRound className="w-4 h-4" />;
  return <Sparkles className="w-4 h-4" />;
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
  const [filter, setFilter] = useState(organizerView ? 'sent' : '');
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState('');
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [acceptAmount, setAcceptAmount] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('marketplace-desk-bookings', 9);
  const { mode, setViewMode, columns, setGridColumns, gridClassName } = useViewMode(
    organizerView ? 'em-view-organizer-bookings' : 'em-view-vendor-bookings',
    'grid',
    2,
  );

  const visible = useMemo(() => bookings.filter((b) => {
    if (filter === 'received' && b.viewerRole !== 'vendor') return false;
    if (filter === 'sent' && b.viewerRole !== 'organizer') return false;
    if (status && status !== 'all' && b.status !== status) return false;
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
  }, [filter, status, kind, query, fromDate, toDate, pageSize, mode]);

  const calendarDates = parseBlockedDates(
    visible
      .filter((b) => b.status !== 'CANCELLED')
      .flatMap((b) => bookingDateKeys(b)),
  );

  const chips: CatalogueFilterChip[] = [
    ...(!organizerView && filter && filter !== 'all'
      ? [{ id: 'filter', label: 'Sens', value: filter === 'received' ? 'Reçues' : 'Envoyées' }]
      : []),
    ...(status && status !== 'all'
      ? [{ id: 'status', label: 'Statut', value: BOOKING_STATUS_LABELS[status as MarketplaceBookingStatus] || status }]
      : []),
    ...(kind && kind !== 'all'
      ? [{
          id: 'kind',
          label: 'Type',
          value: KIND_OPTIONS.find((item) => item.id === kind)?.label || kind,
          tone: kind === 'venue' ? 'venue' as const : kind === 'service' ? 'service' as const : 'neutral' as const,
        }]
      : []),
    ...(fromDate ? [{ id: 'from', label: 'Du', value: new Date(`${fromDate}T12:00:00`).toLocaleDateString('fr-FR') }] : []),
    ...(toDate ? [{ id: 'to', label: 'Au', value: new Date(`${toDate}T12:00:00`).toLocaleDateString('fr-FR') }] : []),
  ];

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

      <CatalogueFilterBar
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Titre, organisation…"
        view={mode}
        onViewChange={(next) => {
          if (next === 'grid' || next === 'list') setViewMode(next);
        }}
        hideViewToggle
        hideShare
        actions={
          <ViewModeToggle
            storageKey={organizerView ? 'em-view-organizer-bookings' : 'em-view-vendor-bookings'}
            value={mode}
            onChange={setViewMode}
            columns={columns}
            onColumnsChange={setGridColumns}
          />
        }
        chips={chips}
        onRemoveChip={(id) => {
          if (id === 'filter') setFilter('');
          if (id === 'status') setStatus('');
          if (id === 'kind') setKind('');
          if (id === 'from') setFromDate('');
          if (id === 'to') setToDate('');
        }}
        onClearChips={() => {
          setFilter(organizerView ? 'sent' : '');
          setStatus('');
          setKind('');
          setQuery('');
          setFromDate('');
          setToDate('');
        }}
        resultLabel={`${visible.length} réservation${visible.length > 1 ? 's' : ''}`}
        modalTitle="Filtrer les réservations"
        filters={
          <>
            {!organizerView ? (
              <CatalogueFilterField label="Sens">
                <CatalogueChoicePills
                  options={[
                    { id: 'all', label: 'Toutes' },
                    { id: 'received', label: 'Reçues' },
                    { id: 'sent', label: 'Envoyées' },
                  ]}
                  value={filter || 'all'}
                  onChange={setFilter}
                />
              </CatalogueFilterField>
            ) : null}
            <CatalogueFilterField label="Statut">
              <CatalogueChoicePills
                options={[
                  { id: 'all', label: 'Tous' },
                  ...(Object.keys(BOOKING_STATUS_LABELS) as MarketplaceBookingStatus[]).map((id) => ({
                    id,
                    label: BOOKING_STATUS_LABELS[id],
                  })),
                ]}
                value={status || 'all'}
                onChange={setStatus}
              />
            </CatalogueFilterField>
            <CatalogueFilterField label="Type">
              <CatalogueChoicePills
                options={[...KIND_OPTIONS]}
                value={kind || 'all'}
                onChange={setKind}
              />
            </CatalogueFilterField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CatalogueFilterField label="Date de début">
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </CatalogueFilterField>
              <CatalogueFilterField label="Date de fin">
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </CatalogueFilterField>
            </div>
          </>
        }
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="w-5 h-5" />}
          title={bookings.length ? 'Aucune réservation pour ces filtres' : 'Aucune réservation'}
          description={bookings.length
            ? 'Changez le statut, le type ou les dates pour élargir la recherche.'
            : organizerView
              ? 'Les demandes de dates envoyées aux salles, métiers et locations apparaîtront ici.'
              : 'Les demandes de date (salles, prestations et locations) apparaîtront ici.'}
        />
      ) : (
        <>
          <div className={mode === 'grid' ? gridClassName : listStackClass}>
            {paginateItems(visible, page, pageSize).map((item) => {
              const isVendor = item.viewerRole === 'vendor';
              const busy = busyId === item.id;
              const amountDraft = acceptAmount[item.id] ?? String(item.amountFc);
              const next = bookingNextStep(item, depositPct);
              const listingHref = item.listingSlug
                ? dashboardVenueHref(item.listingSlug)
                : item.offeringSlug
                  ? dashboardServiceHref(item.offeringSlug, item.offeringCategory)
                  : null;
              const statusChip = (
                <StatusPill tone={toneFor(item.status)}>{BOOKING_STATUS_LABELS[item.status]}</StatusPill>
              );
              const metaBits = [
                kindLabel(item),
                isVendor ? item.organizerName || 'Organisateur' : item.vendorName,
                formatBookingPeriod(item.eventDate, item.eventEndDate),
                item.depositMarkedAt ? 'acompte marqué' : null,
              ].filter(Boolean);

              const actions = (
                <div className="flex flex-wrap items-center gap-1.5">
                  {isVendor && item.status === 'REQUESTED' && mode === 'grid' ? (
                    <div className="w-28">
                      <Input
                        label="Montant (FC)"
                        type="number"
                        min={0}
                        value={amountDraft}
                        onChange={(e) => setAcceptAmount((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      />
                    </div>
                  ) : null}
                  {isVendor && item.status === 'REQUESTED' ? (
                    <>
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
                  ) : null}
                  {item.status === 'ACCEPTED' && !item.depositMarkedAt ? (
                    <Button size="sm" loading={busy} onClick={() => run(item.id, 'mark-deposit')}>
                      {isVendor ? 'Acompte reçu' : 'J’ai versé'}
                    </Button>
                  ) : null}
                  {isVendor && item.status === 'ACCEPTED' && item.depositMarkedAt ? (
                    <Button size="sm" loading={busy} onClick={() => run(item.id, 'confirm')}>
                      Confirmer
                    </Button>
                  ) : null}
                  {(item.status === 'ACCEPTED' || (item.status === 'REQUESTED' && !isVendor)) ? (
                    <Button size="sm" variant="ghost" loading={busy} onClick={() => run(item.id, 'cancel')}>
                      Annuler
                    </Button>
                  ) : null}
                  {listingHref ? (
                    mode === 'list' ? (
                      <Link href={listingHref} className="inline-flex">
                        <ListRowAction />
                      </Link>
                    ) : (
                      <Link href={listingHref} className="inline-flex">
                        <Button size="sm" variant="ghost">Voir la fiche</Button>
                      </Link>
                    )
                  ) : null}
                </div>
              );

              return (
                <ProjectCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  layout={mode}
                  icon={kindIcon(item)}
                  hideCta
                  status={statusChip}
                  overlayMeta={`${kindLabel(item)} · ${isVendor ? 'Reçue' : 'Envoyée'}`}
                  value={mode === 'list' ? formatFc(item.amountFc) : undefined}
                  valueMeta={mode === 'list' ? `Acompte ${formatFc(item.depositFc)}` : undefined}
                  meta={
                    mode === 'list' ? (
                      <span className="truncate">{metaBits.join(' · ')}</span>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="truncate text-xs">{metaBits.join(' · ')}</p>
                        <p className="text-xs text-muted">
                          {formatFc(item.amountFc)} · acompte {formatFc(item.depositFc)}
                          {isVendor ? ` · commission ${formatFc(item.commissionFc)}` : ''}
                        </p>
                        <BookingStepper item={item} />
                      </div>
                    )
                  }
                  description={next.detail}
                  actions={actions}
                >
                  {mode === 'grid' && item.notes ? (
                    <p className="text-xs text-muted line-clamp-3 whitespace-pre-line">{item.notes}</p>
                  ) : null}
                </ProjectCard>
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
