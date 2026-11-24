'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Alert,
  Button,
  EmptyState,
  OverflowMenu,
  PageHero,
  ProjectCard,
  StatusPill,
  ViewModeToggle,
  useViewMode,
  listStackClass,
  Pagination,
  usePaginateItems,
  usePageSize,
  UnderlineTabs,
} from '@/components/ui';
import { SkeletonListRow } from '@/components/ui/Skeleton';
import { formatFc } from '@/config/landingPricing';
import { CLIENT_AGENDA_HREF, dashboardEventHref } from '@/lib/marketplace';
import { rememberCatalogueReturn } from '@/lib/catalogueQuery';
import { Calendar, MapPin, QrCode, Ticket, LayoutDashboard, ScanLine, MoreHorizontal } from '@/components/icons';
import OrgTicketingView from '@/components/OrgTicketingView';
import CatalogueFilterBar, {
  CatalogueChoicePills,
  CatalogueFilterField,
  type CatalogueFilterChip,
} from '@/components/CatalogueFilterBar';

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

const WHEN_OPTIONS: Array<{ id: WhenFilter; label: string }> = [
  { id: 'all', label: 'Toutes dates' },
  { id: 'upcoming', label: 'À venir' },
  { id: 'past', label: 'Passés' },
];

const ENTRY_OPTIONS: Array<{ id: EntryFilter; label: string }> = [
  { id: 'all', label: 'Tous tarifs' },
  { id: 'paid', label: 'Payants' },
  { id: 'free', label: 'Entrée libre' },
];

function ticketIsUpcoming(ticket: MyTicket, now: number) {
  return new Date(ticket.event.date).getTime() >= now;
}

export default function TicketsPage() {
  const { access, tenant } = useAuth();
  const isClient = tenant?.accountKind === 'CLIENT' || access?.level === 'client';
  const isOrgRole = !isClient && (access?.isOwner || access?.level === 'owner' || access?.level === 'manager' || access?.level === 'protocol' || access?.level === 'staff' || tenant?.accountKind === 'ORGANIZER');

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'org' | 'my'>(
    isClient || searchParams.get('tab') === 'my' ? 'my' : 'org',
  );
  /** L’onglet est aussi dans l’URL pour que le titre de la barre du haut suive. */
  const selectTab = (tab: 'org' | 'my') => {
    setActiveTab(tab);
    router.replace(tab === 'my' ? `${pathname}?tab=my` : pathname, { scroll: false });
  };
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
  } = useViewMode('em-view-tickets', 'list', 2);

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
    })
      // Prochains événements d'abord (du plus proche au plus lointain), puis les passés (du plus récent au plus ancien)
      .sort((a, b) => {
        const aTime = new Date(a.event.date).getTime();
        const bTime = new Date(b.event.date).getTime();
        const aUpcoming = aTime >= now;
        const bUpcoming = bTime >= now;
        if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
        return aUpcoming ? aTime - bTime : bTime - aTime;
      });
  }, [tickets, q, when, entry, location, now]);

  useEffect(() => {
    setPage(1);
  }, [q, when, entry, location, pageSize]);

  const visible = usePaginateItems(filtered, page, pageSize);

  const filterChips: CatalogueFilterChip[] = [
    ...(when !== 'all'
      ? [{ id: 'when', label: 'Date', value: WHEN_OPTIONS.find((o) => o.id === when)?.label ?? when }]
      : []),
    ...(entry !== 'all'
      ? [{ id: 'entry', label: 'Entrée', value: ENTRY_OPTIONS.find((o) => o.id === entry)?.label ?? entry }]
      : []),
    ...(location ? [{ id: 'location', label: 'Lieu', value: location }] : []),
  ];

  const ticketActions = (ticket: MyTicket) => {
    const detailsHref = ticket.event.slug && ticket.event.isPublic
      ? dashboardEventHref(ticket.event.slug)
      : null;
    const multiGuests = ticket.guests && ticket.guests.length > 1 ? ticket.guests : null;
    const hasPass = Boolean(multiGuests || ticket.guestId);
    return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ticket.status === 'PENDING' && detailsHref ? (
        <Link
          href={detailsHref}
          className="inline-flex"
          onClick={() => rememberCatalogueReturn('/dashboard/tickets')}
        >
          <Button size="sm" variant={hasPass ? 'secondary' : 'primary'}>Reprendre le paiement</Button>
        </Link>
      ) : null}
      {multiGuests ? (
        <>
          <Link href={`/rsvp/${multiGuests[0].id}`} className="inline-flex">
            <Button size="sm" leftIcon={<QrCode className="w-3.5 h-3.5" />}>
              Pass 1
            </Button>
          </Link>
          <OverflowMenu
            align="right"
            triggerLabel={`Autres pass pour ${ticket.event.title}`}
            triggerClassName="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface-muted transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            trigger={<MoreHorizontal className="w-5 h-5" aria-hidden />}
            items={multiGuests.slice(1).map((g, idx) => ({
              id: g.id,
              label: `Pass ${idx + 2}`,
              icon: QrCode,
              onSelect: () => router.push(`/rsvp/${g.id}`),
            }))}
          />
        </>
      ) : ticket.guestId ? (
        <Link href={`/rsvp/${ticket.guestId}`} className="inline-flex">
          <Button size="sm" leftIcon={<QrCode className="w-4 h-4" />}>
            Mon pass QR
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
      <PageHero
        eyebrow="Ventes et entrées"
        title="Billetterie"
        subtitle="Vendez et suivez les billets de vos événements, ou retrouvez ceux que vous avez achetés."
        image="/images/pages/billetterie.jpg"
        imagePosition="center 22%"
      />
      {(() => {
        const findEvent = (
          <Link href={agendaHref} className="inline-flex">
            <Button size="sm" variant="secondary" leftIcon={<Calendar className="w-4 h-4" />}>
              Trouver un événement
            </Button>
          </Link>
        );
        return isOrgRole ? (
          <UnderlineTabs
            value={activeTab}
            onChange={selectTab}
            ariaLabel="Billetterie ou achats personnels"
            tabs={[
              { id: 'org', label: 'Organisation', icon: Ticket },
              { id: 'my', label: 'Mes billets', icon: QrCode, count: tickets.length },
            ]}
            action={activeTab === 'my' ? findEvent : null}
          />
        ) : (
          <div className="flex justify-end">{findEvent}</div>
        );
      })()}

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
            <EmptyState illustration="tickets"
              icon={<Ticket className="w-5 h-5" />}
              title="Aucun billet pour le moment"
              description="Les billets du catalogue apparaîtront ici."
            />
          ) : (
        <div className="space-y-4">
          <CatalogueFilterBar
            search={q}
            onSearchChange={setQ}
            searchPlaceholder="Titre, lieu, acheteur…"
            searchLabel="Rechercher un billet"
            view={viewMode}
            hideViewToggle
            hideShare
            actions={
              <ViewModeToggle
                storageKey="em-view-tickets"
                value={viewMode}
                onChange={setViewMode}
                columns={columns}
                onColumnsChange={setGridColumns}
              />
            }
            chips={filterChips}
            onRemoveChip={(id) => {
              if (id === 'when') setWhen('all');
              if (id === 'entry') setEntry('all');
              if (id === 'location') setLocation('');
            }}
            onClearChips={() => {
              setQ('');
              setWhen('all');
              setEntry('all');
              setLocation('');
            }}
            resultLabel={`${filtered.length} billet${filtered.length > 1 ? 's' : ''}${filtered.length !== tickets.length ? ` / ${tickets.length}` : ''}`}
            modalTitle="Filtrer les billets"
            filters={
              <>
                <CatalogueFilterField label="Date">
                  <CatalogueChoicePills
                    options={WHEN_OPTIONS}
                    value={when}
                    onChange={(id) => setWhen((id as WhenFilter) || 'all')}
                  />
                </CatalogueFilterField>
                <CatalogueFilterField label="Entrée">
                  <CatalogueChoicePills
                    options={ENTRY_OPTIONS}
                    value={entry}
                    onChange={(id) => setEntry((id as EntryFilter) || 'all')}
                  />
                </CatalogueFilterField>
                {locations.length > 1 ? (
                  <CatalogueFilterField label="Lieu">
                    <CatalogueChoicePills
                      options={[{ id: 'all', label: 'Tous les lieux' }, ...locations.map((item) => ({ id: item, label: item }))]}
                      value={location || 'all'}
                      onChange={(id) => setLocation(id === 'all' ? '' : id)}
                    />
                  </CatalogueFilterField>
                ) : null}
              </>
            }
          />

          {filtered.length === 0 ? (
            <EmptyState illustration="search"
              icon={<Ticket className="w-5 h-5" />}
              title="Aucun billet pour ces filtres"
              description="Élargissez la recherche."
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
