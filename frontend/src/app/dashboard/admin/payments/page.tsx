'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Eye, Loader2, Wallet } from 'lucide-react';
import AdminFinanceDetailsModal, { type AdminPaymentDetail } from '@/components/admin/AdminFinanceDetailsModal';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  PageHeader, Breadcrumbs, Alert, EmptyState, Pagination, Badge, Input, usePageSize,
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
  entityId?: string | null;
  eventTitle?: string | null;
  eventSlug?: string | null;
  quantity?: number | null;
  tokensCount?: number | null;
  requestedPlan?: string | null;
  tenantName?: string | null;
  proofOfPayment?: string | null;
  rawStatus?: string | null;
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

type DatePreset = 'all' | 'today' | '7d' | '30d' | 'month' | 'custom';
type DateField = 'created' | 'paid';

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function rangeForPreset(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const today = isoDate(now);
  if (preset === 'today') return { from: today, to: today };
  if (preset === '7d') {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return { from: isoDate(from), to: today };
  }
  if (preset === '30d') {
    const from = new Date(now);
    from.setDate(from.getDate() - 29);
    return { from: isoDate(from), to: today };
  }
  if (preset === 'month') {
    return { from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
  }
  return { from: '', to: '' };
}

const CHANNEL_OPTIONS = [
  { id: 'all', label: 'Tous' },
  { id: 'card', label: 'Carte' },
  { id: 'mobile', label: 'Mobile Money' },
  { id: 'mpesa', label: 'M-Pesa' },
  { id: 'orange', label: 'Orange Money' },
  { id: 'airtel', label: 'Airtel Money' },
  { id: 'afrimoney', label: 'Afrimoney' },
  { id: 'manual', label: 'Manuel / preuve' },
  { id: 'unknown', label: 'Non précisé' },
];

const PROVIDER_OPTIONS = [
  { id: 'all', label: 'Tous' },
  { id: 'flexpay_card', label: 'FlexPay carte' },
  { id: 'flexpay_mobile', label: 'FlexPay mobile' },
  { id: 'manual', label: 'Manuel' },
];

const DATE_PRESET_OPTIONS: Array<{ id: DatePreset; label: string }> = [
  { id: 'all', label: 'Toutes' },
  { id: 'today', label: 'Aujourd’hui' },
  { id: '7d', label: '7 jours' },
  { id: '30d', label: '30 jours' },
  { id: 'month', label: 'Ce mois' },
  { id: 'custom', label: 'Personnalisé' },
];

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [kind, setKind] = useState<'all' | PaymentKind>('all');
  const [status, setStatus] = useState<'all' | PaymentStatus>('all');
  const [channel, setChannel] = useState('all');
  const [provider, setProvider] = useState('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [dateField, setDateField] = useState<DateField>('created');
  const [from, setFrom] = useState(() => rangeForPreset('30d').from);
  const [to, setTo] = useState(() => rangeForPreset('30d').to);
  const [minFc, setMinFc] = useState('');
  const [maxFc, setMaxFc] = useState('');
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('admin-payments', 20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [list, setList] = useState<ListResponse | null>(null);
  const [selected, setSelected] = useState<AdminPaymentDetail | null>(null);

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

  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const next = rangeForPreset(preset);
      setFrom(next.from);
      setTo(next.to);
    }
    setPage(1);
  };

  const filterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (kind !== 'all') params.set('kind', kind);
    if (status !== 'all') params.set('status', status);
    if (channel !== 'all') params.set('channel', channel);
    if (provider !== 'all') params.set('provider', provider);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (from || to) params.set('dateField', dateField);
    const min = minFc.trim();
    const max = maxFc.trim();
    if (min) params.set('minFc', min);
    if (max) params.set('maxFc', max);
    if (q) params.set('q', q);
    return params;
  }, [kind, status, channel, provider, from, to, dateField, minFc, maxFc, q]);

  const loadOverview = useCallback(async () => {
    if (user?.role !== 'SUPER_ADMIN') return;
    try {
      const params = filterParams();
      const qs = params.toString();
      setOverview(await api.get(qs ? `/admin/payments/overview?${qs}` : '/admin/payments/overview'));
    } catch {
      /* compteurs facultatifs */
    }
  }, [user?.role, filterParams]);

  const load = useCallback(async () => {
    if (user?.role !== 'SUPER_ADMIN') return;
    setLoading(true);
    setError('');
    try {
      const params = filterParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      setList(await api.get(`/admin/payments/attempts?${params}`));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les paiements.');
    } finally {
      setLoading(false);
    }
  }, [user?.role, page, pageSize, filterParams]);

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
  const channelLabel = CHANNEL_OPTIONS.find((o) => o.id === channel)?.label || channel;
  const providerLabel = PROVIDER_OPTIONS.find((o) => o.id === provider)?.label || provider;
  const datePresetLabel = DATE_PRESET_OPTIONS.find((o) => o.id === datePreset)?.label || datePreset;
  const chips: CatalogueFilterChip[] = [
    ...(kind !== 'all' ? [{ id: 'kind', label: 'Source', value: kind === 'ticket' ? 'Billets' : kind === 'subscription' ? 'Abonnements' : 'Jetons IA' }] : []),
    ...(status !== 'all' ? [{ id: 'status', label: 'Statut', value: status === 'paid' ? 'Aboutis' : status === 'pending' ? 'En cours' : 'Échoués' }] : []),
    ...(channel !== 'all' ? [{ id: 'channel', label: 'Canal', value: channelLabel }] : []),
    ...(provider !== 'all' ? [{ id: 'provider', label: 'Fournisseur', value: providerLabel }] : []),
    ...(from || to
      ? [{
          id: 'dates',
          label: dateField === 'paid' ? 'Payé' : 'Créé',
          value: datePreset === 'custom' || datePreset === 'all'
            ? `${from || '…'} → ${to || '…'}`
            : datePresetLabel,
        }]
      : []),
    ...(minFc.trim() ? [{ id: 'minFc', label: 'Min.', value: `${minFc} FC` }] : []),
    ...(maxFc.trim() ? [{ id: 'maxFc', label: 'Max.', value: `${maxFc} FC` }] : []),
  ];

  const resetFilters = () => {
    setKind('all');
    setStatus('all');
    setChannel('all');
    setProvider('all');
    applyDatePreset('30d');
    setDateField('created');
    setMinFc('');
    setMaxFc('');
    setPage(1);
  };

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
          if (id === 'channel') setChannel('all');
          if (id === 'provider') setProvider('all');
          if (id === 'dates') applyDatePreset('all');
          if (id === 'minFc') setMinFc('');
          if (id === 'maxFc') setMaxFc('');
          setPage(1);
        }}
        onClearChips={resetFilters}
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
            <CatalogueFilterField label="Période">
              <CatalogueChoicePills
                options={DATE_PRESET_OPTIONS}
                value={datePreset}
                onChange={(id) => applyDatePreset((id as DatePreset) || 'all')}
              />
            </CatalogueFilterField>
            <CatalogueFilterField label="Référence de date">
              <CatalogueChoicePills
                options={[
                  { id: 'created', label: 'Date de création' },
                  { id: 'paid', label: 'Date de paiement' },
                ]}
                value={dateField}
                onChange={(id) => {
                  setDateField((id as DateField) || 'created');
                  setPage(1);
                }}
              />
            </CatalogueFilterField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                type="date"
                label="Du"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setDatePreset('custom');
                  setPage(1);
                }}
                className="text-base sm:text-sm min-h-11"
              />
              <Input
                type="date"
                label="Au"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setDatePreset('custom');
                  setPage(1);
                }}
                className="text-base sm:text-sm min-h-11"
              />
            </div>
            <CatalogueFilterField label="Canal">
              <CatalogueChoicePills
                options={CHANNEL_OPTIONS}
                value={channel}
                onChange={(id) => {
                  setChannel(id || 'all');
                  setPage(1);
                }}
              />
            </CatalogueFilterField>
            <CatalogueFilterField label="Fournisseur">
              <CatalogueChoicePills
                options={PROVIDER_OPTIONS}
                value={provider}
                onChange={(id) => {
                  setProvider(id || 'all');
                  setPage(1);
                }}
              />
            </CatalogueFilterField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                label="Montant min. (FC)"
                value={minFc}
                onChange={(e) => {
                  setMinFc(e.target.value);
                  setPage(1);
                }}
                className="text-base sm:text-sm min-h-11"
              />
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                label="Montant max. (FC)"
                value={maxFc}
                onChange={(e) => {
                  setMaxFc(e.target.value);
                  setPage(1);
                }}
                className="text-base sm:text-sm min-h-11"
              />
            </div>
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
            <li key={row.id}>
              <button
                type="button"
                onClick={() => setSelected(row)}
                className="w-full text-left px-4 py-3.5 space-y-1.5 hover:bg-surface-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {statusBadge(row.status)}
                  <Badge variant="default">{row.kindLabel}</Badge>
                  <span className="text-[10px] text-muted">{row.channelLabel}</span>
                  {row.paymentProvider ? (
                    <span className="text-[10px] text-muted">{row.paymentProvider}</span>
                  ) : null}
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
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                  <Eye className="w-3.5 h-3.5" aria-hidden />
                  Voir le détail
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <AdminFinanceDetailsModal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        payment={selected}
      />

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
