'use client';

import React, { useMemo, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getFixtureClass } from '@/lib/roomLayoutUtils';
import { getRoomTheme } from '@/lib/roomThemeUtils';
import { resolveFloorStyle } from '@/lib/roomFloorUtils';
import type { FloorType } from '@/lib/roomThemeUtils';
import {
  getSeatCoordinates,
  getTableVisualStyle,
  type TableShape,
} from '@/lib/tablePlanUtils';
import { formatFc } from '@/config/landingPricing';
import type { PricingZone } from '@/lib/ticketPricing';

export type SeatSelectionSeat = {
  tableId: string;
  tableName: string;
  seatIndex: number;
  available: boolean;
  x: number;
  y: number;
  shape: string;
  capacity: number;
  priceFc?: number;
  pricingZoneId?: string | null;
  pricingZoneName?: string | null;
};

type PlanFixture = {
  id: string;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
};

type RoomOutline = {
  x: number;
  y: number;
  w: number;
  h: number;
  shape?: string;
  stroke?: string;
  strokeWidth?: number;
};

export interface SeatSelectionPlanCanvasProps {
  seats: SeatSelectionSeat[];
  fixtures?: PlanFixture[] | null;
  roomOutline?: RoomOutline | null;
  roomThemeId?: string | null;
  floorType?: string | null;
  floorImageUrl?: string | null;
  pricingZones?: PricingZone[];
  selected?: { tableId: string; seatIndex: number } | null;
  selectedSeats?: Array<{ tableId: string; seatIndex: number }>;
  onSelect: (tableId: string, seatIndex: number) => void;
  zoneColorById?: Map<string, string>;
  showZonePricing?: boolean;
  height?: number;
  className?: string;
}

type PlanTable = {
  id: string;
  name: string;
  shape: TableShape;
  capacity: number;
  x: number;
  y: number;
  seats: SeatSelectionSeat[];
};

export default function SeatSelectionPlanCanvas({
  seats,
  fixtures,
  roomOutline,
  roomThemeId,
  floorType,
  floorImageUrl,
  pricingZones = [],
  selected,
  selectedSeats,
  onSelect,
  zoneColorById,
  showZonePricing = false,
  height = 360,
  className = '',
}: SeatSelectionPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  const theme = getRoomTheme(roomThemeId);
  const effectiveFloorType = (floorType as FloorType | undefined) ?? theme.defaultFloorType;
  const floorStyle = resolveFloorStyle(effectiveFloorType, floorImageUrl ?? undefined, theme.accentColor);

  const isSeatSelected = (tableId: string, seatIndex: number) => {
    if (selectedSeats && selectedSeats.length > 0) {
      return selectedSeats.some((s) => s.tableId === tableId && s.seatIndex === seatIndex);
    }
    return selected?.tableId === tableId && selected.seatIndex === seatIndex;
  };

  const getSeatBadge = (tableId: string, seatIndex: number) => {
    if (selectedSeats && selectedSeats.length > 1) {
      const idx = selectedSeats.findIndex((s) => s.tableId === tableId && s.seatIndex === seatIndex);
      return idx >= 0 ? idx + 1 : null;
    }
    return null;
  };

  const tables = useMemo(() => {
    const map = new Map<string, PlanTable>();
    for (const s of seats) {
      const shape = (['round', 'rectangular', 'square', 'oval', 'cocktail', 'highTop'].includes(s.shape)
        ? s.shape
        : 'round') as TableShape;
      const existing = map.get(s.tableId);
      if (existing) {
        existing.seats.push(s);
      } else {
        map.set(s.tableId, {
          id: s.tableId,
          name: s.tableName,
          shape,
          capacity: s.capacity,
          x: s.x,
          y: s.y,
          seats: [s],
        });
      }
    }
    return [...map.values()];
  }, [seats]);

  const adjustZoom = (delta: number) => {
    setZoom((z) => Math.max(0.65, Math.min(1.8, z + delta)));
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-muted">Touchez un siège libre sur le plan</p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => adjustZoom(-0.1)}
            className="p-2 sm:p-1 min-w-[38px] min-h-[38px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-md border border-border text-muted hover:text-foreground hover:bg-surface-muted transition active:scale-95 touch-manipulation"
            aria-label="Zoom arrière"
          >
            <ZoomOut className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
          <span className="text-[11px] text-muted font-mono w-9 text-center select-none">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => adjustZoom(0.1)}
            className="p-2 sm:p-1 min-w-[38px] min-h-[38px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-md border border-border text-muted hover:text-foreground hover:bg-surface-muted transition active:scale-95 touch-manipulation"
            aria-label="Zoom avant"
          >
            <ZoomIn className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="p-2 sm:p-1 min-w-[38px] min-h-[38px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-md border border-border text-muted hover:text-foreground hover:bg-surface-muted transition active:scale-95 touch-manipulation"
            aria-label="Réinitialiser"
          >
            <RotateCcw className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </div>

      {showZonePricing && pricingZones.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pricingZones.map((z) => (
            <span key={z.id} className="inline-flex items-center gap-1 text-[10px] text-muted">
              <span className="w-2.5 h-2.5 rounded-full border border-border" style={{ backgroundColor: z.color || '#c4a35a' }} />
              {z.name} · {formatFc(z.priceFc)}
            </span>
          ))}
        </div>
      )}

      <div
        ref={containerRef}
        className="relative w-full overflow-auto rounded-[var(--radius-card)] border border-border bg-surface-muted touch-pan-x touch-pan-y"
        style={{ height: `${height}px` }}
      >
        <div
          className="relative origin-top-left em-floor-canvas em-floor-canvas--photo min-w-full min-h-full"
          style={{
            ...floorStyle,
            width: `${100 * zoom}%`,
            height: `${100 * zoom}%`,
            minHeight: `${height * zoom}px`,
          }}
        >
          {roomOutline && (
            <div
              className="absolute pointer-events-none border-2 border-dashed border-primary/25 rounded-lg z-0"
              style={{
                left: `${roomOutline.x}%`,
                top: `${roomOutline.y}%`,
                width: `${roomOutline.w}%`,
                height: `${roomOutline.h}%`,
                borderRadius: roomOutline.shape === 'circle' ? '50%' : 8,
              }}
            />
          )}

          {pricingZones.map((zone) => {
            if (zone.x == null || zone.y == null || zone.w == null || zone.h == null) return null;
            return (
              <div
                key={zone.id}
                className="absolute pointer-events-none z-[1] rounded-md border"
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.w}%`,
                  height: `${zone.h}%`,
                  backgroundColor: zone.color ? `${zone.color}22` : 'rgba(196,163,90,0.12)',
                  borderColor: zone.color ? `${zone.color}88` : 'rgba(196,163,90,0.35)',
                }}
                title={zone.name}
              />
            );
          })}

          {(fixtures ?? []).map((fixture) => (
            <div
              key={fixture.id}
              className={cn(
                'absolute pointer-events-none border text-[8px] font-semibold flex items-center justify-center px-1 text-center opacity-60',
                getFixtureClass(fixture.kind),
              )}
              style={{
                left: `${fixture.x}%`,
                top: `${fixture.y}%`,
                width: `${fixture.w}%`,
                height: `${fixture.h}%`,
              }}
            >
              {fixture.kind !== 'aisle' && fixture.label}
            </div>
          ))}

          {tables.map((table) => {
            const tableHasSelection =
              (selectedSeats && selectedSeats.some((s) => s.tableId === table.id)) ||
              selected?.tableId === table.id;
            const visual = getTableVisualStyle(table.shape, Boolean(tableHasSelection), undefined);

            return (
              <div
                key={table.id}
                className="absolute select-none"
                style={{
                  left: `${table.x}%`,
                  top: `${table.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div
                  className={cn(
                    'relative flex items-center justify-center text-center',
                    visual.className,
                    tableHasSelection && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                  )}
                  style={visual.style}
                >
                  <div className="px-1 relative z-10">
                    <div className="truncate max-w-[72px] font-semibold text-[10px]">{table.name}</div>
                  </div>

                  {table.seats.map((seat) => {
                    const coords = getSeatCoordinates(table.shape, table.capacity, seat.seatIndex);
                    const isSelected = isSeatSelected(seat.tableId, seat.seatIndex);
                    const badge = getSeatBadge(seat.tableId, seat.seatIndex);
                    const zoneColor = seat.pricingZoneId ? zoneColorById?.get(seat.pricingZoneId) : undefined;

                    return (
                      <button
                        key={seat.seatIndex}
                        type="button"
                        disabled={!seat.available}
                        onClick={() => seat.available && onSelect(seat.tableId, seat.seatIndex)}
                        style={{
                          left: `calc(50% + ${coords.x}px)`,
                          top: `calc(50% + ${coords.y}px)`,
                          transform: 'translate(-50%, -50%)',
                          ...(zoneColor && !isSelected ? { borderColor: zoneColor, boxShadow: `0 0 0 1px ${zoneColor}55` } : {}),
                        }}
                        className={cn(
                          'absolute w-6 h-6 sm:w-7 sm:h-7 rounded-full border flex items-center justify-center text-[8px] font-bold transition z-20',
                          !seat.available && 'opacity-35 cursor-not-allowed bg-muted text-muted border-border',
                          seat.available && !isSelected && 'bg-surface hover:bg-primary/10 hover:border-primary cursor-pointer border-border text-foreground',
                          isSelected && 'bg-primary text-white border-primary scale-110 shadow-md font-extrabold',
                        )}
                        title={
                          seat.available
                            ? `Siège ${seat.seatIndex + 1}${seat.pricingZoneName ? ` · ${seat.pricingZoneName}` : ''}${showZonePricing && seat.priceFc ? ` · ${formatFc(seat.priceFc)}` : ''}${isSelected ? ' (Sélectionné — cliquer pour retirer)' : ''}`
                            : 'Occupé'
                        }
                      >
                        {seat.seatIndex + 1}
                        {badge != null && (
                          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[7px] font-black flex items-center justify-center border border-white">
                            {badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
