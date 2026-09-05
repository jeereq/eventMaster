'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coins, Loader2 } from 'lucide-react';
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
import { cn } from '@/lib/cn';

type TokenAction = 'budget_simulation' | 'invitation_compose' | 'recharge';

interface LedgerRow {
  id: string;
  action: TokenAction;
  actionLabel: string;
  source: string;
  sourceLabel: string;
  tokensDelta: number;
  tokensFromFree: number;
  tokensFromBonus: number;
  pool: string;
  poolLabel: string;
  relatedId: string | null;
  deviceId: string | null;
  userName: string | null;
  userEmail: string | null;
  tenantName: string | null;
  createdAt: string;
}

interface UsageResponse {
  totals: {
    moves: number;
    consumed: number;
    credited: number;
    remaining: number;
    remainingFree: number;
    remainingBonus: number;
    wallets: number;
  };
  byAction: Array<{
    action: TokenAction;
    actionLabel: string;
    count: number;
    tokensConsumed: number;
    tokensCredited: number;
  }>;
  byDay: Array<{ day: string; consumed: number; credited: number; moves: number }>;
  items: LedgerRow[];
  total: number;
  page: number;
  pageSize: number;
}

type DatePreset = 'all' | 'today' | '7d' | '30d' | 'month' | 'custom';

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

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function actionBadge(action: TokenAction, label: string) {
  if (action === 'recharge') return <Badge variant="success">{label}</Badge>;
  if (action === 'invitation_compose') return <Badge variant="default">{label}</Badge>;
  return <Badge variant="warning">{label}</Badge>;
}

export default function AdminAiTokensPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [action, setAction] = useState<'all' | TokenAction>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [from, setFrom] = useState(() => rangeForPreset('30d').from);
  const [to, setTo] = useState(() => rangeForPreset('30d').to);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('admin-ai-tokens', 20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<UsageResponse | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (user.role !== 'SUPER_ADMIN') router.replace('/dashboard');
  }, [authLoading, user, router]);

  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const range = rangeForPreset(preset);
    setFrom(range.from);
    setTo(range.to);
    setPage(1);
  };

  const load = useCallback(async () => {
    if (!user || user.role !== 'SUPER_ADMIN') return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      if (action !== 'all') params.set('action', action);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (q.trim()) params.set('q', q.trim());
      setData(await api.get(`/admin/ai-tokens/usage?${params}`));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Impossible de charger l’usage des jetons.');
    } finally {
      setLoading(false);
    }
  }, [user, page, pageSize, action, from, to, q]);

  useEffect(() => {
    if (authLoading || !user || user.role !== 'SUPER_ADMIN') return;
    void load();
  }, [authLoading, user, load]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(qInput);
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [qInput]);

  const totals = data?.totals;
  const datePresetLabel = ({
    all: 'Toutes',
    today: 'Aujourd’hui',
    '7d': '7 jours',
    '30d': '30 jours',
    month: 'Ce mois',
    custom: 'Personnalisé',
  } as const)[datePreset];

  const chips: CatalogueFilterChip[] = [
    ...(action !== 'all'
      ? [{ id: 'action', label: 'Action', value: data?.byAction.find((a) => a.action === action)?.actionLabel || action }]
      : []),
    ...(from || to
      ? [{
          id: 'dates',
          label: 'Période',
          value: datePreset === 'custom' || datePreset === 'all'
            ? `${from || '…'} → ${to || '…'}`
            : datePresetLabel,
        }]
      : []),
  ];

  if (authLoading || (user && user.role !== 'SUPER_ADMIN')) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Jetons IA"
        description="Chaque mouvement : simulation budget, invitation, ou recharge. Qui, combien, quand."
        breadcrumbs={
          <Breadcrumbs items={[{ label: 'Accueil', href: '/dashboard?tab=overview' }, { label: 'Jetons IA' }]} />
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border rounded-[var(--radius-card)] overflow-hidden">
        {[
          { label: 'Consommés', value: totals?.consumed ?? 0 },
          { label: 'Rechargés', value: totals?.credited ?? 0 },
          { label: 'Restants', value: totals?.remaining ?? 0 },
          { label: 'Mouvements', value: totals?.moves ?? 0 },
        ].map((card) => (
          <div key={card.label} className="bg-surface px-4 py-3">
            <div className="text-lg font-semibold text-foreground tabular-nums">{card.value}</div>
            <div className="text-xs uppercase tracking-wider text-muted">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border rounded-[var(--radius-card)] overflow-hidden">
        <div className="bg-surface px-4 py-3">
          <div className="text-lg font-semibold text-foreground tabular-nums">{totals?.remainingFree ?? 0}</div>
          <div className="text-xs uppercase tracking-wider text-muted">Essais gratuits restants</div>
        </div>
        <div className="bg-surface px-4 py-3">
          <div className="text-lg font-semibold text-foreground tabular-nums">{totals?.remainingBonus ?? 0}</div>
          <div className="text-xs uppercase tracking-wider text-muted">Jetons payés restants</div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Coins className="w-4 h-4 text-primary" />
          Par type d’action
        </h2>
        {!data?.byAction.length ? (
          <EmptyState
            icon={<Coins className="w-5 h-5" />}
            title="Aucun mouvement"
            description="Les consommations et recharges apparaîtront ici."
          />
        ) : (
          <div className="overflow-x-auto border border-border rounded-[var(--radius-card)] bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-3 py-2.5 font-semibold">Action</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Mouvements</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Consommés</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Crédités</th>
                </tr>
              </thead>
              <tbody>
                {data.byAction.map((row) => (
                  <tr key={row.action} className="border-b border-border/70 last:border-0">
                    <td className="px-3 py-2.5 font-medium text-foreground">{row.actionLabel}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{row.count}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-rose-700 dark:text-rose-300">{row.tokensConsumed}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700 dark:text-emerald-300">{row.tokensCredited}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data?.byDay.length ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">30 derniers jours</h2>
          <div className="overflow-x-auto border border-border rounded-[var(--radius-card)] bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-3 py-2.5 font-semibold">Jour</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Consommés</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Rechargés</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Mouvements</th>
                </tr>
              </thead>
              <tbody>
                {data.byDay.map((row) => (
                  <tr key={row.day} className="border-b border-border/70 last:border-0">
                    <td className="px-3 py-2.5 text-foreground">{row.day}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{row.consumed}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{row.credited}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted">{row.moves}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <CatalogueFilterBar
        search={qInput}
        onSearchChange={setQInput}
        searchPlaceholder="E-mail, organisation, appareil…"
        hideViewToggle
        chips={chips}
        onRemoveChip={(id) => {
          if (id === 'action') setAction('all');
          if (id === 'dates') applyDatePreset('all');
          setPage(1);
        }}
        onClearChips={() => {
          setAction('all');
          applyDatePreset('30d');
        }}
        resultLabel={`${data?.total ?? 0} mouvement${(data?.total ?? 0) > 1 ? 's' : ''}`}
        modalTitle="Filtres jetons"
        filters={
          <>
            <CatalogueFilterField label="Action">
              <CatalogueChoicePills
                options={[
                  { id: 'all', label: 'Toutes' },
                  { id: 'budget_simulation', label: 'Simulation budget' },
                  { id: 'invitation_compose', label: 'Invitation IA' },
                  { id: 'recharge', label: 'Recharge' },
                ]}
                value={action}
                onChange={(id) => {
                  setAction((id as 'all' | TokenAction) || 'all');
                  setPage(1);
                }}
              />
            </CatalogueFilterField>
            <CatalogueFilterField label="Période">
              <CatalogueChoicePills
                options={[
                  { id: 'all', label: 'Toutes' },
                  { id: 'today', label: 'Aujourd’hui' },
                  { id: '7d', label: '7 jours' },
                  { id: '30d', label: '30 jours' },
                  { id: 'month', label: 'Ce mois' },
                ]}
                value={datePreset === 'custom' ? 'all' : datePreset}
                onChange={(id) => applyDatePreset((id as DatePreset) || 'all')}
              />
            </CatalogueFilterField>
          </>
        }
      />

      {loading && !data ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted" />
        </div>
      ) : !data?.items.length ? (
        <EmptyState
          icon={<Coins className="w-5 h-5" />}
          title="Aucun mouvement"
          description="Générez une invitation ou une simulation, ou rechargez des jetons."
        />
      ) : (
        <div className={cn('overflow-x-auto border border-border rounded-[var(--radius-card)] bg-surface', loading && 'opacity-70')}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-3 py-2.5 font-semibold">Quand</th>
                <th className="px-3 py-2.5 font-semibold">Action</th>
                <th className="px-3 py-2.5 font-semibold text-right">Jetons</th>
                <th className="px-3 py-2.5 font-semibold">Pool</th>
                <th className="px-3 py-2.5 font-semibold">Qui</th>
                <th className="px-3 py-2.5 font-semibold">Où</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.id} className="border-b border-border/70 last:border-0">
                  <td className="px-3 py-2.5 text-muted whitespace-nowrap">{formatWhen(row.createdAt)}</td>
                  <td className="px-3 py-2.5">{actionBadge(row.action, row.actionLabel)}</td>
                  <td className={cn(
                    'px-3 py-2.5 text-right tabular-nums font-semibold',
                    row.tokensDelta > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground',
                  )}>
                    {row.tokensDelta > 0 ? `+${row.tokensDelta}` : row.tokensDelta}
                  </td>
                  <td className="px-3 py-2.5 text-muted">{row.poolLabel}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-foreground">{row.tenantName || row.userName || 'Appareil'}</div>
                    <div className="text-xs text-muted truncate max-w-[16rem]">{row.userEmail || row.deviceId || '—'}</div>
                  </td>
                  <td className="px-3 py-2.5 text-muted">{row.sourceLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > pageSize ? (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={data.total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      ) : null}
    </div>
  );
}
