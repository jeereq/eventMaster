'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import {
  Heart,
  Search,
  RefreshCw,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  CreditCard,
  Building2,
  Calendar,
  Sparkles,
  MessageSquare,
  ShieldAlert,
  ArrowUpRight,
  ExternalLink,
  Smartphone,
  Eye,
  EyeOff,
  Filter,
  Loader2,
} from 'lucide-react';
import { Button, Input, StatusPill, Badge, EmptyState } from '@/components/ui';
import type { EventDonationsReportResponse, EventDonationItem } from '@/lib/donationsReport';

export interface EventDonationsReportViewProps {
  eventId: string;
  eventTitle: string;
  className?: string;
}

export default function EventDonationsReportView({
  eventId,
  eventTitle,
  className = '',
}: EventDonationsReportViewProps) {
  const [data, setData] = useState<EventDonationsReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'CANCELLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [anonymousFilter, setAnonymousFilter] = useState<'ALL' | 'ANONYMOUS' | 'NAMED'>('ALL');
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  const loadReport = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      try {
        const res = await api.get(`/events/${eventId}/donations/report`);
        setData(res);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Impossible de charger le reporting des dons.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [eventId],
  );

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExportCsv = async () => {
    try {
      setDownloadingCsv(true);
      await api.download(
        `/events/${eventId}/donations/export`,
        `dons-${(data?.event?.slug || eventId).slice(0, 25)}.csv`,
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'export CSV.");
    } finally {
      setDownloadingCsv(false);
    }
  };

  const filteredDonations = useMemo(() => {
    if (!data?.donations) return [];
    return data.donations.filter((donation: EventDonationItem) => {
      if (statusFilter !== 'ALL' && donation.status !== statusFilter) return false;
      if (anonymousFilter === 'ANONYMOUS' && !donation.isAnonymous) return false;
      if (anonymousFilter === 'NAMED' && donation.isAnonymous) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = donation.buyerName.toLowerCase().includes(q);
        const matchesActual = (donation.actualBuyerName || '').toLowerCase().includes(q);
        const matchesEmail = donation.buyerEmail.toLowerCase().includes(q);
        const matchesPhone = (donation.buyerPhone || '').toLowerCase().includes(q);
        const matchesNote = (donation.donationNote || '').toLowerCase().includes(q);
        const matchesOrderNum = (donation.flexPayOrderNumber || '').toLowerCase().includes(q);
        const matchesRef = (donation.flexPayReference || '').toLowerCase().includes(q);
        if (!matchesName && !matchesActual && !matchesEmail && !matchesPhone && !matchesNote && !matchesOrderNum && !matchesRef) {
          return false;
        }
      }
      return true;
    });
  }, [data?.donations, statusFilter, anonymousFilter, searchQuery]);

  const summary = data?.summary;
  const config = data?.config;

  return (
    <div className={cn('space-y-6', className)}>
      {/* En-tête de la section reporting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Heart className="w-4 h-4 fill-rose-500/20" />
            </span>
            <h2 className="text-lg font-bold text-foreground">Reporting des dons solidaires</h2>
            <Badge variant="danger" className="text-[10px]">Solidarité</Badge>
          </div>
          <p className="text-xs text-muted">
            {config?.cause
              ? `Cause soutenue : « ${config.cause} »`
              : `Suivi des contributions, encaissements Mobile Money et messages de soutien pour ${eventTitle}.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => loadReport(true)}
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
        <div className="p-3 rounded-xl bg-danger/10 border border-danger/25 text-danger text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="min-h-11 min-w-11 inline-flex items-center justify-center hover:opacity-75"
            aria-label="Fermer"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cartes KPI Synthèse */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total collecté */}
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3.5 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-muted text-xs">
              <span className="font-semibold text-rose-700 dark:text-rose-300">Total récolté</span>
              <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-500/30" />
            </div>
            <p className="text-lg font-black text-rose-700 dark:text-rose-300 tabular-nums">
              {formatFc(summary.collectedAmountFc)}
            </p>
            <p className="text-[11px] text-muted">
              {summary.donationsPaidCount} contribution{summary.donationsPaidCount > 1 ? 's' : ''} payée{summary.donationsPaidCount > 1 ? 's' : ''}
            </p>
          </div>

          {/* Objectif fixé */}
          <div className="rounded-2xl border border-border bg-surface p-3.5 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-muted text-xs">
              <span className="font-medium">Objectif fixé</span>
              <Building2 className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-lg font-black text-foreground tabular-nums">
              {summary.targetAmountFc ? formatFc(summary.targetAmountFc) : 'Montant libre'}
            </p>
            <p className="text-[11px] text-muted">
              {summary.progressPercent != null ? `${summary.progressPercent}% atteint` : 'Sans plafond'}
            </p>
          </div>

          {/* Donateurs uniques */}
          <div className="rounded-2xl border border-border bg-surface p-3.5 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-muted text-xs">
              <span className="font-medium">Donateurs</span>
              <Users className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-lg font-black text-primary tabular-nums">
              {summary.donorsCount}
            </p>
            <p className="text-[11px] text-muted">
              {summary.anonymousDonationsCount > 0
                ? `${summary.anonymousDonationsCount} anonyme${summary.anonymousDonationsCount > 1 ? 's' : ''}`
                : '100% nominatifs'}
            </p>
          </div>

          {/* Don moyen */}
          <div className="rounded-2xl border border-border bg-surface p-3.5 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-muted text-xs">
              <span className="font-medium">Don moyen</span>
              <CreditCard className="w-3.5 h-3.5 text-muted" />
            </div>
            <p className="text-lg font-black text-foreground tabular-nums">
              {formatFc(summary.averageDonationFc)}
            </p>
            <p className="text-[11px] text-muted">par don payé</p>
          </div>

          {/* Don le plus élevé */}
          <div className="rounded-2xl border border-border bg-surface p-3.5 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-muted text-xs">
              <span className="font-medium">Plus grand don</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className="text-lg font-black text-foreground tabular-nums">
              {formatFc(summary.highestDonationFc)}
            </p>
            <p className="text-[11px] text-muted">Record enregistré</p>
          </div>

          {/* Pass d'accès donateurs */}
          <div className="rounded-2xl border border-border bg-surface p-3.5 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-muted text-xs">
              <span className="font-medium">Pass délivrés</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {summary.attendeePassesCount}
            </p>
            <p className="text-[11px] text-muted">Invités au guichet</p>
          </div>
        </div>
      )}

      {/* Barre d'objectif de collecte (si objectif défini) */}
      {summary?.targetAmountFc && summary.targetAmountFc > 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-foreground flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
              Progression de la campagne : {summary.progressPercent}%
            </span>
            <span className="text-muted tabular-nums">
              {formatFc(summary.collectedAmountFc)} sur {formatFc(summary.targetAmountFc)}
              {summary.collectedAmountFc < summary.targetAmountFc && (
                <span className="text-rose-700 dark:text-rose-300 ml-1">
                  (Reste {formatFc(summary.targetAmountFc - summary.collectedAmountFc)})
                </span>
              )}
            </span>
          </div>

          <div
            role="progressbar"
            aria-label="Progression de la collecte de dons"
            aria-valuenow={summary.collectedAmountFc}
            aria-valuemin={0}
            aria-valuemax={summary.targetAmountFc}
            className="w-full h-3 rounded-full bg-surface-muted overflow-hidden border border-border/50"
          >
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-rose-600 to-primary transition-all duration-500 motion-reduce:transition-none rounded-full"
              style={{ width: `${Math.max(2, summary.progressPercent || 0)}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Répartition par canaux de paiement (Mobile Money & Cartes) */}
      {data?.channels && data.channels.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-primary" />
              Répartition par canal de paiement
            </h3>
            <span className="text-xs text-muted">
              {data.channels.length} canal{data.channels.length > 1 ? 'aux' : ''} utilisé{data.channels.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.channels.map((ch) => (
              <div key={ch.channel} className="rounded-xl border border-border bg-surface-muted/40 p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground truncate">{ch.label}</span>
                  <span className="font-bold text-primary">{ch.percent}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${ch.percent}%` }} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>{formatFc(ch.amountFc)}</span>
                  <span>{ch.count} don{ch.count > 1 ? 's' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barre de filtres et recherche */}
      <div className="rounded-2xl border border-border bg-surface p-4 space-y-3 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Recherche */}
          <div className="relative">
            <Search className="w-4 h-4 text-muted absolute left-3 top-3.5 pointer-events-none" />
            <Input
              type="text"
              placeholder="Rechercher par nom, email, note, réf..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Rechercher parmi les dons solidaires"
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

          {/* Filtre de statut de paiement */}
          <div>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Statut du don">
              {([
                ['ALL', 'Tous les dons'],
                ['PAID', 'Payés'],
                ['PENDING', 'En attente'],
                ['CANCELLED', 'Annulés'],
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
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border bg-surface text-muted hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Filtre Anonyme / Nominatif */}
          <div className="flex items-center gap-1 justify-end">
            {([
              ['ALL', 'Tous'],
              ['NAMED', 'Nominatifs'],
              ['ANONYMOUS', 'Anonymes'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setAnonymousFilter(id)}
                aria-pressed={anonymousFilter === id}
                className={cn(
                  'px-2.5 min-h-11 rounded-xl text-xs font-semibold border transition touch-manipulation',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  anonymousFilter === id
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
            {filteredDonations.length} don{filteredDonations.length > 1 ? 's' : ''} trouvé{filteredDonations.length > 1 ? 's' : ''}
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

      {/* Liste des contributions */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted">Chargement du reporting des dons…</p>
        </div>
      ) : filteredDonations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface-muted/40 p-10 text-center space-y-3">
          <Heart className="w-10 h-10 text-muted mx-auto stroke-1" />
          <p className="text-sm font-bold text-foreground">Aucun don ne correspond aux critères</p>
          <p className="text-xs text-muted max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'ALL' || anonymousFilter !== 'ALL'
              ? 'Essayez de modifier ou réinitialiser vos filtres de recherche.'
              : 'Les dons solidaires collectés sur la page publique apparaîtront automatiquement ici en temps réel.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDonations.map((donation) => {
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
                          Nominatif
                        </span>
                      )}
                      <StatusPill tone={isPaid ? 'emerald' : isPending ? 'amber' : 'slate'}>
                        {isPaid ? 'Payé' : isPending ? 'En attente' : 'Annulé'}
                      </StatusPill>
                    </div>

                    <p className="text-xs text-muted flex flex-wrap items-center gap-x-2 gap-y-0.5">
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
                    {donation.guest && (
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        Pass invité {donation.guest.checkedInAt ? '(Entrée validée)' : '(Émis)'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Note / Message d'encouragement laissé par le donateur */}
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
  );
}
