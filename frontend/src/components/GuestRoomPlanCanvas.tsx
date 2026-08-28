'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getRoomOutlineClipPath } from '@/lib/roomLayoutUtils';
import { getRoomTheme } from '@/lib/roomThemeUtils';
import {
  resolveFloorStyle,
  resolveGuestDepthAmount,
  depthScaleForY,
  furnitureDepthStyle,
} from '@/lib/roomFloorUtils';
import FloorDepthFrame from '@/components/FloorDepthFrame';
import { getTableVisualStyle } from '@/lib/tablePlanUtils';
import {
  computeFitZoom,
  getGuestTableMarkerSize,
  GUEST_PLAN_LOGICAL_H,
  GUEST_PLAN_LOGICAL_W,
  logicalSizeFromPct,
  pctToLogical,
  resolveGuestTablePositions,
} from '@/lib/guestPlanLayoutUtils';
import FixtureRenderer from '@/components/FixtureRenderer';
import { getTableShapeLabel } from '@/lib/tablePlanUtils';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import type { GuestPlanFixture, GuestRoomOutline, GuestTablePlanOverviewItem } from '@/app/rsvp/GuestTablePlanView';

interface GuestRoomPlanCanvasProps {
  tables: GuestTablePlanOverviewItem[];
  fixtures?: GuestPlanFixture[] | null;
  roomOutline?: GuestRoomOutline | null;
  roomThemeId?: string | null;
  floorType?: string | null;
  floorImageUrl?: string | null;
  depthAmount?: number | null;
  depthView?: boolean | null;
  guestTableId?: string | null;
  guestFullName?: string;
  neighborNames?: string[];
  height?: number;
  /** Remplit le parent (plein écran / RSVP immersif). */
  fill?: boolean;
  className?: string;
}

function TableDetailPopover({
  table,
  guestNames,
  onClose,
}: {
  table: GuestTablePlanOverviewItem;
  guestNames?: string[];
  onClose: () => void;
}) {
  return (
    <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 max-w-[90vw] pointer-events-auto">
      <div className="bg-surface border border-border rounded-[var(--radius-card)] p-3 shadow-[var(--shadow-soft)] text-left space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-foreground text-xs">{table.name}</p>
          <button type="button" onClick={onClose} className="text-muted hover:text-foreground text-xs shrink-0">✕</button>
        </div>
        <p className="text-[10px] text-muted">{getTableShapeLabel(table.shape)} · {table.occupiedCount}/{table.capacity} places</p>
        {table.isGuestTable && (
          <span className="inline-block text-[9px] font-semibold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-md">Votre table</span>
        )}
        {guestNames && guestNames.length > 0 && (
          <ul className="text-[10px] text-muted space-y-0.5 pt-1 border-t border-border">
            {guestNames.map((n) => (
              <li key={n} className="truncate">{n}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function GuestRoomPlanCanvas({
  tables,
  fixtures,
  roomOutline,
  roomThemeId,
  floorType,
  floorImageUrl,
  depthAmount,
  depthView,
  guestTableId,
  guestFullName,
  neighborNames = [],
  height = 400,
  fill = false,
  className = '',
}: GuestRoomPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const theme = getRoomTheme(roomThemeId);
  const effectiveFloorType = (floorType as import('@/lib/roomThemeUtils').FloorType | undefined) ?? theme.defaultFloorType;
  const floorStyle = resolveFloorStyle(effectiveFloorType, floorImageUrl ?? undefined, theme.accentColor);
  const amount = resolveGuestDepthAmount({
    depthAmount: typeof depthAmount === 'number' ? depthAmount : undefined,
    depthView: Boolean(depthView),
  });
  const outline = roomOutline;
  const clipPath = outline ? getRoomOutlineClipPath(outline.shape) : undefined;

  const displayPositions = useMemo(
    () => resolveGuestTablePositions(tables.map((t) => ({ id: t.id, x: t.x, y: t.y }))),
    [tables],
  );

  const markerSize = getGuestTableMarkerSize(tables.length);

  const fitToContainer = () => {
    const el = containerRef.current;
    if (!el) return;
    const h = fill ? el.clientHeight : height;
    const fit = computeFitZoom(el.clientWidth, h);
    setZoom(Math.max(0.22, fit));
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    fitToContainer();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => fitToContainer());
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, fill, tables.length]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        pinchRef.current = {
          dist: Math.hypot(
            event.touches[0].clientX - event.touches[1].clientX,
            event.touches[0].clientY - event.touches[1].clientY,
          ),
          zoom,
        };
      }
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !pinchRef.current) return;
      event.preventDefault();
      const dist = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY,
      );
      const next = pinchRef.current.zoom * (dist / Math.max(1, pinchRef.current.dist));
      setZoom(Math.max(0.22, Math.min(2.4, next)));
    };
    const onTouchEnd = () => {
      pinchRef.current = null;
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [zoom]);

  const adjustZoom = (delta: number) => {
    setZoom((z) => Math.max(0.22, Math.min(2.4, z + delta)));
  };

  return (
    <div className={`space-y-2 ${fill ? 'h-full min-h-0 flex flex-col' : ''} ${className}`} data-guest-no-swipe>
      <div className="flex items-center justify-end gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => adjustZoom(-0.15)}
          className="p-2 sm:p-1.5 min-w-[38px] min-h-[38px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-[var(--radius-button)] border border-border text-muted hover:text-foreground hover:bg-surface-muted transition active:scale-95 touch-manipulation"
          aria-label="Zoom arrière"
        >
          <ZoomOut className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
        </button>
        <span className="text-[11px] text-muted font-mono w-10 text-center select-none">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={() => adjustZoom(0.15)}
          className="p-2 sm:p-1.5 min-w-[38px] min-h-[38px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-[var(--radius-button)] border border-border text-muted hover:text-foreground hover:bg-surface-muted transition active:scale-95 touch-manipulation"
          aria-label="Zoom avant"
        >
          <ZoomIn className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
        </button>
        <button
          type="button"
          onClick={fitToContainer}
          className="p-2 sm:p-1.5 min-w-[38px] min-h-[38px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-[var(--radius-button)] border border-border text-muted hover:text-foreground hover:bg-surface-muted transition active:scale-95 touch-manipulation"
          aria-label="Réinitialiser"
        >
          <RotateCcw className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
        </button>
      </div>

      <div
        ref={containerRef}
        className={`relative w-full overflow-auto rounded-[var(--radius-card)] border border-border shadow-[var(--shadow-soft)] ${fill ? 'flex-1 min-h-0' : ''}`}
        style={{
          height: fill ? undefined : `${height}px`,
          background: 'var(--surface-muted)',
          touchAction: 'none',
        }}
      >
        <div
          style={{
            width: GUEST_PLAN_LOGICAL_W * zoom,
            height: GUEST_PLAN_LOGICAL_H * zoom,
            minWidth: '100%',
            minHeight: '100%',
            position: 'relative',
          }}
        >
          <FloorDepthFrame
            amount={amount}
            floorStyle={floorStyle}
            maxTilt={36}
            className="overflow-hidden"
            style={{
              width: GUEST_PLAN_LOGICAL_W,
              height: GUEST_PLAN_LOGICAL_H,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          >
            {outline && (
              <div
                className="absolute pointer-events-none z-0 overflow-hidden"
                style={{
                  left: (outline.x / 100) * GUEST_PLAN_LOGICAL_W,
                  top: (outline.y / 100) * GUEST_PLAN_LOGICAL_H,
                  width: (outline.w / 100) * GUEST_PLAN_LOGICAL_W,
                  height: (outline.h / 100) * GUEST_PLAN_LOGICAL_H,
                  border: `${outline.strokeWidth ?? 2}px solid ${outline.stroke ?? theme.roomOutline.stroke}`,
                  borderRadius: outline.shape === 'circle' ? '50%' : 8,
                  clipPath,
                  boxShadow: theme.roomOutline.innerGlow,
                }}
              >
                <div className="absolute inset-0" style={floorStyle} />
                {theme.ambientOverlay && (
                  <div className="absolute inset-0" style={{ background: theme.ambientOverlay }} />
                )}
              </div>
            )}

            {(fixtures ?? []).map((fixture) => {
              const size = logicalSizeFromPct(fixture.w, fixture.h);
              const pos = pctToLogical(fixture.x, fixture.y);
              return (
                <div
                  key={fixture.id}
                  className="absolute z-[5]"
                  style={{
                    left: pos.x,
                    top: pos.y,
                    width: size.w,
                    height: size.h,
                    transform: `scale(${depthScaleForY(fixture.y, amount)})`,
                    transformOrigin: '50% 100%',
                    ...furnitureDepthStyle(fixture.y, amount),
                  }}
                >
                  <FixtureRenderer
                    fill
                    showLabel={fixture.kind !== 'flower' && fixture.kind !== 'aisle'}
                    fixture={{
                      ...fixture,
                      x: 0,
                      y: 0,
                      w: 100,
                      h: 100,
                      kind: fixture.kind as 'stage' | 'podium' | 'aisle' | 'entrance' | 'pillar' | 'perimeter' | 'column' | 'flower',
                      columnShape: fixture.columnShape as 'round' | 'square' | undefined,
                      flowerType: fixture.flowerType as import('@/lib/roomLayoutUtils').FlowerType | undefined,
                    }}
                  />
                </div>
              );
            })}

            {tables.map((table) => {
              const pos = displayPositions.get(table.id) ?? { x: table.x, y: table.y };
              const logical = pctToLogical(pos.x, pos.y);
              const isGuest = table.isGuestTable || table.id === guestTableId;
              const isSelected = selectedTableId === table.id;
              const color = table.tableColor ?? theme.defaultTableColor;
              const tableVisual = getTableVisualStyle(table.shape, isGuest || isSelected, color, table.tableImageUrl);
              const depthScale = depthScaleForY(pos.y, amount);

              return (
                <div
                  key={table.id}
                  className="absolute flex flex-col items-center"
                  style={{
                    left: logical.x,
                    top: logical.y,
                    transform: `translate(-50%, -50%) scale(${depthScale})`,
                    width: markerSize + 8,
                    ...furnitureDepthStyle(pos.y, amount),
                    filter: amount > 0 ? 'drop-shadow(var(--em-item-shadow, 0 8px 12px rgba(0,0,0,0.25)))' : undefined,
                  }}
                >
                  {isSelected && (
                    <TableDetailPopover
                      table={table}
                      guestNames={isGuest ? [guestFullName ?? '', ...neighborNames].filter(Boolean) : undefined}
                      onClose={() => setSelectedTableId(null)}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedTableId(isSelected ? null : table.id)}
                    className={`flex items-center justify-center shrink-0 transition-all overflow-hidden ${
 tableVisual.className
 } ${
 isGuest
 ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-background border-amber-500'
 : isSelected
 ? 'ring-2 ring-primary ring-offset-2 ring-offset-background border-primary'
 : 'border-border hover:border-primary'
 }`}
                    style={{
                      width: markerSize,
                      height: markerSize,
                      ...tableVisual.style,
                      backgroundColor: tableVisual.style?.backgroundColor ?? tableVisual.style?.backgroundImage ? undefined : color,
                    }}
                    aria-label={`Table ${table.name}`}
                  >
                    <span className="text-[9px] font-black text-foreground leading-none px-0.5 text-center line-clamp-2">
                      {table.name.replace(/^Table\s*/i, 'T')}
                    </span>
                  </button>
                  <span
                    className={`mt-1 text-[8px] font-bold text-center leading-tight max-w-[72px] truncate ${
 isGuest ? 'text-amber-300' : 'text-muted'
 }`}
                  >
                    {table.name}
                  </span>
                  {isGuest && typeof table.guestSeatIndex === 'number' && (
                    <span className="mt-0.5 text-[8px] font-black uppercase tracking-wide text-amber-200 bg-amber-950/70 px-1.5 py-0.5 rounded">
                      Siège {table.guestSeatIndex + 1}
                    </span>
                  )}
                </div>
              );
            })}
          </FloorDepthFrame>
        </div>
      </div>

      <p className="text-[10px] text-muted text-center shrink-0">
        Touchez une table · Pincez pour zoomer
      </p>
    </div>
  );
}
