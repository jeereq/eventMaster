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

type TokenAction = 'budget_simulation' | 'invitation_compose' | 'room_plan_from_photo' | 'recharge' | 'grant';

interface LedgerRow {
  id: string;
  action: TokenAction;
  actionLabel: string;
  source: string;
  sourceLabel: string;
  tokensDelta: number;
  tokensFromFree: number;
  tokensFromBonus: number;
  tokensFromGranted?: number;
  pool: string;
  poolLabel: string;
  moneyKind?: 'revenue' | 'non_revenue' | 'mixed';
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
  };
  money?: {
    paidAmountFc: number;
    paidOrders: number;
    paidTokensCredited: number;
    paidTokensConsumed: number;
  };
  nonRevenue?: {
    freeConsumed: number;
    grantedCredits: number;
    grantedConsumed: number;
    unlimitedConsumed: number;
    total: number;
  };
  stock: {
    remaining: number;
    remainingFree: number;
    remainingBonus: number;
    remainingGranted?: number;
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
  if (action === 'grant') return <Badge variant="warning">{label}</Badge>;
  if (action === 'invitation_compose' || action === 'room_plan_from_photo') return <Badge variant="default">{label}</Badge>;
  return <Badge variant="warning">{label}</Badge>;
}

function moneyBadge(kind?: LedgerRow['moneyKind']) {
  if (kind === 'revenue') return <Badge variant="success">Revenu</Badge>;
  if (kind === 'mixed') return <Badge variant="warning">Mixte</Badge>;
  return <Badge variant="default">Sans revenu</Badge>;
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
  const [grantQuery, setGrantQuery] = useState('');
  const [grantHits, setGrantHits] = useState<Array<{ id: string; name: string | null; email: string; tenantName?: string }>>([]);
  const [grantUser, setGrantUser] = useState<{ id: string; name: string | null; email: string } | null>(null);
  const [grantCount, setGrantCount] = useState('10');
  const [grantBusy, setGrantBusy] = useState(false);
  const [grantMessage, setGrantMessage] = useState('');

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

  useEffect(() => {
    const q = grantQuery.trim();
    if (q.length < 2) {
      setGrantHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      void api.get(`/admin/users?q=${encodeURIComponent(q)}&limit=8`).then((res) => {
        const rows = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
        setGrantHits(rows);
      }).catch(() => setGrantHits([]));
    }, 280);
    return () => window.clearTimeout(t);
  }, [grantQuery]);

  const grantTokens = async () => {
    if (!grantUser || grantBusy) return;
    const tokensCount = Math.round(Number(grantCount));
    if (!Number.isFinite(tokensCount) || tokensCount < 1) {
      setGrantMessage('Indiquez un nombre de jetons valide.');
      return;
    }
    setGrantBusy(true);
    setGrantMessage('');
    try {
      await api.post('/admin/ai-tokens/grant', { userId: grantUser.id, tokensCount });
      setGrantMessage(`${tokensCount} jeton${tokensCount > 1 ? 's' : ''} offerts à ${grantUser.email}.`);
      setGrantUser(null);
      setGrantQuery('');
      await load();
    } catch (err: unknown) {
      setGrantMessage((err as { message?: string })?.message || 'Attribution impossible.');
    } finally {
      setGrantBusy(false);
    }
  };

  const totals = data?.totals;
  const stock = data?.stock;
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
        description="Revenus FlexPay séparés des jetons offerts, gratuits ou session support."
        breadcrumbs={
          <Breadcrumbs items={[{ label: 'Accueil', href: '/dashboard?tab=overview' }, { label: 'Jetons IA' }]} />
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Offrir des jetons</h2>
        <p className="text-xs text-muted">Attribution Super Admin : sans paiement, visible comme « sans revenu ».</p>
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_8rem_auto] gap-2">
          <div className="relative">
            <input
              value={grantQuery}
              onChange={(event) => {
                setGrantQuery(event.target.value);
                setGrantUser(null);
              }}
              placeholder="Rechercher un utilisateur (e-mail ou nom)"
              className="w-full min-h-11 px-3 rounded-xl border border-border bg-background text-sm"
            />
            {grantHits.length > 0 && !grantUser ? (
              <ul className="absolute z-10 mt-1 w-full border border-border rounded-xl bg-surface shadow-lg max-h-56 overflow-auto">
                {grantHits.map((hit) => (
                  <li key={hit.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted"
                      onClick={() => {
                        setGrantUser(hit);
                        setGrantQuery(hit.email);
                        setGrantHits([]);
                      }}
                    >
                      <span className="font-medium text-foreground">{hit.name || hit.email}</span>
                      <span className="block text-xs text-muted">{hit.email}{hit.tenantName ? ` · ${hit.tenantName}` : ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <input
            type="number"
            min={1}
            max={10000}
            value={grantCount}
            onChange={(event) => setGrantCount(event.target.value)}
            className="min-h-11 px-3 rounded-xl border border-border bg-background text-sm"
            aria-label="Nombre de jetons à offrir"
          />
          <button
            type="button"
            disabled={grantBusy || !grantUser}
            onClick={() => void grantTokens()}
            className="min-h-11 px-4 rounded-xl bg-primary-solid text-primary-foreground text-sm font-semibold disabled:opacity-50"
          >
            {grantBusy ? 'Attribution…' : 'Offrir'}
          </button>
        </div>
        {grantMessage ? <p className="text-xs text-muted">{grantMessage}</p> : null}
      </section>

      <div>
        <p className="text-xs uppercase tracking-wider text-muted mb-2">Argent encaissé (FlexPay)</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border rounded-[var(--radius-card)] overflow-hidden mb-6">
          {[
            { label: 'FC encaissés', value: Math.round(data?.money?.paidAmountFc ?? 0).toLocaleString('fr-FR') },
            { label: 'Achats payés', value: data?.money?.paidOrders ?? 0 },
            { label: 'Jetons achetés', value: data?.money?.paidTokensCredited ?? 0 },
            { label: 'Jetons payés consommés', value: data?.money?.paidTokensConsumed ?? 0 },
          ].map((card) => (
            <div key={card.label} className="bg-surface px-4 py-3">
              <div className="text-lg font-semibold text-foreground tabular-nums">{card.value}</div>
              <div className="text-xs uppercase tracking-wider text-muted">{card.label}</div>
            </div>
          ))}
        </div>
        <p className="text-xs uppercase tracking-wider text-muted mb-2">Jetons sans revenu</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border rounded-[var(--radius-card)] overflow-hidden mb-6">
          {[
            { label: 'Essais gratuits consommés', value: data?.nonRevenue?.freeConsumed ?? 0 },
            { label: 'Offerts (crédit)', value: data?.nonRevenue?.grantedCredits ?? 0 },
            { label: 'Offerts consommés', value: data?.nonRevenue?.grantedConsumed ?? 0 },
            { label: 'Admin / support illimité', value: data?.nonRevenue?.unlimitedConsumed ?? 0 },
          ].map((card) => (
            <div key={card.label} className="bg-surface px-4 py-3">
              <div className="text-lg font-semibold text-foreground tabular-nums">{card.value}</div>
              <div className="text-xs uppercase tracking-wider text-muted">{card.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-muted mb-2">Période filtrée</p>
        <div className="grid grid-cols-3 gap-px bg-border border border-border rounded-[var(--radius-card)] overflow-hidden">
          {[
            { label: 'Consommés', value: totals?.consumed ?? 0 },
            { label: 'Rechargés', value: totals?.credited ?? 0 },
            { label: 'Mouvements', value: totals?.moves ?? 0 },
          ].map((card) => (
            <div key={card.label} className="bg-surface px-4 py-3">
              <div className="text-lg font-semibold text-foreground tabular-nums">{card.value}</div>
              <div className="text-xs uppercase tracking-wider text-muted">{card.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-muted mb-2">Stock plateforme (tous wallets)</p>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-border border border-border rounded-[var(--radius-card)] overflow-hidden">
          <div className="bg-surface px-4 py-3">
            <div className="text-lg font-semibold text-foreground tabular-nums">{stock?.remaining ?? 0}</div>
            <div className="text-xs uppercase tracking-wider text-muted">Restants</div>
          </div>
          <div className="bg-surface px-4 py-3">
            <div className="text-lg font-semibold text-foreground tabular-nums">{stock?.remainingFree ?? 0}</div>
            <div className="text-xs uppercase tracking-wider text-muted">Essais gratuits</div>
          </div>
          <div className="bg-surface px-4 py-3">
            <div className="text-lg font-semibold text-foreground tabular-nums">{stock?.remainingBonus ?? 0}</div>
            <div className="text-xs uppercase tracking-wider text-muted">Payés restants</div>
          </div>
          <div className="bg-surface px-4 py-3">
            <div className="text-lg font-semibold text-foreground tabular-nums">{stock?.remainingGranted ?? 0}</div>
            <div className="text-xs uppercase tracking-wider text-muted">Offerts restants</div>
          </div>
          <div className="bg-surface px-4 py-3">
            <div className="text-lg font-semibold text-foreground tabular-nums">{stock?.wallets ?? 0}</div>
            <div className="text-xs uppercase tracking-wider text-muted">Wallets</div>
          </div>
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
          <h2 className="text-sm font-semibold text-foreground">Par jour (même filtre)</h2>
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
                  { id: 'room_plan_from_photo', label: 'Plan de salle IA' },
                  { id: 'recharge', label: 'Recharge payante' },
                  { id: 'grant', label: 'Attribution Super Admin' },
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
                <th className="px-3 py-2.5 font-semibold">Argent</th>
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
                  <td className="px-3 py-2.5">{moneyBadge(row.moneyKind)}</td>
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
