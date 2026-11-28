'use client';

import React, { useMemo, useState } from 'react';
import {
  type PricingZone,
  type ZoneDistributionStrategy,
  autoDistributeTablesToZones,
  computeTicketingRevenueSummary,
  createEmptyPricingZone,
  TICKETING_ZONE_PRESETS,
  isLightHexColor,
} from '@/lib/ticketPricing';
import { formatFc } from '@/config/landingPricing';
import RoomLayoutPreview, { type RoomPreviewQuality } from '@/components/RoomLayoutPreview';
import SeatSelectionPlanCanvas, { type SeatSelectionPlanCanvasProps } from '@/components/SeatSelectionPlanCanvas';
import { PlanViewToggle, type PlanViewMode } from '@/components/PlanViewChrome';
import { resolveBlueprintWalls } from '@/lib/roomLayoutUtils';
import { isOpenSpace } from '@/lib/roomPlots';
import { buildTablePlanPreviewBlueprint, type TablePlanPreviewTable } from '@/lib/tablePlanPreviewBlueprint';
import type { RoomLayoutBlueprint } from '@/lib/roomLayoutUtils';
import type { LightingPreset } from '@/lib/roomRenderQuality';
import { Button, Input } from '@/components/ui';
import {
  Sparkles,
  Paintbrush,
  Box,
  Layers,
  Check,
  ChevronDown,
  Building2,
  Trash2,
  Plus,
} from '@/components/icons';
import { cn } from '@/lib/cn';

export interface PublicEventZoneStudio3DProps {
  blueprint: RoomLayoutBlueprint | null;
  pricingZones: PricingZone[];
  onUpdatePricingZones: (zones: PricingZone[]) => void;
  tables: TablePlanPreviewTable[];
  tableZoneAssignments: Record<string, string>;
  onAssignTableZone: (tableId: string, zoneId: string) => void;
  onBulkAssignTables: (assignments: Record<string, string>, updatedZones?: PricingZone[]) => void;
  roomName?: string;
  lightingPreset?: LightingPreset;
  onOpenRoomPicker?: () => void;
}

export default function PublicEventZoneStudio3D({
  blueprint,
  pricingZones,
  onUpdatePricingZones,
  tables,
  tableZoneAssignments,
  onAssignTableZone,
  onBulkAssignTables,
  roomName,
  lightingPreset = 'dusk',
  onOpenRoomPicker,
}: PublicEventZoneStudio3DProps) {
  const [paintZoneId, setPaintZoneId] = useState<string | null>(pricingZones[0]?.id ?? null);
  const [quality, setQuality] = useState<RoomPreviewQuality>('standard');
  const [showAutoDistributeMenu, setShowAutoDistributeMenu] = useState(false);
  const [showZoneEditor, setShowZoneEditor] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [view, setView] = useState<PlanViewMode>('3d');

  // Synchronise les tables avec leurs zones tarifaires assignées
  const tablesWithZones = useMemo(() => {
    return tables.map((t) => {
      const assignedZoneId = tableZoneAssignments[t.id] ?? t.pricingZoneId ?? pricingZones[0]?.id;
      return {
        ...t,
        pricingZoneId: assignedZoneId,
      };
    });
  }, [tables, tableZoneAssignments, pricingZones]);

  // Construit le blueprint 3D avec les zones tarifaires projetées sur le sol
  const previewBlueprint = useMemo(() => {
    if (!blueprint && tablesWithZones.length === 0) return null;

    const tablePlanInput = {
      roomOutline: blueprint?.roomOutline,
      roomThemeId: blueprint?.metadata?.roomThemeId,
      floorType: blueprint?.metadata?.floorType,
      floorImageUrl: blueprint?.metadata?.floorImageUrl,
      lightingPreset,
      fixtures: blueprint?.fixtures,
      pricingZones,
    };

    return buildTablePlanPreviewBlueprint(tablePlanInput, tablesWithZones, blueprint, pricingZones);
  }, [blueprint, tablesWithZones, lightingPreset, pricingZones]);

  // Plan 2D : mêmes tables, chaque place colorée selon la zone de sa table.
  const zoneById = useMemo(() => new Map(pricingZones.map((z) => [z.id, z])), [pricingZones]);
  const zoneColorById = useMemo(
    () => new Map(pricingZones.map((z) => [z.id, z.color || '#c4a35a'])),
    [pricingZones],
  );
  const planSeats = useMemo(
    () =>
      tablesWithZones.flatMap((t) => {
        const zone = t.pricingZoneId ? zoneById.get(t.pricingZoneId) : undefined;
        return Array.from({ length: Math.max(0, t.capacity) }, (_, seatIndex) => ({
          tableId: t.id,
          tableName: t.name,
          seatIndex,
          available: true,
          x: t.x,
          y: t.y,
          shape: t.shape,
          capacity: t.capacity,
          priceFc: zone?.priceFc ?? 0,
          pricingZoneId: zone?.id ?? null,
          pricingZoneName: zone?.name ?? null,
          rowMeta: t.rowMeta ?? null,
          chairMeta: t.chairMeta ?? null,
          rotation: t.rotation ?? null,
        }));
      }),
    [tablesWithZones, zoneById],
  );
  const planWalls = useMemo(() => {
    if (!previewBlueprint || isOpenSpace(previewBlueprint.metadata)) return [];
    return resolveBlueprintWalls(previewBlueprint);
  }, [previewBlueprint]);
  const paintZone = paintZoneId ? zoneById.get(paintZoneId) : undefined;

  // Statistiques de recettes et de capacité en temps réel
  const ticketingSummary = useMemo(() => {
    return computeTicketingRevenueSummary(tablesWithZones, pricingZones, 0);
  }, [tablesWithZones, pricingZones]);

  // Répartition automatique selon stratégie spatiale
  const handleAutoDistribute = (strategy: ZoneDistributionStrategy) => {
    setShowAutoDistributeMenu(false);
    if (!tables.length || !pricingZones.length) return;

    const result = autoDistributeTablesToZones(tables, pricingZones, {
      strategy,
      fixtures: blueprint?.fixtures,
      updateBoundingBoxes: true,
    });

    const newAssignments: Record<string, string> = {};
    for (const t of result.tables) {
      if (t.pricingZoneId) {
        newAssignments[t.id] = t.pricingZoneId;
      }
    }

    onBulkAssignTables(newAssignments, result.zones);
    onUpdatePricingZones(result.zones);
  };

  // Clic sur une table en 3D
  const handleTableClick3D = (tableId: string) => {
    if (paintZoneId) {
      onAssignTableZone(tableId, paintZoneId);
      setSelectedTableId(tableId);
    } else {
      setSelectedTableId(tableId);
    }
  };

  const activeSelectedTable = useMemo(() => {
    if (!selectedTableId) return null;
    return tablesWithZones.find((t) => t.id === selectedTableId) ?? null;
  }, [selectedTableId, tablesWithZones]);

  return (
    <div className="space-y-3.5 rounded-[var(--radius-card)] border border-primary/20 bg-surface p-3.5 sm:p-4 shadow-sm">
      {/* En-tête du studio 3D */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-border pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Box className="w-3.5 h-3.5" />
            </span>
            <h4 className="text-xs font-bold text-foreground">
              Définition des zones de paiement 3D
            </h4>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Interactif
            </span>
          </div>
          <p className="text-xs text-muted">
            {roomName
              ? `Salle : ${roomName} · Visualisez et assignez les tables aux tarifs en 3D.`
              : 'Attribuez chaque table à sa zone tarifaire (VIP, Carré d’Or, Standard).'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowZoneEditor(!showZoneEditor)}
            className="inline-flex min-h-9 items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] border border-border bg-surface hover:bg-surface-muted text-xs font-semibold text-foreground transition shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5 text-muted" />
            {showZoneEditor ? 'Masquer tarifs' : 'Éditer tarifs'}
          </button>

          {tables.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAutoDistributeMenu(!showAutoDistributeMenu)}
                className="inline-flex min-h-9 items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] bg-primary text-primary-foreground text-xs font-bold transition shadow-xs hover:bg-primary-hover active:scale-[0.98]"
                title="Calculer automatiquement la répartition des zones selon la position des tables"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Répartir en 3D</span>
                <ChevronDown className="w-3 h-3 opacity-80" />
              </button>

              {showAutoDistributeMenu && (
                <div className="absolute right-0 top-full mt-1.5 z-30 w-64 rounded-xl border border-border bg-surface p-1.5 shadow-xl text-left space-y-1 animate-in fade-in zoom-in-95">
                  <p className="px-2.5 py-1 text-xs font-bold text-muted">
                    Stratégie spatiale
                  </p>
                  <button
                    type="button"
                    onClick={() => handleAutoDistribute('front_to_back')}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium hover:bg-primary/10 hover:text-primary transition"
                  >
                    <span className="font-semibold block">Devant scène / Estrade (VIP)</span>
                    <span className="text-xs text-muted block">Zones chères près de la scène, Standard au fond</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAutoDistribute('concentric')}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium hover:bg-primary/10 hover:text-primary transition"
                  >
                    <span className="font-semibold block">Carré d’Or central</span>
                    <span className="text-xs text-muted block">Zone VIP au centre d’honneur, cercles concentriques</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAutoDistribute('capacity_ratio')}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium hover:bg-primary/10 hover:text-primary transition"
                  >
                    <span className="font-semibold block">Répartition équilibrée</span>
                    <span className="text-xs text-muted block">Répartition proportionnelle équitable des places</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Éditeur de zones tarifaires (si déplié) */}
      {showZoneEditor && (
        <div className="rounded-xl border border-border bg-surface-muted/40 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Catégories tarifaires</span>
            <button
              type="button"
              onClick={() => onUpdatePricingZones([...pricingZones, createEmptyPricingZone(pricingZones.length)])}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter une zone
            </button>
          </div>

          {/* Modèles rapides */}
          <div className="flex flex-wrap items-center gap-1.5 pb-1">
            <span className="text-xs text-muted font-medium mr-1">Modèles prédéfinis :</span>
            {TICKETING_ZONE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  const newZones = preset.zones.map((z, idx) => ({
                    id: `zone-${preset.id}-${idx}`,
                    name: z.name,
                    priceFc: z.priceFc,
                    color: z.color,
                  }));
                  onUpdatePricingZones(newZones);
                  setPaintZoneId(newZones[0]?.id ?? null);
                }}
                className="px-2.5 py-1 rounded-md text-xs font-semibold border border-border bg-surface hover:bg-surface-muted text-foreground transition shadow-2xs flex items-center gap-1.5"
                title={`${preset.description} (${preset.zones.map((z) => `${z.name} ${formatFc(z.priceFc)}`).join(' · ')})`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.zones[0].color }} />
                <span>{preset.badge}</span>
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {pricingZones.map((zone, index) => (
              <div key={zone.id} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center p-2 rounded-lg border border-border bg-surface">
                <input
                  type="color"
                  value={zone.color || '#c4a35a'}
                  onChange={(e) =>
                    onUpdatePricingZones(
                      pricingZones.map((z, i) => (i === index ? { ...z, color: e.target.value } : z))
                    )
                  }
                  className="w-8 h-8 rounded border border-border cursor-pointer"
                  title="Couleur de la zone"
                  aria-label={`Couleur de la zone ${zone.name}`}
                />
                <Input
                  label="Nom"
                  value={zone.name}
                  onChange={(e) =>
                    onUpdatePricingZones(
                      pricingZones.map((z, i) => (i === index ? { ...z, name: e.target.value } : z))
                    )
                  }
                />
                <Input
                  label="Prix (FC)"
                  type="number"
                  min={0}
                  value={zone.priceFc > 0 ? String(zone.priceFc) : ''}
                  onChange={(e) =>
                    onUpdatePricingZones(
                      pricingZones.map((z, i) =>
                        i === index ? { ...z, priceFc: Number(e.target.value) || 0 } : z
                      )
                    )
                  }
                />
                <button
                  type="button"
                  disabled={pricingZones.length <= 1}
                  onClick={() => onUpdatePricingZones(pricingZones.filter((_, i) => i !== index))}
                  className="p-2 text-muted hover:text-rose-600 disabled:opacity-30 transition"
                  title="Supprimer la zone"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barre d'outils pinceau de zone */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold text-muted mr-1 flex items-center gap-1">
          <Paintbrush className="w-3 h-3 text-primary" />
          Zone à appliquer :
        </span>
        {ticketingSummary.byZone.map((stat) => {
          const isPaintActive = paintZoneId === stat.zone.id;
          return (
            <button
              key={stat.zone.id}
              type="button"
              onClick={() => setPaintZoneId(isPaintActive ? null : stat.zone.id)}
              className={cn(
                'inline-flex min-h-11 items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition shadow-2xs',
                isPaintActive
                  ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/40'
                  : 'border-border bg-surface hover:bg-surface-muted text-foreground'
              )}
              title={
                isPaintActive
                  ? 'Pinceau actif : touchez une table en 3D pour lui appliquer cette zone'
                  : `Cliquer pour peindre les tables en ${stat.zone.name}`
              }
            >
              <span
                className="w-3 h-3 rounded-full shrink-0 border border-black/15 shadow-2xs"
                style={{ backgroundColor: stat.zone.color || '#c4a35a' }}
              />
              <span className="truncate max-w-[120px]">{stat.zone.name}</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {stat.zone.priceFc > 0 ? formatFc(stat.zone.priceFc) : '0 FC'}
              </span>
              <span className="text-xs text-muted tabular-nums">
                ({stat.seatCount} pl.)
              </span>
              {isPaintActive && <Check className="w-3.5 h-3.5 text-primary ml-0.5" />}
            </button>
          );
        })}
      </div>

      {/* Plan de la salle avec les zones : 3D ou 2D vu du dessus */}
      {previewBlueprint ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 flex-1 text-xs text-muted" aria-live="polite">
              {paintZone ? (
                <>
                  Touchez une table pour la passer en{' '}
                  <span className="font-bold" style={{ color: paintZone.color || '#c4a35a' }}>{paintZone.name}</span>
                </>
              ) : (
                'Choisissez une zone ci-dessus, puis touchez les tables à lui attribuer'
              )}
            </p>
            <div className="flex items-center gap-1.5">
              {view === '3d' ? (
                <div className="hidden sm:flex shrink-0 gap-1 rounded-full border border-border bg-surface p-0.5" role="group" aria-label="Qualité de la 3D">
                  {(
                    [
                      { id: 'standard' as const, label: 'Standard' },
                      { id: 'showcase' as const, label: 'Showcase' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={quality === opt.id}
                      onClick={() => setQuality(opt.id)}
                      className={cn(
                        'min-h-9 px-2.5 rounded-full text-xs font-semibold transition',
                        quality === opt.id ? 'bg-foreground text-background shadow-xs' : 'text-muted hover:text-foreground',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}
              <PlanViewToggle value={view} onChange={setView} />
            </div>
          </div>

          {view === '3d' ? (
            <div className="relative rounded-2xl overflow-hidden border border-border bg-foreground shadow-[var(--shadow-soft)]">
              <RoomLayoutPreview
                blueprint={previewBlueprint}
                quality={quality}
                lightingPreset={lightingPreset}
                selectedTableId={selectedTableId}
                onSelectTable={handleTableClick3D}
                showMeta={false}
                className="[&_.em-floor-canvas]:min-h-[260px] sm:[&_.em-floor-canvas]:min-h-[340px]"
              />
            </div>
          ) : (
            <SeatSelectionPlanCanvas
              seats={planSeats}
              fixtures={previewBlueprint.fixtures as SeatSelectionPlanCanvasProps['fixtures']}
              roomOutline={previewBlueprint.roomOutline as SeatSelectionPlanCanvasProps['roomOutline']}
              walls={planWalls}
              canvasWidthM={previewBlueprint.canvas.widthM}
              canvasHeightM={previewBlueprint.canvas.heightM}
              roomThemeId={previewBlueprint.metadata.roomThemeId}
              floorType={previewBlueprint.metadata.floorType}
              floorImageUrl={previewBlueprint.metadata.floorImageUrl}
              pricingZones={pricingZones}
              zoneColorById={zoneColorById}
              showZonePricing
              showLegend={false}
              instructions="Vue du dessus : chaque zone est encadrée avec son prix"
              activeTableId={selectedTableId}
              onSelectTable={handleTableClick3D}
              onSelect={(tableId) => handleTableClick3D(tableId)}
              height={380}
            />
          )}

          {/* Table touchée : sa zone, et un raccourci pour en changer */}
          {activeSelectedTable && (
            <div className="rounded-xl bg-surface border border-border p-2.5 shadow-sm flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-foreground">{activeSelectedTable.name}</span>
                <span className="text-xs text-muted">({activeSelectedTable.capacity} places)</span>
                {activeSelectedTable.pricingZoneId && zoneById.get(activeSelectedTable.pricingZoneId) && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold shadow-2xs"
                    style={{
                      backgroundColor: zoneById.get(activeSelectedTable.pricingZoneId)?.color || '#c4a35a',
                      color: isLightHexColor(zoneById.get(activeSelectedTable.pricingZoneId)?.color) ? '#111827' : '#ffffff',
                    }}
                  >
                    {zoneById.get(activeSelectedTable.pricingZoneId)?.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-muted">Changer de zone :</span>
                {pricingZones.map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => onAssignTableZone(activeSelectedTable.id, z.id)}
                    aria-pressed={activeSelectedTable.pricingZoneId === z.id}
                    className="min-w-11 min-h-11 inline-flex items-center justify-center rounded-full touch-manipulation transition hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    title={`Passer en ${z.name}`}
                    aria-label={`Passer la table sélectionnée en zone ${z.name}`}
                  >
                    <span
                      className={cn(
                        'w-6 h-6 rounded-full border border-border',
                        activeSelectedTable.pricingZoneId === z.id && 'ring-2 ring-offset-2 ring-offset-surface ring-foreground',
                      )}
                      style={{ backgroundColor: z.color || '#c4a35a' }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-surface-muted/30 p-6 text-center space-y-2">
          <Building2 className="w-8 h-8 text-muted mx-auto" />
          <p className="text-xs font-semibold text-foreground">
            Liez une salle pour visualiser vos zones en 3D
          </p>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Le plan 3D affiche vos estrades, podiums et tables avec la couleur exacte de chaque catégorie de billet.
          </p>
          {onOpenRoomPicker && (
            <Button type="button" size="sm" variant="secondary" onClick={onOpenRoomPicker} className="mt-1">
              Choisir une salle
            </Button>
          )}
        </div>
      )}

      {/* Jauge prévisionnelle de recettes et de capacité */}
      <div className="rounded-xl border border-border bg-surface-muted/60 p-3 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted">Recettes potentielles :</span>
            <span className="text-sm font-extrabold text-foreground tabular-nums">
              {formatFc(ticketingSummary.totalRevenueFc)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted tabular-nums text-xs">
            <span>
              {ticketingSummary.totalSeats - ticketingSummary.unassigned.seatCount} /{' '}
              {ticketingSummary.totalSeats} places assignées
            </span>
            <span>·</span>
            <span>{tables.length} tables</span>
          </div>
        </div>

        {/* Barre de répartition segmentée */}
        <div className="w-full h-2 rounded-full bg-surface-muted overflow-hidden flex border border-border">
          {ticketingSummary.byZone.map((stat) => (
            <div
              key={stat.zone.id}
              style={{
                width: `${stat.percentageOfSeats}%`,
                backgroundColor: stat.zone.color || '#c4a35a',
              }}
              title={`${stat.zone.name} : ${stat.seatCount} places (${stat.percentageOfSeats}%) · ${formatFc(stat.totalRevenueFc)}`}
              className="h-full transition-all"
            />
          ))}
          {ticketingSummary.unassigned.percentageOfSeats > 0 && (
            <div
              style={{ width: `${ticketingSummary.unassigned.percentageOfSeats}%` }}
              className="h-full bg-amber-400/60 dark:bg-amber-600/60"
              title={`Non assignées : ${ticketingSummary.unassigned.seatCount} places (${ticketingSummary.unassigned.percentageOfSeats}%)`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
