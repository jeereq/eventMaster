'use client';

/**
 * Bloc de rangées (cinéma, amphithéâtre, conférence) : tous les rangs du gradin
 * se règlent d’un coup depuis la rangée sélectionnée.
 *
 * Avant, chaque rang se modifiait seul : pour passer une salle de 11 à 12 rangs,
 * il fallait dupliquer, déplacer à l’œil, recopier l’élévation et renommer à la main ;
 * changer l’écart entre rangs voulait dire déplacer chaque rangée une à une.
 */
import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ListOrdered, Minus, Plus, Trash2, Wand2 } from '@/components/icons';
import { cn } from '@/lib/cn';
import { makeLayoutId, type RoomLayoutBlueprint } from '@/lib/roomLayoutUtils';
import { clampRowSeatCount, ROW_SEAT_MAX } from '@/lib/roomAmphitheaterGeom';
import {
  orderRowsFrontToBack,
  relabelRowBlock,
  respaceRowBlock,
  rowBlockAutoNumbering,
  rowBlockFocus,
  rowBlockRows,
  rowBlockStats,
  rowForBlockEdge,
  ROW_PITCH_MAX_M,
  ROW_PITCH_MIN_M,
  type RowNumbering,
} from '@/lib/roomRowBlock';

type Row = Extract<RoomLayoutBlueprint['furniture'][number], { kind: 'row' }>;

const BTN =
  'inline-flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-[var(--radius-button)] border border-border bg-surface text-sm font-medium text-foreground hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40 disabled:cursor-not-allowed';
const ICON_BTN =
  'inline-flex items-center justify-center min-h-11 min-w-11 rounded-[var(--radius-button)] text-muted hover:text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-30 disabled:cursor-not-allowed';
const FIELD =
  'w-full min-h-11 px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface text-base sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary';

const fmtM = (v: number) => `${v.toFixed(2).replace('.', ',')} m`;

/** Réglages de rangée recopiés sur tout le bloc par « Appliquer à tout le bloc ». */
const SHARED_ROW_KEYS = [
  'curve', 'aisleSplit', 'aisleWidthPct', 'sideAisleM', 'staggered', 'showSeatNumbers',
  'chairType', 'chairStyle', 'seatMaterial', 'chairSeatColor', 'chairFrameColor', 'chairImageUrl',
] as const;

export interface RowBlockPanelProps {
  blueprint: RoomLayoutBlueprint;
  rowId: string;
  maxRows: number;
  readOnly?: boolean;
  onChange: (next: RoomLayoutBlueprint, message: string, kind?: 'edit' | 'add' | 'delete') => void;
  onSelectRow: (id: string) => void;
  /** Gradin entier sélectionné : on y ajoute le nouveau rang au lieu de ne garder que lui. */
  onRowAdded?: (id: string) => void;
  onRowRemoved?: (id: string) => void;
  onLimit?: (message: string) => void;
}

export default function RowBlockPanel({ blueprint, rowId, maxRows, readOnly, onChange, onSelectRow, onRowAdded, onRowRemoved, onLimit }: RowBlockPanelProps) {
  const W = blueprint.canvas.widthM;
  const H = blueprint.canvas.heightM;
  const block = useMemo(() => rowBlockRows(blueprint.furniture, rowId) as Row[], [blueprint.furniture, rowId]);
  const focus = useMemo(() => rowBlockFocus(block, blueprint.fixtures), [block, blueprint.fixtures]);
  const ordered = useMemo(() => orderRowsFrontToBack(block, focus, W, H), [block, focus, W, H]);
  const stats = useMemo(() => rowBlockStats(ordered, focus, W, H), [ordered, focus, W, H]);
  const auto = useMemo(() => rowBlockAutoNumbering(ordered), [ordered]);

  const [numbering, setNumbering] = useState<RowNumbering>(auto?.numbering ?? 'letters');
  const [start, setStart] = useState(auto?.start ?? (auto?.numbering === 'numbers' ? '1' : 'A'));
  const [skipIO, setSkipIO] = useState(auto?.skipIO ?? true);
  const [allSeats, setAllSeats] = useState(String(ordered[0]?.seatCount ?? 12));
  const [growth, setGrowth] = useState(String(stats.seatGrowth));

  const selected = block.find((r) => r.id === rowId);
  if (!selected) return null;
  const totalRows = blueprint.furniture.filter((f) => f.kind === 'row').length;

  /** Applique des modifications par rangée en un seul pas d’historique. */
  const patchRows = (patches: Map<string, Partial<Row>>, message: string, extra?: { add?: Row[]; remove?: string; kind?: 'edit' | 'add' | 'delete' }) => {
    let furniture = blueprint.furniture
      .filter((f) => f.id !== extra?.remove)
      .map((f) => (f.kind === 'row' && patches.has(f.id) ? ({ ...f, ...patches.get(f.id) } as Row) : f));
    if (extra?.add?.length) furniture = [...furniture, ...extra.add];
    onChange({ ...blueprint, furniture }, message, extra?.kind ?? 'edit');
  };

  /** Prolonge la numérotation automatique (A, B, C…) après un ajout ou une suppression. */
  const renumberPatches = (rows: readonly Row[]) => {
    const fmt = rowBlockAutoNumbering(ordered);
    if (!fmt) return new Map<string, Partial<Row>>();
    return relabelRowBlock(rows, fmt) as Map<string, Partial<Row>>;
  };

  const addRow = (where: 'front' | 'back') => {
    if (totalRows >= maxRows) {
      onLimit?.(`Limite de ${maxRows} rangées atteinte`);
      return;
    }
    const draft = rowForBlockEdge(ordered, where, focus, W, H);
    if (!draft) {
      onLimit?.(where === 'back' ? 'Plus de place derrière le dernier rang : agrandissez la salle ou resserrez les rangs' : 'Plus de place devant le premier rang');
      return;
    }
    const groupId = selected.groupId ?? (block.length > 1 || selected.focusX != null ? undefined : makeLayoutId('rows'));
    const row = { ...draft, id: makeLayoutId('row'), ...(groupId ? { groupId } : {}) } as Row;
    const nextOrdered = where === 'back' ? [...ordered, row] : [row, ...ordered];
    const names = renumberPatches(nextOrdered);
    const patches = new Map<string, Partial<Row>>();
    if (groupId && !selected.groupId) patches.set(selected.id, { groupId });
    for (const [id, p] of names) if (id !== row.id) patches.set(id, { ...patches.get(id), ...p });
    const named = { ...row, ...names.get(row.id) } as Row;
    if (!names.has(row.id)) {
      named.label = where === 'back' ? `Rangée ${ordered.length + 1}` : 'Nouveau rang';
      delete named.rowName;
    }
    patchRows(patches, where === 'back' ? `Rang « ${named.label} » ajouté derrière` : `Rang « ${named.label} » ajouté devant`, { add: [named], kind: 'add' });
    (onRowAdded ?? onSelectRow)(named.id);
  };

  const removeRow = (id: string) => {
    if (block.length <= 1) return;
    const rest = ordered.filter((r) => r.id !== id);
    const gone = ordered.find((r) => r.id === id);
    patchRows(renumberPatches(rest), `Rang « ${gone?.label ?? ''} » retiré du bloc`, { remove: id, kind: 'delete' });
    if (onRowRemoved) onRowRemoved(id);
    else if (id === rowId && rest[0]) onSelectRow(rest[0].id);
  };

  const setSeats = (row: Row, count: number) => {
    const next = clampRowSeatCount(count);
    if (next === row.seatCount) return;
    patchRows(new Map([[row.id, { seatCount: next }]]), `${row.label} : ${next} fauteuils`);
  };

  const respace = (pitchM: number) => {
    const next = respaceRowBlock(ordered, focus, W, H, pitchM);
    if (!next) {
      onLimit?.('Le dernier rang sortirait de la salle : écart trop grand');
      return;
    }
    patchRows(next as Map<string, Partial<Row>>, `Écart entre rangs : ${fmtM(pitchM)}`);
  };

  const setRise = (riseM: number) => {
    const base = ordered[0]?.elevationM ?? 0;
    const patches = new Map<string, Partial<Row>>(
      ordered.map((r, i) => [r.id, { elevationM: Math.round((base + i * riseM) * 100) / 100 }]),
    );
    patchRows(patches, `Contremarche des gradins : ${fmtM(riseM)}`);
  };

  const applySeatsToAll = () => {
    const base = parseInt(allSeats, 10);
    const step = parseInt(growth, 10) || 0;
    if (!Number.isFinite(base)) return;
    const patches = new Map<string, Partial<Row>>(
      ordered.map((r, i) => [r.id, { seatCount: clampRowSeatCount(base + i * step) }]),
    );
    patchRows(patches, step ? `Fauteuils : ${base} au premier rang, +${step} par rang` : `${clampRowSeatCount(base)} fauteuils sur chaque rang`);
  };

  const copySettingsToBlock = () => {
    const shared: Partial<Row> = {};
    for (const key of SHARED_ROW_KEYS) {
      (shared as Record<string, unknown>)[key] = selected[key];
    }
    const patches = new Map<string, Partial<Row>>(ordered.filter((r) => r.id !== selected.id).map((r) => [r.id, shared]));
    patchRows(patches, `Réglages de « ${selected.label} » appliqués aux ${ordered.length} rangs`);
  };

  const renumber = () => {
    patchRows(
      relabelRowBlock(ordered, { numbering, start, skipIO }) as Map<string, Partial<Row>>,
      numbering === 'numbers' ? `Rangs numérotés à partir de ${start}` : `Rangs renommés à partir de ${start.toUpperCase()}`,
    );
  };

  const disabled = Boolean(readOnly);

  return (
    <section className="space-y-3 p-2.5 rounded bg-surface border border-border" aria-label="Bloc de rangées">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Bloc de rangées</p>
          <p className="text-xs text-muted">
            {stats.rows} rang{stats.rows > 1 ? 's' : ''} · {stats.seats} fauteuils
            {stats.rows > 1 ? ` · ${fmtM(stats.pitchM)} dos à dos` : ''}
          </p>
        </div>
      </div>

      {/* Les rangs, de l’écran vers le fond */}
      <ol className="max-h-64 overflow-y-auto -mx-1 divide-y divide-border/60" aria-label="Rangs du bloc, de l’avant vers le fond">
        {ordered.map((r) => {
          const active = r.id === rowId;
          return (
            <li key={r.id} className={cn('flex items-center gap-1 px-1 py-0.5', active && 'bg-primary/10 rounded')}>
              <button
                type="button"
                onClick={() => onSelectRow(r.id)}
                className="flex-1 min-w-0 min-h-11 text-left leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                aria-current={active ? 'true' : undefined}
              >
                <span className="block text-sm font-medium text-foreground truncate">{r.label || r.rowName || 'Rangée'}</span>
                {r.elevationM ? <span className="block text-xs text-muted tabular-nums">marche +{fmtM(r.elevationM)}</span> : null}
              </button>
              <button type="button" className={ICON_BTN} disabled={disabled || r.seatCount <= 2} onClick={() => setSeats(r, r.seatCount - 1)} aria-label={`Un fauteuil de moins sur ${r.label}`}>
                <Minus className="w-3.5 h-3.5" aria-hidden />
              </button>
              <span className="w-7 text-center text-sm font-semibold tabular-nums" aria-label={`${r.seatCount} fauteuils`}>{r.seatCount}</span>
              <button type="button" className={ICON_BTN} disabled={disabled || r.seatCount >= ROW_SEAT_MAX} onClick={() => setSeats(r, r.seatCount + 1)} aria-label={`Un fauteuil de plus sur ${r.label}`}>
                <Plus className="w-3.5 h-3.5" aria-hidden />
              </button>
              <button type="button" className={ICON_BTN} disabled={disabled || block.length <= 1} onClick={() => removeRow(r.id)} aria-label={`Retirer ${r.label}`}>
                <Trash2 className="w-3.5 h-3.5" aria-hidden />
              </button>
            </li>
          );
        })}
      </ol>

      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" className={BTN} disabled={disabled} onClick={() => addRow('front')}>
          <ArrowUp className="w-3.5 h-3.5" aria-hidden /> Rang devant
        </button>
        <button type="button" className={BTN} disabled={disabled} onClick={() => addRow('back')}>
          <ArrowDown className="w-3.5 h-3.5" aria-hidden /> Rang derrière
        </button>
      </div>

      {ordered.length > 1 && (
        <div className="space-y-2 pt-2 border-t border-border/60">
          <label className="block space-y-1">
            <span className="flex items-center justify-between text-xs font-semibold text-foreground">
              Écart entre rangs <span className="font-medium text-muted tabular-nums">{fmtM(stats.pitchM)}</span>
            </span>
            <input
              type="range"
              min={ROW_PITCH_MIN_M}
              max={ROW_PITCH_MAX_M}
              step={0.05}
              value={stats.pitchM}
              disabled={disabled}
              onChange={(e) => respace(parseFloat(e.target.value))}
              className="w-full accent-primary"
              aria-label="Écart entre rangs, dos à dos"
            />
            <span className="block text-xs text-muted">0,95 m en salle de conférence, 1,15 m en cinéma, 1,4 m et plus pour des fauteuils inclinables.</span>
          </label>
          <label className="block space-y-1">
            <span className="flex items-center justify-between text-xs font-semibold text-foreground">
              Hauteur de marche <span className="font-medium text-muted tabular-nums">{stats.riseM > 0 ? fmtM(stats.riseM) : 'à plat'}</span>
            </span>
            <input
              type="range"
              min={0}
              max={0.6}
              step={0.01}
              value={stats.riseM}
              disabled={disabled}
              onChange={(e) => setRise(parseFloat(e.target.value))}
              className="w-full accent-primary"
              aria-label="Hauteur de marche entre deux rangs"
            />
          </label>
        </div>
      )}

      <div className="space-y-1.5 pt-2 border-t border-border/60">
        <p className="text-xs font-semibold text-foreground">Fauteuils sur tous les rangs</p>
        <div className="grid grid-cols-2 gap-1.5 items-end">
          <label className="text-xs text-muted space-y-1">
            <span>1er rang</span>
            <input type="number" inputMode="numeric" min={2} max={ROW_SEAT_MAX} value={allSeats} onChange={(e) => setAllSeats(e.target.value)} className={FIELD} disabled={disabled} />
          </label>
          <label className="text-xs text-muted space-y-1">
            <span>Par rang</span>
            <select value={growth} onChange={(e) => setGrowth(e.target.value)} className={FIELD} disabled={disabled}>
              <option value="0">Égal</option>
              <option value="1">+1</option>
              <option value="2">+2</option>
              <option value="3">+3</option>
              <option value="-1">−1</option>
              <option value="-2">−2</option>
            </select>
          </label>
          <button type="button" className={cn(BTN, 'col-span-2')} disabled={disabled} onClick={applySeatsToAll}>Appliquer à tous les rangs</button>
        </div>
      </div>

      <div className="space-y-1.5 pt-2 border-t border-border/60">
        <p className="text-xs font-semibold text-foreground">Nommer les rangs</p>
        <div className="grid grid-cols-2 gap-1.5">
          <select value={numbering} onChange={(e) => { const n = e.target.value as RowNumbering; setNumbering(n); setStart(n === 'numbers' ? '1' : 'A'); }} className={FIELD} disabled={disabled} aria-label="Lettres ou chiffres">
            <option value="letters">A, B, C…</option>
            <option value="numbers">1, 2, 3…</option>
          </select>
          <input value={start} onChange={(e) => setStart(e.target.value.slice(0, 3))} className={FIELD} disabled={disabled} aria-label="Premier rang" placeholder={numbering === 'numbers' ? '1' : 'A'} />
        </div>
        {numbering === 'letters' && (
          <label className="flex items-center gap-2 min-h-11 text-sm text-foreground cursor-pointer">
            <input type="checkbox" checked={skipIO} onChange={(e) => setSkipIO(e.target.checked)} className="rounded border-border size-4" disabled={disabled} />
            <span>Sauter I et O <span className="text-muted">(lus 1 et 0)</span></span>
          </label>
        )}
        <button type="button" className={cn(BTN, 'w-full')} disabled={disabled} onClick={renumber}>
          <ListOrdered className="w-3.5 h-3.5" aria-hidden /> Renommer de l’écran vers le fond
        </button>
      </div>

      {ordered.length > 1 && !onRowAdded && (
        <button type="button" className={cn(BTN, 'w-full')} disabled={disabled} onClick={copySettingsToBlock} title="Courbure, allées, type, style, matière et couleurs de fauteuil">
          <Wand2 className="w-3.5 h-3.5" aria-hidden /> Appliquer les réglages de ce rang à tout le bloc
        </button>
      )}
    </section>
  );
}
