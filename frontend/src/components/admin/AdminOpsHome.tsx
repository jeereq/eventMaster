'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle, BarChart3, Building2, Check, CheckCircle2, ChevronRight, Clock, CreditCard, FileText, Heart, Key, Loader2,
  LogIn, ScrollText, ShieldAlert, Store, Ticket, Users, Wallet, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Alert, Button, ConfirmDialog, Modal, StatusPill } from '@/components/ui';
import { notifyAdminCountsChanged } from '@/components/admin/useAdminPendingCounts';
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
    donationsPaid?: number;
  };
  donationsSummary?: {
    count: number;
    amountFc: number;
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
  guestUsage?: {
    periodGuests: number;
    totalHistoricalGuests: number;
    maxGuests: number;
    periodStart: string | null;
    periodEnd: string | null;
    isPaidPlan: boolean;
    periodLabel: string;
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

/** Lignes affichées par file sur l’accueil ; « Voir tout » ouvre la liste complète. */
const QUEUE_PREVIEW = 5;

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
  icon: Icon,
  count,
  href,
  empty,
  actionable = false,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  href: string;
  empty: string;
  /** La file demande une action : le compteur passe en orange s’il n’est pas vide. */
  actionable?: boolean;
  children: React.ReactNode;
}) {
  const needsAction = actionable && count > 0;
  return (
    <section className="bg-surface border border-border rounded-[var(--radius-card)] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-border">
        <h3 className="flex items-center gap-2.5 min-w-0 text-sm font-semibold text-foreground tracking-tight">
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
              needsAction ? 'bg-festive-accent-soft text-festive-accent' : 'bg-primary/10 text-primary',
            )}
          >
            <Icon className="w-4 h-4" />
          </span>
          <span className="truncate">{title}</span>
          <span
            className={cn(
              'min-w-[22px] h-[22px] px-1.5 inline-flex items-center justify-center rounded-full text-[11px] font-bold tabular-nums',
              needsAction ? 'bg-festive-accent text-white' : 'bg-surface-muted text-muted',
            )}
          >
            {count}
          </span>
        </h3>
        <Link
          href={href}
          className="shrink-0 inline-flex items-center gap-0.5 min-h-11 -my-2 px-1 text-xs font-semibold text-primary hover:underline"
        >
          Voir tout
          <ChevronRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      </div>
      {count === 0 ? (
        <p className="flex items-center gap-2 px-4 sm:px-5 py-4 text-sm text-muted">
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" aria-hidden />
          {empty}
        </p>
      ) : (
        <ul className="divide-y divide-border">{children}</ul>
      )}
    </section>
  );
}

/** Zone cliquable d’une ligne de file : ouvre la fiche de l’organisation. */
function RowMain({
  title,
  meta,
  onClick,
}: {
  title: string;
  meta: React.ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="block text-sm font-medium text-foreground truncate">{title}</span>
      <span className="block text-xs text-muted truncate mt-0.5">{meta}</span>
    </>
  );
  if (!onClick) return <div className="min-w-0 flex-1">{content}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      title="Ouvrir la fiche"
      className="group min-w-0 flex-1 flex items-center gap-2 text-left rounded-lg -mx-1 px-1 py-1 hover:bg-surface-muted/60 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <span className="min-w-0 flex-1">{content}</span>
      <ChevronRight className="w-4 h-4 text-muted shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" aria-hidden />
    </button>
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
      className="min-h-11 shrink-0 flex-1 sm:flex-initial text-xs"
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
  const [rejectTarget, setRejectTarget] = useState<{ id: string; tenantId?: string; label: string } | null>(null);
  const [paidTarget, setPaidTarget] = useState<{ id: string; tenantId?: string; label: string } | null>(null);
  const [paidReason, setPaidReason] = useState('');
  const [paidReasonError, setPaidReasonError] = useState('');

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
      // Retrait optimiste immédiat de la file d'attente
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pendingRequests: (prev.pendingRequests || []).filter((r) => r.id !== id),
          counts: {
            ...prev.counts,
            pendingRequests: Math.max(0, (prev.counts.pendingRequests || 0) - 1),
          },
        };
      });
      setFiche((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pendingRequests: prev.pendingRequests.filter((r) => r.id !== id),
        };
      });

      const response = await api.post(`/admin/subscriptions/requests/${id}/approve`, {
        discountPercent: 0,
      });
      setSuccess(response.message || 'Demande d’abonnement approuvée avec succès !');
      notifyAdminCountsChanged();
      await loadOverview();
      if (tenantId && ficheOpen) await refreshFiche(tenantId);
    } catch (err: unknown) {
      await loadOverview();
      setError(err instanceof Error ? err.message : 'Erreur lors de l’approbation.');
    } finally {
      setBusyId(null);
    }
  };

  const rejectRequest = async (id: string, tenantId?: string) => {
    setRejectTarget(null);
    setBusyId(`reject:${id}`);
    setError('');
    setSuccess('');
    try {
      // Retrait optimiste immédiat
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pendingRequests: (prev.pendingRequests || []).filter((r) => r.id !== id),
          counts: {
            ...prev.counts,
            pendingRequests: Math.max(0, (prev.counts.pendingRequests || 0) - 1),
          },
        };
      });
      setFiche((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pendingRequests: prev.pendingRequests.filter((r) => r.id !== id),
        };
      });

      const response = await api.post(`/admin/subscriptions/requests/${id}/reject`);
      setSuccess(response.message || 'Demande d’abonnement rejetée.');
      notifyAdminCountsChanged();
      await loadOverview();
      if (tenantId && ficheOpen) await refreshFiche(tenantId);
    } catch (err: unknown) {
      await loadOverview();
      setError(err instanceof Error ? err.message : 'Erreur lors du rejet.');
    } finally {
      setBusyId(null);
    }
  };

  const askMarkInvoicePaid = (id: string, label: string, tenantId?: string) => {
    setPaidReason('');
    setPaidReasonError('');
    setPaidTarget({ id, tenantId, label });
  };

  const markInvoicePaid = async () => {
    if (!paidTarget) return;
    const { id, tenantId } = paidTarget;
    const reason = paidReason.trim();
    if (reason.length < 8) {
      setPaidReasonError('Motif obligatoire (8 caractères min.).');
      return;
    }
    setBusyId(`paid:${id}`);
    setError('');
    setSuccess('');
    try {
      const result = await api.patch(`/admin/invoices/${id}/paid`, { reason });
      setPaidTarget(null);
      setSuccess(result.message || 'Facture marquée payée.');
      notifyAdminCountsChanged();
      await loadOverview();
      if (tenantId && ficheOpen) await refreshFiche(tenantId);
    } catch (err: unknown) {
      setPaidReasonError(err instanceof Error ? err.message : 'Impossible de marquer la facture payée.');
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
  const payoutsDue = data?.saasPayoutsDue?.count ?? 0;
  const todoTotal =
    (counts?.pendingRequests ?? 0) +
    (counts?.licensesExpiring ?? 0) +
    (counts?.unpaidInvoices ?? 0) +
    payoutsDue;

  const stats: Array<{
    label: string;
    value: number;
    hint: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    actionable?: boolean;
    warn?: boolean;
  }> = [
    {
      label: 'Demandes',
      value: counts?.pendingRequests ?? 0,
      hint: 'Abonnements à traiter',
      href: '/dashboard?tab=subscription-requests',
      icon: Clock,
      actionable: true,
    },
    {
      label: 'Licences J-7',
      value: counts?.licensesExpiring ?? 0,
      hint: 'Expirent dans 7 jours',
      href: '/dashboard?tab=tenants',
      icon: ShieldAlert,
      actionable: true,
    },
    {
      label: 'Impayées',
      value: counts?.unpaidInvoices ?? 0,
      hint: 'Factures envoyées ou en attente',
      href: '/dashboard?tab=invoices',
      icon: FileText,
      actionable: true,
    },
    {
      label: 'Versements',
      value: payoutsDue,
      hint: data?.saasPayoutsDue?.overdue
        ? `En retard · ${data.saasPayoutsDue.periodLabel}`
        : `Mois précédent (${data?.saasPayoutsDue?.period || '—'})`,
      href: `/dashboard/admin/payouts?period=${encodeURIComponent(data?.saasPayoutsDue?.period || '')}`,
      icon: Wallet,
      actionable: true,
      warn: Boolean(data?.saasPayoutsDue?.overdue),
    },
    {
      label: 'Nouvelles orgs',
      value: counts?.recentOrgs ?? 0,
      hint: 'Créées ces 7 derniers jours',
      href: '/dashboard?tab=tenants',
      icon: Building2,
    },
    {
      label: 'Dons solidaires',
      value: data?.donationsSummary?.count ?? 0,
      hint: data?.donationsSummary?.amountFc ? `${formatFc(data.donationsSummary.amountFc)} récoltés` : 'Collectes de fonds',
      href: '/dashboard/admin/donations',
      icon: Heart,
    },
  ];

  const queues: Array<{ key: string; count: number; node: React.ReactNode }> = [
    {
      key: 'requests',
      count: pendingList.length,
      node: (
        <QueueSection
          title="Demandes d’abonnement"
          icon={Clock}
          count={pendingList.length}
          href="/dashboard?tab=subscription-requests"
          empty="Aucune demande en attente."
          actionable
        >
          {pendingList.slice(0, QUEUE_PREVIEW).map((req) => (
            <li key={req.id} className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
              <RowMain
                title={req.tenant?.name || 'Organisation'}
                meta={
                  <>
                    {req.requestedPlan}
                    {req.durationDays ? ` · ${req.durationDays} j` : ''}
                    {' · '}
                    {formatDate(req.createdAt)}
                    {req.proofOfPayment ? ' · preuve jointe' : ''}
                  </>
                }
                onClick={req.tenant?.id ? () => void openFiche(req.tenant!.id) : undefined}
              />
              <div className="flex gap-2">
                <ActionBtn
                  variant="secondary"
                  loading={busyId === `reject:${req.id}`}
                  onClick={() => setRejectTarget({ id: req.id, tenantId: req.tenant?.id, label: req.tenant?.name || 'cette organisation' })}
                  title="Rejeter"
                >
                  <X className="w-3.5 h-3.5 text-danger" />
                  Rejeter
                </ActionBtn>
                <ActionBtn
                  variant="primary"
                  loading={busyId === `approve:${req.id}`}
                  onClick={() => void approveRequest(req.id, req.tenant?.id)}
                  title="Approuver"
                >
                  <Check className="w-3.5 h-3.5" />
                  Approuver
                </ActionBtn>
              </div>
            </li>
          ))}
        </QueueSection>
      ),
    },
    {
      key: 'invoices',
      count: data?.unpaidInvoices.length ?? 0,
      node: (
        <QueueSection
          title="Factures impayées"
          icon={FileText}
          count={data?.unpaidInvoices.length ?? 0}
          href="/dashboard?tab=invoices"
          empty="Aucune facture en attente de paiement."
          actionable
        >
          {data?.unpaidInvoices.slice(0, QUEUE_PREVIEW).map((inv) => (
            <li key={inv.id} className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
              <RowMain
                title={invoiceOrgName(inv)}
                meta={`${inv.invoiceNumber} · ${inv.plan} · ${inv.amountFormatted}`}
              />
              <div className="flex gap-2">
                <Link
                  href="/dashboard?tab=invoices"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center min-h-11 px-3 rounded-[var(--radius-button)] border border-border text-xs font-semibold text-foreground hover:bg-surface-muted transition"
                >
                  Détail
                </Link>
                <ActionBtn
                  variant="primary"
                  loading={busyId === `paid:${inv.id}`}
                  onClick={() => askMarkInvoicePaid(inv.id, `${inv.invoiceNumber} · ${invoiceOrgName(inv)}`)}
                >
                  <Check className="w-3.5 h-3.5" />
                  Marquer payée
                </ActionBtn>
              </div>
            </li>
          ))}
        </QueueSection>
      ),
    },
    {
      key: 'licences',
      count: data?.licensesExpiring.length ?? 0,
      node: (
        <QueueSection
          title="Licences bientôt expirées"
          icon={ShieldAlert}
          count={data?.licensesExpiring.length ?? 0}
          href="/dashboard?tab=tenants"
          empty="Aucune licence n’expire dans les 7 jours."
          actionable
        >
          {data?.licensesExpiring.slice(0, QUEUE_PREVIEW).map((t) => (
            <li key={t.id} className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
              <RowMain
                title={t.name}
                meta={`${t.plan} · expire le ${formatDate(t.licenseExpiresAt)} · ${t.managerEmail}`}
                onClick={() => void openFiche(t.id)}
              />
              <ActionBtn
                variant="secondary"
                loading={busyId === `impersonate:${t.id}`}
                onClick={() => void openWorkspace(t.id)}
              >
                <LogIn className="w-3.5 h-3.5" />
                Ouvrir l’espace
              </ActionBtn>
            </li>
          ))}
        </QueueSection>
      ),
    },
    {
      key: 'recent',
      count: data?.recentOrgs.length ?? 0,
      node: (
        <QueueSection
          title="Organisations récentes"
          icon={Building2}
          count={data?.recentOrgs.length ?? 0}
          href="/dashboard?tab=tenants"
          empty="Aucune organisation créée cette semaine."
        >
          {data?.recentOrgs.slice(0, QUEUE_PREVIEW).map((t) => (
            <li key={t.id} className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
              <RowMain
                title={t.name}
                meta={`${ACCOUNT_KIND_LABELS[t.accountKind] || t.accountKind} · ${t.plan} · ${formatDate(t.createdAt)}`}
                onClick={() => void openFiche(t.id)}
              />
              <ActionBtn
                variant="secondary"
                loading={busyId === `impersonate:${t.id}`}
                onClick={() => void openWorkspace(t.id)}
              >
                <LogIn className="w-3.5 h-3.5" />
                Ouvrir l’espace
              </ActionBtn>
            </li>
          ))}
        </QueueSection>
      ),
    },
  ];
  // Les files qui attendent une action remontent en premier.
  const orderedQueues = [...queues].sort((a, b) => Number(b.count > 0) - Number(a.count > 0));

  const shortcuts = [
    { label: 'Organisations', href: '/dashboard?tab=tenants', icon: Building2 },
    { label: 'Utilisateurs', href: '/dashboard?tab=users', icon: Users },
    { label: 'Paiements', href: '/dashboard/admin/payments', icon: CreditCard },
    { label: 'Catalogue', href: '/dashboard/admin/catalogue', icon: Store },
    { label: 'Analyses', href: '/dashboard?tab=analytics&section=overview', icon: BarChart3 },
    { label: 'Modèles', href: '/dashboard?tab=templates', icon: FileText },
    { label: 'Réglages', href: '/dashboard?tab=settings', icon: Key },
    { label: 'Journal', href: '/dashboard/audit', icon: ScrollText },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {error && (
        <Alert variant="error" className="flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="text-xs font-semibold underline ml-2 cursor-pointer">
            Fermer
          </button>
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="flex items-center justify-between">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess('')} className="text-xs font-semibold underline ml-2 cursor-pointer">
            Fermer
          </button>
        </Alert>
      )}

      <div
        role="status"
        className={cn(
          'flex items-center gap-3 rounded-[var(--radius-card)] border px-4 py-3',
          todoTotal > 0
            ? 'border-festive-accent/30 bg-festive-accent-soft'
            : 'border-primary/20 bg-primary/5',
        )}
      >
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            todoTotal > 0 ? 'bg-festive-accent text-white' : 'bg-primary text-primary-foreground',
          )}
        >
          {todoTotal > 0 ? <AlertCircle className="w-4.5 h-4.5" /> : <CheckCircle2 className="w-4.5 h-4.5" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {todoTotal > 0
              ? `${todoTotal} action${todoTotal > 1 ? 's' : ''} en attente`
              : 'Tout est à jour'}
          </p>
          <p className="text-xs text-muted">
            {todoTotal > 0
              ? 'Demandes, licences, factures et versements sont listés ci-dessous, les plus urgents en premier.'
              : 'Aucune demande, licence, facture ni versement à traiter pour le moment.'}
          </p>
        </div>
      </div>

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

      <div className="grid grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
        {stats.map((stat) => {
          const StatIcon = stat.icon;
          const attention = Boolean(stat.actionable && stat.value > 0);
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className={cn(
                'group min-w-0 rounded-[var(--radius-card)] border px-3 py-2.5 sm:px-4 sm:py-3.5 transition hover:shadow-[var(--shadow-soft)]',
                stat.warn
                  ? 'border-amber-300 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-950/30'
                  : attention
                    ? 'border-festive-accent/30 bg-surface hover:border-festive-accent/60'
                    : 'border-border bg-surface hover:border-primary/30',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold sm:uppercase sm:tracking-wider text-muted truncate">{stat.label}</p>
                <span
                  className={cn(
                    'hidden sm:flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                    attention || stat.warn ? 'bg-festive-accent-soft text-festive-accent' : 'bg-primary/10 text-primary',
                  )}
                >
                  <StatIcon className="w-3.5 h-3.5" />
                </span>
              </div>
              <p
                className={cn(
                  'text-xl sm:text-2xl font-semibold tracking-tight mt-0.5 sm:mt-1 tabular-nums',
                  stat.actionable && stat.value === 0 ? 'text-muted' : 'text-foreground',
                )}
              >
                {stat.value.toLocaleString('fr-FR')}
              </p>
              <p className="hidden sm:block text-[11px] text-muted mt-0.5 line-clamp-1">{stat.hint}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-5 items-start">
        {orderedQueues.map((q) => (
          <React.Fragment key={q.key}>{q.node}</React.Fragment>
        ))}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 sm:gap-5 items-start">
        <QueueSection
          title="Journal d’audit"
          icon={ScrollText}
          count={data?.recentAudit.length ?? 0}
          href="/dashboard/audit"
          empty="Aucune action Super Admin enregistrée pour l’instant."
        >
          {data?.recentAudit.slice(0, QUEUE_PREVIEW).map((log) => (
            <li key={log.id} className="px-4 sm:px-5 py-3">
              <p className="text-sm text-foreground leading-snug">{log.summary}</p>
              <p className="text-xs text-muted mt-0.5">
                {log.actorEmail} · {formatDateTime(log.createdAt)}
              </p>
            </li>
          ))}
        </QueueSection>

        <section className="bg-surface border border-border rounded-[var(--radius-card)] p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground tracking-tight mb-3">Accès rapide</h3>
          <div className="grid grid-cols-4 gap-2">
            {shortcuts.map((sc) => {
              const ScIcon = sc.icon;
              return (
                <Link
                  key={sc.label}
                  href={sc.href}
                  className="flex flex-col items-center justify-center gap-1.5 min-h-[72px] rounded-xl border border-border bg-surface px-1 py-2 text-center hover:border-primary/30 hover:bg-primary/5 transition touch-manipulation"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ScIcon className="w-4 h-4" />
                  </span>
                  <span className="text-[11px] font-medium text-foreground leading-tight truncate max-w-full">{sc.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
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
          <div className="flex w-full flex-col-reverse sm:flex-row justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" className="w-full sm:w-auto min-h-11" onClick={() => setFicheOpen(false)}>
              Fermer
            </Button>
            {fiche?.canImpersonate && (
              <Button
                type="button"
                size="sm"
                className="w-full sm:w-auto min-h-11"
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

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {[
                { label: 'Membres', value: fiche.counts.users, icon: Users },
                { label: 'Événements', value: fiche.counts.events, icon: Clock },
                {
                  label: 'Invités (période)',
                  value: fiche.guestUsage
                    ? `${fiche.guestUsage.periodGuests}/${fiche.guestUsage.maxGuests >= 9999 ? '∞' : fiche.guestUsage.maxGuests}`
                    : '—',
                  icon: Ticket,
                },
                { label: 'Salles', value: fiche.counts.rooms, icon: Building2 },
                { label: 'Annonces salles', value: fiche.counts.venueListings, icon: FileText },
                { label: 'Prestations', value: fiche.counts.serviceOfferings, icon: CreditCard },
              ].map((item) => (
                <div key={item.label} className="border border-border px-3 py-2.5 text-center rounded-[var(--radius-card)]">
                  <item.icon className="w-3.5 h-3.5 text-muted mx-auto mb-1" />
                  <div className="text-base sm:text-lg font-semibold text-foreground truncate">{item.value}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted truncate">{item.label}</div>
                </div>
              ))}
            </div>

            {fiche.guestUsage && (
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 text-xs text-foreground flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-primary">Règle de comptage des invitations & invités</p>
                  <p className="text-muted leading-relaxed">
                    Le quota d’invitations est calculé exclusivement sur la période active ({fiche.guestUsage.periodLabel}). Les invités des cycles précédents ({fiche.guestUsage.totalHistoricalGuests} au total dans l’historique) ne bloquent pas le renouvellement du quota pour le cycle en cours.
                  </p>
                </div>
              </div>
            )}

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
                    className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-[var(--radius-card)] border border-border bg-surface-muted/50 px-3 py-2.5"
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
                        onClick={() => setRejectTarget({ id: r.id, tenantId: fiche.tenant.id, label: fiche.tenant.name })}
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
                            onClick={() => askMarkInvoicePaid(inv.id, `${inv.invoiceNumber} · ${fiche.tenant.name}`, fiche.tenant.id)}
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

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        onConfirm={() => {
          if (rejectTarget) void rejectRequest(rejectTarget.id, rejectTarget.tenantId);
        }}
        title="Rejeter la demande ?"
        description={`La demande d’abonnement de ${rejectTarget?.label || 'cette organisation'} sera refusée. L’organisation garde son forfait actuel.`}
        confirmLabel="Rejeter la demande"
        tone="danger"
      />

      <Modal
        open={Boolean(paidTarget)}
        onClose={() => (busyId?.startsWith('paid:') ? undefined : setPaidTarget(null))}
        title="Marquer la facture payée"
        description={paidTarget?.label}
        size="sm"
        footer={
          <div className="flex w-full flex-col-reverse sm:flex-row justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" className="min-h-11" onClick={() => setPaidTarget(null)}>
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              className="min-h-11"
              loading={Boolean(paidTarget && busyId === `paid:${paidTarget.id}`)}
              leftIcon={<Check className="w-4 h-4" />}
              onClick={() => void markInvoicePaid()}
            >
              Confirmer le paiement
            </Button>
          </div>
        }
      >
        <label htmlFor="ops-paid-reason" className="block text-sm font-medium text-foreground mb-1.5">
          Motif (visible dans le journal d’audit)
        </label>
        <textarea
          id="ops-paid-reason"
          rows={3}
          value={paidReason}
          onChange={(e) => {
            setPaidReason(e.target.value);
            if (paidReasonError) setPaidReasonError('');
          }}
          placeholder="Ex. virement reçu le 24/09, réf. 4521"
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
        />
        <p className={cn('mt-1.5 text-xs', paidReasonError ? 'text-danger' : 'text-muted')}>
          {paidReasonError || '8 caractères minimum.'}
        </p>
      </Modal>
    </div>
  );
}
