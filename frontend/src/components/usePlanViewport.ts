'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type React from 'react';
import { clampPlanZoom, planFitZoom, planStageOffset } from '@/lib/planViewport';

type ZoomAnchor = { clientX: number; clientY: number };
type PendingScroll = { lx: number; ly: number; ax: number; ay: number; smooth: boolean };

/**
 * Fenêtre d’un plan 2D dessiné à taille fixe (unités logiques) puis mis à l’échelle :
 * la salle entière tient dans le cadre à l’ouverture (même sur un téléphone, même en plein écran),
 * pincer ou les boutons zooment autour du doigt / du centre, un doigt fait défiler, la souris glisse.
 */
export function usePlanViewport({
  logicalW,
  logicalH,
  minZoom = 0.12,
  maxZoom = 2.4,
  padding = 12,
}: {
  logicalW: number;
  logicalH: number;
  minZoom?: number;
  maxZoom?: number;
  padding?: number;
}) {
  // Ref « callback » : le cadre peut changer d’élément (passage en plein écran via un portail).
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const attach = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setElement(node);
  }, []);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(zoom);
  const boxRef = useRef(box);
  const userZoomedRef = useRef(false);
  const pendingRef = useRef<PendingScroll | null>(null);
  const suppressClickRef = useRef(false);

  const limits = { min: minZoom, max: maxZoom };
  const fitZoom = planFitZoom(box.w, box.h, logicalW, logicalH, padding, limits);

  useEffect(() => {
    zoomRef.current = zoom;
    boxRef.current = box;
  });

  // Taille du cadre suivie en continu : la salle se réajuste tant que l’invité n’a pas zoomé lui-même.
  useEffect(() => {
    const el = element;
    if (!el) return undefined;
    userZoomedRef.current = false;
    const measure = () => {
      const next = { w: el.clientWidth, h: el.clientHeight };
      setBox((prev) => (prev.w === next.w && prev.h === next.h ? prev : next));
      if (!userZoomedRef.current) {
        setZoom(planFitZoom(next.w, next.h, logicalW, logicalH, padding, { min: minZoom, max: maxZoom }));
      }
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [element, logicalW, logicalH, padding, minZoom, maxZoom]);

  const offsetFor = useCallback(
    (z: number, b = boxRef.current) => planStageOffset(b.w, b.h, logicalW * z, logicalH * z, padding),
    [logicalW, logicalH, padding],
  );

  /** Point logique sous un point de l’écran (par défaut le centre du cadre). */
  const logicalAt = useCallback(
    (anchor?: ZoomAnchor) => {
      const el = containerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const ax = anchor ? anchor.clientX - rect.left : el.clientWidth / 2;
      const ay = anchor ? anchor.clientY - rect.top : el.clientHeight / 2;
      const z = zoomRef.current;
      const off = offsetFor(z);
      return { lx: (el.scrollLeft + ax - off.x) / z, ly: (el.scrollTop + ay - off.y) / z, ax, ay };
    },
    [offsetFor],
  );

  const zoomTo = useCallback(
    (next: number, anchor?: ZoomAnchor) => {
      const z = clampPlanZoom(next, { min: minZoom, max: maxZoom });
      const at = logicalAt(anchor);
      userZoomedRef.current = true;
      if (at) pendingRef.current = { ...at, smooth: false };
      setZoom(z);
    },
    [logicalAt, minZoom, maxZoom],
  );

  /** Centre le cadre sur un point logique, au zoom demandé (vol doux). */
  const focusOn = useCallback(
    (lx: number, ly: number, targetZoom?: number) => {
      const el = containerRef.current;
      if (!el) return;
      const z = clampPlanZoom(targetZoom ?? zoomRef.current, { min: minZoom, max: maxZoom });
      userZoomedRef.current = true;
      pendingRef.current = { lx, ly, ax: el.clientWidth / 2, ay: el.clientHeight / 2, smooth: true };
      if (z === zoomRef.current) {
        const off = offsetFor(z);
        el.scrollTo({ left: lx * z + off.x - el.clientWidth / 2, top: ly * z + off.y - el.clientHeight / 2, behavior: 'smooth' });
        pendingRef.current = null;
        return;
      }
      setZoom(z);
    },
    [offsetFor, minZoom, maxZoom],
  );

  const fit = useCallback(() => {
    userZoomedRef.current = false;
    pendingRef.current = null;
    const b = boxRef.current;
    setZoom(planFitZoom(b.w, b.h, logicalW, logicalH, padding, { min: minZoom, max: maxZoom }));
    containerRef.current?.scrollTo({ left: 0, top: 0 });
  }, [logicalW, logicalH, padding, minZoom, maxZoom]);

  // Après un changement de zoom, garde sous le doigt (ou au centre) le même point de la salle.
  useLayoutEffect(() => {
    const el = containerRef.current;
    const pending = pendingRef.current;
    if (!el || !pending) return;
    pendingRef.current = null;
    const off = offsetFor(zoom);
    el.scrollTo({
      left: pending.lx * zoom + off.x - pending.ax,
      top: pending.ly * zoom + off.y - pending.ay,
      behavior: pending.smooth ? 'smooth' : 'auto',
    });
  }, [zoom, offsetFor]);

  // Pincer (deux doigts), Ctrl + molette, glisser à la souris.
  useEffect(() => {
    const el = element;
    if (!el) return undefined;
    let pinch: { dist: number; zoom: number } | null = null;
    const mid = (t: TouchList) => ({
      clientX: (t[0].clientX + t[1].clientX) / 2,
      clientY: (t[0].clientY + t[1].clientY) / 2,
    });
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) pinch = { dist: dist(event.touches), zoom: zoomRef.current };
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !pinch) return;
      event.preventDefault();
      zoomTo(pinch.zoom * (dist(event.touches) / Math.max(1, pinch.dist)), mid(event.touches));
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) pinch = null;
    };
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      zoomTo(zoomRef.current * Math.exp(-event.deltaY * 0.0022), { clientX: event.clientX, clientY: event.clientY });
    };

    let drag: { x: number; y: number; left: number; top: number; moved: boolean; id: number } | null = null;
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      drag = { x: event.clientX, y: event.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false, id: event.pointerId };
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      if (!drag.moved) {
        drag.moved = true;
        el.style.cursor = 'grabbing';
      }
      el.scrollLeft = drag.left - dx;
      el.scrollTop = drag.top - dy;
    };
    const onPointerUp = () => {
      if (drag?.moved) {
        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      }
      drag = null;
      el.style.cursor = '';
    };
    // Un glisser à la souris ne doit pas choisir la table ou le siège sur lequel il se termine.
    const onClickCapture = (event: MouseEvent) => {
      if (suppressClickRef.current) {
        event.stopPropagation();
        event.preventDefault();
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    el.addEventListener('click', onClickCapture, true);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('click', onClickCapture, true);
    };
  }, [element, zoomTo]);

  const offset = offsetFor(zoom, box);
  const spacerStyle: React.CSSProperties = {
    position: 'relative',
    width: Math.max(box.w, logicalW * zoom + offset.x * 2),
    height: Math.max(box.h, logicalH * zoom + offset.y * 2),
  };
  const stageStyle: React.CSSProperties = {
    position: 'absolute',
    left: offset.x,
    top: offset.y,
    width: logicalW,
    height: logicalH,
    transform: `scale(${zoom})`,
    transformOrigin: 'top left',
  };

  return {
    bindFrame: attach,
    box,
    zoom,
    fitZoom,
    /** Le plan est plus petit que le cadre « ajusté » : on voit toute la salle. */
    isOverview: zoom <= fitZoom * 1.08,
    spacerStyle,
    stageStyle,
    zoomIn: () => zoomTo(zoomRef.current * 1.25),
    zoomOut: () => zoomTo(zoomRef.current / 1.25),
    zoomTo,
    focusOn,
    fit,
  };
}
