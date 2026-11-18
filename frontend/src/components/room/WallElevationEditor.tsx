'use client';

/**
 * Vue de face du mur sélectionné (comme si l'on se tenait dans la salle) : portes,
 * fenêtres, images et graffitis y sont dessinés à l'échelle. On les fait glisser pour
 * les placer, on tire la poignée d'angle pour changer largeur et hauteur, et l'on
 * peut saisir les cotes exactes en mètres (distance au bord, hauteur du bas, taille).
 */

import React, { useEffect, useRef, useState } from 'react';
import { AlignCenterHorizontal, AlignCenterVertical, AlignEndVertical, AlignStartVertical, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { LayoutActionEntry } from '@/lib/layoutActionLog';
import { wallLengthMeters, type RoomLayoutBlueprint, type RoomWallOpening, type RoomWallSegment } from '@/lib/roomLayoutUtils';
import { clampWallArt, wallArtHeightM, type RoomWallArt } from '@/lib/roomWallArt';

type ItemType = 'opening' | 'art';

/** Rectangle d'un élément sur le mur, en mètres (bas à gauche, le long du mur depuis son début). */
interface Rect {
  left: number;
  bottom: number;
  width: number;
  height: number;
}

interface WallItem {
  type: ItemType;
  id: string;
  kind: 'door' | 'window' | 'image' | 'graffiti';
  label: string;
  rect: Rect;
  imageUrl?: string;
  text?: string;
  color?: string;
}

const SNAP = 0.05;
const MIN_SIZE = 0.2;
const snap = (v: number) => Math.round(v / SNAP) * SNAP;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const round2 = (v: number) => Math.round(v * 100) / 100;

function openingRect(op: RoomWallOpening, lengthM: number): Rect {
  const sill = op.sillM ?? (op.kind === 'door' ? 0 : 0.9);
  return { left: op.t * lengthM - op.widthM / 2, bottom: sill, width: op.widthM, height: op.heightM };
}

function artRect(a: RoomWallArt, lengthM: number): Rect {
  const h = wallArtHeightM(a);
  return { left: a.t * lengthM - a.widthM / 2, bottom: a.yM - h / 2, width: a.widthM, height: h };
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.left + b.width - 0.01 && b.left < a.left + a.width - 0.01
    && a.bottom < b.bottom + b.height - 0.01 && b.bottom < a.bottom + a.height - 0.01;
}

/** Côté intérieur du mur, même règle que la 3D : sert à montrer le mur vu depuis la salle. */
function viewedMirrored(wall: RoomWallSegment, canvas: { widthM: number; heightM: number }): boolean {
  const sx = ((wall.start.x / 100) - 0.5) * canvas.widthM;
  const sz = ((wall.start.y / 100) - 0.5) * canvas.heightM;
  const ex = ((wall.end.x / 100) - 0.5) * canvas.widthM;
  const ez = ((wall.end.y / 100) - 0.5) * canvas.heightM;
  const angle = Math.atan2(ez - sz, ex - sx);
  const midX = (sx + ex) / 2;
  const midZ = (sz + ez) / 2;
  const inSide = Math.sin(angle) * midX - Math.cos(angle) * midZ >= 0 ? 1 : -1;
  return inSide === -1;
}

type DragMode = 'move' | 'resize';
interface DragState {
  key: string;
  mode: DragMode;
  startX: number;
  startY: number;
  rect: Rect;
  pointerId: number;
}

export default function WallElevationEditor({
  blueprint,
  wallId,
  onChange,
  readOnly = false,
}: {
  blueprint: RoomLayoutBlueprint;
  wallId: string;
  onChange: (next: RoomLayoutBlueprint, action?: { message: string; kind?: LayoutActionEntry['kind'] }) => void;
  readOnly?: boolean;
}) {
  const walls = blueprint.walls ?? [];
  const wall = walls.find((w) => w.id === wallId);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ key: string; rect: Rect } | null>(null);
  const [keepRatio, setKeepRatio] = useState(true);
  const dragRef = useRef<DragState | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [viewW, setViewW] = useState(320);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setViewW(Math.max(200, Math.round(entry.contentRect.width - 2))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const lengthM = wall ? wallLengthMeters(wall, blueprint.canvas) : 0;
  const heightM = wall?.heightM ?? 3;
  const mirrored = wall ? viewedMirrored(wall, blueprint.canvas) : false;

  const items: WallItem[] = [];
  if (wall) {
    const list = items;
    (wall.openings ?? []).forEach((op, i) => {
      list.push({
        type: 'opening',
        id: op.id,
        kind: op.kind,
        label: `${op.kind === 'door' ? 'Porte' : 'Fenêtre'} ${i + 1}`,
        rect: openingRect(op, lengthM),
        color: op.color,
      });
    });
    (wall.art ?? []).forEach((a, i) => {
      list.push({
        type: 'art',
        id: a.id,
        kind: a.kind,
        label: a.kind === 'graffiti' ? `Graffiti « ${a.text ?? ''} »` : `Image ${i + 1}`,
        rect: artRect(a, lengthM),
        imageUrl: a.imageUrl,
        text: a.text,
        color: a.fillColor,
      });
    });
  }

  // Échelle d'affichage : au moins 150 px de haut, la largeur défile pour les longs murs.
  const pxPerM = lengthM > 0 ? Math.max(viewW / lengthM, 150 / heightM) : 1;
  /** Position horizontale affichée (mur vu de l'intérieur de la salle). */
  const screenLeft = (r: Rect) => (mirrored ? lengthM - r.left - r.width : r.left);
  // Sur un long mur, on amène l'élément choisi (ou le premier) au centre de la vue.
  const focusItem = items.find((it) => `${it.type}:${it.id}` === selectedKey) ?? items[0] ?? null;
  const focusX = focusItem ? Math.round((screenLeft(focusItem.rect) + focusItem.rect.width / 2) * pxPerM) : null;
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || focusX === null || el.scrollWidth <= el.clientWidth) return;
    const left = Math.max(0, focusX - el.clientWidth / 2);
    // Seulement si l'élément est hors de vue : on ne fait pas sauter la vue pendant un réglage.
    if (focusX < el.scrollLeft + 20 || focusX > el.scrollLeft + el.clientWidth - 20) el.scrollTo({ left, behavior: 'smooth' });
  }, [focusX, wallId]);

  if (!wall || lengthM <= 0) return null;

  const keyOf = (it: Pick<WallItem, 'type' | 'id'>) => `${it.type}:${it.id}`;
  const rectOf = (it: WallItem) => (draft && draft.key === keyOf(it) ? draft.rect : it.rect);
  const selected = items.find((it) => keyOf(it) === selectedKey) ?? null;

  /** Contraint un rectangle au mur (portes posées au sol). */
  const fit = (it: WallItem, r: Rect): Rect => {
    const width = clamp(r.width, MIN_SIZE, lengthM);
    const isDoor = it.kind === 'door';
    const height = clamp(r.height, MIN_SIZE, heightM - (isDoor ? 0 : 0.05));
    const left = clamp(r.left, 0, Math.max(0, lengthM - width));
    const bottom = isDoor ? clamp(r.bottom, 0, Math.max(0, heightM - height)) : clamp(r.bottom, 0, Math.max(0, heightM - height - 0.02));
    return { left, bottom, width, height };
  };

  /** Aimant : centre du mur et bords des autres éléments. */
  const magnet = (it: WallItem, r: Rect): Rect => {
    const out = { ...r };
    const centre = out.left + out.width / 2;
    if (Math.abs(centre - lengthM / 2) < 0.12) out.left = lengthM / 2 - out.width / 2;
    for (const other of items) {
      if (keyOf(other) === keyOf(it)) continue;
      const o = other.rect;
      if (Math.abs(out.bottom - o.bottom) < 0.06) out.bottom = o.bottom;
      if (Math.abs(out.bottom + out.height - (o.bottom + o.height)) < 0.06) out.bottom = o.bottom + o.height - out.height;
    }
    return out;
  };

  const commit = (it: WallItem, r: Rect, message: string) => {
    const rect = fit(it, r);
    const nextWalls = walls.map((w) => {
      if (w.id !== wall.id) return w;
      if (it.type === 'opening') {
        return {
          ...w,
          openings: (w.openings ?? []).map((op) => (op.id === it.id
            ? {
                ...op,
                t: clamp((rect.left + rect.width / 2) / lengthM, 0, 1),
                widthM: round2(rect.width),
                heightM: round2(rect.height),
                sillM: round2(rect.bottom),
              }
            : op)),
        };
      }
      return {
        ...w,
        art: (w.art ?? []).map((a) => (a.id === it.id
          ? clampWallArt({
              ...a,
              t: clamp((rect.left + rect.width / 2) / lengthM, 0, 1),
              yM: rect.bottom + rect.height / 2,
              widthM: round2(rect.width),
              aspect: rect.width / Math.max(0.05, rect.height),
            }, lengthM, heightM)
          : a)),
      };
    });
    onChange({ ...blueprint, walls: nextWalls }, { message, kind: 'move' });
  };

  const svgW = Math.max(viewW, lengthM * pxPerM);
  const svgH = heightM * pxPerM;

  const onPointerDown = (e: React.PointerEvent, it: WallItem, mode: DragMode) => {
    if (readOnly) return;
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    // Garde le focus sur l'élément : les flèches du clavier l'ajustent juste après un glisser.
    ((e.currentTarget as Element).closest('g[role="button"]') as SVGGElement | null)?.focus({ preventScroll: true });
    setSelectedKey(keyOf(it));
    dragRef.current = { key: keyOf(it), mode, startX: e.clientX, startY: e.clientY, rect: rectOf(it), pointerId: e.pointerId };
  };

  const onPointerMove = (e: React.PointerEvent, it: WallItem) => {
    const d = dragRef.current;
    if (!d || d.key !== keyOf(it) || d.pointerId !== e.pointerId) return;
    const dxScreen = (e.clientX - d.startX) / pxPerM;
    const dx = mirrored ? -dxScreen : dxScreen;
    const dy = -(e.clientY - d.startY) / pxPerM;
    let r: Rect;
    if (d.mode === 'move') {
      r = magnet(it, { ...d.rect, left: snap(d.rect.left + dx), bottom: it.kind === 'door' ? d.rect.bottom : snap(d.rect.bottom + dy) });
    } else {
      // Poignée d'angle : le coin opposé (bas, côté début vu à l'écran) reste fixe.
      let width = snap(d.rect.width + dxScreen);
      let height = snap(d.rect.height + dy);
      // Proportions gardées pour les images (bouton) ; Maj les garde aussi pour portes et fenêtres.
      if ((keepRatio && it.type === 'art') || e.shiftKey) {
        const ratio = d.rect.width / Math.max(0.05, d.rect.height);
        if (Math.abs(dxScreen) >= Math.abs(dy)) height = width / ratio;
        else width = height * ratio;
      }
      const left = mirrored ? d.rect.left + d.rect.width - width : d.rect.left;
      r = { left, bottom: d.rect.bottom, width, height };
    }
    setDraft({ key: d.key, rect: fit(it, r) });
  };

  const onPointerUp = (e: React.PointerEvent, it: WallItem) => {
    const d = dragRef.current;
    if (!d || d.key !== keyOf(it)) return;
    dragRef.current = null;
    const rect = draft && draft.key === d.key ? draft.rect : null;
    setDraft(null);
    if (rect) commit(it, rect, d.mode === 'move' ? `${it.label} déplacé(e)` : `${it.label} redimensionné(e)`);
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  };

  const onKeyDown = (e: React.KeyboardEvent, it: WallItem) => {
    if (readOnly) return;
    const step = e.shiftKey ? 0.25 : SNAP;
    const r = it.rect;
    let next: Rect | null = null;
    const along = mirrored ? -1 : 1;
    if (e.key === 'ArrowLeft') next = { ...r, left: r.left - step * along };
    if (e.key === 'ArrowRight') next = { ...r, left: r.left + step * along };
    if (e.key === 'ArrowUp' && it.kind !== 'door') next = { ...r, bottom: r.bottom + step };
    if (e.key === 'ArrowDown' && it.kind !== 'door') next = { ...r, bottom: r.bottom - step };
    if (next) {
      e.preventDefault();
      commit(it, next, `${it.label} déplacé(e)`);
    }
  };

  const collisions = new Set<string>();
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const a = items[i];
      const b = items[j];
      // Une image peut décorer un trumeau, mais pas recouvrir une porte ou une fenêtre ; deux ouvertures ne se chevauchent pas.
      if (a.type === 'art' && b.type === 'art') continue;
      if (overlaps(rectOf(a), rectOf(b))) {
        collisions.add(keyOf(a));
        collisions.add(keyOf(b));
      }
    }
  }

  const sel = selected ? rectOf(selected) : null;
  const setSel = (patch: Partial<Rect>, message: string) => {
    if (!selected || !sel) return;
    commit(selected, { ...sel, ...patch }, message);
  };
  const setSize = (key: 'width' | 'height', value: number) => {
    if (!selected || !sel || !Number.isFinite(value) || value <= 0) return;
    const ratio = sel.width / Math.max(0.05, sel.height);
    const lock = keepRatio && selected.type === 'art';
    const width = key === 'width' ? value : lock ? value * ratio : sel.width;
    const height = key === 'height' ? value : lock ? value / ratio : sel.height;
    // La taille change autour du centre, pour ne pas décaler l'élément.
    const left = sel.left + sel.width / 2 - width / 2;
    commit(selected, { ...sel, left, width, height }, key === 'width' ? `Largeur : ${value.toFixed(2)} m` : `Hauteur : ${value.toFixed(2)} m`);
  };

  return (
    <section ref={sectionRef} className="space-y-3 border-t border-border pt-3" aria-labelledby={`wall-elev-${wall.id}`}>
      <div>
        <p id={`wall-elev-${wall.id}`} className="text-sm font-semibold text-foreground">Placer sur le mur</p>
        <p className="text-xs text-muted">
          Mur vu depuis la salle ({lengthM.toFixed(2)} × {heightM.toFixed(2)} m). Glissez une porte, une fenêtre ou une image ; tirez le coin pour la taille. Flèches du clavier : 5 cm (Maj : 25 cm).
        </p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-border px-3 py-4 text-center text-xs text-muted">
          Ajoutez une porte, une fenêtre, une image ou un graffiti pour le placer ici.
        </p>
      ) : (
        <div ref={scrollerRef} className="overflow-x-auto overscroll-x-contain rounded-[var(--radius-card)] border border-border bg-surface-muted">
          <svg
            width={svgW}
            height={svgH + 18}
            viewBox={`0 0 ${svgW} ${svgH + 18}`}
            role="group"
            aria-label="Vue de face du mur"
            className="block touch-none select-none"
            onPointerDown={() => setSelectedKey(null)}
          >
            {/* Mur et sol */}
            <rect x={0} y={0} width={lengthM * pxPerM} height={svgH} fill={wall.color ?? '#e9e2d6'} stroke="#b9ad99" />
            <line x1={0} y1={svgH} x2={lengthM * pxPerM} y2={svgH} stroke="#6b5b45" strokeWidth={2} />
            {/* Repères tous les mètres */}
            {Array.from({ length: Math.floor(lengthM) + 1 }, (_, m) => (
              <g key={m}>
                <line x1={m * pxPerM} y1={svgH} x2={m * pxPerM} y2={svgH + 5} stroke="#8a7d6b" />
                {m % (lengthM > 12 ? 2 : 1) === 0 ? (
                  <text x={m * pxPerM + 2} y={svgH + 15} fontSize={10} fill="#6b6257">{m} m</text>
                ) : null}
              </g>
            ))}
            <line x1={(lengthM / 2) * pxPerM} y1={0} x2={(lengthM / 2) * pxPerM} y2={svgH} stroke="#b9ad99" strokeDasharray="4 4" />

            {items.map((it) => {
              const r = rectOf(it);
              const k = keyOf(it);
              const x = screenLeft(r) * pxPerM;
              const y = (heightM - r.bottom - r.height) * pxPerM;
              const w = r.width * pxPerM;
              const h = r.height * pxPerM;
              const isSel = k === selectedKey;
              const bad = collisions.has(k);
              const fill = it.kind === 'door' ? '#8b5e3c' : it.kind === 'window' ? '#a9d4ec' : it.kind === 'graffiti' ? 'transparent' : '#ffffff';
              return (
                <g
                  key={k}
                  role="button"
                  tabIndex={readOnly ? -1 : 0}
                  aria-label={`${it.label} : à ${r.left.toFixed(2)} m du début du mur, bas à ${r.bottom.toFixed(2)} m, ${r.width.toFixed(2)} × ${r.height.toFixed(2)} m`}
                  aria-pressed={isSel}
                  onFocus={() => setSelectedKey(k)}
                  onKeyDown={(e) => onKeyDown(e, it)}
                  className="cursor-move focus:outline-none"
                  onPointerDown={(e) => onPointerDown(e, it, 'move')}
                  onPointerMove={(e) => onPointerMove(e, it)}
                  onPointerUp={(e) => onPointerUp(e, it)}
                  onPointerCancel={(e) => onPointerUp(e, it)}
                >
                  <rect x={x} y={y} width={w} height={h} fill={fill} fillOpacity={it.kind === 'window' ? 0.85 : 1} stroke={bad ? '#dc2626' : isSel ? '#166534' : '#5b5145'} strokeWidth={isSel || bad ? 2.5 : 1} />
                  {it.kind === 'image' && it.imageUrl ? (
                    <image href={it.imageUrl} x={x + 1} y={y + 1} width={Math.max(0, w - 2)} height={Math.max(0, h - 2)} preserveAspectRatio="none" />
                  ) : null}
                  {it.kind === 'graffiti' ? (
                    <text x={x + w / 2} y={y + h / 2} fontSize={Math.max(9, Math.min(h * 0.6, w / Math.max(3, (it.text ?? '').length) * 1.6))} textAnchor="middle" dominantBaseline="central" fill={it.color ?? '#ff6b35'} fontWeight={800}>
                      {it.text}
                    </text>
                  ) : null}
                  {it.kind === 'window' ? (
                    <>
                      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke="#ffffff" strokeWidth={1.5} />
                      <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke="#ffffff" strokeWidth={1.5} />
                    </>
                  ) : null}
                  {it.kind === 'door' ? <circle cx={x + w * (mirrored ? 0.2 : 0.8)} cy={y + h * 0.55} r={2.5} fill="#e7c873" /> : null}
                  {isSel && !readOnly ? (
                    <rect
                      x={x + w - 7}
                      y={y - 7}
                      width={14}
                      height={14}
                      rx={3}
                      fill="#ffffff"
                      stroke="#166534"
                      strokeWidth={2}
                      className="cursor-nesw-resize"
                      aria-hidden
                      onPointerDown={(e) => onPointerDown(e, it, 'resize')}
                      onPointerMove={(e) => onPointerMove(e, it)}
                      onPointerUp={(e) => onPointerUp(e, it)}
                    />
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {collisions.size > 0 ? (
        <p role="alert" className="text-xs font-semibold text-danger">Des éléments se chevauchent (en rouge) : décalez-les ou réduisez leur taille.</p>
      ) : null}

      {selected && sel ? (
        <div className="space-y-2 rounded-[var(--radius-card)] border border-border bg-surface p-3">
          <p className="text-xs font-bold text-foreground">{selected.label}</p>
          <div className="grid grid-cols-2 items-end gap-2">
            <MeterField label="Depuis le début" value={sel.left} max={Math.max(0, lengthM - sel.width)} onCommit={(v) => setSel({ left: v }, `${selected.label} : ${v.toFixed(2)} m du bord`)} disabled={readOnly} />
            <MeterField
              label={selected.kind === 'door' ? 'Seuil (bas)' : 'Hauteur du bas'}
              value={sel.bottom}
              max={Math.max(0, heightM - sel.height)}
              onCommit={(v) => setSel({ bottom: v }, `${selected.label} : bas à ${v.toFixed(2)} m`)}
              disabled={readOnly}
            />
            <MeterField label="Largeur" value={sel.width} min={MIN_SIZE} max={lengthM} onCommit={(v) => setSize('width', v)} disabled={readOnly} />
            <MeterField label="Hauteur" value={sel.height} min={MIN_SIZE} max={heightM} onCommit={(v) => setSize('height', v)} disabled={readOnly} />
          </div>
          {!readOnly ? (
            <div className="grid grid-cols-2 gap-1.5">
              <AlignButton label="Contre le début" icon={AlignStartVertical} onClick={() => setSel({ left: 0.1 }, `${selected.label} contre le début du mur`)} />
              <AlignButton label="Centrer sur le mur" icon={AlignCenterVertical} onClick={() => setSel({ left: lengthM / 2 - sel.width / 2 }, `${selected.label} centré(e) sur le mur`)} />
              <AlignButton label="Contre la fin" icon={AlignEndVertical} onClick={() => setSel({ left: lengthM - sel.width - 0.1 }, `${selected.label} contre la fin du mur`)} />
              {selected.kind !== 'door' ? (
                <AlignButton label="Centrer en hauteur" icon={AlignCenterHorizontal} onClick={() => setSel({ bottom: heightM / 2 - sel.height / 2 }, `${selected.label} centré(e) en hauteur`)} />
              ) : null}
              {selected.type === 'art' ? (
                <button
                  type="button"
                  aria-pressed={keepRatio}
                  onClick={() => setKeepRatio((v) => !v)}
                  className={cn(
                    'inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-button)] border px-3 text-xs font-semibold',
                    keepRatio ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-surface text-muted',
                  )}
                >
                  {keepRatio ? <Lock className="h-3.5 w-3.5" aria-hidden /> : <Unlock className="h-3.5 w-3.5" aria-hidden />}
                  {keepRatio ? 'Proportions gardées' : 'Taille libre'}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : items.length > 0 ? (
        <p className="text-xs text-muted">Touchez un élément du mur pour régler sa position et sa taille au centimètre.</p>
      ) : null}
    </section>
  );
}

function AlignButton({ label, icon: Icon, onClick }: { label: string; icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-button)] border border-border bg-surface px-3 text-xs font-semibold text-foreground hover:bg-surface-muted"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}

/** Champ en mètres validé en quittant le champ ou avec Entrée (une seule étape d'historique). */
export function MeterField({
  label,
  value,
  min = 0,
  max,
  onCommit,
  disabled,
}: {
  label: string;
  value: number;
  min?: number;
  max: number;
  onCommit: (v: number) => void;
  disabled?: boolean;
}) {
  const shown = value.toFixed(2);
  const [text, setText] = useState(shown);
  const [source, setSource] = useState(shown);
  if (source !== shown) {
    setSource(shown);
    setText(shown);
  }
  const apply = () => {
    const v = parseFloat(text.replace(',', '.'));
    if (!Number.isFinite(v)) {
      setText(shown);
      return;
    }
    const next = clamp(v, min, Math.max(min, max));
    if (Math.abs(next - value) >= 0.005) onCommit(next);
    else setText(shown);
  };
  return (
    <label className="block space-y-1 text-xs">
      <span className="font-semibold text-muted">{label} (m)</span>
      <input
        type="number"
        inputMode="decimal"
        step={0.05}
        min={min}
        max={max}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={apply}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="w-full min-h-11 rounded-[var(--radius-button)] border border-border bg-surface px-2.5 text-sm tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      />
    </label>
  );
}
