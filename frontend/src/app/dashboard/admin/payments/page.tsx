'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Loader2, Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  PageHeader, Breadcrumbs, Alert, EmptyState, Pagination, Badge, usePageSize,
} from '@/components/ui';
import CatalogueFilterBar, {
  CatalogueChoicePills,
  CatalogueFilterField,
  type CatalogueFilterChip,
} from '@/components/CatalogueFilterBar';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';

type PaymentKind = 'ticket' | 'subscription' | 'ai_tokens';
type PaymentStatus = 'paid' | 'pending' | 'failed';

interface PaymentAttemptRow {
  id: string;
  kind: PaymentKind;
  kindLabel: string;
  status: PaymentStatus;
  statusLabel: string;
  amountFc: number;
  currency: string;
  channel: string;
  channelLabel: string;
  paymentProvider: string | null;
  payerName: string | null;
  payerEmail: string | null;
  payerPhone: string | null;
  reference: string | null;
  flexPayOrderNumber: string | null;
  flexPayProviderReference: string | null;
  summary: string;
  createdAt: string;
  updatedAt: string | null;
  paidAt: string | null;
}

interface OverviewBucket {
  count: number;
  paidCount: number;
  pendingCount: number;
  failedCount: number;
  amountAttemptedFc: number;
  amountPaidFc: number;
}

interface SourceRow extends OverviewBucket {
  kind: PaymentKind;
  kindLabel: string;
  channel: string;
  channelLabel: string;
}

interface KindRow extends OverviewBucket {
  kind: PaymentKind;
  kindLabel: string;
}

interface OverviewResponse {
  totals: OverviewBucket;
  bySource: SourceRow[];
  byKind: KindRow[];
  scanned: number;
}

interface ListResponse {
  items: PaymentAttemptRow[];
  total: number;
  page: number;
  pageSize: number;
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadge(status: PaymentStatus) {
  if (status === 'paid') return <Badge variant="success">Abouti</Badge>;
  if (status === 'failed') return <Badge variant="danger">Échoué</Badge>;
  return <Badge variant="warning">En cours</Badge>;
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [kind, setKind] = useState<'all' | PaymentKind>('all');
  const [status, setStatus] = useState<'all' | PaymentStatus>('all');
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('admin-payments', 20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [list, setList] = useState<ListResponse | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (user.role !== 'SUPER_ADMIN') router.replace('/dashboard');
  }, [authLoading, user, router]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [qInput]);

  const loadOverview = useCallback(async () => {
    if (user?.role !== 'SUPER_ADMIN') return;
    try {
      setOverview(await api.get('/admin/payments/overview'));
    } catch {
      /* compteurs facultatifs */
    }
  }, [user?.role]);

  const load = useCallback(async () => {
    if (user?.role !== 'SUPER_ADMIN') return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      if (kind !== 'all') params.set('kind', kind);
      if (status !== 'all') params.set('status', status);
      if (q) params.set('q', q);
      setList(await api.get(`/admin/payments/attempts?${params}`));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les paiements.');
    } finally {
      setLoading(false);
    }
  }, [user?.role, page, pageSize, kind, status, q]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    void load();
  }, [load]);

  if (authLoading || user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const totals = overview?.totals;
  const chips: CatalogueFilterChip[] = [
    ...(kind !== 'all' ? [{ id: 'kind', label: 'Source', value: kind === 'ticket' ? 'Billets' : kind === 'subscription' ? 'Abonnements' : 'Jetons IA' }] : []),
    ...(status !== 'all' ? [{ id: 'status', label: 'Statut', value: status === 'paid' ? 'Aboutis' : status === 'pending' ? 'En cours' : 'Échoués' }] : []),
  ];

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Paiements"
        description="Toutes les tentatives FlexPay / manuelles (billets, abonnements, jetons IA), abouties ou non."
        breadcrumbs={
          <Breadcrumbs items={[{ label: 'Accueil', href: '/dashboard?tab=overview' }, { label: 'Paiements' }]} />
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border rounded-[var(--radius-card)] overflow-hidden">
        {[
          { label: 'Tentatives', value: totals?.count ?? 0 },
          { label: 'Abouties', value: totals?.paidCount ?? 0 },
          { label: 'En cours', value: totals?.pendingCount ?? 0 },
          { label: 'Échouées / annulées', value: totals?.failedCount ?? 0 },
        ].map((card) => (
          <div key={card.label} className="bg-surface px-4 py-3">
            <div className="text-lg font-semibold text-foreground">{card.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border rounded-[var(--radius-card)] overflow-hidden">
        <div className="bg-surface px-4 py-3">
          <div className="text-lg font-semibold text-foreground">{formatFc(totals?.amountPaidFc ?? 0)}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted">Montant encaissé</div>
        </div>
        <div className="bg-surface px-4 py-3">
          <div className="text-lg font-semibold text-foreground">{formatFc(totals?.amountAttemptedFc ?? 0)}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted">Volume tenté</div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          Récapitulatif par source
        </h2>
        {!overview?.bySource.length ? (
          <EmptyState
            icon={<CreditCard className="w-5 h-5" />}
            title="Aucune source"
            description="Les tentatives de paiement apparaîtront ici."
          />
        ) : (
          <div className="overflow-x-auto border border-border rounded-[var(--radius-card)] bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted">
                  <th className="px-3 py-2.5 font-semibold">Source</th>
                  <th className="px-3 py-2.5 font-semibold">Canal</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Tentatives</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Abouties</th>
                  <th className="px-3 py-2.5 font-semibold text-right">En cours</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Échouées</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Encaissé</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Volume</th>
                </tr>
              </thead>
              <tbody>
                {overview.bySource.map((row) => (
                  <tr key={`${row.kind}-${row.channel}`} className="border-b border-border/70 last:border-0">
                    <td className="px-3 py-2.5 font-medium text-foreground">{row.kindLabel}</td>
                    <td className="px-3 py-2.5 text-muted">{row.channelLabel}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{row.count}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700 dark:text-emerald-300">{row.paidCount}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-amber-700 dark:text-amber-300">{row.pendingCount}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-rose-700 dark:text-rose-300">{row.failedCount}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">{formatFc(row.amountPaidFc)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted">{formatFc(row.amountAttemptedFc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CatalogueFilterBar
        search={qInput}
        onSearchChange={setQInput}
        searchPlaceholder="Payeur, référence, résumé…"
        hideViewToggle
        chips={chips}
        onRemoveChip={(id) => {
          if (id === 'kind') setKind('all');
          if (id === 'status') setStatus('all');
          setPage(1);
        }}
        onClearChips={() => {
          setKind('all');
          setStatus('all');
          setPage(1);
        }}
        resultLabel={`${list?.total ?? 0} tentative${(list?.total ?? 0) > 1 ? 's' : ''}`}
        modalTitle="Filtres paiements"
        filters={
          <>
            <CatalogueFilterField label="Source">
              <CatalogueChoicePills
                options={[
                  { id: 'all', label: 'Toutes' },
                  { id: 'ticket', label: 'Billets' },
                  { id: 'subscription', label: 'Abonnements' },
                  { id: 'ai_tokens', label: 'Jetons IA' },
                ]}
                value={kind}
                onChange={(id) => {
                  setKind((id as 'all' | PaymentKind) || 'all');
                  setPage(1);
                }}
              />
            </CatalogueFilterField>
            <CatalogueFilterField label="Statut">
              <CatalogueChoicePills
                options={[
                  { id: 'all', label: 'Tous' },
                  { id: 'paid', label: 'Aboutis' },
                  { id: 'pending', label: 'En cours' },
                  { id: 'failed', label: 'Échoués' },
                ]}
                value={status}
                onChange={(id) => {
                  setStatus((id as 'all' | PaymentStatus) || 'all');
                  setPage(1);
                }}
              />
            </CatalogueFilterField>
          </>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : !list?.items.length ? (
        <EmptyState
          icon={<CreditCard className="w-5 h-5" />}
          title="Aucune tentative"
          description="Aucune tentative ne correspond aux filtres."
        />
      ) : (
        <ul className="divide-y divide-border border border-border rounded-[var(--radius-card)] overflow-hidden bg-surface">
          {list.items.map((row) => (
            <li key={row.id} className="px-4 py-3.5 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                {statusBadge(row.status)}
                <Badge variant="default">{row.kindLabel}</Badge>
                <span className="text-[10px] text-muted">{row.channelLabel}</span>
                <span className="text-[10px] text-muted ml-auto">{formatWhen(row.createdAt)}</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{row.summary}</p>
              <p className="text-xs text-muted">
                <span className={cn('font-semibold text-foreground')}>{formatFc(row.amountFc)}</span>
                {row.payerName || row.payerEmail ? ` · ${row.payerName || row.payerEmail}` : ''}
                {row.payerPhone ? ` · ${row.payerPhone}` : ''}
              </p>
              <p className="text-[11px] text-muted font-mono truncate">
                {[
                  row.reference ? `réf. ${row.reference}` : null,
                  row.flexPayOrderNumber ? `order ${row.flexPayOrderNumber}` : null,
                  row.flexPayProviderReference ? `op. ${row.flexPayProviderReference}` : null,
                  row.paidAt ? `payé ${formatWhen(row.paidAt)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      )}

      {(list?.total ?? 0) > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={list?.total ?? 0}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="tentatives"
        />
      )}
    </div>
  );
}
