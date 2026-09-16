'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, BrickWall, Home, LayoutGrid, Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/cn';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableIn(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return false;
    const style = window.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    return el.getClientRects().length > 0;
  });
}

export type PlanViewMode = '2d' | '3d';

export function PlanViewToggle({
  value,
  onChange,
  disabled3d = false,
  className,
}: {
  value: PlanViewMode;
  onChange: (next: PlanViewMode) => void;
  disabled3d?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex gap-1 rounded-[var(--radius-button)] border border-border bg-surface p-0.5 shadow-sm',
        className,
      )}
      role="group"
      aria-label="Vue du plan de table"
    >
      <button
        type="button"
        onClick={() => onChange('2d')}
        aria-pressed={value === '2d'}
        className={cn(
          'inline-flex items-center justify-center gap-1 min-h-11 min-w-[44px] px-3 rounded-[var(--radius-button)] text-xs font-semibold transition',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          value === '2d' ? 'bg-foreground text-background' : 'text-muted hover:text-foreground',
        )}
      >
        <LayoutGrid className="w-3.5 h-3.5" aria-hidden />
        2D
      </button>
      <button
        type="button"
        onClick={() => onChange('3d')}
        disabled={disabled3d}
        aria-pressed={value === '3d'}
        className={cn(
          'inline-flex items-center justify-center gap-1 min-h-11 min-w-[44px] px-3 rounded-[var(--radius-button)] text-xs font-semibold transition',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          disabled3d && 'opacity-40 cursor-not-allowed',
          !disabled3d && (value === '3d' ? 'bg-foreground text-background' : 'text-muted hover:text-foreground'),
        )}
      >
        <Box className="w-3.5 h-3.5" aria-hidden />
        3D
      </button>
    </div>
  );
}

export function PlanZoomControls({
  zoom,
  onZoomOut,
  onZoomIn,
  onReset,
  className,
}: {
  zoom: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onReset: () => void;
  className?: string;
}) {
  const btn =
    'p-2 sm:p-1.5 min-w-[44px] min-h-[44px] sm:min-w-[34px] sm:min-h-[34px] flex items-center justify-center rounded-[var(--radius-button)] border border-border text-muted hover:text-foreground hover:bg-surface-muted transition active:scale-95 touch-manipulation cursor-pointer';

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <button type="button" onClick={onZoomOut} className={btn} aria-label="Zoom arrière" title="Zoom arrière">
        <ZoomOut className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
      </button>
      <span className="text-xs text-muted font-mono w-10 text-center select-none tabular-nums">
        {Math.round(zoom * 100)}%
      </span>
      <button type="button" onClick={onZoomIn} className={btn} aria-label="Zoom avant" title="Zoom avant">
        <ZoomIn className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
      </button>
      <button type="button" onClick={onReset} className={btn} aria-label="Recentrer le plan" title="Recentrer le plan">
        <RotateCcw className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
      </button>
    </div>
  );
}

export function usePlanFullscreen() {
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const inertRoots = [
      document.getElementById('main-content'),
      document.querySelector('header'),
      document.querySelector('.em-site-bottom-nav'),
    ].filter((el): el is HTMLElement => el instanceof HTMLElement);
    inertRoots.forEach((el) => el.setAttribute('inert', ''));

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false);
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const nodes = focusableIn(panelRef.current);
      if (nodes.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      const inside = panelRef.current.contains(active);
      if (event.shiftKey && (!inside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    const focusTimer = window.setTimeout(() => {
      const preferred = panelRef.current?.querySelector<HTMLElement>('[data-plan-fullscreen-close]');
      (preferred || panelRef.current)?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      inertRoots.forEach((el) => el.removeAttribute('inert'));
      window.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(focusTimer);
      previousFocusRef.current?.focus?.();
    };
  }, [expanded]);

  return {
    expanded,
    setExpanded,
    toggleExpanded: () => setExpanded((current) => !current),
    panelRef,
  };
}

export function PlanSceneControls({
  showWalls,
  showRoof,
  onToggleWalls,
  onToggleRoof,
  onToggleFullscreen,
  isFullscreen = false,
  showRoofControl = true,
  variant = 'surface',
  className,
}: {
  showWalls: boolean;
  showRoof?: boolean;
  onToggleWalls: () => void;
  onToggleRoof?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  showRoofControl?: boolean;
  variant?: 'surface' | 'overlay';
  className?: string;
}) {
  const overlay = variant === 'overlay';
  const btn = cn(
    'inline-flex items-center justify-center gap-1 min-h-11 min-w-11 px-2.5 rounded-full text-xs font-semibold transition touch-manipulation active:scale-95',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
    overlay
      ? 'border border-background/20 bg-foreground/80 text-background backdrop-blur-md'
      : 'border border-border bg-surface text-foreground shadow-sm',
  );
  const pressed = overlay
    ? 'bg-background text-foreground border-background'
    : 'bg-foreground text-background border-foreground';

  return (
    <div
      className={cn('flex flex-wrap items-center gap-1.5', className)}
      role="toolbar"
      aria-label="Affichage du plan"
    >
      <button
        type="button"
        aria-pressed={showWalls}
        onClick={onToggleWalls}
        className={cn(btn, showWalls && pressed)}
        title={showWalls ? 'Masquer les murs' : 'Afficher les murs'}
      >
        <BrickWall className="w-3.5 h-3.5" aria-hidden />
        <span>{showWalls ? 'Murs' : 'Sans murs'}</span>
      </button>
      {showRoofControl && onToggleRoof ? (
        <button
          type="button"
          aria-pressed={Boolean(showRoof)}
          onClick={onToggleRoof}
          className={cn(btn, showRoof && pressed)}
          title={showRoof ? 'Masquer le toit' : 'Afficher le toit'}
        >
          <Home className="w-3.5 h-3.5" aria-hidden />
          <span>{showRoof ? 'Toit' : 'Sans toit'}</span>
        </button>
      ) : null}
      {onToggleFullscreen ? (
        <button
          type="button"
          aria-pressed={isFullscreen}
          onClick={onToggleFullscreen}
          className={btn}
          title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          data-plan-fullscreen-close={isFullscreen ? '' : undefined}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" aria-hidden /> : <Maximize2 className="w-3.5 h-3.5" aria-hidden />}
          <span>{isFullscreen ? 'Réduire' : 'Plein écran'}</span>
        </button>
      ) : null}
    </div>
  );
}
