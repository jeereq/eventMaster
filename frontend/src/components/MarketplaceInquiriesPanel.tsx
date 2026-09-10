'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Alert,
  Button,
  EmptyState,
  Input,
  Modal,
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
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import {
  Building2,
  CalendarCheck,
  CheckCircle2,
  Coins,
  FileText,
  Inbox,
  KeyRound,
  Mail,
  Phone,
  Sparkles,
  XCircle,
} from 'lucide-react';

const KIND_OPTIONS = [
  { id: 'all', label: 'Tous' },
  { id: 'venue', label: 'Salles' },
  { id: 'service', label: 'Prestataires' },
  { id: 'rental', label: 'Matériel & Équipements' },
] as const;

const DECLINE_REASONS = [
  'Date indisponible / déjà réservée',
  'Capacité ou équipement non adapté',
  'Lieu hors de notre périmètre d’intervention',
  'Délai de préparation trop court',
  'Tarif ou périmètre non réalisable',
  'Autre motif personnalisé',
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
  if (item.status === 'QUOTED') return 'Devis chiffré';
  if (item.status === 'DECLINED') return 'Décliné';
  if (organizerView) return item.status === 'NEW' ? 'Envoyée' : 'Prise en charge';
  return item.status === 'NEW' ? 'Nouveau' : 'Contacté';
}

function inquiryStatusTone(item: MarketplaceInquiryItem): 'emerald' | 'amber' | 'sky' | 'rose' {
  if (item.hasBooking) return 'emerald';
  if (item.status === 'QUOTED') return 'emerald';
  if (item.status === 'DECLINED') return 'rose';
  return item.status === 'NEW' ? 'amber' : 'sky';
}

export default function MarketplaceInquiriesPanel({
  inquiries: initialInquiries,
  onMarkContacted,
  onConvert,
  onQuote,
  onDecline,
  onChanged,
  error: externalError,
  organizerView = false,
}: {
  inquiries: MarketplaceInquiryItem[];
  onMarkContacted?: (id: string) => Promise<void> | void;
  onConvert?: (id: string, amountFc?: number) => Promise<void> | void;
  onQuote?: (id: string, quotedAmountFc: number, responseNotes?: string) => Promise<void> | void;
  onDecline?: (id: string, declineReason: string, responseNotes?: string) => Promise<void> | void;
  onChanged?: () => Promise<void> | void;
  error?: string;
  organizerView?: boolean;
}) {
  const [inquiries, setInquiries] = useState<MarketplaceInquiryItem[]>(initialInquiries);
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('marketplace-desk-inquiries', 9);
  const [busyId, setBusyId] = useState('');
  const [panelError, setPanelError] = useState('');

  // Modale Chiffrage Devis
  const [quoteTarget, setQuoteTarget] = useState<MarketplaceInquiryItem | null>(null);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);

  // Modale Refus Devis
  const [declineTarget, setDeclineTarget] = useState<MarketplaceInquiryItem | null>(null);
  const [selectedDeclineReason, setSelectedDeclineReason] = useState<string>(DECLINE_REASONS[0]);
  const [declineCustomReason, setDeclineCustomReason] = useState('');
  const [declineNotes, setDeclineNotes] = useState('');
  const [declineSubmitting, setDeclineSubmitting] = useState(false);

  useEffect(() => {
    setInquiries(initialInquiries);
  }, [initialInquiries]);

  const { mode, setViewMode, columns, setGridColumns, gridClassName } = useViewMode(
    organizerView ? 'em-view-organizer-inquiries' : 'em-view-vendor-inquiries',
    'grid',
    2,
  );

  const newCount = inquiries.filter((i) => i.status === 'NEW' && !i.hasBooking).length;
  const quotedCount = inquiries.filter((i) => i.status === 'QUOTED' && !i.hasBooking).length;
  const contactedCount = inquiries.filter((i) => i.status === 'CONTACTED' && !i.hasBooking).length;
  const declinedCount = inquiries.filter((i) => i.status === 'DECLINED' && !i.hasBooking).length;
  const bookedCount = inquiries.filter((i) => i.hasBooking).length;

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
          value:
            status === 'NEW'
              ? organizerView ? 'Envoyée' : 'Nouveau'
              : status === 'QUOTED'
                ? 'Devis chiffré'
                : status === 'CONTACTED'
                  ? organizerView ? 'Prise en charge' : 'Contacté'
                  : status === 'DECLINED'
                    ? 'Décliné'
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
    setPanelError('');
    try {
      await action();
    } catch (err: unknown) {
      setPanelError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setBusyId('');
    }
  };

  const openQuoteModal = (item: MarketplaceInquiryItem) => {
    setQuoteTarget(item);
    setQuoteAmount(item.quotedAmountFc != null ? String(item.quotedAmountFc) : '');
    setQuoteNotes(item.responseNotes || '');
    setPanelError('');
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteTarget) return;
    const parsedAmount = Number.parseInt(quoteAmount, 10);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setPanelError('Veuillez indiquer un montant valide en Francs Congolais (FC).');
      return;
    }
    setQuoteSubmitting(true);
    setPanelError('');
    try {
      if (onQuote) {
        await onQuote(quoteTarget.id, parsedAmount, quoteNotes.trim() || undefined);
      } else {
        await api.patch(`/marketplace/inquiries/${quoteTarget.id}`, {
          action: 'quote',
          quotedAmountFc: parsedAmount,
          responseNotes: quoteNotes.trim() || undefined,
        });
      }
      setInquiries((prev) =>
        prev.map((i) =>
          i.id === quoteTarget.id
            ? {
                ...i,
                status: 'QUOTED',
                quotedAmountFc: parsedAmount,
                responseNotes: quoteNotes.trim() || null,
                respondedAt: new Date().toISOString(),
              }
            : i,
        ),
      );
      setQuoteTarget(null);
      if (onChanged) await onChanged();
    } catch (err: unknown) {
      setPanelError(err instanceof Error ? err.message : 'Impossible de transmettre le devis.');
    } finally {
      setQuoteSubmitting(false);
    }
  };

  const openDeclineModal = (item: MarketplaceInquiryItem) => {
    setDeclineTarget(item);
    setSelectedDeclineReason(DECLINE_REASONS[0]);
    setDeclineCustomReason('');
    setDeclineNotes(item.responseNotes || '');
    setPanelError('');
  };

  const handleDeclineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineTarget) return;
    const finalReason =
      selectedDeclineReason === 'Autre motif personnalisé'
        ? declineCustomReason.trim() || 'Non réalisable selon les contraintes'
        : selectedDeclineReason;

    setDeclineSubmitting(true);
    setPanelError('');
    try {
      if (onDecline) {
        await onDecline(declineTarget.id, finalReason, declineNotes.trim() || undefined);
      } else {
        await api.patch(`/marketplace/inquiries/${declineTarget.id}`, {
          action: 'decline',
          declineReason: finalReason,
          responseNotes: declineNotes.trim() || undefined,
        });
      }
      setInquiries((prev) =>
        prev.map((i) =>
          i.id === declineTarget.id
            ? {
                ...i,
                status: 'DECLINED',
                declineReason: finalReason,
                responseNotes: declineNotes.trim() || null,
                respondedAt: new Date().toISOString(),
              }
            : i,
        ),
      );
      setDeclineTarget(null);
      if (onChanged) await onChanged();
    } catch (err: unknown) {
      setPanelError(err instanceof Error ? err.message : 'Impossible de décliner la demande.');
    } finally {
      setDeclineSubmitting(false);
    }
  };

  const handleConvertBooking = async (item: MarketplaceInquiryItem) => {
    run(item.id, async () => {
      if (onConvert) {
        await onConvert(item.id, item.quotedAmountFc ?? undefined);
      } else {
        await api.post(`/marketplace/inquiries/${item.id}/book`, {
          amountFc: item.quotedAmountFc ?? undefined,
        });
      }
      setInquiries((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, hasBooking: true, status: 'CONTACTED' } : i,
        ),
      );
      if (onChanged) await onChanged();
    });
  };

  const activeError = panelError || externalError;

  if (inquiries.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="w-5 h-5" />}
        title={organizerView ? 'Aucune demande de devis' : 'Boîte de réception vide'}
        description={
          organizerView
            ? 'Contactez des prestataires depuis le catalogue pour recevoir vos devis.'
            : 'Les demandes de devis apparaîtront ici.'
        }
        action={
          organizerView ? (
            <Link href="/dashboard/catalogue">
              <Button size="sm">Explorer le catalogue</Button>
            </Link>
          ) : undefined
        }
      />
    );
  }

  const parsedQuoteNumber = Number.parseInt(quoteAmount, 10);
  const validQuoteAmount = Number.isFinite(parsedQuoteNumber) && parsedQuoteNumber > 0;
  const computedQuoteDeposit = validQuoteAmount ? Math.round(parsedQuoteNumber * 0.3) : 0;

  return (
    <div className="space-y-4">
      {activeError && <Alert variant="error">{activeError}</Alert>}

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar sm:flex-wrap pb-1">
        <button
          type="button"
          onClick={() => setStatus('')}
          className={cn(
            'px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition whitespace-nowrap shrink-0',
            !status || status === 'all'
              ? 'bg-primary-solid text-primary-foreground border-primary-solid'
              : 'border-border text-muted hover:text-foreground',
          )}
        >
          Tous ({inquiries.length})
        </button>
        <button
          type="button"
          onClick={() => setStatus('NEW')}
          className={cn(
            'px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition whitespace-nowrap shrink-0',
            status === 'NEW'
              ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
              : 'border-border text-muted hover:text-foreground',
          )}
        >
          {organizerView ? 'En attente' : 'Nouveaux'} ({newCount})
        </button>
        <button
          type="button"
          onClick={() => setStatus('QUOTED')}
          className={cn(
            'px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition whitespace-nowrap shrink-0',
            status === 'QUOTED'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'border-border text-muted hover:text-foreground',
          )}
        >
          Devis chiffrés ({quotedCount})
        </button>
        <button
          type="button"
          onClick={() => setStatus('CONTACTED')}
          className={cn(
            'px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition whitespace-nowrap shrink-0',
            status === 'CONTACTED'
              ? 'bg-sky-600 text-white border-sky-600'
              : 'border-border text-muted hover:text-foreground',
          )}
        >
          {organizerView ? 'Pris en charge' : 'Contactés'} ({contactedCount})
        </button>
        <button
          type="button"
          onClick={() => setStatus('DECLINED')}
          className={cn(
            'px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition whitespace-nowrap shrink-0',
            status === 'DECLINED'
              ? 'bg-rose-600 text-white border-rose-600'
              : 'border-border text-muted hover:text-foreground',
          )}
        >
          Déclinés ({declinedCount})
        </button>
        <button
          type="button"
          onClick={() => setStatus('BOOKED')}
          className={cn(
            'px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition whitespace-nowrap shrink-0',
            status === 'BOOKED'
              ? 'bg-emerald-700 text-white border-emerald-700'
              : 'border-border text-muted hover:text-foreground',
          )}
        >
          Réservés ({bookedCount})
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
        resultLabel={`${visible.length} devis · ${newCount} en attente · ${quotedCount} chiffrés`}
        modalTitle="Filtrer les devis"
        filters={
          <>
            <CatalogueFilterField label="Statut">
              <CatalogueChoicePills
                options={[
                  { id: 'all', label: 'Tous' },
                  { id: 'NEW', label: organizerView ? `Envoyés (${newCount})` : `Nouveaux (${newCount})` },
                  { id: 'QUOTED', label: `Devis chiffrés (${quotedCount})` },
                  { id: 'CONTACTED', label: organizerView ? 'Pris en charge' : 'Contactés' },
                  { id: 'DECLINED', label: `Déclinés (${declinedCount})` },
                  { id: 'BOOKED', label: `Réservés (${bookedCount})` },
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
                        <Button size="sm" variant="secondary">Voir la fiche</Button>
                      </Link>
                    )
                  ) : null}

                  {/* Boutons Organisateur */}
                  {organizerView && !item.hasBooking && item.status === 'QUOTED' && (
                    <Button
                      size="sm"
                      loading={busy}
                      onClick={() => handleConvertBooking(item)}
                      leftIcon={<CalendarCheck className="w-3.5 h-3.5" />}
                    >
                      Réserver au devis ({formatFc(item.quotedAmountFc || 0)})
                    </Button>
                  )}

                  {organizerView && !item.hasBooking && item.status !== 'QUOTED' && item.status !== 'DECLINED' && (item.listingSlug || item.offeringSlug) ? (
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

                  {/* Boutons Professionnel (Vendeur) */}
                  {!organizerView && !item.hasBooking && item.status !== 'DECLINED' ? (
                    <>
                      <Button
                        size="sm"
                        variant={item.status === 'QUOTED' ? 'secondary' : 'primary'}
                        onClick={() => openQuoteModal(item)}
                        leftIcon={<Coins className="w-3.5 h-3.5" />}
                      >
                        {item.status === 'QUOTED' ? 'Modifier devis' : 'Chiffrer le devis'}
                      </Button>

                      {item.eventDate ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={busy}
                          onClick={() => handleConvertBooking(item)}
                          leftIcon={<CalendarCheck className="w-3.5 h-3.5" />}
                        >
                          Créer réservation
                        </Button>
                      ) : null}

                      {item.status === 'NEW' && onMarkContacted ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={busy}
                          onClick={() => run(item.id, () => onMarkContacted(item.id))}
                          leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                          Contacté
                        </Button>
                      ) : null}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDeclineModal(item)}
                        leftIcon={<XCircle className="w-3.5 h-3.5 text-rose-500" />}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        Refuser
                      </Button>
                    </>
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
                  <div className="space-y-2 pt-1">
                    {/* Bloc devis chiffré */}
                    {item.status === 'QUOTED' && item.quotedAmountFc != null ? (
                      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-2.5 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                            <Coins className="w-3.5 h-3.5" />
                            Devis proposé : {formatFc(item.quotedAmountFc)}
                          </span>
                          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                            Acompte (30%) : {formatFc(Math.round(item.quotedAmountFc * 0.3))}
                          </span>
                        </div>
                        {item.responseNotes ? (
                          <p className="text-xs text-foreground/90 whitespace-pre-line border-t border-emerald-500/15 pt-1">
                            {item.responseNotes}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Bloc refusé */}
                    {item.status === 'DECLINED' ? (
                      <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-2.5 text-xs text-rose-800 dark:text-rose-200 space-y-1">
                        <p className="font-semibold flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Demande déclinée
                        </p>
                        {item.declineReason ? (
                          <p className="text-xs">
                            <span className="font-medium text-rose-900 dark:text-rose-100">Motif :</span> {item.declineReason}
                          </p>
                        ) : null}
                        {item.responseNotes ? (
                          <p className="text-[11px] text-muted-foreground whitespace-pre-line border-t border-rose-500/15 pt-1">
                            {item.responseNotes}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Message initial du demandeur */}
                    {mode === 'grid' && item.message ? (
                      <p className="text-xs text-muted line-clamp-3 whitespace-pre-line">{item.message}</p>
                    ) : null}
                  </div>
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

      {/* MODALE CHIFFRER LE DEVIS */}
      <Modal
        open={Boolean(quoteTarget)}
        onClose={() => {
          if (!quoteSubmitting) setQuoteTarget(null);
        }}
        title="Chiffrer le devis"
        description={
          quoteTarget
            ? `Transmettez votre proposition financière pour « ${quoteTarget.title} » à ${quoteTarget.fromName}.`
            : undefined
        }
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              type="button"
              variant="ghost"
              disabled={quoteSubmitting}
              onClick={() => setQuoteTarget(null)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              loading={quoteSubmitting}
              onClick={handleQuoteSubmit}
              disabled={!validQuoteAmount}
              leftIcon={<Coins className="w-4 h-4" />}
            >
              Envoyer le devis
            </Button>
          </div>
        }
      >
        <form onSubmit={handleQuoteSubmit} className="space-y-4 py-2">
          {panelError ? <Alert variant="error">{panelError}</Alert> : null}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Montant total proposé (en Francs Congolais) *
            </label>
            <Input
              type="number"
              min={100}
              step={1000}
              placeholder="Ex: 500000"
              value={quoteAmount}
              onChange={(e) => setQuoteAmount(e.target.value)}
              required
              autoFocus
            />
            {validQuoteAmount ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-xs">
                <span className="font-medium text-emerald-900 dark:text-emerald-200">
                  Total : {formatFc(parsedQuoteNumber)}
                </span>
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                  Acompte à la réservation (30%) : {formatFc(computedQuoteDeposit)}
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-muted">
                L’acompte de 30 % sera automatiquement calculé pour le client.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Conditions, prestations incluses ou précisions (optionnel)
            </label>
            <textarea
              rows={3}
              value={quoteNotes}
              onChange={(e) => setQuoteNotes(e.target.value)}
              placeholder="Ex: Tarif comprenant l’installation complète, 2 micros sans fil et assistance technique. Acompte de 30% requis à la signature."
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent transition resize-none"
            />
          </div>
        </form>
      </Modal>

      {/* MODALE REFUSER LE DEVIS */}
      <Modal
        open={Boolean(declineTarget)}
        onClose={() => {
          if (!declineSubmitting) setDeclineTarget(null);
        }}
        title="Décliner la demande de devis"
        description={
          declineTarget
            ? `Informez poliment ${declineTarget.fromName} des motifs de non-disponibilité pour « ${declineTarget.title} ».`
            : undefined
        }
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              type="button"
              variant="ghost"
              disabled={declineSubmitting}
              onClick={() => setDeclineTarget(null)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={declineSubmitting}
              onClick={handleDeclineSubmit}
              leftIcon={<XCircle className="w-4 h-4" />}
            >
              Confirmer le refus
            </Button>
          </div>
        }
      >
        <form onSubmit={handleDeclineSubmit} className="space-y-4 py-2">
          {panelError ? <Alert variant="error">{panelError}</Alert> : null}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">
              Sélectionnez le motif principal de refus *
            </label>
            <div className="space-y-1.5">
              {DECLINE_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={cn(
                    'flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition',
                    selectedDeclineReason === reason
                      ? 'border-primary bg-primary/5 font-medium text-foreground'
                      : 'border-border bg-surface text-muted hover:border-primary/50',
                  )}
                >
                  <input
                    type="radio"
                    name="declineReason"
                    value={reason}
                    checked={selectedDeclineReason === reason}
                    onChange={() => setSelectedDeclineReason(reason)}
                    className="accent-primary"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          {selectedDeclineReason === 'Autre motif personnalisé' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Précisez le motif *
              </label>
              <Input
                placeholder="Ex: Travaux de rénovation prévus dans la salle"
                value={declineCustomReason}
                onChange={(e) => setDeclineCustomReason(e.target.value)}
                required
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Message d’accompagnement pour le client (optionnel)
            </label>
            <textarea
              rows={3}
              value={declineNotes}
              onChange={(e) => setDeclineNotes(e.target.value)}
              placeholder="Ex: Nous sommes désolés, notre planning est complet sur cette date. Nous serions ravis de collaborer sur vos futurs événements."
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent transition resize-none"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
