'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import {
  Alert,
  Button,
  EmptyState,
  Input,
  Modal,
  Pagination,
  usePaginateItems,
  StatusPill,
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
import { DealDeclineBlock, MarketplaceDealCard, type MarketplaceDealFact } from '@/components/MarketplaceDealCard';
import {
  BOOKING_PIPELINE_STEPS,
  BOOKING_STATUS_LABELS,
  bookingDateKeys,
  bookingNextStep,
  bookingOverlapsDay,
  bookingPipelineIndex,
  eachDateKey,
  buildWhatsAppDirectLink,
  dashboardServiceHref,
  dashboardVenueHref,
  formatBookingPeriod,
  formatDateKeyFr,
  isConfirmedBookingStatus,
  isPendingBookingStatus,
  isServiceRentalCategory,
  parseBlockedDates,
  subtractDateKeys,
  uniqueDateKeys,
  type MarketplaceBookingItem,
  type MarketplaceBookingStatus,
} from '@/lib/marketplace';
import { eventDashboardHref } from '@/lib/eventRoutes';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import { Ban, Building2, CalendarCheck, CalendarDays, CheckCircle2, ChevronDown, Coins, CreditCard, KeyRound, MessageCircle, MessageSquareQuote, Phone, Sparkles, Star, XCircle } from 'lucide-react';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { useAuth } from '@/context/AuthContext';
import { ReviewStars, ReviewStarsInput } from '@/components/marketplace/ReviewStars';
import { commissionPercent, depositPercent } from '@/lib/platformRates';
import OnlineDepositSettings from '@/components/marketplace/OnlineDepositSettings';
import { segmentedItem, SEGMENTED_TRACK } from '@/components/ui/segmented';
import type { MarketplaceDepositPayment } from '@/lib/marketplace';

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

const MAX_UNAVAILABLE_PREVIEW = 5;
const STATUS_SUMMARY_ORDER: MarketplaceBookingStatus[] = [
  'REQUESTED',
  'ACCEPTED',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
];

function extraUnavailableDates(item: MarketplaceBookingItem): string[] {
  const own = new Set(bookingDateKeys(item));
  return parseBlockedDates(item.blockedDates).filter((day) => !own.has(day));
}

function formatDayLong(key: string) {
  return new Date(`${key}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function BookingUnavailability({
  item,
  onFocusDate,
}: {
  item: MarketplaceBookingItem;
  onFocusDate?: (day: string) => void;
}) {
  const extras = extraUnavailableDates(item);
  const confirmed = isConfirmedBookingStatus(item.status);
  if (!confirmed && extras.length === 0) return null;
  const preview = extras.slice(0, MAX_UNAVAILABLE_PREVIEW);
  return (
    <div className="rounded-xl border border-festive-accent/25 bg-festive-accent/8 p-2.5 space-y-1.5">
      {confirmed ? (
        <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
          <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
          Dates confirmées et bloquées au calendrier du prestataire
        </p>
      ) : null}
      {extras.length ? (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-festive-accent flex items-center gap-1.5">
            <Ban className="w-3.5 h-3.5 shrink-0" />
            Autres indisponibilités du prestataire
          </p>
          <div className="flex flex-wrap gap-1">
            {preview.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => onFocusDate?.(day)}
                className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-festive-accent/10 text-festive-accent border border-festive-accent/20 hover:bg-festive-accent/20"
              >
                {formatDateKeyFr(day)}
              </button>
            ))}
            {extras.length > MAX_UNAVAILABLE_PREVIEW ? (
              <span className="text-[10px] text-muted self-center">
                +{extras.length - MAX_UNAVAILABLE_PREVIEW}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BookingStepper({ item }: { item: MarketplaceBookingItem }) {
  if (item.status === 'CANCELLED') {
    return (
      <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">Réservation annulée</p>
    );
  }
  const idx = bookingPipelineIndex(item);
  const current = BOOKING_PIPELINE_STEPS[idx];
  return (
    <div className="space-y-2">
      {current ? (
        <p className="text-xs font-semibold text-foreground sm:hidden">
          {current.label}
          <span className="font-normal text-muted">
            {' '}· étape {idx + 1} sur {BOOKING_PIPELINE_STEPS.length}
          </span>
        </p>
      ) : null}
      <ol className="flex gap-1.5" aria-label="Étapes de la réservation">
        {BOOKING_PIPELINE_STEPS.map((step, i) => {
          const isCurrent = i === idx;
          const isPassed = i < idx;
          return (
            <li key={step.id} className="min-w-0 flex-1">
              <span
                className={cn(
                  'block h-1.5 rounded-full',
                  isCurrent || isPassed ? 'bg-primary-solid' : 'bg-border',
                  isCurrent && 'ring-2 ring-primary/25',
                )}
              />
              <span
                className={cn(
                  'mt-1 hidden text-[11px] font-medium leading-tight sm:block',
                  isCurrent ? 'text-foreground' : isPassed ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted',
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function MarketplaceBookingsPanel({
  bookings,
  commissionDueFc,
  onChanged,
  organizerView = false,
  highlightBookingId,
  vendorBlockedDates = [],
}: {
  bookings: MarketplaceBookingItem[];
  commissionDueFc: number;
  onChanged: () => Promise<void> | void;
  organizerView?: boolean;
  highlightBookingId?: string | null;
  vendorBlockedDates?: string[];
}) {
  const { site } = usePlatformSite();
  const { access } = useAuth();
  /** Côté prestataire, seuls le propriétaire et les managers traitent les réservations. */
  const canHandleAsVendor = Boolean(access?.canManageRooms);
  const commissionPct = commissionPercent(site);
  const depositPct = depositPercent(site);
  const [filter, setFilter] = useState(organizerView ? 'sent' : '');
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState('');
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [acceptAmount, setAcceptAmount] = useState<Record<string, string>>({});
  const [cancelModal, setCancelModal] = useState<{ item: MarketplaceBookingItem; action: 'decline' | 'cancel' } | null>(null);
  const [cancelReasonChoice, setCancelReasonChoice] = useState<string>(DECLINE_BOOKING_REASONS[0]);
  const [cancelCustomReason, setCancelCustomReason] = useState('');
  const [cancelNotes, setCancelNotes] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Avis client (après la date) et réponse du prestataire
  const [reviewModal, setReviewModal] = useState<MarketplaceBookingItem | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [replyModal, setReplyModal] = useState<MarketplaceBookingItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const submitReview = async () => {
    if (!reviewModal || reviewRating < 1) return;
    setReviewSubmitting(true);
    setReviewError('');
    try {
      await api.post(`/marketplace/bookings/${reviewModal.id}/review`, { rating: reviewRating, comment: reviewComment });
      setReviewModal(null);
      await onChanged();
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : 'Impossible d’envoyer votre avis.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const submitReply = async () => {
    if (!replyModal?.review) return;
    setReviewSubmitting(true);
    setReviewError('');
    try {
      await api.post(`/marketplace/reviews/${replyModal.review.id}/reply`, { reply: replyText });
      setReplyModal(null);
      await onChanged();
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : 'Impossible d’enregistrer la réponse.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Modale Déclaration / Validation d'acompte
  const [depositModal, setDepositModal] = useState<MarketplaceBookingItem | null>(null);
  const [depositNote, setDepositNote] = useState('');
  const [depositSubmitting, setDepositSubmitting] = useState(false);

  // Paiement de l'acompte en ligne (si le prestataire l'a activé)
  const searchParams = useSearchParams();
  const [payModal, setPayModal] = useState<MarketplaceBookingItem | null>(null);
  const [payMethod, setPayMethod] = useState<'mobile' | 'card'>('mobile');
  const [payPhone, setPayPhone] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payError, setPayError] = useState('');
  // Retour de la page de paiement par carte : on reprend le suivi du paiement.
  const [payWatch, setPayWatch] = useState<{ bookingId: string; paymentId: string } | null>(() => {
    const paymentId = searchParams.get('paymentId');
    const bookingId = searchParams.get('bookingId');
    return searchParams.get('deposit') === 'return' && paymentId && bookingId ? { bookingId, paymentId } : null;
  });
  const [payNotice, setPayNotice] = useState<{ tone: 'info' | 'success' | 'error'; text: string } | null>(() => {
    const state = searchParams.get('deposit');
    if (state === 'return') return { tone: 'info', text: 'Paiement en cours de vérification…' };
    if (state === 'canceled') return { tone: 'info', text: 'Paiement de l’acompte interrompu. Vous pouvez réessayer.' };
    return null;
  });
  const onChangedRef = useRef(onChanged);
  useEffect(() => {
    onChangedRef.current = onChanged;
  });

  // Suivi du paiement : la validation Mobile Money peut prendre une minute.
  useEffect(() => {
    if (!payWatch) return;
    let stopped = false;
    let attempts = 0;
    const tick = async () => {
      if (stopped) return;
      attempts += 1;
      try {
        const data = await api.get(`/marketplace/bookings/${payWatch.bookingId}/deposit-payment/${payWatch.paymentId}`);
        const payment = data.payment as MarketplaceDepositPayment | null;
        if (payment?.status === 'PAID') {
          setPayNotice({ tone: 'success', text: 'Acompte payé. Le prestataire va confirmer la réservation.' });
          setPayWatch(null);
          await onChangedRef.current();
          return;
        }
        if (payment?.status === 'FAILED') {
          setPayNotice({ tone: 'error', text: 'Le paiement a échoué ou a été refusé. Vous pouvez réessayer.' });
          setPayWatch(null);
          await onChangedRef.current();
          return;
        }
      } catch {
        /* nouvel essai au prochain passage */
      }
      if (attempts >= 40) {
        setPayNotice({ tone: 'info', text: 'Paiement toujours en attente. Il sera pris en compte dès que l’opérateur le confirme.' });
        setPayWatch(null);
        return;
      }
      window.setTimeout(tick, 4000);
    };
    const first = window.setTimeout(tick, 3000);
    return () => {
      stopped = true;
      window.clearTimeout(first);
    };
  }, [payWatch]);

  const submitPayment = async () => {
    if (!payModal) return;
    setPaySubmitting(true);
    setPayError('');
    try {
      const data = await api.post(`/marketplace/bookings/${payModal.id}/deposit-payment`, {
        paymentMethod: payMethod,
        phone: payMethod === 'mobile' ? payPhone : undefined,
      });
      if (data.paymentMethod === 'card' && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      setPayModal(null);
      setPayNotice({ tone: 'info', text: data.message || 'Validez le paiement sur votre téléphone.' });
      setPayWatch({ bookingId: payModal.id, paymentId: data.paymentId });
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : 'Impossible de lancer le paiement.');
    } finally {
      setPaySubmitting(false);
    }
  };

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
  const pagedVisible = usePaginateItems(visible, page, pageSize);

  useEffect(() => {
    setPage(1);
  }, [filter, status, kind, query, fromDate, toDate, pageSize, mode]);

  const confirmedDates = useMemo(
    () => uniqueDateKeys(...bookings.filter((b) => isConfirmedBookingStatus(b.status)).map((b) => bookingDateKeys(b))),
    [bookings],
  );
  const pendingDates = useMemo(
    () => uniqueDateKeys(...bookings.filter((b) => isPendingBookingStatus(b.status)).map((b) => bookingDateKeys(b))),
    [bookings],
  );
  const resourceBlockedDates = useMemo(
    () => uniqueDateKeys(vendorBlockedDates, ...bookings.map((b) => b.blockedDates)),
    [bookings, vendorBlockedDates],
  );
  const unavailableOnlyDates = useMemo(
    () => subtractDateKeys(resourceBlockedDates, [...confirmedDates, ...pendingDates]),
    [resourceBlockedDates, confirmedDates, pendingDates],
  );
  const unavailableOnlySet = useMemo(() => new Set(unavailableOnlyDates), [unavailableOnlyDates]);
  const hasAgendaDates = confirmedDates.length + pendingDates.length + unavailableOnlyDates.length > 0;

  const statusCounts = useMemo(() => {
    const counts: Record<MarketplaceBookingStatus, number> = {
      REQUESTED: 0,
      ACCEPTED: 0,
      CONFIRMED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    for (const item of bookings) counts[item.status] += 1;
    return counts;
  }, [bookings]);

  const selectedRangeKeys = useMemo(
    () => (fromDate ? eachDateKey(fromDate, toDate || fromDate) : []),
    [fromDate, toDate],
  );
  const selectedDayBookings = useMemo(() => {
    if (!fromDate) return [];
    return visible.filter((item) => selectedRangeKeys.some((day) => bookingOverlapsDay(item, day)));
  }, [visible, fromDate, selectedRangeKeys]);
  const selectedRangeHasBlocked = selectedRangeKeys.some((day) => unavailableOnlySet.has(day));

  const focusDay = (day: string) => {
    setFromDate(day);
    setToDate(day);
    setCalendarOpen(true);
  };

  useEffect(() => {
    if (!highlightBookingId) return;
    const item = bookings.find((row) => row.id === highlightBookingId);
    if (!item) return;
    const start = String(item.eventDate || '').slice(0, 10);
    const end = String(item.eventEndDate || item.eventDate || '').slice(0, 10);
    if (!start) return;
    setFromDate(start);
    setToDate(end || start);
    setCalendarOpen(true);
  }, [highlightBookingId, bookings]);

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
        <div className="flex flex-wrap items-center justify-between gap-3 border border-border rounded-[var(--radius-card)] bg-surface px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-foreground">Commission marketplace à régler</p>
            <p className="text-[11px] text-muted mt-0.5">
              {commissionPct} % des réservations confirmées, hors commissions déjà payées ou retenues sur un acompte en ligne
            </p>
          </div>
          <p className="text-lg font-semibold tabular-nums">{formatFc(commissionDueFc)}</p>
        </div>
      )}
      {!organizerView && canHandleAsVendor ? (
        <OnlineDepositSettings depositPct={depositPct} commissionPct={commissionPct} onSaved={onChanged} />
      ) : null}

      {error && <Alert variant="error">{error}</Alert>}
      {payNotice ? <Alert variant={payNotice.tone}>{payNotice.text}</Alert> : null}

      <div className="lg:grid lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)] lg:gap-5 lg:items-start">
      <aside className="lg:sticky lg:top-4 space-y-3 mb-4 lg:mb-0">
        <button
          type="button"
          onClick={() => setCalendarOpen((open) => !open)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl border border-border bg-surface text-left lg:hidden"
        >
          <span className="text-xs font-semibold text-foreground inline-flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            Agenda
            {fromDate || toDate ? <span className="text-primary font-medium">· filtre actif</span> : null}
          </span>
          <ChevronDown className={cn('w-4 h-4 text-muted transition', calendarOpen && 'rotate-180')} />
        </button>
        <div className={cn('space-y-3', !calendarOpen && 'hidden lg:block')}>
            <AvailabilityCalendar
              compact
              className="shadow-[var(--shadow-soft)]"
              title={organizerView ? 'Agenda de vos réservations' : 'Agenda prestataire'}
              bookedDates={confirmedDates}
              pendingDates={pendingDates}
              blockedDates={unavailableOnlyDates}
              bookedTone="emerald"
              bookedLabel="Confirmé"
              pendingLabel="En cours"
              blockedLabel="Indisponible"
              selectedDate={fromDate || undefined}
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
            {!hasAgendaDates ? (
              <p className="text-[11px] text-muted px-1">
                Aucune date confirmée ni indisponibilité pour le moment. Les jours bloqués par le prestataire apparaîtront ici.
              </p>
            ) : null}
            {fromDate ? (
              <div className="rounded-2xl border border-border bg-surface p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Jour sélectionné</p>
                    <p className="text-xs font-semibold text-foreground capitalize">
                      {fromDate === (toDate || fromDate)
                        ? formatDayLong(fromDate)
                        : `${formatDateKeyFr(fromDate)} → ${formatDateKeyFr(toDate || fromDate)}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFromDate('');
                      setToDate('');
                    }}
                    className="text-[11px] font-semibold text-muted hover:text-foreground underline-offset-2 hover:underline"
                  >
                    Effacer
                  </button>
                </div>
                {selectedDayBookings.length ? (
                  <ul className="space-y-1.5">
                    {selectedDayBookings.map((item) => (
                      <li key={item.id} className="text-xs leading-snug">
                        <span className="font-semibold text-foreground">{item.title}</span>
                        <span className="text-muted">
                          {' '}· {BOOKING_STATUS_LABELS[item.status]} · {formatBookingPeriod(item.eventDate, item.eventEndDate)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted">Aucune réservation sur cette période.</p>
                )}
                {selectedRangeHasBlocked ? (
                  <p className="text-[11px] font-semibold text-festive-accent flex items-center gap-1.5">
                    <Ban className="w-3.5 h-3.5 shrink-0" />
                    Le prestataire est aussi indisponible sur un ou plusieurs de ces jours.
                  </p>
                ) : null}
              </div>
            ) : null}
        </div>
      </aside>

      <div className="space-y-4 min-w-0">
      {bookings.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setStatus('')}
            className={cn(
              'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition',
              !status || status === 'all'
                ? 'bg-foreground text-background border-foreground'
                : 'border-border bg-surface text-muted hover:text-foreground',
            )}
          >
            Toutes · {bookings.length}
          </button>
          {STATUS_SUMMARY_ORDER.map((id) => {
            const count = statusCounts[id];
            if (!count) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setStatus(status === id ? '' : id)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition',
                  status === id
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'border-border bg-surface text-muted hover:text-foreground',
                )}
              >
                {BOOKING_STATUS_LABELS[id]} · {count}
              </button>
            );
          })}
        </div>
      ) : null}

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
            {pagedVisible.map((item) => {
              const isVendor = item.viewerRole === 'vendor';
              const canAct = !isVendor || canHandleAsVendor;
              const busy = busyId === item.id;
              const amountDraft = acceptAmount[item.id] ?? String(item.amountFc);
              const next = bookingNextStep(item, depositPct);
              const listingHref = item.listingSlug
                ? dashboardVenueHref(item.listingSlug)
                : item.offeringSlug
                  ? dashboardServiceHref(item.offeringSlug, item.offeringCategory)
                  : null;
              const periodLabel = formatBookingPeriod(item.eventDate, item.eventEndDate);
              const counterpart = isVendor ? item.organizerName || 'Organisateur' : item.vendorName;
              const waPresetMsg = isVendor
                ? `Bonjour, je vous contacte au sujet de votre réservation pour « ${item.title} » (${formatBookingPeriod(item.eventDate, item.eventEndDate)}) sur EventMaster.`
                : `Bonjour, je vous contacte au sujet de ma réservation pour « ${item.title} » (${formatBookingPeriod(item.eventDate, item.eventEndDate)}) sur EventMaster.`;
              const waUrl = buildWhatsAppDirectLink(item.vendorPhone, waPresetMsg);
              const focusPeriod = () => {
                const start = String(item.eventDate || '').slice(0, 10);
                const end = String(item.eventEndDate || item.eventDate || '').slice(0, 10);
                if (!start) return;
                setFromDate(start);
                setToDate(end || start);
                setCalendarOpen(true);
              };
              const facts: MarketplaceDealFact[] = [
                { label: 'Période', value: periodLabel, onClick: item.eventDate ? focusPeriod : undefined },
              ];
              if (counterpart) facts.push({ label: isVendor ? 'Client' : 'Professionnel', value: counterpart });
              if (item.event?.title) facts.push({ label: 'Événement', value: item.event.title });
              facts.push({ label: 'Total', value: formatFc(item.amountFc) });
              facts.push({ label: 'Acompte', value: formatFc(item.depositFc) });
              if (isVendor) {
                facts.push({
                  label: 'Commission',
                  value: `${formatFc(item.commissionFc)}${item.commissionSettledAt ? ' · payée' : ''}`,
                });
              }

              const acceptButton = canAct && isVendor && item.status === 'REQUESTED' ? (
                <Button
                  size="sm"
                  loading={busy}
                  onClick={() => run(item.id, 'accept', { amountFc: Number(amountDraft) })}
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  Accepter
                </Button>
              ) : null;
              const paidOnline = item.depositPayment?.status === 'PAID';
              const payOnlineButton = !isVendor && item.onlineDepositAvailable && item.status === 'ACCEPTED' && !item.depositMarkedAt && !paidOnline ? (
                <Button
                  size="sm"
                  loading={Boolean(payWatch && payWatch.bookingId === item.id)}
                  onClick={() => {
                    setPayModal(item);
                    setPayMethod('mobile');
                    setPayError('');
                  }}
                  leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                >
                  Payer l’acompte
                </Button>
              ) : null;
              const depositButton = canAct && item.status === 'ACCEPTED' && !item.depositMarkedAt ? (
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
                  {isVendor ? 'Acompte reçu' : payOnlineButton ? 'Déjà versé' : 'J’ai versé'}
                </Button>
              ) : null;
              const confirmButton = canAct && isVendor && item.status === 'ACCEPTED' && item.depositMarkedAt ? (
                <Button size="sm" loading={busy} onClick={() => run(item.id, 'confirm')}>
                  Confirmer
                </Button>
              ) : null;

              return (
                <MarketplaceDealCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  subtitle={`${kindLabel(item)} · ${isVendor ? 'Reçue' : 'Envoyée'}`}
                  icon={kindIcon(item)}
                  status={<StatusPill tone={toneFor(item.status)}>{BOOKING_STATUS_LABELS[item.status]}</StatusPill>}
                  facts={facts}
                  value={formatFc(item.amountFc)}
                  valueMeta={`Acompte ${formatFc(item.depositFc)}`}
                  highlight={Boolean(highlightBookingId && item.id === highlightBookingId)}
                  layout={mode}
                  primaryActions={payOnlineButton ? (
                    <>
                      {payOnlineButton}
                      {depositButton ? React.cloneElement(depositButton, { variant: 'secondary' }) : null}
                    </>
                  ) : acceptButton || depositButton || confirmButton || (
                    !isVendor && item.status === 'COMPLETED' && !item.review ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setReviewModal(item);
                          setReviewRating(0);
                          setReviewComment('');
                          setReviewError('');
                        }}
                        leftIcon={<Star className="w-3.5 h-3.5" />}
                      >
                        Laisser un avis
                      </Button>
                    ) : null
                  )}
                  secondaryActions={(
                    <>
                      {waUrl && !isVendor ? (
                        <a href={waUrl} target="_blank" rel="noopener noreferrer" title="Échanger directement par WhatsApp">
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                          >
                            WhatsApp
                          </Button>
                        </a>
                      ) : null}
                      {listingHref ? (
                        <Button size="sm" variant="secondary" href={listingHref}>
                          Fiche
                        </Button>
                      ) : null}
                      {item.vendorPhone && !isVendor ? (
                        <a href={`tel:${item.vendorPhone}`} title="Appeler le prestataire">
                          <Button size="sm" variant="ghost" leftIcon={<Phone className="w-3.5 h-3.5" />}>
                            Appeler
                          </Button>
                        </a>
                      ) : null}
                      {organizerView && item.event?.id ? (
                        <Button size="sm" variant="secondary" href={eventDashboardHref(item.event.id, { tab: 'prep' })}>
                          Événement
                        </Button>
                      ) : null}
                      {canAct && isVendor && item.status === 'REQUESTED' ? (
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
                      ) : null}
                      {canAct && (item.status === 'ACCEPTED' || (item.status === 'REQUESTED' && !isVendor)) ? (
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
                    </>
                  )}
                >
                  <p className="text-xs text-foreground/80 leading-relaxed">{next.detail}</p>
                  <BookingStepper item={item} />
                  {!canAct && (item.status === 'REQUESTED' || item.status === 'ACCEPTED') ? (
                    <p className="text-xs text-muted">
                      Le propriétaire ou un manager de l’organisation traite cette réservation.
                    </p>
                  ) : null}
                  {canAct && isVendor && item.status === 'REQUESTED' ? (
                    <Input
                      label="Montant à confirmer (FC)"
                      type="number"
                      min={0}
                      value={amountDraft}
                      onChange={(e) => setAcceptAmount((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    />
                  ) : null}
                  {paidOnline && item.depositPayment ? (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1 text-xs">
                      <p className="font-semibold text-foreground inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                        Acompte payé en ligne · {formatFc(item.depositPayment.amountFc)}
                      </p>
                      {isVendor ? (
                        <p className="text-muted">
                          Commission retenue {formatFc(item.depositPayment.commissionFc)} · reversé {formatFc(item.depositPayment.payoutAmountFc)}{' '}
                          {item.depositPayment.payoutStatus === 'SUCCESS'
                            ? 'sur votre Mobile Money'
                            : item.depositPayment.payoutStatus === 'FAILED'
                              ? '· reversement à relancer par EventMaster'
                              : '· reversement en cours'}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {item.review ? (
                    <div className="rounded-xl border border-border bg-background/60 p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <ReviewStars rating={item.review.rating} />
                        <span className="text-xs font-semibold text-foreground">
                          {isVendor ? 'Avis du client' : 'Votre avis'}
                        </span>
                      </div>
                      {item.review.comment ? (
                        <p className="text-xs text-foreground/80 whitespace-pre-line">{item.review.comment}</p>
                      ) : null}
                      {item.review.vendorReply ? (
                        <p className="flex gap-1.5 text-xs text-muted">
                          <MessageSquareQuote className="w-3.5 h-3.5 shrink-0 mt-px text-primary" aria-hidden />
                          <span className="whitespace-pre-line">{item.review.vendorReply}</span>
                        </p>
                      ) : null}
                      {isVendor && canHandleAsVendor ? (
                        <button
                          type="button"
                          onClick={() => {
                            setReplyModal(item);
                            setReplyText(item.review?.vendorReply || '');
                            setReviewError('');
                          }}
                          className="min-h-11 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-[var(--radius-button)]"
                        >
                          {item.review.vendorReply ? 'Modifier ma réponse' : 'Répondre publiquement'}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {item.status === 'CANCELLED' && item.declineReason ? (
                    <DealDeclineBlock title="Réservation annulée" reason={item.declineReason} />
                  ) : null}
                  <BookingUnavailability item={item} onFocusDate={focusDay} />
                  {item.notes ? (
                    <p className="text-xs text-muted line-clamp-3 whitespace-pre-line">{item.notes}</p>
                  ) : null}
                </MarketplaceDealCard>
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
      </div>

      {/* MODALE AVIS CLIENT */}
      <Modal
        open={Boolean(reviewModal)}
        onClose={() => {
          if (!reviewSubmitting) setReviewModal(null);
        }}
        title="Laisser un avis"
        description={reviewModal ? `Comment s’est passée votre expérience avec ${reviewModal.vendorName} pour « ${reviewModal.title} » ? Votre avis sera visible sur sa fiche, avec votre prénom et l’initiale de votre nom.` : undefined}
        size="md"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setReviewModal(null)} disabled={reviewSubmitting}>
              Annuler
            </Button>
            <Button size="sm" onClick={() => void submitReview()} loading={reviewSubmitting} disabled={reviewRating < 1}>
              Publier l’avis
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <ReviewStarsInput value={reviewRating} onChange={setReviewRating} />
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-foreground">Votre commentaire (facultatif)</span>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value.slice(0, 1000))}
              rows={4}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Qualité, ponctualité, accueil…"
            />
          </label>
          {reviewError ? <Alert variant="error">{reviewError}</Alert> : null}
        </div>
      </Modal>

      {/* MODALE RÉPONSE DU PRESTATAIRE */}
      <Modal
        open={Boolean(replyModal)}
        onClose={() => {
          if (!reviewSubmitting) setReplyModal(null);
        }}
        title="Répondre à l’avis"
        description="Votre réponse s’affiche publiquement sous l’avis, sur votre fiche. Laissez vide pour la retirer."
        size="md"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setReplyModal(null)} disabled={reviewSubmitting}>
              Annuler
            </Button>
            <Button size="sm" onClick={() => void submitReply()} loading={reviewSubmitting}>
              Publier
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {replyModal?.review ? (
            <div className="flex items-center gap-2">
              <ReviewStars rating={replyModal.review.rating} />
              {replyModal.review.comment ? (
                <p className="text-xs text-muted line-clamp-2">{replyModal.review.comment}</p>
              ) : null}
            </div>
          ) : null}
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value.slice(0, 1000))}
            rows={4}
            aria-label="Votre réponse"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Merci pour votre confiance…"
          />
          {reviewError ? <Alert variant="error">{reviewError}</Alert> : null}
        </div>
      </Modal>

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
        open={Boolean(payModal)}
        onClose={() => {
          if (!paySubmitting) setPayModal(null);
        }}
        title="Payer l’acompte en ligne"
        description={payModal ? `Acompte de ${formatFc(payModal.depositFc)} pour « ${payModal.title} » auprès de ${payModal.vendorName}.` : undefined}
        size="md"
        footer={(
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" disabled={paySubmitting} onClick={() => setPayModal(null)}>
              Annuler
            </Button>
            <Button loading={paySubmitting} disabled={payMethod === 'mobile' && !payPhone.trim()} onClick={submitPayment}>
              {payModal ? `Payer ${formatFc(payModal.depositFc)}` : 'Payer'}
            </Button>
          </div>
        )}
      >
        {payModal ? (
          <div className="space-y-4 py-2">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted">Montant total :</span>
                <span className="font-semibold text-foreground">{formatFc(payModal.amountFc)}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-primary/15">
                <span className="font-semibold text-foreground">Acompte à payer maintenant :</span>
                <span className="text-sm font-bold text-primary">{formatFc(payModal.depositFc)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>Reste à régler avec le prestataire :</span>
                <span className="font-medium text-foreground">{formatFc(payModal.amountFc - payModal.depositFc)}</span>
              </div>
            </div>
            <div className={cn('inline-flex', SEGMENTED_TRACK)} role="radiogroup" aria-label="Moyen de paiement">
              <button type="button" role="radio" aria-checked={payMethod === 'mobile'} className={segmentedItem(payMethod === 'mobile', 'px-3 py-1.5 text-xs')} onClick={() => setPayMethod('mobile')}>
                Mobile Money
              </button>
              <button type="button" role="radio" aria-checked={payMethod === 'card'} className={segmentedItem(payMethod === 'card', 'px-3 py-1.5 text-xs')} onClick={() => setPayMethod('card')}>
                Carte bancaire
              </button>
            </div>
            {payMethod === 'mobile' ? (
              <Input
                label="Numéro M-Pesa, Orange Money ou Airtel Money"
                placeholder="Ex : 0812345678"
                inputMode="tel"
                value={payPhone}
                onChange={(e) => setPayPhone(e.target.value)}
              />
            ) : (
              <p className="text-[11px] text-muted">Vous serez redirigé vers la page de paiement sécurisée (Visa, Mastercard).</p>
            )}
            <p className="text-[11px] text-muted leading-relaxed">
              Le paiement passe par EventMaster, qui le reverse au prestataire. Vous pouvez aussi le payer directement et cliquer sur « Déjà versé ».
            </p>
            {payError ? <Alert variant="error">{payError}</Alert> : null}
          </div>
        ) : null}
      </Modal>

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
              <div className="rounded-xl border border-border bg-surface-muted/50 p-3 text-xs text-foreground space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5 text-foreground">
                  <CreditCard className="w-3.5 h-3.5 text-muted" aria-hidden />
                  Règlement hors plateforme
                </p>
                <p className="text-[11px] leading-relaxed text-muted">
                  Effectuez le paiement directement auprès de <strong className="text-foreground">{depositModal.vendorName}</strong> (Mobile Money M-Pesa, Orange Money, Airtel Money, ou virement).
                </p>
                {depositModal.vendorPhone ? (
                  <p className="text-[11px] font-medium pt-1 border-t border-border text-muted">
                    Contact du prestataire : <a href={`tel:${depositModal.vendorPhone}`} className="underline font-semibold text-foreground">{depositModal.vendorPhone}</a>
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
