'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, Loader2, Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  PageHeader, Breadcrumbs, Alert, EmptyState, Pagination, Button, Badge, Modal, usePageSize,
} from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import { uploadImageFile } from '@/lib/cloudinaryUpload';

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
  payerName?: string;
  rates?: { firstPercent: number; renewalPercent: number };
  sums: { dueCount: number; dueFc: number; paidCount: number; paidFc: number };
}

function previousPeriod(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function OrgCommercialPayoutsPage() {
  const router = useRouter();
  const { user, access, loading: authLoading } = useAuth();

  const [period, setPeriod] = useState(previousPeriod());
  const [settlement, setSettlement] = useState<'due' | 'paid' | 'all'>('due');
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('org-saas-payouts', 20);
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

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (!access?.canViewBilling) router.replace('/dashboard');
  }, [authLoading, user, access?.canViewBilling, router]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [qInput]);

  const load = useCallback(async () => {
    if (!access?.canViewBilling) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      params.set('settlement', settlement);
      if (period) params.set('period', period);
      if (q) params.set('q', q);
      setData(await api.get(`/billing/payouts?${params}`));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les versements.');
    } finally {
      setLoading(false);
    }
  }, [access?.canViewBilling, page, pageSize, settlement, period, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = async () => {
    const params = new URLSearchParams();
    params.set('export', 'csv');
    params.set('settlement', settlement);
    params.set('limit', '100');
    if (period) params.set('period', period);
    if (q) params.set('q', q);
    await api.download(`/billing/payouts?${params}`, 'versements-commerciaux-org.csv');
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
      await api.patch('/billing/payouts', {
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
      const data = await api.post('/billing/payouts/flexpay', {
        commercialId: flexModal.commercialId,
        period: flexModal.period,
        phone: flexPhone.trim() || undefined,
      });
      setPendingTransferId(data.transferId || null);
      alert(data.message || 'Versement FlexPay initié.');
      if (data.transferId) {
        try {
          const verified = await api.get(`/billing/payouts/flexpay/${data.transferId}/verify`);
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
      const verified = await api.get(`/billing/payouts/flexpay/${pendingTransferId}/verify`);
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

  if (authLoading || !access?.canViewBilling) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const firstPct = data?.rates?.firstPercent ?? 30;
  const renewPct = data?.rates?.renewalPercent ?? 20;
  const filterClass =
    'bg-surface-muted border border-border rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground';

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Versements commerciaux"
        description={`Commissions de vos commerciaux org. (${firstPct} % premier paiement, ${renewPct} % renouvellement). Préférez « Verser via FlexPay » ; le marquage manuel avec preuve reste disponible. Distinct du réseau EventMaster (Super Admin).`}
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Accueil', href: '/dashboard' },
              { label: 'Facturation', href: '/dashboard/billing' },
              { label: 'Versements commerciaux' },
            ]}
          />
        }
        action={
          <Button type="button" size="sm" variant="secondary" onClick={() => void exportCsv()} leftIcon={<Download className="w-4 h-4" />}>
            Exporter CSV
          </Button>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Dû</p>
          <p className="text-xl font-extrabold text-amber-900 dark:text-amber-200 mt-1">{formatFc(data?.sums.dueFc ?? 0)}</p>
          <p className="text-[11px] text-amber-700">{data?.sums.dueCount ?? 0} commercial(aux)</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Versé</p>
          <p className="text-xl font-extrabold text-emerald-800 dark:text-emerald-200 mt-1">{formatFc(data?.sums.paidFc ?? 0)}</p>
          <p className="text-[11px] text-emerald-700">{data?.sums.paidCount ?? 0} dossier(s)</p>
        </div>
        <div className="bg-surface-muted border border-border rounded-xl p-4 col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Payeur</p>
          <p className="text-sm font-semibold text-foreground mt-1">{data?.payerName || 'Votre organisation'} via FlexPay (ou hors plateforme)</p>
          <p className="text-[11px] text-muted mt-1">
            Taux par défaut dans{' '}
            <Link href="/dashboard/team" className="text-primary hover:underline">Équipe</Link>
            . EventMaster ne paie pas ces commissions.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Commercial, e-mail, code, organisation parrainée…"
          className="flex-1 bg-surface-muted border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground"
        />
        <input
          type="month"
          value={period}
          onChange={(e) => { setPeriod(e.target.value); setPage(1); }}
          className={filterClass}
        />
        <select
          value={settlement}
          onChange={(e) => { setSettlement(e.target.value as 'due' | 'paid' | 'all'); setPage(1); }}
          className={filterClass}
        >
          <option value="due">Dues</option>
          <option value="paid">Versées</option>
          <option value="all">Toutes</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : !data?.items.length ? (
        <EmptyState
          icon={<Wallet className="w-5 h-5" />}
          title="Aucun versement"
          description="Aucune commission de vos commerciaux org. pour ces filtres."
        />
      ) : (
        <ul className="bg-surface border border-border rounded-[var(--radius-card)] divide-y divide-border">
          {data.items.map((row) => {
            const key = `${row.commercialId}:${row.period}`;
            const due = row.unpaidCommission > 0;
            return (
              <li key={key} className="px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant={due ? 'warning' : 'success'}>{due ? 'Due' : 'Versée'}</Badge>
                    <span className="text-[10px] text-muted">{row.period}</span>
                    <span className="text-[10px] text-muted">{data.payerName || 'Organisation'}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{row.name || row.email}</p>
                  <p className="text-xs text-muted truncate">
                    {row.email}
                    {row.referralCode ? ` · ${row.referralCode}` : ''}
                    {' · '}
                    {row.orgCount} org. · {formatFc(row.totalCommission)}
                    {due ? ` dont ${formatFc(row.unpaidCommission)} dû` : ''}
                  </p>
                  <p className="text-[11px] text-muted truncate">{row.orgNames.join(', ')}</p>
                  {row.payoutProofUrl && (
                    <a href={row.payoutProofUrl} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline truncate block">
                      Preuve
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  {due && (
                    <Button
                      size="sm"
                      variant="primary"
                      loading={busyKey === `flex:${key}`}
                      onClick={() => openFlexPay(row)}
                    >
                      Verser via FlexPay
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busyKey === key}
                    onClick={() => openSettle(row, due)}
                  >
                    {due ? 'Marquer manuellement' : 'Remettre due'}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
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
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModal(null)}>Annuler</Button>
            <Button type="button" onClick={() => void submitModal()} loading={Boolean(busyKey)}>
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
          <div className="flex w-full flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setFlexModal(null)}>Fermer</Button>
            {pendingTransferId && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void verifyPendingFlex()}
                loading={busyKey?.startsWith('verify:')}
              >
                Vérifier le statut
              </Button>
            )}
            <Button
              type="button"
              onClick={() => void submitFlexPay()}
              loading={busyKey?.startsWith('flex:')}
              disabled={Boolean(pendingTransferId)}
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
                Versement en cours. Demandez au commercial de confirmer sur son téléphone, puis vérifiez.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
