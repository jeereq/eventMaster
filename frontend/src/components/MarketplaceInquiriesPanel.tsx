'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Button,
  EmptyState,
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
import {
  dashboardServiceHref,
  dashboardVenueHref,
  inquiryNextStep,
  type MarketplaceInquiryItem,
} from '@/lib/marketplace';
import { eventDashboardHref } from '@/lib/eventRoutes';
import { cn } from '@/lib/cn';
import { Building2, CalendarCheck, CheckCircle2, Inbox, KeyRound, Mail, Phone, Sparkles } from 'lucide-react';

const KIND_OPTIONS = [
  { id: 'all', label: 'Tous' },
  { id: 'venue', label: 'Salles' },
  { id: 'service', label: 'Prestataires' },
  { id: 'rental', label: 'Matériel & Équipements' },
] as const;

function kindLabel(kind: MarketplaceInquiryItem['kind']) {
  if (kind === 'venue') return 'Salle';
  if (kind === 'rental') return 'Matériel & Équipements';
  return 'Prestataire';
}

function kindIcon(kind: MarketplaceInquiryItem['kind']) {
  if (kind === 'venue') return <Building2 className="w-4 h-4" />;
  if (kind === 'rental') return <KeyRound className="w-4 h-4" />;
  return <Sparkles className="w-4 h-4" />;
}

function inquiryStatusLabel(item: MarketplaceInquiryItem, organizerView: boolean) {
  if (item.hasBooking) return 'Réservée';
  if (organizerView) return item.status === 'NEW' ? 'Envoyée' : 'Prise en charge';
  return item.status === 'NEW' ? 'Nouveau' : 'Contacté';
}

function inquiryStatusTone(item: MarketplaceInquiryItem): 'emerald' | 'amber' | 'sky' {
  if (item.hasBooking) return 'emerald';
  return item.status === 'NEW' ? 'amber' : 'sky';
}

export default function MarketplaceInquiriesPanel({
  inquiries,
  onMarkContacted,
  onConvert,
  error,
  organizerView = false,
}: {
  inquiries: MarketplaceInquiryItem[];
  onMarkContacted?: (id: string) => Promise<void> | void;
  onConvert?: (id: string) => Promise<void> | void;
  error?: string;
  organizerView?: boolean;
}) {
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('marketplace-desk-inquiries', 9);
  const [busyId, setBusyId] = useState('');
  const { mode, setViewMode, columns, setGridColumns, gridClassName } = useViewMode(
    organizerView ? 'em-view-organizer-inquiries' : 'em-view-vendor-inquiries',
    'grid',
    2,
  );

  const newCount = inquiries.filter((i) => i.status === 'NEW' && !i.hasBooking).length;
  const contactedCount = inquiries.filter((i) => i.status === 'CONTACTED' && !i.hasBooking).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inquiries.filter((item) => {
      if (status && status !== 'all') {
        if (status === 'BOOKED') {
          if (!item.hasBooking) return false;
        } else if (item.status !== status || item.hasBooking) {
          return false;
        }
      }
      if (kind && kind !== 'all' && item.kind !== kind) return false;
      if (!q) return true;
      const hay = [item.title, item.fromName, item.fromEmail, item.fromPhone, item.message, item.vendorName, item.event?.title]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [inquiries, status, kind, query]);

  useEffect(() => {
    setPage(1);
  }, [status, kind, query, pageSize, mode]);

  const chips: CatalogueFilterChip[] = [
    ...(status && status !== 'all'
      ? [{
          id: 'status',
          label: 'Statut',
          value: status === 'NEW'
            ? (organizerView ? 'Envoyée' : 'Nouveau')
            : status === 'CONTACTED'
              ? (organizerView ? 'Prise en charge' : 'Contacté')
              : 'Réservée',
        }]
      : []),
    ...(kind && kind !== 'all'
      ? [{
          id: 'kind',
          label: 'Type',
          value: KIND_OPTIONS.find((item) => item.id === kind)?.label || kind,
          tone: (kind === 'venue' ? 'venue' : kind === 'service' ? 'service' : 'neutral') as CatalogueFilterChip['tone'],
        }]
      : []),
  ];

  const run = async (id: string, action: () => Promise<void> | void) => {
    setBusyId(id);
    try {
      await action();
    } finally {
      setBusyId('');
    }
  };

  if (inquiries.length === 0) {
    return (
        <EmptyState
          icon={<Inbox className="w-5 h-5" />}
          title={organizerView ? 'Aucune demande en cours' : 'Votre boîte de réception est vide'}
          description={
            organizerView
              ? 'Explorez notre catalogue et contactez les prestataires qui correspondent à vos envies.'
              : 'Les demandes de devis apparaîtront ici.'
          }
        action={
          organizerView ? (
            <Link href="/dashboard/catalogue">
              <Button size="sm">Parcourir le marketplace</Button>
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatus('')}
          className={cn(
            'px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition',
            !status || status === 'all'
              ? 'bg-primary text-white border-primary'
              : 'border-border text-muted hover:text-foreground',
          )}
        >
          Tous ({inquiries.length})
        </button>
        <button
          type="button"
          onClick={() => setStatus('NEW')}
          className={cn(
            'px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition',
            status === 'NEW'
              ? 'bg-amber-500 text-white border-amber-500'
              : 'border-border text-muted hover:text-foreground',
          )}
        >
          {organizerView ? 'En attente' : 'Nouveaux'} ({newCount})
        </button>
        <button
          type="button"
          onClick={() => setStatus('CONTACTED')}
          className={cn(
            'px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition',
            status === 'CONTACTED'
              ? 'bg-sky-600 text-white border-sky-600'
              : 'border-border text-muted hover:text-foreground',
          )}
        >
          {organizerView ? 'Pris en charge' : 'Contactés'} ({contactedCount})
        </button>
        <button
          type="button"
          onClick={() => setStatus('BOOKED')}
          className={cn(
            'px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition',
            status === 'BOOKED'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'border-border text-muted hover:text-foreground',
          )}
        >
          Réservés ({inquiries.filter((i) => i.hasBooking).length})
        </button>
      </div>

      <CatalogueFilterBar
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder={organizerView ? 'Titre, professionnel, message…' : 'Nom, e-mail, titre, message…'}
        view={mode}
        onViewChange={(next) => {
          if (next === 'grid' || next === 'list') setViewMode(next);
        }}
        hideViewToggle
        hideShare
        actions={
          <ViewModeToggle
            storageKey={organizerView ? 'em-view-organizer-inquiries' : 'em-view-vendor-inquiries'}
            value={mode}
            onChange={setViewMode}
            columns={columns}
            onColumnsChange={setGridColumns}
          />
        }
        chips={chips}
        onRemoveChip={(id) => {
          if (id === 'status') setStatus('');
          if (id === 'kind') setKind('');
        }}
        onClearChips={() => {
          setStatus('');
          setKind('');
          setQuery('');
        }}
        resultLabel={`${visible.length} devis · ${newCount} en attente · ${contactedCount} pris en charge`}
        modalTitle="Filtrer les devis"
        filters={
          <>
            <CatalogueFilterField label="Statut">
              <CatalogueChoicePills
                options={[
                  { id: 'all', label: 'Tous' },
                  { id: 'NEW', label: organizerView ? `Envoyés${newCount ? ` (${newCount})` : ''}` : `Nouveaux${newCount ? ` (${newCount})` : ''}` },
                  { id: 'CONTACTED', label: organizerView ? 'Pris en charge' : 'Contactés' },
                  { id: 'BOOKED', label: 'Réservés' },
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
          </>
        }
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-5 h-5" />}
          title="Aucun devis pour ces filtres"
          description="Changez le statut, le type ou le texte pour élargir la recherche."
        />
      ) : (
        <>
          <div className={mode === 'grid' ? gridClassName : listStackClass}>
            {paginateItems(visible, page, pageSize).map((item) => {
              const next = inquiryNextStep({ ...item, viewerRole: organizerView ? 'organizer' : item.viewerRole || 'vendor' });
              const busy = busyId === item.id;
              const listingHref = item.listingSlug
                ? dashboardVenueHref(item.listingSlug)
                : item.offeringSlug
                  ? dashboardServiceHref(item.offeringSlug, item.offeringCategory)
                  : null;
              const statusChip = (
                <StatusPill tone={inquiryStatusTone(item)}>{inquiryStatusLabel(item, organizerView)}</StatusPill>
              );
              const metaBits = [
                kindLabel(item.kind),
                organizerView ? item.vendorName : item.fromName,
                item.eventDate ? `date ${new Date(item.eventDate).toLocaleDateString('fr-FR')}` : null,
                item.event?.title ? `événement ${item.event.title}` : null,
                item.guestCount ? `${item.guestCount} invités` : null,
              ].filter(Boolean);
              const actions = (
                <div className="flex flex-wrap items-center gap-1.5">
                  {listingHref ? (
                    mode === 'list' ? (
                      <Link href={listingHref} className="inline-flex">
                        <ListRowAction />
                      </Link>
                    ) : (
                      <Link href={listingHref} className="inline-flex">
                        <Button size="sm" variant={organizerView && !item.hasBooking ? 'secondary' : organizerView ? 'primary' : 'secondary'}>Voir la fiche</Button>
                      </Link>
                    )
                  ) : null}
                  {organizerView && !item.hasBooking && (item.listingSlug || item.offeringSlug) ? (
                    <Link
                      href={
                        item.event?.id
                          ? eventDashboardHref(item.event.id, {
                              tab: 'prep',
                              listing: item.listingSlug,
                              offer: item.offeringSlug,
                              action: 'book',
                            })
                          : listingHref || '#'
                      }
                      className="inline-flex"
                    >
                      <Button size="sm" leftIcon={<CalendarCheck className="w-3.5 h-3.5" />}>
                        Réserver
                      </Button>
                    </Link>
                  ) : null}
                  {organizerView && item.event?.id ? (
                    <Link href={eventDashboardHref(item.event.id, { tab: 'prep' })} className="inline-flex">
                      <Button size="sm" variant="secondary">Événement</Button>
                    </Link>
                  ) : null}
                  {!organizerView && item.status === 'NEW' && onMarkContacted ? (
                    <Button
                      size="sm"
                      variant={item.eventDate && !item.hasBooking ? 'secondary' : 'primary'}
                      loading={busy}
                      onClick={() => run(item.id, () => onMarkContacted(item.id))}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    >
                      Contacté
                    </Button>
                  ) : null}
                  {!organizerView && item.eventDate && !item.hasBooking && onConvert ? (
                    <Button
                      size="sm"
                      loading={busy}
                      onClick={() => run(item.id, () => onConvert(item.id))}
                      leftIcon={<CalendarCheck className="w-3.5 h-3.5" />}
                    >
                      Réserver
                    </Button>
                  ) : null}
                </div>
              );

              return (
                <ProjectCard
                  key={item.id}
                  id={item.id}
                  title={organizerView ? item.title : item.fromName}
                  layout={mode}
                  icon={kindIcon(item.kind)}
                  hideCta
                  status={statusChip}
                  overlayMeta={`${kindLabel(item.kind)}${item.vendorName && organizerView ? ` · ${item.vendorName}` : ''}`}
                  meta={
                    mode === 'list' ? (
                      <span className="truncate">{metaBits.join(' · ')}</span>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="truncate text-xs">{metaBits.join(' · ')}</p>
                        {!organizerView ? (
                          <p className="text-xs text-muted flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <a href={`mailto:${item.fromEmail}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                              <Mail className="w-3 h-3" />
                              {item.fromEmail}
                            </a>
                            {item.fromPhone ? (
                              <a href={`tel:${item.fromPhone}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                                <Phone className="w-3 h-3" />
                                {item.fromPhone}
                              </a>
                            ) : null}
                          </p>
                        ) : null}
                        <p className="text-[11px] text-muted">{new Date(item.createdAt).toLocaleString('fr-FR')}</p>
                      </div>
                    )
                  }
                  description={mode === 'grid' ? next.detail : next.title}
                  actions={actions}
                >
                  {mode === 'grid' && item.message ? (
                    <p className="text-xs text-muted line-clamp-3 whitespace-pre-line">{item.message}</p>
                  ) : null}
                </ProjectCard>
              );
            })}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={visible.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="devis"
          />
        </>
      )}
    </div>
  );
}
