'use client';

import React, { useEffect, useState } from 'react';
import { Coins, Loader2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { Alert, Badge, Button, EmptyState, Input, Pagination } from '@/components/ui';
import { cn } from '@/lib/cn';
import { segmentedItem, SEGMENTED_TRACK } from '@/components/ui/segmented';
import { formatFc } from '@/config/landingPricing';

interface AdminDepositRow {
  id: string;
  bookingId: string;
  bookingStatus: string;
  eventDate: string;
  title: string;
  vendorName: string;
  organizerName: string | null;
  status: 'PENDING' | 'PAID' | 'FAILED';
  paymentMethod: 'mobile' | 'card';
  amountFc: number;
  commissionFc: number;
  payoutAmountFc: number;
  paidAt: string | null;
  payoutStatus: 'NONE' | 'PENDING' | 'SUCCESS' | 'FAILED';
  payoutPhoneMasked: string | null;
  payoutMessage: string | null;
  payoutAt: string | null;
  createdAt: string;
}

interface DepositSummary {
  paidCount: number;
  collectedFc: number;
  commissionFc: number;
  payoutFc: number;
  attentionCount: number;
  payoutConfigured: boolean;
}

const FILTERS = [
  { id: 'attention', label: 'À suivre' },
  { id: 'paid', label: 'Payés' },
  { id: 'pending', label: 'Paiements en attente' },
  { id: 'all', label: 'Tous' },
] as const;

const PAYMENT_LABEL: Record<AdminDepositRow['status'], { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  PAID: { label: 'Payé', variant: 'success' },
  PENDING: { label: 'Paiement en attente', variant: 'warning' },
  FAILED: { label: 'Paiement échoué', variant: 'danger' },
};

const PAYOUT_LABEL: Record<AdminDepositRow['payoutStatus'], { label: string; variant: 'default' | 'success' | 'warning' | 'danger' }> = {
  NONE: { label: 'Reversement non parti', variant: 'warning' },
  PENDING: { label: 'Reversement en cours', variant: 'warning' },
  SUCCESS: { label: 'Reversé', variant: 'success' },
  FAILED: { label: 'Reversement échoué', variant: 'danger' },
};

/** Acomptes payés en ligne : contrôle des reversements aux prestataires. */
export default function AdminMarketplaceDeposits() {
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('attention');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<{ items: AdminDepositRow[]; total: number; summary: DepositSummary } | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const pageSize = 20;

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize), filter });
    if (q) params.set('q', q);
    api
      .get(`/admin/catalog/deposits?${params}`)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError('');
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Impossible de charger les acomptes.');
      });
    return () => {
      cancelled = true;
    };
  }, [page, q, filter, reload]);

  const retry = async (row: AdminDepositRow) => {
    setBusyId(row.id);
    setNotice('');
    setError('');
    try {
      const res = await api.post(`/admin/catalog/deposits/${row.id}/retry`, {});
      setNotice(res.message || 'Relance effectuée.');
      setReload((n) => n + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action impossible.');
    } finally {
      setBusyId('');
    }
  };

  const summary = data?.summary;

  return (
    <div className="space-y-4">
      {summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Acomptes payés', value: String(summary.paidCount) },
            { label: 'Encaissé', value: formatFc(summary.collectedFc) },
            { label: 'Commission retenue', value: formatFc(summary.commissionFc) },
            { label: 'Dû aux prestataires', value: formatFc(summary.payoutFc) },
          ].map((tile) => (
            <div key={tile.label} className="rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3">
              <p className="text-[11px] text-muted">{tile.label}</p>
              <p className="text-lg font-semibold tabular-nums text-foreground">{tile.value}</p>
            </div>
          ))}
        </div>
      ) : null}
      {summary && !summary.payoutConfigured ? (
        <Alert variant="warning">
          FlexPay Pay Out n’est pas configuré sur le serveur : les reversements aux prestataires ne partent pas.
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] flex-1">
          <Input label="Prestataire" placeholder="Nom du prestataire…" value={qInput} onChange={(e) => setQInput(e.target.value)} />
        </div>
        <div className={cn('inline-flex flex-wrap', SEGMENTED_TRACK)} role="radiogroup" aria-label="Filtre">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={filter === item.id}
              className={segmentedItem(filter === item.id, 'px-3 py-1.5 text-xs')}
              onClick={() => {
                setFilter(item.id);
                setPage(1);
              }}
            >
              {item.label}
              {item.id === 'attention' && summary ? ` (${summary.attentionCount})` : ''}
            </button>
          ))}
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {notice ? <Alert variant="info">{notice}</Alert> : null}

      {!data ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={<Coins className="w-5 h-5" />}
          title={filter === 'attention' ? 'Rien à suivre' : 'Aucun acompte'}
          description={filter === 'attention' ? 'Tous les acomptes payés en ligne ont été reversés.' : 'Les acomptes payés en ligne apparaîtront ici.'}
        />
      ) : (
        <ul className="space-y-3">
          {data.items.map((row) => {
            const pay = PAYMENT_LABEL[row.status];
            const payout = PAYOUT_LABEL[row.payoutStatus];
            const canRetry =
              row.status === 'PENDING' || (row.status === 'PAID' && row.payoutStatus !== 'SUCCESS');
            return (
              <li key={row.id} className="rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-foreground">{row.title}</p>
                    <p className="text-xs text-muted">
                      {row.vendorName}
                      {row.organizerName ? ` · client ${row.organizerName}` : ''} · événement le{' '}
                      {new Date(row.eventDate).toLocaleDateString('fr-FR')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={pay.variant}>{pay.label}</Badge>
                      {row.status === 'PAID' ? <Badge variant={payout.variant}>{payout.label}</Badge> : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{formatFc(row.amountFc)}</p>
                    <p className="text-[11px] text-muted tabular-nums">
                      commission {formatFc(row.commissionFc)} · reversé {formatFc(row.payoutAmountFc)}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted">
                  {row.paymentMethod === 'card' ? 'Carte' : 'Mobile Money'}
                  {row.paidAt ? ` · payé le ${new Date(row.paidAt).toLocaleString('fr-FR')}` : ''}
                  {row.payoutPhoneMasked ? ` · reversement sur ${row.payoutPhoneMasked}` : ''}
                  {row.payoutAt ? ` · reversé le ${new Date(row.payoutAt).toLocaleString('fr-FR')}` : ''}
                </p>
                {row.payoutMessage && row.payoutStatus !== 'SUCCESS' ? (
                  <p className="text-xs text-foreground/80">FlexPay : {row.payoutMessage}</p>
                ) : null}
                {canRetry ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busyId === row.id}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                    onClick={() => void retry(row)}
                  >
                    {row.status === 'PENDING'
                      ? 'Vérifier le paiement'
                      : row.payoutStatus === 'PENDING'
                        ? 'Vérifier le reversement'
                        : 'Relancer le reversement'}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {data && data.total > pageSize ? (
        <Pagination page={page} pageSize={pageSize} total={data.total} onPageChange={setPage} itemLabel="acomptes" />
      ) : null}
    </div>
  );
}
