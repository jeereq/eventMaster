'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, Loader2, Wallet, Eye, Ticket, HeartHandshake, CheckCircle2, Clock, ShieldCheck, Building2, Calendar, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/cn';
import {
  PageHeader, Breadcrumbs, Alert, EmptyState, Pagination, Button, Modal, usePageSize,
  ViewModeToggle, useViewMode, ProjectCard, StatusPill, listStackClass,
} from '@/components/ui';
import CatalogueFilterBar, {
  CatalogueChoicePills,
  CatalogueFilterField,
  type CatalogueFilterChip,
} from '@/components/CatalogueFilterBar';
import { formatFc } from '@/config/landingPricing';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { commercialPercent, renewalPercent } from '@/lib/platformRates';
import { uploadImageFile } from '@/lib/cloudinaryUpload';

interface EventPayoutRow {
  eventId: string;
  eventTitle: string;
  eventSlug: string | null;
  eventDate: string;
  tenantId: string;
  tenantName: string;
  managerName: string | null;
  managerEmail: string | null;
  managerPhone: string | null;

  ticketingOrdersCount: number;
  ticketingGrossFc: number;
  ticketingRetentionRatePercent: number;
  ticketingRetentionFc: number;
  ticketingNetFc: number;

  donationsOrdersCount: number;
  donationsGrossFc: number;
  donationsRetentionRatePercent: number;
  donationsRetentionFc: number;
  donationsNetFc: number;

  totalGrossFc: number;
  totalRetentionFc: number;
  totalNetPayoutFc: number;

  payoutStatus: 'DUE' | 'PAID' | 'PARTIAL' | 'NONE';
  settledAt: string | null;
  settledBy: string | null;
  settledAmountFc: number | null;
  proofUrl: string | null;
  notes: string | null;
  paymentMethod: string | null;
}

interface EventPayoutsResponse {
  generatedAt: string;
  kpis: {
    totalEventsWithRevenue: number;
    totalGrossCollectedFc: number;
    totalPlatformRetentionFc: number;
    totalNetPayoutDueFc: number;
    totalNetPayoutPaidFc: number;
    eventsDueCount: number;
    eventsPaidCount: number;
  };
  events: EventPayoutRow[];
}

interface PayoutRow {
  commercialId: string;
  name: string | null;
  email: string;
  referralCode: string | null;
  period: string;
  orgCount: number;
  orgNames: string[];
  totalInvoiceAmount: number;
  totalCommission: number;
  unpaidCommission: number;
  paidCommission: number;
  paidAt: string | null;
  payoutProofUrl: string | null;
  payoutNote: string | null;
}

interface PayoutsResponse {
  items: PayoutRow[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  defaultPeriod: string;
  sums: { dueCount: number; dueFc: number; paidCount: number; paidFc: number };
}

function previousPeriod(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function AdminSaasPayoutsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { site } = usePlatformSite();
  const firstPct = commercialPercent(site);
  const renewPct = renewalPercent(site);

  const [period, setPeriod] = useState(previousPeriod());
  const [settlement, setSettlement] = useState<'due' | 'paid' | 'all'>('due');
  const [proof, setProof] = useState<'all' | 'yes' | 'no'>('all');
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('admin-saas-payouts', 20);
  const {
    mode: layout,
    setViewMode,
    columns,
    setGridColumns,
    gridClassName,
  } = useViewMode('em-view-admin-payouts', 'list', 3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<PayoutsResponse | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [modal, setModal] = useState<{ row: PayoutRow; settle: boolean } | null>(null);
  const [flexModal, setFlexModal] = useState<PayoutRow | null>(null);
  const [flexPhone, setFlexPhone] = useState('');
  const [pendingTransferId, setPendingTransferId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  // ─── État des reversements d'événements (Billetterie & Dons) ───
  const [payoutTab, setPayoutTab] = useState<'saas' | 'events'>('saas');
  const [eventPayoutsData, setEventPayoutsData] = useState<EventPayoutsResponse | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventPayoutStatusFilter, setEventPayoutStatusFilter] = useState<'all' | 'due' | 'paid'>('all');
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [settleEventModal, setSettleEventModal] = useState<EventPayoutRow | null>(null);
  const [settleAmountFc, setSettleAmountFc] = useState('');
  const [settleProofUrl, setSettleProofUrl] = useState('');
  const [settleNotes, setSettleNotes] = useState('');
  const [settlePaymentMethod, setSettlePaymentMethod] = useState('Virement Bancaire');
  const [settlingEvent, setSettlingEvent] = useState(false);
  const [eventProofUploading, setEventProofUploading] = useState(false);

  const loadEventPayouts = useCallback(async () => {
    if (user?.role !== 'SUPER_ADMIN') return;
    setLoadingEvents(true);
    try {
      const params = new URLSearchParams();
      if (eventPayoutStatusFilter !== 'all') params.set('status', eventPayoutStatusFilter);
      if (eventSearchQuery.trim()) params.set('q', eventSearchQuery.trim());
      const res = await api.get(`/admin/reports/event-payouts?${params}`);
      setEventPayoutsData(res);
    } catch (err: unknown) {
      console.error('Erreur chargement reversements événements:', err);
    } finally {
      setLoadingEvents(false);
    }
  }, [user?.role, eventPayoutStatusFilter, eventSearchQuery]);

  useEffect(() => {
    if (payoutTab === 'events') {
      void loadEventPayouts();
    }
  }, [payoutTab, loadEventPayouts]);

  const exportEventPayoutsCsv = async () => {
    const params = new URLSearchParams();
    if (eventPayoutStatusFilter !== 'all') params.set('status', eventPayoutStatusFilter);
    if (eventSearchQuery.trim()) params.set('q', eventSearchQuery.trim());
    await api.download(`/admin/reports/event-payouts/export?${params}`, 'reversements-evenements.csv');
  };

  const handleSettleEventPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleEventModal) return;
    setSettlingEvent(true);
    try {
      await api.post(`/admin/reports/event-payouts/${settleEventModal.eventId}/settle`, {
        status: 'PAID',
        settledAmountFc: settleAmountFc ? parseInt(settleAmountFc, 10) : settleEventModal.totalNetPayoutFc,
        proofUrl: settleProofUrl || undefined,
        notes: settleNotes || undefined,
        paymentMethod: settlePaymentMethod,
      });
      setSettleEventModal(null);
      await loadEventPayouts();
    } catch (err: any) {
      alert(err.message || 'Erreur lors du versement.');
    } finally {
      setSettlingEvent(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (user.role !== 'SUPER_ADMIN') router.replace('/dashboard');
  }, [authLoading, user, router]);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const p = sp.get('period');
    const qq = sp.get('q');
    if (p && /^\d{4}-\d{2}$/.test(p)) setPeriod(p);
    if (qq) {
      setQInput(qq);
      setQ(qq);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [qInput]);

  const load = useCallback(async () => {
    if (user?.role !== 'SUPER_ADMIN') return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      params.set('settlement', settlement);
      if (proof !== 'all') params.set('proof', proof);
      if (period) params.set('period', period);
      if (q) params.set('q', q);
      setData(await api.get(`/admin/payouts?${params}`));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les versements.');
    } finally {
      setLoading(false);
    }
  }, [user?.role, page, pageSize, settlement, period, q, proof]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = async () => {
    const params = new URLSearchParams();
    params.set('export', 'csv');
    params.set('settlement', settlement);
    params.set('limit', '100');
    if (proof !== 'all') params.set('proof', proof);
    if (period) params.set('period', period);
    if (q) params.set('q', q);
    await api.download(`/admin/payouts?${params}`, 'versements-saas.csv');
  };

  const openSettle = (row: PayoutRow, settle: boolean) => {
    setModal({ row, settle });
    setReason('');
    setProofUrl(row.payoutProofUrl || '');
  };

  const submitModal = async () => {
    if (!modal) return;
    if (reason.trim().length < 8) {
      alert('Motif obligatoire (8 caractères minimum).');
      return;
    }
    if (modal.settle && proofUrl.trim().length < 8) {
      alert('Référence ou URL de preuve obligatoire (8 caractères min.).');
      return;
    }
    const key = `${modal.row.commercialId}:${modal.row.period}`;
    setBusyKey(key);
    try {
      await api.patch('/admin/payouts', {
        commercialId: modal.row.commercialId,
        period: modal.row.period,
        settled: modal.settle,
        reason: reason.trim(),
        proofUrl: proofUrl.trim() || undefined,
      });
      setModal(null);
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Mise à jour impossible.');
    } finally {
      setBusyKey(null);
    }
  };

  const onProofFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadImageFile(file);
      setProofUrl(uploaded.url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Upload impossible.');
    } finally {
      setUploading(false);
    }
  };

  const openFlexPay = (row: PayoutRow) => {
    setFlexModal(row);
    setFlexPhone('');
    setPendingTransferId(null);
  };

  const submitFlexPay = async () => {
    if (!flexModal) return;
    const key = `flex:${flexModal.commercialId}:${flexModal.period}`;
    setBusyKey(key);
    try {
      const data = await api.post('/admin/payouts/flexpay', {
        commercialId: flexModal.commercialId,
        period: flexModal.period,
        phone: flexPhone.trim() || undefined,
      });
      setPendingTransferId(data.transferId || null);
      alert(data.message || 'Versement FlexPay initié. Confirmez sur le téléphone du commercial.');
      if (data.transferId) {
        // Poll rapide une fois
        try {
          const verified = await api.get(`/admin/payouts/flexpay/${data.transferId}/verify`);
          if (verified.paid) {
            setFlexModal(null);
            await load();
            return;
          }
        } catch {
          /* ignore */
        }
      }
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Versement FlexPay impossible.');
    } finally {
      setBusyKey(null);
    }
  };

  const verifyPendingFlex = async () => {
    if (!pendingTransferId) return;
    setBusyKey(`verify:${pendingTransferId}`);
    try {
      const verified = await api.get(`/admin/payouts/flexpay/${pendingTransferId}/verify`);
      if (verified.paid) {
        setFlexModal(null);
        setPendingTransferId(null);
        await load();
        alert('Versement confirmé.');
      } else {
        alert(
          verified.status === 'FAILED'
            ? 'Le versement a échoué. Vous pouvez réessayer.'
            : 'Toujours en attente de confirmation FlexPay…',
        );
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Vérification impossible.');
    } finally {
      setBusyKey(null);
    }
  };

  if (authLoading || user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const chips: CatalogueFilterChip[] = [
    ...(settlement !== 'all'
      ? [{ id: 'settlement', label: 'Statut', value: settlement === 'due' ? 'Dues' : 'Versées' }]
      : []),
    ...(proof !== 'all'
      ? [{ id: 'proof', label: 'Preuve', value: proof === 'yes' ? 'Avec preuve' : 'Sans preuve' }]
      : []),
    ...(period
      ? [{ id: 'period', label: 'Période', value: period }]
      : []),
  ];

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title={payoutTab === 'saas' ? "Versements SaaS" : "Reversements Événements (Billetterie & Dons)"}
        description={
          payoutTab === 'saas'
            ? `Commissions commerciaux : ${firstPct} % puis ${renewPct} %.`
            : 'Recettes billets et dons, après retenue.'
        }
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Accueil', href: '/dashboard?tab=overview' },
              { label: payoutTab === 'saas' ? 'Versements SaaS' : 'Reversements Événements' },
            ]}
          />
        }
        action={
          <div className="flex items-center gap-2">
            {payoutTab === 'saas' ? (
              <>
                <ViewModeToggle
                  storageKey="em-view-admin-payouts"
                  value={layout}
                  onChange={setViewMode}
                  columns={columns}
                  onColumnsChange={setGridColumns}
                  defaultMode="list"
                  defaultColumns={3}
                />
                <Button type="button" size="sm" variant="secondary" onClick={() => void exportCsv()} leftIcon={<Download className="w-4 h-4" />}>
                  Exporter CSV
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" variant="secondary" onClick={() => void exportEventPayoutsCsv()} leftIcon={<Download className="w-4 h-4" />}>
                Exporter CSV
              </Button>
            )}
          </div>
        }
      />

      {/* Onglets de navigation : Commissions SaaS vs Reversements Événements */}
      <div role="tablist" aria-label="Catégories de versements et reversements" className="flex border-b border-border gap-2">
        <button
          type="button"
          role="tab"
          id="tab-payouts-saas"
          aria-controls="panel-payouts-saas"
          aria-selected={payoutTab === 'saas'}
          onClick={() => setPayoutTab('saas')}
          className={cn(
            "px-4 py-2.5 min-h-11 text-sm font-bold border-b-2 transition flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            payoutTab === 'saas'
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-foreground"
          )}
        >
          <Wallet className="w-4 h-4" aria-hidden />
          Commissions Commerciales SaaS
        </button>
        <button
          type="button"
          role="tab"
          id="tab-payouts-events"
          aria-controls="panel-payouts-events"
          aria-selected={payoutTab === 'events'}
          onClick={() => setPayoutTab('events')}
          className={cn(
            "px-4 py-2.5 min-h-11 text-sm font-bold border-b-2 transition flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            payoutTab === 'events'
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-foreground"
          )}
        >
          <Ticket className="w-4 h-4" aria-hidden />
          Reversements Événements (Billetterie & Dons)
        </button>
      </div>

      {payoutTab === 'saas' && (
        <div id="panel-payouts-saas" role="tabpanel" aria-labelledby="tab-payouts-saas" className="space-y-6">
          {error && <Alert variant="error">{error}</Alert>}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-xl p-3.5 sm:p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Dû</p>
          <p className="text-lg sm:text-xl font-extrabold text-amber-900 dark:text-amber-200 mt-1">{formatFc(data?.sums.dueFc ?? 0)}</p>
          <p className="text-xs text-amber-700">{data?.sums.dueCount ?? 0} commercial(aux)</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3.5 sm:p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Versé</p>
          <p className="text-lg sm:text-xl font-extrabold text-emerald-800 dark:text-emerald-200 mt-1">{formatFc(data?.sums.paidFc ?? 0)}</p>
          <p className="text-xs text-emerald-700">{data?.sums.paidCount ?? 0} dossier(s)</p>
        </div>
        <div className="bg-surface-muted border border-border rounded-xl p-3.5 sm:p-4 col-span-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Payeur</p>
          <p className="text-sm font-semibold text-foreground mt-1">EventMaster via FlexPay Pay Out (ou hors plateforme)</p>
          <p className="text-xs text-muted mt-1">
            Distinct de la commission vendeur marketplace.{' '}
            <Link href="/dashboard/admin/catalogue" className="text-primary hover:underline">Ouvrir le catalogue</Link>
          </p>
        </div>
      </div>

      <CatalogueFilterBar
        search={qInput}
        onSearchChange={setQInput}
        searchPlaceholder="Commercial, e-mail, code, organisation…"
        view={layout}
        onViewChange={(mode) => {
          if (mode === 'grid' || mode === 'list') setViewMode(mode);
        }}
        hideViewToggle
        chips={chips}
        onRemoveChip={(id) => {
          if (id === 'settlement') { setSettlement('all'); setPage(1); }
          if (id === 'proof') { setProof('all'); setPage(1); }
          if (id === 'period') { setPeriod(''); setPage(1); }
        }}
        onClearChips={() => {
          setQInput('');
          setQ('');
          setSettlement('all');
          setProof('all');
          setPeriod('');
          setPage(1);
        }}
        resultLabel={`${data?.total ?? 0} dossier${(data?.total ?? 0) > 1 ? 's' : ''}`}
        modalTitle="Filtrer les versements"
        filters={
          <>
            <CatalogueFilterField label="Statut">
              <CatalogueChoicePills
                options={[
                  { id: 'due', label: 'Dues' },
                  { id: 'paid', label: 'Versées' },
                  { id: 'all', label: 'Toutes' },
                ]}
                value={settlement}
                onChange={(id) => {
                  setSettlement((id === 'paid' || id === 'all' || id === 'due' ? id : 'due') as 'due' | 'paid' | 'all');
                  setPage(1);
                }}
              />
            </CatalogueFilterField>
            <CatalogueFilterField label="Preuve">
              <CatalogueChoicePills
                options={[
                  { id: 'all', label: 'Toutes' },
                  { id: 'yes', label: 'Avec preuve' },
                  { id: 'no', label: 'Sans preuve' },
                ]}
                value={proof}
                onChange={(id) => {
                  setProof(id === 'yes' || id === 'no' ? id : 'all');
                  setPage(1);
                }}
              />
            </CatalogueFilterField>
            <CatalogueFilterField label="Période" hint="Laissez vide pour toutes les périodes.">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="month"
                  value={period}
                  onChange={(e) => { setPeriod(e.target.value); setPage(1); }}
                  className="bg-surface-muted border border-border rounded-xl px-3 py-2 text-sm font-semibold text-foreground"
                />
                <button
                  type="button"
                  onClick={() => { setPeriod(''); setPage(1); }}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Toutes
                </button>
              </div>
            </CatalogueFilterField>
          </>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : !data?.items.length ? (
        <EmptyState
          icon={<Wallet className="w-5 h-5" />}
          title="Aucun versement"
          description="Aucune commission pour ces filtres."
        />
      ) : (
        <div className={layout === 'grid' ? gridClassName : listStackClass}>
          {data.items.map((row) => {
            const key = `${row.commercialId}:${row.period}`;
            const due = row.unpaidCommission > 0;
            const statusChip = <StatusPill tone={due ? 'amber' : 'emerald'}>{due ? 'Due' : 'Versée'}</StatusPill>;
            const amountChip = (
              <StatusPill tone="primary">
                {formatFc(due ? row.unpaidCommission : row.totalCommission)}
              </StatusPill>
            );
            const settleBtn = (
              <span className="inline-flex flex-wrap items-center gap-1.5">
                {due && (
                  <Button
                    size="sm"
                    variant="primary"
                    loading={busyKey === `flex:${key}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openFlexPay(row);
                    }}
                  >
                    Verser via FlexPay
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={due ? 'secondary' : 'secondary'}
                  loading={busyKey === key}
                  onClick={(e) => {
                    e.stopPropagation();
                    openSettle(row, due);
                  }}
                >
                  {due ? 'Marquer manuellement' : 'Remettre due'}
                </Button>
              </span>
            );
            return (
              <ProjectCard
                key={key}
                id={key}
                title={row.name || row.email}
                layout={layout}
                icon={<Wallet className="w-4 h-4" />}
                onClick={() => openSettle(row, due)}
                status={layout === 'list' ? statusChip : undefined}
                aside={layout === 'list' ? amountChip : undefined}
                actions={layout === 'list' ? settleBtn : (
                  <span className="inline-flex items-center gap-1">
                    {row.payoutProofUrl && (
                      <a
                        href={row.payoutProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-muted hover:text-foreground"
                        title="Preuve"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                    )}
                    {settleBtn}
                  </span>
                )}
                meta={
                  layout === 'list' ? (
                    <span className="truncate">
                      {row.email}
                      {row.referralCode ? ` · ${row.referralCode}` : ''}
                      {' · '}
                      {row.period}
                      {' · '}
                      {row.orgCount} org.
                      {row.payoutProofUrl ? ' · preuve' : ''}
                    </span>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-1.5">
                        {statusChip}
                        {amountChip}
                      </div>
                      <p className="text-xs truncate">{row.email}</p>
                      <p className="text-xs text-muted truncate">
                        {row.period} · {row.orgCount} org. · {formatFc(row.totalCommission)}
                      </p>
                      <p className="text-xs text-muted truncate">{row.orgNames.join(', ')}</p>
                    </div>
                  )
                }
              />
            );
          })}
        </div>
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={data?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        itemLabel="dossiers"
      />

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal?.settle ? 'Marquer le versement' : 'Remettre dû'}
        description={
          modal?.settle
            ? 'Virement hors plateforme d’abord, puis preuve et motif. Le commercial est notifié.'
            : 'La ligne redevient due. Motif journalisé dans l’audit.'
        }
        footer={
          <div className="flex flex-col-reverse sm:flex-row w-full justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModal(null)} className="w-full sm:w-auto min-h-11">Annuler</Button>
            <Button type="button" onClick={() => void submitModal()} loading={Boolean(busyKey)} className="w-full sm:w-auto min-h-11">
              Confirmer
            </Button>
          </div>
        }
      >
        {modal && (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              {modal.row.name || modal.row.email} · {modal.row.period} · {formatFc(modal.settle ? modal.row.unpaidCommission : modal.row.paidCommission)}
            </p>
            {modal.settle && (
              <>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-muted">Référence ou URL de preuve</span>
                  <input
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    placeholder="Ex. VIREMENT-MM-243-… ou lien Cloudinary"
                    className="w-full bg-surface-muted border border-border rounded-xl px-3 py-2.5 text-sm"
                  />
                </label>
                <label className="block text-xs font-medium text-primary cursor-pointer">
                  {uploading ? 'Upload…' : 'Joindre une photo de reçu'}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(e) => void onProofFile(e.target.files?.[0])}
                  />
                </label>
              </>
            )}
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-muted">Motif (8 caractères min.)</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full bg-surface-muted border border-border rounded-xl px-3 py-2.5 text-sm"
                placeholder="Ex. Virement Airtel Money du 3 août, reçu n°…"
              />
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(flexModal)}
        onClose={() => setFlexModal(null)}
        title="Verser via FlexPay"
        description="Pay Out Mobile Money vers le téléphone du commercial. La commission n’est marquée versée qu’après confirmation FlexPay."
        footer={
          <div className="flex flex-col-reverse sm:flex-row w-full justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setFlexModal(null)} className="w-full sm:w-auto min-h-11">Fermer</Button>
            {pendingTransferId && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void verifyPendingFlex()}
                loading={busyKey?.startsWith('verify:')}
                className="w-full sm:w-auto min-h-11"
              >
                Vérifier le statut
              </Button>
            )}
            <Button
              type="button"
              onClick={() => void submitFlexPay()}
              loading={busyKey?.startsWith('flex:')}
              disabled={Boolean(pendingTransferId)}
              className="w-full sm:w-auto min-h-11"
            >
              Lancer le versement
            </Button>
          </div>
        }
      >
        {flexModal && (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              {flexModal.name || flexModal.email} · {flexModal.period} · {formatFc(flexModal.unpaidCommission)}
            </p>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-muted">
                Téléphone Mobile Money (optionnel si déjà sur le profil)
              </span>
              <input
                value={flexPhone}
                onChange={(e) => setFlexPhone(e.target.value)}
                placeholder="243XXXXXXXXX"
                className="w-full bg-surface-muted border border-border rounded-xl px-3 py-2.5 text-sm"
              />
            </label>
            {pendingTransferId && (
              <p className="text-xs text-muted">
                Versement en cours ({pendingTransferId.slice(0, 8)}…). Demandez au commercial de confirmer sur son téléphone, puis vérifiez.
              </p>
            )}
          </div>
        )}
      </Modal>
        </div>
      )}

      {/* ─── VUE DES REVERSEMENTS D'ÉVÉNEMENTS (BILLETTERIE & DONS) ─── */}
      {payoutTab === 'events' && (
        <div id="panel-payouts-events" role="tabpanel" aria-labelledby="tab-payouts-events" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-surface-muted border border-border rounded-xl p-3.5 sm:p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Total Encaissé Brut</p>
              <p className="text-lg sm:text-xl font-extrabold text-foreground mt-1">
                {formatFc(eventPayoutsData?.kpis?.totalGrossCollectedFc ?? 0)}
              </p>
              <p className="text-xs text-muted">{eventPayoutsData?.kpis?.totalEventsWithRevenue ?? 0} événement(s)</p>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3.5 sm:p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Retenue Plateforme</p>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-primary/20 text-primary">3% - 5%</span>
              </div>
              <p className="text-lg sm:text-xl font-extrabold text-primary mt-1">
                {formatFc(eventPayoutsData?.kpis?.totalPlatformRetentionFc ?? 0)}
              </p>
              <p className="text-xs text-primary/80">Commission légale déduite</p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-xl p-3.5 sm:p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Net À Reverser</p>
              <p className="text-lg sm:text-xl font-extrabold text-amber-900 dark:text-amber-200 mt-1">
                {formatFc(eventPayoutsData?.kpis?.totalNetPayoutDueFc ?? 0)}
              </p>
              <p className="text-xs text-amber-700">{eventPayoutsData?.kpis?.eventsDueCount ?? 0} en attente</p>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3.5 sm:p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Net Déjà Reversé</p>
              <p className="text-lg sm:text-xl font-extrabold text-emerald-800 dark:text-emerald-200 mt-1">
                {formatFc(eventPayoutsData?.kpis?.totalNetPayoutPaidFc ?? 0)}
              </p>
              <p className="text-xs text-emerald-700">{eventPayoutsData?.kpis?.eventsPaidCount ?? 0} réglé(s)</p>
            </div>
          </div>

          {/* Barre de filtres */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-border">
            <input
              type="text"
              value={eventSearchQuery}
              onChange={(e) => setEventSearchQuery(e.target.value)}
              placeholder="Rechercher un événement, une organisation..."
              aria-label="Rechercher un événement ou une organisation"
              className="flex-1 bg-surface-muted border border-border rounded-lg px-3 py-2 text-sm min-h-11 focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
            <div role="group" aria-label="Filtrer par statut de versement" className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                aria-pressed={eventPayoutStatusFilter === 'all'}
                aria-label="Afficher tous les statuts"
                onClick={() => setEventPayoutStatusFilter('all')}
                className={cn(
                  "px-3 py-1.5 min-h-11 text-xs font-semibold rounded-lg transition inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  eventPayoutStatusFilter === 'all'
                    ? "bg-primary text-white"
                    : "bg-surface-muted text-muted hover:text-foreground"
                )}
              >
                Tous
              </button>
              <button
                type="button"
                aria-pressed={eventPayoutStatusFilter === 'due'}
                aria-label="Afficher les reversements dus"
                onClick={() => setEventPayoutStatusFilter('due')}
                className={cn(
                  "px-3 py-1.5 min-h-11 text-xs font-semibold rounded-lg transition inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  eventPayoutStatusFilter === 'due'
                    ? "bg-amber-600 text-white"
                    : "bg-surface-muted text-muted hover:text-foreground"
                )}
              >
                À reverser
              </button>
              <button
                type="button"
                aria-pressed={eventPayoutStatusFilter === 'paid'}
                aria-label="Afficher les reversements réglés"
                onClick={() => setEventPayoutStatusFilter('paid')}
                className={cn(
                  "px-3 py-1.5 min-h-11 text-xs font-semibold rounded-lg transition inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  eventPayoutStatusFilter === 'paid'
                    ? "bg-primary-solid text-primary-foreground"
                    : "bg-surface-muted text-muted hover:text-foreground"
                )}
              >
                Versés
              </button>
            </div>
          </div>

          {/* Liste des événements */}
          {loadingEvents ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !eventPayoutsData?.events?.length ? (
            <EmptyState
              icon={<Ticket className="w-8 h-8 text-muted" />}
              title="Aucun événement avec recettes"
              description="Aucun événement pour ces critères."
            />
          ) : (
            <div className="space-y-4">
              {eventPayoutsData.events.map((ev) => {
                const isPaid = ev.payoutStatus === 'PAID';
                return (
                  <div
                    key={ev.eventId}
                    className="bg-surface rounded-2xl border border-border p-5 sm:p-6 space-y-4 shadow-sm hover:border-primary/30 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-bold text-foreground">{ev.eventTitle}</h4>
                          <StatusPill tone={isPaid ? 'emerald' : 'amber'}>
                            {isPaid ? 'Reversé' : 'À reverser'}
                          </StatusPill>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {ev.tenantName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {ev.eventDate.slice(0, 10)}
                          </span>
                          {ev.managerEmail && (
                            <span>Contact : {ev.managerEmail} {ev.managerPhone ? `(${ev.managerPhone})` : ''}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs text-muted block uppercase font-bold">Net à reverser</span>
                        <span className="text-lg sm:text-xl font-extrabold text-primary block">
                          {formatFc(ev.totalNetPayoutFc)}
                        </span>
                      </div>
                    </div>

                    {/* Détails Billetterie et Dons */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {/* Bloc Billetterie */}
                      <div className="p-3.5 bg-surface-muted rounded-xl border border-border/80 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-foreground">
                          <span className="flex items-center gap-1.5">
                            <Ticket className="w-4 h-4 text-primary" />
                            Billetterie ({ev.ticketingOrdersCount} ventes)
                          </span>
                          <span className="text-muted">Retenue {ev.ticketingRetentionRatePercent}%</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-border/60">
                          <div>
                            <span className="text-[11px] text-muted block">Brut</span>
                            <span className="font-semibold">{formatFc(ev.ticketingGrossFc)}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-muted block">Retenue</span>
                            <span className="font-semibold text-rose-600">-{formatFc(ev.ticketingRetentionFc)}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-muted block">Net</span>
                            <span className="font-bold text-primary">{formatFc(ev.ticketingNetFc)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bloc Dons */}
                      <div className="p-3.5 bg-surface-muted rounded-xl border border-border/80 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-foreground">
                          <span className="flex items-center gap-1.5">
                            <HeartHandshake className="w-4 h-4 text-emerald-600" />
                            Dons solidaires ({ev.donationsOrdersCount} dons)
                          </span>
                          <span className="text-muted">Retenue {ev.donationsRetentionRatePercent}%</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-border/60">
                          <div>
                            <span className="text-[11px] text-muted block">Brut</span>
                            <span className="font-semibold">{formatFc(ev.donationsGrossFc)}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-muted block">Retenue</span>
                            <span className="font-semibold text-rose-600">-{formatFc(ev.donationsRetentionFc)}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-muted block">Net</span>
                            <span className="font-bold text-primary">{formatFc(ev.donationsNetFc)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Récapitulatif et Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 text-xs text-muted">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span>Total Brut : <strong>{formatFc(ev.totalGrossFc)}</strong></span>
                        <span>Retenue totale : <strong className="text-rose-600">-{formatFc(ev.totalRetentionFc)}</strong></span>
                        {isPaid && ev.settledAt && (
                          <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Versé le {ev.settledAt.slice(0, 10)} via {ev.paymentMethod || 'Virement'}
                          </span>
                        )}
                        {ev.proofUrl && (
                          <a
                            href={ev.proofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline font-semibold flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Voir la preuve
                          </a>
                        )}
                      </div>

                      <div>
                        {!isPaid ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              setSettleEventModal(ev);
                              setSettleAmountFc(String(ev.totalNetPayoutFc));
                              setSettleProofUrl('');
                              setSettleNotes('');
                              setSettlePaymentMethod('Virement Bancaire');
                            }}
                            className="min-h-11 sm:min-h-10"
                            aria-label={`Marquer le reversement pour l'événement ${ev.eventTitle}`}
                          >
                            Marquer le reversement
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setSettleEventModal(ev);
                              setSettleAmountFc(String(ev.settledAmountFc || ev.totalNetPayoutFc));
                              setSettleProofUrl(ev.proofUrl || '');
                              setSettleNotes(ev.notes || '');
                              setSettlePaymentMethod(ev.paymentMethod || 'Virement Bancaire');
                            }}
                            className="min-h-11 sm:min-h-10"
                            aria-label={`Modifier le reversement pour l'événement ${ev.eventTitle}`}
                          >
                            Modifier le versement
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modale de versement d'événement */}
      <Modal
        open={Boolean(settleEventModal)}
        onClose={() => setSettleEventModal(null)}
        title={`Régler le reversement : ${settleEventModal?.eventTitle}`}
        description={`Reversement net à l'organisation ${settleEventModal?.tenantName} après déduction de la retenue plateforme.`}
        footer={
          <div className="flex flex-col-reverse sm:flex-row w-full justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSettleEventModal(null)}
              className="w-full sm:w-auto min-h-11"
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={(e) => void handleSettleEventPayout(e)}
              loading={settlingEvent}
              className="w-full sm:w-auto min-h-11"
            >
              Valider le reversement
            </Button>
          </div>
        }
      >
        {settleEventModal && (
          <form onSubmit={handleSettleEventPayout} className="space-y-4">
            <div className="p-3 bg-surface-muted rounded-xl border border-border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted">Total brut collecté :</span>
                <span className="font-semibold">{formatFc(settleEventModal.totalGrossFc)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Retenue plateforme EventMaster :</span>
                <span className="font-semibold text-rose-600">-{formatFc(settleEventModal.totalRetentionFc)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border font-bold text-foreground text-sm">
                <span>Net calculé :</span>
                <span className="text-primary">{formatFc(settleEventModal.totalNetPayoutFc)}</span>
              </div>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-muted">Montant net reversé (FC)</span>
              <input
                type="number"
                value={settleAmountFc}
                onChange={(e) => setSettleAmountFc(e.target.value)}
                required
                className="w-full bg-surface-muted border border-border rounded-xl px-3 py-2.5 text-sm font-semibold"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-muted">Mode de versement</span>
              <select
                value={settlePaymentMethod}
                onChange={(e) => setSettlePaymentMethod(e.target.value)}
                className="w-full bg-surface-muted border border-border rounded-xl px-3 py-2.5 text-sm"
              >
                <option value="Virement Bancaire">Virement Bancaire</option>
                <option value="M-Pesa (Vodacom)">M-Pesa (Vodacom)</option>
                <option value="Orange Money">Orange Money</option>
                <option value="Airtel Money">Airtel Money</option>
                <option value="Afrimoney">Afrimoney</option>
                <option value="FlexPay Pay Out">FlexPay Pay Out</option>
                <option value="Chèque / Espèces">Chèque / Espèces</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-muted">Référence de transaction ou lien de preuve</span>
              <input
                value={settleProofUrl}
                onChange={(e) => setSettleProofUrl(e.target.value)}
                placeholder="Ex. VIREMENT-BCC-2026-..., réf bordereau ou lien reçu"
                className="w-full bg-surface-muted border border-border rounded-xl px-3 py-2.5 text-sm"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-muted">Notes / Motif administratif</span>
              <textarea
                value={settleNotes}
                onChange={(e) => setSettleNotes(e.target.value)}
                rows={2}
                placeholder="Ex. Versement net exécuté le 15 sept suite à clôture de l'événement..."
                className="w-full bg-surface-muted border border-border rounded-xl px-3 py-2 text-sm"
              />
            </label>
          </form>
        )}
      </Modal>
    </div>
  );
}
