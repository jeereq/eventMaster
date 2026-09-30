'use client';

/**
 * Réglages libres de l’environnement 3D : abords (terrain, décor, espèces, relief)
 * et ciel (soleil, température, exposition, voile, brouillard).
 * Tout est stocké dans `metadata.environment` et appliqué en direct dans la vue 3D.
 */

import React, { useRef, useState } from 'react';
import { Dices, ImagePlus, RotateCcw, Sun, Trees } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  DEFAULT_EXTRA_SPECIES_COUNT,
  OUTDOOR_SURROUNDINGS_META,
  OUTDOOR_SURROUNDINGS_ORDER,
  SURROUNDING_FEATURE_LABELS,
  SURROUNDING_GROUND_OPTIONS,
  SURROUNDING_SPECIES_LABELS,
  SURROUNDING_SPECIES_ORDER,
  type EnvironmentSettings,
  type OutdoorSurroundings,
  type SurroundingFeature,
  type SurroundingSpecies,
} from '@/lib/roomOutdoorUtils';

/** Espèces présentes dans le décor de base de chaque type d’abords. */
const BASE_SPECIES: Record<Exclude<OutdoorSurroundings, 'none'>, SurroundingSpecies[]> = {
  garden: ['cypress', 'shrub', 'oak'],
  park: ['oak', 'shrub', 'boulder'],
  beach: ['palm', 'boulder'],
  countryside: ['olive', 'cypress'],
  forest: ['fir', 'oak', 'shrub'],
  courtyard: ['planter', 'olive', 'cypress'],
  desert: ['boulder', 'palm'],
  custom: [],
};

const BASE_FEATURES: Record<Exclude<OutdoorSurroundings, 'none'>, SurroundingFeature[]> = {
  garden: ['structures'],
  park: [],
  beach: ['water'],
  countryside: ['structures'],
  forest: [],
  courtyard: ['structures'],
  desert: ['water', 'relief'],
  custom: [],
};

type Props = {
  surroundings: OutdoorSurroundings;
  onSurroundingsChange: (value: OutdoorSurroundings) => void;
  env: EnvironmentSettings;
  /** `coalesceKey` : les changements successifs d’un même curseur forment une seule étape d’annulation. */
  onChange: (next: EnvironmentSettings, label: string, coalesceKey?: string) => void;
  /** Soleil du préréglage d’éclairage actif (valeurs affichées par défaut). */
  baseSun: { elevation: number; azimuth: number };
  onUploadGround?: (file: File) => Promise<string>;
  onClose?: () => void;
  titleId?: string;
};

const CHIP =
  'inline-flex items-center gap-1 min-h-9 px-3 rounded-full border text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';
const CHIP_ON = 'bg-primary/10 border-primary/40 text-primary';
const CHIP_OFF = 'bg-surface border-border text-muted hover:text-foreground';
const BTN =
  'inline-flex items-center justify-center gap-1 min-h-9 px-3 rounded-[var(--radius-button)] text-xs font-bold border bg-surface border-border text-foreground hover:bg-surface-muted transition-colors disabled:opacity-40';

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <label className="block" title={hint}>
      <span className="flex items-center justify-between text-xs font-semibold text-foreground">
        {label}
        <span className="tabular-nums text-muted font-medium">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-primary,#6d28d9)]"
      />
    </label>
  );
}

const pct = (v: number) => `${Math.round(v * 100)} %`;

export function RoomEnvironmentPanel({
  surroundings,
  onSurroundingsChange,
  env,
  onChange,
  baseSun,
  onUploadGround,
  onClose,
  titleId,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const hasSurroundings = surroundings !== 'none';
  const meta = hasSurroundings ? OUTDOOR_SURROUNDINGS_META[surroundings] : null;
  const baseSpecies = hasSurroundings ? BASE_SPECIES[surroundings] : [];
  const baseFeatures = hasSurroundings ? BASE_FEATURES[surroundings] : [];
  const hidden = new Set(env.hiddenSpecies ?? []);
  const extra = env.extraSpecies ?? {};
  const hiddenFeatures = new Set(env.hiddenFeatures ?? []);

  const set = (patch: Partial<EnvironmentSettings>, label: string, coalesceKey?: string) => {
    const next: EnvironmentSettings = { ...env, ...patch };
    for (const key of Object.keys(next) as (keyof EnvironmentSettings)[]) {
      if (next[key] === undefined) delete next[key];
    }
    onChange(next, label, coalesceKey);
  };

  const speciesActive = (sp: SurroundingSpecies) =>
    (baseSpecies.includes(sp) && !hidden.has(sp)) || (extra[sp] ?? 0) > 0;

  const toggleSpecies = (sp: SurroundingSpecies) => {
    const nextHidden = new Set(hidden);
    const nextExtra = { ...extra };
    if (speciesActive(sp)) {
      if (baseSpecies.includes(sp)) nextHidden.add(sp);
      delete nextExtra[sp];
      set(
        { hiddenSpecies: [...nextHidden], extraSpecies: Object.keys(nextExtra).length ? nextExtra : undefined },
        `${SURROUNDING_SPECIES_LABELS[sp]} retirés des abords`,
      );
    } else {
      nextHidden.delete(sp);
      if (!baseSpecies.includes(sp)) nextExtra[sp] = DEFAULT_EXTRA_SPECIES_COUNT;
      set(
        { hiddenSpecies: nextHidden.size ? [...nextHidden] : undefined, extraSpecies: Object.keys(nextExtra).length ? nextExtra : undefined },
        `${SURROUNDING_SPECIES_LABELS[sp]} ajoutés aux abords`,
      );
    }
  };

  const setExtraCount = (sp: SurroundingSpecies, count: number) => {
    const nextExtra = { ...extra, [sp]: count };
    if (count <= 0) delete nextExtra[sp];
    set({ extraSpecies: Object.keys(nextExtra).length ? nextExtra : undefined }, `${SURROUNDING_SPECIES_LABELS[sp]} : ${count}`, `extra-${sp}`);
  };

  const toggleFeature = (f: SurroundingFeature) => {
    const next = new Set(hiddenFeatures);
    if (next.has(f)) next.delete(f);
    else next.add(f);
    set({ hiddenFeatures: next.size ? [...next] : undefined }, `${SURROUNDING_FEATURE_LABELS[f]} ${next.has(f) ? 'masqués' : 'affichés'}`);
  };

  const handleGroundFile = async (file: File | undefined) => {
    if (!file || !onUploadGround) return;
    setUploading(true);
    setUploadError(null);
    try {
      const url = await onUploadGround(file);
      set({ groundUrl: url, groundTileM: env.groundTileM ?? 3 }, 'Terrain personnalisé importé');
    } catch {
      setUploadError('Import impossible. Réessayez avec une image JPG ou PNG de moins de 10 Mo.');
    } finally {
      setUploading(false);
    }
  };

  const groundValue = env.groundUrl ?? '';
  const customGround = !!env.groundUrl && !SURROUNDING_GROUND_OPTIONS.some((o) => o.url === env.groundUrl);

  return (
    <div className="w-full space-y-4" role="region" aria-labelledby={titleId}>
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div>
          <h4 id={titleId} className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Trees className="w-4 h-4 text-primary" aria-hidden />
            Environnement sur mesure
          </h4>
          <p className="text-xs text-muted">
            Terrain, décor, soleil et ciel : chaque réglage s’applique en direct dans la vue 3D.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={BTN}
            onClick={() => onChange({}, 'Environnement réinitialisé')}
            disabled={Object.keys(env).length === 0}
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden /> Réinitialiser
          </button>
          {onClose ? (
            <button type="button" className={BTN} onClick={onClose}>
              Fermer
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ───────── Abords ───────── */}
        <section className="space-y-3">
          <h5 className="text-[11px] font-semibold uppercase tracking-wide text-muted">Abords & terrain</h5>
          <label className="block text-xs font-semibold text-foreground">
            Décor de base
            <select
              value={surroundings}
              onChange={(e) => onSurroundingsChange(e.target.value as OutdoorSurroundings)}
              className="mt-1 w-full min-h-9 px-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
            >
              {OUTDOOR_SURROUNDINGS_ORDER.map((id) => (
                <option key={id} value={id}>
                  {id === 'none' ? 'Aucun (salle seule)' : OUTDOOR_SURROUNDINGS_META[id].label}
                </option>
              ))}
            </select>
          </label>
          {meta ? <p className="text-xs text-muted">{meta.hint}</p> : (
            <p className="text-xs text-muted">Choisissez un décor (ou « Sur mesure ») pour composer les abords.</p>
          )}

          {hasSurroundings ? (
            <>
              <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                <label className="block text-xs font-semibold text-foreground">
                  Terrain
                  <select
                    value={customGround ? '__custom' : groundValue}
                    onChange={(e) => {
                      const url = e.target.value;
                      if (url === '__custom') return;
                      const opt = SURROUNDING_GROUND_OPTIONS.find((o) => o.url === url);
                      set(
                        { groundUrl: url || undefined, groundTileM: opt?.tileM },
                        opt ? `Terrain : ${opt.label}` : 'Terrain du décor',
                      );
                    }}
                    className="mt-1 w-full min-h-9 px-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
                  >
                    <option value="">Celui du décor</option>
                    {SURROUNDING_GROUND_OPTIONS.map((o) => (
                      <option key={o.url} value={o.url}>{o.label}</option>
                    ))}
                    {customGround ? <option value="__custom">Image importée</option> : null}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-foreground" title="Teinte appliquée au terrain">
                  Teinte
                  <input
                    type="color"
                    value={env.groundTint ?? '#ffffff'}
                    onChange={(e) => set({ groundTint: e.target.value === '#ffffff' ? undefined : e.target.value }, 'Teinte du terrain', 'groundTint')}
                    className="mt-1 block h-9 w-12 rounded border border-border bg-surface"
                  />
                </label>
              </div>
              {onUploadGround ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      void handleGroundFile(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                  <button type="button" className={BTN} onClick={() => fileRef.current?.click()} disabled={uploading}>
                    <ImagePlus className="w-3.5 h-3.5" aria-hidden />
                    {uploading ? 'Import…' : 'Importer une texture de terrain'}
                  </button>
                  {env.groundTint ? (
                    <button type="button" className={BTN} onClick={() => set({ groundTint: undefined }, 'Teinte du terrain retirée')}>
                      Sans teinte
                    </button>
                  ) : null}
                </div>
              ) : null}
              {uploadError ? <p className="text-xs text-rose-700 dark:text-rose-400">{uploadError}</p> : null}
              {env.groundUrl ? (
                <Slider
                  label="Taille d’un motif de terrain"
                  value={env.groundTileM ?? 2.5}
                  min={0.5}
                  max={12}
                  step={0.1}
                  format={(v) => `${v.toFixed(1)} m`}
                  onChange={(v) => set({ groundTileM: v }, 'Échelle du terrain', 'groundTileM')}
                />
              ) : null}

              <div>
                <p className="text-xs font-semibold text-foreground mb-1.5">Végétation & décor</p>
                <div className="flex flex-wrap gap-1.5">
                  {SURROUNDING_SPECIES_ORDER.map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      aria-pressed={speciesActive(sp)}
                      onClick={() => toggleSpecies(sp)}
                      className={cn(CHIP, speciesActive(sp) ? CHIP_ON : CHIP_OFF)}
                    >
                      {SURROUNDING_SPECIES_LABELS[sp]}
                    </button>
                  ))}
                </div>
              </div>
              {Object.entries(extra).map(([sp, count]) => (
                <Slider
                  key={sp}
                  label={`${SURROUNDING_SPECIES_LABELS[sp as SurroundingSpecies]} ajoutés`}
                  value={count ?? 0}
                  min={0}
                  max={60}
                  step={1}
                  format={(v) => `${v}`}
                  onChange={(v) => setExtraCount(sp as SurroundingSpecies, v)}
                />
              ))}
              {baseFeatures.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {baseFeatures.map((f) => (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={!hiddenFeatures.has(f)}
                      onClick={() => toggleFeature(f)}
                      className={cn(CHIP, !hiddenFeatures.has(f) ? CHIP_ON : CHIP_OFF)}
                    >
                      {SURROUNDING_FEATURE_LABELS[f]}
                    </button>
                  ))}
                </div>
              ) : null}
              <Slider
                label="Densité du décor"
                value={env.density ?? 1}
                min={0}
                max={2.5}
                step={0.05}
                format={pct}
                onChange={(v) => set({ density: v === 1 ? undefined : v }, 'Densité du décor', 'density')}
              />
              <Slider
                label="Taille des arbres"
                value={env.vegetationScale ?? 1}
                min={0.4}
                max={2}
                step={0.05}
                format={pct}
                onChange={(v) => set({ vegetationScale: v === 1 ? undefined : v }, 'Taille de la végétation', 'vegetationScale')}
              />
              <Slider
                label="Distance du décor"
                value={env.spread ?? 1}
                min={0.5}
                max={2.5}
                step={0.05}
                format={pct}
                hint="Rapproche ou éloigne arbres et rochers de la salle"
                onChange={(v) => set({ spread: v === 1 ? undefined : v }, 'Distance du décor', 'spread')}
              />
              <button
                type="button"
                className={BTN}
                onClick={() => set({ seed: Math.floor(Math.random() * 100000) + 1 }, 'Nouvelle disposition du décor')}
              >
                <Dices className="w-3.5 h-3.5" aria-hidden /> Nouvelle disposition
              </button>
            </>
          ) : null}
        </section>

        {/* ───────── Soleil & ciel ───────── */}
        <section className="space-y-3">
          <h5 className="text-[11px] font-semibold uppercase tracking-wide text-muted flex items-center gap-1">
            <Sun className="w-3.5 h-3.5" aria-hidden /> Soleil, ciel & ambiance
          </h5>
          <Slider
            label="Hauteur du soleil"
            value={env.sunElevation ?? baseSun.elevation}
            min={2}
            max={89}
            step={1}
            format={(v) => `${Math.round(v)}°`}
            hint="Bas = lumière rasante et longues ombres, haut = midi"
            onChange={(v) => set({ sunElevation: v }, 'Hauteur du soleil', 'sunElevation')}
          />
          <Slider
            label="Orientation du soleil"
            value={env.sunAzimuth ?? baseSun.azimuth}
            min={0}
            max={360}
            step={1}
            format={(v) => `${Math.round(v)}°`}
            hint="Fait tourner la lumière autour de la salle"
            onChange={(v) => set({ sunAzimuth: v }, 'Orientation du soleil', 'sunAzimuth')}
          />
          <Slider
            label="Puissance du soleil / de la lune"
            value={env.sunIntensity ?? 1}
            min={0}
            max={3}
            step={0.05}
            format={pct}
            onChange={(v) => set({ sunIntensity: v === 1 ? undefined : v }, 'Puissance du soleil', 'sunIntensity')}
          />
          <Slider
            label="Température de la lumière"
            value={env.warmth ?? 0}
            min={-1}
            max={1}
            step={0.05}
            format={(v) => (Math.abs(v) < 0.03 ? 'Neutre' : v > 0 ? `Chaude ${Math.round(v * 100)} %` : `Froide ${Math.round(-v * 100)} %`)}
            onChange={(v) => set({ warmth: Math.abs(v) < 0.03 ? undefined : v }, 'Température de la lumière', 'warmth')}
          />
          <Slider
            label="Luminosité générale"
            value={env.exposure ?? 1}
            min={0.3}
            max={2.5}
            step={0.05}
            format={pct}
            onChange={(v) => set({ exposure: v === 1 ? undefined : v }, 'Luminosité générale', 'exposure')}
          />
          <Slider
            label="Voile du ciel"
            value={env.haze ?? 0}
            min={0}
            max={1}
            step={0.05}
            format={pct}
            hint="Ciel limpide ou laiteux (jour et crépuscule)"
            onChange={(v) => set({ haze: v === 0 ? undefined : v }, 'Voile du ciel', 'haze')}
          />
          <Slider
            label="Brouillard"
            value={env.fog ?? 0}
            min={0}
            max={1}
            step={0.05}
            format={pct}
            onChange={(v) => set({ fog: v }, 'Brouillard', 'fog')}
          />
          {env.fog !== undefined ? (
            <button type="button" className={BTN} onClick={() => set({ fog: undefined }, 'Brouillard automatique')}>
              Brouillard automatique
            </button>
          ) : null}
        </section>
      </div>
    </div>
  );
}
