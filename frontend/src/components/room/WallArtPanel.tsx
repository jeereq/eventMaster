'use client';

/**
 * Panneau « Images et graffitis » du mur sélectionné : ajouter une photo, une affiche ou un logo,
 * ou écrire un graffiti, puis le placer (position, hauteur, taille) et choisir son habillage.
 */

import React, { useRef, useState } from 'react';
import { ImagePlus, Lock, SprayCan, Trash2 } from '@/components/icons';
import { cn } from '@/lib/cn';
import type { LayoutActionEntry } from '@/lib/layoutActionLog';
import { wallLengthMeters, type RoomLayoutBlueprint, type RoomWallSegment } from '@/lib/roomLayoutUtils';
import {
  GRAFFITI_BACKDROP_LABELS,
  GRAFFITI_EFFECT_LABELS,
  GRAFFITI_FONT_LABELS,
  GRAFFITI_PALETTES,
  GRAFFITI_STYLE_LABELS,
  WALL_ART_FACE_LABELS,
  WALL_ART_FRAME_LABELS,
  clampWallArt,
  createWallArt,
  graffitiAspect,
  graffitiEffects,
  sanitizeGraffitiText,
  wallArtFace,
  type GraffitiBackdrop,
  type GraffitiEffects,
  type GraffitiFont,
  type GraffitiStyle,
  type RoomWallArt,
  type WallArtFace,
  type WallArtFrame,
} from '@/lib/roomWallArt';

const FIELD = 'w-full min-h-11 px-3 rounded-[var(--radius-button)] border border-border bg-surface text-sm text-foreground';

/** Format d’une image (largeur / hauteur), lu avant l’envoi pour poser le bon cadre tout de suite. */
function readImageAspect(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 1.5);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(1.5);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

export default function WallArtPanel({
  blueprint,
  wallId,
  onChange,
  uploadImage,
  canUploadImages,
  imagesPlanLabel,
  onLockedImages,
}: {
  blueprint: RoomLayoutBlueprint;
  wallId: string;
  onChange: (next: RoomLayoutBlueprint, action?: { message: string; kind?: LayoutActionEntry['kind'] }) => void;
  uploadImage: (file: File) => Promise<string>;
  /** Forfait qui inclut les images personnalisées. */
  canUploadImages: boolean;
  imagesPlanLabel?: string | null;
  onLockedImages?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const walls = blueprint.walls ?? [];
  const wall = walls.find((w) => w.id === wallId);
  if (!wall) return null;
  const lengthM = wallLengthMeters(wall, blueprint.canvas);
  const heightM = wall.heightM;
  const art = wall.art ?? [];

  const save = (nextArt: RoomWallArt[], message: string) => {
    const nextWalls: RoomWallSegment[] = walls.map((w) => (w.id === wallId ? { ...w, art: nextArt } : w));
    onChange({ ...blueprint, walls: nextWalls }, { message, kind: 'settings' });
  };
  const patch = (id: string, change: Partial<RoomWallArt>, message = 'Décor mural ajusté') => {
    save(art.map((a) => (a.id === id ? clampWallArt({ ...a, ...change }, lengthM, heightM) : a)), message);
  };

  const addImage = async (file: File) => {
    setError('');
    setBusy(true);
    try {
      const [aspect, url] = await Promise.all([readImageAspect(file), uploadImage(file)]);
      const item = createWallArt('image', { imageUrl: url, aspect, wallLengthM: lengthM, wallHeightM: heightM });
      save([...art, item], 'Image ajoutée au mur');
      setActiveId(item.id);
    } catch {
      setError('L’image n’a pas pu être ajoutée. Essayez un JPG ou un PNG plus léger.');
    } finally {
      setBusy(false);
    }
  };

  const addGraffiti = () => {
    const item = createWallArt('graffiti', { wallLengthM: lengthM, wallHeightM: heightM });
    save([...art, item], 'Graffiti ajouté au mur');
    setActiveId(item.id);
  };

  return (
    <section className="space-y-3 border-t border-border pt-3" aria-labelledby="wall-art-title">
      <div>
        <p id="wall-art-title" className="text-sm font-semibold text-foreground">Images et graffitis</p>
        <p className="text-xs text-muted">Photos, affiches, logos ou lettrage graffiti sur ce mur ({lengthM.toFixed(1)} m), côté salle ou côté extérieur.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => (canUploadImages ? fileRef.current?.click() : onLockedImages?.())}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--radius-button)] border border-border bg-surface px-3 text-sm font-semibold text-foreground hover:bg-surface-muted disabled:opacity-60"
        >
          {canUploadImages ? <ImagePlus className="h-4 w-4" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
          {busy ? 'Envoi…' : 'Image'}
        </button>
        <button
          type="button"
          onClick={addGraffiti}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--radius-button)] border border-border bg-surface px-3 text-sm font-semibold text-foreground hover:bg-surface-muted"
        >
          <SprayCan className="h-4 w-4" aria-hidden /> Graffiti
        </button>
      </div>
      {!canUploadImages ? (
        <p className="text-xs text-muted">Vos propres images sont incluses {imagesPlanLabel ? `à partir du forfait ${imagesPlanLabel}` : 'dans un forfait supérieur'}. Les graffitis sont disponibles dès maintenant.</p>
      ) : null}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void addImage(file);
        }}
      />
      {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}

      {art.length ? (
        <ul className="space-y-2">
          {art.map((a, i) => {
            const open = activeId === a.id;
            const face = wallArtFace(a);
            const label = `${a.kind === 'graffiti' ? `Graffiti « ${a.text ?? ''} »` : `Image ${i + 1}`}${face === 'outside' ? ' · extérieur' : ''}`;
            return (
              <li key={a.id} className={cn('rounded-[var(--radius-button)] border bg-surface', open ? 'border-primary/50' : 'border-border')}>
                <div className="flex items-center gap-2 pl-3">
                  <button type="button" onClick={() => setActiveId(open ? null : a.id)} className="min-h-11 flex-1 truncate text-left text-sm font-medium text-foreground" aria-expanded={open}>
                    {label}
                  </button>
                  <button
                    type="button"
                    onClick={() => save(art.filter((x) => x.id !== a.id), 'Décor mural retiré')}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted hover:text-danger"
                    aria-label={`Retirer ${label}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                {open ? (
                  <div className="space-y-3 border-t border-border p-3">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-muted">Face du mur</span>
                      <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Face du mur">
                        {(Object.keys(WALL_ART_FACE_LABELS) as WallArtFace[]).map((f) => (
                          <button
                            key={f}
                            type="button"
                            role="radio"
                            aria-checked={face === f}
                            onClick={() => face !== f && patch(a.id, { face: f }, f === 'outside' ? 'Décor passé côté extérieur' : 'Décor passé côté salle')}
                            className={cn(
                              'min-h-11 rounded-[var(--radius-button)] border px-2 text-xs font-semibold',
                              face === f ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-surface text-muted hover:bg-surface-muted',
                            )}
                          >
                            {WALL_ART_FACE_LABELS[f]}
                          </button>
                        ))}
                      </div>
                    </div>
                    {a.kind === 'graffiti' ? (
                      <>
                        <label className="block space-y-1 text-xs">
                          <span className="font-semibold text-muted">Texte</span>
                          <input
                            className={FIELD}
                            defaultValue={a.text}
                            maxLength={24}
                            onBlur={(e) => {
                              const text = sanitizeGraffitiText(e.target.value);
                              if (text !== a.text) patch(a.id, { text, aspect: graffitiAspect(text) }, 'Texte du graffiti modifié');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            }}
                          />
                        </label>
                        <label className="block space-y-1 text-xs">
                          <span className="font-semibold text-muted">Style</span>
                          <select className={FIELD} value={a.graffitiStyle ?? 'bubble'} onChange={(e) => patch(a.id, { graffitiStyle: e.target.value as GraffitiStyle, effects: undefined }, 'Style du graffiti modifié')}>
                            {(Object.keys(GRAFFITI_STYLE_LABELS) as GraffitiStyle[]).map((s) => (
                              <option key={s} value={s}>{GRAFFITI_STYLE_LABELS[s]}</option>
                            ))}
                          </select>
                        </label>
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-muted">Couleurs</span>
                          <div className="flex flex-wrap gap-1.5">
                            {GRAFFITI_PALETTES.map((p) => {
                              const on = a.fillColor === p.fill && a.outlineColor === p.outline;
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  title={p.label}
                                  aria-label={p.label}
                                  aria-pressed={on}
                                  onClick={() => patch(a.id, { fillColor: p.fill, outlineColor: p.outline }, 'Couleurs du graffiti modifiées')}
                                  className={cn('inline-flex h-11 w-11 items-center justify-center rounded-full border-2', on ? 'border-primary' : 'border-transparent')}
                                >
                                  <span className="h-7 w-7 rounded-full border-[3px]" style={{ background: p.fill, borderColor: p.outline }} />
                                </button>
                              );
                            })}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="flex min-h-11 items-center gap-2 text-xs text-muted">
                              <input type="color" value={a.fillColor ?? '#ff6b35'} onChange={(e) => patch(a.id, { fillColor: e.target.value }, 'Couleur du graffiti modifiée')} className="h-8 w-10 rounded border border-border" />
                              Lettres
                            </label>
                            <label className="flex min-h-11 items-center gap-2 text-xs text-muted">
                              <input type="color" value={a.outlineColor ?? '#2b1055'} onChange={(e) => patch(a.id, { outlineColor: e.target.value }, 'Couleur du contour modifiée')} className="h-8 w-10 rounded border border-border" />
                              Contour
                            </label>
                          </div>
                          <label className="flex min-h-11 items-center gap-2 text-xs text-muted">
                            <input
                              type="checkbox"
                              checked={Boolean(a.fillColor2)}
                              onChange={(e) => patch(a.id, { fillColor2: e.target.checked ? '#ffd200' : undefined }, e.target.checked ? 'Dégradé ajouté' : 'Dégradé retiré')}
                              className="size-4 rounded border-border"
                            />
                            Dégradé
                            {a.fillColor2 ? (
                              <input type="color" value={a.fillColor2} onChange={(e) => patch(a.id, { fillColor2: e.target.value }, 'Dégradé modifié')} className="ml-auto h-8 w-10 rounded border border-border" aria-label="Couleur du bas des lettres" />
                            ) : null}
                          </label>
                        </div>
                        <label className="block space-y-1 text-xs">
                          <span className="font-semibold text-muted">Police</span>
                          <select className={FIELD} value={a.graffitiFont ?? 'auto'} onChange={(e) => patch(a.id, { graffitiFont: e.target.value as GraffitiFont }, 'Police du graffiti modifiée')}>
                            {(Object.keys(GRAFFITI_FONT_LABELS) as GraffitiFont[]).map((f) => (
                              <option key={f} value={f}>{GRAFFITI_FONT_LABELS[f]}</option>
                            ))}
                          </select>
                        </label>
                        <Slider label="Inclinaison" value={a.tiltDeg ?? 0} min={-25} max={25} step={1} display={`${Math.round(a.tiltDeg ?? 0)}°`} onChange={(v) => patch(a.id, { tiltDeg: v })} />
                        <Slider label="Courbure" value={a.curve ?? 0} min={-1} max={1} step={0.05} display={(a.curve ?? 0) === 0 ? 'Droit' : (a.curve ?? 0) > 0 ? 'En arc' : 'En creux'} onChange={(v) => patch(a.id, { curve: Math.abs(v) < 0.04 ? 0 : v })} />
                        <Slider label="Épaisseur du contour" value={a.outlineScale ?? 1} min={0.3} max={2} step={0.05} display={`× ${(a.outlineScale ?? 1).toFixed(2)}`} onChange={(v) => patch(a.id, { outlineScale: v })} />
                        <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                          <label className="block space-y-1 text-xs">
                            <span className="font-semibold text-muted">Fond</span>
                            <select className={FIELD} value={a.backdrop ?? 'none'} onChange={(e) => patch(a.id, { backdrop: e.target.value as GraffitiBackdrop }, 'Fond du graffiti modifié')}>
                              {(Object.keys(GRAFFITI_BACKDROP_LABELS) as GraffitiBackdrop[]).map((b) => (
                                <option key={b} value={b}>{GRAFFITI_BACKDROP_LABELS[b]}</option>
                              ))}
                            </select>
                          </label>
                          {(a.backdrop ?? 'none') !== 'none' ? (
                            <input type="color" value={a.backdropColor ?? '#f5f0e6'} onChange={(e) => patch(a.id, { backdropColor: e.target.value }, 'Couleur du fond modifiée')} className="mb-1.5 h-8 w-10 rounded border border-border" aria-label="Couleur du fond" />
                          ) : null}
                        </div>
                        <fieldset className="space-y-1">
                          <legend className="text-xs font-semibold text-muted">Effets</legend>
                          <div className="grid grid-cols-2 gap-1.5">
                            {(Object.keys(GRAFFITI_EFFECT_LABELS) as Array<keyof GraffitiEffects>).map((k) => {
                              const on = graffitiEffects(a)[k];
                              return (
                                <button
                                  key={k}
                                  type="button"
                                  aria-pressed={on}
                                  onClick={() => patch(a.id, { effects: { ...(a.effects ?? {}), [k]: !on } }, `${GRAFFITI_EFFECT_LABELS[k]} ${on ? 'retiré' : 'ajouté'}`)}
                                  className={cn(
                                    'min-h-11 rounded-[var(--radius-button)] border px-2 text-xs font-semibold',
                                    on ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-surface text-muted hover:bg-surface-muted',
                                  )}
                                >
                                  {GRAFFITI_EFFECT_LABELS[k]}
                                </button>
                              );
                            })}
                          </div>
                        </fieldset>
                      </>
                    ) : (
                      <label className="block space-y-1 text-xs">
                        <span className="font-semibold text-muted">Habillage</span>
                        <select className={FIELD} value={a.frame ?? 'gallery'} onChange={(e) => patch(a.id, { frame: e.target.value as WallArtFrame }, 'Cadre modifié')}>
                          {(Object.keys(WALL_ART_FRAME_LABELS) as WallArtFrame[]).map((f) => (
                            <option key={f} value={f}>{WALL_ART_FRAME_LABELS[f]}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    <Slider label="Position le long du mur" value={a.t} min={0} max={1} step={0.01} display={`${Math.round(a.t * 100)} %`} onChange={(v) => patch(a.id, { t: v })} />
                    <Slider label="Hauteur" value={a.yM} min={0.3} max={heightM} step={0.05} display={`${a.yM.toFixed(2)} m`} onChange={(v) => patch(a.id, { yM: v })} />
                    <Slider label="Largeur" value={a.widthM} min={0.2} max={Math.max(0.3, lengthM)} step={0.05} display={`${a.widthM.toFixed(2)} m`} onChange={(v) => patch(a.id, { widthM: v })} />
                    {a.kind === 'image' && (a.frame ?? 'gallery') === 'none' ? (
                      <Slider label="Intensité" value={a.opacity ?? 1} min={0.2} max={1} step={0.05} display={`${Math.round((a.opacity ?? 1) * 100)} %`} onChange={(v) => patch(a.id, { opacity: v })} />
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

function Slider({ label, value, min, max, step, display, onChange }: { label: string; value: number; min: number; max: number; step: number; display: string; onChange: (v: number) => void }) {
  return (
    <label className="block space-y-1">
      <span className="flex justify-between text-xs font-semibold text-muted">
        {label} <span className="tabular-nums text-foreground">{display}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-primary" />
    </label>
  );
}
