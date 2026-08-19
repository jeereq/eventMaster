'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, EmptyState, Input, Pagination, paginateItems, StatusPill, usePageSize } from '@/components/ui';
import { inquiryNextStep, type MarketplaceInquiryItem } from '@/lib/marketplace';
import { CalendarCheck, CheckCircle2, Inbox, Mail, Phone } from 'lucide-react';

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
        active ? 'bg-primary text-white border-primary' : 'border-border text-muted'
      }`}
    >
      {children}
    </button>
  );
}

export default function MarketplaceInquiriesPanel({
  inquiries,
  onMarkContacted,
  onConvert,
  error,
}: {
  inquiries: MarketplaceInquiryItem[];
  onMarkContacted: (id: string) => Promise<void> | void;
  onConvert: (id: string) => Promise<void> | void;
  error?: string;
}) {
  const [status, setStatus] = useState<'all' | 'NEW' | 'CONTACTED'>('all');
  const [kind, setKind] = useState<'all' | 'venue' | 'service' | 'rental'>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('marketplace-desk-inquiries', 8);
  const [busyId, setBusyId] = useState('');

  const newCount = inquiries.filter((i) => i.status === 'NEW').length;
  const contactedCount = inquiries.filter((i) => i.status === 'CONTACTED').length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inquiries.filter((item) => {
      if (status !== 'all' && item.status !== status) return false;
      if (kind !== 'all' && item.kind !== kind) return false;
      if (!q) return true;
      const hay = [item.title, item.fromName, item.fromEmail, item.fromPhone, item.message]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [inquiries, status, kind, query]);

  useEffect(() => {
    setPage(1);
  }, [status, kind, query, pageSize]);

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
        title="Aucune demande"
        description="Les devis salles, métiers et locations arriveront ici."
      />
    );
  }

  return (
    <div className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3 sm:p-4 space-y-3">
        <p className="text-xs text-muted">
          <span className="font-semibold text-foreground">{newCount}</span> nouvelle{newCount > 1 ? 's' : ''}
          {' · '}
          <span className="font-semibold text-foreground">{contactedCount}</span> contactée{contactedCount > 1 ? 's' : ''}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={status === 'all'} onClick={() => setStatus('all')}>Toutes</Chip>
          <Chip active={status === 'NEW'} onClick={() => setStatus('NEW')}>Nouvelles{newCount ? ` (${newCount})` : ''}</Chip>
          <Chip active={status === 'CONTACTED'} onClick={() => setStatus('CONTACTED')}>Contactées</Chip>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={kind === 'all'} onClick={() => setKind('all')}>Tous</Chip>
          <Chip active={kind === 'venue'} onClick={() => setKind('venue')}>Salles</Chip>
          <Chip active={kind === 'service'} onClick={() => setKind('service')}>Métiers</Chip>
          <Chip active={kind === 'rental'} onClick={() => setKind('rental')}>Locations</Chip>
        </div>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, e-mail, titre, message…" />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-5 h-5" />}
          title="Aucune demande pour ces filtres"
          description="Changez le statut, le type ou le texte pour élargir la recherche."
        />
      ) : (
        <>
          <div className="space-y-3">
            {paginateItems(visible, page, pageSize).map((item) => {
              const next = inquiryNextStep(item);
              const busy = busyId === item.id;
              return (
                <article
                  key={item.id}
                  className="border border-border rounded-[var(--radius-card)] bg-surface p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                        {item.kind === 'venue' ? 'Salle' : item.kind === 'rental' ? 'Location' : 'Métier'} · {item.title}
                      </p>
                      <h3 className="font-semibold text-sm mt-0.5">{item.fromName}</h3>
                      <p className="text-xs text-muted mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
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
                    </div>
                    <StatusPill tone={item.status === 'NEW' ? 'amber' : 'emerald'}>
                      {item.status === 'NEW' ? 'Nouveau' : 'Contacté'}
                    </StatusPill>
                  </div>

                  {item.message && (
                    <p className="text-sm text-muted whitespace-pre-line">{item.message}</p>
                  )}

                  <p className="text-[11px] text-muted">
                    {new Date(item.createdAt).toLocaleString('fr-FR')}
                    {item.eventDate ? ` · date souhaitée ${new Date(item.eventDate).toLocaleDateString('fr-FR')}` : ''}
                    {item.guestCount ? ` · ${item.guestCount} invités` : ''}
                  </p>

                  <div className="rounded-lg border border-border bg-surface-muted/70 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Prochaine étape</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{next.title}</p>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">{next.detail}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.status === 'NEW' && (
                      <Button
                        size="sm"
                        variant={item.eventDate && !item.hasBooking ? 'secondary' : 'primary'}
                        loading={busy}
                        onClick={() => run(item.id, () => onMarkContacted(item.id))}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        Marquer comme contacté
                      </Button>
                    )}
                    {item.eventDate && !item.hasBooking && (
                      <Button
                        size="sm"
                        loading={busy}
                        onClick={() => run(item.id, () => onConvert(item.id))}
                        leftIcon={<CalendarCheck className="w-3.5 h-3.5" />}
                      >
                        Convertir en réservation
                      </Button>
                    )}
                    {item.hasBooking && <StatusPill tone="slate">Déjà réservée</StatusPill>}
                  </div>
                </article>
              );
            })}
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={visible.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="demandes"
          />
        </>
      )}
    </div>
  );
}
