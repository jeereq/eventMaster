'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  PageHeader,
  Breadcrumbs,
  Alert,
  Button,
  EmptyState,
  Input,
  ProjectCard,
  StatusPill,
  ViewModeToggle,
  useViewMode,
  listStackClass,
  Pagination,
  paginateItems,
  usePageSize,
} from '@/components/ui';
import { SkeletonListRow } from '@/components/ui/Skeleton';
import { formatFc } from '@/config/landingPricing';
import { CLIENT_AGENDA_HREF, dashboardEventHref } from '@/lib/marketplace';
import { rememberCatalogueReturn } from '@/lib/catalogueQuery';
import { Calendar, MapPin, QrCode, Ticket, LayoutDashboard, ScanLine } from 'lucide-react';
import { cn } from '@/lib/cn';
import OrgTicketingView from '@/components/OrgTicketingView';

type MyTicket = {
  orderId: string;
  status?: string;
  quantity: number;
  amountFc: number;
  paidAt: string | null;
  createdAt?: string;
  buyerName: string;
  event: {
    title: string;
    slug: string | null;
    date: string;
    location: string;
    isPublic: boolean;
  };
  guestId: string | null;
  rsvpUrl: string | null;
  guests?: Array<{ id: string; email: string; rsvpUrl: string }>;
};

type WhenFilter = 'all' | 'upcoming' | 'past';
type EntryFilter = 'all' | 'paid' | 'free';

function ticketIsUpcoming(ticket: MyTicket, now: number) {
  return new Date(ticket.event.date).getTime() >= now;
}

export default function TicketsPage() {
  const { access, tenant } = useAuth();
  const isClient = tenant?.accountKind === 'CLIENT' || access?.level === 'client';
  const isOrgRole = !isClient && (access?.isOwner || access?.level === 'owner' || access?.level === 'manager' || access?.level === 'protocol' || access?.level === 'staff' || tenant?.accountKind === 'ORGANIZER');

  const [activeTab, setActiveTab] = useState<'org' | 'my'>(isClient ? 'my' : 'org');
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [when, setWhen] = useState<WhenFilter>('all');
  const [entry, setEntry] = useState<EntryFilter>('all');
  const [location, setLocation] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('em-tickets-page-size', 12);
  const {
    mode: viewMode,
    setViewMode,
    columns,
    setGridColumns,
    gridClassName,
  } = useViewMode('em-view-tickets', 'grid', 2);

  // Si c'est un client, l'onglet est toujours exclusivement 'my'
  useEffect(() => {
    if (isClient) {
      setActiveTab('my');
    }
  }, [isClient]);

  const agendaHref = CLIENT_AGENDA_HREF;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/marketplace/my-tickets');
      setTickets(data.tickets || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger vos billets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const now = Date.now();
  const locations = useMemo(() => {
    const set = new Set<string>();
    for (const ticket of tickets) {
      const loc = ticket.event.location.trim();
      if (loc) set.add(loc);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [tickets]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (when === 'upcoming' && !ticketIsUpcoming(ticket, now)) return false;
      if (when === 'past' && ticketIsUpcoming(ticket, now)) return false;
      if (entry === 'paid' && !(ticket.amountFc > 0)) return false;
      if (entry === 'free' && ticket.amountFc > 0) return false;
      if (location && ticket.event.location !== location) return false;
      if (needle) {
        const hay = `${ticket.event.title} ${ticket.event.location} ${ticket.buyerName}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [tickets, q, when, entry, location, now]);

  useEffect(() => {
    setPage(1);
  }, [q, when, entry, location, pageSize]);

  const visible = paginateItems(filtered, page, pageSize);

  const ticketActions = (ticket: MyTicket) => {
    const detailsHref = ticket.event.slug && ticket.event.isPublic
      ? dashboardEventHref(ticket.event.slug)
      : null;
    return (
    <div className="flex flex-wrap gap-1.5">
      {ticket.status === 'PENDING' && detailsHref ? (
        <Link
          href={detailsHref}
          className="inline-flex"
          onClick={() => rememberCatalogueReturn('/dashboard/tickets')}
        >
          <Button size="sm">Reprendre le paiement</Button>
        </Link>
      ) : null}
      {ticket.guests && ticket.guests.length > 1 ? (
        <div className="inline-flex items-center gap-1.5 flex-wrap">
          {ticket.guests.map((g, idx) => (
            <Link key={g.id} href={`/rsvp/${g.id}`} className="inline-flex">
              <Button size="sm" variant={idx === 0 ? 'primary' : 'secondary'} leftIcon={<QrCode className="w-3.5 h-3.5" />}>
                Pass {idx + 1}
              </Button>
            </Link>
          ))}
        </div>
      ) : ticket.guestId ? (
        <Link href={`/rsvp/${ticket.guestId}`} className="inline-flex">
          <Button size="sm" leftIcon={<QrCode className="w-4 h-4" />}>
            Badge QR
          </Button>
        </Link>
      ) : null}
      {detailsHref ? (
        <Link
          href={detailsHref}
          className="inline-flex"
          onClick={() => rememberCatalogueReturn('/dashboard/tickets')}
        >
          <Button size="sm" variant="secondary">
            Détails
          </Button>
        </Link>
      ) : null}
    </div>
    );
  };

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title={isOrgRole && activeTab === 'org' ? 'Billetterie de l’organisation' : 'Mes billets & pass'}
        description={
          isOrgRole && activeTab === 'org'
            ? 'Suivi des ventes, gestion des commandes et contrôle d’accès jour J.'
            : 'Vos billets et pass QR pour le jour J.'
        }
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: isClient ? 'Marketplace' : 'Accueil', href: isClient ? '/dashboard/catalogue' : '/dashboard' },
              { label: isOrgRole && activeTab === 'org' ? 'Billetterie' : 'Mes billets' },
            ]}
          />
        }
        action={
          <Link href={agendaHref} className="inline-flex">
            <Button size="sm" leftIcon={<Calendar className="w-4 h-4" />}>
              Événements
            </Button>
          </Link>
        }
      />

      {/* Barre d'onglets pour les organisateurs, managers et protocole */}
      {isOrgRole && (
        <div className="flex gap-1.5 p-1 rounded-2xl bg-surface border border-border shadow-2xs w-fit" role="group" aria-label="Billetterie ou achats personnels">
          <button
            type="button"
            onClick={() => setActiveTab('org')}
            aria-pressed={activeTab === 'org'}
            className={cn(
              'inline-flex min-h-11 items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition touch-manipulation',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              activeTab === 'org'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted hover:text-foreground hover:bg-surface-muted'
            )}
          >
            <Ticket className="w-4 h-4 text-primary" />
            <span>Billetterie de l’organisation</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my')}
            aria-pressed={activeTab === 'my'}
            className={cn(
              'inline-flex min-h-11 items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition touch-manipulation',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              activeTab === 'my'
                ? 'bg-foreground text-background shadow-xs'
                : 'text-muted hover:text-foreground hover:bg-surface-muted'
            )}
          >
            <QrCode className="w-4 h-4 text-primary" />
            <span>Mes achats personnels</span>
            {tickets.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-xs font-bold bg-primary text-primary-foreground">
                {tickets.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Vue billetterie organisation (propriétaire, manager, protocole) */}
      {isOrgRole && activeTab === 'org' ? (
        <OrgTicketingView protocolMode={access?.isProtocolOnly} />
      ) : (
        <>
          {error && <Alert variant="error">{error}</Alert>}

          {loading ? (
            <div className="space-y-4">
              <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3 sm:p-4 space-y-3">
                <div className="h-11 w-full rounded-lg bg-surface-muted animate-pulse" />
              </div>
              <div className={listStackClass}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonListRow key={i} />
                ))}
              </div>
            </div>
          ) : tickets.length === 0 ? (
            <EmptyState
              icon={<Ticket className="w-5 h-5" />}
              title="Aucun billet pour le moment"
              description="Découvrez les événements du catalogue pour obtenir vos billets et pass d’accès."
              action={
                <Link href={agendaHref}>
                  <Button size="sm">Découvrir les événements</Button>
                </Link>
              }
            />
          ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-3 sm:p-4 space-y-3 shadow-[var(--shadow-soft)]">
            {/* Filtres d'état rapides (Date & Entrée) */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/70 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 shrink-0" role="group" aria-label="Date">
                  {([
                    ['all', 'Toutes dates'],
                    ['upcoming', 'À venir'],
                    ['past', 'Passés'],
                  ] as Array<[WhenFilter, string]>).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setWhen(id)}
                      className={cn(
                        'px-2.5 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold border transition touch-manipulation whitespace-nowrap',
                        when === id
                          ? 'bg-primary-solid text-primary-foreground border-primary-solid shadow-xs'
                          : 'border-border bg-surface-muted/60 text-muted hover:text-foreground hover:border-primary/40',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <span className="text-muted/40 hidden sm:inline">|</span>

                <div className="flex items-center gap-1 shrink-0" role="group" aria-label="Entrée">
                  {([
                    ['all', 'Tous tarifs'],
                    ['paid', 'Payants'],
                    ['free', 'Entrée libre'],
                  ] as Array<[EntryFilter, string]>).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setEntry(id)}
                      className={cn(
                        'px-2.5 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold border transition touch-manipulation whitespace-nowrap',
                        entry === id
                          ? 'bg-primary-solid text-primary-foreground border-primary-solid shadow-xs'
                          : 'border-border bg-surface-muted/60 text-muted hover:text-foreground hover:border-primary/40',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <span className="text-[11px] font-medium text-muted shrink-0 whitespace-nowrap pl-2">
                {filtered.length} billet{filtered.length > 1 ? 's' : ''}
                {filtered.length !== tickets.length ? ` / ${tickets.length}` : ''}
              </span>
            </div>

            {/* Barre de recherche + Sélecteur de lieu + Vue */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <div className="flex-1 min-w-0">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Titre, lieu, acheteur…"
                  aria-label="Rechercher un billet"
                  leftIcon={<Ticket className="w-4 h-4" />}
                />
              </div>

              {locations.length > 1 ? (
                <div className="sm:w-48 shrink-0">
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    aria-label="Filtrer par lieu"
                    className="w-full h-10 px-3 rounded-xl border border-border bg-surface text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  >
                    <option value="">Tous les lieux</option>
                    {locations.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              <ViewModeToggle
                storageKey="em-view-tickets"
                value={viewMode}
                onChange={setViewMode}
                columns={columns}
                onColumnsChange={setGridColumns}
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Ticket className="w-5 h-5" />}
              title="Aucun billet pour ces filtres"
              description="Changez la recherche, la date (à venir / passés), le type d’entrée ou le lieu."
            />
          ) : (
            <>
              <div className={viewMode === 'grid' ? gridClassName : listStackClass}>
                {visible.map((ticket) => {
                  const upcoming = ticketIsUpcoming(ticket, now);
                  const dateLabel = new Date(ticket.event.date).toLocaleString('fr-FR', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  });
                  return (
                    <ProjectCard
                      key={ticket.orderId}
                      id={ticket.orderId}
                      layout={viewMode}
                      title={ticket.event.title}
                      icon={<Ticket className="w-4 h-4" />}
                      meta={
                        <span className="inline-flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            {dateLabel}
                          </span>
                          {ticket.event.location ? (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              {ticket.event.location}
                            </span>
                          ) : null}
                        </span>
                      }
                      description={`${ticket.quantity} place${ticket.quantity > 1 ? 's' : ''}${ticket.amountFc > 0 ? ` · ${formatFc(ticket.amountFc)}` : ' · entrée libre'}`}
                      value={ticket.amountFc > 0 ? formatFc(ticket.amountFc) : 'Libre'}
                      valueMeta={`${ticket.quantity} place${ticket.quantity > 1 ? 's' : ''}`}
                      status={
                        ticket.status === 'PENDING' ? (
                          <StatusPill tone="amber">Paiement en cours</StatusPill>
                        ) : (
                          <StatusPill tone={upcoming ? 'emerald' : 'slate'}>
                            {upcoming ? 'À venir' : 'Passé'}
                          </StatusPill>
                        )
                      }
                      actions={ticketActions(ticket)}
                    />
                  );
                })}
              </div>
              <Pagination
                page={page}
                pageSize={pageSize}
                total={filtered.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                itemLabel="billets"
              />
            </>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
}
