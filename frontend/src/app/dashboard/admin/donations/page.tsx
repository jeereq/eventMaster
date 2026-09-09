'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Heart,
  Search,
  RefreshCw,
  Download,
  Calendar,
  Building2,
  Users,
  CreditCard,
  Sparkles,
  Smartphone,
  ExternalLink,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  XCircle,
  MessageSquare,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  PageHeader,
  Breadcrumbs,
  Alert,
  EmptyState,
  Badge,
  Input,
  Button,
  StatusPill,
} from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import type { AdminDonationsReportResponse, EventDonationItem } from '@/lib/donationsReport';

export default function AdminDonationsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<AdminDonationsReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  // Filtres
  const [period, setPeriod] = useState<'all' | '30d' | '90d' | '12m'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewTab, setViewTab] = useState<'overview' | 'events' | 'tenants' | 'transactions'>('overview');

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const qParams = new URLSearchParams();
      if (period !== 'all') qParams.set('period', period);
      if (statusFilter !== 'all') qParams.set('status', statusFilter);
      if (searchQuery.trim()) qParams.set('q', searchQuery.trim());

      const qs = qParams.toString();
      const res = await api.get(`/admin/donations/report${qs ? `?${qs}` : ''}`);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le rapport des dons.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, statusFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportCsv = async () => {
    try {
      setDownloadingCsv(true);
      const qParams = new URLSearchParams();
      if (statusFilter !== 'all') qParams.set('status', statusFilter);
      const qs = qParams.toString();

      await api.download(
        `/admin/donations/export${qs ? `?${qs}` : ''}`,
        `rapport-dons-plateforme-${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'export CSV.");
    } finally {
      setDownloadingCsv(false);
    }
  };

  const summary = data?.summary;

  const filteredRecentDonations = useMemo(() => {
    if (!data?.recentDonations) return [];
    return data.recentDonations;
  }, [data?.recentDonations]);

  if (user && user.role !== 'SUPER_ADMIN') {
    return (
      <div className="page-container py-12">
        <Alert variant="error">Accès réservé exclusivement aux Super Administrateurs.</Alert>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6 py-6 max-w-7xl">
      <Breadcrumbs
        items={[
          { label: 'Accueil', href: '/dashboard' },
          { label: 'Superadmin', href: '/dashboard' },
          { label: 'Dons solidaires' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Reporting des dons solidaires"
          description="Suivi consolidé de l’ensemble des collectes de fonds, dons libres et contributions sur la plateforme."
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            leftIcon={<RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />}
          >
            Actualiser
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            disabled={downloadingCsv || loading || (summary?.totalAttemptsCount ?? 0) === 0}
            leftIcon={
              downloadingCsv ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )
            }
          >
            Exporter (CSV)
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      {/* Cartes KPI Synthèse Plateforme */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total collecté */}
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 font-semibold">
              <span>Volume collecté</span>
              <Heart className="w-4 h-4 fill-rose-500/30 text-rose-600" />
            </div>
            <p className="text-xl font-black text-rose-700 dark:text-rose-300 tabular-nums">
              {formatFc(summary.totalCollectedFc)}
            </p>
            <p className="text-[11px] text-muted">
              {summary.totalDonationsPaid} dons confirmés
            </p>
          </div>

          {/* En attente */}
          <div className="rounded-2xl border border-border bg-surface p-4 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-muted font-medium">
              <span>En attente</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xl font-black text-foreground tabular-nums">
              {formatFc(summary.pendingAmountFc)}
            </p>
            <p className="text-[11px] text-muted">
              {summary.totalDonationsPending} en cours
            </p>
          </div>

          {/* Don moyen */}
          <div className="rounded-2xl border border-border bg-surface p-4 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-muted font-medium">
              <span>Don moyen</span>
              <CreditCard className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xl font-black text-foreground tabular-nums">
              {formatFc(summary.averageDonationFc)}
            </p>
            <p className="text-[11px] text-muted">par transaction</p>
          </div>

          {/* Don record */}
          <div className="rounded-2xl border border-border bg-surface p-4 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-muted font-medium">
              <span>Plus grand don</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xl font-black text-foreground tabular-nums">
              {formatFc(summary.highestDonationFc)}
            </p>
            <p className="text-[11px] text-muted">Record plateforme</p>
          </div>

          {/* Événements actifs */}
          <div className="rounded-2xl border border-border bg-surface p-4 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-muted font-medium">
              <span>Événements</span>
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xl font-black text-primary tabular-nums">
              {summary.eventsWithDonationsCount}
            </p>
            <p className="text-[11px] text-muted">Campagnes actives</p>
          </div>

          {/* Organisations */}
          <div className="rounded-2xl border border-border bg-surface p-4 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-muted font-medium">
              <span>Organisations</span>
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xl font-black text-foreground tabular-nums">
              {summary.activeTenantsCount}
            </p>
            <p className="text-[11px] text-muted">Collectrices de fonds</p>
          </div>
        </div>
      )}

      {/* Répartition par canaux opérateurs (Mobile Money & Cartes) */}
      {data?.channels && data.channels.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-primary" />
              Parts de marché par canal opérateur en RDC
            </h3>
            <span className="text-xs text-muted">
              {data.channels.length} canal{data.channels.length > 1 ? 'aux' : ''} actif{data.channels.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.channels.map((ch) => (
              <div key={ch.channel} className="rounded-xl border border-border bg-surface-muted/40 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground truncate">{ch.label}</span>
                  <span className="font-black text-rose-700 dark:text-rose-300">{ch.percent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-rose-500 to-rose-600 rounded-full" style={{ width: `${ch.percent}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted font-medium">
                  <span className="text-foreground">{formatFc(ch.amountFc)}</span>
                  <span>{ch.count} don{ch.count > 1 ? 's' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Onglets de navigation des sous-sections */}
      <div
        role="tablist"
        aria-label="Sections du reporting des dons solidaires"
        className="flex flex-wrap items-center gap-2 border-b border-border pb-3"
      >
        {([
          ['overview', 'Vue générale & Transactions', Heart],
          ['events', 'Top Événements collecteurs', Calendar],
          ['tenants', 'Top Organisations', Building2],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={viewTab === id}
            onClick={() => setViewTab(id)}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-2 min-h-11 rounded-xl text-xs font-semibold transition touch-manipulation',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              viewTab === id
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-surface text-muted hover:text-foreground border border-border',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
            {id === 'events' && data?.topEvents && (
              <span className="ml-1 text-[11px] opacity-80">({data.topEvents.length})</span>
            )}
            {id === 'tenants' && data?.topTenants && (
              <span className="ml-1 text-[11px] opacity-80">({data.topTenants.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Section 1 : Top Événements collecteurs */}
      {viewTab === 'events' && (
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Classement des événements collecteurs de dons</h3>
            <p className="text-xs text-muted">Événements ayant récolté des contributions solidaires, classés par montant net collecté.</p>
          </div>

          {!data?.topEvents || data.topEvents.length === 0 ? (
            <p className="text-xs text-muted py-8 text-center">Aucun événement n’a encore enregistré de don solidaire.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Top événements collecteurs">
                <thead>
                  <tr className="border-b border-border text-muted uppercase text-[10px] font-bold tracking-wider">
                    <th className="pb-3 pr-4">Événement</th>
                    <th className="pb-3 px-4">Organisation</th>
                    <th className="pb-3 px-4">Collecté (FC)</th>
                    <th className="pb-3 px-4">Objectif</th>
                    <th className="pb-3 px-4">Progression</th>
                    <th className="pb-3 px-4">Donateurs</th>
                    <th className="pb-3 pl-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.topEvents.map((ev, idx) => (
                    <tr key={ev.eventId} className="hover:bg-surface-muted/50 transition">
                      <td className="py-3.5 pr-4 font-bold text-foreground flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-surface-muted flex items-center justify-center text-[10px] text-muted shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate max-w-xs">{ev.eventTitle}</span>
                      </td>
                      <td className="py-3.5 px-4 text-muted truncate max-w-[160px]">{ev.tenantName}</td>
                      <td className="py-3.5 px-4 font-black text-rose-700 dark:text-rose-300 tabular-nums">
                        {formatFc(ev.collectedAmountFc)}
                      </td>
                      <td className="py-3.5 px-4 text-muted tabular-nums">
                        {ev.targetAmountFc ? formatFc(ev.targetAmountFc) : 'Libre'}
                      </td>
                      <td className="py-3.5 px-4">
                        {ev.progressPercent != null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-border overflow-hidden">
                              <div
                                className="h-full bg-rose-500 rounded-full"
                                style={{ width: `${Math.min(100, ev.progressPercent)}%` }}
                              />
                            </div>
                            <span className="font-semibold text-foreground">{ev.progressPercent}%</span>
                          </div>
                        ) : (
                          <span className="text-muted">Sans cible</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-foreground font-semibold tabular-nums">{ev.donorsCount}</td>
                      <td className="py-3.5 pl-4 text-right">
                        <Link
                          href={`/dashboard/events/${ev.eventId}?tab=donations`}
                          className="min-h-11 min-w-11 inline-flex items-center justify-end gap-1 text-primary hover:underline font-semibold"
                          aria-label={`Consulter le rapport de dons de ${ev.eventTitle}`}
                        >
                          <span>Rapport</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Section 2 : Top Organisations */}
      {viewTab === 'tenants' && (
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Classement des organisations par dons collectés</h3>
            <p className="text-xs text-muted">Organisations utilisatrices ayant mobilisé le plus de fonds solidaires.</p>
          </div>

          {!data?.topTenants || data.topTenants.length === 0 ? (
            <p className="text-xs text-muted py-8 text-center">Aucune organisation n’a encore enregistré de don solidaire.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Top organisations collectrices">
                <thead>
                  <tr className="border-b border-border text-muted uppercase text-[10px] font-bold tracking-wider">
                    <th className="pb-3 pr-4">Organisation</th>
                    <th className="pb-3 px-4">Événements avec dons</th>
                    <th className="pb-3 px-4">Montant total collecté (FC)</th>
                    <th className="pb-3 px-4">Total donateurs</th>
                    <th className="pb-3 pl-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {data.topTenants.map((t, idx) => (
                    <tr key={t.tenantId} className="hover:bg-surface-muted/50 transition">
                      <td className="py-3.5 pr-4 font-bold text-foreground flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-surface-muted flex items-center justify-center text-[10px] text-muted shrink-0">
                          {idx + 1}
                        </span>
                        <span>{t.tenantName}</span>
                      </td>
                      <td className="py-3.5 px-4 text-muted tabular-nums">{t.eventsCount}</td>
                      <td className="py-3.5 px-4 font-black text-rose-700 dark:text-rose-300 tabular-nums">
                        {formatFc(t.collectedAmountFc)}
                      </td>
                      <td className="py-3.5 px-4 text-foreground font-semibold tabular-nums">{t.donorsCount}</td>
                      <td className="py-3.5 pl-4 text-right">
                        <Link
                          href={`/dashboard?tab=tenants&q=${encodeURIComponent(t.tenantName)}`}
                          className="min-h-11 min-w-11 inline-flex items-center justify-end gap-1 text-primary hover:underline font-semibold"
                          aria-label={`Consulter la fiche de ${t.tenantName}`}
                        >
                          <span>Voir fiche</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Section 3 : Vue générale & Transactions récentes */}
      {(viewTab === 'overview' || viewTab === 'transactions') && (
        <div className="space-y-4">
          {/* Barre de filtres des transactions */}
          <div className="rounded-2xl border border-border bg-surface p-4 space-y-3 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Recherche */}
              <div className="relative">
                <Search className="w-4 h-4 text-muted absolute left-3 top-3.5 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Recherche nom, événement, réf…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Recherche de transactions de dons solidaires"
                  className="pl-9 pr-9 h-11"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Effacer la recherche"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 min-h-11 min-w-11 inline-flex items-center justify-center text-muted hover:text-foreground"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Période */}
              <div>
                <div className="flex flex-wrap gap-1" role="group" aria-label="Période">
                  {([
                    ['all', 'Tout'],
                    ['30d', '30 jours'],
                    ['90d', '90 jours'],
                    ['12m', '1 an'],
                  ] as const).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPeriod(id)}
                      aria-pressed={period === id}
                      className={cn(
                        'px-2.5 min-h-11 rounded-xl text-xs font-semibold border transition touch-manipulation',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                        period === id
                          ? 'bg-foreground text-background border-foreground'
                          : 'border-border bg-surface text-muted hover:text-foreground',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Statut de paiement */}
              <div className="flex items-center gap-1 justify-end">
                {([
                  ['all', 'Tous statuts'],
                  ['paid', 'Payés'],
                  ['pending', 'En attente'],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setStatusFilter(id)}
                    aria-pressed={statusFilter === id}
                    className={cn(
                      'px-2.5 min-h-11 rounded-xl text-xs font-semibold border transition touch-manipulation',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                      statusFilter === id
                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                        : 'border-border bg-surface text-muted hover:text-foreground',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted pt-2 border-t border-border">
              <span>
                {filteredRecentDonations.length} transaction{filteredRecentDonations.length > 1 ? 's' : ''} affichée{filteredRecentDonations.length > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Payé
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  En attente
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Anonyme
                </span>
              </div>
            </div>
          </div>

          {/* Liste des transactions */}
          {loading ? (
            <div className="rounded-2xl border border-border bg-surface p-12 text-center space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto" />
              <p className="text-xs text-muted">Chargement des transactions de dons…</p>
            </div>
          ) : filteredRecentDonations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface-muted/40 p-12 text-center space-y-3">
              <Heart className="w-10 h-10 text-muted mx-auto stroke-1" />
              <p className="text-sm font-bold text-foreground">Aucune contribution trouvée</p>
              <p className="text-xs text-muted max-w-sm mx-auto">
                Modifiez vos critères de recherche ou réinitialisez la période temporelle.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecentDonations.map((donation) => {
                const isPaid = donation.status === 'PAID';
                const isPending = donation.status === 'PENDING';

                return (
                  <article
                    key={donation.id}
                    className={cn(
                      'rounded-2xl border p-4 sm:p-5 transition-all shadow-2xs space-y-3',
                      isPaid
                        ? 'border-border bg-surface hover:border-primary/30'
                        : isPending
                          ? 'border-amber-500/25 bg-amber-500/5'
                          : 'border-border/60 bg-surface-muted/30 opacity-75',
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm sm:text-base font-bold text-foreground">
                            {donation.buyerName}
                          </span>
                          {donation.isAnonymous ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/15 border border-rose-500/25 px-2 py-0.5 rounded-full">
                              <EyeOff className="w-3 h-3" />
                              Anonyme
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted bg-surface-muted px-2 py-0.5 rounded-full">
                              <Eye className="w-3 h-3" />
                              {donation.buyerEmail}
                            </span>
                          )}
                          <StatusPill tone={isPaid ? 'emerald' : isPending ? 'amber' : 'slate'}>
                            {isPaid ? 'Payé' : isPending ? 'En attente' : 'Annulé'}
                          </StatusPill>
                        </div>

                        <p className="text-xs text-muted flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          {donation.event?.title && (
                            <span className="font-semibold text-foreground">
                              {donation.event.title} ({donation.event.tenantName})
                            </span>
                          )}
                          <span aria-hidden>·</span>
                          <span>{new Date(donation.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          <span aria-hidden>·</span>
                          <span>Canal : {donation.channelLabel}</span>
                          {donation.flexPayOrderNumber && (
                            <>
                              <span aria-hidden>·</span>
                              <span className="font-mono text-[11px]">Réf : {donation.flexPayOrderNumber}</span>
                            </>
                          )}
                        </p>
                      </div>

                      <div className="flex flex-col sm:items-end shrink-0">
                        <span className="text-base sm:text-lg font-black text-rose-700 dark:text-rose-300 tabular-nums">
                          {formatFc(donation.amountFc)}
                        </span>
                      </div>
                    </div>

                    {/* Message ou note du donateur */}
                    {donation.donationNote && (
                      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-foreground/90 leading-relaxed italic flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <span>« {donation.donationNote} »</span>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
