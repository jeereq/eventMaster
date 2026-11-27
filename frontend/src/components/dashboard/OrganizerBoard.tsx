'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  Clock,
  Eye,
  Heart,
  Inbox,
  MapPin,
  PartyPopper,
  Plus,
  ScanLine,
  Send,
  Search,
  Sparkles,
  Ticket,
  UserCheck,
  Users,
  Wallet,
} from '@/components/icons';
import { formatFc } from '@/config/landingPricing';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { KpiCard, CARD_SHADOW } from '@/components/dashboard/KpiCard';
import { EVENT_KIND_LABELS, isEventKindId } from '@/lib/eventConfig';
import { eventDashboardHref, eventsListHref } from '@/lib/eventRoutes';
import { taskDueState, type EventTaskStatus } from '@/lib/eventTasks';
import type { WorkspaceStats } from '@/components/WorkspaceStatsOverview';

/** Champs utiles renvoyés par GET /events (le type minimal du tableau de bord n'en déclare que 5). */
export interface BoardEvent {
  id: string;
  title: string;
  date: string;
  updatedAt?: string | null;
  location?: string | null;
  eventKind?: string | null;
  placeLabel?: string | null;
  room?: { name?: string | null } | null;
  ticketingEnabled?: boolean;
  ticketsSold?: number | null;
  ticketsTotal?: number | null;
}

interface GuestRow {
  rsvp: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  checkedInAt: string | null;
}

interface TaskRow {
  status: EventTaskStatus;
  dueAt: string | null;
}

interface EventDetail {
  guests: { total: number; accepted: number; declined: number; pending: number; checkedIn: number } | null;
  tasks: { total: number; done: number; overdue: number } | null;
}

type Filter = 'all' | 'upcoming' | 'past' | string;

const DAY_MS = 86_400_000;
/** Largeur à partir de laquelle liste et fiche sont côte à côte (Tailwind lg). */
const SIDE_BY_SIDE_QUERY = '(min-width: 1024px)';

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function daysUntil(date: string): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - startOfToday()) / DAY_MS);
}

function formatDay(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDayTime(date: string): string {
  return new Date(date).toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function placeOf(e: BoardEvent): string {
  return e.room?.name || e.placeLabel || e.location || 'Lieu à définir';
}

function countdownLabel(days: number): string {
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Demain';
  if (days > 1) return `J-${days}`;
  return days === -1 ? 'Hier' : `Il y a ${-days} j`;
}

/** Pastille : vert = à venir, ambre = dans les 7 jours, gris = passé. */
function dotClass(days: number): string {
  if (days < 0) return 'bg-muted/50';
  if (days <= 7) return 'bg-festive-accent';
  return 'bg-primary';
}

/** Ombre douce des cartes blanches posées sur le fond. */

/** Icône d'avatar selon le type d'événement. */
function kindIcon(kind?: string | null): React.ComponentType<{ className?: string }> {
  switch (kind) {
    case 'WEDDING':
      return Heart;
    case 'BIRTHDAY':
    case 'BAPTISM':
      return PartyPopper;
    case 'CORPORATE':
    case 'CONFERENCE':
      return Briefcase;
    case 'GALA':
      return Sparkles;
    default:
      return CalendarDays;
  }
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n > 1 ? 's' : ''}`;
}

function summarizeGuests(rows: GuestRow[]): EventDetail['guests'] {
  return {
    total: rows.length,
    accepted: rows.filter((g) => g.rsvp === 'ACCEPTED').length,
    declined: rows.filter((g) => g.rsvp === 'DECLINED').length,
    pending: rows.filter((g) => g.rsvp === 'PENDING').length,
    checkedIn: rows.filter((g) => g.checkedInAt).length,
  };
}

function summarizeTasks(rows: TaskRow[]): EventDetail['tasks'] {
  const active = rows.filter((t) => t.status !== 'CANCELLED');
  return {
    total: active.length,
    done: active.filter((t) => t.status === 'DONE').length,
    overdue: active.filter((t) => taskDueState(t.dueAt, t.status) === 'overdue').length,
  };
}

/** Clé de cache : une modification de l'événement invalide ses chiffres. */
function detailKey(e: BoardEvent): string {
  return `${e.id}:${e.updatedAt ?? ''}`;
}

const UNLIMITED_QUOTA = 9999;

/** Contexte organisation : forfait, licence, file « À traiter » (ex-accueil B2B). */
export interface BoardOrgContext {
  planName?: string | null;
  daysUntilExpiry: number | null;
  isOwner: boolean;
  canManageTeam: boolean;
  canViewBilling: boolean;
  pendingQuotesCount: number;
  pendingBookingsCount: number;
  /** Devis / réservations reçus (vendeur) ou envoyés (acheteur). */
  marketPerspective: 'vendor' | 'organizer';
  ticketing: { totalRevenueFc: number; paidTicketsCount: number; pendingOrdersCount: number } | null;
  guestsQuota: { used?: number; max?: number };
  eventsQuota: { used?: number; max?: number };
}

type Quota = { used?: number; max?: number };

/** Quota borné (ni illimité ni inconnu) : utilisé / max, sinon null. */
function boundedQuota({ used, max }: Quota): { used: number; max: number } | null {
  if (used == null || max == null || max <= 0 || max >= UNLIMITED_QUOTA) return null;
  return { used, max };
}

interface TodoItem {
  id: string;
  label: string;
  href: string;
  count?: number;
  icon: React.ComponentType<{ className?: string }>;
  urgent?: boolean;
}

function buildTodo(org: BoardOrgContext): TodoItem[] {
  const todo: TodoItem[] = [];
  const { daysUntilExpiry: days } = org;
  if (days != null && days <= 15 && (org.canViewBilling || org.isOwner)) {
    todo.push({
      id: 'licence',
      label:
        days <= 0
          ? 'Licence expirée : invitations et accès suspendus'
          : `Licence : expire dans ${plural(days, 'jour')}`,
      href: org.canViewBilling ? '/dashboard/billing' : '/dashboard/profile',
      icon: AlertTriangle,
      urgent: true,
    });
  }
  const asVendor = org.marketPerspective === 'vendor';
  if (org.pendingQuotesCount > 0) {
    todo.push({
      id: 'quotes',
      label: asVendor ? 'Devis à chiffrer' : 'Devis sans réponse finale',
      href: asVendor ? '/dashboard/quotes?role=vendor' : '/dashboard/quotes',
      count: org.pendingQuotesCount,
      icon: Inbox,
    });
  }
  if (org.pendingBookingsCount > 0) {
    todo.push({
      id: 'bookings',
      label: asVendor ? 'Réservations à confirmer' : 'Réservations en attente',
      href: asVendor ? '/dashboard/bookings?tab=bookings&role=vendor' : '/dashboard/bookings?tab=bookings',
      count: org.pendingBookingsCount,
      icon: CalendarCheck,
    });
  }
  if ((org.ticketing?.pendingOrdersCount ?? 0) > 0) {
    todo.push({
      id: 'orders',
      label: 'Billets réservés non payés',
      href: '/dashboard/tickets',
      count: org.ticketing!.pendingOrdersCount,
      icon: Ticket,
    });
  }
  const quotaAlerts: Array<{ id: string; noun: string; quota: Quota; icon: TodoItem['icon'] }> = [
    { id: 'events-quota', noun: "d'événements", quota: org.eventsQuota, icon: CalendarCheck },
    { id: 'guests-quota', noun: "d'invités", quota: org.guestsQuota, icon: Users },
  ];
  for (const q of quotaAlerts) {
    const b = boundedQuota(q.quota);
    if (!b || b.used / b.max < 0.8) continue;
    todo.push({
      id: q.id,
      label: b.used >= b.max ? `Quota ${q.noun} atteint (${b.used} / ${b.max})` : `Quota ${q.noun} : ${b.used} / ${b.max}`,
      href: org.canViewBilling ? '/dashboard/billing' : '/dashboard/events',
      icon: q.icon,
      urgent: b.used >= b.max,
    });
  }
  return todo;
}

interface OrganizerBoardProps {
  events: BoardEvent[];
  canCreateEvents?: boolean;
  org?: BoardOrgContext;
  checklist?: React.ReactNode;
}

export default function OrganizerBoard({ events, canCreateEvents = true, org, checklist }: OrganizerBoardProps) {
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, EventDetail | 'failed'>>({});
  const requested = useRef(new Set<string>());
  const detailRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/events/workspace-stats')
      .then((res: WorkspaceStats) => {
        if (!cancelled) setStats(res);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const kinds = useMemo(() => {
    const seen = new Set<string>();
    for (const e of events) if (isEventKindId(e.eventKind)) seen.add(e.eventKind);
    return [...seen];
  }, [events]);

  const tabs: Array<{ id: Filter; label: string; count: number }> = useMemo(() => {
    const upcoming = events.filter((e) => daysUntil(e.date) >= 0).length;
    return [
      { id: 'upcoming', label: 'À venir', count: upcoming },
      { id: 'past', label: 'Passés', count: events.length - upcoming },
      { id: 'all', label: 'Tous', count: events.length },
      ...kinds.map((k) => ({
        id: k,
        label: isEventKindId(k) ? EVENT_KIND_LABELS[k] : k,
        count: events.filter((e) => e.eventKind === k).length,
      })),
    ];
  }, [events, kinds]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .filter((e) => {
        const days = daysUntil(e.date);
        if (filter === 'upcoming' && days < 0) return false;
        if (filter === 'past' && days >= 0) return false;
        if (filter !== 'all' && filter !== 'upcoming' && filter !== 'past' && e.eventKind !== filter) return false;
        if (!q) return true;
        return `${e.title} ${placeOf(e)}`.toLowerCase().includes(q);
      })
      .sort((a, b) =>
        filter === 'past'
          ? new Date(b.date).getTime() - new Date(a.date).getTime()
          : new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
  }, [events, filter, query]);

  const selected = useMemo(
    () => visible.find((e) => e.id === selectedId) ?? visible[0] ?? null,
    [visible, selectedId],
  );
  const selectedKey = selected ? detailKey(selected) : null;

  useEffect(() => {
    if (!selected || !selectedKey || requested.current.has(selectedKey)) return;
    const key = selectedKey;
    const id = selected.id;
    requested.current.add(key);
    Promise.all([
      api.get(`/events/${id}/guests`).catch(() => null),
      api.get(`/events/${id}/tasks`).catch(() => null),
    ]).then(([guestsRes, tasksRes]) => {
      const guestRows: GuestRow[] | null = Array.isArray(guestsRes)
        ? guestsRes
        : Array.isArray(guestsRes?.guests)
          ? guestsRes.guests
          : null;
      const taskRows: TaskRow[] | null = Array.isArray(tasksRes?.tasks) ? tasksRes.tasks : null;
      if (!guestRows && !taskRows) {
        // Échec complet : on autorise une nouvelle tentative à la prochaine sélection.
        requested.current.delete(key);
        setDetails((prev) => ({ ...prev, [key]: 'failed' }));
        return;
      }
      setDetails((prev) => ({
        ...prev,
        [key]: {
          guests: guestRows ? summarizeGuests(guestRows) : null,
          tasks: taskRows ? summarizeTasks(taskRows) : null,
        },
      }));
    });
  }, [selected, selectedKey]);

  const entry = selectedKey ? details[selectedKey] : undefined;
  const d = entry && entry !== 'failed' ? entry : null;
  const loadingDetail = Boolean(selected) && entry === undefined;

  const selectEvent = (id: string) => {
    setSelectedId(id);
    if (typeof window !== 'undefined' && !window.matchMedia(SIDE_BY_SIDE_QUERY).matches) {
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior, block: 'start' }));
    }
  };

  const ticketTile = selected?.ticketingEnabled;
  const todo = org ? buildTodo(org) : [];
  const revenue = org?.canViewBilling ? org.ticketing : null;

  return (
    <div className="space-y-5 pb-16 animate-fade-in">
      <section className={'em-header-wash rounded-[26px] p-5 sm:p-7 space-y-6'}>
        {canCreateEvents && events.length > 0 ? (
          <div className="flex justify-end">
            
<Button href="/dashboard/events?create=1" leftIcon={<Plus className="w-4 h-4" />} className="rounded-full px-5">
              Nouvel événement
            </Button>
          </div>
        ) : null}

        <div className={cn('grid grid-cols-2 gap-3 sm:gap-4', revenue ? 'xl:grid-cols-5' : 'xl:grid-cols-4')}>
          <KpiCard
            icon={<UserCheck className="w-[18px] h-[18px]" />}
            label="Confirmés"
            value={stats ? `${stats.guests.accepted} / ${stats.guests.total}` : '—'}
            hint={stats ? `${stats.guests.declined} décliné${stats.guests.declined > 1 ? 's' : ''}` : undefined}
            href="/dashboard/analytics"
          />
          <KpiCard
            icon={<Clock className="w-[18px] h-[18px]" />}
            label="En attente"
            value={stats ? String(stats.guests.pending) : '—'}
            hint={stats && stats.guests.total > 0 ? `${Math.round((stats.guests.pending / stats.guests.total) * 100)} % des invités` : undefined}
            tone={stats && stats.guests.pending > 0 ? 'warning' : 'default'}
            href="/dashboard/analytics"
          />
          <KpiCard
            icon={<ScanLine className="w-[18px] h-[18px]" />}
            label="Entrées"
            value={stats ? String(stats.guests.checkedIn) : '—'}
            hint={stats ? `${stats.guests.checkInRate} % des confirmés` : undefined}
            href="/dashboard/analytics"
          />
          <KpiCard
            icon={<AlertTriangle className="w-[18px] h-[18px]" />}
            label="Tâches en retard"
            value={stats ? String(stats.tasks.overdue) : '—'}
            hint={stats ? `${stats.tasks.dueToday} pour aujourd'hui` : undefined}
            tone={stats && stats.tasks.overdue > 0 ? 'danger' : 'default'}
            href={eventsListHref(false, 'tasks')}
          />
          {revenue ? (
            <KpiCard
              icon={<Wallet className="w-[18px] h-[18px]" />}
              label="Billetterie"
              value={formatFc(revenue.totalRevenueFc)}
              hint={`${plural(revenue.paidTicketsCount, 'billet')} payé${revenue.paidTicketsCount > 1 ? 's' : ''}`}
              href="/dashboard/tickets"
              className="col-span-2 xl:col-span-1"
            />
          ) : null}
        </div>
      </section>

      {todo.length > 0 ? (
        <section aria-labelledby="board-todo" className="rounded-[20px] bg-festive-accent-soft px-5 py-4">
          <h2 id="board-todo" className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
            <AlertTriangle className="w-4 h-4 text-festive-accent shrink-0" />
            À traiter
          </h2>
          <ul className="mt-1 grid gap-x-6 sm:grid-cols-2">
            {todo.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="group flex min-h-[44px] items-center gap-2.5 rounded-xl px-1 text-sm text-foreground hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <Icon className={cn('w-4 h-4 shrink-0', item.urgent ? 'text-danger' : 'text-festive-accent')} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.count != null ? (
                      <span className="tabular-nums text-xs font-semibold text-foreground">{item.count}</span>
                    ) : null}
                    <ChevronRight className="w-4 h-4 shrink-0 text-muted transition group-hover:translate-x-0.5" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section>
        <div role="group" aria-label="Filtrer les événements" className="flex items-end gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const active = filter === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setFilter(t.id);
                  setSelectedId(null);
                }}
                className={cn(
                  'shrink-0 min-h-[48px] px-5 text-[15px] transition-colors inline-flex items-center gap-2 rounded-t-[18px]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
                  active ? 'bg-surface font-semibold text-foreground' : 'font-medium text-muted hover:text-foreground',
                )}
              >
                {t.label}
                <span className={cn('tabular-nums text-xs', active ? 'text-primary font-semibold' : 'text-muted')}>{t.count}</span>
              </button>
            );
          })}
        </div>

        <div
          className={cn(
            'rounded-[24px] bg-surface p-4 sm:p-6 space-y-5',
            CARD_SHADOW,
            filter === tabs[0]?.id && 'rounded-tl-none',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              Vos événements
              {query.trim() ? (
                <span className="ml-2 text-sm font-normal text-muted" aria-live="polite">
                  {plural(visible.length, 'résultat')}
                </span>
              ) : null}
            </h2>
            <label className="relative w-full sm:w-80">
              <span className="sr-only">Rechercher un événement</span>
              <Search className="w-[18px] h-[18px] text-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nom ou lieu…"
                className="w-full h-12 pl-11 pr-4 rounded-full border border-border bg-surface text-[15px] text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-border p-10 text-center space-y-3">
              <p className="text-[15px] text-foreground font-semibold">
                {events.length === 0 ? 'Aucun événement' : 'Aucun événement pour ce filtre'}
              </p>
              {events.length === 0 && canCreateEvents ? (
                <Button href="/dashboard/events?create=1" leftIcon={<Plus className="w-4 h-4" />} className="rounded-full px-5">
                  Créer un événement
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 lg:gap-5 lg:grid-cols-[minmax(18rem,25rem)_minmax(0,1fr)] lg:items-start">
              <ul className="space-y-2.5 lg:max-h-[40rem] lg:overflow-y-auto lg:p-1">
                {visible.map((e) => {
                  const days = daysUntil(e.date);
                  const active = selected?.id === e.id;
                  const KindIcon = kindIcon(e.eventKind);
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        aria-current={active ? 'true' : undefined}
                        onClick={() => selectEvent(e.id)}
                        className={cn(
                          'w-full text-left min-h-[64px] pl-3 pr-5 py-3 rounded-full transition-colors',
                          'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                          active
                            ? 'bg-surface ring-1 ring-primary/45 shadow-[0_4px_14px_-8px_rgba(16,24,40,0.25)]'
                            : 'bg-surface-muted/70 hover:bg-surface-muted',
                        )}
                      >
                        <span
                          className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center shrink-0 border',
                            active ? 'bg-primary/10 border-primary/25 text-primary' : 'bg-surface border-border text-muted',
                          )}
                          aria-hidden
                        >
                          <KindIcon className="w-[18px] h-[18px]" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs text-muted tabular-nums">{formatDay(e.date)}</span>
                          <span className="block text-[15px] font-semibold text-foreground truncate">{e.title}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground/80">
                          <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', dotClass(days))} aria-hidden />
                          <span className="tabular-nums">{countdownLabel(days)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {selected ? (
                <article
                  ref={detailRef}
                  className="scroll-mt-4 md:scroll-mt-20 rounded-[24px] border border-primary/30 bg-surface p-4 sm:p-6 space-y-5 lg:sticky lg:top-20"
                >
                  <header className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-border">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center shrink-0 text-primary" aria-hidden>
                        {React.createElement(kindIcon(selected.eventKind), { className: 'w-5 h-5' })}
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-[22px] font-semibold tracking-tight text-foreground leading-tight break-words">
                          {selected.title}
                        </h2>
                        <p className="text-sm text-muted first-letter:uppercase">{formatDayTime(selected.date)}</p>
                      </div>
                    </div>
                    <Link
                      href={eventDashboardHref(selected.id)}
                      className="inline-flex h-11 items-center gap-2 rounded-full bg-surface-muted px-5 text-[15px] font-semibold text-foreground transition-colors hover:bg-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <Eye className="w-[18px] h-[18px] text-muted" />
                      Ouvrir
                    </Link>
                  </header>

                  {entry === 'failed' ? (
                    <p className="text-sm text-danger">Chiffres indisponibles pour cet événement.</p>
                  ) : null}

                  {loadingDetail ? (
                    <span className="block h-5 w-56 max-w-full rounded bg-surface-muted animate-pulse" aria-hidden />
                  ) : (
                    <p className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted tabular-nums">
                      {d?.guests ? (
                        <>
                          <span>
                            <strong className="font-semibold text-foreground">{d.guests.accepted}</strong> / {d.guests.total} confirmés
                          </span>
                          <span aria-hidden>·</span>
                          <span>
                            <strong className="font-semibold text-foreground">{d.guests.checkedIn}</strong> entrées
                          </span>
                        </>
                      ) : null}
                      {d?.tasks && d.tasks.total > 0 ? (
                        <>
                          <span aria-hidden>·</span>
                          <span>
                            <strong className="font-semibold text-foreground">{d.tasks.done}</strong> / {d.tasks.total} tâches faites
                          </span>
                        </>
                      ) : null}
                      {ticketTile ? (
                        <>
                          <span aria-hidden>·</span>
                          <span>
                            <strong className="font-semibold text-foreground">{selected.ticketsSold ?? 0}</strong>
                            {selected.ticketsTotal ? ` / ${selected.ticketsTotal}` : ''} billets
                          </span>
                        </>
                      ) : null}
                    </p>
                  )}

                  <HighlightCards event={selected} detail={d} loading={loadingDetail} />
                </article>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {checklist}
    </div>
  );
}

/** Carte ambre « À relancer » (si quelque chose attend) + carte verte « Lieu ». */
function HighlightCards({ event, detail, loading }: { event: BoardEvent; detail: EventDetail | null; loading: boolean }) {
  const items: Array<{ text: string; href: string; cta?: string }> = [];
  if (detail?.guests && detail.guests.pending > 0) {
    items.push({
      text: `${detail.guests.pending} invité${detail.guests.pending > 1 ? 's' : ''} en attente`,
      href: `${eventDashboardHref(event.id, { tab: 'guests' })}&rsvp=PENDING`,
      cta: 'Relancer',
    });
  }
  if (detail?.tasks && detail.tasks.overdue > 0) {
    items.push({
      text: `${detail.tasks.overdue} tâche${detail.tasks.overdue > 1 ? 's' : ''} en retard`,
      href: eventDashboardHref(event.id, { tab: 'tasks' }),
    });
  }
  const showAttention = loading || items.length > 0;

  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:gap-4', showAttention && 'sm:grid-cols-2')}>
      {loading ? (
        <div className="rounded-[18px] bg-surface-muted/60 min-h-28 animate-pulse" aria-hidden />
      ) : items.length > 0 ? (
        <div className="rounded-[18px] bg-festive-accent-soft p-4 sm:p-5">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
            <AlertTriangle className="w-[18px] h-[18px] text-festive-accent shrink-0" />
            À relancer
          </p>
          <ul className="mt-2">
            {items.map((it) => (
              <li key={it.text} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                {it.cta ? (
                  <>
                    <span className="text-[15px] text-foreground">{it.text}</span>
                    <Button href={it.href} size="sm" leftIcon={<Send className="w-4 h-4" />} className="min-h-[44px] rounded-full px-4">
                      {it.cta}
                    </Button>
                  </>
                ) : (
                  <Link
                    href={it.href}
                    className="inline-flex min-h-[44px] items-center text-[15px] text-foreground underline underline-offset-2 decoration-festive-accent/40 hover:decoration-festive-accent"
                  >
                    {it.text}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="rounded-[18px] bg-primary/10 p-4 sm:p-5 space-y-2 min-w-0">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <MapPin className="w-[18px] h-[18px] text-primary shrink-0" />
          Lieu
        </p>
        <p className="text-[15px] text-foreground break-words">{placeOf(event)}</p>
        {event.room?.name && event.location ? <p className="text-[13px] text-muted break-words">{event.location}</p> : null}
      </div>
    </div>
  );
}
