'use client';

import React, { useId, useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * Graphiques de la page Statistiques, en SVG simple (aucune bibliothèque).
 * Couleurs : celles des statuts de l'app (vert confirmé, ambre sans réponse, gris décliné),
 * reprises par variables CSS pour suivre le mode sombre.
 */

export const RSVP_SERIES = [
  { key: 'accepted', label: 'Confirmés', color: 'var(--primary)' },
  { key: 'pending', label: 'Sans réponse', color: 'var(--festive-accent)' },
  { key: 'declined', label: 'Déclinés', color: 'color-mix(in srgb, var(--muted) 45%, var(--surface))' },
] as const;

export type RsvpKey = (typeof RSVP_SERIES)[number]['key'];
export type RsvpCounts = Record<RsvpKey, number>;

const nf = new Intl.NumberFormat('fr-FR');
const fmt = (n: number) => nf.format(n);
const share = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

/** Carte d'un graphique : titre en casse normale, chiffre clé à droite. */
export function ChartCard({
  title,
  value,
  children,
  className,
}: {
  title: string;
  value?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('min-w-0 rounded-[var(--radius-card)] border border-border bg-surface p-5', className)}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        {value != null ? <span className="shrink-0 text-sm tabular-nums text-muted">{value}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Swatch({ color }: { color: string }) {
  return <span aria-hidden className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: color }} />;
}

/* ------------------------------------------------------------------ */
/* Anneau des réponses                                                 */
/* ------------------------------------------------------------------ */

export function RsvpDonut({ counts }: { counts: RsvpCounts }) {
  const [active, setActive] = useState<RsvpKey | null>(null);
  const total = counts.accepted + counts.pending + counts.declined;
  const size = 176;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const visible = RSVP_SERIES.filter((s) => counts[s.key] > 0);
  // 2 px d'écart entre segments, seulement s'il y en a plusieurs.
  const gap = visible.length > 1 ? 2 : 0;

  const lengths = visible.map((s) => (counts[s.key] / total) * c);
  const arcs = visible.map((s, i) => ({
    ...s,
    dash: Math.max(0, lengths[i] - gap),
    offset: lengths.slice(0, i).reduce((sum, len) => sum + len, 0),
  }));

  const focus = active ? RSVP_SERIES.find((s) => s.key === active)! : null;
  const centerValue = focus ? fmt(counts[focus.key]) : `${share(counts.accepted + counts.declined, total)} %`;
  const centerLabel = focus ? `${focus.label.toLowerCase()} · ${share(counts[focus.key], total)} %` : 'ont répondu';

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={RSVP_SERIES.map((s) => `${s.label} : ${counts[s.key]}`).join(', ')}
          className="-rotate-90"
        >
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-muted)" strokeWidth={stroke} />
          {arcs.map((a) => (
            <circle
              key={a.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={active === a.key ? stroke + 4 : stroke}
              strokeDasharray={`${a.dash} ${c - a.dash}`}
              strokeDashoffset={-a.offset}
              className="cursor-pointer transition-[stroke-width,opacity] duration-150"
              opacity={active && active !== a.key ? 0.35 : 1}
              onMouseEnter={() => setActive(a.key)}
              onMouseLeave={() => setActive(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[28px] font-semibold leading-none tabular-nums text-foreground">{centerValue}</span>
          <span className="mt-1.5 max-w-[110px] text-xs text-muted">{centerLabel}</span>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-1">
        {RSVP_SERIES.map((s) => (
          <li key={s.key}>
            <button
              type="button"
              onMouseEnter={() => setActive(s.key)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(s.key)}
              onBlur={() => setActive(null)}
              className={cn(
                'flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm transition-colors',
                active === s.key ? 'bg-surface-muted' : 'hover:bg-surface-muted/60',
              )}
            >
              <Swatch color={s.color} />
              <span className="min-w-0 flex-1 text-foreground">{s.label}</span>
              <span className="tabular-nums font-medium text-foreground">{fmt(counts[s.key])}</span>
              <span className="w-11 text-right tabular-nums text-muted">{share(counts[s.key], total)} %</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Barres empilées par catégorie                                       */
/* ------------------------------------------------------------------ */

export function CategoryBars({ rows }: { rows: Array<{ label: string } & RsvpCounts> }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...rows.map((r) => r.accepted + r.pending + r.declined));

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {rows.map((row) => {
          const total = row.accepted + row.pending + row.declined;
          const isHover = hover === row.label;
          return (
            <li
              key={row.label}
              onMouseEnter={() => setHover(row.label)}
              onMouseLeave={() => setHover(null)}
              className="space-y-1.5"
            >
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-foreground">{row.label}</span>
                <span className="shrink-0 tabular-nums text-muted">
                  {isHover
                    ? RSVP_SERIES.filter((s) => row[s.key] > 0)
                        .map((s) => `${row[s.key]} ${s.label.toLowerCase()}`)
                        .join(' · ')
                    : fmt(total)}
                </span>
              </div>
              <div
                className="flex h-2.5 gap-[2px]"
                style={{ width: `${(total / max) * 100}%`, minWidth: total > 0 ? 6 : 0 }}
                role="img"
                aria-label={`${row.label} : ${RSVP_SERIES.map((s) => `${row[s.key]} ${s.label.toLowerCase()}`).join(', ')}`}
              >
                {RSVP_SERIES.filter((s) => row[s.key] > 0).map((s) => (
                  <span
                    key={s.key}
                    className="h-full first:rounded-l-[4px] last:rounded-r-[4px]"
                    style={{ flexGrow: row[s.key], flexBasis: 0, background: s.color }}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {RSVP_SERIES.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <Swatch color={s.color} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Colonnes dans le temps (arrivées, ventes)                           */
/* ------------------------------------------------------------------ */

export type TimeBucket = { label: string; shortLabel: string; value: number };

export function TimeColumns({
  buckets,
  unit,
  color = 'var(--primary)',
}: {
  buckets: TimeBucket[];
  /** Unité affichée dans l'infobulle : « entrées », « billets »… */
  unit: (n: number) => string;
  color?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const titleId = useId();
  const max = Math.max(1, ...buckets.map((b) => b.value));
  const height = 140;
  // Une étiquette d'axe toutes les n colonnes pour éviter les chevauchements.
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 6));
  const hovered = hover != null ? buckets[hover] : null;

  return (
    <div className="space-y-2" aria-describedby={titleId}>
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border" aria-hidden />
        <span className="pointer-events-none absolute right-0 -top-5 text-[11px] tabular-nums text-muted">{fmt(max)}</span>
        <div className="flex items-end gap-[2px] border-b border-border" style={{ height }} role="list">
          {buckets.map((b, i) => (
            <div
              key={b.label}
              role="listitem"
              aria-label={`${b.label} : ${b.value} ${unit(b.value)}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className="flex h-full min-w-0 flex-1 cursor-default items-end"
            >
              <div
                className="mx-auto w-full max-w-[28px] rounded-t-[4px] transition-opacity"
                style={{
                  height: b.value > 0 ? `${Math.max(3, (b.value / max) * 100)}%` : 0,
                  background: color,
                  opacity: hover != null && hover !== i ? 0.45 : 1,
                }}
              />
            </div>
          ))}
        </div>
        {hovered ? (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-sm"
            style={{ left: `${((hover! + 0.5) / buckets.length) * 100}%` }}
          >
            <span className="font-semibold tabular-nums text-foreground">{fmt(hovered.value)}</span>{' '}
            <span className="text-muted">{unit(hovered.value)} · {hovered.label}</span>
          </div>
        ) : null}
      </div>
      <div className="flex gap-[2px] text-[11px] tabular-nums text-muted" id={titleId}>
        {buckets.map((b, i) => (
          <span key={b.label} className="min-w-0 flex-1 overflow-visible whitespace-nowrap">
            {i % labelEvery === 0 ? b.shortLabel : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Regroupement par tranche de temps                                   */
/* ------------------------------------------------------------------ */

const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

/** Arrivées par quart d'heure (ou par heure si la soirée dure plus de 6 h). */
export function bucketArrivals(times: Date[]): TimeBucket[] {
  if (times.length === 0) return [];
  const sorted = [...times].sort((a, b) => a.getTime() - b.getTime());
  const spanH = (sorted[sorted.length - 1].getTime() - sorted[0].getTime()) / 3_600_000;
  const step = (spanH > 6 ? 60 : 15) * 60_000;
  const start = Math.floor(sorted[0].getTime() / step) * step;
  const end = Math.floor(sorted[sorted.length - 1].getTime() / step) * step;
  const count = Math.min(48, Math.round((end - start) / step) + 1);
  const buckets: TimeBucket[] = Array.from({ length: Math.max(count, 8) }, (_, i) => {
    const t = new Date(start + i * step);
    const label = timeFmt.format(t);
    return { label, shortLabel: label, value: 0 };
  });
  for (const t of sorted) {
    const i = Math.min(buckets.length - 1, Math.floor((t.getTime() - start) / step));
    buckets[i].value += 1;
  }
  return buckets;
}

/** Valeurs par jour (ou par semaine au-delà de 45 jours), avec les jours vides. */
export function bucketByDay(items: Array<{ at: Date; value: number }>): TimeBucket[] {
  if (items.length === 0) return [];
  const day = 86_400_000;
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const sorted = [...items].sort((a, b) => a.at.getTime() - b.at.getTime());
  const first = startOf(sorted[0].at);
  const last = startOf(sorted[sorted.length - 1].at);
  const spanDays = Math.round((last - first) / day) + 1;
  const step = spanDays > 45 ? 7 * day : day;
  const count = Math.max(Math.floor((last - first) / step) + 1, 7);
  const buckets: TimeBucket[] = Array.from({ length: count }, (_, i) => {
    const t = new Date(first + i * step);
    const short = dayFmt.format(t);
    return { label: step > day ? `semaine du ${short}` : short, shortLabel: short, value: 0 };
  });
  for (const it of sorted) {
    const i = Math.min(buckets.length - 1, Math.floor((startOf(it.at) - first) / step));
    buckets[i].value += it.value;
  }
  return buckets;
}

/* ------------------------------------------------------------------ */
/* Répartition des réponses à une question                             */
/* ------------------------------------------------------------------ */

const ANSWER_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'];
const OTHER_COLOR = 'color-mix(in srgb, var(--muted) 40%, var(--surface))';

/**
 * Une barre découpée par réponse + la liste des réponses avec leur pastille.
 * La couleur suit la réponse (ordre de `order` s'il est donné, sinon alphabétique), jamais son rang : « Jus » garde sa couleur
 * quand les comptes changent. Au-delà de 6 réponses, les plus rares sont regroupées dans « Autres ».
 */
export function AnswerBreakdown({
  items,
  order,
}: {
  items: Array<{ label: string; count: number }>;
  /** Ordre fixe des réponses connues (ex. « Oui » avant « Non ») pour attribuer les couleurs. */
  order?: readonly string[];
}) {
  const [hover, setHover] = useState<string | null>(null);
  const nonEmpty = items.filter((i) => i.count > 0);
  const total = nonEmpty.reduce((sum, i) => sum + i.count, 0);
  if (total === 0) return null;

  const byCount = [...nonEmpty].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'));
  const kept = byCount.length > ANSWER_COLORS.length ? byCount.slice(0, ANSWER_COLORS.length - 1) : byCount;
  const rest = byCount.slice(kept.length);
  const colorOf = new Map(
    [...kept]
      .sort((a, b) => {
        const ia = order?.indexOf(a.label) ?? -1;
        const ib = order?.indexOf(b.label) ?? -1;
        if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
        return a.label.localeCompare(b.label, 'fr');
      })
      .map((i, idx) => [i.label, ANSWER_COLORS[idx]]),
  );
  const rows = [
    ...kept.map((i) => ({ ...i, color: colorOf.get(i.label)! })),
    ...(rest.length > 0
      ? [{ label: 'Autres', count: rest.reduce((sum, i) => sum + i.count, 0), color: OTHER_COLOR }]
      : []),
  ];

  return (
    <div className="space-y-2.5">
      <div
        className="flex h-2 gap-[2px]"
        role="img"
        aria-label={rows.map((r) => `${r.label} : ${r.count}`).join(', ')}
      >
        {rows.map((r) => (
          <span
            key={r.label}
            onMouseEnter={() => setHover(r.label)}
            onMouseLeave={() => setHover(null)}
            className="h-full first:rounded-l-[4px] last:rounded-r-[4px] transition-opacity"
            style={{
              flexGrow: r.count,
              flexBasis: 0,
              background: r.color,
              opacity: hover && hover !== r.label ? 0.35 : 1,
            }}
          />
        ))}
      </div>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li
            key={r.label}
            onMouseEnter={() => setHover(r.label)}
            onMouseLeave={() => setHover(null)}
            className={cn(
              '-mx-1.5 flex items-center gap-2 rounded-md px-1.5 py-0.5 text-xs transition-colors',
              hover === r.label && 'bg-surface-muted',
            )}
          >
            <Swatch color={r.color} />
            <span className="min-w-0 flex-1 break-words text-foreground">{r.label}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {fmt(r.count)} · {share(r.count, total)} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
