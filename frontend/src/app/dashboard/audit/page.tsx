'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ScrollText } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Breadcrumbs, Alert, EmptyState, Pagination, Input, usePageSize } from '@/components/ui';

const ACTION_LABELS: Record<string, string> = {
  TENANT_CREATE: 'Organisation créée',
  TENANT_UPDATE: 'Organisation mise à jour',
  TENANT_DELETE: 'Organisation supprimée',
  TENANT_IMPERSONATE: 'Impersonation',
  USER_CREATE: 'Utilisateur créé',
  USER_UPDATE: 'Utilisateur mis à jour',
  USER_DELETE: 'Utilisateur supprimé',
  EVENT_DELETE: 'Événement supprimé',
  GUEST_DELETE: 'Invité supprimé',
  SETTINGS_UPDATE: 'Réglages plateforme',
  SUBSCRIPTION_APPROVE: 'Abonnement approuvé',
  SUBSCRIPTION_REJECT: 'Abonnement rejeté',
  CATALOG_UNPUBLISH: 'Dépublication catalogue',
  CATALOG_PUBLISH: 'Republication catalogue',
  CATALOG_COMMISSION_SETTLE: 'Commission marketplace encaissée',
  CATALOG_COMMISSION_UNSETTLE: 'Commission marketplace remise due',
  SAAS_PAYOUT_SETTLE: 'Versement SaaS commercial',
  SAAS_PAYOUT_UNSETTLE: 'Versement SaaS remis dû',
  ORG_PAYOUT_SETTLE: 'Versement commercial org.',
  ORG_PAYOUT_UNSETTLE: 'Versement org. remis dû',
  INVOICE_MARK_PAID: 'Facture déclarée payée',
};

interface AuditLogRow {
  id: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string | null;
  tenantId: string | null;
  tenantName: string | null;
  summary: string;
  ip: string | null;
  createdAt: string;
}

interface AuditResponse {
  logs: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  actions: string[];
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

function actionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}

export default function AuditPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [action, setAction] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('audit-logs', 30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<AuditResponse | null>(null);
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (user.role !== 'SUPER_ADMIN') {
      router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') return;
    api
      .get(`/admin/tenants?${new URLSearchParams({ limit: '100', sort: 'name' })}`)
      .then((res) => {
        const rows = Array.isArray(res?.items) ? res.items : Array.isArray(res?.tenants) ? res.tenants : [];
        setTenants(rows.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })));
      })
      .catch(() => {
        /* liste orgs facultative pour le filtre */
      });
  }, [user?.role]);

  const load = useCallback(async () => {
    if (user?.role !== 'SUPER_ADMIN') return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('limit', String(pageSize));
      params.set('page', String(page));
      if (action) params.set('action', action);
      if (tenantId) params.set('tenantId', tenantId);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (q.trim()) params.set('q', q.trim());
      const result = await api.get(`/admin/audit-logs?${params}`);
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le journal d’audit.');
    } finally {
      setLoading(false);
    }
  }, [user?.role, action, tenantId, from, to, q, page, pageSize]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [qInput]);

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

  const knownActions = Array.from(new Set([...(data?.actions || []), ...Object.keys(ACTION_LABELS)])).sort();

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Journal d’audit"
        description="Actions Super Admin et Commercial plateforme : impersonation, forfaits, suppressions, réglages."
        breadcrumbs={
          <Breadcrumbs items={[{ label: 'Accueil', href: '/dashboard?tab=overview' }, { label: 'Journal d’audit' }]} />
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <label className="space-y-1.5">
          <span className="block text-xs font-semibold text-muted">Action</span>
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="block w-full py-2.5 px-3.5 bg-surface-muted border border-border rounded-xl text-sm text-foreground"
          >
            <option value="">Toutes</option>
            {knownActions.map((key) => (
              <option key={key} value={key}>
                {actionLabel(key)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="block text-xs font-semibold text-muted">Organisation</span>
          <select
            value={tenantId}
            onChange={(e) => {
              setTenantId(e.target.value);
              setPage(1);
            }}
            className="block w-full py-2.5 px-3.5 bg-surface-muted border border-border rounded-xl text-sm text-foreground"
          >
            <option value="">Toutes</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <Input
          type="date"
          label="Du"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
        />
        <Input
          type="date"
          label="Au"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
        />
        <Input
          label="Recherche"
          placeholder="Résumé, e-mail…"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
        />
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : !data?.logs.length ? (
        <EmptyState
          icon={<ScrollText className="w-5 h-5" />}
          title="Aucune entrée"
          description="Les actions Super Admin (impersonation, forfaits, suppressions) apparaîtront ici."
        />
      ) : (
        <ul className="divide-y divide-border border border-border rounded-[var(--radius-card)] overflow-hidden bg-surface">
          {data.logs.map((log) => (
            <li key={log.id} className="px-4 py-4">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {actionLabel(log.action)}
                </span>
                <span className="text-[10px] text-muted">{formatWhen(log.createdAt)}</span>
                {log.tenantName && (
                  <span className="text-[10px] text-muted truncate">{log.tenantName}</span>
                )}
              </div>
              <p className="text-sm font-medium text-foreground leading-snug">{log.summary}</p>
              <p className="text-xs text-muted mt-0.5">
                {log.actorEmail}
                {log.ip ? ` · ${log.ip}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}

      {data && data.total > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={data.total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="entrées"
        />
      )}
    </div>
  );
}
