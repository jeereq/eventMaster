'use client';

import { MeterField } from '@/components/room/WallElevationEditor';

export type PlacementPatch = { x?: number; y?: number; w?: number; h?: number };

const round2 = (v: number) => Math.round(v * 100) / 100;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * Cotes et position d’un élément du plan, en mètres réels.
 * Le plan stocke tout en % du canvas : on convertit à l’affichage et à la saisie.
 * `anchor` dit si x/y désignent le coin haut-gauche (fixes, zones) ou le centre (tables, rangées, chaises).
 */
export function ItemPlacementFields({
  canvas,
  x,
  y,
  w,
  h,
  anchor,
  showSize = true,
  minSizeM = 0.1,
  disabled,
  onChange,
}: {
  canvas: { widthM: number; heightM: number };
  x: number;
  y: number;
  /** Largeur en % (requis si showSize, sinon sert à centrer). */
  w?: number;
  h?: number;
  anchor: 'topLeft' | 'center';
  showSize?: boolean;
  minSizeM?: number;
  disabled?: boolean;
  onChange: (patch: PlacementPatch, message: string) => void;
}) {
  const W = canvas.widthM;
  const H = canvas.heightM;
  const wPct = w ?? 0;
  const hPct = h ?? 0;
  const lengthM = (wPct / 100) * W;
  const depthM = (hPct / 100) * H;
  const posXM = (x / 100) * W;
  const posYM = (y / 100) * H;
  const centerX = anchor === 'topLeft' ? x + wPct / 2 : x;
  const centerY = anchor === 'topLeft' ? y + hPct / 2 : y;
  const isCenteredX = Math.abs(centerX - 50) < 0.05;
  const isCenteredY = Math.abs(centerY - 50) < 0.05;

  const setSize = (axis: 'w' | 'h', m: number) => {
    const total = axis === 'w' ? W : H;
    const pct = clamp((m / total) * 100, 0.1, 100);
    const patch: PlacementPatch = { [axis]: round2(pct) };
    // Un élément ancré en haut-gauche garde son centre : l’agrandissement est symétrique.
    if (anchor === 'topLeft') {
      const oldPct = axis === 'w' ? wPct : hPct;
      const pos = axis === 'w' ? x : y;
      const nextPos = clamp(pos - (pct - oldPct) / 2, 0, Math.max(0, 100 - pct));
      patch[axis === 'w' ? 'x' : 'y'] = round2(nextPos);
    }
    onChange(patch, axis === 'w' ? 'Longueur modifiée' : 'Largeur modifiée');
  };

  const setPos = (axis: 'x' | 'y', m: number) => {
    const total = axis === 'x' ? W : H;
    onChange({ [axis]: round2(clamp((m / total) * 100, 0, 100)) }, 'Position ajustée');
  };

  const center = (axis: 'x' | 'y') => {
    const size = axis === 'x' ? wPct : hPct;
    const next = anchor === 'topLeft' ? 50 - size / 2 : 50;
    onChange({ [axis]: round2(next) }, axis === 'x' ? 'Centré horizontalement' : 'Centré verticalement');
  };

  const btn =
    'min-h-11 flex-1 rounded-[var(--radius-button)] border border-border bg-surface px-2 text-xs font-semibold text-foreground hover:bg-surface-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

  return (
    <div className="space-y-2">
      {showSize ? (
        <div className="grid grid-cols-2 items-end gap-2">
          <MeterField label="Longueur" value={lengthM} min={minSizeM} max={W} disabled={disabled} onCommit={(m) => setSize('w', m)} />
          <MeterField label="Largeur" value={depthM} min={minSizeM} max={H} disabled={disabled} onCommit={(m) => setSize('h', m)} />
        </div>
      ) : null}
      <div className="grid grid-cols-2 items-end gap-2">
        <MeterField
          label="Depuis la gauche"
          value={posXM}
          max={W}
          disabled={disabled}
          onCommit={(m) => setPos('x', m)}
        />
        <MeterField
          label="Depuis le haut"
          value={posYM}
          max={H}
          disabled={disabled}
          onCommit={(m) => setPos('y', m)}
        />
      </div>
      <div className="flex gap-2">
        <button type="button" className={btn} disabled={disabled || isCenteredX} onClick={() => center('x')}>
          Centrer ↔
        </button>
        <button type="button" className={btn} disabled={disabled || isCenteredY} onClick={() => center('y')}>
          Centrer ↕
        </button>
      </div>
      <p className="text-xs text-muted">
        {anchor === 'topLeft'
          ? 'Distances mesurées du bord gauche et du haut du plan jusqu’au bord de l’élément.'
          : 'Distances mesurées du bord gauche et du haut du plan jusqu’au centre.'}
        {showSize ? ' Sur le plan, tirez les poignées aux coins et sur les côtés ; Maj garde les proportions.' : ''}
      </p>
    </div>
  );
}
