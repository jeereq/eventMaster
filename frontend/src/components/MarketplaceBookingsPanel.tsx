'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Alert,
  Button,
  EmptyState,
  Input,
  Modal,
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
  buildWhatsAppDirectLink,
  dashboardServiceHref,
  dashboardVenueHref,
  formatBookingPeriod,
  isServiceRentalCategory,
  parseBlockedDates,
  type MarketplaceBookingItem,
  type MarketplaceBookingStatus,
} from '@/lib/marketplace';
import { eventDashboardHref } from '@/lib/eventRoutes';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import { Building2, CalendarCheck, CheckCircle2, ChevronDown, Coins, CreditCard, KeyRound, MessageCircle, Phone, Sparkles, XCircle } from 'lucide-react';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { commissionPercent, depositPercent } from '@/lib/platformRates';

const KIND_OPTIONS = [
  { id: 'all', label: 'Tous' },
  { id: 'venue', label: 'Salles' },
  { id: 'service', label: 'Prestataires' },
  { id: 'rental', label: 'Matériel & Équipements' },
] as const;

const DECLINE_BOOKING_REASONS = [
  'Date indisponible / Conflit d’agenda',
  'Capacité ou équipement non disponible',
  'Conditions ou contraintes logistiques',
  'Changement de programme de l’événement',
  'Autre motif personnalisé',
] as const;

function toneFor(status: MarketplaceBookingStatus): 'amber' | 'emerald' | 'slate' | 'rose' {
  if (status === 'CONFIRMED' || status === 'COMPLETED') return 'emerald';
  if (status === 'ACCEPTED') return 'amber';
  if (status === 'CANCELLED') return 'rose';
  return 'slate';
}

function kindLabel(item: MarketplaceBookingItem) {
  if (item.kind === 'venue') return 'Salle';
  return isServiceRentalCategory(item.offeringCategory) ? 'Matériel & Équipements' : 'Prestataire';
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
      {BOOKING_PIPELINE_STEPS.map((step, i) => {
        const isCurrent = i === idx;
        const isPassed = i < idx;
        return (
          <li key={step.id} className="flex items-center gap-1.5">
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border transition flex items-center gap-1',
                isCurrent
                  ? 'bg-primary-solid text-primary-foreground border-primary-solid shadow-xs ring-2 ring-primary/20'
                  : isPassed
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                    : 'border-border text-muted bg-surface/60 opacity-60',
              )}
            >
              {isPassed ? <CheckCircle2 className="w-2.5 h-2.5" /> : null}
              {step.label}
            </span>
            {i < BOOKING_PIPELINE_STEPS.length - 1 && (
              <span className="text-border text-[10px] select-none" aria-hidden>
                →
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function MarketplaceBookingsPanel({
  bookings,
  commissionDueFc,
  onChanged,
  organizerView = false,
  highlightBookingId,
}: {
  bookings: MarketplaceBookingItem[];
  commissionDueFc: number;
  onChanged: () => Promise<void> | void;
  organizerView?: boolean;
  highlightBookingId?: string | null;
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
  const [calendarOpen, setCalendarOpen] = useState(!organizerView);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [acceptAmount, setAcceptAmount] = useState<Record<string, string>>({});
  const [cancelModal, setCancelModal] = useState<{ item: MarketplaceBookingItem; action: 'decline' | 'cancel' } | null>(null);
  const [cancelReasonChoice, setCancelReasonChoice] = useState<string>(DECLINE_BOOKING_REASONS[0]);
  const [cancelCustomReason, setCancelCustomReason] = useState('');
  const [cancelNotes, setCancelNotes] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Modale Déclaration / Validation d'acompte
  const [depositModal, setDepositModal] = useState<MarketplaceBookingItem | null>(null);
  const [depositNote, setDepositNote] = useState('');
  const [depositSubmitting, setDepositSubmitting] = useState(false);

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
      const hay = [b.title, b.vendorName, b.organizerName, b.notes, b.event?.title].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    const day = (b.eventDate || '').slice(0, 10);
    const end = (b.eventEndDate || b.eventDate || '').slice(0, 10);
    if (fromDate && end && end < fromDate) return false;
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
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setCalendarOpen((open) => !open)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl border border-border bg-surface text-left"
          >
            <span className="text-xs font-semibold text-foreground">
              Calendrier des réservations
              {fromDate || toDate ? (
                <span className="ml-2 text-primary font-medium">
                  · filtre actif
                </span>
              ) : null}
            </span>
            <ChevronDown className={cn('w-4 h-4 text-muted transition', calendarOpen && 'rotate-180')} />
          </button>
          {calendarOpen ? (
            <AvailabilityCalendar
              compact={organizerView}
              title="Cliquez un jour pour filtrer"
              bookedDates={calendarDates}
              selectedDate={fromDate && toDate && fromDate === toDate ? fromDate : fromDate || undefined}
              selectedEndDate={fromDate && toDate ? toDate : undefined}
              onSelectRange={(from, to) => {
                if (!from) {
                  setFromDate('');
                  setToDate('');
                  return;
                }
                setFromDate(from);
                setToDate(to || from);
              }}
              minDate="1970-01-01"
              allowBookedSelection
            />
          ) : null}
        </div>
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
          title={bookings.length ? 'Aucune réservation trouvée' : 'Aucune réservation'}
          description={bookings.length
            ? 'Modifiez vos filtres de recherche.'
            : organizerView
              ? 'Vos réservations de salles et prestataires apparaîtront ici.'
              : 'Vos réservations confirmées s’afficheront ici.'}
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
                item.event?.title ? `événement ${item.event.title}` : null,
                item.depositMarkedAt ? 'acompte marqué' : null,
              ].filter(Boolean);

              const waPresetMsg = isVendor
                ? `Bonjour, je vous contacte au sujet de votre réservation pour « ${item.title} » (${formatBookingPeriod(item.eventDate, item.eventEndDate)}) sur EventMaster.`
                : `Bonjour, je vous contacte au sujet de ma réservation pour « ${item.title} » (${formatBookingPeriod(item.eventDate, item.eventEndDate)}) sur EventMaster.`;
              const waUrl = buildWhatsAppDirectLink(item.vendorPhone, waPresetMsg);

              const actions = (
                <div className="flex flex-wrap items-center gap-1.5">
                  {waUrl && !isVendor ? (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex"
                      title="Échanger directement par WhatsApp"
                    >
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                      >
                        WhatsApp
                      </Button>
                    </a>
                  ) : null}

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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setCancelModal({ item, action: 'decline' });
                          setCancelReasonChoice(DECLINE_BOOKING_REASONS[0]);
                          setCancelCustomReason('');
                          setCancelNotes('');
                        }}
                        leftIcon={<XCircle className="w-3.5 h-3.5 text-rose-500" />}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        Refuser
                      </Button>
                    </>
                  ) : null}
                  {item.status === 'ACCEPTED' && !item.depositMarkedAt ? (
                    <Button
                      size="sm"
                      loading={busy}
                      variant="primary"
                      onClick={() => {
                        setDepositModal(item);
                        setDepositNote('');
                      }}
                      leftIcon={<Coins className="w-3.5 h-3.5" />}
                    >
                      {isVendor ? 'Acompte reçu' : 'J’ai versé'}
                    </Button>
                  ) : null}
                  {isVendor && item.status === 'ACCEPTED' && item.depositMarkedAt ? (
                    <Button size="sm" loading={busy} onClick={() => run(item.id, 'confirm')}>
                      Confirmer
                    </Button>
                  ) : null}
                  {(item.status === 'ACCEPTED' || (item.status === 'REQUESTED' && !isVendor)) ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCancelModal({ item, action: 'cancel' });
                        setCancelReasonChoice(DECLINE_BOOKING_REASONS[0]);
                        setCancelCustomReason('');
                        setCancelNotes('');
                      }}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
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
                  {item.vendorPhone && !isVendor ? (
                    <a href={`tel:${item.vendorPhone}`} className="inline-flex" title="Appeler le prestataire">
                      <Button size="sm" variant="ghost" leftIcon={<Phone className="w-3.5 h-3.5" />}>
                        Appeler
                      </Button>
                    </a>
                  ) : null}
                  {organizerView && item.event?.id ? (
                    <Link href={eventDashboardHref(item.event.id, { tab: 'prep' })} className="inline-flex">
                      <Button size="sm" variant="secondary">Événement</Button>
                    </Link>
                  ) : null}
                </div>
              );

              const isHighlighted = Boolean(highlightBookingId && item.id === highlightBookingId);

              return (
                <div key={item.id} className={cn('rounded-[var(--radius-card)] transition', isHighlighted && 'ring-2 ring-primary ring-offset-2 ring-offset-background')}>
                  <ProjectCard
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
                          {item.vendorPhone && !isVendor ? (
                            <p className="text-xs text-muted flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <a href={`tel:${item.vendorPhone}`} className="text-primary hover:underline">{item.vendorPhone}</a>
                            </p>
                          ) : null}
                          <BookingStepper item={item} />
                        </div>
                      )
                    }
                    description={next.detail}
                    actions={actions}
                  >
                    <div className="space-y-1.5 pt-1">
                      {item.status === 'CANCELLED' && item.declineReason ? (
                        <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-2 text-xs text-rose-800 dark:text-rose-200">
                          <span className="font-semibold">Motif :</span> {item.declineReason}
                        </div>
                      ) : null}
                      {mode === 'grid' && item.notes ? (
                        <p className="text-xs text-muted line-clamp-3 whitespace-pre-line">{item.notes}</p>
                      ) : null}
                    </div>
                  </ProjectCard>
                </div>
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

      {/* MODALE REFUS / ANNULATION RÉSERVATION */}
      <Modal
        open={Boolean(cancelModal)}
        onClose={() => {
          if (!cancelSubmitting) setCancelModal(null);
        }}
        title={cancelModal?.action === 'decline' ? 'Refuser la réservation' : 'Annuler la réservation'}
        description={
          cancelModal
            ? `Précisez la raison pour laquelle vous ${cancelModal.action === 'decline' ? 'refusez' : 'annulez'} la réservation de « ${cancelModal.item.title} ».`
            : undefined
        }
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              type="button"
              variant="ghost"
              disabled={cancelSubmitting}
              onClick={() => setCancelModal(null)}
            >
              Retour
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={cancelSubmitting}
              onClick={async () => {
                if (!cancelModal) return;
                const finalReason =
                  cancelReasonChoice === 'Autre motif personnalisé'
                    ? cancelCustomReason.trim() || 'Indisponible'
                    : cancelReasonChoice;
                const fullReason = cancelNotes.trim()
                  ? `${finalReason} — ${cancelNotes.trim()}`
                  : finalReason;
                setCancelSubmitting(true);
                try {
                  await run(cancelModal.item.id, cancelModal.action, { reason: fullReason });
                  setCancelModal(null);
                } finally {
                  setCancelSubmitting(false);
                }
              }}
              leftIcon={<XCircle className="w-4 h-4" />}
            >
              {cancelModal?.action === 'decline' ? 'Confirmer le refus' : 'Confirmer l’annulation'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">
              Motif de l’annulation *
            </label>
            <div className="space-y-1.5">
              {DECLINE_BOOKING_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={cn(
                    'flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition',
                    cancelReasonChoice === reason
                      ? 'border-primary bg-primary/5 font-medium text-foreground'
                      : 'border-border bg-surface text-muted hover:border-primary/50',
                  )}
                >
                  <input
                    type="radio"
                    name="bookingCancelReason"
                    value={reason}
                    checked={cancelReasonChoice === reason}
                    onChange={() => setCancelReasonChoice(reason)}
                    className="accent-primary"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          {cancelReasonChoice === 'Autre motif personnalisé' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Précisez le motif *
              </label>
              <Input
                placeholder="Ex: Événement reprogrammé, travaux d’entretien..."
                value={cancelCustomReason}
                onChange={(e) => setCancelCustomReason(e.target.value)}
                required
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Remarque ou message explicatif (optionnel)
            </label>
            <textarea
              rows={3}
              value={cancelNotes}
              onChange={(e) => setCancelNotes(e.target.value)}
              placeholder="Ex: Nous restons à votre disposition pour convenir d'une autre date ultérieurement."
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent transition resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* MODALE DÉCLARATION / VALIDATION D'ACOMPTE */}
      <Modal
        open={Boolean(depositModal)}
        onClose={() => {
          if (!depositSubmitting) setDepositModal(null);
        }}
        title={depositModal?.viewerRole === 'vendor' ? "Valider la réception de l'acompte" : "Déclarer le versement de l'acompte"}
        description={
          depositModal
            ? depositModal.viewerRole === 'vendor'
              ? `Confirmez que vous avez bien reçu l'acompte de ${formatFc(depositModal.depositFc)} pour « ${depositModal.title} » de la part de ${depositModal.organizerName || 'l\'organisateur'}.`
              : `Indiquez avoir effectué le versement de l'acompte de ${formatFc(depositModal.depositFc)} pour « ${depositModal.title} » auprès de ${depositModal.vendorName}.`
            : undefined
        }
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              type="button"
              variant="ghost"
              disabled={depositSubmitting}
              onClick={() => setDepositModal(null)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={depositSubmitting}
              onClick={async () => {
                if (!depositModal) return;
                setDepositSubmitting(true);
                try {
                  await run(depositModal.id, 'mark-deposit', {
                    depositNote: depositNote.trim() || undefined,
                  });
                  setDepositModal(null);
                } finally {
                  setDepositSubmitting(false);
                }
              }}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              {depositModal?.viewerRole === 'vendor' ? "Confirmer l'acompte reçu" : "J'ai versé l'acompte"}
            </Button>
          </div>
        }
      >
        {depositModal ? (
          <div className="space-y-4 py-2">
            {/* Récapitulatif financier */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Montant total prestation :</span>
                <span className="font-semibold text-foreground">{formatFc(depositModal.amountFc)}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-primary/15">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-primary" />
                  Acompte à verser ({Math.round(depositPct)} %) :
                </span>
                <span className="text-sm font-bold text-primary">{formatFc(depositModal.depositFc)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted pt-1">
                <span>Reste à payer lors du jour J :</span>
                <span className="font-medium text-foreground">{formatFc(depositModal.amountFc - depositModal.depositFc)}</span>
              </div>
            </div>

            {/* Note d'instructions pour le client */}
            {depositModal.viewerRole !== 'vendor' ? (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                  Règlement hors plateforme
                </p>
                <p className="text-[11px] leading-relaxed">
                  Effectuez le paiement directement auprès de <strong>{depositModal.vendorName}</strong> (Mobile Money M-Pesa, Orange Money, Airtel Money, ou virement).
                </p>
                {depositModal.vendorPhone ? (
                  <p className="text-[11px] font-medium pt-1 border-t border-amber-500/20">
                    Contact du prestataire : <a href={`tel:${depositModal.vendorPhone}`} className="underline font-bold">{depositModal.vendorPhone}</a>
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* Référence ou transaction Mobile Money */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Référence ou preuve de transaction (optionnel)
              </label>
              <Input
                placeholder="Ex: Réf M-Pesa MP260901.1234, Orange Money ou Note"
                value={depositNote}
                onChange={(e) => setDepositNote(e.target.value)}
              />
              <p className="text-[11px] text-muted">
                {depositModal.viewerRole === 'vendor'
                  ? "Indiquez une référence de reçu ou note interne pour votre comptabilité."
                  : "Facilite l'identification immédiate de votre versement par le prestataire."}
              </p>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
