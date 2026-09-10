'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getRoomOutlineClipPath, wallsFromRoomOutline, type RoomWallSegment } from '@/lib/roomLayoutUtils';
import { getRoomTheme } from '@/lib/roomThemeUtils';
import {
  resolveFloorStyle,
  resolveGuestDepthAmount,
  depthScaleForY,
  furnitureDepthStyle,
} from '@/lib/roomFloorUtils';
import FloorDepthFrame from '@/components/FloorDepthFrame';
import { getTableVisualStyle, getTableShapeLabel, getSeatCoordinates } from '@/lib/tablePlanUtils';
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
import Room2DPlanWalls from '@/components/Room2DPlanWalls';
import Room2DScaleCompass from '@/components/Room2DScaleCompass';
import { PlanZoomControls } from '@/components/PlanViewChrome';
import { MapPin, Sparkles } from 'lucide-react';
import type { GuestPlanFixture, GuestRoomOutline, GuestTablePlanOverviewItem } from '@/app/rsvp/GuestTablePlanView';
import type { PricingZone } from '@/lib/ticketPricing';

interface GuestRoomPlanCanvasProps {
  tables: GuestTablePlanOverviewItem[];
  fixtures?: GuestPlanFixture[] | null;
  roomOutline?: GuestRoomOutline | null;
  pricingZones?: PricingZone[] | null;
  walls?: RoomWallSegment[] | null;
  canvasWidthM?: number;
  canvasHeightM?: number;
  roomThemeId?: string | null;
  floorType?: string | null;
  floorImageUrl?: string | null;
  depthAmount?: number | null;
  depthView?: boolean | null;
  guestTableId?: string | null;
  guestSeatIndex?: number;
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
  pricingZones,
  guestSeatIndex,
  onClose,
}: {
  table: GuestTablePlanOverviewItem;
  guestNames?: string[];
  pricingZones?: PricingZone[] | null;
  guestSeatIndex?: number;
  onClose: () => void;
}) {
  const zone = table.pricingZoneId ? pricingZones?.find((z) => z.id === table.pricingZoneId) : null;
  const effectiveSeatIndex = typeof guestSeatIndex === 'number' ? guestSeatIndex : table.guestSeatIndex;
  const miniVisual = getTableVisualStyle(table.shape, true, table.tableColor, table.tableImageUrl);

  return (
    <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 max-w-[90vw] pointer-events-auto animate-fade-in">
      <div className="bg-surface border border-border rounded-2xl p-3.5 shadow-xl text-left space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-foreground text-xs truncate">{table.name}</p>
            <p className="text-[10px] text-muted">{getTableShapeLabel(table.shape)} · {table.occupiedCount}/{table.capacity} places</p>
            {zone && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold mt-1 shadow-2xs"
                style={{
                  backgroundColor: zone.color ? `${zone.color}22` : 'rgba(196,163,90,0.15)',
                  color: zone.color || '#c4a35a',
                  border: `1px solid ${zone.color ? `${zone.color}55` : 'rgba(196,163,90,0.3)'}`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: zone.color || '#c4a35a' }} />
                <span>Zone {zone.name}</span>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground text-sm shrink-0 min-h-11 min-w-11 flex items-center justify-center rounded-lg hover:bg-surface-muted transition"
            aria-label="Fermer les détails de la table"
          >
            ✕
          </button>
        </div>

        {table.isGuestTable && (
          <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-2.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Mon emplacement</span>
            </div>
            {typeof effectiveSeatIndex === 'number' && (
              <div className="flex items-center justify-between text-xs font-bold text-foreground bg-surface/90 px-2 py-1.5 rounded-lg border border-border">
                <span>Siège réservé :</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-black shadow-xs">
                  Siège n°{effectiveSeatIndex + 1}
                </span>
              </div>
            )}
            {/* Schéma miniature de disposition des sièges */}
            <div className="relative w-36 h-28 mx-auto my-1 flex items-center justify-center">
              <div
                className={`relative flex items-center justify-center font-bold text-[10px] text-center shadow-xs ${miniVisual.className}`}
                style={{
                  ...miniVisual.style,
                  width: 58,
                  height: 40,
                  fontSize: 10,
                }}
              >
                <span>{table.name.replace(/^Table\s*/i, 'T')}</span>
                {Array.from({ length: Math.min(table.capacity, 16) }).map((_, sIdx) => {
                  const coords = getSeatCoordinates(table.shape, table.capacity, sIdx, 36);
                  const isMine = sIdx === effectiveSeatIndex;
                  return (
                    <div
                      key={sIdx}
                      style={{
                        left: `calc(50% + ${coords.x}px)`,
                        top: `calc(50% + ${coords.y}px)`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className={`absolute rounded-full flex items-center justify-center font-black transition-all ${
                        isMine
                          ? 'w-5 h-5 bg-emerald-600 text-white text-[9px] ring-2 ring-emerald-400 shadow-md z-20'
                          : 'w-3.5 h-3.5 bg-surface border border-border text-foreground/80 text-[7.5px] z-10'
                      }`}
                      title={isMine ? `Votre siège (n°${sIdx + 1})` : `Siège n°${sIdx + 1}`}
                    >
                      {sIdx + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {guestNames && guestNames.length > 0 && (
          <div className="pt-1.5 border-t border-border">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Convives à cette table</p>
            <ul className="text-xs text-foreground space-y-1 max-h-32 overflow-y-auto">
              {guestNames.map((n, i) => (
                <li key={i} className="truncate flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                  <span className="truncate">{n}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GuestRoomPlanCanvas({
  tables,
  fixtures,
  roomOutline,
  pricingZones,
  walls,
  canvasWidthM,
  canvasHeightM,
  roomThemeId,
  floorType,
  floorImageUrl,
  depthAmount,
  depthView,
  guestTableId,
  guestSeatIndex,
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

  const effectiveWalls = useMemo(() => {
    if (walls && walls.length > 0) return walls;
    if (outline) return wallsFromRoomOutline(outline, { withEntrance: true });
    return [];
  }, [walls, outline]);

  const displayPositions = useMemo(
    () => resolveGuestTablePositions(tables.map((t) => ({ id: t.id, x: t.x, y: t.y }))),
    [tables],
  );

  const markerSize = getGuestTableMarkerSize(tables.length);

  const guestTable = useMemo(
    () => tables.find((t) => t.isGuestTable || t.id === guestTableId),
    [tables, guestTableId],
  );

  const handleCenterOnGuestTable = () => {
    if (!guestTable || !containerRef.current) return;
    const pos = displayPositions.get(guestTable.id) ?? { x: guestTable.x, y: guestTable.y };
    const logical = pctToLogical(pos.x, pos.y);
    const container = containerRef.current;
    container.scrollTo({
      left: logical.x * zoom - container.clientWidth / 2,
      top: logical.y * zoom - container.clientHeight / 2,
      behavior: 'smooth',
    });
    setSelectedTableId(guestTable.id);
  };

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
      <div className="flex items-center justify-between shrink-0 px-1">
        {guestTable ? (
          <button
            type="button"
            onClick={handleCenterOnGuestTable}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/25 text-xs font-bold text-primary transition active:scale-95 shadow-2xs min-h-11 touch-manipulation"
            title="Centrer le plan sur mon emplacement"
          >
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span>Mon emplacement</span>
          </button>
        ) : <div />}
        <PlanZoomControls
          zoom={zoom}
          onZoomOut={() => adjustZoom(-0.15)}
          onZoomIn={() => adjustZoom(0.15)}
          onReset={fitToContainer}
        />
      </div>

      <div
        ref={containerRef}
        role="region"
        aria-label="Plan de salle. Pincez ou utilisez les boutons pour zoomer."
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

            {effectiveWalls.length > 0 && (
              <Room2DPlanWalls
                walls={effectiveWalls}
                canvasWidthM={canvasWidthM ?? 20}
                canvasHeightM={canvasHeightM ?? 16}
                showDoorSwings={true}
              />
            )}

            {(pricingZones ?? []).map((zone) => {
              let zx = zone.x;
              let zy = zone.y;
              let zw = zone.w;
              let zh = zone.h;
              if (zx == null || zy == null || zw == null || zh == null) {
                const assigned = tables.filter((t) => t.pricingZoneId === zone.id);
                if (assigned.length > 0) {
                  const xs = assigned.map((t) => t.x);
                  const ys = assigned.map((t) => t.y);
                  const minX = Math.max(2, Math.min(...xs) - 8);
                  const maxX = Math.min(98, Math.max(...xs) + 8);
                  const minY = Math.max(2, Math.min(...ys) - 7);
                  const maxY = Math.min(98, Math.max(...ys) + 7);
                  zx = Math.round(minX);
                  zy = Math.round(minY);
                  zw = Math.round(maxX - minX);
                  zh = Math.round(maxY - minY);
                }
              }
              if (zx == null || zy == null || zw == null || zh == null) return null;
              const pos = pctToLogical(zx, zy);
              const size = logicalSizeFromPct(zw, zh);
              return (
                <div
                  key={zone.id}
                  className="absolute pointer-events-none z-[1] rounded-2xl border-2 border-dashed transition-all"
                  style={{
                    left: pos.x,
                    top: pos.y,
                    width: size.w,
                    height: size.h,
                    backgroundColor: zone.color ? `${zone.color}14` : 'rgba(196,163,90,0.08)',
                    borderColor: zone.color ? `${zone.color}66` : 'rgba(196,163,90,0.3)',
                  }}
                  title={zone.name}
                >
                  <span
                    className="absolute top-1.5 left-2 text-[8.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded shadow-2xs tabular-nums"
                    style={{
                      backgroundColor: zone.color || '#c4a35a',
                      color: '#ffffff',
                    }}
                  >
                    {zone.name}
                  </span>
                </div>
              );
            })}

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
              const mySeatIdx = typeof guestSeatIndex === 'number'
                ? guestSeatIndex
                : typeof table.guestSeatIndex === 'number'
                  ? table.guestSeatIndex
                  : undefined;
              const seatRadius = Math.max(markerSize * 0.72, 30);

              return (
                <div
                  key={table.id}
                  className={`absolute flex flex-col items-center ${isGuest ? 'z-20' : 'z-10'}`}
                  style={{
                    left: logical.x,
                    top: logical.y,
                    transform: `translate(-50%, -50%) scale(${depthScale})`,
                    width: markerSize + 8,
                    ...furnitureDepthStyle(pos.y, amount),
                    filter: amount > 0 ? 'drop-shadow(var(--em-item-shadow, 0 8px 12px rgba(0,0,0,0.25)))' : undefined,
                  }}
                >
                  {/* Pin / Beacon flottant au-dessus de la table de l'invité */}
                  {isGuest && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center animate-pulse motion-reduce:animate-none">
                      <div className="px-2.5 py-1 rounded-full bg-primary-solid text-primary-foreground text-[11px] font-extrabold tracking-tight whitespace-nowrap shadow-lg flex items-center gap-1.5 border border-white/40 ring-2 ring-primary-solid/40">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 motion-reduce:hidden"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
                        </span>
                        <span>Vous êtes ici</span>
                      </div>
                      <div className="w-1.5 h-1.5 rotate-45 bg-primary-solid -mt-1 border-r border-b border-white/30" />
                    </div>
                  )}

                  {isSelected && (
                    <TableDetailPopover
                      table={table}
                      pricingZones={pricingZones}
                      guestNames={isGuest ? [guestFullName ?? '', ...neighborNames].filter(Boolean) : undefined}
                      guestSeatIndex={isGuest ? mySeatIdx : undefined}
                      onClose={() => setSelectedTableId(null)}
                    />
                  )}

                  {/* Plateau de la table avec ses sièges disposés autour */}
                  <div className="relative flex items-center justify-center" style={{ width: markerSize, height: markerSize }}>
                    <button
                      type="button"
                      onClick={() => setSelectedTableId(isSelected ? null : table.id)}
                      className={`flex items-center justify-center shrink-0 transition-all overflow-hidden ${
                        tableVisual.className
                      } ${
                        isGuest
                          ? 'ring-4 ring-primary ring-offset-2 ring-offset-background border-primary shadow-[0_0_24px_rgba(5,150,105,0.45)] scale-105'
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
                      aria-label={`Table ${table.name}${isGuest ? ' (Votre table)' : ''}`}
                    >
                      <span className="text-[9px] font-black text-foreground leading-none px-0.5 text-center line-clamp-2">
                        {table.name.replace(/^Table\s*/i, 'T')}
                      </span>
                    </button>

                    {/* Sièges / Chaises disposés autour de la table */}
                    {table.capacity > 0 && Array.from({ length: Math.min(table.capacity, 16) }).map((_, seatIdx) => {
                      const coords = getSeatCoordinates(table.shape, table.capacity, seatIdx, seatRadius);
                      const isMySeat = isGuest && typeof mySeatIdx === 'number' && seatIdx === mySeatIdx;

                      if (isMySeat) {
                        return (
                          <div
                            key={seatIdx}
                            className="absolute z-30 flex items-center justify-center pointer-events-auto"
                            style={{
                              left: `calc(50% + ${coords.x}px)`,
                              top: `calc(50% + ${coords.y}px)`,
                              transform: 'translate(-50%, -50%)',
                            }}
                          >
                            {/* Halo pulsant */}
                            <span className="animate-ping absolute w-7 h-7 rounded-full bg-emerald-400 opacity-75 motion-reduce:hidden" />

                            {/* Siège vert émeraude éclatant */}
                            <div
                              className="relative w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-[10px] border-2 border-white ring-4 ring-emerald-400/80 shadow-lg shadow-emerald-600/50 flex items-center justify-center select-none cursor-pointer"
                              title={`Votre place exacte : Siège n°${seatIdx + 1}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTableId(table.id);
                              }}
                            >
                              {seatIdx + 1}
                            </div>

                            {/* Badge flottant direct vers le siège */}
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-40 whitespace-nowrap pointer-events-none flex flex-col items-center animate-bounce motion-reduce:animate-none">
                              <div className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black shadow-md border border-white flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                <span>Mon siège (n°{seatIdx + 1})</span>
                              </div>
                              <div className="w-1.5 h-1.5 rotate-45 bg-emerald-600 -mt-0.5 border-r border-b border-white" />
                            </div>
                          </div>
                        );
                      }

                      if (isGuest || isSelected) {
                        return (
                          <div
                            key={seatIdx}
                            className="absolute z-20 flex items-center justify-center"
                            style={{
                              left: `calc(50% + ${coords.x}px)`,
                              top: `calc(50% + ${coords.y}px)`,
                              transform: `translate(-50%, -50%) rotate(${coords.rotationDeg ?? 0}deg)`,
                            }}
                            title={`Siège n°${seatIdx + 1}`}
                          >
                            <div className="w-4 h-4 rounded-full bg-surface border border-border/90 text-foreground font-bold text-[7.5px] shadow-2xs flex items-center justify-center select-none">
                              {seatIdx + 1}
                            </div>
                          </div>
                        );
                      }

                      // Pour les autres tables du plan d'ensemble : petits points de chaise architecturaux
                      return (
                        <div
                          key={seatIdx}
                          className="absolute z-10 pointer-events-none"
                          style={{
                            left: `calc(50% + ${coords.x}px)`,
                            top: `calc(50% + ${coords.y}px)`,
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-foreground/25 dark:bg-foreground/35" />
                        </div>
                      );
                    })}
                  </div>

                  {isGuest ? (
                    <div className="flex flex-col items-center mt-1 z-20">
                      <span className="text-[9px] font-black text-center text-primary bg-primary/15 px-2 py-0.5 rounded-full border border-primary/25 whitespace-nowrap">
                        ★ {table.name}
                      </span>
                      {typeof mySeatIdx === 'number' && (
                        <span className="mt-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-200 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 whitespace-nowrap flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Siège n°{mySeatIdx + 1}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="mt-1 text-[8px] font-bold text-center leading-tight max-w-[72px] truncate text-muted">
                      {table.name}
                    </span>
                  )}
                </div>
              );
            })}
          </FloorDepthFrame>
          <Room2DScaleCompass
            widthM={canvasWidthM ?? 20}
            heightM={canvasHeightM ?? 16}
            showGrid={true}
          />
        </div>
      </div>

      <p className="text-[10px] text-muted text-center shrink-0">
        Touchez une table · Pincez pour zoomer
      </p>
    </div>
  );
}
