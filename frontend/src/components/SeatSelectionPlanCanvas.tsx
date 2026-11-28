'use client';

import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import FixtureRenderer from '@/components/FixtureRenderer';
import { PlanSceneControls, PlanZoomOverlay, usePlanFullscreen } from '@/components/PlanViewChrome';
import { usePlanViewport } from '@/components/usePlanViewport';
import { planFrameHeight, planLogicalSize } from '@/lib/planViewport';
import { getRoomTheme } from '@/lib/roomThemeUtils';
import { resolveFloorStyle } from '@/lib/roomFloorUtils';
import type { FloorType } from '@/lib/roomThemeUtils';
import { getSeatCoordinates, getTableVisualStyle, planRotationScreenDeg, type TableSeatingSide, type TableShape } from '@/lib/tablePlanUtils';
import { PLAN_ROW_SEAT_WIDTH_M, planRowBoundsPct, planRowLabelPoints, planRowSeats, planRowShortLabel } from '@/lib/planRowSeats';
import {
  checkoutPlanShape,
  isStandaloneChairPlan,
  isTheaterRowPlan,
  type SeatChairMeta,
  type SeatRowMeta,
} from '@/lib/seatSelectionLayout';
import { formatFc } from '@/config/landingPricing';
import { Check } from '@/components/icons';
import { isLightHexColor, pricingZoneAvailability, pricingZoneRect, type PricingZone } from '@/lib/ticketPricing';
import Room2DPlanWalls from '@/components/Room2DPlanWalls';
import Room2DScaleCompass from '@/components/Room2DScaleCompass';
import type { RoomWallSegment } from '@/lib/roomLayoutUtils';

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
  rowMeta?: SeatRowMeta | null;
  chairMeta?: SeatChairMeta | null;
  isPmr?: boolean;
  seatCode?: string | null;
  seatingSide?: TableSeatingSide | null;
  /** Rotation de la table / rangée (degrés, convention de la vue 3D). */
  rotation?: number | null;
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
  walls?: RoomWallSegment[] | null;
  canvasWidthM?: number;
  canvasHeightM?: number;
  activeTableId?: string | null;
  onSelectTable?: (tableId: string) => void;
  selected?: { tableId: string; seatIndex: number } | null;
  selectedSeats?: Array<{ tableId: string; seatIndex: number }>;
  onSelect: (tableId: string, seatIndex: number) => void;
  zoneColorById?: Map<string, string>;
  showZonePricing?: boolean;
  height?: number;
  className?: string;
  /**
   * Billetterie : récapitulatif (places choisies, total) affiché sous le plan en plein écran,
   * avec « Continuer » pour revenir au formulaire sans chercher le bouton « Réduire ».
   */
  fullscreenSummary?: { count: number; totalFc: number };
  /** Légende des zones (prix, places libres) au-dessus du plan. Par défaut : affichée. */
  showLegend?: boolean;
  /** Consigne au-dessus du plan, à la place de « Touchez un siège libre… ». */
  instructions?: string;
}

type PlanTable = {
  id: string;
  name: string;
  shape: TableShape;
  capacity: number;
  x: number;
  y: number;
  seats: SeatSelectionSeat[];
  pricingZoneId?: string | null;
  rowMeta?: SeatRowMeta | null;
  chairMeta?: SeatChairMeta | null;
  seatingSide?: TableSeatingSide | null;
  rotation?: number | null;
};

export default function SeatSelectionPlanCanvas({
  seats,
  fixtures,
  roomOutline,
  roomThemeId,
  floorType,
  floorImageUrl,
  pricingZones = [],
  walls,
  canvasWidthM = 20,
  canvasHeightM = 16,
  activeTableId,
  onSelectTable,
  selected,
  selectedSeats,
  onSelect,
  zoneColorById,
  showZonePricing = false,
  height = 360,
  className = '',
  fullscreenSummary,
  showLegend = true,
  instructions,
}: SeatSelectionPlanCanvasProps) {
  // Le plan est dessiné à taille fixe (proportions réelles de la salle) puis ajusté au cadre :
  // sur un téléphone, la salle entière est visible au lieu de déborder de l’écran.
  const logical = useMemo(() => planLogicalSize(canvasWidthM, canvasHeightM, 900), [canvasWidthM, canvasHeightM]);
  // Rangées de cinéma / d’amphithéâtre : fauteuils à l’échelle de la salle (taille en unités du plan).
  const pxPerM = Math.min(logical.w / Math.max(1, canvasWidthM), logical.h / Math.max(1, canvasHeightM));
  const rowSeatPx = Math.max(8, Math.min(30, PLAN_ROW_SEAT_WIDTH_M * pxPerM));
  const hasRows = useMemo(() => seats.some((s) => isTheaterRowPlan(s.shape, s.rowMeta)), [seats]);
  // Assez de zoom pour qu’un fauteuil fasse au moins ~36 px sous le doigt.
  const rowMaxZoom = hasRows ? Math.min(6, Math.max(2, 36 / rowSeatPx)) : 2;
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
  } = usePlanViewport({ logicalW: logical.w, logicalH: logical.h, maxZoom: rowMaxZoom });
  const [showWalls, setShowWalls] = useState(true);
  /** Zone mise en avant depuis la légende : les autres tables s’estompent. */
  const [focusZoneId, setFocusZoneId] = useState<string | null>(null);
  const { expanded, setExpanded, panelRef, layerStyle } = usePlanFullscreen();

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
      const shape = checkoutPlanShape(s.shape, s.rowMeta);
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
          pricingZoneId: s.pricingZoneId ?? null,
          rowMeta: s.rowMeta ?? null,
          chairMeta: s.chairMeta ?? null,
          seatingSide: s.seatingSide ?? null,
          rotation: s.rotation ?? null,
        });
      }
    }
    return [...map.values()];
  }, [seats]);

  // Rangées de cinéma / gradins : la zone couvre toute la largeur réelle des fauteuils.
  const zoneTables = useMemo(
    () =>
      tables.map((t) => ({
        x: t.x,
        y: t.y,
        pricingZoneId: t.pricingZoneId,
        bounds:
          isTheaterRowPlan(t.shape, t.rowMeta) && !isStandaloneChairPlan(t.chairMeta)
            ? planRowBoundsPct(t, fixtures, canvasWidthM, canvasHeightM)
            : null,
      })),
    [tables, fixtures, canvasWidthM, canvasHeightM],
  );
  const zoneRects = useMemo(
    () =>
      pricingZones
        .map((zone) => {
          const members = zoneTables.filter((t) => t.pricingZoneId === zone.id);
          return { zone, rect: pricingZoneRect(zone, zoneTables), rows: members.length > 0 && members.every((t) => t.bounds) };
        })
        .filter((z): z is { zone: PricingZone; rect: NonNullable<typeof z.rect>; rows: boolean } => z.rect != null),
    [pricingZones, zoneTables],
  );
  const zoneStats = useMemo(() => pricingZoneAvailability(pricingZones, seats), [pricingZones, seats]);
  const activeFocusZoneId = focusZoneId && pricingZones.some((z) => z.id === focusZoneId) ? focusZoneId : null;
  const colorOfZone = (zoneId?: string | null) =>
    zoneId ? zoneColorById?.get(zoneId) ?? pricingZones.find((z) => z.id === zoneId)?.color : undefined;

  // De loin, les sièges sont trop petits pour le doigt : le premier toucher rapproche la table.
  const tableZoomFirst = zoom < 0.62;
  // Un fauteuil de rangée doit faire au moins ~22 px à l’écran pour être touché sans erreur.
  const rowZoomFirst = zoom * rowSeatPx < 22;
  const zoomFirst = hasRows ? rowZoomFirst : tableZoomFirst;
  const rowFocusZoom = Math.min(rowMaxZoom, Math.max(1.05, 32 / rowSeatPx));
  const focusTable = (table: PlanTable) => {
    focusOn((table.x / 100) * logical.w, (table.y / 100) * logical.h, 1.05);
  };
  const focusPoint = (xPct: number, yPct: number) => {
    focusOn((xPct / 100) * logical.w, (yPct / 100) * logical.h, rowFocusZoom);
  };
  const frameHeight = expanded
    ? undefined
    : planFrameHeight(frameBox.w, logical.w, logical.h, { min: 260, max: Math.max(height, 480), padding: 12 });
  const pxPerMeter = (logical.w * zoom) / Math.max(1, canvasWidthM);

  const viewer = (
    <div className={cn('space-y-2', expanded && 'flex h-full min-h-0 flex-col p-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 flex-1 text-xs text-muted" aria-live="polite">
          {instructions ?? (zoomFirst
            ? hasRows
              ? 'Touchez un rang pour le rapprocher, puis choisissez un fauteuil libre'
              : 'Touchez une table pour la rapprocher, puis choisissez un siège libre'
            : 'Touchez un siège libre sur le plan')}
        </p>
        <PlanSceneControls
          showWalls={showWalls}
          onToggleWalls={() => setShowWalls((current) => !current)}
          showRoofControl={false}
          showWallsControl={Boolean(walls && walls.length > 0)}
          onToggleFullscreen={() => setExpanded((current) => !current)}
          isFullscreen={expanded}
          className="justify-end"
        />
      </div>

      {showLegend && zoneStats.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Zones tarifaires">
          {zoneStats.map(({ zone, total, available }) => {
            const color = zone.color || '#c4a35a';
            const active = activeFocusZoneId === zone.id;
            return (
              <button
                key={zone.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFocusZoneId(active ? null : zone.id)}
                className={cn(
                  'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border bg-surface px-2.5 py-1.5 text-left transition touch-manipulation',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  active ? 'shadow-sm' : 'border-border hover:bg-surface-muted',
                  activeFocusZoneId && !active && 'opacity-60',
                )}
                style={active ? { borderColor: color, boxShadow: `0 0 0 2px ${color}55` } : undefined}
                title={active ? 'Afficher toutes les zones' : `Mettre en avant la zone ${zone.name}`}
              >
                <span className="h-3 w-3 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: color }} aria-hidden />
                <span className="flex flex-col leading-tight">
                  <span className="text-xs font-bold text-foreground">
                    {zone.name}
                    {showZonePricing && zone.priceFc > 0 ? (
                      <span className="ml-1 font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatFc(zone.priceFc)}</span>
                    ) : null}
                  </span>
                  {total > 0 ? (
                    <span className="text-[11px] text-muted tabular-nums">
                      {available === 0 ? 'Complet' : `${available} libre${available > 1 ? 's' : ''} sur ${total}`}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className={cn('relative w-full', expanded && 'min-h-0 flex-1')}>
      <div
        ref={bindFrame}
        role="region"
        aria-label="Plan de salle. Pincez, faites glisser ou utilisez les boutons pour zoomer."
        className={cn(
          'relative w-full overflow-auto overscroll-contain rounded-[var(--radius-card)] border border-border bg-surface-muted touch-pan-x touch-pan-y',
          expanded && 'h-full',
        )}
        style={{ height: frameHeight, maxHeight: expanded ? undefined : 'min(70dvh, 560px)' }}
      >
        <div style={spacerStyle}>
        <div
          className="em-floor-canvas em-floor-canvas--photo overflow-hidden rounded-xl shadow-[var(--shadow-soft)]"
          style={{ ...floorStyle, ...stageStyle }}
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

          {showWalls && walls && walls.length > 0 && (
            <Room2DPlanWalls
              walls={walls}
              canvasWidthM={canvasWidthM}
              canvasHeightM={canvasHeightM}
              showDoorSwings={true}
            />
          )}
          <Room2DScaleCompass
            widthM={canvasWidthM}
            heightM={canvasHeightM}
            showGrid
            showLabels={false}
          />

          {zoneRects.map(({ zone, rect, rows }) => {
            const color = zone.color || '#c4a35a';
            const dimmed = activeFocusZoneId != null && activeFocusZoneId !== zone.id;
            const focused = activeFocusZoneId === zone.id;
            // Étiquette lisible quel que soit le zoom (le plan est réduit pour tenir dans l’écran).
            const labelPx = Math.round(Math.min(22, Math.max(12, 12 / Math.max(0.3, zoom))));
            const priceText = showZonePricing && zone.priceFc > 0 ? formatFc(zone.priceFc) : '';
            const labelText = `${zone.name}${priceText ? ` · ${priceText}` : ''}`;
            const placement = zoneLabelPlacement(rect, rows, zone.name, priceText, labelPx, logical.w);
            return (
              <div
                key={zone.id}
                className="absolute pointer-events-none z-[1] rounded-lg transition-opacity"
                style={{
                  left: `${rect.x}%`,
                  top: `${rect.y}%`,
                  width: `${rect.w}%`,
                  height: `${rect.h}%`,
                  backgroundColor: `${color}${focused ? '40' : '29'}`,
                  border: `2px ${focused ? 'solid' : 'dashed'} ${color}`,
                  opacity: dimmed ? 0.35 : 1,
                }}
                title={zone.name}
              >
                <span
                  className={cn(
                    'absolute rounded-full font-extrabold leading-none shadow-sm',
                    placement.vertical ? 'flex flex-col items-center gap-[0.3em] whitespace-nowrap' : 'truncate',
                  )}
                  style={{
                    ...placement.style,
                    backgroundColor: color,
                    color: isLightHexColor(color) ? '#111827' : '#ffffff',
                    fontSize: labelPx,
                    padding: `${Math.round(labelPx * 0.3)}px ${Math.round(labelPx * 0.6)}px`,
                  }}
                >
                  {placement.vertical && priceText ? (
                    <>
                      <span>{zone.name}</span>
                      <span className="opacity-90">{priceText}</span>
                    </>
                  ) : (
                    labelText
                  )}
                </span>
              </div>
            );
          })}

          {(fixtures ?? []).map((fixture) => (
            <div
              key={fixture.id}
              className="absolute pointer-events-none z-[5]"
              style={{
                left: `${fixture.x}%`,
                top: `${fixture.y}%`,
                width: `${fixture.w}%`,
                height: `${fixture.h}%`,
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
                }}
              />
            </div>
          ))}

          {tables.map((table) => {
            const tableHasSelection =
              (selectedSeats && selectedSeats.some((s) => s.tableId === table.id)) ||
              selected?.tableId === table.id;
            const isFocused = activeTableId === table.id;
            const zoneColor = colorOfZone(table.pricingZoneId);
            const outOfFocus = activeFocusZoneId != null && table.pricingZoneId !== activeFocusZoneId;
            const isRow = isTheaterRowPlan(table.shape, table.rowMeta);
            const isChair = isStandaloneChairPlan(table.chairMeta);
            if (isRow && !isChair) {
              return (
                <PlanRowSeats
                  key={table.id}
                  table={table}
                  fixtures={fixtures}
                  widthM={canvasWidthM}
                  heightM={canvasHeightM}
                  seatPx={rowSeatPx}
                  zoomFirst={rowZoomFirst}
                  highlighted={Boolean(tableHasSelection || isFocused)}
                  zoneColor={zoneColor}
                  zoneColorById={zoneColorById}
                  showZonePricing={showZonePricing}
                  dimmed={outOfFocus}
                  isSeatSelected={isSeatSelected}
                  getSeatBadge={getSeatBadge}
                  onFocusPoint={focusPoint}
                  onSelectTable={onSelectTable}
                  onSelect={onSelect}
                />
              );
            }
            const visual = getTableVisualStyle(table.shape, Boolean(tableHasSelection || isFocused), undefined);
            const availableSeatsCount = table.seats.filter((s) => s.available).length;
            // Même sens de rotation que la vue 3D ; une chaise seule s’oriente via son dossier.
            const screenRot = isChair ? 0 : planRotationScreenDeg(table.rotation);
            const upright = screenRot ? { transform: `rotate(${-screenRot}deg)` } : undefined;

            return (
              <div
                key={table.id}
                className="absolute select-none transition-opacity"
                style={{
                  left: `${table.x}%`,
                  top: `${table.y}%`,
                  transform: 'translate(-50%, -50%)',
                  opacity: outOfFocus ? 0.3 : 1,
                }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (tableZoomFirst) focusTable(table);
                    onSelectTable?.(table.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectTable?.(table.id);
                    }
                  }}
                  className={cn(
                    'relative flex items-center justify-center text-center cursor-pointer transition-shadow',
                    isChair && 'min-w-10 min-h-10 rounded-full bg-transparent border-0',
                    !isChair && visual.className,
                    tableHasSelection && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                    isFocused && !tableHasSelection && 'ring-2 ring-amber-500 ring-offset-1 ring-offset-background',
                  )}
                  style={{
                    ...(isChair ? {} : visual.style),
                    ...(screenRot ? { transform: `rotate(${screenRot}deg)` } : {}),
                  }}
                  title={`${table.name} (${availableSeatsCount}/${table.capacity} places libres)`}
                >
                  <div className={cn('px-1 relative z-10 pointer-events-none', isChair && 'hidden sm:block')} style={upright}>
                    <div className="truncate max-w-[5.5rem] sm:max-w-[72px] font-semibold text-xs sm:text-xs">{table.name}</div>
                    {table.seats[0]?.pricingZoneName && (
                      <div
                        className="text-[9px] leading-none px-1.5 py-0.5 rounded-full font-bold truncate max-w-[72px] mx-auto mt-0.5 shadow-2xs"
                        style={{
                          backgroundColor: zoneColor || 'rgba(0,0,0,0.08)',
                          color: zoneColor ? (isLightHexColor(zoneColor) ? '#111827' : '#ffffff') : 'inherit',
                        }}
                      >
                        {table.seats[0].pricingZoneName}
                      </div>
                    )}
                  </div>

                  {table.seats.map((seat) => {
                    const coords = isChair
                      ? { x: 0, y: 0, rotationDeg: planRotationScreenDeg(table.chairMeta?.rotation) }
                      : getSeatCoordinates(table.shape, table.capacity, seat.seatIndex, undefined, table.seatingSide);
                    const isSelected = isSeatSelected(seat.tableId, seat.seatIndex);
                    const badge = getSeatBadge(seat.tableId, seat.seatIndex);
                    const seatZoneColor = seat.pricingZoneId ? colorOfZone(seat.pricingZoneId) : zoneColor;

                    return (
                      <button
                        key={seat.seatIndex}
                        type="button"
                        disabled={!seat.available}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (tableZoomFirst) {
                            focusTable(table);
                            onSelectTable?.(seat.tableId);
                            return;
                          }
                          if (seat.available) {
                            onSelectTable?.(seat.tableId);
                            onSelect(seat.tableId, seat.seatIndex);
                          }
                        }}
                        style={{
                          left: `calc(50% + ${coords.x}px)`,
                          top: `calc(50% + ${coords.y}px)`,
                          transform: 'translate(-50%, -50%)',
                          ...(seatZoneColor && !isSelected ? { borderColor: seatZoneColor, boxShadow: `0 0 0 1px ${seatZoneColor}55` } : {}),
                          ...(seatZoneColor && seat.available && !isSelected
                            ? { backgroundColor: `color-mix(in srgb, ${seatZoneColor} 22%, var(--surface))` }
                            : {}),
                        }}
                        className={cn(
                          'absolute w-8 h-8 sm:w-7 sm:h-7 rounded-full border flex items-center justify-center text-xs sm:text-[8px] font-bold transition z-20 touch-manipulation active:scale-95 before:content-[\'\'] before:absolute before:-inset-2.5 before:rounded-full',
                          !seat.available && 'opacity-35 cursor-not-allowed bg-muted text-muted border-border',
                          seat.available && !isSelected && 'bg-surface hover:bg-primary/10 hover:border-primary cursor-pointer border-border text-foreground',
                          isSelected && 'bg-primary-solid text-primary-foreground border-primary-solid scale-110 shadow-md font-extrabold ring-2 ring-primary-solid/40',
                          seat.isPmr && 'ring-1 ring-sky-500/70',
                        )}
                        title={
                          seat.available
                            ? `${seat.seatCode || `Siège ${seat.seatIndex + 1}`}${seat.isPmr ? ' · PMR' : ''}${seat.pricingZoneName ? ` · ${seat.pricingZoneName}` : ''}${showZonePricing && seat.priceFc ? ` · ${formatFc(seat.priceFc)}` : ''}${isSelected ? ' (Sélectionné — cliquer pour retirer)' : ''}`
                            : 'Occupé'
                        }
                      >
                        {/* Dossier de chaise orienté vers l'extérieur (le corps regarde vers la table) */}
                        <span
                          className="absolute pointer-events-none rounded-full"
                          style={{
                            width: '16px',
                            height: '3px',
                            top: '-3px',
                            left: 'calc(50% - 8px)',
                            transformOrigin: '8px 15px',
                            transform: `rotate(${coords.rotationDeg ?? 0}deg)`,
                            backgroundColor: isSelected ? 'var(--primary)' : (seatZoneColor || '#94a3b8'),
                            opacity: seat.available ? 0.85 : 0.35,
                          }}
                        />
                        <span className="relative z-10 inline-block" style={upright}>{isChair && seat.isPmr ? 'PMR' : seat.seatIndex + 1}</span>
                        {badge != null && (
                          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[7px] font-black flex items-center justify-center border border-white z-20">
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
        <Room2DScaleCompass
          widthM={canvasWidthM}
          heightM={canvasHeightM}
          showGrid={false}
          placement="grouped"
          pxPerMeter={pxPerMeter}
          className="rounded-[var(--radius-card)]"
        />
        <PlanZoomOverlay
          zoom={zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFit={fit}
          className="absolute top-2 right-2 z-30"
        />
      </div>
      {expanded && fullscreenSummary ? (
        <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-border bg-surface p-2.5 shadow-sm">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">
              {fullscreenSummary.count === 0
                ? 'Aucune place choisie'
                : `${fullscreenSummary.count} place${fullscreenSummary.count > 1 ? 's' : ''} choisie${fullscreenSummary.count > 1 ? 's' : ''}`}
            </p>
            {fullscreenSummary.totalFc > 0 ? (
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatFc(fullscreenSummary.totalFc)}</p>
            ) : (
              <p className="truncate text-xs text-muted">Touchez un siège libre sur le plan</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[var(--radius-button)] bg-primary-solid px-3.5 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Check className="h-4 w-4" aria-hidden />
            {fullscreenSummary.count > 0 ? 'Continuer' : 'Fermer'}
          </button>
        </div>
      ) : null}
    </div>
  );

  if (expanded && typeof document !== 'undefined') {
    return createPortal(
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Plan de salle en plein écran"
        style={layerStyle}
        className="fixed inset-0 flex flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] outline-none"
      >
        {viewer}
      </div>,
      document.body,
    );
  }

  return viewer;
}

/**
 * Où poser l’étiquette « nom · prix » d’une zone sans masquer de siège :
 * - tables : au-dessus du cadre (il y a toujours une allée entre deux zones) ;
 * - rangées de cinéma / gradins : les zones se touchent d’un rang à l’autre, donc sur le côté,
 *   dans l’allée latérale (à gauche, sinon à droite), centrée sur la hauteur de la zone.
 */
function zoneLabelPlacement(
  rect: { x: number; y: number; w: number; h: number },
  rows: boolean,
  name: string,
  price: string,
  labelPx: number,
  planW: number,
): { style: React.CSSProperties; vertical: boolean } {
  if (rows) {
    // Place disponible de chaque côté (en unités du plan), au-delà des lettres de rang.
    const gap = 36;
    const left = (rect.x / 100) * planW - gap - 4;
    const right = ((100 - rect.x - rect.w) / 100) * planW - gap - 4;
    const chars = name.length + (price ? price.length + 3 : 0);
    const width = chars * labelPx * 0.58 + labelPx * 1.4;
    const middle = { top: '50%', transform: 'translateY(-50%)', maxWidth: 'none' } as const;
    if (left >= width) return { vertical: false, style: { right: `calc(100% + ${gap}px)`, ...middle } };
    if (right >= width) return { vertical: false, style: { left: `calc(100% + ${gap}px)`, ...middle } };
    // Allée trop étroite : étiquette verticale le long de la zone, nom et prix sur deux colonnes.
    const thick = labelPx * (price ? 3 : 1.7);
    const vertical = { top: '50%', writingMode: 'vertical-rl', maxWidth: 'none' } as const;
    if (left >= thick) {
      return { vertical: true, style: { ...vertical, right: `calc(100% + ${gap}px)`, transform: 'translateY(-50%) rotate(180deg)' } };
    }
    if (right >= thick) {
      return { vertical: true, style: { ...vertical, left: `calc(100% + ${gap}px)`, transform: 'translateY(-50%)' } };
    }
    return { vertical: false, style: { left: 4, top: 4, maxWidth: 'calc(100% - 8px)' } };
  }
  if (rect.y < 5) return { vertical: false, style: { left: 4, top: 4, maxWidth: 'calc(100% - 8px)' } };
  return { vertical: false, style: { left: -2, bottom: 'calc(100% + 3px)', maxWidth: '100%' } };
}

/**
 * Rangée de cinéma / d’amphithéâtre : chaque fauteuil à sa vraie place (courbure, allée,
 * orientation vers l’écran ou la scène), à l’échelle de la salle, avec la lettre du rang aux deux bouts.
 */
function PlanRowSeats({
  table,
  fixtures,
  widthM,
  heightM,
  seatPx,
  zoomFirst,
  highlighted,
  zoneColor,
  zoneColorById,
  showZonePricing,
  dimmed = false,
  isSeatSelected,
  getSeatBadge,
  onFocusPoint,
  onSelectTable,
  onSelect,
}: {
  table: PlanTable;
  fixtures?: PlanFixture[] | null;
  widthM: number;
  heightM: number;
  seatPx: number;
  zoomFirst: boolean;
  highlighted: boolean;
  zoneColor?: string;
  zoneColorById?: Map<string, string>;
  showZonePricing: boolean;
  dimmed?: boolean;
  isSeatSelected: (tableId: string, seatIndex: number) => boolean;
  getSeatBadge: (tableId: string, seatIndex: number) => number | null;
  onFocusPoint: (xPct: number, yPct: number) => void;
  onSelectTable?: (tableId: string) => void;
  onSelect: (tableId: string, seatIndex: number) => void;
}) {
  const layout = useMemo(
    () => planRowSeats(table, fixtures, widthM, heightM),
    [table, fixtures, widthM, heightM],
  );
  const labels = useMemo(() => planRowLabelPoints(layout, widthM, heightM), [layout, widthM, heightM]);
  const short = planRowShortLabel(table.name, table.rowMeta);
  const available = table.seats.filter((s) => s.available).length;
  const fontPx = Math.max(5, Math.round(seatPx * 0.42));
  const labelPx = Math.max(7, Math.round(seatPx * 0.55));
  const focusRow = () => {
    const mid = layout[Math.floor(layout.length / 2)];
    if (mid) onFocusPoint(mid.xPct, mid.yPct);
    onSelectTable?.(table.id);
  };

  return (
    <>
      {labels.map((p, i) => (
        <button
          key={`label-${i}`}
          type="button"
          onClick={focusRow}
          className={cn(
            'absolute z-[15] flex items-center justify-center rounded-md font-extrabold leading-none tabular-nums shadow-2xs touch-manipulation',
            highlighted ? 'bg-primary-solid text-primary-foreground' : 'bg-surface/90 text-foreground border border-border',
          )}
          style={{
            left: `${p.xPct}%`,
            top: `${p.yPct}%`,
            opacity: dimmed ? 0.3 : undefined,
            minWidth: labelPx * 1.6,
            height: labelPx * 1.6,
            fontSize: labelPx,
            padding: '0 3px',
            transform: 'translate(-50%, -50%)',
          }}
          title={`${table.name} (${available}/${table.capacity} places libres)`}
          aria-label={`${table.name}, ${available} places libres sur ${table.capacity}`}
        >
          {short}
        </button>
      ))}
      {table.seats.map((seat) => {
        const pos = layout[seat.seatIndex];
        if (!pos) return null;
        const isSelected = isSeatSelected(seat.tableId, seat.seatIndex);
        const badge = getSeatBadge(seat.tableId, seat.seatIndex);
        const seatZoneColor = seat.pricingZoneId ? zoneColorById?.get(seat.pricingZoneId) : zoneColor;
        const code = seat.seatCode || `${short}${seat.seatIndex + 1}`;
        return (
          <button
            key={seat.seatIndex}
            type="button"
            disabled={!seat.available && !zoomFirst}
            onClick={(e) => {
              e.stopPropagation();
              if (zoomFirst) {
                onFocusPoint(pos.xPct, pos.yPct);
                onSelectTable?.(seat.tableId);
                return;
              }
              if (seat.available) {
                onSelectTable?.(seat.tableId);
                onSelect(seat.tableId, seat.seatIndex);
              }
            }}
            style={{
              left: `${pos.xPct}%`,
              top: `${pos.yPct}%`,
              width: seatPx,
              height: seatPx,
              fontSize: fontPx,
              transform: `translate(-50%, -50%)${isSelected ? ' scale(1.12)' : ''}`,
              opacity: dimmed ? 0.3 : undefined,
              ...(seatZoneColor && !isSelected ? { borderColor: seatZoneColor, boxShadow: `0 0 0 1px ${seatZoneColor}55` } : {}),
              ...(seatZoneColor && seat.available && !isSelected
                ? { backgroundColor: `color-mix(in srgb, ${seatZoneColor} 22%, var(--surface))` }
                : {}),
            }}
            className={cn(
              'absolute z-20 flex items-center justify-center rounded-[28%] border font-bold leading-none tabular-nums transition touch-manipulation',
              !seat.available && 'cursor-not-allowed bg-muted text-muted border-border opacity-40',
              seat.available && !isSelected && 'bg-surface hover:bg-primary/10 hover:border-primary cursor-pointer border-border text-foreground',
              isSelected && 'z-[21] bg-primary-solid text-primary-foreground border-primary-solid shadow-md font-extrabold ring-2 ring-primary-solid/40',
              seat.isPmr && 'ring-1 ring-sky-500/70',
            )}
            title={
              seat.available
                ? `${code}${seat.isPmr ? ' · PMR' : ''}${seat.pricingZoneName ? ` · ${seat.pricingZoneName}` : ''}${showZonePricing && seat.priceFc ? ` · ${formatFc(seat.priceFc)}` : ''}${isSelected ? ' (Sélectionné — cliquer pour retirer)' : ''}`
                : `${code} · Occupé`
            }
            aria-label={seat.available ? `Fauteuil ${code}${isSelected ? ', sélectionné' : ''}` : `Fauteuil ${code}, occupé`}
          >
            {/* Dossier : du côté opposé à l’écran / la scène, comme sur la vue 3D. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ transform: `rotate(${pos.rotDeg}deg)` }}
            >
              <span
                className="absolute left-[12%] right-[12%] rounded-full"
                style={{
                  top: -Math.max(1, seatPx * 0.1),
                  height: Math.max(2, seatPx * 0.16),
                  backgroundColor: isSelected ? 'var(--primary)' : (seatZoneColor || '#94a3b8'),
                  opacity: seat.available ? 0.9 : 0.4,
                }}
              />
            </span>
            <span className="relative z-10">{seat.seatIndex + 1}</span>
            {badge != null && (
              <span
                className="absolute -top-1 -right-1 z-20 flex items-center justify-center rounded-full border border-white bg-emerald-500 font-black text-white"
                style={{ width: Math.max(8, seatPx * 0.5), height: Math.max(8, seatPx * 0.5), fontSize: Math.max(5, seatPx * 0.3) }}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}
