'use client';

import type { AvatarSeatAction, SeatViewRequest } from '@/components/RoomWebGLViewer';
import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import { DoorOpen } from '@/components/icons';
import {
  RoomLayoutBlueprint,
  roomTypeLabels,
  ensureBlueprintDefaults,
  isBlueprintWallsVisible,
  applyPlanSceneVisibility
} from '@/lib/roomLayoutUtils';
import { PlanSceneControls, usePlanFullscreen } from '@/components/PlanViewChrome';
import { isOpenSpace } from '@/lib/roomPlots';
import PlanViewModeToggle from '@/components/PlanViewModeToggle';
import { mapTicketSelectionsToWebGL, resolveTicketSeatPick } from '@/lib/seatSelectionLayout';
import { getRoomTheme } from '@/lib/roomThemeUtils';
import { GUEST_PLAN_DEFAULT_DEPTH, resolveDepthAmount } from '@/lib/roomFloorUtils';
import RoomPlanTopView from '@/components/RoomPlanTopView';
import Room2DScaleCompass from '@/components/Room2DScaleCompass';
import Room3DErrorBoundary from '@/components/Room3DErrorBoundary';
import { cn } from '@/lib/cn';
import type { LightingPreset } from '@/lib/roomRenderQuality';
import { buildGuestSimulation, type GuestSimulationSettings } from '@/lib/roomGuestSimulation';

const RoomWebGLViewer = dynamic(() => import('@/components/RoomWebGLViewer'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none">
      <span className="rounded-full bg-foreground/80 px-2.5 py-1 text-xs font-semibold text-background">
        Chargement 3D…
      </span>
    </div>
  ),
});

const WALKTHROUGH_START_LABEL = 'Approche de l’entrée';

function WalkthroughButton({
  active,
  label,
  onToggle,
  compact = false,
}: {
  active: boolean;
  label: string;
  onToggle: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center justify-center gap-1 min-h-11 min-w-11 px-2.5 rounded-full text-xs font-semibold transition touch-manipulation',
        'border border-background/20 bg-foreground/80 text-background',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        active && 'bg-background text-foreground border-background',
      )}
    >
      <DoorOpen className="w-3.5 h-3.5" aria-hidden />
      <span className={compact && !active ? 'sr-only sm:not-sr-only' : undefined}>{active ? (label || 'Visite…') : 'Faire le tour'}</span>
    </button>
  );
}

export type RoomPreviewQuality = 'thumb' | 'standard' | 'showcase';

interface RoomLayoutPreviewProps {
  blueprint: RoomLayoutBlueprint | null;
  className?: string;
  quality?: RoomPreviewQuality;
  showMeta?: boolean;
  /** Conservé pour compatibilité : le showcase WebGL n’utilise plus le slider 2D. */
  showDepthControls?: boolean;
  /** Forcer le rendu 2D même en showcase (listes légères). */
  force2d?: boolean;
  /** Remplace metadata.lightingPreset (ex. créneau programme événement). */
  lightingPreset?: LightingPreset;
  /**
   * Remplit le conteneur parent (hauteur 100 %) au lieu d'imposer un ratio : pour les scènes plein cadre
   * qui gèrent leur propre plein écran. Affiche le bouton « Faire le tour » directement sur la scène.
   */
  fill?: boolean;
  /** Bouton plein écran (mobile et desktop). */
  allowMobileExpand?: boolean;
  allowExpand?: boolean;
  /**
   * Landing / plans 2D-3D : ouvrir automatiquement le plein écran
   * dès que le visiteur bascule Plan 2D ↔ Vue 3D.
   */
  expandWhen3d?: boolean;
  /** Synchronise le toggle 2D/3D depuis le chrome plein écran. */
  onForce2dChange?: (force2d: boolean) => void;
  /** Table sélectionnée active */
  selectedTableId?: string | null;
  /** Multi-sélection de tables */
  selectedTableIds?: string[];
  /** Callback lors du clic sur une table en 3D ou 2D */
  onSelectTable?: (tableId: string) => void;
  /** Callback lors du clic sur une zone en 3D */
  onSelectZone?: (zoneId: string) => void;
  /** Sièges choisis (billetterie) — anneau sur la chaise. */
  selectedSeats?: Array<{ tableId: string; seatIndex: number }>;
  /** Sièges indisponibles — assombrir, ne pas cliquer. */
  blockedSeats?: Array<{ tableId: string; seatIndex: number }>;
  /** Clic sur une chaise attachée à une table. */
  onSelectSeat?: (tableId: string, seatIndex: number) => void;
  /** Invités simulés en 3D (simulateur) : remplissage et danse. */
  guestSimulation?: GuestSimulationSettings | null;
  /** Demande de « vue depuis la place » (billetterie) : la caméra vole jusqu'à ce siège. */
  seatView?: SeatViewRequest | null;
  /** Bouton d'action sur la place regardée (ex. « Choisir cette place »). */
  seatActionFor?: AvatarSeatAction;
  /**
   * Plein écran : panneau affiché à côté de la 3D (à droite sur ordinateur, en bas sur téléphone)
   * pour garder les commandes de la page (choix des places, total…). `close` quitte le plein écran.
   */
  fullscreenPanel?: (close: () => void) => React.ReactNode;
}

type WebGLPreviewProps = {
  webglBlueprint: RoomLayoutBlueprint;
  quality: RoomPreviewQuality;
  lightingPreset: LightingPreset;
  className?: string;
  selectedTableId?: string | null;
  selectedTableIds?: string[];
  onSelectTable?: (tableId: string) => void;
  onSelectZone?: (zoneId: string) => void;
  selectedSeats?: Array<{ tableId: string; seatIndex: number }>;
  blockedSeats?: Array<{ tableId: string; seatIndex: number }>;
  onSelectSeat?: (tableId: string, seatIndex: number) => void;
  walkthroughActive?: boolean;
  onWalkthroughProgress?: (label: string) => void;
  onWalkthroughComplete?: () => void;
  guestSimulation?: GuestSimulationSettings | null;
  seatView?: SeatViewRequest | null;
  seatActionFor?: AvatarSeatAction;
  onContextLost?: () => void;
};

function WebGLPreviewCanvas({
  webglBlueprint,
  quality,
  lightingPreset,
  className,
  selectedTableId,
  selectedTableIds,
  onSelectTable,
  onSelectZone,
  selectedSeats,
  blockedSeats,
  onSelectSeat,
  walkthroughActive = false,
  onWalkthroughProgress,
  onWalkthroughComplete,
  guestSimulation = null,
  seatView = null,
  seatActionFor,
  onContextLost,
}: WebGLPreviewProps) {
  const selected = useMemo(() => {
    return mapTicketSelectionsToWebGL(
      selectedSeats ?? [],
      selectedTableId,
      selectedTableIds,
      webglBlueprint.furniture,
    );
  }, [selectedTableId, selectedTableIds, selectedSeats, webglBlueprint.furniture]);

  return (
    <RoomWebGLViewer
      blueprint={webglBlueprint}
      selected={selected}
      blockedSeats={blockedSeats}
      introFlyIn
      onSelect={(sel) => {
        const pick = resolveTicketSeatPick(sel);
        if (!pick) {
          if (sel?.kind === 'zone' && onSelectZone) onSelectZone(sel.id);
          return;
        }
        if (typeof pick.seatIndex === 'number' && onSelectSeat) {
          onSelectSeat(pick.tableId, pick.seatIndex);
          return;
        }
        if (onSelectTable) onSelectTable(pick.tableId);
      }}
      readOnly
      previewMode
      presentationMode={!walkthroughActive}
      walkthroughActive={walkthroughActive}
      onWalkthroughProgress={onWalkthroughProgress}
      onWalkthroughComplete={onWalkthroughComplete}
      renderQuality={quality === 'showcase' ? 'showcase' : 'standard'}
      lightingPreset={lightingPreset}
      guestSimulation={guestSimulation}
      seatView={seatView}
      seatActionFor={seatActionFor}
      onContextLost={onContextLost}
      className={cn('absolute inset-0 h-full w-full shadow-[var(--shadow-soft)] touch-none', className)}
    />
  );
}

/** Miniatures / listes : plan 2D à l’échelle, mêmes tables, chaises et sol que la 3D. */
function ThumbPreview({
  blueprint,
  className,
}: {
  blueprint: RoomLayoutBlueprint;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative aspect-[4/3] h-full min-h-0 overflow-hidden rounded-2xl border border-border bg-stage',
        className,
      )}
      role="img"
      aria-label="Aperçu 2D du plan de salle"
    >
      <RoomPlanTopView blueprint={blueprint} showLabels={false} />
      <div className="absolute bottom-1 left-1 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[8px] font-bold text-white/90 flex items-center gap-1 shadow-2xs">
        <span>{blueprint.metadata.totalSeats} pl.</span>
        <span>·</span>
        <span>{blueprint.canvas.widthM}×{blueprint.canvas.heightM}m</span>
      </div>
    </div>
  );
}

/** Plan 2D vu du dessus, à l’échelle réelle et aux couleurs de la vue 3D. */
function FlatShowcasePreview({
  blueprint,
  className,
  guestSimulation = null,
}: {
  blueprint: RoomLayoutBlueprint;
  className?: string;
  /** Salle remplie : mêmes invités qu'en 3D, vus du dessus. */
  guestSimulation?: GuestSimulationSettings | null;
}) {
  const guests = useMemo(
    () => (guestSimulation ? buildGuestSimulation(blueprint, guestSimulation).guests : null),
    [blueprint, guestSimulation],
  );
  return (
    <div
      role="img"
      aria-label={`Plan 2D ${roomTypeLabels[blueprint.roomType]}, ${blueprint.canvas.widthM} × ${blueprint.canvas.heightM} mètres${blueprint.metadata.totalSeats ? `, ${blueprint.metadata.totalSeats} places` : ''}`}
      className={cn('relative aspect-[16/10] min-h-[260px] sm:min-h-[340px] rounded-2xl border border-border overflow-hidden bg-stage', className)}
    >
      <RoomPlanTopView blueprint={blueprint} guests={guests} />
      <Room2DScaleCompass
        widthM={blueprint.canvas.widthM}
        heightM={blueprint.canvas.heightM}
        showGrid={false}
      />
    </div>
  );
}

export default function RoomLayoutPreview({
  blueprint: rawBlueprint,
  className = '',
  quality = 'standard',
  showMeta,
  force2d = false,
  lightingPreset: lightingPresetOverride,
  fill = false,
  allowMobileExpand,
  allowExpand,
  expandWhen3d = false,
  onForce2dChange,
  selectedTableId,
  selectedTableIds,
  onSelectTable,
  onSelectZone,
  selectedSeats,
  blockedSeats,
  onSelectSeat,
  guestSimulation = null,
  seatView = null,
  seatActionFor,
  fullscreenPanel,
}: RoomLayoutPreviewProps) {
  const showHeader = showMeta ?? quality !== 'thumb';
  const blueprint = rawBlueprint ? ensureBlueprintDefaults(rawBlueprint) : null;
  const [mounted, setMounted] = useState(false);
  const { expanded, setExpanded, panelRef } = usePlanFullscreen();
  const [localForce2d, setLocalForce2d] = useState(false);
  // Les réceptions à ciel ouvert (murs masqués dans le plan) s’ouvrent sans murs.
  const blueprintShowsWalls = rawBlueprint ? isBlueprintWallsVisible(rawBlueprint.metadata) : true;
  const openSpace = rawBlueprint ? isOpenSpace(rawBlueprint.metadata) : false;
  const [showWalls, setShowWalls] = useState(blueprintShowsWalls);
  const [wallsDefault, setWallsDefault] = useState(blueprintShowsWalls);
  if (wallsDefault !== blueprintShowsWalls) {
    setWallsDefault(blueprintShowsWalls);
    setShowWalls(blueprintShowsWalls);
  }
  const [showRoof, setShowRoof] = useState(false);
  const [walkthroughActive, setWalkthroughActive] = useState(false);
  const [walkthroughLabel, setWalkthroughLabel] = useState('');
  // Pertes du contexte WebGL (iPhone à court de mémoire en plein écran) : 1re → 3D recréée en qualité allégée,
  // 2e → aperçu 2D, pour que la salle reste visible au lieu d'un écran noir.
  const [glLosses, setGlLosses] = useState(0);
  const handleContextLost = React.useCallback(() => setGlLosses((n) => n + 1), []);
  const previousForce2dRef = React.useRef(force2d);

  const stopWalkthrough = () => {
    setWalkthroughActive(false);
    setWalkthroughLabel('');
  };
  const toggleWalkthrough = () => {
    if (walkthroughActive) {
      stopWalkthrough();
      return;
    }
    setWalkthroughActive(true);
    setWalkthroughLabel(WALKTHROUGH_START_LABEL);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Plein écran seulement quand l’utilisateur passe du plan 2D à la 3D
  // (jamais au chargement, ni en revenant au 2D).
  useEffect(() => {
    const was2d = previousForce2dRef.current;
    previousForce2dRef.current = force2d;
    if (!expandWhen3d) return;
    if (was2d && !force2d) setExpanded(true);
  }, [expandWhen3d, force2d, setExpanded]);

  const canvasClass = useMemo(() => {
    if (fill) return 'h-full min-h-0';
    if (quality === 'thumb') return 'aspect-[4/3] h-full min-h-0';
    if (quality === 'showcase') {
      return 'aspect-[16/10] min-h-[280px] max-h-[min(70dvh,560px)] sm:min-h-[360px] sm:max-h-none';
    }
    return 'aspect-[4/3] min-h-[240px] sm:min-h-[280px]';
  }, [fill, quality]);

  if (!blueprint) {
    return (
      <div className={`aspect-[4/3] bg-surface-muted rounded-2xl border border-dashed border-border flex items-center justify-center text-xs text-muted ${className}`}>
        Aperçu indisponible
      </div>
    );
  }

  const theme = getRoomTheme(blueprint.metadata.roomThemeId, blueprint);
  const lightingPreset = lightingPresetOverride ?? blueprint.metadata.lightingPreset ?? 'auto';
  const useWebGL = !force2d && !localForce2d && glLosses < 2 && quality !== 'thumb' && mounted;
  const webglQuality: RoomPreviewQuality = glLosses > 0 && quality === 'showcase' ? 'standard' : quality;
  const canExpand = (allowExpand ?? allowMobileExpand ?? quality !== 'thumb') && quality !== 'thumb';
  const viewBlueprint = applyPlanSceneVisibility(blueprint, { showWalls, showRoof });

  // La « Vue 3D » doit toujours être en perspective : un plan enregistré à plat (profondeur 0)
  // donnait une vue du dessus identique au plan 2D.
  const perspectiveBlueprint = resolveDepthAmount(viewBlueprint.metadata) > 0
    ? viewBlueprint
    : {
        ...viewBlueprint,
        metadata: { ...viewBlueprint.metadata, depthAmount: GUEST_PLAN_DEFAULT_DEPTH, depthView: true },
      };

  const webglBlueprint = webglQuality === 'showcase'
    ? {
        ...perspectiveBlueprint,
        metadata: {
          ...perspectiveBlueprint.metadata,
          showChandeliers: perspectiveBlueprint.metadata.showChandeliers === true,
          showUplights: perspectiveBlueprint.metadata.showUplights ?? true,
          showCurtains: perspectiveBlueprint.metadata.showCurtains ?? false,
          showDecorPlants: perspectiveBlueprint.metadata.showDecorPlants ?? true,
          showRoof,
          showWalls,
          renderQuality: 'showcase' as const,
        },
      }
    : perspectiveBlueprint;

  return (
    <div className={cn('space-y-2', fill && 'h-full space-y-0', className)}>
      {showHeader && (
        <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between text-xs font-bold text-muted">
          <span className="truncate">{roomTypeLabels[blueprint.roomType]} · {theme.name}</span>
          <span className="shrink-0 tabular-nums">
            {blueprint.metadata.totalSeats} places · {blueprint.canvas.widthM}×{blueprint.canvas.heightM} m
            {useWebGL ? ' · 3D' : ''}
          </span>
        </div>
      )}

      {quality === 'thumb' ? (
        <ThumbPreview blueprint={blueprint} className={className} />
      ) : (
        <div className={cn('relative overflow-hidden rounded-2xl border border-border/60 bg-stage', canvasClass, className)}>
          {expanded ? (
            <div className="absolute inset-0 bg-stage" aria-hidden />
          ) : useWebGL ? (
            <Room3DErrorBoundary
              className="absolute inset-0 h-full w-full"
              onFallbackTo2D={() => setLocalForce2d(true)}
            >
              <WebGLPreviewCanvas
                key={glLosses}
                webglBlueprint={webglBlueprint}
                quality={webglQuality}
                onContextLost={handleContextLost}
                lightingPreset={lightingPreset}
                selectedTableId={selectedTableId}
                selectedTableIds={selectedTableIds}
                onSelectTable={onSelectTable}
                onSelectZone={onSelectZone}
                selectedSeats={selectedSeats}
                blockedSeats={blockedSeats}
                onSelectSeat={onSelectSeat}
                guestSimulation={guestSimulation}
                seatView={seatView}
                seatActionFor={seatActionFor}
                walkthroughActive={fill && walkthroughActive}
                onWalkthroughProgress={setWalkthroughLabel}
                onWalkthroughComplete={stopWalkthrough}
              />
            </Room3DErrorBoundary>
          ) : (
            <FlatShowcasePreview
              blueprint={viewBlueprint}
              className="absolute inset-0 h-full w-full rounded-2xl"
              guestSimulation={guestSimulation}
            />
          )}
          {!mounted && !force2d ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center pb-3">
              <span className="rounded-full bg-foreground/80 px-2.5 py-1 text-xs font-semibold text-background">
                Chargement 3D…
              </span>
            </div>
          ) : null}
          <PlanSceneControls
            showWalls={showWalls}
            showRoof={showRoof}
            onToggleWalls={() => setShowWalls((current) => !current)}
            onToggleRoof={() => setShowRoof((current) => !current)}
            showRoofControl={useWebGL && !openSpace}
            showWallsControl={!openSpace}
            onToggleFullscreen={canExpand ? () => setExpanded(true) : undefined}
            variant="overlay"
            className="absolute bottom-2 left-2 z-20 max-w-[calc(100%-5.5rem)]"
          />
          {fill && useWebGL ? (
            <div className="absolute bottom-2 right-2 z-20">
              <WalkthroughButton active={walkthroughActive} label={walkthroughLabel} onToggle={toggleWalkthrough} />
            </div>
          ) : null}
        </div>
      )}

      {quality === 'showcase' && useWebGL && !fill ? (
        <p className="text-xs text-muted leading-relaxed">
          <span className="hidden sm:inline">
            Visualisation <span className="font-semibold text-foreground">vitrine 3D</span> : textures, lumière et architecture.
            Tournez la salle pour visiter les tables.
          </span>
          <span className="sm:hidden">
            Vue 3D — masquez le toit ou les murs, puis passez en plein écran pour viser les sièges.
          </span>
        </p>
      ) : null}

      {expanded && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          tabIndex={-1}
          className="fixed inset-0 z-[250] flex flex-col bg-stage text-stage-foreground outline-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="plan-fullscreen-title"
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-stage-foreground/15 pt-[max(0.5rem,env(safe-area-inset-top))]">
            <div className="min-w-0 flex-1">
              <p id="plan-fullscreen-title" className="text-xs font-bold text-stage-foreground truncate">{roomTypeLabels[blueprint.roomType]} · {theme.name}</p>
              <p className="text-xs text-stage-foreground/80 tabular-nums">
                {blueprint.metadata.totalSeats} places · {blueprint.canvas.widthM}×{blueprint.canvas.heightM} m
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
              {onForce2dChange ? (
                <PlanViewModeToggle
                  force2d={force2d}
                  onChange={onForce2dChange}
                  tone="stage"
                />
              ) : null}
              {useWebGL ? (
                <WalkthroughButton active={walkthroughActive} label={walkthroughLabel} onToggle={toggleWalkthrough} compact={Boolean(fullscreenPanel)} />
              ) : null}
              <PlanSceneControls
                showWalls={showWalls}
                showRoof={showRoof}
                onToggleWalls={() => setShowWalls((current) => !current)}
                onToggleRoof={() => setShowRoof((current) => !current)}
                showRoofControl={useWebGL && !openSpace}
                showWallsControl={!openSpace}
                onToggleFullscreen={() => {
                  setWalkthroughActive(false);
                  setWalkthroughLabel('');
                  setExpanded(false);
                }}
                isFullscreen
                variant="overlay"
                compact
              />
            </div>
          </div>
          <div className="flex flex-1 min-h-0 flex-col sm:flex-row">
          {/* Téléphone : la salle garde au moins la moitié de l'écran, quel que soit le contenu du panneau
              (pourcentages plutôt que dvh, inconnus des navigateurs plus anciens). */}
          <div className={cn('relative flex-1 min-h-0', fullscreenPanel && 'max-sm:min-h-[50%]')}>
            {useWebGL ? (
              <Room3DErrorBoundary
                className="absolute inset-0 h-full w-full"
                onFallbackTo2D={() => setLocalForce2d(true)}
              >
                <WebGLPreviewCanvas
                  key={glLosses}
                  webglBlueprint={webglBlueprint}
                  quality={webglQuality}
                  onContextLost={handleContextLost}
                  lightingPreset={lightingPreset}
                  selectedTableId={selectedTableId}
                  selectedTableIds={selectedTableIds}
                  onSelectTable={onSelectTable}
                  onSelectZone={onSelectZone}
                  selectedSeats={selectedSeats}
                  blockedSeats={blockedSeats}
                  onSelectSeat={onSelectSeat}
                  guestSimulation={guestSimulation}
                  seatView={seatView}
                  seatActionFor={seatActionFor}
                  walkthroughActive={walkthroughActive}
                  onWalkthroughProgress={setWalkthroughLabel}
                  onWalkthroughComplete={stopWalkthrough}
                  className="rounded-none"
                />
              </Room3DErrorBoundary>
            ) : (
              <FlatShowcasePreview
                blueprint={viewBlueprint}
                className="absolute inset-0 h-full w-full rounded-none"
                guestSimulation={guestSimulation}
              />
            )}
          </div>
          {fullscreenPanel ? (
            <aside
              className="max-h-[50%] min-h-0 shrink overflow-y-auto overscroll-contain border-t border-stage-foreground/15 bg-background p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:max-h-none sm:w-[min(24rem,45%)] sm:shrink-0 sm:border-l sm:border-t-0 sm:p-3"
              aria-label="Choix des places"
            >
              {fullscreenPanel(() => {
                setWalkthroughActive(false);
                setWalkthroughLabel('');
                setExpanded(false);
              })}
            </aside>
          ) : null}
          </div>
          <p
            className={cn(
              'text-xs text-stage-foreground/80 text-center px-4 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
              // Sur un téléphone, le panneau des places a besoin de cette hauteur : la consigne reste sur grand écran.
              fullscreenPanel && 'hidden sm:block',
              // Téléphone à l'horizontale : chaque ligne compte pour la salle.
              '[@media(max-height:480px)]:hidden',
            )}
          >
            {useWebGL
              ? walkthroughActive
                ? `Visite guidée · ${walkthroughLabel || 'entrée par la porte'}`
                : 'Glissez pour tourner la salle · ou lancez « Faire le tour »'
              : 'Pincez pour zoomer · masquez les murs pour voir toutes les places'}
          </p>
        </div>,
        document.body,
      )}
    </div>
  );
}
