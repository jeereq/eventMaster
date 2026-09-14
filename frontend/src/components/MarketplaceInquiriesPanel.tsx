'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  StatusPill,
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
  inquiryChatClosed,
  canDeclineInquiry,
  buildWhatsAppDirectLink,
  MARKETPLACE_DEPOSIT_RATE,
  type MarketplaceInquiryItem,
  type MarketplaceInquiryThreadMessage,
} from '@/lib/marketplace';
import { eventDashboardHref } from '@/lib/eventRoutes';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import { DealDeclineBlock, DealQuoteBlock, MarketplaceDealCard, type MarketplaceDealFact } from '@/components/MarketplaceDealCard';
import {
  Building2,
  CalendarCheck,
  CheckCircle2,
  Coins,
  Inbox,
  KeyRound,
  MessageCircle,
  Sparkles,
  XCircle,
  DoorClosed,
} from 'lucide-react';

const THREAD_POLL_MS = 4_000;

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
  highlightInquiryId,
}: {
  inquiries: MarketplaceInquiryItem[];
  onMarkContacted?: (id: string) => Promise<void> | void;
  onConvert?: (id: string, amountFc?: number) => Promise<void> | void;
  onQuote?: (id: string, quotedAmountFc: number, responseNotes?: string) => Promise<void> | void;
  onDecline?: (id: string, declineReason: string, responseNotes?: string) => Promise<void> | void;
  onChanged?: () => Promise<void> | void;
  error?: string;
  organizerView?: boolean;
  highlightInquiryId?: string | null;
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

  const [threadTarget, setThreadTarget] = useState<MarketplaceInquiryItem | null>(null);
  const [threadMessages, setThreadMessages] = useState<MarketplaceInquiryThreadMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadDraft, setThreadDraft] = useState('');
  const [threadSending, setThreadSending] = useState(false);
  const [acceptTarget, setAcceptTarget] = useState<MarketplaceInquiryItem | null>(null);
  const [acceptSubmitting, setAcceptSubmitting] = useState(false);
  const [panelNotice, setPanelNotice] = useState('');
  const [threadClosing, setThreadClosing] = useState(false);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

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
      const quoted = {
        status: 'QUOTED' as const,
        quotedAmountFc: parsedAmount,
        responseNotes: quoteNotes.trim() || null,
        respondedAt: new Date().toISOString(),
      };
      setInquiries((prev) =>
        prev.map((i) => (i.id === quoteTarget.id ? { ...i, ...quoted } : i)),
      );
      setThreadTarget((current) =>
        current && current.id === quoteTarget.id ? { ...current, ...quoted } : current,
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

  const mergeThreadMessages = (incoming: MarketplaceInquiryThreadMessage[]) => {
    setThreadMessages((prev) => {
      if (incoming.length === 0) return prev;
      const seen = new Set(prev.map((message) => message.id));
      const extras = incoming.filter((message) => !seen.has(message.id));
      if (extras.length === 0 && prev.length === incoming.length) return prev;
      return incoming;
    });
  };

  const loadThread = async (item: MarketplaceInquiryItem, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setThreadLoading(true);
    try {
      const data = await api.get(`/marketplace/inquiries/${item.id}/messages`) as {
        messages?: MarketplaceInquiryThreadMessage[];
        closedAt?: string | null;
        closedByRole?: string | null;
        status?: MarketplaceInquiryItem['status'];
      };
      mergeThreadMessages(Array.isArray(data.messages) ? data.messages : []);
      const nextCount = Array.isArray(data.messages) ? data.messages.length : undefined;
      setThreadTarget((current) => {
        if (!current || current.id !== item.id) return current;
        const closedAt = data.closedAt ?? current.closedAt;
        const closedByRole = data.closedByRole ?? current.closedByRole;
        const status = data.status ?? current.status;
        if (current.closedAt === closedAt && current.closedByRole === closedByRole && current.status === status) {
          return current;
        }
        return { ...current, closedAt, closedByRole, status };
      });
      setInquiries((prev) =>
        prev.map((row) => {
          if (row.id !== item.id) return row;
          const closedAt = data.closedAt ?? row.closedAt;
          const closedByRole = data.closedByRole ?? row.closedByRole;
          const status = data.status ?? row.status;
          const messageCount = nextCount ?? row.messageCount;
          if (
            row.closedAt === closedAt
            && row.closedByRole === closedByRole
            && row.status === status
            && row.messageCount === messageCount
          ) {
            return row;
          }
          return { ...row, closedAt, closedByRole, status, messageCount };
        }),
      );
    } catch (err: unknown) {
      if (!opts?.silent) {
        setPanelError(err instanceof Error ? err.message : 'Impossible de charger la conversation.');
        setThreadMessages([]);
      }
    } finally {
      if (!opts?.silent) setThreadLoading(false);
    }
  };

  const openThread = (item: MarketplaceInquiryItem) => {
    setThreadTarget(item);
    setThreadMessages([]);
    setThreadDraft('');
    setPanelError('');
    void loadThread(item);
  };

  useEffect(() => {
    if (!threadTarget || inquiryChatClosed(threadTarget)) return;
    const interval = window.setInterval(() => {
      void loadThread(threadTarget, { silent: true });
    }, THREAD_POLL_MS);
    return () => window.clearInterval(interval);
  }, [threadTarget?.id, threadTarget?.closedAt, threadTarget?.status]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: 'end' });
  }, [threadMessages.length, threadTarget?.id]);

  const handleCloseThread = async () => {
    if (!threadTarget || inquiryChatClosed(threadTarget)) return;
    setThreadClosing(true);
    setPanelError('');
    try {
      const data = await api.post(`/marketplace/inquiries/${threadTarget.id}/close`, {}) as {
        closedAt?: string;
        closedByRole?: string;
      };
      const closedAt = data.closedAt || new Date().toISOString();
      const closedByRole = data.closedByRole || (organizerView ? 'CLIENT' : 'VENDOR');
      setThreadTarget((current) => current ? { ...current, closedAt, closedByRole } : current);
      setInquiries((prev) =>
        prev.map((row) =>
          row.id === threadTarget.id ? { ...row, closedAt, closedByRole } : row,
        ),
      );
      if (onChanged) await onChanged();
    } catch (err: unknown) {
      setPanelError(err instanceof Error ? err.message : 'Impossible de clôturer la conversation.');
    } finally {
      setThreadClosing(false);
    }
  };

  const openedHighlightRef = useRef<string | null>(null);
  useEffect(() => {
    if (!highlightInquiryId || openedHighlightRef.current === highlightInquiryId) return;
    const highlighted = inquiries.find((item) => item.id === highlightInquiryId);
    if (!highlighted) return;
    openedHighlightRef.current = highlightInquiryId;
    openThread(highlighted);
  }, [highlightInquiryId, inquiries]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!threadTarget) return;
    if (inquiryChatClosed(threadTarget)) {
      setPanelError('Cette conversation est clôturée.');
      return;
    }
    const body = threadDraft.trim();
    if (!body) {
      setPanelError('Écrivez un message pour répondre.');
      return;
    }
    setThreadSending(true);
    setPanelError('');
    try {
      const data = await api.post(`/marketplace/inquiries/${threadTarget.id}/messages`, {
        body,
        authorRole: organizerView ? 'CLIENT' : 'VENDOR',
      }) as { message?: MarketplaceInquiryThreadMessage; status?: MarketplaceInquiryItem['status'] };
      if (data.message) {
        setThreadMessages((prev) => [...prev, data.message as MarketplaceInquiryThreadMessage]);
      }
      setThreadDraft('');
      const nextStatus = data.status || threadTarget.status;
      setThreadTarget((current) =>
        current && current.id === threadTarget.id ? { ...current, status: nextStatus } : current,
      );
      setInquiries((prev) =>
        prev.map((item) =>
          item.id === threadTarget.id
            ? {
                ...item,
                status: nextStatus,
                messageCount: (item.messageCount || 0) + 1,
                lastMessage: {
                  body,
                  createdAt: new Date().toISOString(),
                  authorRole: organizerView ? 'CLIENT' : 'VENDOR',
                },
              }
            : item,
        ),
      );
      if (onChanged) await onChanged();
    } catch (err: unknown) {
      setPanelError(err instanceof Error ? err.message : 'Impossible d’envoyer la réponse.');
    } finally {
      setThreadSending(false);
    }
  };

  const handleConvertBooking = async (item: MarketplaceInquiryItem) => {
    if (organizerView) {
      setAcceptTarget(item);
      setPanelError('');
      return;
    }
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

  const handleAcceptQuote = async () => {
    if (!acceptTarget) return;
    if (!acceptTarget.eventDate) {
      setPanelError('Une date est nécessaire. Écrivez au professionnel pour la confirmer, puis acceptez le devis.');
      return;
    }
    setAcceptSubmitting(true);
    setPanelError('');
    setPanelNotice('');
    try {
      const result = await api.post(`/marketplace/inquiries/${acceptTarget.id}/accept`, {}) as { message?: string };
      setInquiries((prev) =>
        prev.map((i) =>
          i.id === acceptTarget.id ? { ...i, hasBooking: true } : i,
        ),
      );
      setThreadTarget((current) =>
        current && current.id === acceptTarget.id ? { ...current, hasBooking: true } : current,
      );
      setAcceptTarget(null);
      setPanelNotice(result.message || 'Devis accepté. Le professionnel doit confirmer la réservation.');
      if (onChanged) await onChanged();
    } catch (err: unknown) {
      setPanelError(err instanceof Error ? err.message : 'Impossible d’accepter le devis.');
    } finally {
      setAcceptSubmitting(false);
    }
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
      {panelNotice && <Alert variant="success">{panelNotice}</Alert>}

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
              const counterpart = organizerView ? item.vendorName : item.fromName;
              const waTargetPhone = organizerView ? item.vendorPhone : item.fromPhone;
              const waPresetMsg = organizerView
                ? `Bonjour, je vous contacte concernant ma demande de devis pour « ${item.title} » sur EventMaster.`
                : `Bonjour ${item.fromName}, je fais suite à votre demande de devis pour « ${item.title} » sur EventMaster.`;
              const waUrl = buildWhatsAppDirectLink(waTargetPhone, waPresetMsg);
              const contactPhone = organizerView ? item.vendorPhone : item.fromPhone;
              const facts: MarketplaceDealFact[] = [];
              if (item.eventDate) {
                facts.push({
                  label: 'Date',
                  value: new Date(item.eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                });
              }
              if (item.guestCount) facts.push({ label: 'Invités', value: String(item.guestCount) });
              if (item.event?.title) facts.push({ label: 'Événement', value: item.event.title });
              if (!organizerView && item.fromEmail) {
                facts.push({
                  label: 'E-mail',
                  value: (
                    <a href={`mailto:${item.fromEmail}`} className="text-primary hover:underline break-all">
                      {item.fromEmail}
                    </a>
                  ),
                });
              } else if (contactPhone) {
                facts.push({
                  label: 'Téléphone',
                  value: (
                    <a href={`tel:${contactPhone}`} className="text-primary hover:underline">
                      {contactPhone}
                    </a>
                  ),
                });
              }

              const discussButton = (
                <Button
                  size="sm"
                  variant={
                    inquiryChatClosed(item) || item.hasBooking || (!organizerView && item.status !== 'QUOTED')
                      ? 'secondary'
                      : 'primary'
                  }
                  onClick={() => openThread(item)}
                  leftIcon={<MessageCircle className="w-3.5 h-3.5" />}
                >
                  {inquiryChatClosed(item) ? 'Conversation' : 'Discuter'}
                  {(item.messageCount || 0) > 0 ? ` (${item.messageCount})` : ''}
                </Button>
              );
              const acceptButton = organizerView && !item.hasBooking && item.status === 'QUOTED' ? (
                <Button
                  size="sm"
                  onClick={() => handleConvertBooking(item)}
                  leftIcon={<CalendarCheck className="w-3.5 h-3.5" />}
                >
                  Accepter
                </Button>
              ) : null;
              const quoteButton = !organizerView && !item.hasBooking && item.status !== 'DECLINED' ? (
                <Button
                  size="sm"
                  variant={item.status === 'QUOTED' ? 'secondary' : 'primary'}
                  onClick={() => openQuoteModal(item)}
                  leftIcon={<Coins className="w-3.5 h-3.5" />}
                >
                  {item.status === 'QUOTED' ? 'Modifier' : 'Chiffrer'}
                </Button>
              ) : null;

              return (
                <MarketplaceDealCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  subtitle={[kindLabel(item.kind), counterpart].filter(Boolean).join(' · ')}
                  timestamp={new Date(item.createdAt).toLocaleString('fr-FR')}
                  icon={kindIcon(item.kind)}
                  status={<StatusPill tone={inquiryStatusTone(item)}>{inquiryStatusLabel(item, organizerView)}</StatusPill>}
                  facts={facts}
                  highlight={Boolean(highlightInquiryId && item.id === highlightInquiryId)}
                  layout={mode}
                  primaryActions={(
                    <>
                      {acceptButton || discussButton}
                      {acceptButton ? discussButton : quoteButton}
                    </>
                  )}
                  secondaryActions={(
                    <>
                      {waUrl ? (
                        <a href={waUrl} target="_blank" rel="noopener noreferrer" title="Échanger directement par WhatsApp">
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                          >
                            WhatsApp
                          </Button>
                        </a>
                      ) : null}
                      {listingHref ? (
                        <Button size="sm" variant="secondary" href={listingHref}>
                          Fiche
                        </Button>
                      ) : null}
                      {organizerView && item.event?.id ? (
                        <Button size="sm" variant="secondary" href={eventDashboardHref(item.event.id, { tab: 'prep' })}>
                          Événement
                        </Button>
                      ) : null}
                      {!organizerView && !item.hasBooking && item.status !== 'DECLINED' && item.eventDate ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={busy}
                          onClick={() => handleConvertBooking(item)}
                          leftIcon={<CalendarCheck className="w-3.5 h-3.5" />}
                        >
                          Réserver
                        </Button>
                      ) : null}
                      {!organizerView && !item.hasBooking && item.status === 'NEW' && onMarkContacted ? (
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
                      {!organizerView && canDeclineInquiry(item) ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDeclineModal(item)}
                          leftIcon={<XCircle className="w-3.5 h-3.5 text-rose-500" />}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          Refuser
                        </Button>
                      ) : null}
                    </>
                  )}
                >
                  <p className="text-xs text-foreground/80 leading-relaxed">{next.detail}</p>
                  {item.status === 'QUOTED' && item.quotedAmountFc != null ? (
                    <DealQuoteBlock
                      amountFc={formatFc(item.quotedAmountFc)}
                      depositFc={formatFc(Math.round(item.quotedAmountFc * 0.3))}
                      notes={item.responseNotes}
                    />
                  ) : null}
                  {item.status === 'DECLINED' ? (
                    <DealDeclineBlock
                      title="Demande déclinée"
                      reason={item.declineReason}
                      notes={item.responseNotes}
                    />
                  ) : null}
                  {item.message ? (
                    <p className="text-xs text-muted line-clamp-3 whitespace-pre-line">{item.message}</p>
                  ) : null}
                  {item.lastMessage ? (
                    <p className="text-[11px] text-muted line-clamp-2">
                      Dernier message ({item.lastMessage.authorRole === 'CLIENT' ? 'client' : 'pro'}) : {item.lastMessage.body}
                    </p>
                  ) : null}
                </MarketplaceDealCard>
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

      <Modal
        open={Boolean(acceptTarget)}
        onClose={() => {
          if (!acceptSubmitting) setAcceptTarget(null);
        }}
        title="Accepter le devis"
        description={
          acceptTarget
            ? `Confirmez le montant proposé par ${acceptTarget.vendorName || 'le professionnel'} pour « ${acceptTarget.title} ».`
            : undefined
        }
        size="md"
        footer={
          <div className="flex w-full flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={acceptSubmitting}
              onClick={() => setAcceptTarget(null)}
            >
              Pas maintenant
            </Button>
            <Button
              type="button"
              loading={acceptSubmitting}
              disabled={!acceptTarget?.eventDate || acceptTarget.quotedAmountFc == null}
              onClick={handleAcceptQuote}
              leftIcon={<CalendarCheck className="w-4 h-4" />}
            >
              Confirmer et demander la réservation
            </Button>
          </div>
        }
      >
        {acceptTarget ? (
          <div className="space-y-3">
            {panelError ? <Alert variant="error">{panelError}</Alert> : null}
            <ol className="space-y-2 text-sm text-foreground">
              <li className="rounded-xl border border-border bg-surface-muted/60 px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">1. Devis</span>
                <p className="mt-0.5 font-semibold">
                  {acceptTarget.quotedAmountFc != null ? formatFc(acceptTarget.quotedAmountFc) : 'Montant à confirmer'}
                </p>
              </li>
              <li className="rounded-xl border border-border bg-surface-muted/60 px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">2. Votre acceptation</span>
                <p className="mt-0.5">
                  Une demande de réservation est envoyée au professionnel. Il doit encore confirmer.
                </p>
              </li>
              <li className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                  3. Acompte après confirmation
                </span>
                <p className="mt-0.5">
                  {acceptTarget.quotedAmountFc != null
                    ? `Acompte ${Math.round(MARKETPLACE_DEPOSIT_RATE * 100)} % : ${formatFc(Math.round(acceptTarget.quotedAmountFc * MARKETPLACE_DEPOSIT_RATE))} — versé hors plateforme.`
                    : 'L’acompte de 30 % sera indiqué après confirmation.'}
                </p>
              </li>
            </ol>
            {acceptTarget.eventDate ? (
              <p className="text-xs text-muted">
                Date demandée : {new Date(acceptTarget.eventDate).toLocaleDateString('fr-FR')}
              </p>
            ) : (
              <Alert variant="warning">
                Aucune date n’est encore indiquée. Répondez au professionnel pour la fixer, puis revenez accepter le devis.
              </Alert>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(threadTarget)}
        onClose={() => {
          if (!threadSending) setThreadTarget(null);
        }}
        title={threadTarget ? `Conversation — ${threadTarget.title}` : 'Conversation'}
        description={
          threadTarget
            ? inquiryChatClosed(threadTarget)
              ? 'Cette conversation est clôturée. Les messages restent visibles.'
              : organizerView
                ? `Discutez date, montant et conditions avec ${threadTarget.vendorName || 'le professionnel'}, puis acceptez le devis pour conclure.`
                : `Discutez avec ${threadTarget.fromName} pour tomber d’accord, puis chiffrez le devis pour conclure.`
            : undefined
        }
        size="lg"
        footer={
          threadTarget && inquiryChatClosed(threadTarget) ? (
            <p className="w-full text-xs text-muted">
              Conversation clôturée
              {threadTarget.closedByRole
                ? ` par ${threadTarget.closedByRole === 'CLIENT' ? (threadTarget.fromName || 'le client') : (threadTarget.vendorName || 'le professionnel')}`
                : ''}
              {threadTarget.closedAt
                ? ` · ${new Date(threadTarget.closedAt).toLocaleString('fr-FR')}`
                : ''}
              .
            </p>
          ) : (
            <div className="flex w-full flex-col gap-2">
              <form onSubmit={handleSendReply} className="flex w-full flex-col sm:flex-row gap-2">
                <textarea
                  rows={2}
                  value={threadDraft}
                  onChange={(e) => setThreadDraft(e.target.value)}
                  placeholder={organizerView ? 'Répondre au professionnel…' : 'Répondre au client…'}
                  className="flex-1 min-h-11 px-3 py-2 rounded-xl border border-border bg-surface text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary resize-none"
                />
                <Button type="submit" loading={threadSending} disabled={!threadDraft.trim()}>
                  Envoyer
                </Button>
              </form>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted">Les réponses apparaissent ici en direct.</p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  loading={threadClosing}
                  onClick={() => void handleCloseThread()}
                  leftIcon={<DoorClosed className="w-3.5 h-3.5" />}
                >
                  Clôturer
                </Button>
              </div>
            </div>
          )
        }
      >
        <div className="space-y-3">
          {panelError && threadTarget ? <Alert variant="error">{panelError}</Alert> : null}
          {threadTarget && !inquiryChatClosed(threadTarget) && !threadTarget.hasBooking ? (
            <div className="rounded-xl border border-border bg-surface-muted/50 px-3 py-2.5 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Conclure le devis
              </p>
              {threadTarget.status === 'QUOTED' && threadTarget.quotedAmountFc != null ? (
                <p className="text-sm font-medium text-foreground">
                  Proposition en cours : {formatFc(threadTarget.quotedAmountFc)}
                </p>
              ) : (
                <p className="text-xs text-muted">
                  {organizerView
                    ? 'Précisez votre besoin ici. Dès que le professionnel chiffre, vous pourrez accepter.'
                    : 'Échangez sur la date et le périmètre, puis envoyez un montant pour conclure.'}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {organizerView && threadTarget.status === 'QUOTED' ? (
                  <Button
                    size="sm"
                    onClick={() => handleConvertBooking(threadTarget)}
                    leftIcon={<CalendarCheck className="w-3.5 h-3.5" />}
                  >
                    Accepter et demander la réservation
                    {threadTarget.quotedAmountFc != null ? ` (${formatFc(threadTarget.quotedAmountFc)})` : ''}
                  </Button>
                ) : null}
                {!organizerView ? (
                  <Button
                    size="sm"
                    variant={threadTarget.status === 'QUOTED' ? 'secondary' : 'primary'}
                    onClick={() => openQuoteModal(threadTarget)}
                    leftIcon={<Coins className="w-3.5 h-3.5" />}
                  >
                    {threadTarget.status === 'QUOTED' ? 'Modifier le devis' : 'Chiffrer le devis'}
                  </Button>
                ) : null}
                {!organizerView && threadTarget.eventDate ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busyId === threadTarget.id}
                    onClick={() => handleConvertBooking(threadTarget)}
                    leftIcon={<CalendarCheck className="w-3.5 h-3.5" />}
                  >
                    Créer la réservation
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
          {threadTarget?.hasBooking ? (
            <Alert variant="success">
              Un accord a été conclu. Suivez l’acompte et la confirmation dans Réservations.
            </Alert>
          ) : null}
          <div className="space-y-2 max-h-[45vh] overflow-y-auto overscroll-contain pr-1">
            {threadTarget?.message ? (
              <div className="rounded-2xl border border-border bg-surface-muted/70 px-3 py-2.5 text-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1">
                  Demande initiale · {threadTarget.fromName}
                </p>
                <p className="whitespace-pre-line text-foreground">{threadTarget.message}</p>
              </div>
            ) : null}
            {threadLoading ? (
              <p className="text-xs text-muted">Chargement de la conversation…</p>
            ) : null}
            {threadMessages.map((message) => {
              const mine = organizerView
                ? message.authorRole === 'CLIENT'
                : message.authorRole === 'VENDOR';
              return (
                <div
                  key={message.id}
                  className={cn(
                    'rounded-2xl px-3 py-2.5 text-sm whitespace-pre-line max-w-[92%]',
                    mine
                      ? 'ml-auto bg-primary/12 border border-primary/20'
                      : 'mr-auto bg-surface-muted border border-border',
                  )}
                >
                  <p className="text-[11px] font-semibold text-muted mb-1">
                    {message.authorRole === 'CLIENT' ? threadTarget?.fromName || 'Client' : threadTarget?.vendorName || 'Professionnel'}
                    {' · '}
                    {new Date(message.createdAt).toLocaleString('fr-FR')}
                  </p>
                  <p>{message.body}</p>
                </div>
              );
            })}
            <div ref={threadEndRef} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
