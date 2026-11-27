'use client';
/* eslint-disable @next/next/no-img-element -- vignettes de filtres : image de l’utilisateur */

import React from 'react';
import {
  TEMPLATE_IMAGE_ASPECTS,
  TEMPLATE_IMAGE_BLENDS,
  TEMPLATE_IMAGE_FADES,
  TEMPLATE_IMAGE_FILTERS,
  TEMPLATE_IMAGE_OVERLAY_DIRECTIONS,
  TEMPLATE_IMAGE_SHAPES,
  templateImageFadeStyle,
  templateImageShapeStyle,
  type TemplateImageEffects,
} from '@/lib/templateImageEffects';
import { TEMPLATE_ILLUSTRATIONS } from '@/lib/templateIllustrations';
import { ChevronDown, RotateCcw } from '@/components/icons';

export type ImageEffectsElement = TemplateImageEffects & {
  imageUrl?: string;
  illustrationId?: string;
  illustrationColor?: string;
  illustrationColor2?: string;
};

type Patch = Partial<ImageEffectsElement>;

const chip = (active: boolean) =>
  `min-h-8 px-2 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
    active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-foreground hover:bg-surface-muted'
  }`;

function Section({
  title,
  defaultOpen = false,
  active = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group rounded-xl border border-border bg-surface">
      <summary className="list-none flex items-center justify-between gap-2 px-3 py-2 cursor-pointer select-none text-xs font-bold text-foreground [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-1.5">
          {title}
          {active && <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-label="(actif)" />}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-muted transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className="px-3 pb-3 pt-1 space-y-2.5">{children}</div>
    </details>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="flex items-center justify-between text-xs text-muted">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums">
          {Number.isInteger(step) ? value : value.toFixed(1)}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--primary)] cursor-pointer"
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
  allowEmpty,
  emptyLabel = 'Transparent',
}: {
  label: string;
  value?: string;
  onChange: (v: string | undefined) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  const empty = !value;
  return (
    <div className="space-y-1">
      <span className="block text-xs font-semibold text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value && /^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
          className={`w-8 h-8 shrink-0 rounded-lg border border-border bg-surface cursor-pointer ${empty ? 'opacity-40' : ''}`}
          aria-label={label}
        />
        <input
          type="text"
          value={value || ''}
          placeholder={allowEmpty ? emptyLabel : '#000000'}
          onChange={(e) => onChange(e.target.value.trim() || undefined)}
          className="min-w-0 flex-1 px-2 py-1.5 bg-surface-muted border border-border rounded-lg text-xs font-mono focus:outline-none focus:border-primary"
        />
        {allowEmpty && !empty && (
          <button type="button" onClick={() => onChange(undefined)} className={chip(false)} title={emptyLabel}>
            ∅
          </button>
        )}
      </div>
    </div>
  );
}

const QUICK_COLORS = ['#c5a059', '#6b1d2f', '#1d2d44', '#7d8c5c', '#e8c5c8', '#b05a47', '#111111', '#ffffff'];

/** Réglages avancés d’une image : forme, fondu, voile dégradé, cadrage, filtre, opacité, rotation. */
export default function ImageEffectsPanel({
  el,
  onChange,
}: {
  el: ImageEffectsElement;
  onChange: (patch: Patch) => void;
}) {
  const shape = el.imageShape || 'none';
  const fade = el.imageFade || 'none';
  const zoom = el.imageZoom ?? 1;
  const fx = el.imageFocusX ?? 50;
  const fy = el.imageFocusY ?? 50;
  const aspect = el.imageAspect || 'auto';
  const filter = el.imageFilter || 'none';
  const overlayOn = Boolean(el.imageOverlayColor);
  const isIllustration = Boolean(el.illustrationId && TEMPLATE_ILLUSTRATIONS.some((i) => i.id === el.illustrationId));
  const cropActive = zoom !== 1 || fx !== 50 || fy !== 50 || aspect !== 'auto';
  const adjustActive =
    (el.imageOpacity ?? 100) !== 100 || (el.imageRotation ?? 0) !== 0 || Boolean(el.imageFlipX) || Boolean(el.imageShadow);

  return (
    <div className="space-y-2" data-testid="image-effects-panel">
      {isIllustration && (
        <Section title="Couleur de l’illustration" defaultOpen active>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange({ illustrationColor: c })}
                className={`w-6 h-6 rounded-full border shadow-sm transition hover:scale-110 ${
                  el.illustrationColor === c ? 'ring-2 ring-primary ring-offset-1 border-primary' : 'border-border'
                }`}
                style={{ backgroundColor: c }}
                title={c}
                aria-label={`Couleur ${c}`}
              />
            ))}
          </div>
          <ColorField label="Couleur" value={el.illustrationColor} onChange={(v) => onChange({ illustrationColor: v || '#c5a059' })} />
          <ColorField
            label="Seconde couleur (dégradé)"
            value={el.illustrationColor2}
            allowEmpty
            emptyLabel="Aucune (couleur unie)"
            onChange={(v) => onChange({ illustrationColor2: v })}
          />
        </Section>
      )}

      <Section title="Forme" defaultOpen={!isIllustration} active={shape !== 'none'}>
        <div className="grid grid-cols-5 gap-1">
          {TEMPLATE_IMAGE_SHAPES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange({ imageShape: s.id })}
              className={`${chip(shape === s.id)} flex items-center justify-center !px-0 aspect-square`}
              title={s.label}
              aria-label={`Forme : ${s.label}`}
              aria-pressed={shape === s.id}
            >
              <span
                className={`block w-5 h-5 ${s.id === 'none' ? 'border border-dashed border-muted rounded-sm' : 'bg-current opacity-70'}`}
                style={s.id === 'none' ? undefined : templateImageShapeStyle(s.id)}
                aria-hidden
              />
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted">
          Forme : <span className="font-semibold text-foreground">{TEMPLATE_IMAGE_SHAPES.find((s) => s.id === shape)?.label}</span>
        </p>
      </Section>

      <Section title="Fondu (dégradé vers le fond)" active={fade !== 'none'}>
        <div className="grid grid-cols-4 gap-1">
          {TEMPLATE_IMAGE_FADES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onChange({ imageFade: f.id })}
              className={`${chip(fade === f.id)} flex items-center justify-center !px-0 aspect-square`}
              title={f.label}
              aria-label={`Fondu : ${f.label}`}
              aria-pressed={fade === f.id}
            >
              <span className="block w-6 h-6 rounded-sm bg-current opacity-70" style={templateImageFadeStyle(f.id, 55)} aria-hidden />
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted">
          Fondu : <span className="font-semibold text-foreground">{TEMPLATE_IMAGE_FADES.find((f) => f.id === fade)?.label}</span>
        </p>
        {fade !== 'none' && (
          <Slider label="Longueur du fondu" value={el.imageFadeSize ?? 40} min={5} max={95} unit=" %" onChange={(v) => onChange({ imageFadeSize: v })} />
        )}
      </Section>

      <Section title="Voile dégradé" active={overlayOn}>
        <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={overlayOn}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? { imageOverlayColor: '#000000', imageOverlayOpacity: el.imageOverlayOpacity ?? 60, imageOverlayDirection: el.imageOverlayDirection || 'to bottom' }
                  : { imageOverlayColor: undefined },
              )
            }
            className="accent-[var(--primary)]"
          />
          Ajouter un voile de couleur sur l’image
        </label>
        {overlayOn && (
          <>
            <ColorField label="Couleur" value={el.imageOverlayColor} onChange={(v) => onChange({ imageOverlayColor: v || '#000000' })} />
            <ColorField
              label="Vers"
              value={el.imageOverlayColor2}
              allowEmpty
              onChange={(v) => onChange({ imageOverlayColor2: v })}
            />
            <div className="space-y-1">
              <span className="block text-xs font-semibold text-muted">Direction</span>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATE_IMAGE_OVERLAY_DIRECTIONS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onChange({ imageOverlayDirection: d.id })}
                    className={`${chip((el.imageOverlayDirection || 'to bottom') === d.id)} w-9`}
                    aria-pressed={(el.imageOverlayDirection || 'to bottom') === d.id}
                    title={d.id === 'radial' ? 'Depuis le centre' : `Vers ${d.label}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <Slider label="Intensité" value={el.imageOverlayOpacity ?? 60} min={0} max={100} unit=" %" onChange={(v) => onChange({ imageOverlayOpacity: v })} />
            <label className="block space-y-1">
              <span className="block text-xs font-semibold text-muted">Mélange</span>
              <select
                value={el.imageOverlayBlend || 'normal'}
                onChange={(e) => onChange({ imageOverlayBlend: e.target.value as ImageEffectsElement['imageOverlayBlend'] })}
                className="w-full px-3 py-1.5 bg-surface-muted border border-border rounded-lg text-xs focus:outline-none focus:border-primary"
              >
                {TEMPLATE_IMAGE_BLENDS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </Section>

      <Section title="Recadrage" active={cropActive}>
        <div className="space-y-1">
          <span className="block text-xs font-semibold text-muted">Format</span>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE_IMAGE_ASPECTS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onChange({ imageAspect: a.id })}
                className={chip(aspect === a.id)}
                aria-pressed={aspect === a.id}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <Slider label="Zoom" value={zoom} min={1} max={3} step={0.05} unit="×" onChange={(v) => onChange({ imageZoom: v })} />
        <Slider label="Position horizontale" value={fx} min={0} max={100} unit=" %" onChange={(v) => onChange({ imageFocusX: v })} />
        <Slider label="Position verticale" value={fy} min={0} max={100} unit=" %" onChange={(v) => onChange({ imageFocusY: v })} />
        <p className="text-[11px] text-muted leading-snug">Le recadrage ne modifie pas l’image d’origine : vous pouvez revenir en arrière à tout moment.</p>
        {cropActive && (
          <button
            type="button"
            onClick={() => onChange({ imageZoom: 1, imageFocusX: 50, imageFocusY: 50, imageAspect: 'auto' })}
            className={`${chip(false)} inline-flex items-center gap-1`}
          >
            <RotateCcw className="w-3 h-3" aria-hidden /> Réinitialiser le cadrage
          </button>
        )}
      </Section>

      {!isIllustration && (
        <Section title="Filtre" active={filter !== 'none'}>
          <div className="grid grid-cols-3 gap-1.5">
            {TEMPLATE_IMAGE_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onChange({ imageFilter: f.id })}
                className={`${chip(filter === f.id)} flex flex-col items-center gap-1 p-1`}
                aria-pressed={filter === f.id}
              >
                {el.imageUrl ? (
                  <img src={el.imageUrl} alt="" className="w-full h-10 object-cover rounded-md" style={{ filter: f.css || undefined }} />
                ) : (
                  <span className="block w-full h-10 rounded-md bg-gradient-to-br from-amber-200 to-rose-300" style={{ filter: f.css || undefined }} />
                )}
                <span className="text-[10px] leading-tight">{f.label}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section title="Transparence et rotation" active={adjustActive}>
        <Slider label="Opacité" value={el.imageOpacity ?? 100} min={5} max={100} unit=" %" onChange={(v) => onChange({ imageOpacity: v })} />
        <Slider label="Rotation" value={el.imageRotation ?? 0} min={-180} max={180} unit="°" onChange={(v) => onChange({ imageRotation: v })} />
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => onChange({ imageFlipX: !el.imageFlipX })} className={chip(Boolean(el.imageFlipX))} aria-pressed={Boolean(el.imageFlipX)}>
            Miroir
          </button>
          <button type="button" onClick={() => onChange({ imageShadow: !el.imageShadow })} className={chip(Boolean(el.imageShadow))} aria-pressed={Boolean(el.imageShadow)}>
            Ombre portée
          </button>
          {adjustActive && (
            <button
              type="button"
              onClick={() => onChange({ imageOpacity: 100, imageRotation: 0, imageFlipX: false, imageShadow: false })}
              className={`${chip(false)} inline-flex items-center gap-1`}
            >
              <RotateCcw className="w-3 h-3" aria-hidden /> Réinitialiser
            </button>
          )}
        </div>
      </Section>
    </div>
  );
}
