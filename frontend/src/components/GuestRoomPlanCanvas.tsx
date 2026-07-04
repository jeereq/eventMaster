'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getRoomOutlineClipPath } from '@/lib/roomLayoutUtils';
import { getRoomTheme } from '@/lib/roomThemeUtils';
import { resolveFloorStyle } from '@/lib/roomFloorUtils';
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
  guestTableId?: string | null;
  guestFullName?: string;
  neighborNames?: string[];
  height?: number;
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
      <div className="bg-slate-900 border border-slate-600 rounded-xl p-3 shadow-2xl text-left space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-white text-xs">{table.name}</p>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-xs shrink-0">✕</button>
        </div>
        <p className="text-[10px] text-slate-400">{getTableShapeLabel(table.shape)} · {table.occupiedCount}/{table.capacity} places</p>
        {table.isGuestTable && (
          <span className="inline-block text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">Votre table</span>
        )}
        {guestNames && guestNames.length > 0 && (
          <ul className="text-[10px] text-slate-300 space-y-0.5 pt-1 border-t border-slate-700">
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
  guestTableId,
  guestFullName,
  neighborNames = [],
  height = 400,
  className = '',
}: GuestRoomPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const theme = getRoomTheme(roomThemeId);
  const effectiveFloorType = (floorType as import('@/lib/roomThemeUtils').FloorType | undefined) ?? theme.defaultFloorType;
  const floorStyle = resolveFloorStyle(effectiveFloorType, floorImageUrl ?? undefined, theme.accentColor);
  const outline = roomOutline;
  const clipPath = outline ? getRoomOutlineClipPath(outline.shape) : undefined;

  const displayPositions = useMemo(
    () => resolveGuestTablePositions(tables.map((t) => ({ id: t.id, x: t.x, y: t.y }))),
    [tables],
  );

  const markerSize = getGuestTableMarkerSize(tables.length);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const fit = computeFitZoom(el.clientWidth, height);
    setZoom(Math.max(0.45, fit));
  }, [height, tables.length]);

  const adjustZoom = (delta: number) => {
    setZoom((z) => Math.max(0.35, Math.min(2, z + delta)));
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-end gap-1.5">
        <button type="button" onClick={() => adjustZoom(-0.15)} className="p-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800" aria-label="Zoom arrière">
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] text-slate-500 font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => adjustZoom(0.15)} className="p-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800" aria-label="Zoom avant">
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            const el = containerRef.current;
            if (el) setZoom(Math.max(0.45, computeFitZoom(el.clientWidth, height)));
          }}
          className="p-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800"
          aria-label="Réinitialiser"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative w-full overflow-auto rounded-2xl border border-slate-700/60 touch-pan-x touch-pan-y"
        style={{
          height: `${height}px`,
          background: theme.guestCanvasBg,
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
          <div
            style={{
              width: GUEST_PLAN_LOGICAL_W,
              height: GUEST_PLAN_LOGICAL_H,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              position: 'relative',
              backgroundImage: theme.canvasPattern
                ? `${theme.canvasPattern}, linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`
                : `linear-gradient(${theme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.gridColor} 1px, transparent 1px)`,
              backgroundSize: theme.canvasPattern ? '100% 100%, 40px 40px, 40px 40px' : '40px 40px',
              background: theme.canvasBackground,
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

              return (
                <div
                  key={table.id}
                  className="absolute z-10 flex flex-col items-center"
                  style={{
                    left: logical.x,
                    top: logical.y,
                    transform: 'translate(-50%, -50%)',
                    width: markerSize + 8,
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
                    className={`flex items-center justify-center shrink-0 transition-all shadow-md overflow-hidden ${
                      tableVisual.className
                    } ${
                      isGuest
                        ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 border-amber-500'
                        : isSelected
                          ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 border-indigo-400'
                          : 'border-slate-500/80 hover:border-indigo-400'
                    }`}
                    style={{
                      width: markerSize,
                      height: markerSize,
                      ...tableVisual.style,
                      backgroundColor: tableVisual.style?.backgroundColor ?? tableVisual.style?.backgroundImage ? undefined : color,
                    }}
                    aria-label={`Table ${table.name}`}
                  >
                    <span className="text-[9px] font-black text-slate-800 leading-none px-0.5 text-center line-clamp-2">
                      {table.name.replace(/^Table\s*/i, 'T')}
                    </span>
                  </button>
                  <span
                    className={`mt-1 text-[8px] font-bold text-center leading-tight max-w-[72px] truncate ${
                      isGuest ? 'text-amber-300' : 'text-slate-400'
                    }`}
                  >
                    {table.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-[10px] text-slate-500 text-center">
        Touchez une table pour voir les détails · Pincez ou utilisez les contrôles de zoom
      </p>
    </div>
  );
}
