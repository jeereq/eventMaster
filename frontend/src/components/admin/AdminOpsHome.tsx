'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2, Check, Clock, CreditCard, FileText, Loader2, LogIn, ShieldAlert, Users, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Alert, Button, Modal, StatusPill } from '@/components/ui';
import { ACCOUNT_KIND_LABELS, type TenantAccountKind } from '@/lib/marketplace';
import { cn } from '@/lib/cn';
import { formatFc } from '@/config/landingPricing';

interface TenantRow {
  id: string;
  name: string;
  plan: string;
  accountKind: TenantAccountKind;
  licenseActive: boolean;
  licenseExpiresAt: string | null;
  createdAt: string;
  managerName: string;
  managerEmail: string;
}

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  amountFormatted: string;
  status: string;
  statusLabel: string;
  plan: string;
  tenant?: { name: string } | null;
  tenantName?: string;
}

interface AuditRow {
  id: string;
  actorEmail: string;
  action: string;
  summary: string;
  createdAt: string;
  tenantId: string | null;
}

interface PendingRequestRow {
  id: string;
  requestedPlan: string;
  durationDays?: number;
  proofOfPayment?: string | null;
  baseAmount?: number | null;
  paymentProvider?: string | null;
  createdAt: string;
  tenant?: { id: string; name: string } | null;
}

interface OpsOverview {
  counts: {
    pendingRequests: number;
    licensesExpiring: number;
    unpaidInvoices: number;
    recentOrgs: number;
    saasPayoutsDue?: number;
  };
  saasPayoutsDue?: {
    period: string;
    periodLabel: string;
    count: number;
    amountFc: number;
    overdue: boolean;
  };
  pendingRequests?: PendingRequestRow[];
  licensesExpiring: TenantRow[];
  unpaidInvoices: InvoiceRow[];
  recentOrgs: TenantRow[];
  recentAudit: AuditRow[];
}

interface TenantOps {
  tenant: TenantRow & {
    licenseKey?: string | null;
    managerId?: string | null;
    manager?: { id: string; name: string | null; email: string } | null;
  };
  counts: {
    users: number;
    events: number;
    rooms: number;
    venueListings: number;
    serviceOfferings: number;
  };
  users: Array<{
    id: string;
    name: string | null;
    email: string;
    role: string;
    orgRole: string | null;
  }>;
  pendingRequests: Array<{
    id: string;
    requestedPlan: string;
    createdAt: string;
    durationDays?: number;
    proofOfPayment?: string | null;
    baseAmount?: number | null;
  }>;
  invoices: InvoiceRow[];
  audit: AuditRow[];
  canImpersonate: boolean;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function invoiceOrgName(inv: InvoiceRow) {
  return inv.tenantName || inv.tenant?.name || 'Organisation';
}

function QueueSection({
  title,
  count,
  href,
  empty,
  children,
}: {
  title: string;
  count: number;
  href: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground tracking-tight">
          {title}
          <span className="ml-2 text-muted font-medium">{count}</span>
        </h3>
        <Link href={href} className="text-xs font-medium text-primary hover:underline">
          Voir tout
        </Link>
      </div>
      {count === 0 ? (
        <p className="text-sm text-muted py-4">{empty}</p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">{children}</ul>
      )}
    </section>
  );
}

function ActionBtn({
  children,
  onClick,
  loading,
  variant = 'secondary',
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  title?: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={variant === 'danger' ? 'danger' : variant}
      loading={loading}
      disabled={disabled || loading}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      className="min-h-11 shrink-0"
    >
      {children}
    </Button>
  );
}

export default function AdminOpsHome() {
  const { enterSupportSession } = useAuth();
  const [data, setData] = useState<OpsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ficheOpen, setFicheOpen] = useState(false);
  const [fiche, setFiche] = useState<TenantOps | null>(null);
  const [ficheLoading, setFicheLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const overview = await api.get('/admin/ops-overview');
      setData(overview);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger l’accueil.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const openFiche = async (tenantId: string) => {
    setFicheOpen(true);
    setFicheLoading(true);
    setFiche(null);
    try {
      const ops = await api.get(`/admin/tenants/${tenantId}/ops`);
      setFiche(ops);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger la fiche.');
      setFicheOpen(false);
    } finally {
      setFicheLoading(false);
    }
  };

  const refreshFiche = async (tenantId: string) => {
    try {
      const ops = await api.get(`/admin/tenants/${tenantId}/ops`);
      setFiche(ops);
    } catch {
      /* ignore */
    }
  };

  const openWorkspace = async (tenantId: string) => {
    try {
      setBusyId(`impersonate:${tenantId}`);
      const payload = await api.post(`/admin/tenants/${tenantId}/impersonate`);
      enterSupportSession(payload);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible d’ouvrir l’espace.');
      setBusyId(null);
    }
  };

  const approveRequest = async (id: string, tenantId?: string) => {
    setBusyId(`approve:${id}`);
    setError('');
    setSuccess('');
    try {
      const response = await api.post(`/admin/subscriptions/requests/${id}/approve`, {
        discountPercent: 0,
      });
      setSuccess(response.message || 'Demande approuvée.');
      await loadOverview();
      if (tenantId && ficheOpen) await refreshFiche(tenantId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l’approbation.');
    } finally {
      setBusyId(null);
    }
  };

  const rejectRequest = async (id: string, tenantId?: string) => {
    if (!window.confirm('Rejeter cette demande d’abonnement ?')) return;
    setBusyId(`reject:${id}`);
    setError('');
    setSuccess('');
    try {
      const response = await api.post(`/admin/subscriptions/requests/${id}/reject`);
      setSuccess(response.message || 'Demande rejetée.');
      await loadOverview();
      if (tenantId && ficheOpen) await refreshFiche(tenantId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du rejet.');
    } finally {
      setBusyId(null);
    }
  };

  const markInvoicePaid = async (id: string, tenantId?: string) => {
    const reason = window.prompt('Motif pour marquer la facture payée (8 caractères min.) :');
    if (reason == null) return;
    if (reason.trim().length < 8) {
      setError('Motif obligatoire (8 caractères min.).');
      return;
    }
    setBusyId(`paid:${id}`);
    setError('');
    setSuccess('');
    try {
      const result = await api.patch(`/admin/invoices/${id}/paid`, { reason: reason.trim() });
      setSuccess(result.message || 'Facture marquée payée.');
      await loadOverview();
      if (tenantId && ficheOpen) await refreshFiche(tenantId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de marquer la facture payée.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
      </div>
    );
  }

  const counts = data?.counts;
  const pendingList = data?.pendingRequests ?? [];

  return (
    <div className="space-y-8">
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {data?.saasPayoutsDue && data.saasPayoutsDue.count > 0 && (
        <Alert variant={data.saasPayoutsDue.overdue ? 'warning' : 'info'} title={data.saasPayoutsDue.overdue ? 'Versements J+3' : 'Versements du mois précédent'}>
          {data.saasPayoutsDue.count} commercial(aux) plateforme — {formatFc(data.saasPayoutsDue.amountFc)} dû pour {data.saasPayoutsDue.periodLabel}
          {data.saasPayoutsDue.overdue ? ' (fenêtre J1–J3 dépassée).' : '.'}
          {' '}
          <Link href={`/dashboard/admin/payouts?period=${encodeURIComponent(data.saasPayoutsDue.period)}`} className="font-semibold underline">
            Ouvrir la file
          </Link>
        </Alert>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-border border border-border rounded-[var(--radius-card)] overflow-hidden">
        {[
          {
            label: 'Demandes',
            value: counts?.pendingRequests ?? 0,
            hint: 'Abonnements à traiter',
            href: '/dashboard?tab=subscription-requests',
          },
          {
            label: 'Licences J-7',
            value: counts?.licensesExpiring ?? 0,
            hint: 'Expirent dans 7 jours',
            href: '/dashboard?tab=tenants',
          },
          {
            label: 'Impayées',
            value: counts?.unpaidInvoices ?? 0,
            hint: 'Factures envoyées ou en attente',
            href: '/dashboard?tab=invoices',
          },
          {
            label: 'Nouvelles orgs',
            value: counts?.recentOrgs ?? 0,
            hint: 'Créées ces 7 derniers jours',
            href: '/dashboard?tab=tenants',
          },
          {
            label: 'Versements',
            value: data?.saasPayoutsDue?.count ?? 0,
            hint: data?.saasPayoutsDue?.overdue
              ? `J+3 — ${data.saasPayoutsDue.periodLabel}`
              : `Mois précédent (${data?.saasPayoutsDue?.period || '—'})`,
            href: `/dashboard/admin/payouts?period=${encodeURIComponent(data?.saasPayoutsDue?.period || '')}`,
            warn: Boolean(data?.saasPayoutsDue?.overdue),
          },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={cn(
              'bg-surface px-4 py-4 hover:bg-surface-muted transition',
              'warn' in stat && stat.warn ? 'bg-amber-50 dark:bg-amber-950/30' : '',
            )}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{stat.label}</p>
            <p className="text-2xl font-semibold text-foreground tracking-tight mt-1">{stat.value}</p>
            <p className="text-[11px] text-muted mt-1">{stat.hint}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
        <QueueSection
          title="Demandes d’abonnement"
          count={pendingList.length}
          href="/dashboard?tab=subscription-requests"
          empty="Aucune demande d’abonnement en attente."
        >
          {pendingList.map((req) => (
            <li key={req.id} className="py-3 px-1 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {req.tenant?.name || 'Organisation'}
                </p>
                <p className="text-xs text-muted truncate">
                  {req.requestedPlan}
                  {req.durationDays ? ` · ${req.durationDays} j` : ''}
                  {' · '}
                  {formatDate(req.createdAt)}
                  {req.proofOfPayment ? ' · preuve jointe' : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {req.tenant?.id ? (
                  <ActionBtn
                    variant="secondary"
                    onClick={() => void openFiche(req.tenant!.id)}
                    title="Ouvrir la fiche"
                  >
                    Fiche
                  </ActionBtn>
                ) : null}
                <ActionBtn
                  variant="primary"
                  loading={busyId === `approve:${req.id}`}
                  onClick={() => void approveRequest(req.id, req.tenant?.id)}
                  title="Approuver"
                >
                  <Check className="w-3.5 h-3.5" />
                  Approuver
                </ActionBtn>
                <ActionBtn
                  variant="danger"
                  loading={busyId === `reject:${req.id}`}
                  onClick={() => void rejectRequest(req.id, req.tenant?.id)}
                  title="Rejeter"
                >
                  <X className="w-3.5 h-3.5" />
                  Rejeter
                </ActionBtn>
              </div>
            </li>
          ))}
        </QueueSection>

        <QueueSection
          title="Licences bientôt expirées"
          count={data?.licensesExpiring.length ?? 0}
          href="/dashboard?tab=tenants"
          empty="Aucune licence n’expire dans les 7 jours."
        >
          {data?.licensesExpiring.map((t) => (
            <li key={t.id} className="py-3 px-1 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                onClick={() => void openFiche(t.id)}
                className="min-w-0 flex-1 text-left hover:opacity-80"
              >
                <span className="block text-sm font-medium text-foreground truncate">{t.name}</span>
                <span className="block text-xs text-muted truncate">
                  {t.plan} · {t.managerEmail} · {formatDate(t.licenseExpiresAt)}
                </span>
              </button>
              <div className="flex flex-wrap gap-2">
                <ActionBtn variant="secondary" onClick={() => void openFiche(t.id)}>
                  Fiche
                </ActionBtn>
                <ActionBtn
                  variant="primary"
                  loading={busyId === `impersonate:${t.id}`}
                  onClick={() => void openWorkspace(t.id)}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Ouvrir l’espace
                </ActionBtn>
              </div>
            </li>
          ))}
        </QueueSection>

        <QueueSection
          title="Factures impayées"
          count={data?.unpaidInvoices.length ?? 0}
          href="/dashboard?tab=invoices"
          empty="Aucune facture envoyée en attente de paiement."
        >
          {data?.unpaidInvoices.map((inv) => (
            <li key={inv.id} className="py-3 px-1 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{invoiceOrgName(inv)}</p>
                <p className="text-xs text-muted truncate">
                  {inv.invoiceNumber} · {inv.plan} · {inv.amountFormatted}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/dashboard?tab=invoices"
                  className="inline-flex items-center justify-center min-h-11 px-3 rounded-[var(--radius-button)] border border-border text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition"
                >
                  Détail
                </Link>
                <ActionBtn
                  variant="primary"
                  loading={busyId === `paid:${inv.id}`}
                  onClick={() => void markInvoicePaid(inv.id)}
                >
                  <Check className="w-3.5 h-3.5" />
                  Marquer payée
                </ActionBtn>
              </div>
            </li>
          ))}
        </QueueSection>

        <QueueSection
          title="Organisations récentes"
          count={data?.recentOrgs.length ?? 0}
          href="/dashboard?tab=tenants"
          empty="Aucune organisation créée cette semaine."
        >
          {data?.recentOrgs.map((t) => (
            <li key={t.id} className="py-3 px-1 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                onClick={() => void openFiche(t.id)}
                className="min-w-0 flex-1 text-left hover:opacity-80"
              >
                <span className="block text-sm font-medium text-foreground truncate">{t.name}</span>
                <span className="block text-xs text-muted truncate">
                  {ACCOUNT_KIND_LABELS[t.accountKind] || t.accountKind} · {t.plan} · {formatDate(t.createdAt)}
                </span>
              </button>
              <div className="flex flex-wrap gap-2">
                <ActionBtn variant="secondary" onClick={() => void openFiche(t.id)}>
                  Fiche
                </ActionBtn>
                <ActionBtn
                  variant="primary"
                  loading={busyId === `impersonate:${t.id}`}
                  onClick={() => void openWorkspace(t.id)}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Ouvrir l’espace
                </ActionBtn>
              </div>
            </li>
          ))}
        </QueueSection>

        <QueueSection
          title="Journal d’audit"
          count={data?.recentAudit.length ?? 0}
          href="/dashboard/audit"
          empty="Aucune action Super Admin enregistrée pour l’instant."
        >
          {data?.recentAudit.map((log) => (
            <li key={log.id} className="py-3 px-1">
              <p className="text-sm text-foreground leading-snug">{log.summary}</p>
              <p className="text-xs text-muted mt-0.5">
                {log.actorEmail} · {formatDateTime(log.createdAt)}
              </p>
            </li>
          ))}
        </QueueSection>
      </div>

      <Modal
        open={ficheOpen}
        onClose={() => setFicheOpen(false)}
        title={
          <span className="inline-flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            {fiche?.tenant.name || 'Organisation'}
          </span>
        }
        description="Fiche support : forfait, équipe, factures et journal."
        size="xl"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setFicheOpen(false)}>
              Fermer
            </Button>
            {fiche?.canImpersonate && (
              <Button
                type="button"
                size="sm"
                loading={busyId === `impersonate:${fiche.tenant.id}`}
                leftIcon={<LogIn className="w-4 h-4" />}
                onClick={() => void openWorkspace(fiche.tenant.id)}
              >
                Ouvrir l’espace
              </Button>
            )}
          </div>
        }
      >
        {ficheLoading || !fiche ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={fiche.tenant.plan === 'FREE' ? 'slate' : 'primary'}>{fiche.tenant.plan}</StatusPill>
              <StatusPill tone={fiche.tenant.licenseActive ? 'emerald' : 'rose'}>
                {fiche.tenant.licenseActive ? 'Licence active' : 'Licence désactivée'}
              </StatusPill>
              <span className="text-xs text-muted">
                {ACCOUNT_KIND_LABELS[fiche.tenant.accountKind] || fiche.tenant.accountKind}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { label: 'Membres', value: fiche.counts.users, icon: Users },
                { label: 'Événements', value: fiche.counts.events, icon: Clock },
                { label: 'Salles', value: fiche.counts.rooms, icon: Building2 },
                { label: 'Annonces salles', value: fiche.counts.venueListings, icon: FileText },
                { label: 'Prestations', value: fiche.counts.serviceOfferings, icon: CreditCard },
              ].map((item) => (
                <div key={item.label} className="border border-border px-3 py-2.5 text-center rounded-[var(--radius-card)]">
                  <item.icon className="w-3.5 h-3.5 text-muted mx-auto mb-1" />
                  <div className="text-lg font-semibold text-foreground">{item.value}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted">{item.label}</div>
                </div>
              ))}
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Gérant</h4>
              <p className="text-sm text-foreground">
                {fiche.tenant.manager?.name || fiche.tenant.managerName} · {fiche.tenant.manager?.email || fiche.tenant.managerEmail}
              </p>
              <p className="text-xs text-muted mt-1">
                Expiration licence : {formatDate(fiche.tenant.licenseExpiresAt)}
              </p>
            </div>

            {fiche.pendingRequests.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Demandes en attente</h4>
                {fiche.pendingRequests.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-[var(--radius-card)] border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-3 py-2.5"
                  >
                    <p className="text-sm text-foreground flex-1 min-w-0">
                      {r.requestedPlan}
                      {r.durationDays ? ` · ${r.durationDays} j` : ''}
                      {' · '}
                      {formatDate(r.createdAt)}
                    </p>
                    <div className="flex gap-2">
                      <ActionBtn
                        variant="primary"
                        loading={busyId === `approve:${r.id}`}
                        onClick={() => void approveRequest(r.id, fiche.tenant.id)}
                      >
                        Approuver
                      </ActionBtn>
                      <ActionBtn
                        variant="danger"
                        loading={busyId === `reject:${r.id}`}
                        onClick={() => void rejectRequest(r.id, fiche.tenant.id)}
                      >
                        Rejeter
                      </ActionBtn>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {fiche.invoices.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Dernières factures</h4>
                <ul className="text-sm space-y-2">
                  {fiche.invoices.map((inv) => {
                    const unpaid = inv.status === 'SENT' || inv.status === 'PENDING';
                    return (
                      <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-muted truncate">
                          {inv.invoiceNumber}
                          {' · '}
                          <span className={unpaid ? 'text-amber-700 dark:text-amber-300' : 'text-foreground'}>
                            {inv.amountFormatted}
                          </span>
                        </span>
                        {unpaid ? (
                          <ActionBtn
                            variant="primary"
                            loading={busyId === `paid:${inv.id}`}
                            onClick={() => void markInvoicePaid(inv.id, fiche.tenant.id)}
                          >
                            Marquer payée
                          </ActionBtn>
                        ) : (
                          <StatusPill tone="emerald">{inv.statusLabel || 'Payée'}</StatusPill>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {fiche.audit.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Audit</h4>
                <ul className="space-y-2">
                  {fiche.audit.map((log) => (
                    <li key={log.id} className="text-xs text-muted">
                      <span className="text-foreground">{log.summary}</span>
                      {' · '}
                      {formatDateTime(log.createdAt)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!fiche.canImpersonate && (
              <p className="text-xs text-muted inline-flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                Aucun compte utilisateur à impersonner sur cette organisation.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
