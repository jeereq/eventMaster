'use client';

import React from 'react';
import {
  AlignCenterHorizontal,
  AlignEndVertical,
  AlignLeft,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  Lock,
  Unlock,
  RotateCcw,
} from '@/components/icons';
import { TEMPLATE_TEXT_SHADOWS, templateTextShadowCss, type TemplateElementEffects } from '@/lib/templateElementStyle';

export type AlignTarget = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

type ArrangeElement = TemplateElementEffects & { type: string; color?: string };

const ALIGNS: Array<{ id: AlignTarget; label: string; Icon: typeof Lock }> = [
  { id: 'left', label: 'Coller à gauche', Icon: AlignLeft },
  { id: 'center', label: 'Centrer horizontalement', Icon: AlignCenterHorizontal },
  { id: 'right', label: 'Coller à droite', Icon: AlignRight },
  { id: 'top', label: 'Coller en haut', Icon: AlignStartVertical },
  { id: 'middle', label: 'Centrer verticalement', Icon: AlignCenterVertical },
  { id: 'bottom', label: 'Coller en bas', Icon: AlignEndVertical },
];

const btn =
  'min-h-9 flex items-center justify-center rounded-lg border border-border bg-surface text-foreground hover:bg-surface-muted transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

/** Disposition d’un élément : alignement sur la carte, rotation, opacité, ombre du texte, verrou. */
export default function ElementArrangePanel({
  el,
  freeLayout,
  onChange,
  onAlign,
  onToggleLock,
}: {
  el: ArrangeElement;
  freeLayout: boolean;
  onChange: (patch: Partial<TemplateElementEffects>) => void;
  onAlign: (target: AlignTarget) => void;
  onToggleLock: () => void;
}) {
  const hasText = el.type === 'text' || el.type === 'button' || el.type === 'rsvp-block';
  const shadow = el.textShadow || 'none';
  const opacity = el.opacity ?? 100;
  const rotation = el.rotation ?? 0;
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-3" data-testid="element-arrange-panel">
      <span className="block text-xs font-bold text-foreground">Disposition et apparence</span>

      {freeLayout && (
        <>
          <div className="space-y-1">
            <span className="block text-xs font-semibold text-muted">Aligner sur la carte</span>
            <div className="grid grid-cols-6 gap-1">
              {ALIGNS.map(({ id, label, Icon }) => (
                <button key={id} type="button" onClick={() => onAlign(id)} disabled={el.locked} className={btn} title={label} aria-label={label}>
                  <Icon className="w-4 h-4" aria-hidden />
                </button>
              ))}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="flex items-center justify-between text-xs text-muted">
              <span className="font-semibold">Rotation</span>
              <span className="tabular-nums">{rotation}°</span>
            </span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={-180}
                max={180}
                value={rotation}
                disabled={el.locked}
                onChange={(e) => onChange({ rotation: Number(e.target.value) })}
                className="w-full accent-[var(--primary)] cursor-pointer"
              />
              {rotation !== 0 && !el.locked && (
                <button type="button" onClick={() => onChange({ rotation: 0 })} className={`${btn} px-2`} title="Remettre droit">
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden />
                </button>
              )}
            </div>
          </label>
        </>
      )}

      <label className="block space-y-1">
        <span className="flex items-center justify-between text-xs text-muted">
          <span className="font-semibold">Opacité</span>
          <span className="tabular-nums">{opacity} %</span>
        </span>
        <input
          type="range"
          min={5}
          max={100}
          value={opacity}
          onChange={(e) => onChange({ opacity: Number(e.target.value) })}
          className="w-full accent-[var(--primary)] cursor-pointer"
        />
      </label>

      {hasText && (
        <div className="space-y-1.5">
          <span className="block text-xs font-semibold text-muted">Ombre du texte (lisible sur une photo)</span>
          <div className="grid grid-cols-5 gap-1">
            {TEMPLATE_TEXT_SHADOWS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onChange({ textShadow: s.id })}
                aria-pressed={shadow === s.id}
                title={s.label}
                className={`${btn} flex-col !min-h-12 gap-0.5 text-[10px] font-semibold ${shadow === s.id ? '!border-primary !bg-primary/10 text-primary' : ''}`}
              >
                <span
                  className="text-base font-bold leading-none"
                  style={{ textShadow: templateTextShadowCss(s.id, el.textShadowColor), color: s.id === 'glow' || s.id === 'outline' ? '#334155' : undefined }}
                  aria-hidden
                >
                  Aa
                </span>
                {s.label}
              </button>
            ))}
          </div>
          {shadow !== 'none' && (
            <label className="flex items-center gap-2 text-xs text-muted">
              <span className="font-semibold">Couleur de l’ombre</span>
              <input
                type="color"
                value={el.textShadowColor && /^#[0-9a-f]{6}$/i.test(el.textShadowColor) ? el.textShadowColor : shadow === 'glow' || shadow === 'outline' ? '#ffffff' : '#000000'}
                onChange={(e) => onChange({ textShadowColor: e.target.value })}
                className="w-8 h-7 rounded border border-border cursor-pointer"
              />
            </label>
          )}
        </div>
      )}

      {freeLayout && (
        <button
          type="button"
          onClick={onToggleLock}
          aria-pressed={Boolean(el.locked)}
          className={`w-full min-h-9 inline-flex items-center justify-center gap-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
            el.locked ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100' : 'border-border bg-surface text-foreground hover:bg-surface-muted'
          }`}
        >
          {el.locked ? <Lock className="w-3.5 h-3.5" aria-hidden /> : <Unlock className="w-3.5 h-3.5" aria-hidden />}
          {el.locked ? 'Verrouillé : cliquer pour libérer' : 'Verrouiller la position'}
        </button>
      )}
    </div>
  );
}
