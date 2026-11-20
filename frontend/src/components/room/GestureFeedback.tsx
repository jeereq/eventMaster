'use client';

/**
 * Retours visuels discrets quand on se déplace dans la vue 3D.
 *
 * Volontairement sobres :
 * - au doigt, un simple disque translucide suit chaque doigt posé sur la scène ;
 * - à la souris, rien pendant le glissé (le curseur suffit) ;
 * - au zoom (pincement ou molette), une petite pastille « + » ou « − » qui s'efface d'elle-même.
 *
 * Calque purement visuel : il n'intercepte aucun événement.
 */

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

interface Finger {
  id: number;
  x: number;
  y: number;
}

interface ZoomCue {
  x: number;
  y: number;
  dir: 'in' | 'out';
}

/** Variation d'écart entre deux doigts (px) pour annoncer un zoom. */
const PINCH_STEP_PX = 4;
const ZOOM_CUE_MS = 500;

export default function GestureFeedback({
  targetRef,
  className,
}: {
  /** Élément qui contient le canevas 3D (les positions sont relatives à lui). */
  targetRef: React.RefObject<HTMLElement | null>;
  /** Conservé pour compatibilité : le calque n'anime plus rien d'ample. */
  reduceMotion?: boolean;
  className?: string;
}) {
  const [fingers, setFingers] = useState<Finger[]>([]);
  const [zoom, setZoom] = useState<ZoomCue | null>(null);

  const fingersRef = useRef(new Map<number, Finger>());
  const pinchDistRef = useRef(0);
  const frameRef = useRef(0);
  const zoomTimerRef = useRef(0);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return undefined;
    const map = fingersRef.current;

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
        setFingers([...map.values()]);
      });
    };
    const showZoom = (x: number, y: number, dir: 'in' | 'out') => {
      setZoom({ x, y, dir });
      window.clearTimeout(zoomTimerRef.current);
      zoomTimerRef.current = window.setTimeout(() => setZoom(null), ZOOM_CUE_MS);
    };
    const pinchDistance = () => {
      const [a, b] = [...map.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };

    const onDown = (e: PointerEvent) => {
      // La souris montre déjà où l'on est : on ne suit que les doigts (et le stylet).
      if (!onScene(e) || e.pointerType === 'mouse') return;
      const p = local(e);
      map.set(e.pointerId, { id: e.pointerId, x: p.x, y: p.y });
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

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 z-[5] overflow-hidden select-none', className)}
      data-gesture-feedback
    >
      {fingers.map((f) => (
        <span key={f.id} className="em-gesture-finger" style={{ left: f.x, top: f.y }} />
      ))}

      {zoom ? (
        <span className="em-gesture-zoom" style={{ left: zoom.x, top: zoom.y }}>
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
            <path d="M6 12h12" />
            {zoom.dir === 'in' ? <path d="M12 6v12" /> : null}
          </svg>
          <span className="sr-only">{zoom.dir === 'in' ? 'Zoom avant' : 'Zoom arrière'}</span>
        </span>
      ) : null}
    </div>
  );
}
