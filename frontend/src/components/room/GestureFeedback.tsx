'use client';

/**
 * Gestes visibles sur la vue 3D : un cercle sous chaque doigt (ou sous la souris pendant un clic),
 * une onde au toucher, le trait du glissé, et un badge « + / − » avec des anneaux pour le zoom
 * (pincement à deux doigts ou molette). Calque purement visuel : il n'intercepte aucun événement.
 */

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

type PointerKind = 'touch' | 'mouse' | 'pen';

interface ActivePointer {
  id: number;
  kind: PointerKind;
  x: number;
  y: number;
  /** Point de départ du glissé. */
  sx: number;
  sy: number;
}

interface Ripple {
  key: number;
  x: number;
  y: number;
  kind: PointerKind;
}

interface ZoomCue {
  key: number;
  x: number;
  y: number;
  dir: 'in' | 'out';
}

/** Au-delà de ce déplacement (px), on dessine le trait du glissé. */
const DRAG_TRAIL_MIN_PX = 10;
/** Variation d'écart entre deux doigts (px) pour annoncer un zoom. */
const PINCH_STEP_PX = 4;
const ZOOM_CUE_MS = 650;

let nextKey = 1;

export default function GestureFeedback({
  targetRef,
  reduceMotion = false,
  className,
}: {
  /** Élément qui contient le canevas 3D (les positions sont relatives à lui). */
  targetRef: React.RefObject<HTMLElement | null>;
  reduceMotion?: boolean;
  className?: string;
}) {
  const [pointers, setPointers] = useState<ActivePointer[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [zoom, setZoom] = useState<ZoomCue | null>(null);

  const pointersRef = useRef(new Map<number, ActivePointer>());
  const pinchDistRef = useRef(0);
  const frameRef = useRef(0);
  const zoomTimerRef = useRef(0);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return undefined;
    const map = pointersRef.current;

    const local = (e: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    // Seuls les gestes sur la scène comptent, pas les clics sur les boutons posés dessus.
    const onScene = (e: Event) => e.target instanceof HTMLCanvasElement;
    const flush = () => {
      if (frameRef.current) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = 0;
        setPointers([...map.values()]);
      });
    };
    const showZoom = (x: number, y: number, dir: 'in' | 'out') => {
      // Même badge tant que le geste dure : seul le signe change, sans clignoter.
      setZoom((prev) => (prev ? { ...prev, x, y, dir } : { key: nextKey++, x, y, dir }));
      window.clearTimeout(zoomTimerRef.current);
      zoomTimerRef.current = window.setTimeout(() => setZoom(null), ZOOM_CUE_MS);
    };
    const pinchDistance = () => {
      const [a, b] = [...map.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };

    const onDown = (e: PointerEvent) => {
      if (!onScene(e)) return;
      const p = local(e);
      const kind = (e.pointerType || 'mouse') as PointerKind;
      map.set(e.pointerId, { id: e.pointerId, kind, x: p.x, y: p.y, sx: p.x, sy: p.y });
      setRipples((list) => [...list.slice(-5), { key: nextKey++, x: p.x, y: p.y, kind }]);
      pinchDistRef.current = map.size === 2 ? pinchDistance() : 0;
      flush();
    };
    const onMove = (e: PointerEvent) => {
      const cur = map.get(e.pointerId);
      if (!cur) return;
      const p = local(e);
      cur.x = p.x;
      cur.y = p.y;
      if (map.size === 2) {
        const d = pinchDistance();
        const prev = pinchDistRef.current;
        if (prev > 0 && Math.abs(d - prev) >= PINCH_STEP_PX) {
          const [a, b] = [...map.values()];
          // Doigts qui s'écartent = on se rapproche (zoom avant).
          showZoom((a.x + b.x) / 2, (a.y + b.y) / 2, d > prev ? 'in' : 'out');
          pinchDistRef.current = d;
        } else if (prev === 0) {
          pinchDistRef.current = d;
        }
      }
      flush();
    };
    const onUp = (e: PointerEvent) => {
      if (!map.delete(e.pointerId)) return;
      if (map.size < 2) pinchDistRef.current = 0;
      flush();
    };
    const onWheel = (e: WheelEvent) => {
      if (!onScene(e) || e.deltaY === 0) return;
      const p = local(e);
      showZoom(p.x, p.y, e.deltaY < 0 ? 'in' : 'out');
    };

    el.addEventListener('pointerdown', onDown, { capture: true, passive: true });
    window.addEventListener('pointermove', onMove, { capture: true, passive: true });
    window.addEventListener('pointerup', onUp, { capture: true, passive: true });
    window.addEventListener('pointercancel', onUp, { capture: true, passive: true });
    el.addEventListener('wheel', onWheel, { capture: true, passive: true });
    return () => {
      el.removeEventListener('pointerdown', onDown, { capture: true });
      window.removeEventListener('pointermove', onMove, { capture: true });
      window.removeEventListener('pointerup', onUp, { capture: true });
      window.removeEventListener('pointercancel', onUp, { capture: true });
      el.removeEventListener('wheel', onWheel, { capture: true });
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      window.clearTimeout(zoomTimerRef.current);
      map.clear();
    };
  }, [targetRef]);

  const pinch = pointers.length === 2 ? pointers : null;

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 z-[5] overflow-hidden select-none', className)}
      data-gesture-feedback
    >
      {/* Trait du glissé (un doigt) et trait entre les deux doigts du pincement. */}
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        {!pinch
          ? pointers.map((p) =>
              Math.hypot(p.x - p.sx, p.y - p.sy) >= DRAG_TRAIL_MIN_PX ? (
                <g key={`trail-${p.id}`}>
                  <line
                    x1={p.sx}
                    y1={p.sy}
                    x2={p.x}
                    y2={p.y}
                    stroke="white"
                    strokeOpacity={0.75}
                    strokeWidth={p.kind === 'touch' ? 3 : 2}
                    strokeDasharray="2 7"
                    strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.45))' }}
                  />
                  <circle cx={p.sx} cy={p.sy} r={p.kind === 'touch' ? 5 : 4} fill="white" fillOpacity={0.8} />
                </g>
              ) : null,
            )
          : (
            <line
              x1={pinch[0].x}
              y1={pinch[0].y}
              x2={pinch[1].x}
              y2={pinch[1].y}
              stroke="white"
              strokeOpacity={0.8}
              strokeWidth={2.5}
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.45))' }}
            />
          )}
      </svg>

      {/* Onde au moment du toucher. */}
      {ripples.map((r) => (
        <span
          key={r.key}
          className={cn('em-gesture-ripple', r.kind === 'touch' ? 'h-16 w-16' : 'h-10 w-10')}
          style={{ left: r.x, top: r.y }}
          // Mouvement réduit : l'onde ne grandit pas, elle s'efface simplement (voir globals.css).
          onAnimationEnd={() => setRipples((list) => list.filter((x) => x.key !== r.key))}
        />
      ))}

      {/* Cercle sous chaque doigt (ou sous la souris tant que le bouton est enfoncé). */}
      {pointers.map((p) => (
        <span
          key={`finger-${p.id}`}
          className={cn('em-gesture-finger', p.kind === 'touch' ? 'h-12 w-12' : 'h-8 w-8')}
          style={{ left: p.x, top: p.y }}
        >
          <span className="em-gesture-finger-dot" />
        </span>
      ))}

      {/* Zoom avant / arrière : badge « + / − » et anneaux qui s'ouvrent ou se referment. */}
      {zoom ? (
        <span
          key={zoom.key}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: zoom.x, top: zoom.y }}
        >
          {reduceMotion ? null : (
            <>
              <span className={cn('em-gesture-zoom-ring', zoom.dir === 'in' ? 'em-gesture-zoom-in' : 'em-gesture-zoom-out')} />
              <span
                className={cn('em-gesture-zoom-ring', zoom.dir === 'in' ? 'em-gesture-zoom-in' : 'em-gesture-zoom-out')}
                style={{ animationDelay: '160ms' }}
              />
            </>
          )}
          <span className="em-gesture-zoom-badge">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="M15.5 15.5L20 20" />
              <path d="M7.5 10.5h6" />
              {zoom.dir === 'in' ? <path d="M10.5 7.5v6" /> : null}
            </svg>
            <span className="sr-only">{zoom.dir === 'in' ? 'Zoom avant' : 'Zoom arrière'}</span>
          </span>
        </span>
      ) : null}
    </div>
  );
}
