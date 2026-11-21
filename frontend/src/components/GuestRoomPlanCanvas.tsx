'use client';

import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { getRoomOutlineClipPath, wallsFromRoomOutline, type RoomWallSegment } from '@/lib/roomLayoutUtils';
import { getRoomTheme } from '@/lib/roomThemeUtils';
import {
  resolveFloorStyle,
  resolveGuestDepthAmount,
  depthScaleForY,
  furnitureDepthStyle,
} from '@/lib/roomFloorUtils';
import FloorDepthFrame from '@/components/FloorDepthFrame';
import { getTableVisualStyle, getTableShapeLabel, getSeatCoordinates, planRotationScreenDeg, rotateSeatCoordinates } from '@/lib/tablePlanUtils';
import {
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
import { PlanSceneControls, PlanZoomOverlay, usePlanFullscreen } from '@/components/PlanViewChrome';
import { usePlanViewport } from '@/components/usePlanViewport';
import { planFrameHeight, planMarkerBoost } from '@/lib/planViewport';
import { cn } from '@/lib/cn';
import { MapPin } from '@/components/icons';
import type { GuestPlanFixture, GuestRoomOutline, GuestTablePlanOverviewItem } from '@/app/rsvp/GuestTablePlanView';
import type { PricingZone } from '@/lib/ticketPricing';

interface GuestRoomPlanCanvasProps {
  tables: GuestTablePlanOverviewItem[];
  fixtures?: GuestPlanFixture[] | null;
  roomOutline?: GuestRoomOutline | null;
  pricingZones?: PricingZone[] | null;
  walls?: RoomWallSegment[] | null;
  /** Espace ouvert (plein air) : ni murs, ni bouton pour les afficher. */
  openSpace?: boolean;
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
  /** Remplit le parent (plein écran / Répondez s’il vous plaît immersif). */
  fill?: boolean;
  /** Bouton « Plein écran » du plan 2D (masqué quand le parent est déjà en plein écran). */
  allowFullscreen?: boolean;
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
    <div className="absolute z-30 inset-2 sm:left-auto sm:w-72 flex flex-col justify-end pointer-events-none animate-fade-in" data-plan-table-card>
      <div className="pointer-events-auto bg-surface border border-border rounded-2xl p-3.5 shadow-xl text-left space-y-2 max-h-full overflow-y-auto overscroll-contain">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-foreground text-xs truncate">{table.name}</p>
            <p className="text-xs text-muted">{getTableShapeLabel(table.shape)} · {table.occupiedCount}/{table.capacity} places</p>
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
                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-xs font-black shadow-xs">
                  Siège n°{effectiveSeatIndex + 1}
                </span>
              </div>
            )}
            {/* Schéma miniature de disposition des sièges */}
            <div className="relative w-36 h-28 mx-auto my-1 flex items-center justify-center">
              <div
                className={`relative flex items-center justify-center font-bold text-xs text-center shadow-xs ${miniVisual.className}`}
                style={{
                  ...miniVisual.style,
                  width: 58,
                  height: 40,
                  fontSize: 10,
                }}
              >
                <span>{table.name.replace(/^Table\s*/i, 'T')}</span>
                {Array.from({ length: Math.min(table.capacity, 16) }).map((_, sIdx) => {
                  const coords = getSeatCoordinates(table.shape, table.capacity, sIdx, 36, table.seatingSide);
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
            <p className="text-xs font-semibold text-muted mb-1">Convives à cette table</p>
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
  openSpace = false,
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
  allowFullscreen = true,
  className = '',
}: GuestRoomPlanCanvasProps) {
  const {
    bindFrame,
    box: frameBox,
    zoom,
    spacerStyle,
    stageStyle,
    zoomIn,
    zoomOut,
    focusOn,
    fit,
  } = usePlanViewport({ logicalW: GUEST_PLAN_LOGICAL_W, logicalH: GUEST_PLAN_LOGICAL_H });
  const { expanded, setExpanded, panelRef } = usePlanFullscreen();
  const filling = fill || expanded;
  const [showWalls, setShowWalls] = useState(true);
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
    if (openSpace) return [];
    if (walls && walls.length > 0) return walls;
    if (outline) return wallsFromRoomOutline(outline, { withEntrance: true });
    return [];
  }, [walls, outline, openSpace]);

  const displayPositions = useMemo(
    () => resolveGuestTablePositions(tables.map((t) => ({ id: t.id, x: t.x, y: t.y }))),
    [tables],
  );

  const markerSize = getGuestTableMarkerSize(tables.length);

  const guestTable = useMemo(
    () => tables.find((t) => t.isGuestTable || t.id === guestTableId),
    [tables, guestTableId],
  );

  const seatRadius = Math.max(markerSize * 0.72, 30);
  // De loin (téléphone, salle entière), les tables grossissent pour rester lisibles sans se toucher.
  const boost = useMemo(
    () => planMarkerBoost(
      zoom,
      [...displayPositions.values()].map((p) => pctToLogical(p.x, p.y)),
      seatRadius * 2 + 24,
      { readableZoom: 1.1, max: 2.2 },
    ),
    [zoom, displayPositions, seatRadius],
  );

  const handleCenterOnGuestTable = () => {
    if (!guestTable) return;
    const pos = displayPositions.get(guestTable.id) ?? { x: guestTable.x, y: guestTable.y };
    const logical = pctToLogical(pos.x, pos.y);
    // Assez près pour lire les numéros de siège, même sur un téléphone.
    // La fiche de la table n’est pas ouverte : elle masquerait la place que l’on vient de viser.
    setSelectedTableId(null);
    focusOn(logical.x, logical.y, Math.max(zoom, 1.35));
  };

  const selectedTable = selectedTableId ? tables.find((t) => t.id === selectedTableId) ?? null : null;
  const selectedIsGuest = Boolean(selectedTable && (selectedTable.isGuestTable || selectedTable.id === guestTableId));
  const selectedSeatIdx = selectedTable
    ? typeof guestSeatIndex === 'number' ? guestSeatIndex : selectedTable.guestSeatIndex
    : undefined;

  const frameHeight = filling
    ? undefined
    : planFrameHeight(frameBox.w, GUEST_PLAN_LOGICAL_W, GUEST_PLAN_LOGICAL_H, { min: 260, max: height, padding: 12 });
  const pxPerMeter = (GUEST_PLAN_LOGICAL_W * zoom) / Math.max(1, canvasWidthM ?? 20);

  const viewer = (
    <div
      className={cn('space-y-2', filling && 'h-full min-h-0 flex flex-col', expanded && 'p-3', className)}
      data-guest-no-swipe
    >
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0 px-1">
        {guestTable ? (
          <button
            type="button"
            onClick={handleCenterOnGuestTable}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/25 text-xs font-bold text-primary transition active:scale-95 shadow-2xs min-h-11 touch-manipulation"
            title="Zoomer sur mon emplacement"
          >
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span>Mon emplacement</span>
          </button>
        ) : <div />}
        <PlanSceneControls
          showWalls={showWalls}
          onToggleWalls={() => setShowWalls((current) => !current)}
          showRoofControl={false}
          showWallsControl={effectiveWalls.length > 0}
          onToggleFullscreen={allowFullscreen && !fill ? () => setExpanded((current) => !current) : undefined}
          isFullscreen={expanded}
          className="justify-end"
        />
      </div>

      <div className={cn('relative w-full', filling && 'flex-1 min-h-0')}>
      <div
        ref={bindFrame}
        role="region"
        aria-label="Plan de salle. Pincez, faites glisser ou utilisez les boutons pour zoomer."
        className={cn(
          'relative w-full overflow-auto overscroll-contain rounded-[var(--radius-card)] border border-border shadow-[var(--shadow-soft)]',
          filling && 'h-full',
        )}
        style={{
          height: frameHeight,
          background: 'var(--surface-muted)',
          touchAction: 'pan-x pan-y',
        }}
      >
        <div style={spacerStyle}>
          <FloorDepthFrame
            amount={amount}
            floorStyle={floorStyle}
            maxTilt={36}
            className="overflow-hidden rounded-xl shadow-[var(--shadow-soft)]"
            style={stageStyle}
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

            {showWalls && effectiveWalls.length > 0 && (
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
                    className="absolute top-1.5 left-2 text-[8.5px] font-extrabold px-2 py-0.5 rounded shadow-2xs tabular-nums"
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

              return (
                <div
                  key={table.id}
                  className={`absolute flex flex-col items-center ${isGuest ? 'z-20' : 'z-10'}`}
                  style={{
                    left: logical.x,
                    top: logical.y,
                    transform: `translate(-50%, -50%) scale(${depthScale * boost})`,
                    width: markerSize + 8,
                    ...furnitureDepthStyle(pos.y, amount),
                    filter: amount > 0 ? 'drop-shadow(var(--em-item-shadow, 0 8px 12px rgba(0,0,0,0.25)))' : undefined,
                  }}
                >
                  {/* Pin / Beacon flottant au-dessus de la table de l'invité */}
                  {/* Une seule étiquette : « Mon siège » quand la place est connue, sinon « Vous êtes ici ». */}
                  {isGuest && typeof mySeatIdx !== 'number' && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center animate-pulse motion-reduce:animate-none">
                      <div className="px-2.5 py-1 rounded-full bg-primary-solid text-primary-foreground text-xs font-extrabold tracking-tight whitespace-nowrap shadow-lg flex items-center gap-1.5 border border-white/40 ring-2 ring-primary-solid/40">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 motion-reduce:hidden"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
                        </span>
                        <span>Vous êtes ici</span>
                      </div>
                      <div className="w-1.5 h-1.5 rotate-45 bg-primary-solid -mt-1 border-r border-b border-white/30" />
                    </div>
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
                          ? 'ring-4 ring-primary ring-offset-2 ring-offset-background border-primary shadow-[0_0_24px_rgba(44,143,98,0.45)] scale-105'
                          : isSelected
                            ? 'ring-2 ring-primary ring-offset-2 ring-offset-background border-primary'
                            : 'border-border hover:border-primary'
                      }`}
                      style={{
                        width: markerSize,
                        height: markerSize,
                        ...tableVisual.style,
                        backgroundColor: tableVisual.style?.backgroundColor ?? tableVisual.style?.backgroundImage ? undefined : color,
                        // Même sens de rotation que la vue 3D.
                        rotate: planRotationScreenDeg(table.rotation) ? `${planRotationScreenDeg(table.rotation)}deg` : undefined,
                      }}
                      aria-label={`Table ${table.name}${isGuest ? ' (Votre table)' : ''}`}
                    >
                      <span
                        className="text-[9px] font-black text-foreground leading-none px-0.5 text-center line-clamp-2"
                        style={planRotationScreenDeg(table.rotation) ? { rotate: `${-planRotationScreenDeg(table.rotation)}deg` } : undefined}
                      >
                        {table.name.replace(/^Table\s*/i, 'T')}
                      </span>
                    </button>

                    {/* Sièges / Chaises disposés autour de la table */}
                    {table.capacity > 0 && Array.from({ length: Math.min(table.capacity, 16) }).map((_, seatIdx) => {
                      const coords = rotateSeatCoordinates(
                        getSeatCoordinates(table.shape, table.capacity, seatIdx, seatRadius, table.seatingSide),
                        table.rotation,
                      );
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
                              className="relative w-6 h-6 rounded-full bg-primary-solid text-primary-foreground font-black text-xs border-2 border-white ring-4 ring-primary/60 shadow-lg shadow-primary/40 flex items-center justify-center select-none cursor-pointer"
                              title={`Votre place exacte : Siège n°${seatIdx + 1}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTableId(table.id);
                              }}
                            >
                              {seatIdx + 1}
                            </div>

                            {/* Badge flottant direct vers le siège */}
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-40 whitespace-nowrap pointer-events-none flex flex-col items-center em-seat-float">
                              <div className="px-2 py-0.5 rounded-full bg-primary-solid text-primary-foreground text-xs font-black shadow-md border border-white flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping motion-reduce:hidden" />
                                <span>Mon siège (n°{seatIdx + 1})</span>
                              </div>
                              <div className="w-1.5 h-1.5 rotate-45 bg-primary-solid -mt-0.5 border-r border-b border-white" />
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
                        <span className="mt-0.5 text-[8px] font-black text-emerald-800 dark:text-emerald-200 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 whitespace-nowrap flex items-center gap-1">
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
            <Room2DScaleCompass
              widthM={canvasWidthM ?? 20}
              heightM={canvasHeightM ?? 16}
              showGrid
              showLabels={false}
            />
          </FloorDepthFrame>
        </div>
      </div>
        {/* Repères et zoom posés sur le cadre : ils restent lisibles quel que soit le zoom. */}
        <Room2DScaleCompass
          widthM={canvasWidthM ?? 20}
          heightM={canvasHeightM ?? 16}
          showGrid={false}
          placement="grouped"
          pxPerMeter={pxPerMeter}
          className={cn('rounded-[var(--radius-card)]', selectedTable && 'hidden')}
        />
        <PlanZoomOverlay
          zoom={zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFit={fit}
          className="absolute top-2 right-2 z-20"
        />
        {selectedTable ? (
          <TableDetailPopover
            table={selectedTable}
            pricingZones={pricingZones}
            guestNames={selectedIsGuest ? [guestFullName ?? '', ...neighborNames].filter(Boolean) : undefined}
            guestSeatIndex={selectedIsGuest ? selectedSeatIdx : undefined}
            onClose={() => setSelectedTableId(null)}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-1 shrink-0 text-xs text-muted" aria-label="Légende du plan">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-primary-solid ring-2 ring-primary/30" aria-hidden />
          Votre siège
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-primary bg-primary/15" aria-hidden />
          Votre table
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border border-border bg-surface" aria-hidden />
          Autres tables
        </span>
        <span className="w-full text-center sm:w-auto">Touchez une table · pincez pour zoomer</span>
      </div>
    </div>
  );

  if (expanded && typeof document !== 'undefined') {
    return createPortal(
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Plan de la salle en plein écran"
        className="fixed inset-0 z-[250] flex flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] outline-none"
      >
        {viewer}
      </div>,
      document.body,
    );
  }

  return viewer;
}
