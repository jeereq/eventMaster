'use client';

import React, { useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { formatFc } from '@/config/landingPricing';
import type { PricingZone } from '@/lib/ticketPricing';
import RoomLayoutPreview, { type RoomPreviewQuality } from '@/components/RoomLayoutPreview';
import { buildTablePlanPreviewBlueprint, type TablePlanPreviewTable } from '@/lib/tablePlanPreviewBlueprint';
import type { RoomLayoutBlueprint, TableShape } from '@/lib/roomLayoutUtils';
import {
  checkoutPlanShape,
  isStandaloneChairPlan,
  isTheaterRowPlan,
  type SeatChairMeta,
  type SeatRowMeta,
} from '@/lib/seatSelectionLayout';
import type { LightingPreset } from '@/lib/roomRenderQuality';
import {
  Users,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Eye,
} from '@/components/icons';
import type { AvatarSeatAction, SeatViewRequest } from '@/components/RoomWebGLViewer';

export type SeatSelection3DRow = {
  tableId: string;
  tableName: string;
  seatIndex: number;
  available: boolean;
  x: number;
  y: number;
  shape: string;
  capacity: number;
  priceFc: number;
  pricingZoneId: string | null;
  pricingZoneName: string | null;
  rowMeta?: SeatRowMeta | null;
  chairMeta?: SeatChairMeta | null;
  isPmr?: boolean;
  seatCode?: string | null;
  rotation?: number | null;
};

export type SeatSelection3DMeta = {
  fixtures?: unknown[] | null;
  roomOutline?: unknown | null;
  roomThemeId?: string | null;
  floorType?: string | null;
  floorImageUrl?: string | null;
  roomLayoutBlueprint?: RoomLayoutBlueprint | null;
  roomType?: string | null;
};

export interface SeatSelection3DViewerProps {
  seats: SeatSelection3DRow[];
  selectedSeats: Array<{ tableId: string; seatIndex: number }>;
  onToggleSeat: (tableId: string, seatIndex: number) => void;
  pricingZones?: PricingZone[];
  zoneColorById?: Map<string, string>;
  planMeta?: SeatSelection3DMeta | null;
  lightingPreset?: LightingPreset;
  activeTableId?: string | null;
  onActiveTableChange?: (tableId: string | null) => void;
  className?: string;
}

const QUALITY_OPTIONS = [
  { id: 'standard' as const, label: 'Standard' },
  { id: 'showcase' as const, label: 'Showcase 3D' },
];

function SeatPreviewQualityChips({
  quality,
  onChange,
  variant,
}: {
  quality: RoomPreviewQuality;
  onChange: (next: RoomPreviewQuality) => void;
  variant: 'overlay' | 'bar';
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 gap-1 rounded-full p-0.5',
        variant === 'overlay'
          ? 'border border-background/20 bg-foreground/80'
          : 'border border-border bg-surface',
      )}
      role="group"
      aria-label="Qualité de l’aperçu 3D"
    >
      {QUALITY_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          aria-pressed={quality === opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            'min-h-11 px-2.5 rounded-full text-xs font-semibold transition',
            variant === 'bar' && 'flex-1',
            quality === opt.id
              ? variant === 'overlay'
                ? 'bg-background text-foreground shadow-xs'
                : 'bg-foreground text-background shadow-xs'
              : variant === 'overlay'
                ? 'text-background/70 hover:text-background'
                : 'text-muted hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function SeatSelection3DViewer({
  seats,
  selectedSeats,
  onToggleSeat,
  pricingZones = [],
  zoneColorById,
  planMeta,
  lightingPreset = 'banquet',
  activeTableId,
  onActiveTableChange,
  className = '',
}: SeatSelection3DViewerProps) {
  const [internalFocusedTableId, setInternalFocusedTableId] = useState<string | null>(null);
  const [quality, setQuality] = useState<RoomPreviewQuality>('showcase');
  const [seatView, setSeatView] = useState<SeatViewRequest | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  const focusedTableId = activeTableId !== undefined ? activeTableId : internalFocusedTableId;
  const setFocusedTableId = (id: string | null) => {
    setInternalFocusedTableId(id);
    onActiveTableChange?.(id);
  };

  // Regroupe les sièges par table
  const tablesMap = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      shape: TableShape;
      capacity: number;
      x: number;
      y: number;
      seats: SeatSelection3DRow[];
      pricingZoneId: string | null;
      pricingZoneName: string | null;
      rowMeta?: SeatRowMeta | null;
      chairMeta?: SeatChairMeta | null;
      rotation?: number | null;
    }>();

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
          pricingZoneId: s.pricingZoneId,
          pricingZoneName: s.pricingZoneName,
          rowMeta: s.rowMeta ?? null,
          chairMeta: s.chairMeta ?? null,
          rotation: s.rotation ?? null,
        });
      }
    }
    return map;
  }, [seats]);

  const tablesList = useMemo(() => Array.from(tablesMap.values()), [tablesMap]);

  // Si aucune table n'est sélectionnée, initialiser avec la première ayant des places disponibles
  const activeTable = useMemo(() => {
    if (focusedTableId && tablesMap.has(focusedTableId)) {
      return tablesMap.get(focusedTableId)!;
    }
    // Trouver la première table qui a des places sélectionnées ou disponibles
    const withSelected = tablesList.find((t) =>
      selectedSeats.some((s) => s.tableId === t.id)
    );
    if (withSelected) return withSelected;

    const withAvailable = tablesList.find((t) => t.seats.some((s) => s.available));
    return withAvailable || tablesList[0] || null;
  }, [focusedTableId, tablesMap, tablesList, selectedSeats]);

  // Tables converties pour le blueprint WebGL
  const previewTables = useMemo((): TablePlanPreviewTable[] => {
    return tablesList.map((t) => {
      const zoneColor = t.pricingZoneId ? zoneColorById?.get(t.pricingZoneId) : undefined;
      return {
        id: t.id,
        name: t.name,
        shape: t.shape,
        capacity: t.capacity,
        x: t.x,
        y: t.y,
        pricingZoneId: t.pricingZoneId || undefined,
        tableColor: zoneColor,
        rowMeta: t.rowMeta ?? undefined,
        chairMeta: t.chairMeta ?? undefined,
        rotation: t.rotation ?? undefined,
      };
    });
  }, [tablesList, zoneColorById]);

  // Blueprint 3D complet
  const previewBlueprint = useMemo(() => {
    const rawBlueprint = planMeta?.roomLayoutBlueprint;
    const tablePlanInput = {
      roomOutline: planMeta?.roomOutline as RoomLayoutBlueprint['roomOutline'],
      roomThemeId: planMeta?.roomThemeId,
      floorType: planMeta?.floorType,
      floorImageUrl: planMeta?.floorImageUrl,
      fixtures: planMeta?.fixtures,
      pricingZones,
      lightingPreset,
    };

    return buildTablePlanPreviewBlueprint(tablePlanInput, previewTables, rawBlueprint, pricingZones);
  }, [planMeta, previewTables, pricingZones, lightingPreset]);

  // Liste des IDs de tables ayant au moins un siège sélectionné
  const tablesWithSelection = useMemo(() => {
    const ids = new Set<string>();
    for (const sel of selectedSeats) {
      ids.add(sel.tableId);
    }
    return Array.from(ids);
  }, [selectedSeats]);

  const blockedSeats = useMemo(
    () => seats.filter((s) => !s.available).map((s) => ({ tableId: s.tableId, seatIndex: s.seatIndex })),
    [seats],
  );

  const seatByKey = useMemo(() => {
    const map = new Map<string, SeatSelection3DRow>();
    for (const seat of seats) map.set(`${seat.tableId}:${seat.seatIndex}`, seat);
    return map;
  }, [seats]);

  // Vue depuis la place, comme une billetterie de stade : on choisit (ou retire) la place sans quitter la vue.
  const seatActionFor: AvatarSeatAction = (tableId, seatIndex) => {
    const seat = seatByKey.get(`${tableId}:${seatIndex}`);
    if (!seat) return null;
    const isSelected = selectedSeats.some((s) => s.tableId === tableId && s.seatIndex === seatIndex);
    if (isSelected) {
      return { label: 'Place choisie · la retirer', active: true, onAction: () => onToggleSeat(tableId, seatIndex) };
    }
    if (!seat.available) return { label: 'Place déjà prise', disabled: true, onAction: () => {} };
    return {
      label: seat.priceFc > 0 ? `Choisir cette place · ${formatFc(seat.priceFc)}` : 'Choisir cette place',
      onAction: () => {
        onToggleSeat(tableId, seatIndex);
        setFocusedTableId(tableId);
      },
    };
  };

  const viewFromSeat = (tableId: string, seatIndex: number) => {
    setSeatView((prev) => ({ tableId, seatIndex, key: (prev?.key ?? 0) + 1 }));
    // Sur téléphone le bouton est sous la 3D : on remonte pour voir le vol jusqu'au siège.
    viewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  /** Place à montrer pour la table active : la dernière choisie, sinon la première libre. */
  const seatToPreview = activeTable
    ? [...selectedSeats].reverse().find((s) => s.tableId === activeTable.id)
      ?? activeTable.seats.find((s) => s.available)
      ?? activeTable.seats[0]
    : null;

  // Navigation table précédente / suivante
  const currentTableIndex = activeTable ? tablesList.findIndex((t) => t.id === activeTable.id) : -1;
  const goToPrevTable = () => {
    if (currentTableIndex > 0) {
      setFocusedTableId(tablesList[currentTableIndex - 1].id);
    } else if (tablesList.length > 0) {
      setFocusedTableId(tablesList[tablesList.length - 1].id);
    }
  };
  const goToNextTable = () => {
    if (currentTableIndex >= 0 && currentTableIndex < tablesList.length - 1) {
      setFocusedTableId(tablesList[currentTableIndex + 1].id);
    } else if (tablesList.length > 0) {
      setFocusedTableId(tablesList[0].id);
    }
  };

  // Récapitulatif (page et plein écran) : nombre de places et total.
  const selectedTotalFc = selectedSeats.reduce(
    (sum, sel) => sum + (seatByKey.get(`${sel.tableId}:${sel.seatIndex}`)?.priceFc ?? 0),
    0,
  );

  const seatPanel = activeTable ? (
    <div className="@container rounded-2xl border border-primary/25 bg-surface p-3.5 sm:p-4 shadow-sm space-y-3 animate-in fade-in zoom-in-98">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs">
            <Users className="w-4 h-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-foreground">{activeTable.name}</h4>
              {activeTable.pricingZoneName && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-2xs"
                  style={{
                    backgroundColor:
                      (activeTable.pricingZoneId && zoneColorById?.get(activeTable.pricingZoneId)) ||
                      '#c4a35a',
                  }}
                >
                  {activeTable.pricingZoneName}
                </span>
              )}
            </div>
            <p className="text-xs text-muted">
              {activeTable.seats.filter((s) => s.available).length} place{activeTable.seats.filter((s) => s.available).length > 1 ? 's' : ''} libre{activeTable.seats.filter((s) => s.available).length > 1 ? 's' : ''} sur {activeTable.capacity}
              {activeTable.seats[0]?.priceFc > 0 && (
                <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  · {formatFc(activeTable.seats[0].priceFc)} / place
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Navigation entre tables */}
        {tablesList.length > 1 && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={goToPrevTable}
              className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-muted text-foreground transition min-w-11 min-h-11 flex items-center justify-center"
              title={isTheaterRowPlan(activeTable.shape, activeTable.rowMeta) ? 'Rangée précédente' : 'Emplacement précédent'}
              aria-label={isTheaterRowPlan(activeTable.shape, activeTable.rowMeta) ? 'Rangée précédente' : 'Emplacement précédent'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-muted px-1 tabular-nums">
              {currentTableIndex + 1}/{tablesList.length}
            </span>
            <button
              type="button"
              onClick={goToNextTable}
              className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-muted text-foreground transition min-w-11 min-h-11 flex items-center justify-center"
              title={isTheaterRowPlan(activeTable.shape, activeTable.rowMeta) ? 'Rangée suivante' : 'Emplacement suivant'}
              aria-label={isTheaterRowPlan(activeTable.shape, activeTable.rowMeta) ? 'Rangée suivante' : 'Emplacement suivant'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Grille de sièges de la table */}
      <div className="grid grid-cols-3 @md:grid-cols-4 @3xl:grid-cols-6 gap-2">
        {activeTable.seats.map((seat) => {
          const isSelected = selectedSeats.some(
            (s) => s.tableId === seat.tableId && s.seatIndex === seat.seatIndex
          );
          const selectionOrder = selectedSeats.findIndex(
            (s) => s.tableId === seat.tableId && s.seatIndex === seat.seatIndex
          );
          const zoneColor = seat.pricingZoneId ? zoneColorById?.get(seat.pricingZoneId) : undefined;

          return (
            <button
              key={seat.seatIndex}
              type="button"
              disabled={!seat.available}
              onClick={() => onToggleSeat(seat.tableId, seat.seatIndex)}
              className={cn(
                'relative p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 min-h-[58px] touch-manipulation active:scale-95',
                !seat.available && 'opacity-40 cursor-not-allowed bg-muted/40 border-border text-muted',
                seat.available && !isSelected && 'bg-surface hover:bg-primary/10 hover:border-primary border-border text-foreground shadow-2xs min-h-11',
                isSelected && 'bg-primary-solid text-primary-foreground border-primary shadow-sm ring-2 ring-primary/40 font-bold min-h-11',
              )}
            >
              {/* Badge de numérotation de sélection */}
              {isSelected && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary-solid text-primary-foreground text-[9px] font-black flex items-center justify-center shadow-xs">
                  {selectionOrder + 1}
                </span>
              )}

              <span className="text-xs font-bold leading-none">
                {isStandaloneChairPlan(seat.chairMeta)
                  ? seat.tableName
                  : (seat.seatCode || `Siège ${seat.seatIndex + 1}`)}
                {seat.isPmr ? ' · PMR' : ''}
              </span>

              <span
                className={cn(
                  'text-xs leading-tight',
                  isSelected ? 'text-primary-foreground/90' : 'text-muted'
                )}
              >
                {!seat.available
                  ? 'Occupé'
                  : isSelected
                  ? 'Choisi'
                  : seat.priceFc > 0
                  ? formatFc(seat.priceFc)
                  : 'Libre'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Raccourci de sélection rapide */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border text-xs">
        <span className="text-xs text-muted">
          Touchez un siège libre pour l&apos;ajouter ou le retirer
        </span>
        <div className="flex items-center gap-2">
          {seatToPreview ? (
            <button
              type="button"
              onClick={() => viewFromSeat(seatToPreview.tableId, seatToPreview.seatIndex)}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline min-h-11 px-2 rounded-[var(--radius-button)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <Eye className="w-3.5 h-3.5" />
              Voir depuis la place
            </button>
          ) : null}
          {activeTable.seats.some((s) => s.available && !selectedSeats.some((sel) => sel.tableId === s.tableId && sel.seatIndex === s.seatIndex)) && (
            <button
              type="button"
              onClick={() => {
                const firstFree = activeTable.seats.find(
                  (s) => s.available && !selectedSeats.some((sel) => sel.tableId === s.tableId && sel.seatIndex === s.seatIndex)
                );
                if (firstFree) onToggleSeat(firstFree.tableId, firstFree.seatIndex);
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline min-h-11 px-2 rounded-[var(--radius-button)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <Plus className="w-3.5 h-3.5" />
              Prendre 1 place libre
            </button>
          )}
        </div>
      </div>
    </div>
  ) : null;

  /** Plein écran : le même panneau à côté de la 3D, avec le récapitulatif et un retour au formulaire. */
  const fullscreenPanel = (close: () => void) => (
    <div className="space-y-3 text-foreground">
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface p-3 shadow-sm">
        <div className="min-w-0">
          <p className="text-sm font-bold">
            {selectedSeats.length === 0
              ? 'Aucune place choisie'
              : `${selectedSeats.length} place${selectedSeats.length > 1 ? 's' : ''} choisie${selectedSeats.length > 1 ? 's' : ''}`}
          </p>
          {selectedTotalFc > 0 ? (
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatFc(selectedTotalFc)}</p>
          ) : (
            <p className="text-xs text-muted">Touchez une chaise ou un siège de la liste</p>
          )}
        </div>
        <button
          type="button"
          onClick={close}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[var(--radius-button)] bg-primary-solid px-3.5 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <Check className="h-4 w-4" />
          {selectedSeats.length > 0 ? 'Continuer' : 'Fermer'}
        </button>
      </div>
      {seatPanel}
    </div>
  );

  return (
    <div className={cn('space-y-3', className)}>
      {/* Légende des zones */}
      {pricingZones.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-xs text-muted font-medium">Tarifs</span>
          {pricingZones.map((z) => (
            <span
              key={z.id}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface border border-border text-xs font-semibold text-foreground shadow-2xs"
            >
              <span
                className="w-2.5 h-2.5 rounded-full border border-black/10"
                style={{ backgroundColor: z.color || '#c4a35a' }}
              />
              <span>{z.name}</span>
              {z.priceFc > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400 tabular-nums font-bold">
                  · {formatFc(z.priceFc)}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      <div ref={viewerRef} className="relative rounded-2xl overflow-hidden border border-border bg-foreground shadow-[var(--shadow-soft)]">
        <div className="absolute top-2 right-2 z-20 hidden sm:block">
          <SeatPreviewQualityChips quality={quality} onChange={setQuality} variant="overlay" />
        </div>

        <RoomLayoutPreview
          blueprint={previewBlueprint}
          quality={quality}
          lightingPreset={lightingPreset}
          selectedTableId={activeTable?.id}
          selectedTableIds={tablesWithSelection}
          selectedSeats={selectedSeats}
          blockedSeats={blockedSeats}
          onSelectTable={(tableId) => setFocusedTableId(tableId)}
          onSelectSeat={onToggleSeat}
          seatView={seatView}
          seatActionFor={seatActionFor}
          fullscreenPanel={fullscreenPanel}
          showMeta={false}
          className="[&_.em-floor-canvas]:min-h-[min(58dvh,440px)] sm:[&_.em-floor-canvas]:min-h-[360px]"
        />

        {tablesWithSelection.length > 0 && (
          <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 rounded-[var(--radius-button)] bg-primary-solid text-primary-foreground text-xs font-semibold px-2.5 py-1.5 shadow-sm">
            <Check className="w-3.5 h-3.5" aria-hidden />
            <span>{selectedSeats.length} place{selectedSeats.length > 1 ? 's' : ''} sélectionnée{selectedSeats.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted leading-relaxed">
          Touchez une chaise, ou un siège dans la liste. « Voir depuis la place » vous assoit à ce siège pour juger la vue avant de le choisir.
        </p>
        <div className="sm:hidden">
          <SeatPreviewQualityChips quality={quality} onChange={setQuality} variant="bar" />
        </div>
      </div>

      {/* Panneau de sélection de sièges sur la table active */}
      {seatPanel}
    </div>
  );
}
