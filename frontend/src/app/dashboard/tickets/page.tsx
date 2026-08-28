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
import { CLIENT_AGENDA_HREF } from '@/lib/marketplace';
import { Calendar, ExternalLink, Loader2, MapPin, QrCode, Ticket } from 'lucide-react';
import { cn } from '@/lib/cn';

type MyTicket = {
  orderId: string;
  quantity: number;
  amountFc: number;
  paidAt: string | null;
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
  publicHref: string | null;
  guests?: Array<{ id: string; email: string; rsvpUrl: string }>;
};

type WhenFilter = 'all' | 'upcoming' | 'past';
type EntryFilter = 'all' | 'paid' | 'free';

function ticketIsUpcoming(ticket: MyTicket, now: number) {
  return new Date(ticket.event.date).getTime() >= now;
}

export default function ClientTicketsPage() {
  const { access } = useAuth();
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

  const isClient = access?.level === 'client';
  const agendaHref = isClient ? CLIENT_AGENDA_HREF : '/marketplace/evenements';

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

  const ticketActions = (ticket: MyTicket) => (
    <div className="flex flex-wrap gap-1.5">
      {ticket.guestId ? (
        <Link href={`/rsvp/${ticket.guestId}`} className="inline-flex">
          <Button size="sm" leftIcon={<QrCode className="w-4 h-4" />}>
            Badge QR
          </Button>
        </Link>
      ) : null}
      {ticket.publicHref ? (
        <Link href={ticket.publicHref} className="inline-flex">
          <Button size="sm" variant="secondary" leftIcon={<ExternalLink className="w-4 h-4" />}>
            Fiche
          </Button>
        </Link>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Mes billets"
        description="Inscriptions et achats rattachés à votre compte (ou à votre e-mail). Filtrez, passez en grille ou liste, puis ouvrez le badge QR."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: isClient ? 'Marketplace' : 'Accueil', href: isClient ? '/dashboard/catalogue' : '/dashboard' },
              { label: 'Mes billets' },
            ]}
          />
        }
        action={
          <Link href={agendaHref} className="inline-flex">
            <Button size="sm" leftIcon={<Calendar className="w-4 h-4" />}>
              Agenda
            </Button>
          </Link>
        }
      />

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
          description="Inscrivez-vous à un événement public ou achetez un billet depuis l’agenda du marketplace — il apparaîtra ici si vous êtes connecté, ou si l’e-mail du compte correspond."
          action={
            <Link href={agendaHref}>
              <Button size="sm">Voir l’agenda</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3 sm:p-4 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-end gap-3">
              <div className="flex-1 min-w-[12rem]">
                <Input
                  label="Recherche"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Titre, lieu, nom…"
                  hint="Filtre le titre de l’événement, le lieu ou le nom sur le billet."
                />
              </div>
              {locations.length > 1 ? (
                <label className="space-y-1.5 min-w-[10rem]">
                  <span className="block text-xs font-semibold text-muted">Lieu</span>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
                  >
                    <option value="">Tous les lieux</option>
                    {locations.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              <ViewModeToggle
                storageKey="em-view-tickets"
                value={viewMode}
                onChange={setViewMode}
                columns={columns}
                onColumnsChange={setGridColumns}
                className="lg:mb-0.5"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Date">
                {([
                  ['all', 'Toutes les dates'],
                  ['upcoming', 'À venir'],
                  ['past', 'Passés'],
                ] as Array<[WhenFilter, string]>).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setWhen(id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-semibold border',
                      when === id ? 'bg-primary text-white border-primary' : 'border-border text-muted hover:text-foreground',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Entrée">
                {([
                  ['all', 'Payant et libre'],
                  ['paid', 'Payant'],
                  ['free', 'Entrée libre'],
                ] as Array<[EntryFilter, string]>).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setEntry(id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-semibold border',
                      entry === id ? 'bg-primary text-white border-primary' : 'border-border text-muted hover:text-foreground',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-muted">
              {filtered.length} billet{filtered.length > 1 ? 's' : ''}
              {filtered.length !== tickets.length ? ` sur ${tickets.length}` : ''}
            </p>
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
                        <StatusPill tone={upcoming ? 'emerald' : 'slate'}>
                          {upcoming ? 'À venir' : 'Passé'}
                        </StatusPill>
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
    </div>
  );
}
