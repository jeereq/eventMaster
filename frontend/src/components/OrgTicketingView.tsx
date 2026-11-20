'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import {
  Ticket,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  Phone,
  UserCheck,
  Armchair,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Heart,
  SlidersHorizontal,
} from '@/components/icons';
import { Button, StatusPill } from '@/components/ui';
import { eventDashboardHref } from '@/lib/eventRoutes';

export interface OrgTicketOrderGuest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  rsvp: string;
  checkedInAt?: string | null;
  seatVerified?: boolean;
  category?: string | null;
}

export interface OrgTicketOrder {
  id: string;
  eventId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string | null;
  quantity: number;
  amountFc: number;
  unitPriceFc?: number | null;
  pricingZoneId?: string | null;
  status: string; // PENDING, PAID, CANCELLED
  paymentProvider?: string | null;
  flexPayOrderNumber?: string | null;
  flexPayReference?: string | null;
  flexPayChannel?: string | null;
  paidAt?: string | null;
  createdAt: string;
  tableId?: string | null;
  seatIndex?: number | null;
  selectedSeats?: Array<{ tableId: string; seatIndex: number; tableName?: string; zoneName?: string }> | null;
  event?: {
    id: string;
    title: string;
    slug?: string | null;
    date: string;
    location: string;
    ticketPricingMode?: string;
    tablePlan?: unknown;
  } | null;
  guests?: OrgTicketOrderGuest[];
}

export interface OrgTicketingSummaryData {
  totalRevenueFc: number;
  ticketsRevenueFc?: number;
  donationsRevenueFc?: number;
  paidTicketsCount: number;
  donationsCount?: number;
  pendingTicketsCount: number;
  pendingRevenueFc?: number;
  paidOrdersCount: number;
  pendingOrdersCount: number;
  totalOrdersCount: number;
  checkedInGuestsCount: number;
}

export interface OrgTicketingEventSummary {
  id: string;
  title: string;
  slug?: string | null;
  date: string;
  location?: string;
  isPublic?: boolean;
  ticketingEnabled?: boolean;
  ticketPriceFc?: number;
  ticketPricingMode?: string;
  ticketsSold?: number;
  ticketsTotal?: number | null;
  tablePlan?: unknown;
  _count?: {
    ticketOrders?: number;
    guests?: number;
  };
}

export interface OrgTicketingViewProps {
  /** Si fourni, filtre exclusivement sur cet événement */
  eventId?: string;
  /** Titre de l'événement pour l'en-tête */
  eventTitle?: string;
  /** Est-on dans le desk protocole ? */
  protocolMode?: boolean;
  className?: string;
}

export default function OrgTicketingView({
  eventId,
  protocolMode = false,
  className = '',
}: OrgTicketingViewProps) {
  const [orders, setOrders] = useState<OrgTicketOrder[]>([]);
  const [summary, setSummary] = useState<OrgTicketingSummaryData | null>(null);
  const [eventsList, setEventsList] = useState<OrgTicketingEventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Filtres
  const [selectedEventId, setSelectedEventId] = useState<string>(eventId || 'all');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'CANCELLED'>('ALL');
  const [checkInFilter, setCheckInFilter] = useState<'ALL' | 'CHECKED_IN' | 'PENDING'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'TICKETS' | 'DONATIONS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [actingGuestId, setActingGuestId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount =
    (typeFilter !== 'ALL' ? 1 : 0) + (statusFilter !== 'ALL' ? 1 : 0) + (checkInFilter !== 'ALL' ? 1 : 0);


  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      if (eventId) {
        // Chargement pour un événement spécifique
        const [ordersRes, eventRes] = await Promise.all([
          api.get(`/events/${eventId}/ticket-orders`),
          api.get(`/events/${eventId}`),
        ]);

        const orderList = Array.isArray(ordersRes.orders) ? ordersRes.orders : [];
        setOrders(orderList);

        const ev = eventRes.event || eventRes;
        if (ev) {
          setEventsList([ev]);
          const paidOrders = orderList.filter((o: OrgTicketOrder) => o.status === 'PAID');
          const pendingOrders = orderList.filter((o: OrgTicketOrder) => o.status === 'PENDING');
          const paidTickets = paidOrders.reduce((sum: number, o: OrgTicketOrder) => sum + (o.quantity || 1), 0);
          const pendingTickets = pendingOrders.reduce((sum: number, o: OrgTicketOrder) => sum + (o.quantity || 1), 0);
          const totalRevenue = paidOrders.reduce((sum: number, o: OrgTicketOrder) => sum + (o.amountFc || 0), 0);

          let checkedInCount = 0;
          for (const ord of orderList) {
            if (ord.guests) {
              for (const g of ord.guests) {
                if (g.checkedInAt) checkedInCount++;
              }
            }
          }

          setSummary({
            totalRevenueFc: totalRevenue,
            paidTicketsCount: paidTickets,
            pendingTicketsCount: pendingTickets,
            paidOrdersCount: paidOrders.length,
            pendingOrdersCount: pendingOrders.length,
            totalOrdersCount: orderList.length,
            checkedInGuestsCount: checkedInCount,
          });
        }
      } else {
        // Chargement global (tous les événements de l'organisation)
        const [summaryRes, ordersRes] = await Promise.all([
          api.get('/events/ticketing/summary'),
          api.get(`/events/ticketing/orders?eventId=${selectedEventId}&status=${statusFilter}&q=${encodeURIComponent(searchQuery)}`),
        ]);

        setSummary(summaryRes.summary || null);
        setEventsList(Array.isArray(summaryRes.events) ? summaryRes.events : []);
        setOrders(Array.isArray(ordersRes.orders) ? ordersRes.orders : []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger la billetterie.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId, selectedEventId, statusFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check-in direct d'un invité au guichet
  const handleCheckInGuest = async (targetEventId: string, guestId: string) => {
    setActingGuestId(guestId);
    setActionSuccess('');
    setError('');
    try {
      await api.post(`/events/${targetEventId}/guests/${guestId}/check-in`, {});
      setActionSuccess('Entrée validée avec succès !');
      // Mettre à jour l'état local
      setOrders((prev) =>
        prev.map((ord) => ({
          ...ord,
          guests: ord.guests?.map((g) =>
            g.id === guestId ? { ...g, checkedInAt: new Date().toISOString() } : g
          ),
        }))
      );
      if (summary) {
        setSummary({
          ...summary,
          checkedInGuestsCount: summary.checkedInGuestsCount + 1,
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la validation.');
    } finally {
      setActingGuestId(null);
    }
  };

  // Vérification de siège direct
  const handleVerifySeat = async (targetEventId: string, guestId: string) => {
    setActingGuestId(guestId);
    setActionSuccess('');
    setError('');
    try {
      await api.post(`/events/${targetEventId}/guests/${guestId}/verify-seat`, {});
      setActionSuccess('Siège vérifié et validé !');
      setOrders((prev) =>
        prev.map((ord) => ({
          ...ord,
          guests: ord.guests?.map((g) =>
            g.id === guestId ? { ...g, seatVerified: true } : g
          ),
        }))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la vérification.');
    } finally {
      setActingGuestId(null);
    }
  };

  // Filtrage local supplémentaire si besoin
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (typeFilter === 'TICKETS' && order.pricingZoneId === 'donation') {
        return false;
      }
      if (typeFilter === 'DONATIONS' && order.pricingZoneId !== 'donation') {
        return false;
      }
      if (statusFilter !== 'ALL' && order.status !== statusFilter) {
        return false;
      }
      if (checkInFilter === 'CHECKED_IN') {
        const hasCheckedIn = order.guests?.some((g) => Boolean(g.checkedInAt));
        if (!hasCheckedIn) return false;
      }
      if (checkInFilter === 'PENDING') {
        const allCheckedIn = order.guests?.every((g) => Boolean(g.checkedInAt));
        if (allCheckedIn && (order.guests?.length ?? 0) > 0) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${order.buyerName} ${order.buyerPhone || ''} ${order.buyerEmail} ${order.flexPayOrderNumber || ''} ${order.flexPayReference || ''} ${order.event?.title || ''}`.toLowerCase();
        const guestHay = order.guests?.map((g) => `${g.firstName} ${g.lastName}`).join(' ').toLowerCase() || '';
        if (!hay.includes(q) && !guestHay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, checkInFilter, searchQuery, typeFilter]);

  return (
    <div className={cn('space-y-4 w-full', className)}>
      {error && (
        <div className="p-3 rounded-xl bg-danger/10 border border-danger/25 text-danger text-xs flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="min-h-11 min-w-11 inline-flex items-center justify-center hover:opacity-75" aria-label="Fermer">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/25 text-primary text-xs flex items-center justify-between animate-in fade-in">
          <span className="flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            {actionSuccess}
          </span>
          <button type="button" onClick={() => setActionSuccess('')} className="min-h-11 min-w-11 inline-flex items-center justify-center hover:opacity-75" aria-label="Fermer">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {summary && (
        <dl className="grid grid-cols-2 sm:grid-cols-4 rounded-2xl border border-border bg-surface divide-x divide-y sm:divide-y-0 divide-border overflow-hidden">
          {[
            {
              label: 'Recettes nettes',
              value: formatFc(summary.totalRevenueFc),
              note: null,
            },
            {
              label: 'Billets payés',
              value: summary.paidTicketsCount,
              note: summary.pendingTicketsCount > 0 ? `+ ${summary.pendingTicketsCount} en attente` : null,
            },
            {
              label: 'Entrées',
              value: `${summary.checkedInGuestsCount} / ${summary.paidTicketsCount || summary.totalOrdersCount || 0}`,
              note: summary.paidTicketsCount > 0 && summary.checkedInGuestsCount > 0
                ? `${Math.round((summary.checkedInGuestsCount / summary.paidTicketsCount) * 100)} % présents`
                : null,
            },
            {
              label: 'Commandes',
              value: summary.totalOrdersCount,
              note: summary.pendingOrdersCount > 0 ? `${summary.pendingOrdersCount} en attente de paiement` : null,
            },
          ].map((item) => (
            <div key={item.label} className="px-4 py-3 min-w-0">
              <dt className="text-xs text-muted">{item.label}</dt>
              <dd className="text-lg font-bold text-foreground tabular-nums">{item.value}</dd>
              {item.note ? <dd className="text-xs text-festive-accent truncate">{item.note}</dd> : null}
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            placeholder="Nom, téléphone, email, n° commande…"
            aria-label="Rechercher une commande"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-9 pr-3 rounded-xl border border-border bg-surface text-xs text-foreground placeholder:text-muted focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {!eventId && eventsList.length > 0 && (
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            aria-label="Événement"
            className="h-11 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/50 max-w-[14rem]"
          >
            <option value="all">Tous les événements</option>
            {eventsList.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}{ev.ticketPricingMode === 'by_zone' ? '' : ev.ticketPriceFc ? ` (${formatFc(ev.ticketPriceFc)})` : ''}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          aria-controls="org-ticketing-filters"
          className={cn(
            'inline-flex h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            filtersOpen || activeFilterCount > 0
              ? 'border-border bg-surface-muted text-foreground'
              : 'border-border bg-surface text-muted hover:text-foreground',
          )}
        >
          <SlidersHorizontal className="w-4 h-4" aria-hidden />
          Filtres
          {activeFilterCount > 0 ? (
            <span className="rounded-full bg-surface px-1.5 text-xs font-bold tabular-nums text-foreground">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={refreshing || loading}
          aria-label="Actualiser"
          title="Actualiser"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-muted hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
        </button>
      </div>

      {filtersOpen ? (
        <div id="org-ticketing-filters" className="flex flex-wrap items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            aria-label="Type de flux"
            className="h-11 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <option value="ALL">Billets et dons</option>
            <option value="TICKETS">Billets</option>
            <option value="DONATIONS">Dons</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            aria-label="Paiement"
            className="h-11 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <option value="ALL">Tous paiements</option>
            <option value="PAID">Payés</option>
            <option value="PENDING">En attente</option>
            <option value="CANCELLED">Annulés</option>
          </select>
          <select
            value={checkInFilter}
            onChange={(e) => setCheckInFilter(e.target.value as typeof checkInFilter)}
            aria-label="Contrôle d’accès"
            className="h-11 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <option value="ALL">Toutes les entrées</option>
            <option value="CHECKED_IN">Entrés</option>
            <option value="PENDING">Pas encore entrés</option>
          </select>
        </div>
      ) : null}

      {/* Liste des commandes */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted">Chargement des billets et commandes…</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface-muted/40 p-8 text-center space-y-2">
          <Ticket className="w-8 h-8 text-muted mx-auto" />
          <p className="text-sm font-bold text-foreground">Aucune commande de billet trouvée</p>
          <p className="text-xs text-muted max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'ALL' || checkInFilter !== 'ALL'
              ? 'Aucun résultat ne correspond à vos filtres actuels.'
              : 'Les billets vendus en ligne ou les inscriptions publiques apparaîtront ici.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const isDonation = order.pricingZoneId === 'donation';
            const isPaid = order.status === 'PAID';
            const isPending = order.status === 'PENDING';
            const isCancelled = order.status === 'CANCELLED';
            const guestsList = order.guests || [];
            const checkedInCount = guestsList.filter((g) => Boolean(g.checkedInAt)).length;
            const targetEventId = order.eventId || order.event?.id || eventId || '';
            const createdLabel = new Date(order.createdAt).toLocaleString('fr-FR', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });
            const seatCount = order.selectedSeats?.length || 0;

            return (
              <div
                key={order.id}
                className={cn(
                  'rounded-2xl border bg-surface transition shadow-2xs overflow-hidden',
                  isPaid ? 'border-border' : isPending ? 'border-festive-accent/40' : 'border-border opacity-80',
                )}
              >
                <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{order.buyerName}</span>
                      <StatusPill tone={isPaid ? 'emerald' : isPending ? 'amber' : 'slate'}>
                        {isPaid ? 'Payé' : isPending ? 'Paiement en cours' : isCancelled ? 'Annulé' : order.status}
                      </StatusPill>
                      {isDonation && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/15 border border-rose-500/25 px-2 py-0.5 rounded-full">
                          <Heart className="w-3 h-3 fill-rose-500/30" />
                          Don solidaire
                        </span>
                      )}
                      {order.flexPayChannel && (
                        <span className="px-2 py-0.5 rounded-full bg-surface-muted border border-border text-xs font-semibold text-muted">
                          {order.flexPayChannel}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      {order.event?.title && (
                        <Link
                          href={eventDashboardHref(order.event.id, { tab: 'ticketing', protocol: protocolMode })}
                          className="font-semibold text-primary hover:underline truncate max-w-[220px]"
                        >
                          {order.event.title}
                        </Link>
                      )}
                      <span className="tabular-nums">{createdLabel}</span>
                      <span className="font-mono text-xs">
                        #{order.flexPayOrderNumber || order.flexPayReference || order.id.slice(0, 8)}
                      </span>
                      {seatCount > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Armchair className="w-3 h-3" />
                          {seatCount} siège{seatCount > 1 ? 's' : ''}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                      {order.buyerPhone && (
                        <a href={`tel:${order.buyerPhone}`} className="hover:text-primary transition inline-flex items-center gap-1 min-h-11">
                          <Phone className="w-3 h-3" />
                          {order.buyerPhone}
                        </a>
                      )}
                      {order.buyerPhone && (
                        <a
                          href={`https://wa.me/${order.buyerPhone.replace(/[^\d]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1 min-h-11"
                        >
                          <MessageCircle className="w-3 h-3" />
                          WhatsApp
                        </a>
                      )}
                      {order.buyerEmail && (
                        <span className="hidden sm:inline truncate max-w-[200px]">{order.buyerEmail}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                    <div className="text-right">
                      <p className="text-sm font-black text-foreground tabular-nums">
                        {formatFc(order.amountFc)}
                      </p>
                      <p className="text-xs text-muted tabular-nums">
                        {order.quantity} billet{order.quantity > 1 ? 's' : ''}
                        {order.unitPriceFc ? ` · ${formatFc(order.unitPriceFc)}/u` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        className="inline-flex min-h-11 items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-muted text-xs font-semibold text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      >
                        <span>Détails & Entrées</span>
                        {guestsList.length > 0 && (
                          <span
                            className={cn(
                              'px-1.5 py-0.2 rounded-full text-xs font-bold',
                              checkedInCount === guestsList.length
                                ? 'bg-primary/15 text-primary'
                                : 'bg-primary/10 text-primary'
                            )}
                          >
                            {checkedInCount}/{guestsList.length}
                          </span>
                        )}
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tiroir déroulant des détails de billets et invités */}
                {isExpanded && (
                  <div className="p-3.5 sm:p-4 bg-surface-muted/30 border-t border-border space-y-3 animate-in fade-in">
                    {/* Information sur les sièges / places assignées */}
                    {order.selectedSeats && order.selectedSeats.length > 0 && (
                      <p className="text-xs text-foreground flex items-start gap-1.5">
                        <Armchair className="w-3.5 h-3.5 text-muted shrink-0 mt-px" aria-hidden />
                        <span>
                          {order.selectedSeats
                            .map((seat) =>
                              [seat.tableName || `Table ${seat.tableId}`, `Siège ${seat.seatIndex + 1}`, seat.zoneName]
                                .filter(Boolean)
                                .join(' · '),
                            )
                            .join(', ')}
                        </span>
                      </p>
                    )}

                    {/* Liste des invités / billets émis */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-primary" />
                          Invités / Badges émis ({guestsList.length}) :
                        </span>
                        <span className="text-xs text-muted">
                          {checkedInCount} scanné{checkedInCount > 1 ? 's' : ''} à l’entrée
                        </span>
                      </p>

                      {guestsList.length === 0 ? (
                        <p className="text-xs text-muted">
                          Aucun invité spécifique lié à cette commande.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {guestsList.map((guest) => {
                            const isCheckedIn = Boolean(guest.checkedInAt);
                            const isBusy = actingGuestId === guest.id;

                            return (
                              <div
                                key={guest.id}
                                className={cn(
                                  'p-3 rounded-xl border bg-surface flex items-center justify-between gap-2 shadow-2xs',
                                  isCheckedIn ? 'border-primary/30' : 'border-border'
                                )}
                              >
                                <div className="space-y-0.5 min-w-0">
                                  <p className="text-xs font-bold text-foreground truncate">
                                    {guest.firstName} {guest.lastName}
                                  </p>
                                  <p className="text-xs text-muted truncate">
                                    {guest.email || guest.phone || 'Billet nominatif'}
                                  </p>
                                  <div className="flex items-center gap-1.5 pt-0.5">
                                    {isCheckedIn ? (
                                      <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Entré
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-xs text-muted">
                                        <Clock className="w-3 h-3" />
                                        En attente au guichet
                                      </span>
                                    )}
                                    {guest.seatVerified && (
                                      <span className="text-xs font-bold text-primary">
                                        · Siège vérifié
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Actions directes au guichet pour le protocole et managers */}
                                <div className="flex items-center gap-1 shrink-0">
                                  {!isCheckedIn && targetEventId && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="secondary"
                                      disabled={isBusy}
                                      onClick={() => handleCheckInGuest(targetEventId, guest.id)}
                                      className="text-xs font-bold"
                                      leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                                    >
                                      Valider entrée
                                    </Button>
                                  )}
                                  {isCheckedIn && !guest.seatVerified && targetEventId && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="secondary"
                                      disabled={isBusy}
                                      onClick={() => handleVerifySeat(targetEventId, guest.id)}
                                      title="Vérifier le placement de l’invité à sa table"
                                    >
                                      Siège vérifié
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
