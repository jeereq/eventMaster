'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Building2, CalendarCheck, Clock, Eye, Inbox, RefreshCw, Star, Store, Wallet } from 'lucide-react';
import { ratingLabel } from '@/lib/marketplaceReviews';
import { api } from '@/lib/api';
import { formatFc } from '@/config/landingPricing';
import { Alert, Button, EmptyState, SkeletonStatsRow } from '@/components/ui';
import { cn } from '@/lib/cn';

type VendorStats = {
  vendorSlug?: string | null;
  views?: { total: number };
  rating?: { count: number; average: number | null };
  inquiries: {
    total: number;
    answered: number;
    pending: number;
    declined: number;
    converted: number;
    responseRate: number | null;
    conversionRate: number | null;
    medianResponseHours: number | null;
  };
  bookings: {
    total: number;
    byStatus: Record<string, number>;
    revenueFc: number;
    pipelineFc: number;
    commissionDueFc: number;
    commissionPaidFc: number;
    commissionRate: number;
  };
  months: Array<{ month: string; views?: number; inquiries: number; confirmedBookings: number; revenueFc: number }>;
  topOffers: Array<{
    id: string;
    kind: 'venue' | 'service';
    title: string;
    isPublic: boolean;
    views?: number;
    inquiries: number;
    confirmedBookings: number;
    revenueFc: number;
  }>;
};

const MONTH_LABELS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function monthLabel(key: string, withYear = false): string {
  const [year, month] = key.split('-').map(Number);
  const label = MONTH_LABELS[(month || 1) - 1] || key;
  return withYear ? `${label} ${year}` : label;
}

function pct(value: number | null): string {
  return value == null ? '—' : `${Math.round(value * 100)} %`;
}

function hoursLabel(hours: number | null): string {
  if (hours == null) return '—';
  if (hours < 1) return 'moins d’1 h';
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} j`;
}

function Tile({
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  icon: typeof Inbox;
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2 text-xs font-semibold text-muted">
        <Icon className="h-4 w-4 text-primary" aria-hidden />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </>
  );
  const cls = 'block rounded-[var(--radius-card)] border border-border bg-surface p-4';
  return href ? (
    <Link href={href} className={cn(cls, 'transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Barres « chiffre confirmé par mois » : une seule série, couleur primaire, survol = valeur. */
function RevenueBars({ months }: { months: VendorStats['months'] }) {
  const max = Math.max(1, ...months.map((m) => m.revenueFc));
  const [active, setActive] = useState<number | null>(null);
  const current = active != null ? months[active] : null;
  return (
    <div>
      <p className="min-h-5 text-xs text-muted" aria-live="polite">
        {current
          ? `${monthLabel(current.month, true)} : ${formatFc(current.revenueFc)} · ${current.confirmedBookings} réservation${current.confirmedBookings > 1 ? 's' : ''} · ${current.inquiries} demande${current.inquiries > 1 ? 's' : ''}`
          : 'Survolez un mois pour le détail.'}
      </p>
      <div className="mt-2 flex h-40 items-end gap-[2px] border-b border-border" role="img" aria-label="Chiffre confirmé par mois sur 12 mois">
        {months.map((m, index) => {
          const height = m.revenueFc > 0 ? Math.max(3, Math.round((m.revenueFc / max) * 100)) : 0;
          return (
            <button
              key={m.month}
              type="button"
              className="group relative flex h-full flex-1 items-end focus-visible:outline-none"
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              aria-label={`${monthLabel(m.month, true)} : ${formatFc(m.revenueFc)}`}
            >
              <span
                className={cn(
                  'block w-full rounded-t-[4px] bg-primary-solid transition-opacity',
                  active != null && active !== index ? 'opacity-40' : 'opacity-100',
                  'group-focus-visible:ring-2 group-focus-visible:ring-primary/50',
                )}
                style={{ height: `${height}%` }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex gap-[2px]">
        {months.map((m, index) => (
          <span key={m.month} className={cn('flex-1 text-center text-[10px] text-muted', index % 2 === 1 && 'max-sm:invisible')}>
            {monthLabel(m.month)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function VendorStatsView({ isVenue }: { isVenue: boolean }) {
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTable, setShowTable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/marketplace/vendor-stats');
      setStats(data as VendorStats);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger vos statistiques.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial des données
    void load();
  }, [load]);

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <SkeletonStatsRow count={4} />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <Alert variant="error">
        {error}{' '}
        <button type="button" className="font-semibold underline" onClick={() => void load()}>
          Réessayer
        </button>
      </Alert>
    );
  }

  if (!stats) return null;

  const { inquiries, bookings, months, topOffers } = stats;
  const commissionPct = Math.round(bookings.commissionRate * 100);
  const nothingYet = inquiries.total === 0 && bookings.total === 0 && !(stats.views?.total);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">Vues et demandes des 12 derniers mois · chiffre, commission et avis depuis le début.</p>
        <div className="flex flex-wrap items-center gap-2">
        {stats.vendorSlug ? (
          <Button variant="ghost" size="sm" href={`/marketplace/vitrine/${encodeURIComponent(stats.vendorSlug)}`} leftIcon={<Store className="h-4 w-4" />}>
            Ma vitrine publique
          </Button>
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
          leftIcon={<RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />}
        >
          Rafraîchir
        </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Tile
          icon={Eye}
          label="Vues des fiches"
          value={String(stats.views?.total ?? 0)}
          hint={inquiries.total > 0 && (stats.views?.total ?? 0) > 0
            ? `${Math.round((inquiries.total / (stats.views?.total || 1)) * 100)} % des visites demandent un devis`
            : '12 derniers mois'}
        />
        <Tile
          icon={Inbox}
          label="Demandes de devis"
          value={String(inquiries.total)}
          hint={inquiries.pending > 0 ? `${inquiries.pending} sans réponse` : 'Toutes traitées'}
          href="/dashboard/quotes"
        />
        <Tile
          icon={Clock}
          label="Taux de réponse"
          value={pct(inquiries.responseRate)}
          hint={`Délai médian : ${hoursLabel(inquiries.medianResponseHours)}`}
        />
        <Tile
          icon={CalendarCheck}
          label="Devis transformés"
          value={pct(inquiries.conversionRate)}
          hint={`${inquiries.converted} réservation${inquiries.converted > 1 ? 's' : ''} issue${inquiries.converted > 1 ? 's' : ''} d’un devis`}
          href="/dashboard/bookings?tab=bookings"
        />
        <Tile
          icon={Wallet}
          label="Chiffre confirmé"
          value={formatFc(bookings.revenueFc)}
          hint={bookings.pipelineFc > 0 ? `${formatFc(bookings.pipelineFc)} encore en attente` : `${(bookings.byStatus.CONFIRMED ?? 0) + (bookings.byStatus.COMPLETED ?? 0)} réservations`}
        />
        <Tile
          icon={Star}
          label="Note des clients"
          value={stats.rating?.average != null ? `${stats.rating.average.toLocaleString('fr-FR')}/5` : '—'}
          hint={ratingLabel(stats.rating)}
        />
      </div>

      {nothingYet ? (
        <EmptyState
          icon={isVenue ? <Building2 className="h-7 w-7" /> : <Briefcase className="h-7 w-7" />}
          title="Pas encore de demande"
          description="Vos chiffres apparaîtront ici dès la première demande de devis. Une fiche complète avec photos attire plus de clients."
          action={
            <Link href={isVenue ? '/dashboard/rooms' : '/dashboard/marketplace'}>
              <Button>{isVenue ? 'Compléter mes salles' : 'Compléter mes offres'}</Button>
            </Link>
          }
        />
      ) : (
        <>
          <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Chiffre confirmé par mois</h2>
              <button
                type="button"
                onClick={() => setShowTable((v) => !v)}
                className="min-h-11 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-[var(--radius-button)]"
              >
                {showTable ? 'Voir le graphique' : 'Voir en tableau'}
              </button>
            </div>
            {showTable ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-muted">
                    <tr>
                      <th className="py-2 pr-3 font-semibold">Mois</th>
                      <th className="py-2 pr-3 font-semibold text-right">Vues</th>
                      <th className="py-2 pr-3 font-semibold text-right">Demandes</th>
                      <th className="py-2 pr-3 font-semibold text-right">Réservations</th>
                      <th className="py-2 font-semibold text-right">Chiffre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((m) => (
                      <tr key={m.month} className="border-t border-border">
                        <td className="py-2 pr-3">{monthLabel(m.month, true)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{m.views ?? 0}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{m.inquiries}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{m.confirmedBookings}</td>
                        <td className="py-2 text-right tabular-nums">{formatFc(m.revenueFc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-2">
                <RevenueBars months={months} />
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-foreground">Commission EventMaster ({commissionPct} %)</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">À régler</dt>
                  <dd className="font-semibold tabular-nums text-foreground">{formatFc(bookings.commissionDueFc)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Déjà payée</dt>
                  <dd className="tabular-nums text-foreground">{formatFc(bookings.commissionPaidFc)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-muted">
                Calculée sur les réservations confirmées. Elle est marquée payée par EventMaster à réception de votre versement.
              </p>
            </section>

            <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-foreground">Réservations par étape</h2>
              <dl className="mt-3 space-y-2 text-sm">
                {[
                  ['REQUESTED', 'À accepter'],
                  ['ACCEPTED', 'En attente d’acompte'],
                  ['CONFIRMED', 'Confirmées à venir'],
                  ['COMPLETED', 'Terminées'],
                  ['CANCELLED', 'Annulées ou refusées'],
                ].map(([key, label]) => (
                  <div key={key} className="flex justify-between gap-3">
                    <dt className="text-muted">{label}</dt>
                    <dd className="tabular-nums text-foreground">{bookings.byStatus[key] ?? 0}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>

          {topOffers.length > 0 ? (
            <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-foreground">{isVenue ? 'Vos salles et offres' : 'Vos offres'}</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-muted">
                    <tr>
                      <th className="py-2 pr-3 font-semibold">Fiche</th>
                      <th className="py-2 pr-3 font-semibold text-right">Vues</th>
                      <th className="py-2 pr-3 font-semibold text-right">Demandes</th>
                      <th className="py-2 pr-3 font-semibold text-right">Réservations</th>
                      <th className="py-2 font-semibold text-right">Chiffre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topOffers.map((offer) => (
                      <tr key={`${offer.kind}-${offer.id}`} className="border-t border-border">
                        <td className="py-2 pr-3">
                          <span className="font-medium text-foreground">{offer.title}</span>
                          {!offer.isPublic ? <span className="ml-2 text-xs text-muted">(hors ligne)</span> : null}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{offer.views ?? 0}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{offer.inquiries}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{offer.confirmedBookings}</td>
                        <td className="py-2 text-right tabular-nums">{formatFc(offer.revenueFc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
