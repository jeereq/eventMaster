'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Inbox,
  MapPin,
  PlusCircle,
  Ticket,
  Users,
  Wallet,
} from '@/components/icons';
import { Button } from '@/components/ui';
import NextEventCard, { pickNextEvent } from '@/components/dashboard/NextEventCard';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import type { OrganizerEventItem } from '@/components/dashboard/OrganizerDashboardHome';

export interface B2bTicketingSummary {
  totalRevenueFc: number;
  paidTicketsCount: number;
  pendingOrdersCount: number;
  checkedInGuestsCount: number;
}

interface QuotaPair {
  used?: number;
  max?: number;
}

export interface B2bOrganizerHomeProps {
  planName: string;
  daysUntilExpiry: number | null;
  isOwner: boolean;
  canManageTeam: boolean;
  canViewBilling: boolean;
  events: OrganizerEventItem[];
  pendingQuotesCount: number;
  pendingBookingsCount: number;
  /** Devis / réservations chargés côté vendeur (reçus) ou côté acheteur (envoyés). */
  marketPerspective: 'vendor' | 'organizer';
  ticketing: B2bTicketingSummary | null;
  eventsQuota: QuotaPair;
  guestsQuota: QuotaPair;
  managersQuota: QuotaPair;
  /** Checklist de démarrage, rendue telle quelle sous l’en-tête. */
  checklist?: React.ReactNode;
}

const UNLIMITED = 9999;

function ratio({ used, max }: QuotaPair) {
  if (used == null || max == null || max <= 0 || max >= UNLIMITED) return null;
  return used / max;
}

function quotaLabel({ used, max }: QuotaPair) {
  if (used == null) return '—';
  if (max == null || max >= UNLIMITED) return `${used}`;
  return `${used} / ${max}`;
}

function daysFromToday(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return Math.round((day.getTime() - today.getTime()) / 86_400_000);
}

function countdown(days: number) {
  if (days <= 0) return 'Aujourd’hui';
  if (days === 1) return 'Demain';
  return `J-${days}`;
}

/** Barre de jauge : verte, ambre à 80 %, rouge au-delà du quota. */
function QuotaBar({ value }: { value: number | null }) {
  if (value == null) return null;
  const pct = Math.min(100, Math.round(value * 100));
  return (
    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted" aria-hidden>
      <div
        className={cn(
          'h-full rounded-full transition-all',
          value >= 1 ? 'bg-danger' : value >= 0.8 ? 'bg-festive-accent' : 'bg-primary',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  gauge,
  tone = 'default',
}: {
  label: string;
  value: React.ReactNode;
  hint: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  gauge?: number | null;
  tone?: 'default' | 'warning';
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5 transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted">{label}</span>
        <Icon className="h-4 w-4 text-primary" aria-hidden />
      </div>
      <span className="mt-2 truncate font-display text-xl font-semibold tabular-nums text-foreground sm:text-2xl">{value}</span>
      <span className={cn('mt-0.5 text-xs', tone === 'warning' ? 'font-semibold text-festive-accent' : 'text-muted')}>
        {hint}
      </span>
      <QuotaBar value={gauge ?? null} />
    </Link>
  );
}

interface TodoItem {
  id: string;
  label: string;
  detail?: string;
  href: string;
  count?: number;
  icon: React.ComponentType<{ className?: string }>;
  urgent?: boolean;
}

/**
 * Accueil de l’organisateur B2B (forfaits Business, Premium, Entreprise) :
 * ce qui attend une action, les indicateurs clés et l’agenda des événements.
 * Pas de raccourcis : le menu latéral les porte déjà.
 */
export default function B2bOrganizerHome({
  planName,
  daysUntilExpiry,
  isOwner,
  canManageTeam,
  canViewBilling,
  events,
  pendingQuotesCount,
  pendingBookingsCount,
  marketPerspective,
  ticketing,
  eventsQuota,
  guestsQuota,
  managersQuota,
  checklist,
}: B2bOrganizerHomeProps) {
  const nextEvent = useMemo(() => pickNextEvent(events), [events]);

  const upcoming = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return events
      .filter((event) => new Date(event.date).getTime() >= startOfToday.getTime())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events]);

  const agenda = upcoming.filter((event) => event.id !== nextEvent?.id).slice(0, 4);
  const guestsRatio = ratio(guestsQuota);
  const licenceSoon = daysUntilExpiry != null && daysUntilExpiry <= 15;

  const todo: TodoItem[] = [];
  if (licenceSoon && (canViewBilling || isOwner)) {
    todo.push({
      id: 'licence',
      label: daysUntilExpiry! <= 0 ? 'Renouveler l’abonnement' : 'Licence bientôt expirée',
      detail:
        daysUntilExpiry! <= 0
          ? 'Les invitations et le contrôle d’accès sont suspendus.'
          : `Expire dans ${daysUntilExpiry} jour${daysUntilExpiry! > 1 ? 's' : ''}.`,
      href: canViewBilling ? '/dashboard/billing' : '/dashboard/profile',
      icon: AlertTriangle,
      urgent: true,
    });
  }
  const asVendor = marketPerspective === 'vendor';
  if (pendingQuotesCount > 0) {
    todo.push({
      id: 'quotes',
      label: asVendor ? 'Demandes de devis reçues' : 'Devis en cours',
      href: asVendor ? '/dashboard/quotes?role=vendor' : '/dashboard/quotes',
      count: pendingQuotesCount,
      icon: Inbox,
      urgent: false,
    });
  }
  if (pendingBookingsCount > 0) {
    todo.push({
      id: 'bookings',
      label: asVendor ? 'Réservations à confirmer' : 'Réservations en attente',
      href: asVendor ? '/dashboard/bookings?tab=bookings&role=vendor' : '/dashboard/bookings?tab=bookings',
      count: pendingBookingsCount,
      icon: CalendarCheck,
    });
  }
  if ((ticketing?.pendingOrdersCount ?? 0) > 0) {
    todo.push({
      id: 'orders',
      label: 'Commandes non payées',
      href: '/dashboard/tickets',
      count: ticketing!.pendingOrdersCount,
      icon: Ticket,
    });
  }
  if (guestsRatio != null && guestsRatio >= 0.8) {
    todo.push({
      id: 'guests-quota',
      label: guestsRatio >= 1 ? 'Quota d’invités atteint' : 'Quota d’invités presque atteint',
      detail: `${quotaLabel(guestsQuota)} invités sur le forfait ${planName}.`,
      href: canViewBilling ? '/dashboard/billing' : '/dashboard/events',
      icon: Users,
      urgent: guestsRatio >= 1,
    });
  }

  return (
    <div className="space-y-6 pb-16 animate-fade-in em-dashboard-home">
      <div className="flex justify-end">
        <Button href="/dashboard/events?create=1" leftIcon={<PlusCircle className="h-4 w-4" />}>
          Nouvel événement
        </Button>
      </div>

      {/* Prochain événement + file « à traiter » */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-5" aria-label="Priorités">
        <div className="min-w-0 lg:col-span-3">
          {nextEvent ? (
            <NextEventCard event={nextEvent} />
          ) : (
            <div className="flex h-full flex-col justify-center gap-3 rounded-3xl border border-dashed border-border bg-surface p-6">
              <Calendar className="h-6 w-6 text-primary" aria-hidden />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Aucun événement à venir</h2>
              </div>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col rounded-3xl border border-border bg-surface p-4 sm:p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">À traiter</h2>
            {todo.length > 0 && (
              <span className="rounded-full bg-festive-accent-soft px-2 py-0.5 text-xs font-bold text-festive-accent">
                {todo.length}
              </span>
            )}
          </div>
          {todo.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
              <CheckCircle2 className="h-7 w-7 text-primary" aria-hidden />
              <p className="text-sm font-semibold text-foreground">Tout est à jour</p>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {todo.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="group -mx-2 flex min-h-14 items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                          item.urgent ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary',
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                        {item.detail ? <span className="block truncate text-xs text-muted">{item.detail}</span> : null}
                      </span>
                      {item.count != null && (
                        <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-bold tabular-nums text-background">
                          {item.count}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {checklist}

      {/* Indicateurs clés */}
      <section aria-label="Indicateurs clés" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          label="Événements à venir"
          value={upcoming.length}
          hint={`${quotaLabel(eventsQuota)} événements du forfait`}
          icon={Calendar}
          href="/dashboard/events"
          gauge={ratio(eventsQuota)}
        />
        <KpiCard
          label="Invités"
          value={guestsQuota.used ?? 0}
          hint={
            guestsRatio != null && guestsRatio >= 1
              ? `Quota de ${guestsQuota.max} dépassé`
              : guestsQuota.max != null && guestsQuota.max < UNLIMITED
                ? `sur ${guestsQuota.max} inclus`
                : 'tous événements confondus'
          }
          icon={Users}
          href="/dashboard/events"
          gauge={guestsRatio}
          tone={guestsRatio != null && guestsRatio >= 1 ? 'warning' : 'default'}
        />
        {ticketing ? (
          <KpiCard
            label="Recettes billetterie"
            value={formatFc(ticketing.totalRevenueFc)}
            hint={`${ticketing.paidTicketsCount} billet${ticketing.paidTicketsCount > 1 ? 's' : ''} payé${ticketing.paidTicketsCount > 1 ? 's' : ''}`}
            icon={Wallet}
            href="/dashboard/tickets"
          />
        ) : null}
        <KpiCard
          label="Équipe"
          value={quotaLabel(managersQuota)}
          hint="managers du forfait"
          icon={Users}
          href={canManageTeam ? '/dashboard/team' : '/dashboard/profile'}
          gauge={ratio(managersQuota)}
        />
      </section>

      {/* Agenda */}
      <section>
        <div className="min-w-0 rounded-3xl border border-border bg-surface p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">Ensuite à l’agenda</h2>
            <Link href="/dashboard/events" className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary hover:underline">
              Tous les événements
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          {agenda.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              {nextEvent ? 'Rien d’autre de prévu après le prochain événement.' : 'Aucun événement planifié.'}
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {agenda.map((event) => {
                const date = new Date(event.date);
                const days = daysFromToday(date);
                return (
                  <li key={event.id}>
                    <Link
                      href={`/dashboard/events/${event.id}`}
                      className="group -mx-2 flex min-h-14 items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <span className="text-xs font-bold uppercase leading-none">
                          {date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}
                        </span>
                        <span className="text-base font-bold leading-tight tabular-nums">{date.getDate()}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{event.title}</span>
                        {event.location ? (
                          <span className="flex items-center gap-1 truncate text-xs text-muted">
                            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                            <span className="truncate">{event.location}</span>
                          </span>
                        ) : null}
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs font-semibold text-muted">
                        <Clock className="h-3 w-3" aria-hidden />
                        {countdown(days)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

      </section>
    </div>
  );
}
