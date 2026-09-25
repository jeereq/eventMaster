'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CalendarCheck,
  Check,
  ChevronRight,
  Clock,
  Crown,
  Heart,
  HelpCircle,
  LayoutGrid,
  Mail,
  MapPin,
  PlusCircle,
  ScanLine,
  Send,
  Sparkles,
  Store,
  UserPlus,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth, type PlanCapabilities } from '@/context/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import NextEventCard, { pickNextEvent } from '@/components/dashboard/NextEventCard';
import { LANDING_PLANS, isB2cPlanId } from '@/config/landingPricing';
import { eventDashboardHref } from '@/lib/eventRoutes';
import { cn } from '@/lib/cn';

/** Forfait Particulier (B2C) : mariage, anniversaire, fête privée. */
export function isPersonalOrganizerPlan(plan?: string | null, planFeatures?: PlanCapabilities | null): boolean {
  return Boolean((plan && isB2cPlanId(plan)) || planFeatures?.audience === 'B2C');
}

export interface PersonalOrganizerEvent {
  id: string;
  title: string;
  date: string;
  location?: string | null;
  roomId?: string | null;
}

interface WorkspaceStats {
  guests: { total: number; accepted: number; declined: number; pending: number; checkedIn: number };
  upcoming: { id: string; guests: number; checkedIn: number }[];
}

/** Au-delà de ce seuil, le quota est affiché comme illimité (forfait Particulier +200). */
const UNLIMITED_THRESHOLD = 100_000;

const OCCASIONS = ['Mariage', 'Dot', 'Anniversaire', 'Baptême', 'Fête privée'];

function isUnlimited(max?: number | null) {
  return max == null || max < 0 || max >= UNLIMITED_THRESHOLD;
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return {
    month: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
    day: d.toLocaleDateString('fr-FR', { day: '2-digit' }),
    full: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
  };
}

function daysUntil(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(iso);
  day.setHours(0, 0, 0, 0);
  return Math.round((day.getTime() - today.getTime()) / 86_400_000);
}

interface JourneyStep {
  id: string;
  title: string;
  hint: string;
  done: boolean;
  href: string;
  cta: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Accueil de l’organisateur Particulier (B2C) : une seule question à l’écran,
 * « où en est ma fête ? » — prochain événement, réponses des invités, étape suivante.
 * Les outils avancés (billetterie, statistiques…) restent accessibles depuis le menu.
 */
export default function PersonalOrganizerHome({ events }: { events: PersonalOrganizerEvent[] }) {
  const { user, tenant, planQuota, access } = useAuth();
  const [stats, setStats] = useState<WorkspaceStats | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get('/events/workspace-stats')
      .then((data) => {
        if (alive && data?.guests) setStats(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [events.length]);

  const nextEvent = useMemo(() => pickNextEvent(events), [events]);
  const focusEvent = nextEvent ?? events[events.length - 1] ?? null;
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [events],
  );

  const planMeta = LANDING_PLANS.find((p) => p.id === tenant?.plan);
  const planName = planMeta?.ms365Name || 'Particulier';
  const isOwner = Boolean(access?.isOwner) || (Boolean(user?.id) && user?.id === tenant?.managerId);
  const canCreate = access?.canCreateEvents !== false;
  const daysUntilExpiry = tenant?.licenseExpiresAt ? daysUntil(tenant.licenseExpiresAt) : null;

  const usedEvents = planQuota?.usage.events ?? events.length;
  const maxEvents = planQuota?.limits.maxEvents;
  const eventsAtLimit = !isUnlimited(maxEvents) && usedEvents >= (maxEvents ?? 0);
  const usedGuests = planQuota?.usage.guests ?? stats?.guests.total ?? 0;
  const maxGuests = planQuota?.limits.maxGuests;
  const guestsUnlimited = isUnlimited(maxGuests);
  const guestsPct = guestsUnlimited || !maxGuests ? 0 : Math.min(100, Math.round((usedGuests / maxGuests) * 100));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const firstName = user?.name?.split(' ')[0];

  const focusStats = focusEvent ? stats?.upcoming.find((u) => u.id === focusEvent.id) : undefined;
  const focusGuests = focusStats?.guests ?? 0;
  const answered = (stats?.guests.accepted ?? 0) + (stats?.guests.declined ?? 0);

  const steps: JourneyStep[] = focusEvent
    ? [
        {
          id: 'create',
          title: 'Créer la fête',
          hint: 'Nom, date et lieu',
          done: true,
          href: eventDashboardHref(focusEvent.id, { tab: 'prep' }),
          cta: 'Modifier',
          icon: Calendar,
        },
        {
          id: 'room',
          title: 'Salle & plan de table',
          hint: 'Placez les tables en 2D ou 3D',
          done: Boolean(focusEvent.roomId),
          href: eventDashboardHref(focusEvent.id, { tab: 'tablePlan' }),
          cta: 'Dessiner le plan',
          icon: LayoutGrid,
        },
        {
          id: 'guests',
          title: 'Liste des invités',
          hint: 'Ajoutez ou importez vos contacts',
          done: focusGuests > 0,
          href: eventDashboardHref(focusEvent.id, { tab: 'guests' }),
          cta: 'Ajouter des invités',
          icon: UserPlus,
        },
        {
          id: 'invite',
          title: 'Envoyer les invitations',
          hint: 'Faire-part WhatsApp avec réponse en ligne',
          done: focusGuests > 0 && answered > 0,
          href: eventDashboardHref(focusEvent.id, { tab: 'invitations' }),
          cta: 'Envoyer',
          icon: Send,
        },
        {
          id: 'dday',
          title: 'Accueil le jour J',
          hint: 'Scan du QR à l’entrée',
          done: (focusStats?.checkedIn ?? 0) > 0,
          href: eventDashboardHref(focusEvent.id, { protocol: true }),
          cta: 'Préparer l’accueil',
          icon: ScanLine,
        },
      ]
    : [];
  const nextStep = steps.find((s) => !s.done) ?? null;
  const doneCount = steps.filter((s) => s.done).length;

  const shortcuts = [
    focusEvent && {
      label: 'Ajouter des invités',
      hint: 'Un par un ou depuis Excel',
      href: eventDashboardHref(focusEvent.id, { tab: 'guests' }),
      icon: UserPlus,
    },
    focusEvent && {
      label: 'Plan de table 2D / 3D',
      hint: 'Tables, allées, scène',
      href: eventDashboardHref(focusEvent.id, { tab: 'tablePlan' }),
      icon: LayoutGrid,
    },
    {
      label: 'Faire-part',
      hint: 'Modèles d’invitation',
      href: '/dashboard/templates',
      icon: Mail,
    },
    {
      label: 'Salles & prestataires',
      hint: 'Traiteur, déco, DJ, photo',
      href: '/dashboard/catalogue',
      icon: Store,
    },
    {
      label: 'Budget avec l’IA',
      hint: '3 formules chiffrées',
      href: '/dashboard/catalogue?tab=plan&planView=ai',
      icon: Sparkles,
    },
    {
      label: 'Devis & réservations',
      hint: 'Suivre vos demandes',
      href: '/dashboard/bookings?tab=quotes',
      icon: CalendarCheck,
    },
  ].filter(Boolean) as { label: string; hint: string; href: string; icon: React.ComponentType<{ className?: string }> }[];

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 animate-fade-in em-dashboard-home">
      {isOwner && daysUntilExpiry != null && daysUntilExpiry <= 15 && (
        <div
          role="status"
          className={cn(
            'flex flex-col gap-3 rounded-2xl border p-4 text-sm sm:flex-row sm:items-center sm:justify-between',
            daysUntilExpiry <= 0
              ? 'border-danger/30 bg-danger/10 text-danger'
              : 'border-festive-accent/30 bg-festive-accent-soft text-festive-accent',
          )}
        >
          <div className="flex items-center gap-3">
            {daysUntilExpiry <= 0 ? <AlertTriangle className="h-5 w-5 shrink-0" /> : <Clock className="h-5 w-5 shrink-0" />}
            <p className="font-semibold">
              {daysUntilExpiry <= 0
                ? 'Votre forfait a expiré : vos invitations et l’accueil QR sont en pause.'
                : `Votre forfait expire dans ${daysUntilExpiry} jour${daysUntilExpiry > 1 ? 's' : ''}.`}
            </p>
          </div>
          <Link
            href="/dashboard/billing"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary-solid px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-solid-hover"
          >
            Renouveler
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* En-tête */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar name={user?.name} src={user?.avatarUrl} size="lg" className="h-12 w-12 text-base" />
          <div className="min-w-0">
            <p className="truncate text-sm text-muted">
              {greeting}
              {firstName ? `, ${firstName}` : ''}
            </p>
            <h1 className="font-display truncate text-2xl font-semibold leading-tight text-foreground sm:text-[2rem]">
              {focusEvent ? 'Ma fête en un coup d’œil' : 'Organisons votre fête'}
            </h1>
          </div>
        </div>
        <Link
          href="/dashboard/billing"
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-border bg-surface px-3.5 text-sm text-foreground transition hover:border-primary/40 sm:self-auto"
        >
          <Crown className="h-4 w-4 text-primary" aria-hidden />
          <span className="font-semibold">{planName}</span>
          {isOwner && daysUntilExpiry != null && daysUntilExpiry > 15 && (
            <span className="text-muted">· {daysUntilExpiry} j restants</span>
          )}
        </Link>
      </header>

      {focusEvent ? (
        <>
          {/* Prochain événement + réponses */}
          <section className="grid gap-4 lg:grid-cols-5" aria-label="Prochain événement">
            <div className="lg:col-span-3">
              {nextEvent ? (
                <NextEventCard event={nextEvent} />
              ) : (
                <Link
                  href={eventDashboardHref(focusEvent.id)}
                  className="flex h-full flex-col justify-between gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6 hover:border-primary/40"
                >
                  <div>
                    <p className="text-xs font-semibold text-muted">Dernière fête</p>
                    <h2 className="font-display mt-1 text-2xl font-semibold text-foreground">{focusEvent.title}</h2>
                    <p className="mt-2 text-sm text-muted capitalize">{shortDate(focusEvent.date).full}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    Revoir le bilan <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              )}
            </div>
            <GuestResponsesCard
              stats={stats}
              allEvents={events.length > 1}
              invitationsHref={eventDashboardHref(focusEvent.id, { tab: 'invitations' })}
              guestsHref={eventDashboardHref(focusEvent.id, { tab: 'guests' })}
            />
          </section>

          {/* Parcours de préparation */}
          <section className="rounded-3xl border border-border bg-surface p-4 sm:p-6" aria-labelledby="b2c-journey-title">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="b2c-journey-title" className="text-base font-semibold text-foreground">
                  Préparation de « {focusEvent.title} »
                </h2>
                <p className="text-sm text-muted">
                  {doneCount} étape{doneCount > 1 ? 's' : ''} sur {steps.length}
                  {nextStep ? ` · prochaine : ${nextStep.title.toLowerCase()}` : ' · tout est prêt'}
                </p>
              </div>
              {nextStep ? (
                <Link
                  href={nextStep.href}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary-solid px-4 text-sm font-semibold text-primary-foreground shadow-2xs transition hover:bg-primary-solid-hover"
                >
                  {nextStep.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>

            <div
              className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={steps.length}
              aria-valuenow={doneCount}
              aria-label="Avancement de la préparation"
            >
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
            </div>

            <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {steps.map((step, i) => {
                const current = nextStep?.id === step.id;
                const Icon = step.icon;
                return (
                  <li key={step.id}>
                    <Link
                      href={step.href}
                      aria-current={current ? 'step' : undefined}
                      className={cn(
                        'group flex h-full items-start gap-3 rounded-2xl border p-3 transition lg:flex-col lg:gap-2',
                        current
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/15'
                          : 'border-border hover:border-primary/40',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                          step.done
                            ? 'bg-primary text-primary-foreground'
                            : current
                              ? 'bg-primary/15 text-primary'
                              : 'bg-surface-muted text-muted',
                        )}
                      >
                        {step.done ? <Check className="h-4 w-4" aria-label="Terminé" /> : <Icon className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-muted">Étape {i + 1}</span>
                        <span className={cn('block text-sm font-semibold', step.done ? 'text-muted' : 'text-foreground')}>
                          {step.title}
                        </span>
                        <span className={cn('text-xs text-muted', current ? 'block' : 'hidden sm:block')}>{step.hint}</span>
                      </span>
                      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 lg:hidden" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        </>
      ) : (
        <EmptyHero canCreate={canCreate && !eventsAtLimit} />
      )}

      {/* Raccourcis */}
      <section aria-labelledby="b2c-shortcuts-title">
        <h2 id="b2c-shortcuts-title" className="mb-3 text-base font-semibold text-foreground">
          Raccourcis
        </h2>
        <div className={cn('grid grid-cols-2 gap-3', shortcuts.length > 4 ? 'md:grid-cols-3 xl:grid-cols-6' : 'md:grid-cols-4')}>
          {shortcuts.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.label}
                href={s.href}
                className="group flex min-h-[6.5rem] flex-col justify-between gap-3 rounded-2xl border border-border bg-surface p-4 transition hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">{s.label}</span>
                  <span className="block text-xs text-muted">{s.hint}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Mes fêtes + forfait */}
      <section className={cn('grid gap-4', events.length > 0 && 'lg:grid-cols-3')}>
        {events.length > 0 && (
        <div className="rounded-3xl border border-border bg-surface p-4 sm:p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">
              Mes fêtes{' '}
              <span className="text-sm font-normal text-muted">
                {isUnlimited(maxEvents) ? `(${usedEvents})` : `(${usedEvents} sur ${maxEvents})`}
              </span>
            </h2>
            {events.length > 0 && (
              <Link href="/dashboard/events" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary">
                Tout voir <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
            <ul className="divide-y divide-border">
              {sortedEvents.map((ev) => {
                const d = shortDate(ev.date);
                const left = daysUntil(ev.date);
                const evStats = stats?.upcoming.find((u) => u.id === ev.id);
                return (
                  <li key={ev.id}>
                    <Link href={eventDashboardHref(ev.id)} className="group flex items-center gap-3 py-3">
                      <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-muted text-foreground">
                        <span className="text-[10px] font-semibold uppercase leading-none text-muted">{d.month}</span>
                        <span className="text-lg font-bold leading-tight">{d.day}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{ev.title}</span>
                        <span className="flex items-center gap-1 truncate text-xs text-muted">
                          {ev.location ? (
                            <>
                              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                              <span className="truncate">{ev.location}</span>
                            </>
                          ) : (
                            <span className="capitalize">{d.full}</span>
                          )}
                        </span>
                      </span>
                      <span className="hidden shrink-0 text-right text-xs text-muted sm:block">
                        {evStats ? `${evStats.guests} invité${evStats.guests > 1 ? 's' : ''}` : null}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
                          left < 0 ? 'bg-surface-muted text-muted' : left <= 7 ? 'bg-festive-accent-soft text-festive-accent' : 'bg-primary/10 text-primary',
                        )}
                      >
                        {left < 0 ? 'Passée' : left === 0 ? 'Aujourd’hui' : left === 1 ? 'Demain' : `J-${left}`}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          {canCreate && (
            eventsAtLimit ? (
              <Link
                href="/dashboard/billing"
                className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-festive-accent/40 text-sm font-semibold text-festive-accent hover:bg-festive-accent-soft"
              >
                <Crown className="h-4 w-4" />
                Limite atteinte : changer de forfait pour une nouvelle fête
              </Link>
            ) : (
              <Link
                href="/dashboard/events?create=1"
                className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-semibold text-primary hover:border-primary/40 hover:bg-primary/5"
              >
                <PlusCircle className="h-4 w-4" />
                Nouvelle fête
              </Link>
            )
          )}
        </div>
        )}

        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-4 sm:p-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Mon forfait</h2>
            <p className="text-sm text-muted">{planName}</p>
          </div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted">Fêtes</span>
            <span className="font-semibold tabular-nums text-foreground">
              {usedEvents}
              {isUnlimited(maxEvents) ? '' : ` / ${maxEvents}`}
            </span>
          </div>
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted">Invités</span>
              <span className="font-semibold tabular-nums text-foreground">
                {usedGuests}
                {guestsUnlimited ? '' : ` / ${maxGuests}`}
              </span>
            </div>
            {!guestsUnlimited && (
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className={cn('h-full rounded-full', guestsPct >= 90 ? 'bg-festive-accent' : 'bg-primary')}
                  style={{ width: `${guestsPct}%` }}
                />
              </div>
            )}
            {!guestsUnlimited && guestsPct >= 90 && (
              <p className="mt-1.5 text-xs text-festive-accent">Presque plein : passez au palier supérieur pour inviter plus.</p>
            )}
          </div>
          <div className="mt-auto flex flex-col gap-2">
            <Link
              href="/dashboard/billing"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-foreground hover:border-primary/40"
            >
              Gérer mon forfait
            </Link>
            <Link
              href="/dashboard/guide"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium text-muted hover:text-foreground"
            >
              <HelpCircle className="h-4 w-4" />
              Besoin d’aide ? Guide pas à pas
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function GuestResponsesCard({
  stats,
  allEvents,
  invitationsHref,
  guestsHref,
}: {
  stats: WorkspaceStats | null;
  allEvents: boolean;
  invitationsHref: string;
  guestsHref: string;
}) {
  const g = stats?.guests;
  const total = g?.total ?? 0;
  const rows = [
    { label: 'Présents', value: g?.accepted ?? 0, dot: 'bg-primary' },
    { label: 'En attente', value: g?.pending ?? 0, dot: 'bg-festive-accent' },
    { label: 'Absents', value: g?.declined ?? 0, dot: 'bg-muted/50' },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:p-6 lg:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Réponses des invités</h2>
          {allEvents ? <p className="text-xs text-muted">Toutes vos fêtes confondues</p> : null}
        </div>
        <Users className="h-5 w-5 text-muted" aria-hidden />
      </div>
      {total > 0 ? (
        <>
          <p className="text-foreground">
            <span className="font-display text-4xl font-semibold tabular-nums">{g?.accepted ?? 0}</span>
            <span className="text-sm text-muted"> présents confirmés sur {total}</span>
          </p>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
            {rows.map((r) =>
              r.value > 0 ? <span key={r.label} className={r.dot} style={{ width: `${(r.value / total) * 100}%` }} /> : null,
            )}
          </div>
          <ul className="grid grid-cols-3 gap-2 text-sm">
            {rows.map((r) => (
              <li key={r.label} className="min-w-0">
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', r.dot)} aria-hidden />
                  {r.label}
                </span>
                <span className="font-semibold tabular-nums text-foreground">{r.value}</span>
              </li>
            ))}
          </ul>
          {(g?.pending ?? 0) > 0 ? (
            <Link
              href={invitationsHref}
              className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-foreground hover:border-primary/40"
            >
              <Send className="h-4 w-4 text-primary" />
              Relancer les {g?.pending} en attente
            </Link>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-sm text-muted">
            Ajoutez vos invités puis envoyez le faire-part : leurs réponses s’afficheront ici en direct.
          </p>
          <Link
            href={guestsHref}
            className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary-solid text-sm font-semibold text-primary-foreground hover:bg-primary-solid-hover"
          >
            <UserPlus className="h-4 w-4" />
            Ajouter mes invités
          </Link>
        </>
      )}
    </div>
  );
}

function EmptyHero({ canCreate }: { canCreate: boolean }) {
  const steps = [
    { icon: Calendar, title: 'Créez la fête', hint: 'Nom, date, lieu' },
    { icon: LayoutGrid, title: 'Dessinez la salle', hint: 'Tables en 2D / 3D' },
    { icon: Send, title: 'Invitez sur WhatsApp', hint: 'Réponses en direct' },
    { icon: Heart, title: 'Accueillez le jour J', hint: 'Scan du QR à l’entrée' },
  ];
  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#064e3b] p-6 text-white sm:p-8">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full border-[32px] border-[#10b981] opacity-25"
      />
      <div className="relative max-w-2xl">
        <h2 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">
          Votre première fête commence ici
        </h2>
        <p className="mt-2 text-sm text-[#a7f3d0]">De quel événement s’agit-il ?</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {OCCASIONS.map((o) => (
            <Link
              key={o}
              href={canCreate ? '/dashboard/events?create=1' : '/dashboard/billing'}
              className="inline-flex min-h-11 items-center rounded-full bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
            >
              {o}
            </Link>
          ))}
        </div>
        <Link
          href={canCreate ? '/dashboard/events?create=1' : '/dashboard/billing'}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#10b981] px-5 text-sm font-semibold text-[#022c22] transition hover:bg-[#34d399]"
        >
          <PlusCircle className="h-4 w-4" />
          {canCreate ? 'Créer ma fête' : 'Choisir un forfait'}
        </Link>
      </div>
      <ol className="relative mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.title} className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
              <span className="flex items-center gap-2 text-xs font-semibold text-[#a7f3d0]">
                <Icon className="h-4 w-4" aria-hidden />
                Étape {i + 1}
              </span>
              <span className="mt-1 block text-sm font-semibold">{s.title}</span>
              <span className="block text-xs text-white/70">{s.hint}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
