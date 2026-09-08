'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
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
  Calendar,
  MapPin,
  Phone,
  Mail,
  UserCheck,
  Armchair,
  Filter,
  CreditCard,
  Building2,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button, Input, StatusPill, EmptyState } from '@/components/ui';
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
  paidTicketsCount: number;
  pendingTicketsCount: number;
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
  eventTitle,
  protocolMode = false,
  className = '',
}: OrgTicketingViewProps) {
  const { access } = useAuth();
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
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [actingGuestId, setActingGuestId] = useState<string | null>(null);

  const isProtocolOnly = Boolean(access?.isProtocolOnly);

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
  }, [orders, statusFilter, checkInFilter, searchQuery]);

  return (
    <div className={cn('space-y-4 w-full', className)}>
      {/* En-tête et Titre */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface p-4 rounded-2xl border border-border shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Ticket className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-foreground">
              {eventTitle ? `Billetterie · ${eventTitle}` : 'Billetterie & Contrôle d’accès'}
            </h2>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {isProtocolOnly || protocolMode ? 'Accueil & Protocole' : 'Gestion & Ventes'}
            </span>
          </div>
          <p className="text-xs text-muted">
            {isProtocolOnly || protocolMode
              ? 'Consultez les commandes de billets, les paiements Mobile Money et validez les entrées des participants.'
              : 'Suivi des ventes de billets en temps réel, recettes encaissées, répartition par zone et émargement jour J.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />}
          >
            Actualiser
          </Button>
        </div>
      </div>

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

      {/* Cartes KPI Synthèse */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Recettes encaissées */}
          <div className="rounded-2xl border border-border bg-surface p-3.5 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-muted text-xs">
              <span className="font-medium">Recettes nettes</span>
              <CreditCard className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-lg font-black text-foreground tabular-nums">
              {formatFc(summary.totalRevenueFc)}
            </p>
            <p className="text-xs text-muted">
              {summary.paidOrdersCount} commande{summary.paidOrdersCount > 1 ? 's' : ''} payée{summary.paidOrdersCount > 1 ? 's' : ''}
            </p>
          </div>

          {/* Billets vendus */}
          <div className="rounded-2xl border border-border bg-surface p-3.5 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-muted text-xs">
              <span className="font-medium">Billets payés</span>
              <Ticket className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-lg font-black text-primary tabular-nums">
              {summary.paidTicketsCount}
            </p>
            <p className="text-xs text-muted">
              {summary.pendingTicketsCount > 0 ? `+ ${summary.pendingTicketsCount} en attente` : 'Toutes confirmées'}
            </p>
          </div>

          {/* Émargés / Validés à l'entrée */}
          <div className="rounded-2xl border border-border bg-surface p-3.5 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-muted text-xs">
              <span className="font-medium">Entrées validées</span>
              <UserCheck className="w-3.5 h-3.5 text-foreground" />
            </div>
            <p className="text-lg font-black text-foreground tabular-nums">
              {summary.checkedInGuestsCount} / {summary.paidTicketsCount || summary.totalOrdersCount || 0}
            </p>
            <p className="text-xs text-muted">
              {summary.paidTicketsCount > 0
                ? `${Math.round((summary.checkedInGuestsCount / summary.paidTicketsCount) * 100)}% de présence`
                : 'Scannés au guichet'}
            </p>
          </div>

          {/* Commandes totales */}
          <div className="rounded-2xl border border-border bg-surface p-3.5 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-muted text-xs">
              <span className="font-medium">Total commandes</span>
              <Users className="w-3.5 h-3.5 text-festive-accent" />
            </div>
            <p className="text-lg font-black text-foreground tabular-nums">
              {summary.totalOrdersCount}
            </p>
            <p className="text-xs text-muted">
              {summary.pendingOrdersCount} en attente de paiement
            </p>
          </div>
        </div>
      )}

      {/* Barre d'outils et de filtres */}
      <div className="rounded-2xl border border-border bg-surface p-3 sm:p-3.5 space-y-3 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Sélecteur d'événement (si vue globale) */}
          {!eventId && eventsList.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Événement</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full h-11 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <option value="all">Tous les événements ({eventsList.length})</option>
                {eventsList.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} {ev.ticketPriceFc ? `(${formatFc(ev.ticketPriceFc)})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Recherche textuelle */}
          <div className={cn(!eventId && eventsList.length > 0 ? '' : 'sm:col-span-2')}>
            <label className="block text-xs font-semibold text-muted mb-1">Recherche</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Nom, téléphone, email, n° commande…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-9 pr-3 rounded-xl border border-border bg-surface text-xs text-foreground placeholder:text-muted focus:ring-2 focus:ring-primary/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground p-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filtre de paiement */}
          <div>
            <p className="block text-xs font-semibold text-muted mb-1">Paiement</p>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Statut de paiement">
              {([
                ['ALL', 'Tous'],
                ['PAID', 'Payés'],
                ['PENDING', 'En attente'],
                ['CANCELLED', 'Annulés'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatusFilter(id)}
                  aria-pressed={statusFilter === id}
                  className={cn(
                    'px-2.5 min-h-11 rounded-lg text-xs font-semibold border transition',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    statusFilter === id
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border bg-surface text-muted hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Filtre de check-in */}
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Contrôle d’accès</label>
            <select
              value={checkInFilter}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'ALL' || value === 'CHECKED_IN' || value === 'PENDING') {
                  setCheckInFilter(value);
                }
              }}
              className="w-full h-11 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <option value="ALL">Toutes les entrées</option>
              <option value="CHECKED_IN">Scannés / Entrés</option>
              <option value="PENDING">Non encore scannés</option>
            </select>
          </div>
        </div>

        {/* Badges de comptage */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border text-xs text-muted">
          <span>
            {filteredOrders.length} commande{filteredOrders.length > 1 ? 's' : ''} trouvée{filteredOrders.length > 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Payé
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-festive-accent" />
              En attente
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-foreground" />
              Validé à l’entrée
            </span>
          </div>
        </div>
      </div>

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
                      {order.flexPayChannel && (
                        <span className="px-2 py-0.5 rounded-full bg-surface-muted border border-border text-xs font-semibold text-muted uppercase">
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
                      <span className="font-mono text-[11px]">
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
                    {isPending ? (
                      <p className="text-xs text-festive-accent">
                        L’acheteur a initié FlexPay — en attente de confirmation opérateur.
                      </p>
                    ) : null}
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
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Armchair className="w-3.5 h-3.5 text-primary" />
                          Sièges réservés sur le plan 3D :
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {order.selectedSeats.map((seat, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs font-semibold text-foreground shadow-2xs"
                            >
                              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                                {sIdx + 1}
                              </span>
                              <span>{seat.tableName || `Table ${seat.tableId}`}</span>
                              <span>· Siège {seat.seatIndex + 1}</span>
                              {seat.zoneName && (
                                <span className="text-xs px-1.5 py-0.2 rounded bg-primary/10 text-primary font-bold">
                                  {seat.zoneName}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
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
                                        Entrée validée
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
                                      variant="primary"
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
