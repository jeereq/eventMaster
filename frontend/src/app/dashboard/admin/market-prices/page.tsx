'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ExternalLink, Globe, Loader2, X } from '@/components/icons';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Alert, Button, Card, CardHeader, EmptyState, PageHeader } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';

type MarketUnit = 'EVENT' | 'PERSON';

type ReferenceRow = {
  id: string;
  slot: string;
  city: string;
  unit: MarketUnit;
  lowFc: number;
  typicalFc: number;
  highFc: number;
  status: 'PROPOSED' | 'APPROVED';
  /** ai_web ou ai_facebook */
  source?: string;
  sources?: Array<{ title: string; url: string }> | null;
  rationale?: string | null;
  model?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
};

type ObservedRow = {
  slot: string;
  rawCount: number;
  stat: { unit: MarketUnit; lowFc: number; typicalFc: number; highFc: number; sampleCount?: number } | null;
};

type MarketPricesPayload = {
  city: string;
  slots: Array<{ slot: string; label: string }>;
  proposals: ReferenceRow[];
  approved: ReferenceRow[];
  observed: ObservedRow[];
};

const CITIES = [
  { id: 'Kinshasa', label: 'Kinshasa' },
  { id: 'Lubumbashi', label: 'Lubumbashi' },
  { id: '', label: 'Toutes villes' },
];

/** Lignes proposées par défaut : celles que le simulateur chiffre le plus souvent. */
const DEFAULT_SLOTS = ['venue', 'CATERING', 'DECORATION', 'DJ', 'PHOTOGRAPHY', 'RENTAL_CHAIRS'];

const selectClass =
  'bg-surface-muted border border-border rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary min-h-11';
const amountClass =
  'w-full bg-surface-muted border border-border rounded-lg px-2.5 py-2 text-sm tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 min-h-11';

function unitLabel(unit: MarketUnit) {
  return unit === 'PERSON' ? 'par invité' : 'forfait';
}

function channelLabel(source?: string) {
  return source === 'ai_facebook' ? 'Facebook' : 'Web';
}

function formatDay(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR');
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

function Sources({ sources }: { sources?: ReferenceRow['sources'] }) {
  if (!sources?.length) return null;
  return (
    <ul className="space-y-1">
      {sources.map((source) => (
        <li key={source.url} className="min-w-0">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex max-w-full items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            <span className="truncate">{source.title}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function ProposalCard({
  row,
  label,
  onChanged,
  onError,
}: {
  row: ReferenceRow;
  label: string;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const [low, setLow] = useState(String(row.lowFc));
  const [typical, setTypical] = useState(String(row.typicalFc));
  const [high, setHigh] = useState(String(row.highFc));
  const [unit, setUnit] = useState<MarketUnit>(row.unit);
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const dirty = low !== String(row.lowFc) || typical !== String(row.typicalFc) || high !== String(row.highFc) || unit !== row.unit;

  const approve = async () => {
    setBusy('approve');
    try {
      if (dirty) {
        await api.patch(`/admin/market-prices/${row.id}`, {
          lowFc: Number(low),
          typicalFc: Number(typical),
          highFc: Number(high),
          unit,
        });
      }
      await api.post(`/admin/market-prices/${row.id}/approve`);
      onChanged();
    } catch (err) {
      onError(errorMessage(err, 'Impossible de valider ce prix.'));
    } finally {
      setBusy(null);
    }
  };

  const reject = async () => {
    setBusy('reject');
    try {
      await api.post(`/admin/market-prices/${row.id}/reject`);
      onChanged();
    } catch (err) {
      onError(errorMessage(err, 'Impossible d’écarter ce prix.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <li className="rounded-[var(--radius-card)] border border-border/70 bg-surface p-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted">
          {channelLabel(row.source)} · {row.city || 'Toutes villes'} · trouvé le {formatDay(row.createdAt)}
        </p>
      </div>
      {row.rationale ? <p className="text-sm text-muted">{row.rationale}</p> : null}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <label className="text-xs text-muted space-y-1">
          <span>Bas (FC)</span>
          <input inputMode="numeric" value={low} onChange={(e) => setLow(e.target.value.replace(/\D/g, ''))} className={amountClass} />
        </label>
        <label className="text-xs text-muted space-y-1">
          <span>Typique (FC)</span>
          <input inputMode="numeric" value={typical} onChange={(e) => setTypical(e.target.value.replace(/\D/g, ''))} className={amountClass} />
        </label>
        <label className="text-xs text-muted space-y-1">
          <span>Haut (FC)</span>
          <input inputMode="numeric" value={high} onChange={(e) => setHigh(e.target.value.replace(/\D/g, ''))} className={amountClass} />
        </label>
        <label className="text-xs text-muted space-y-1">
          <span>Unité</span>
          <select value={unit} onChange={(e) => setUnit(e.target.value as MarketUnit)} className={amountClass}>
            <option value="EVENT">Forfait</option>
            <option value="PERSON">Par invité</option>
          </select>
        </label>
      </div>
      <Sources sources={row.sources} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => void approve()} loading={busy === 'approve'} disabled={busy !== null} leftIcon={<Check className="w-4 h-4" />}>
          {dirty ? 'Corriger et valider' : 'Valider'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => void reject()} loading={busy === 'reject'} disabled={busy !== null} leftIcon={<X className="w-4 h-4" />}>
          Écarter
        </Button>
      </div>
    </li>
  );
}

export default function AdminMarketPricesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [city, setCity] = useState('Kinshasa');
  const [data, setData] = useState<MarketPricesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<string[]>(DEFAULT_SLOTS);
  const [guestHint, setGuestHint] = useState('150');
  const [researching, setResearching] = useState(false);
  const [channel, setChannel] = useState<'web' | 'facebook'>('web');

  useEffect(() => {
    if (authLoading || !user) return;
    if (user.role !== 'SUPER_ADMIN') router.replace('/dashboard');
  }, [authLoading, user, router]);

  const isAdmin = user?.role === 'SUPER_ADMIN';

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const payload = (await api.get(`/admin/market-prices?city=${encodeURIComponent(city || 'ALL')}`)) as MarketPricesPayload;
      setData(payload);
    } catch (err) {
      setError(errorMessage(err, 'Impossible de charger les prix du marché.'));
    } finally {
      setLoading(false);
    }
  }, [city, isAdmin]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial des données
    void load();
  }, [load]);

  const labels = useMemo(
    () => Object.fromEntries((data?.slots || []).map((item) => [item.slot, item.label])) as Record<string, string>,
    [data?.slots],
  );

  const toggleSlot = (slot: string) => {
    setSelected((current) => (current.includes(slot) ? current.filter((item) => item !== slot) : [...current, slot].slice(0, 12)));
  };

  const research = async () => {
    setResearching(true);
    setError('');
    setNotice('');
    try {
      const result = (await api.post('/admin/market-prices/research', {
        city,
        slots: selected,
        channel,
        guestHint: Number(guestHint) || 150,
      })) as { proposals: ReferenceRow[]; notFound: string[] };
      const missed = result.notFound.map((slot) => labels[slot] || slot);
      setNotice(
        `${result.proposals.length} prix trouvé${result.proposals.length > 1 ? 's' : ''}.`
        + (missed.length ? ` Aucune source fiable pour : ${missed.join(', ')}.` : ''),
      );
      await load();
    } catch (err) {
      setError(errorMessage(err, 'La recherche de prix a échoué.'));
    } finally {
      setResearching(false);
    }
  };

  const withdraw = async (row: ReferenceRow) => {
    try {
      await api.post(`/admin/market-prices/${row.id}/reject`);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Impossible de retirer ce prix.'));
    }
  };

  if (authLoading || !user || user.role !== 'SUPER_ADMIN') return null;

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        note="Le simulateur de budget utilise ces prix seulement quand la marketplace n’a aucune offre pour une ligne. La ligne est alors marquée « Prix réels plateforme » ou « Prix du marché »."
        action={
          <select aria-label="Ville" value={city} onChange={(e) => setCity(e.target.value)} className={selectClass}>
            {CITIES.map((item) => (
              <option key={item.id || 'all'} value={item.id}>{item.label}</option>
            ))}
          </select>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}
      {notice ? <Alert variant="success">{notice}</Alert> : null}

      <Card>
        <CardHeader
          title="Rechercher des prix sur le web ou Facebook"
          description="L’IA cherche des prix publics récents et cite ses sources. Rien n’est utilisé avant votre validation."
        />
        <div className="space-y-4">
          <div role="radiogroup" aria-label="Où chercher" className="inline-flex gap-0.5 rounded-[10px] bg-surface-muted p-[3px]">
            {([
              { id: 'web', label: 'Tout le web' },
              { id: 'facebook', label: 'Pages Facebook publiques' },
            ] as const).map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={channel === option.id}
                onClick={() => setChannel(option.id)}
                className={`min-h-11 sm:min-h-9 px-3 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  channel === option.id ? 'bg-surface text-foreground shadow-[0_1px_3px_rgba(23,22,20,0.12)]' : 'text-muted hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(data?.slots || []).map((item) => {
              const active = selected.includes(item.slot);
              return (
                <button
                  key={item.slot}
                  type="button"
                  onClick={() => toggleSlot(item.slot)}
                  aria-pressed={active}
                  className={`min-h-11 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                    active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface-muted text-muted hover:text-foreground'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-muted space-y-1">
              <span>Invités de référence</span>
              <input
                inputMode="numeric"
                value={guestHint}
                onChange={(e) => setGuestHint(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className={`${amountClass} w-32`}
              />
            </label>
            <Button
              type="button"
              onClick={() => void research()}
              loading={researching}
              disabled={!selected.length || researching}
              leftIcon={<Globe className="w-4 h-4" />}
            >
              {researching ? 'Recherche en cours (jusqu’à 2 min)…' : `Rechercher ${selected.length} ligne${selected.length > 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </Card>

      {loading && !data ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
        </div>
      ) : null}

      {data ? (
        <>
          <Card>
            <CardHeader title={`À valider (${data.proposals.length})`} />
            {data.proposals.length ? (
              <ul className="space-y-3">
                {data.proposals.map((row) => (
                  <ProposalCard
                    key={row.id}
                    row={row}
                    label={labels[row.slot] || row.slot}
                    onChanged={() => void load()}
                    onError={setError}
                  />
                ))}
              </ul>
            ) : (
              <EmptyState title="Aucune proposition en attente" description="Lancez une recherche pour obtenir des prix du marché." />
            )}
          </Card>

          <Card>
            <CardHeader title={`Prix validés (${data.approved.length})`} />
            {data.approved.length ? (
              <ul className="divide-y divide-border/70">
                {data.approved.map((row) => (
                  <li key={row.id} className="py-3 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {labels[row.slot] || row.slot}
                        <span className="font-normal text-muted"> · {channelLabel(row.source)} · {row.city || 'Toutes villes'} · validé le {formatDay(row.reviewedAt)}</span>
                      </p>
                      <p className="text-sm tabular-nums">
                        {formatFc(row.lowFc)} · <strong>{formatFc(row.typicalFc)}</strong> · {formatFc(row.highFc)} {unitLabel(row.unit)}
                      </p>
                      <Sources sources={row.sources} />
                    </div>
                    <Button type="button" size="sm" variant="ghost" onClick={() => void withdraw(row)}>
                      Retirer
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Aucun prix validé" description="Les prix validés apparaissent ici." />
            )}
          </Card>

          <Card>
            <CardHeader
              title="Prix réels de la plateforme"
              description="Réservations acceptées et devis envoyés des 18 derniers mois. Utilisés en priorité dès 3 prix pour une ligne dans la ville."
            />
            {data.observed.length ? (
              <ul className="divide-y divide-border/70">
                {data.observed.map((row) => (
                  <li key={row.slot} className="py-3 flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{labels[row.slot] || row.slot}</span>
                    {row.stat ? (
                      <span className="text-sm tabular-nums">
                        {formatFc(row.stat.lowFc)} · <strong>{formatFc(row.stat.typicalFc)}</strong> · {formatFc(row.stat.highFc)} {unitLabel(row.stat.unit)}
                        <span className="text-muted"> ({row.stat.sampleCount} prix)</span>
                      </span>
                    ) : (
                      <span className="text-sm text-muted">{row.rawCount} prix, pas encore assez pour une estimation</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Pas encore de prix réels" description="Ils se remplissent avec les réservations et devis de la marketplace." />
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
