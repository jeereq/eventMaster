'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Plus, Trash2, RefreshCw, Maximize2, Minimize2, LayoutGrid, LayoutTemplate, Shapes, Columns3, ImagePlus, Flower2, Palette, Sparkles, Layers, Copy, Lock, Unlock, Ruler, Circle, Columns2, BoxSelect, Eye, BookmarkPlus, BrickWall, Undo2, Redo2, VideoOff, Video, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Home, StepForward, AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignEndVertical, AlignCenterVertical, Group, Ungroup, BetweenHorizontalStart, BetweenVerticalStart, Download, Upload, Link2, Cloud, History, Building2, Search, Aperture, Sun, Moon, ListTree, Presentation, DoorOpen, ChevronDown, RotateCw, FlipHorizontal2, FlipVertical2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import LayoutActionPanel from '@/components/LayoutActionPanel';
import ImageCropModal from '@/components/ImageCropModal';
import type { RoomWebGLCaptureApi } from '@/components/RoomWebGLViewer';

const RoomWebGLViewer = dynamic(() => import('@/components/RoomWebGLViewer'), {
  ssr: false,
  loading: () => (
    <div
      className="flex-1 min-h-24 w-full rounded-[var(--radius-card)] border border-border bg-surface-muted"
      role="status"
      aria-label="Chargement de la vue 3D"
    />
  ),
});
import RoomWallEditorPanel from '@/components/RoomWallEditorPanel';
import { ChairTypePicker, SeatMaterialPicker, RoomAmbienceCard, TableSurfacePicker, ZoneMaterialPicker } from '@/components/room/RoomMaterialPreviews';
import RoomAmbiencePreviewModal from '@/components/room/RoomAmbiencePreviewModal';
import {
  ChairType,
  ColumnShape,
  FlowerType,
  ImageCropRect,
  RoomLayoutBlueprint,
  RoomOutlineShape,
  RoomType,
  TableShape,
  ROOM_LAYOUT_TEMPLATES,
  applyRoomTemplate,
  applySavedRoomTemplate,
  applyRoomAmbiencePreset,
  ROOM_AMBIENCE_PRESETS,
  saveCustomAmbienceToBlueprint,
  deleteCustomAmbienceFromBlueprint,
  importCustomAmbiencesToBlueprint,
  roomAmbienceMatchesBlueprint,
  parseAmbienceImport,
  recordAmbienceHistory,
  applyTableStyleToAll,
  applyFixtureStyleToSameKind,
  fixtureStyleFamilyLabel,
  captureRoomAmbienceFromBlueprint,
  autoArrangeTables,
  arrangeDensityLabels,
  chairTypeLabels,
  chairStyleLabels,
  seatMaterialLabels,
  zoneKindLabels,
  zoneMaterialLabels,
  doorStyleLabels,
  doorStyleHints,
  aisleStyleLabels,
  aisleStyleHints,
  chandelierFixtureStyleLabels,
  chandelierFixtureStyleHints,
  amphitheaterStyleLabels,
  generateAmphitheaterRows,
  estimateAmphitheaterSeats,
  createBlueprintChair,
  composeArcRing,
  createBlueprintFixture,
  createBlueprintRow,
  createBlueprintTable,
  createBlueprintZone,
  createAislesBatch,
  createChairRowGroups,
  createSavedRoomTemplate,
  defaultRoomOutline,
  deleteCustomTemplateFromBlueprint,
  detachTableChairs,
  ensureBlueprintDefaults,
  flowerTypeLabels,
  getRoomOutlineClipPath,
  refreshBlueprintMetadata,
  resolveTableColor,
  roomOutlineLabels,
  roomTypeLabels,
  saveCustomTemplateToBlueprint,
  tableArrangeLabels,
  tableShapeLabels,
  stageShapeLabels,
  roofStyleLabels,
  centerpieceStyleLabels,
  wallsFromRoomOutline,
  resolveFurnitureSurfaceAt,
  type ArrangeDensity,
  type ChairStyle,
  type LayoutParams,
  type SeatMaterial,
  type TableArrangePreset,
  type StageShape,
  type RoofStyle,
  type TableSurfaceStyle,
  type ZoneKind,
  type ZoneMaterial,
  type AmbienceApplyScope,
  type DoorStyle,
  type AisleStyle,
  type ChandelierFixtureStyle,
  type AmphitheaterStyle,
  type FloorDecalKind,
  type PedestalStyle,
  type CenterpieceStyle,
  type StageRoofStyle,
  type OpeningMaterial,
  openingMaterialLabels,
} from '@/lib/roomLayoutUtils';
import {
  copyAmbienceShareLink,
  decodeAmbienceShareToken,
} from '@/lib/roomAmbienceUtils';
import {
  addAmbienceToLibrary,
  captureAmbienceToLibrary,
  downloadAmbienceExport,
  loadAmbienceLibrary,
  mergeAmbienceLibraryImport,
  removeAmbienceFromLibrary,
  replaceAmbienceLibrary,
} from '@/lib/roomAmbienceLibrary';
import {
  deleteCloudAmbience,
  isCloudAmbienceId,
  pushCloudAmbience,
  syncAmbienceLibraryWithCloud,
} from '@/lib/roomAmbienceCloud';
import {
  deleteOrgAmbience,
  fetchOrgAmbiences,
  publishBlueprintAmbienceToOrg,
  publishOrgAmbience,
} from '@/lib/roomAmbienceOrg';
import { roomEditorCapabilities, snapLayoutPct } from '@/lib/roomEditorAccess';
import {
  downloadDataUrl,
  exportPixelRatio,
  lightingPresetGroups,
  lightingPresetLabels,
  renderQualityLabels,
  type LightingPreset,
  type RenderQuality,
} from '@/lib/roomRenderQuality';
import {
  alignLayoutSelection,
  alignModeLabels,
  duplicateLayoutSelection,
  expandSelectionWithGroups,
  flipLayoutSelection,
  getSelectionBounds,
  groupLayoutSelection,
  moveLayoutSelectionByDelta,
  rotateLayoutSelection,
  selectionKey,
  toggleSelectionItem,
  ungroupLayoutSelection,
  type AlignMode,
  type LayoutSelectionItem,
} from '@/lib/roomSelectionUtils';
import { prependLayoutAction, sanitizeLayoutActions, type LayoutActionEntry } from '@/lib/layoutActionLog';
import { readImageFile } from '@/lib/imageCropUtils';
import { uploadImageFile } from '@/lib/cloudinaryUpload';
import PlanCreationPath, { type PlanCreationPathId } from '@/components/PlanCreationPath';
import { scrollToElementId } from '@/lib/prefersReducedMotion';
import {
  AI_ROOM_PLAN_TOKEN_COST,
  analyzeRoomPlanFromPhoto,
  applyRoomPlanVisionDraft,
} from '@/lib/roomPlanAi';
import {
  applyRoomTheme,
  getRoomTheme,
  groupThemesByCategory,
  listAvailableThemes,
  RoomThemeId,
  type FloorType,
} from '@/lib/roomThemeUtils';
import { FLOOR_TYPE_PICKER_ORDER, floorTypeLabels, resolveDepthAmount, resolveFloorStyle } from '@/lib/roomFloorUtils';
import {
  CHANDELIER_TYPE_ORDER,
  chandelierTypeHints,
  chandelierTypeLabels,
  resolveChandelierCount,
  resolveChandelierType,
} from '@/lib/roomCeilingUtils';
import StairsUserGuide from '@/components/StairsUserGuide';
import CustomRoomThemePanel from '@/components/CustomRoomThemePanel';
import {
  formatStairSummary,
  resolveStairDefinition,
  STAIR_DIRECTION_ORDER,
  stairDirectionLabels,
  stairStyleHints,
  stairStyleLabels,
  type StairStyle,
} from '@/lib/roomStairsUtils';
import {
  addBalconies,
  addStairsLinkingStories,
  addStory,
  applyBuildingStoryPreset,
  applyStyleToSelection,
  belongsToActiveStory,
  balconySideLabels,
  BUILDING_STORY_PRESETS,
  createCorridorFixture,
  foundationKindLabels,
  linkStairsToStory,
  punchCorridorOpenings,
  removeStory,
  resolveActiveStoryId,
  resolveBuildingPresetId,
  resolveFoundation,
  resolveStories,
  setActiveStory,
  setStackView,
  updateFoundation,
  type BalconySide,
  type FoundationKind,
} from '@/lib/roomBuildingUtils';
import { cn } from '@/lib/cn';
import { Alert, Button, Input } from '@/components/ui';

const EDITOR_FIELD =
  'w-full min-h-11 px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-base sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary';
const EDITOR_CHIP =
  'inline-flex items-center justify-center min-h-11 px-3 rounded-full border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';
const EDITOR_PANEL_BTN =
  'inline-flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-[var(--radius-button)] border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40 disabled:cursor-not-allowed';
const EDITOR_HEADING = 'text-sm font-semibold text-foreground flex items-center gap-1';
const EDITOR_HINT = 'text-sm text-muted leading-snug';
const EDITOR_CARD_ACTION =
  'inline-flex items-center justify-center min-h-11 min-w-11 rounded-[var(--radius-button)] border border-border bg-surface text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';
const EDITOR_FILE =
  'block w-full min-h-11 text-sm text-foreground file:mr-3 file:min-h-11 file:px-3 file:rounded-[var(--radius-button)] file:border-0 file:bg-surface-muted file:text-sm file:font-medium file:text-foreground';
const EDITOR_REMOVE =
  'inline-flex items-center min-h-11 text-sm font-medium text-rose-700 dark:text-rose-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-[var(--radius-button)]';

const EDITOR_TOOL =
  'inline-flex items-center justify-center gap-1 min-h-11 px-3 rounded-[var(--radius-button)] text-xs font-bold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40 disabled:cursor-not-allowed';
const EDITOR_TOOL_IDLE = 'bg-surface border-border text-foreground hover:bg-surface-muted';
const EDITOR_TOOL_MUTED = 'bg-surface border-border text-muted hover:bg-surface-muted hover:text-foreground';
const EDITOR_TOOL_ON = 'bg-primary/10 border-primary/40 text-primary';
const EDITOR_TOOL_PRIMARY = 'bg-primary-solid text-primary-foreground border-transparent hover:bg-primary-solid-hover';
const EDITOR_TOOL_ICON =
  'inline-flex items-center justify-center min-h-11 min-w-11 rounded-[var(--radius-button)] border border-border bg-surface text-foreground hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';
const EDITOR_PICK =
  'min-h-11 p-2.5 rounded-[var(--radius-card)] border border-border bg-surface hover:border-primary/40 hover:bg-primary/5 text-left transition flex flex-col justify-between';

function DiscloseChevron({ open }: { open: boolean }) {
  return (
    <ChevronDown
      className={cn('h-4 w-4 shrink-0 text-muted transition-transform', open && 'rotate-180')}
      aria-hidden
    />
  );
}

type EditorToolGroupId = 'view' | 'light' | 'furniture' | 'zones' | 'building' | 'scene';

function ToolbarCluster({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 min-w-0 py-0.5 pl-2.5 border-l-2 border-border">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted shrink-0 w-full sm:w-auto">
        {label}
      </span>
      {children}
    </div>
  );
}

function EditorToolGroup({
  id,
  label,
  openId,
  onToggle,
  children,
}: {
  id: EditorToolGroupId;
  label: string;
  openId: EditorToolGroupId | null;
  onToggle: (id: EditorToolGroupId) => void;
  children: React.ReactNode;
}) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (items.length === 0) return null;
  const open = openId === id;
  const panelId = `editor-tool-group-${id}`;
  return (
    <>
      <button
        type="button"
        className={cn(
          'inline-flex items-center gap-1.5 shrink-0 min-h-11 px-3 rounded-full border text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          open
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-surface border-border text-muted hover:bg-surface-muted hover:text-foreground',
        )}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onToggle(id)}
      >
        {label}
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 opacity-80 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open ? (
        <div id={panelId} className="basis-full w-full flex flex-wrap items-center gap-1.5">
          {items}
        </div>
      ) : null}
    </>
  );
}

type SelectableKind = 'table' | 'row' | 'zone' | 'fixture' | 'wall' | 'chair';

interface RoomLayoutEditorProps {
  blueprint: RoomLayoutBlueprint;
  onChange: (blueprint: RoomLayoutBlueprint) => void;
  onRegenerate?: () => void;
  readOnly?: boolean;
  /** Thèmes, textures de sol et fixtures décoratives (scène, fleurs…). */
  allowThemesFixtures?: boolean;
  /** Niveau d’éditeur selon le forfait (basic / standard / advanced / complete). */
  editorLevel?: string | null;
  /** Coupe le rendu 3D sans démonter l’éditeur (historique conservé). */
  paused?: boolean;
  /** Ouvre le panneau d’import photo / lecture IA. */
  focusPlanImport?: boolean;
  /** Photo déjà choisie (wizard) — lance la lecture IA au montage. */
  seedPlanPhoto?: File | null;
  onSeedPlanPhotoConsumed?: () => void;
}

type CropTarget = { kind: 'fixture'; id: string } | null;

export default function RoomLayoutEditor({
  blueprint: rawBlueprint,
  onChange,
  onRegenerate,
  readOnly = false,
  allowThemesFixtures = true,
  editorLevel = 'complete',
  paused = false,
  focusPlanImport = false,
  seedPlanPhoto = null,
  onSeedPlanPhotoConsumed,
}: RoomLayoutEditorProps) {
  const { user, tenant } = useAuth();
  const blueprint = ensureBlueprintDefaults(rawBlueprint);
  const caps = roomEditorCapabilities(editorLevel, allowThemesFixtures);
  const [selection, setSelection] = useState<LayoutSelectionItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const actionLog = sanitizeLayoutActions(blueprint.metadata.layoutActions);
  const [cropTarget, setCropTarget] = useState<CropTarget>(null);
  const [aiPlanReading, setAiPlanReading] = useState(false);
  const [aiPlanError, setAiPlanError] = useState('');
  const [aiPlanWarnings, setAiPlanWarnings] = useState<string[]>([]);
  const [planPath, setPlanPath] = useState<PlanCreationPathId>(focusPlanImport ? 'photo' : 'manual');
  const aiPlanFileRef = useRef<HTMLInputElement>(null);
  const [arrangeDensity, setArrangeDensity] = useState<ArrangeDensity>('comfortable');
  const [keepTemplateStyle, setKeepTemplateStyle] = useState(true);
  const [keepThemeFloor, setKeepThemeFloor] = useState(false);
  const [accordion, setAccordion] = useState<string>('murs-sols');
  const [toolbarGroup, setToolbarGroup] = useState<EditorToolGroupId | null>(null);
  const toggleToolbarGroup = useCallback((id: EditorToolGroupId) => {
    setToolbarGroup((current) => (current === id ? null : id));
  }, []);
  const [wallEditMode, setWallEditMode] = useState(false);
  const [lockOrbit, setLockOrbit] = useState(true);
  const [walkthroughActive, setWalkthroughActive] = useState(false);
  const [walkthroughLabel, setWalkthroughLabel] = useState('');
  const [quickCreate, setQuickCreate] = useState<null | 'aisles' | 'chairs' | 'stairs' | 'balconies' | 'amphitheater' | 'chandeliers' | 'doors'>(null);
  const [aisleCount, setAisleCount] = useState(2);
  const [chairGroups, setChairGroups] = useState(2);
  const [rowsPerGroup, setRowsPerGroup] = useState(4);
  const [seatsPerRow, setSeatsPerRow] = useState(12);
  const [amphiStyle, setAmphiStyle] = useState<AmphitheaterStyle>('modernFan');
  const [amphiTiers, setAmphiTiers] = useState(4);
  const [amphiSeatsPerRow, setAmphiSeatsPerRow] = useState(12);
  const [amphiChairType, setAmphiChairType] = useState<ChairType>('THEATER');
  const [amphiChairStyle, setAmphiChairStyle] = useState<ChairStyle>('napoleon');
  const [amphiSeatMaterial, setAmphiSeatMaterial] = useState<SeatMaterial>('velvet');
  const [amphiAisleSplit, setAmphiAisleSplit] = useState(true);
  const [quickChandelierStyle, setQuickChandelierStyle] = useState<ChandelierFixtureStyle>('crystalCascade');
  const [quickDoorStyle, setQuickDoorStyle] = useState<DoorStyle>('frenchDoor');
  const [quickAisleStyle, setQuickAisleStyle] = useState<AisleStyle>('royalRed');
  const [elementsFilter, setElementsFilter] = useState<'all' | LayoutSelectionItem['kind']>('all');
  const [elementsQuery, setElementsQuery] = useState('');
  const [elementsOpen, setElementsOpen] = useState(true);
  const [groupStyleColor, setGroupStyleColor] = useState('#c4a06a');
  const [customAmbienceName, setCustomAmbienceName] = useState('');
  const [ambienceLibrary, setAmbienceLibrary] = useState<import('@/lib/roomLayoutUtils').SavedRoomAmbience[]>([]);
  const [ambiencePreviewPreset, setAmbiencePreviewPreset] = useState<import('@/lib/roomLayoutUtils').RoomAmbiencePreset | null>(null);
  const [ambienceCloudSyncing, setAmbienceCloudSyncing] = useState(false);
  const [orgAmbiences, setOrgAmbiences] = useState<import('@/lib/roomLayoutUtils').SharedRoomAmbience[]>([]);
  const [ambiencePresetQuery, setAmbiencePresetQuery] = useState('');
  const ambienceImportRef = useRef<HTMLInputElement>(null);
  const webglRef = useRef<RoomWebGLCaptureApi>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const pastRef = useRef<RoomLayoutBlueprint[]>([]);
  const futureRef = useRef<RoomLayoutBlueprint[]>([]);
  const skipHistoryRef = useRef(false);
  const dragHistPushedRef = useRef(false);
  const [customTplName, setCustomTplName] = useState('');
  const [tplParams, setTplParams] = useState<LayoutParams>({
    tableCount: 8,
    seatsPerTable: 8,
    tableShape: 'round',
    chairType: 'BANQUET',
    totalSeats: 64,
  });

  const syncHistoryFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const pushHistory = useCallback((snapshot: RoomLayoutBlueprint) => {
    pastRef.current = [...pastRef.current.slice(-49), structuredClone(snapshot)];
    futureRef.current = [];
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const latestBlueprintRef = useRef(blueprint);
  latestBlueprintRef.current = blueprint;

  const withLoggedAction = useCallback((
    next: RoomLayoutBlueprint,
    action?: { message: string; kind?: LayoutActionEntry['kind'] },
  ): RoomLayoutBlueprint => {
    const prepared = ensureBlueprintDefaults(next);
    if (!action) return prepared;
    return {
      ...prepared,
      metadata: {
        ...prepared.metadata,
        layoutActions: prependLayoutAction(
          sanitizeLayoutActions(latestBlueprintRef.current.metadata.layoutActions),
          action.message,
          action.kind ?? 'info',
        ),
      },
    };
  }, []);

  const emitBlueprint = useCallback((next: RoomLayoutBlueprint) => {
    const prepared = refreshBlueprintMetadata(ensureBlueprintDefaults(next));
    latestBlueprintRef.current = prepared;
    onChange(prepared);
  }, [onChange]);

  const log = useCallback((message: string, kind: LayoutActionEntry['kind'] = 'info') => {
    skipHistoryRef.current = true;
    emitBlueprint(withLoggedAction(latestBlueprintRef.current, { message, kind }));
    skipHistoryRef.current = false;
  }, [emitBlueprint, withLoggedAction]);

  const updateBlueprint = (next: RoomLayoutBlueprint, action?: { message: string; kind?: LayoutActionEntry['kind'] }) => {
    if (!skipHistoryRef.current) {
      pushHistory(latestBlueprintRef.current);
    }
    emitBlueprint(withLoggedAction(next, action));
  };

  const undo = useCallback(() => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current = [...futureRef.current, structuredClone(latestBlueprintRef.current)];
    skipHistoryRef.current = true;
    emitBlueprint(withLoggedAction(prev, { message: 'Annuler (Ctrl+Z)', kind: 'info' }));
    skipHistoryRef.current = false;
    syncHistoryFlags();
  }, [emitBlueprint, syncHistoryFlags, withLoggedAction]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current = [...pastRef.current, structuredClone(latestBlueprintRef.current)];
    skipHistoryRef.current = true;
    emitBlueprint(withLoggedAction(next, { message: 'Rétablir (Ctrl+Y)', kind: 'info' }));
    skipHistoryRef.current = false;
    syncHistoryFlags();
  }, [emitBlueprint, syncHistoryFlags, withLoggedAction]);

  useEffect(() => {
    if (!focusPlanImport && !seedPlanPhoto) return;
    setPlanPath('photo');
    setAccordion('murs-sols');
    window.requestAnimationFrame(() => scrollToElementId('plan-import-ia'));
  }, [focusPlanImport, seedPlanPhoto]);

  useEffect(() => {
    if (readOnly) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      } else if (key === 'l') {
        e.preventDefault();
        setLockOrbit((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [readOnly, undo, redo]);

  const primary = selection.length === 1 ? selection[0] : null;
  const selected = primary; // compat panneaux propriété (sélection unique)
  const multiSelection = selection.length >= 2;
  const selectedFurniture = selected && selected.kind !== 'fixture' && selected.kind !== 'wall'
    ? blueprint.furniture.find((f) => f.id === selected.id)
    : null;
  const selectedFixture = selected?.kind === 'fixture'
    ? blueprint.fixtures.find((f) => f.id === selected.id)
    : null;

  const handleWalkthroughProgress = useCallback((label: string) => {
    setWalkthroughLabel(label);
  }, []);

  const handleWalkthroughComplete = useCallback(() => {
    setWalkthroughActive(false);
    setWalkthroughLabel('');
    log('Visite guidée terminée', 'info');
  }, [log]);

  const handleCanvasSelect = useCallback((sel: LayoutSelectionItem | null, opts?: { additive?: boolean }) => {
    if (!sel) {
      setSelection([]);
      return;
    }
    if (opts?.additive) {
      setSelection((prev) => toggleSelectionItem(prev, sel));
      return;
    }
    setSelection(expandSelectionWithGroups(blueprint, [sel]));
  }, [blueprint]);

  const applyAlign = useCallback((mode: AlignMode) => {
    if (selection.length < 2 || readOnly) return;
    updateBlueprint(alignLayoutSelection(blueprint, selection, mode), {
      message: alignModeLabels[mode],
      kind: 'edit',
    });
  }, [blueprint, readOnly, selection]);

  const groupSelection = useCallback(() => {
    if (selection.length < 2 || readOnly) return;
    const next = groupLayoutSelection(blueprint, selection);
    updateBlueprint(next, { message: `Groupe créé (${selection.length} éléments)`, kind: 'edit' });
    setSelection(expandSelectionWithGroups(next, selection));
  }, [blueprint, readOnly, selection]);

  const ungroupSelection = useCallback(() => {
    if (selection.length === 0 || readOnly) return;
    updateBlueprint(ungroupLayoutSelection(blueprint, selection), {
      message: 'Groupe dissous',
      kind: 'edit',
    });
  }, [blueprint, readOnly, selection]);

  const duplicateSelection = useCallback(() => {
    if (readOnly || selection.length === 0) return;
    if (!caps.canDuplicate) {
      log('La duplication n’est pas incluse dans votre forfait', 'info');
      return;
    }
    const tablesToAdd = selection.filter((s) => s.kind === 'table').length;
    const rowsToAdd = selection.filter((s) => s.kind === 'row').length;
    const tableCount = blueprint.furniture.filter((f) => f.kind === 'table').length;
    const rowCount = blueprint.furniture.filter((f) => f.kind === 'row').length;
    if (tablesToAdd && tableCount + tablesToAdd > caps.maxTables) {
      log(`Limite de ${caps.maxTables} tables atteinte (${caps.label})`, 'info');
      return;
    }
    if (rowsToAdd && rowCount + rowsToAdd > caps.maxRows) {
      log(`Limite de ${caps.maxRows} rangées atteinte (${caps.label})`, 'info');
      return;
    }
    const result = duplicateLayoutSelection(blueprint, expandSelectionWithGroups(blueprint, selection));
    if (result.selection.length === 0) return;
    updateBlueprint(result.blueprint, {
      message: result.selection.length > 1
        ? `${result.selection.length} éléments dupliqués`
        : 'Élément dupliqué',
      kind: 'add',
    });
    setSelection(result.selection);
  }, [blueprint, caps.canDuplicate, caps.label, caps.maxRows, caps.maxTables, log, readOnly, selection]);

  const rotateSelection = useCallback(() => {
    if (readOnly || selection.length === 0) return;
    updateBlueprint(rotateLayoutSelection(blueprint, expandSelectionWithGroups(blueprint, selection)), {
      message: 'Sélection tournée de 90°',
      kind: 'edit',
    });
  }, [blueprint, readOnly, selection]);

  const flipSelection = useCallback((axis: 'horizontal' | 'vertical') => {
    if (readOnly || selection.length === 0) return;
    updateBlueprint(flipLayoutSelection(blueprint, expandSelectionWithGroups(blueprint, selection), axis), {
      message: axis === 'horizontal' ? 'Sélection miroir horizontal' : 'Sélection miroir vertical',
      kind: 'edit',
    });
  }, [blueprint, readOnly, selection]);

  const handleWebGLMove = useCallback((kind: SelectableKind, id: string, xPct: number, yPct: number) => {
    if (readOnly) return;
    if (!dragHistPushedRef.current) {
      pushHistory(blueprint);
      dragHistPushedRef.current = true;
    }
    const x = snapLayoutPct(xPct, caps.canSnapGrid);
    const y = snapLayoutPct(yPct, caps.canSnapGrid);
    skipHistoryRef.current = true;

    const movingInSelection = selection.some((s) => s.kind === kind && s.id === id);
    const moveSet = movingInSelection && selection.length > 1
      ? expandSelectionWithGroups(blueprint, selection)
      : [{ kind, id } as LayoutSelectionItem];

    if (moveSet.length > 1) {
      const box = getSelectionBounds(blueprint, { kind, id });
      if (box) {
        const dx = x - box.x;
        const dy = y - box.y;
        emitBlueprint(moveLayoutSelectionByDelta(blueprint, moveSet, dx, dy));
      }
    } else if (kind === 'fixture') {
      emitBlueprint({
        ...blueprint,
        fixtures: blueprint.fixtures.map((f) => (f.id === id ? { ...f, x, y } : f)),
      });
    } else {
      emitBlueprint({
        ...blueprint,
        furniture: blueprint.furniture.map((f) => (f.id === id ? { ...f, x, y } : f)),
      });
    }
    skipHistoryRef.current = false;
  }, [blueprint, caps.canSnapGrid, emitBlueprint, pushHistory, readOnly, selection]);

  const handleWebGLMoveEnd = useCallback(() => {
    if (dragHistPushedRef.current) {
      log('Élément déplacé', 'move');
    }
    dragHistPushedRef.current = false;
  }, [log]);

  const deleteSelected = () => {
    if (selection.length === 0 || readOnly) return;
    const wallIds = new Set(selection.filter((s) => s.kind === 'wall').map((s) => s.id));
    const fixtureIds = new Set(selection.filter((s) => s.kind === 'fixture').map((s) => s.id));
    const furnitureIds = new Set(
      selection.filter((s) => s.kind !== 'wall' && s.kind !== 'fixture').map((s) => s.id),
    );
    updateBlueprint({
      ...blueprint,
      walls: (blueprint.walls ?? []).filter((w) => !wallIds.has(w.id)),
      fixtures: blueprint.fixtures.filter((f) => !fixtureIds.has(f.id)),
      furniture: blueprint.furniture.filter((f) => !furnitureIds.has(f.id)),
    }, {
      message: selection.length > 1 ? `${selection.length} éléments supprimés` : 'Élément supprimé',
      kind: 'delete',
    });
    setSelection([]);
  };

  useEffect(() => {
    if (readOnly) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (e.key === 'Escape') {
        setSelection([]);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection.length > 0) {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (!mod) return;
      if (key === 'd') {
        e.preventDefault();
        duplicateSelection();
        return;
      }
      if (key === 'g' && !e.shiftKey && selection.length >= 2) {
        e.preventDefault();
        groupSelection();
      } else if (key === 'g' && e.shiftKey) {
        e.preventDefault();
        ungroupSelection();
      } else if (key === 'a') {
        e.preventDefault();
        const all: LayoutSelectionItem[] = [
          ...blueprint.furniture
            .filter((f) => f.kind === 'table' || f.kind === 'chair' || f.kind === 'row' || f.kind === 'zone')
            .map((f) => ({ kind: f.kind as SelectableKind, id: f.id })),
          ...blueprint.fixtures.map((f) => ({ kind: 'fixture' as const, id: f.id })),
        ];
        setSelection(all);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [readOnly, selection, blueprint.furniture, blueprint.fixtures, groupSelection, ungroupSelection, duplicateSelection]);

  const addTable = () => {
    const tableCount = blueprint.furniture.filter((f) => f.kind === 'table').length;
    if (tableCount >= caps.maxTables) {
      log(`Limite de ${caps.maxTables} tables atteinte (${caps.label})`, 'info');
      return;
    }
    const count = tableCount + 1;
    const defaultChair: ChairType =
      blueprint.roomType === 'CONFERENCE' || blueprint.roomType === 'AMPHITHEATER' ? 'THEATER' : 'BANQUET';
    const table = {
      ...createBlueprintTable(count, { chairType: defaultChair, shape: caps.tableShapes[0] }),
      storyId: resolveActiveStoryId(blueprint),
    };
    updateBlueprint({ ...blueprint, furniture: [...blueprint.furniture, table] }, { message: `Table « ${table.name} » ajoutée`, kind: 'add' });
    setSelection([{ kind: 'table', id: table.id }]);
  };

  const addArcRing = () => {
    if (!caps.tableShapes.includes('arc')) {
      log('Les tables en arc ne sont pas incluses dans votre forfait', 'info');
      return;
    }
    const existing = blueprint.furniture.filter((f) => f.kind === 'table').length;
    const remaining = caps.maxTables - existing;
    if (remaining < 2) {
      log(`Limite de ${caps.maxTables} tables atteinte (${caps.label})`, 'info');
      return;
    }
    const tables = composeArcRing({
      segmentCount: Math.min(6, remaining),
      capacity: 8,
      startIndex: existing + 1,
      tableColor: blueprint.metadata.defaultTableColor ?? '#e8d4c8',
    }).map((table) => ({ ...table, storyId: resolveActiveStoryId(blueprint) }));
    updateBlueprint(
      { ...blueprint, furniture: [...blueprint.furniture, ...tables] },
      { message: `Anneau de ${tables.length} tables en arc`, kind: 'add' },
    );
    setSelection(tables.map((table) => ({ kind: 'table' as const, id: table.id })));
  };

  const duplicateSelectedTable = duplicateSelection;
  const duplicateSelectedFixture = duplicateSelection;
  const duplicateSelectedChair = duplicateSelection;

  const addRow = () => {
    if (!caps.canAddRows) {
      log('Les rangées ne sont pas incluses dans votre forfait', 'info');
      return;
    }
    const rowCount = blueprint.furniture.filter((f) => f.kind === 'row').length;
    if (rowCount >= caps.maxRows) {
      log(`Limite de ${caps.maxRows} rangées atteinte (${caps.label})`, 'info');
      return;
    }
    const count = rowCount + 1;
    const row = { ...createBlueprintRow(count), storyId: resolveActiveStoryId(blueprint) };
    updateBlueprint({ ...blueprint, furniture: [...blueprint.furniture, row] }, { message: `Rangée « ${row.label} » ajoutée`, kind: 'add' });
    setSelection([{ kind: 'row', id: row.id }]);
  };

  const addAislesQuick = () => {
    if (!caps.canFixtures || !caps.fixtureKinds.includes('aisle')) {
      log('Les allées ne sont pas incluses dans votre forfait', 'info');
      return;
    }
    const existing = blueprint.fixtures.filter((f) => f.kind === 'aisle').length;
    const batch = createAislesBatch(aisleCount, existing).map((f) => ({
      ...f,
      storyId: resolveActiveStoryId(blueprint),
    }));
    updateBlueprint(
      { ...blueprint, fixtures: [...blueprint.fixtures, ...batch] },
      { message: `${batch.length} allée${batch.length > 1 ? 's' : ''} ajoutée${batch.length > 1 ? 's' : ''}`, kind: 'add' },
    );
    setQuickCreate(null);
    if (batch[0]) setSelection([{ kind: 'fixture', id: batch[0].id }]);
  };

  const addChairGroupsQuick = () => {
    if (!caps.canAddRows) {
      log('Les rangées ne sont pas incluses dans votre forfait', 'info');
      return;
    }
    const rowCount = blueprint.furniture.filter((f) => f.kind === 'row').length;
    const toAdd = chairGroups * rowsPerGroup;
    if (rowCount + toAdd > caps.maxRows) {
      log(`Limite de ${caps.maxRows} rangées (il reste ${Math.max(0, caps.maxRows - rowCount)})`, 'info');
      return;
    }
    const rows = createChairRowGroups({
      groupCount: chairGroups,
      rowsPerGroup,
      seatsPerRow,
      startRowIndex: rowCount + 1,
    });
    updateBlueprint(
      { ...blueprint, furniture: [...blueprint.furniture, ...rows] },
      { message: `${chairGroups} groupe${chairGroups > 1 ? 's' : ''} · ${rows.length} rangées ajoutées`, kind: 'add' },
    );
    setQuickCreate(null);
    if (rows[0]) setSelection(rows.map((r) => ({ kind: 'row' as const, id: r.id })));
  };

  const addZone = (label: string, opts?: { zoneKind?: ZoneKind; material?: ZoneMaterial }) => {
    if (!caps.canZones) {
      log('Les zones (piste, VIP, buffet) ne sont pas incluses dans votre forfait', 'info');
      return;
    }
    const count = blueprint.furniture.filter((f) => f.kind === 'zone').length + 1;
    const zone = {
      ...createBlueprintZone(label, count, opts),
      storyId: resolveActiveStoryId(blueprint),
    };
    updateBlueprint({ ...blueprint, furniture: [...blueprint.furniture, zone] }, { message: `Zone « ${zone.label} » ajoutée`, kind: 'add' });
    setSelection([{ kind: 'zone', id: zone.id }]);
  };

  const addFreeChair = () => {
    const count = blueprint.furniture.filter((f) => f.kind === 'chair').length + 1;
    const chair = {
      ...createBlueprintChair(count, {
      chairType: 'ARMCHAIR',
      chairStyle: 'lounge',
      seatMaterial: 'velvet',
    }),
      storyId: resolveActiveStoryId(blueprint),
    };
    updateBlueprint({ ...blueprint, furniture: [...blueprint.furniture, chair] }, { message: 'Fauteuil ajouté', kind: 'add' });
    setSelection([{ kind: 'chair', id: chair.id }]);
  };

  const addCarpet = () => {
    if (caps.canZones) {
      addZone('Moquette', { zoneKind: 'carpet', material: 'carpet' });
      return;
    }
    const fixture = createBlueprintFixture('carpet');
    updateBlueprint({ ...blueprint, fixtures: [...blueprint.fixtures, fixture] }, { message: 'Moquette ajoutée', kind: 'add' });
    setSelection([{ kind: 'fixture', id: fixture.id }]);
  };

  const clearWalls = () => {
    updateBlueprint({ ...blueprint, walls: [] }, { message: 'Tous les murs ont été retirés', kind: 'settings' });
    setSelection([]);
    setWallEditMode(false);
  };

  const addAmphitheaterQuick = () => {
    const activeStoryId = resolveActiveStoryId(blueprint);
    const groupId = `amphi_${Date.now().toString(36)}`;
    const rows = generateAmphitheaterRows({
      style: amphiStyle,
      tierCount: amphiTiers,
      seatsPerRow: amphiSeatsPerRow,
      chairType: amphiChairType,
      chairStyle: amphiChairStyle,
      seatMaterial: amphiSeatMaterial,
      aisleSplit: amphiAisleSplit,
      groupId,
    }).map((r) => ({ ...r, storyId: activeStoryId }));

    const hasStage = blueprint.fixtures.some((f) => f.kind === 'stage' || f.kind === 'podium');
    const extras = hasStage
      ? []
      : [{
          ...createBlueprintFixture('stage'),
          x: 28,
          y: 3,
          w: 44,
          h: 10,
          label: 'Scène',
          storyId: activeStoryId,
          groupId,
        }];

    updateBlueprint(
      {
        ...blueprint,
        furniture: [...blueprint.furniture, ...rows],
        fixtures: extras.length ? [...blueprint.fixtures, ...extras] : blueprint.fixtures,
      },
      { message: `Amphithéâtre ${amphitheaterStyleLabels[amphiStyle]} créé (${rows.length} gradins)`, kind: 'add' },
    );
    setQuickCreate(null);
    setSelection(rows.map((r) => ({ kind: 'row' as const, id: r.id })));
  };

  const addChandelierFixture = (style: ChandelierFixtureStyle = quickChandelierStyle) => {
    const fixture = {
      ...createBlueprintFixture('chandelier'),
      chandelierStyle: style,
      label: chandelierFixtureStyleLabels[style],
      storyId: resolveActiveStoryId(blueprint),
    };
    updateBlueprint(
      { ...blueprint, fixtures: [...blueprint.fixtures, fixture] },
      { message: `Lustre « ${fixture.label} » ajouté`, kind: 'add' },
    );
    setSelection([{ kind: 'fixture', id: fixture.id }]);
    setQuickCreate(null);
  };

  const addDoorFixture = (style: DoorStyle = quickDoorStyle) => {
    const isGrand = style === 'grandPortal';
    const fixture = {
      ...createBlueprintFixture(isGrand ? 'entrance' : 'door'),
      doorStyle: style,
      label: doorStyleLabels[style],
      storyId: resolveActiveStoryId(blueprint),
    };
    updateBlueprint(
      { ...blueprint, fixtures: [...blueprint.fixtures, fixture] },
      { message: `Porte « ${fixture.label} » ajoutée`, kind: 'add' },
    );
    setSelection([{ kind: 'fixture', id: fixture.id }]);
    setQuickCreate(null);
  };

  const addAisleCustomStyle = (style: AisleStyle = quickAisleStyle) => {
    const fixture = {
      ...createBlueprintFixture('aisle'),
      aisleStyle: style,
      label: aisleStyleLabels[style],
      storyId: resolveActiveStoryId(blueprint),
    };
    updateBlueprint(
      { ...blueprint, fixtures: [...blueprint.fixtures, fixture] },
      { message: `Allée « ${fixture.label} » ajoutée`, kind: 'add' },
    );
    setSelection([{ kind: 'fixture', id: fixture.id }]);
    setQuickCreate(null);
  };

  const addFixture = (kind: RoomLayoutBlueprint['fixtures'][number]['kind']) => {
    if (!caps.canFixtures || !caps.fixtureKinds.includes(kind as (typeof caps.fixtureKinds)[number])) {
      log('Cet élément n’est pas inclus dans votre forfait', 'info');
      return;
    }
    const fixture = {
      ...createBlueprintFixture(kind),
      storyId: resolveActiveStoryId(blueprint),
    };
    updateBlueprint({ ...blueprint, fixtures: [...blueprint.fixtures, fixture] }, { message: `${fixture.label || kind} ajouté`, kind: 'add' });
    setSelection([{ kind: 'fixture', id: fixture.id }]);
  };

  const addCorridor = () => {
    if (!caps.canFixtures || !caps.fixtureKinds.includes('corridor')) {
      log('Les couloirs ne sont pas inclus dans votre forfait', 'info');
      return;
    }
    const n = blueprint.fixtures.filter((f) => f.kind === 'corridor').length + 1;
    const fixture = { ...createCorridorFixture(n), storyId: resolveActiveStoryId(blueprint) };
    updateBlueprint(
      { ...blueprint, fixtures: [...blueprint.fixtures, fixture] },
      { message: `${fixture.label} ajouté`, kind: 'add' },
    );
    setSelection([{ kind: 'fixture', id: fixture.id }]);
  };

  /** Escalier déjà relié vers un autre étage (1 clic). */
  const addStairsToStory = (toStoryId: string) => {
    if (!caps.canFixtures || !caps.fixtureKinds.includes('stairs')) {
      log('Les escaliers ne sont pas inclus dans votre forfait', 'info');
      return;
    }
    const stories = resolveStories(blueprint);
    if (stories.length < 2) {
      log('Ajoutez d’abord un étage (panneau Étages)', 'info');
      setAccordion('batiment');
      return;
    }
    const result = addStairsLinkingStories(blueprint, toStoryId);
    if (!result) {
      log('Impossible de relier cet étage', 'info');
      return;
    }
    const toLabel = stories.find((s) => s.id === toStoryId)?.label ?? 'étage';
    updateBlueprint(result.blueprint, {
      message: `Escalier vers « ${toLabel} » ajouté`,
      kind: 'add',
    });
    setSelection([{ kind: 'fixture', id: result.stairsId }]);
    setQuickCreate(null);
  };

  const openStairsQuickCreate = () => {
    if (!caps.canFixtures || !caps.fixtureKinds.includes('stairs')) {
      log('Les escaliers ne sont pas inclus dans votre forfait', 'info');
      return;
    }
    const stories = resolveStories(blueprint);
    if (stories.length < 2) {
      setAccordion('batiment');
      log('Ajoutez un étage, puis créez l’escalier vers celui-ci', 'info');
      return;
    }
    const others = stories.filter((s) => s.id !== resolveActiveStoryId(blueprint));
    if (others.length === 1 && others[0]) {
      addStairsToStory(others[0].id);
      return;
    }
    setQuickCreate(quickCreate === 'stairs' ? null : 'stairs');
  };

  const removeActiveOrStory = (storyId: string) => {
    const stories = resolveStories(blueprint);
    if (stories.length <= 1) {
      log('Impossible de supprimer le dernier étage', 'info');
      return;
    }
    const label = stories.find((s) => s.id === storyId)?.label ?? 'étage';
    const next = removeStory(blueprint, storyId);
    updateBlueprint(next, {
      message: `Étage « ${label} » supprimé`,
      kind: 'edit',
    });
    setSelection([]);
  };

  const addBalconyOnSide = (side: BalconySide) => {
    if (!caps.canFixtures || !caps.fixtureKinds.includes('balcony')) {
      log('Les balcons ne sont pas inclus dans votre forfait', 'info');
      return;
    }
    const { blueprint: next, ids } = addBalconies(blueprint, [side]);
    if (ids.length === 0) {
      log(`Un balcon existe déjà côté ${balconySideLabels[side]}`, 'info');
      return;
    }
    updateBlueprint(next, { message: `Balcon ${balconySideLabels[side]} ajouté`, kind: 'add' });
    setSelection(ids.map((id) => ({ kind: 'fixture' as const, id })));
  };

  const addAllFacadesBalconies = () => {
    if (!caps.canFixtures || !caps.fixtureKinds.includes('balcony')) {
      log('Les balcons ne sont pas inclus dans votre forfait', 'info');
      return;
    }
    const sides: BalconySide[] = ['north', 'south', 'east', 'west'];
    const { blueprint: next, ids } = addBalconies(blueprint, sides);
    if (ids.length === 0) {
      log('Les quatre façades ont déjà un balcon', 'info');
      return;
    }
    updateBlueprint(next, {
      message: `${ids.length} balcon${ids.length > 1 ? 's' : ''} ajouté${ids.length > 1 ? 's' : ''}`,
      kind: 'add',
    });
    setSelection(ids.map((id) => ({ kind: 'fixture' as const, id })));
  };

  const applyTemplate = (templateId: string) => {
    const tpl = ROOM_LAYOUT_TEMPLATES.find((t) => t.id === templateId);
    const next = applyRoomTemplate(templateId, tplParams, blueprint, { keepStyle: keepTemplateStyle });
    if (!next) return;
    const seats = next.metadata.totalSeats;
    updateBlueprint(next, {
      message: `Modèle « ${tpl?.name} » généré${seats ? ` — ${seats} places` : ''}`,
      kind: 'template',
    });
    setSelection([]);
  };

  const saveCurrentAsTemplate = () => {
    const template = createSavedRoomTemplate(blueprint, customTplName || 'Mon modèle');
    updateBlueprint(saveCustomTemplateToBlueprint(blueprint, template), {
      message: `Modèle « ${template.name} » enregistré`,
      kind: 'template',
    });
    setCustomTplName('');
  };

  const applyCustomTemplate = (templateId: string) => {
    const next = applySavedRoomTemplate(blueprint, templateId, { keepStyle: keepTemplateStyle });
    if (!next) return;
    const name = blueprint.metadata.customTemplates?.find((t) => t.id === templateId)?.name ?? 'perso.';
    updateBlueprint(next, { message: `Modèle « ${name} » appliqué`, kind: 'template' });
    setSelection([]);
  };

  const setRoomOutlineShape = (shape: RoomOutlineShape) => {
    const outline = { ...(blueprint.roomOutline ?? defaultRoomOutline(shape)), shape };
    const walls = wallsFromRoomOutline(outline, {
      heightM: blueprint.walls?.[0]?.heightM ?? 3,
      thicknessM: blueprint.walls?.[0]?.thicknessM ?? 0.2,
      texture: blueprint.walls?.[0]?.texture ?? 'plaster',
      withEntrance: true,
    });
    updateBlueprint({
      ...blueprint,
      roomOutline: outline,
      walls,
    }, { message: `Forme de salle : ${roomOutlineLabels[shape]}`, kind: 'settings' });
  };

  const updateFurniture = (id: string, patch: Record<string, unknown>, actionMsg?: string) => {
    updateBlueprint({
      ...blueprint,
      furniture: blueprint.furniture.map((f) => (f.id === id ? { ...f, ...patch } as typeof f : f)),
    }, actionMsg ? { message: actionMsg, kind: 'edit' } : undefined);
  };

  const updateFixture = (id: string, patch: Record<string, unknown>, actionMsg?: string) => {
    updateBlueprint({
      ...blueprint,
      fixtures: blueprint.fixtures.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }, actionMsg ? { message: actionMsg, kind: 'edit' } : undefined);
  };

  const setDefaultTableColor = (color: string) => {
    updateBlueprint({
      ...blueprint,
      metadata: { ...blueprint.metadata, defaultTableColor: color },
    }, { message: `Couleur par défaut des tables : ${color}`, kind: 'settings' });
  };

  const applyTableColorToAll = (color: string) => {
    updateBlueprint({
      ...blueprint,
      metadata: { ...blueprint.metadata, defaultTableColor: color },
      furniture: blueprint.furniture.map((f) =>
        f.kind === 'table' ? { ...f, tableColor: color } : f,
      ),
    }, { message: 'Couleur appliquée à toutes les tables', kind: 'settings' });
  };

  const handleCropApply = (imageUrl: string, crop: ImageCropRect) => {
    if (!cropTarget) return;
    updateFixture(cropTarget.id, { imageUrl, imageCrop: crop }, 'Image personnalisée appliquée');
    setCropTarget(null);
  };

  const cropFixture = cropTarget ? blueprint.fixtures.find((f) => f.id === cropTarget.id) : null;

  const applyTheme = (themeId: RoomThemeId) => {
    const next = applyRoomTheme(blueprint, themeId, { keepFloor: keepThemeFloor });
    updateBlueprint(next, { message: `Thème « ${getRoomTheme(themeId, blueprint).name} » appliqué`, kind: 'settings' });
  };

  const setFloorType = (floorType: FloorType) => {
    updateBlueprint({
      ...blueprint,
      metadata: { ...blueprint.metadata, floorType, floorImageUrl: undefined, floorImageFit: undefined },
    }, { message: `Sol : ${floorTypeLabels[floorType]}`, kind: 'settings' });
  };

  /** Texture de sol répétée (photo). */
  const setFloorImage = async (file: File) => {
    const url = await readImageFile(file);
    updateBlueprint({
      ...blueprint,
      metadata: { ...blueprint.metadata, floorImageUrl: url, floorType: 'custom', floorImageFit: 'tile' },
    }, { message: 'Texture de sol importée', kind: 'settings' });
  };

  /** Plan de salle complet (image entière affichée sur le sol). */
  const importRoomPlanImage = async (file: File) => {
    const url = await readImageFile(file);
    updateBlueprint({
      ...blueprint,
      metadata: {
        ...blueprint.metadata,
        floorImageUrl: url,
        floorType: 'custom',
        floorImageFit: 'cover',
      },
    }, { message: 'Plan de salle importé depuis l’image', kind: 'settings' });
  };

  const resolvePlanImageUrl = async (file: File): Promise<string> => {
    try {
      const uploaded = await uploadImageFile(file);
      if (uploaded?.url) return uploaded.url;
    } catch {
      /* data URL en secours si l’upload cloud n’est pas disponible */
    }
    return readImageFile(file);
  };

  const readRoomPlanWithAi = async (file?: File) => {
    if (readOnly || aiPlanReading) return;
    setAiPlanError('');
    setAiPlanWarnings([]);
    let imageUrl = blueprint.metadata.floorImageUrl;
    if (file) {
      imageUrl = await resolvePlanImageUrl(file);
    }
    if (!imageUrl) {
      setAiPlanError('Importez d’abord une photo ou un scan du plan.');
      aiPlanFileRef.current?.click();
      return;
    }
    setAiPlanReading(true);
    try {
      const result = await analyzeRoomPlanFromPhoto({
        imageUrl,
        roomType: latestBlueprintRef.current.roomType,
        widthM: latestBlueprintRef.current.canvas.widthM,
        heightM: latestBlueprintRef.current.canvas.heightM,
      });
      const applied = applyRoomPlanVisionDraft(latestBlueprintRef.current, result.draft, caps, { imageUrl });
      updateBlueprint(applied.blueprint, {
        message: `Plan lu par l’IA (${applied.selection.length} éléments, ${Math.round((result.draft.confidence || 0) * 100)} %)`,
        kind: 'template',
      });
      setSelection(applied.selection);
      setAiPlanWarnings(applied.warnings);
      if (applied.selection.length === 0) {
        log('Aucun objet posé — le plan reste un repère visuel. Placez les tables à la main.', 'info');
      } else {
        log('Objets IA sélectionnés — déplacez, tournez ou supprimez avant d’enregistrer.', 'info');
      }
    } catch (err) {
      const message = err instanceof Error && err.message
        ? err.message
        : 'Impossible de lire le plan avec l’IA.';
      setAiPlanError(message);
      log(message, 'info');
    } finally {
      setAiPlanReading(false);
    }
  };

  useEffect(() => {
    if (!seedPlanPhoto || readOnly) return;
    void readRoomPlanWithAi(seedPlanPhoto);
    onSeedPlanPhotoConsumed?.();
    // Une fois par fichier fourni par le wizard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedPlanPhoto]);

  const activeTheme = getRoomTheme(blueprint.metadata.roomThemeId, blueprint);
  const effectiveFloorType = blueprint.metadata.floorType ?? activeTheme.defaultFloorType;
  const availableThemes = listAvailableThemes(blueprint);
  const themesByCategory = groupThemesByCategory(availableThemes);
  const depthAmount = resolveDepthAmount(blueprint.metadata);

  const applyArrange = (preset: TableArrangePreset) => {
    const tables = blueprint.furniture.filter((item) => item.kind === 'table' && !item.locked);
    if (tables.length === 0) {
      log('Ajoutez des tables (déverrouillées) pour les agencer.', 'info');
      return;
    }
    updateBlueprint(autoArrangeTables(blueprint, preset, arrangeDensity), {
      message: `Tables agencées — ${tableArrangeLabels[preset]} (${arrangeDensityLabels[arrangeDensity]})`,
      kind: 'edit',
    });
  };

  const setDepthAmount = (amount: number) => {
    const next = Math.max(0, Math.min(100, Math.round(amount)));
    updateBlueprint({
      ...blueprint,
      metadata: { ...blueprint.metadata, depthAmount: next, depthView: next > 0 },
    }, { message: next <= 0 ? 'Vue du dessus' : `Perspective 3D : ${next}%`, kind: 'settings' });
  };

  const outline = blueprint.roomOutline!;
  const renderQualityRaw = (blueprint.metadata.renderQuality ?? 'standard') as RenderQuality;
  const renderQuality =
    renderQualityRaw === 'showcase' && !caps.canShowcaseRender ? 'standard' : renderQualityRaw;
  const lightingPreset = (blueprint.metadata.lightingPreset ?? 'auto') as LightingPreset;

  const setRenderQuality = (q: RenderQuality) => {
    if (q === 'showcase' && !caps.canShowcaseRender) {
      log('Showcase réservé aux forfaits Premium / Complet', 'info');
      return;
    }
    updateBlueprint({
      ...blueprint,
      metadata: { ...blueprint.metadata, renderQuality: q },
    }, { message: `Qualité rendu : ${renderQualityLabels[q]}`, kind: 'settings' });
  };

  const setLightingPreset = (p: LightingPreset) => {
    updateBlueprint({
      ...blueprint,
      metadata: { ...blueprint.metadata, lightingPreset: p },
    }, { message: `Éclairage : ${lightingPresetLabels[p]}`, kind: 'settings' });
  };

  const applyAmbience = (preset: import('@/lib/roomLayoutUtils').RoomAmbiencePreset, scope?: AmbienceApplyScope) => {
    const applied = applyRoomAmbiencePreset(blueprint, preset, scope);
    const next = recordAmbienceHistory(applied, preset);
    updateBlueprint(next, { message: `Ambiance : ${preset.label}`, kind: 'settings' });
    if (preset.roomThemeId && (scope?.theme ?? true)) applyTheme(preset.roomThemeId);
    setAmbiencePreviewPreset(null);
  };

  const syncCloudLibrary = useCallback(async () => {
    if (!user) return;
    setAmbienceCloudSyncing(true);
    try {
      const merged = await syncAmbienceLibraryWithCloud();
      setAmbienceLibrary(merged);
      updateBlueprint(blueprint, { message: 'Bibliothèque synchronisée avec le cloud', kind: 'settings' });
    } catch {
      updateBlueprint(blueprint, { message: 'Synchronisation cloud indisponible', kind: 'settings' });
    } finally {
      setAmbienceCloudSyncing(false);
    }
  }, [user, blueprint, updateBlueprint]);

  const captureAmbienceForLibrary = useCallback(async (name: string) => {
    const trimmed = name.trim() || 'Ambiance capturée';
    let local = captureAmbienceToLibrary(blueprint, trimmed);
    setAmbienceLibrary(local);
    if (!user) return;
    const latest = local[0];
    if (!latest) return;
    try {
      const cloud = await pushCloudAmbience(latest);
      if (cloud) {
        local = replaceAmbienceLibrary([cloud, ...local.filter((row) => row.id !== latest.id)]);
        setAmbienceLibrary(local);
      }
    } catch {
      // conserve la copie locale
    }
  }, [blueprint, user]);

  useEffect(() => {
    setAmbienceLibrary(loadAmbienceLibrary());
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    setAmbienceCloudSyncing(true);
    void syncAmbienceLibraryWithCloud()
      .then(setAmbienceLibrary)
      .catch(() => {})
      .finally(() => setAmbienceCloudSyncing(false));
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('ambience');
    if (!token) return;
    const item = decodeAmbienceShareToken(token);
    params.delete('ambience');
    const qs = params.toString();
    window.history.replaceState({}, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    if (item) setAmbiencePreviewPreset(item.preset);
  }, []);

  useEffect(() => {
    if (!tenant?.id) {
      setOrgAmbiences([]);
      return;
    }
    void fetchOrgAmbiences()
      .then(setOrgAmbiences)
      .catch(() => setOrgAmbiences([]));
  }, [tenant?.id]);

  const filteredAmbiencePresets = useMemo(() => {
    const q = ambiencePresetQuery.trim().toLowerCase();
    if (!q) return ROOM_AMBIENCE_PRESETS;
    return ROOM_AMBIENCE_PRESETS.filter((preset) =>
      preset.label.toLowerCase().includes(q)
      || preset.description.toLowerCase().includes(q)
      || (preset.tableSurface && preset.tableSurface.includes(q as TableSurfaceStyle)),
    );
  }, [ambiencePresetQuery]);

  const activeAmbienceId = useMemo(() => {
    const builtin = ROOM_AMBIENCE_PRESETS.find((preset) => roomAmbienceMatchesBlueprint(blueprint, preset));
    if (builtin) return builtin.id;
    const custom = blueprint.metadata.customAmbiences?.find((saved) => roomAmbienceMatchesBlueprint(blueprint, saved.preset));
    if (custom) return custom.id;
    const library = ambienceLibrary.find((saved) => roomAmbienceMatchesBlueprint(blueprint, saved.preset));
    if (library) return library.id;
    const org = orgAmbiences.find((saved) => roomAmbienceMatchesBlueprint(blueprint, saved.preset));
    return org?.id ?? null;
  }, [blueprint, ambienceLibrary, orgAmbiences]);

  const [ambienceImportTarget, setAmbienceImportTarget] = useState<'room' | 'library'>('library');

  const handleAmbienceFileImport = async (file: File) => {
    try {
      const text = await file.text();
      if (ambienceImportTarget === 'library') {
        const next = mergeAmbienceLibraryImport(text);
        setAmbienceLibrary(next);
        return;
      }
      const items = parseAmbienceImport(text);
      if (!items.length) return;
      const next = importCustomAmbiencesToBlueprint(blueprint, items, 'merge');
      updateBlueprint(next, {
        message: `${items.length} ambiance(s) importée(s) dans cette salle`,
        kind: 'settings',
      });
    } catch {
      updateBlueprint(blueprint, { message: 'Fichier d’ambiance invalide', kind: 'settings' });
    }
  };

  const canvasInventory = (() => {
    const kindLabel: Record<LayoutSelectionItem['kind'], string> = {
      table: 'Table',
      row: 'Rangée',
      zone: 'Zone',
      chair: 'Chaise',
      fixture: 'Élément',
      wall: 'Mur',
    };
    const items: Array<{
      kind: LayoutSelectionItem['kind'];
      id: string;
      title: string;
      subtitle: string;
    }> = [];

    for (const f of blueprint.furniture) {
      if (!belongsToActiveStory(blueprint, f.storyId)) continue;
      if (f.kind === 'table') {
        items.push({
          kind: 'table',
          id: f.id,
          title: f.name || `Table`,
          subtitle: `${tableShapeLabels[f.shape] ?? f.shape} · ${f.capacity} places`,
        });
      } else if (f.kind === 'row') {
        items.push({
          kind: 'row',
          id: f.id,
          title: f.label || 'Rangée',
          subtitle: `${f.seatCount} sièges`,
        });
      } else if (f.kind === 'zone') {
        items.push({
          kind: 'zone',
          id: f.id,
          title: f.label || 'Zone',
          subtitle: (f.zoneKind && zoneKindLabels[f.zoneKind]) || f.zoneKind || 'Zone',
        });
      } else if (f.kind === 'chair') {
        items.push({
          kind: 'chair',
          id: f.id,
          title: f.label || (f.chairType === 'ARMCHAIR' ? 'Fauteuil' : 'Chaise'),
          subtitle: chairTypeLabels[f.chairType] ?? f.chairType,
        });
      }
    }

    for (const fx of blueprint.fixtures) {
      if (!belongsToActiveStory(blueprint, fx.storyId)) continue;
      items.push({
        kind: 'fixture',
        id: fx.id,
        title: fx.label || kindLabel.fixture,
        subtitle: fx.kind,
      });
    }

    for (const [i, wall] of (blueprint.walls ?? []).entries()) {
      if (!belongsToActiveStory(blueprint, wall.storyId)) continue;
      items.push({
        kind: 'wall',
        id: wall.id,
        title: `Mur ${i + 1}`,
        subtitle: `${wall.texture} · ${wall.heightM.toFixed(1)} m`,
      });
    }

    const q = elementsQuery.trim().toLowerCase();
    return items.filter((it) => {
      if (elementsFilter !== 'all' && it.kind !== elementsFilter) return false;
      if (!q) return true;
      return `${it.title} ${it.subtitle} ${it.kind}`.toLowerCase().includes(q);
    });
  })();

  const renderCanvasInventory = () => {
    if (readOnly) return null;
    const counts = {
      all: blueprint.furniture.length + blueprint.fixtures.length + (blueprint.walls?.length ?? 0),
      table: blueprint.furniture.filter((f) => f.kind === 'table').length,
      row: blueprint.furniture.filter((f) => f.kind === 'row').length,
      zone: blueprint.furniture.filter((f) => f.kind === 'zone').length,
      chair: blueprint.furniture.filter((f) => f.kind === 'chair').length,
      fixture: blueprint.fixtures.length,
      wall: blueprint.walls?.length ?? 0,
    };
    const filters: Array<{ id: typeof elementsFilter; label: string; n: number }> = [
      { id: 'all', label: 'Tous', n: counts.all },
      { id: 'table', label: 'Tables', n: counts.table },
      { id: 'row', label: 'Rangées', n: counts.row },
      { id: 'zone', label: 'Zones', n: counts.zone },
      { id: 'chair', label: 'Chaises', n: counts.chair },
      { id: 'fixture', label: 'Fixtures', n: counts.fixture },
      { id: 'wall', label: 'Murs', n: counts.wall },
    ];

    return (
      <div className="border border-border rounded-[var(--radius-card)] bg-surface overflow-hidden shadow-sm">
        <button
          type="button"
          className={cn(
            'w-full flex items-center justify-between p-3 text-left text-sm font-semibold transition-colors',
            elementsOpen ? 'bg-surface-muted text-foreground' : 'bg-surface text-muted hover:bg-surface-muted/50',
          )}
          onClick={() => setElementsOpen((v) => !v)}
        >
          <span className="flex items-center gap-2">
            <ListTree className="w-4 h-4" />
            Éléments du plan
            <span className="text-sm font-medium text-muted tabular-nums">({counts.all})</span>
          </span>
          <span className="text-sm text-muted">{elementsOpen ? 'Masquer' : 'Afficher'}</span>
        </button>
        {elementsOpen ? (
          <div className="border-t border-border p-2.5 space-y-2">
            <Input
              type="search"
              label="Rechercher un élément"
              value={elementsQuery}
              onChange={(e) => setElementsQuery(e.target.value)}
              placeholder="Nom, table, rangée…"
            />
            <div className="flex flex-wrap gap-1.5">
              {filters.filter((f) => f.id === 'all' || f.n > 0).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setElementsFilter(f.id)}
                  className={cn(
                    EDITOR_CHIP,
                    elementsFilter === f.id
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'bg-surface-muted border-border text-muted',
                  )}
                >
                  {f.label} {f.n}
                </button>
              ))}
            </div>
            <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5">
              {canvasInventory.length === 0 ? (
                <p className="text-sm text-muted px-1 py-3 text-center">Aucun élément</p>
              ) : (
                canvasInventory.map((it) => {
                  const active = selection.some((s) => s.kind === it.kind && s.id === it.id);
                  return (
                    <button
                      key={`${it.kind}:${it.id}`}
                      type="button"
                      onClick={(e) => {
                        if (it.kind === 'wall') setWallEditMode(true);
                        handleCanvasSelect({ kind: it.kind, id: it.id }, { additive: e.shiftKey || e.metaKey || e.ctrlKey });
                      }}
                      className={cn(
                        'w-full min-h-11 text-left px-2.5 py-2 rounded-[var(--radius-button)] border transition-colors',
                        active
                          ? 'bg-primary/10 border-primary/40 text-primary'
                          : 'bg-background border-transparent hover:border-border hover:bg-surface-muted',
                      )}
                      title="Clic = sélectionner · Shift/Cmd = multi"
                    >
                      <span className="block text-sm font-semibold truncate">{it.title}</span>
                      <span className="block text-xs text-muted truncate capitalize">{it.subtitle}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const exportShowcasePng = () => {
    const scale = exportPixelRatio(renderQuality === 'draft' ? 'standard' : renderQuality);
    const url = webglRef.current?.capturePng(scale);
    if (!url) {
      log('Capture indisponible — réessayez dans une seconde', 'info');
      return;
    }
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadDataUrl(url, `salle-${blueprint.roomType.toLowerCase()}-${stamp}.png`);
    log('Export PNG HD téléchargé', 'info');
  };

  const renderCanvas = (className: string) => (
    <RoomWebGLViewer
      ref={webglRef}
      blueprint={blueprint}
      selected={selection}
      onSelect={handleCanvasSelect}
      onMoveItem={handleWebGLMove}
      onMoveEnd={handleWebGLMoveEnd}
      readOnly={readOnly}
      wallEditMode={wallEditMode}
      lockOrbit={lockOrbit}
      renderQuality={renderQuality}
      lightingPreset={lightingPreset}
      presentationMode={blueprint.metadata.presentationMode === true}
      walkthroughActive={walkthroughActive}
      onWalkthroughProgress={handleWalkthroughProgress}
      onWalkthroughComplete={handleWalkthroughComplete}
      paused={paused}
      className={className}
    />
  );

  const selectWall = useCallback((id: string | null) => {
    setSelection(id ? [{ kind: 'wall', id }] : []);
  }, []);

  const renderChairImageUpload = (id: string, currentUrl?: string) => (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-foreground flex items-center gap-1"><ImagePlus className="w-3.5 h-3.5" /> Image de chaise (optionnel)</span>
      <input
        type="file"
        accept="image/*"
        className={EDITOR_FILE}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const url = await readImageFile(file);
          updateFurniture(id, { chairImageUrl: url }, 'Image de chaise personnalisée');
        }}
      />
      {currentUrl && (
        <button type="button" className={EDITOR_REMOVE} onClick={() => updateFurniture(id, { chairImageUrl: undefined }, 'Image de chaise retirée')}>
          Retirer l&apos;image
        </button>
      )}
    </label>
  );

  const renderTableImageUpload = (id: string, currentUrl?: string) => (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-foreground flex items-center gap-1"><ImagePlus className="w-3.5 h-3.5" /> Image de table (nappage, bois…)</span>
      <input
        type="file"
        accept="image/*"
        className={EDITOR_FILE}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const url = await readImageFile(file);
          updateFurniture(id, { tableImageUrl: url }, 'Image de table importée');
        }}
      />
      {currentUrl && (
        <button type="button" className={EDITOR_REMOVE} onClick={() => updateFurniture(id, { tableImageUrl: undefined }, 'Image de table retirée')}>
          Retirer l&apos;image
        </button>
      )}
    </label>
  );

  const renderEditPanel = () => {
    if (readOnly) return null;

    if (multiSelection) {
      return (
        <div className="space-y-4">
          <div className="p-4 border border-border rounded-[var(--radius-card)] bg-surface space-y-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <BoxSelect className="w-4 h-4" />
              {selection.length} éléments sélectionnés
            </p>
            <p className="text-xs text-muted">
              Shift+clic pour ajouter / retirer · Échap pour tout désélectionner
              {caps.canDuplicate ? ' · Cmd/Ctrl+D pour dupliquer' : ''}
              {caps.canAlign ? ' · Cmd/Ctrl+G pour grouper' : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {caps.canDuplicate ? (
                <button type="button" onClick={duplicateSelection} className={cn(EDITOR_TOOL, EDITOR_TOOL_PRIMARY)}>
                  <Copy className="w-3.5 h-3.5" aria-hidden /> Dupliquer
                </button>
              ) : null}
              <button type="button" onClick={rotateSelection} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}>
                <RotateCw className="w-3.5 h-3.5" aria-hidden /> Tourner 90°
              </button>
              <button type="button" onClick={deleteSelected} className={cn(EDITOR_TOOL, 'border-border bg-surface-muted text-foreground hover:bg-surface')}>
                <Trash2 className="w-3.5 h-3.5" aria-hidden /> Supprimer
              </button>
            </div>
            <details className="rounded-[var(--radius-card)] border border-border bg-surface-muted/40">
              <summary className="min-h-11 px-3 flex items-center justify-between gap-2 text-sm font-semibold text-foreground cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                Aligner, miroir & groupe
                <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted" aria-hidden />
              </summary>
              <div className="px-3 pb-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => flipSelection('horizontal')} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}>
                    <FlipHorizontal2 className="w-3.5 h-3.5" aria-hidden /> Miroir H
                  </button>
                  <button type="button" onClick={() => flipSelection('vertical')} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}>
                    <FlipVertical2 className="w-3.5 h-3.5" aria-hidden /> Miroir V
                  </button>
                </div>
                {caps.canAlign ? (
                  <>
                    <div className="grid grid-cols-4 gap-1.5">
                      {([
                        ['left', AlignLeft],
                        ['centerX', AlignCenter],
                        ['right', AlignRight],
                        ['distributeX', BetweenHorizontalStart],
                        ['top', AlignStartVertical],
                        ['centerY', AlignCenterVertical],
                        ['bottom', AlignEndVertical],
                        ['distributeY', BetweenVerticalStart],
                      ] as const).map(([mode, Icon]) => (
                        <button
                          key={mode}
                          type="button"
                          title={alignModeLabels[mode]}
                          aria-label={alignModeLabels[mode]}
                          onClick={() => applyAlign(mode)}
                          className={cn(EDITOR_TOOL_ICON, 'w-full')}
                        >
                          <Icon className="w-3.5 h-3.5" aria-hidden />
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={groupSelection} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE, 'flex-1')}>
                        <Group className="w-3.5 h-3.5" aria-hidden /> Grouper
                      </button>
                      <button type="button" onClick={ungroupSelection} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE, 'flex-1')}>
                        <Ungroup className="w-3.5 h-3.5" aria-hidden /> Dégrouper
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </details>
            <details className="rounded-[var(--radius-card)] border border-border bg-surface-muted/40">
              <summary className="min-h-11 px-3 flex items-center justify-between gap-2 text-sm font-semibold text-foreground cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                Déplacer & style
                <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted" aria-hidden />
              </summary>
              <div className="px-3 pb-3 space-y-2">
                <p className={EDITOR_HEADING}>Déplacer le groupe</p>
                <div className="grid grid-cols-3 gap-1 place-items-center max-w-[140px] mx-auto">
                  <span />
                  <button type="button" aria-label="Déplacer le groupe vers le haut" onClick={() => updateBlueprint(moveLayoutSelectionByDelta(blueprint, selection, 0, -3), { message: 'Groupe déplacé ↑', kind: 'edit' })} className={EDITOR_TOOL_ICON}><ArrowUp className="w-4 h-4" aria-hidden /></button>
                  <span />
                  <button type="button" aria-label="Déplacer le groupe vers la gauche" onClick={() => updateBlueprint(moveLayoutSelectionByDelta(blueprint, selection, -3, 0), { message: 'Groupe déplacé ←', kind: 'edit' })} className={EDITOR_TOOL_ICON}><ArrowLeft className="w-4 h-4" aria-hidden /></button>
                  <button type="button" aria-label="Déplacer le groupe vers le bas" onClick={() => updateBlueprint(moveLayoutSelectionByDelta(blueprint, selection, 0, 3), { message: 'Groupe déplacé ↓', kind: 'edit' })} className={EDITOR_TOOL_ICON}><ArrowDown className="w-4 h-4" aria-hidden /></button>
                  <button type="button" aria-label="Déplacer le groupe vers la droite" onClick={() => updateBlueprint(moveLayoutSelectionByDelta(blueprint, selection, 3, 0), { message: 'Groupe déplacé →', kind: 'edit' })} className={EDITOR_TOOL_ICON}><ArrowRight className="w-4 h-4" aria-hidden /></button>
                </div>
                <p className={cn(EDITOR_HEADING, 'pt-1')}>Style du groupe</p>
                <label className="flex items-center gap-2 text-xs">
                  <span className="text-muted font-semibold">Couleur</span>
                  <input
                    type="color"
                    value={groupStyleColor}
                    onChange={(e) => setGroupStyleColor(e.target.value)}
                    className="min-h-11 min-w-11 rounded border border-border cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      updateBlueprint(
                        applyStyleToSelection(blueprint, selection, {
                          tableColor: groupStyleColor,
                          color: groupStyleColor,
                        }),
                        { message: 'Style appliqué à la sélection', kind: 'edit' },
                      );
                    }}
                    className={cn(EDITOR_TOOL, EDITOR_TOOL_PRIMARY, 'flex-1')}
                  >
                    Appliquer
                  </button>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateBlueprint(applyStyleToSelection(blueprint, selection, { locked: true }), { message: 'Groupe verrouillé', kind: 'edit' })}
                    className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE, 'flex-1')}
                  >
                    <Lock className="w-3.5 h-3.5" aria-hidden /> Verrouiller
                  </button>
                  <button
                    type="button"
                    onClick={() => updateBlueprint(applyStyleToSelection(blueprint, selection, { locked: false }), { message: 'Groupe déverrouillé', kind: 'edit' })}
                    className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE, 'flex-1')}
                  >
                    <Unlock className="w-3.5 h-3.5" aria-hidden /> Déverrouiller
                  </button>
                </div>
              </div>
            </details>
          </div>
          <LayoutActionPanel actions={actionLog} />
        </div>
      );
    }

    if (!selected) {
      return (
        <div className="space-y-4">
          <PlanCreationPath
            value={planPath}
            busy={aiPlanReading}
            photoLocked={!caps.canPlanFromPhoto}
            onPhotoFile={(file) => {
              void readRoomPlanWithAi(file);
            }}
            onChange={(next) => {
              setPlanPath(next);
              if (next === 'photo') {
                setAccordion('murs-sols');
                setSelection([]);
                window.requestAnimationFrame(() => scrollToElementId('plan-import-ia'));
                return;
              }
              setAccordion('');
              setToolbarGroup('furniture');
              setSelection([]);
            }}
          />
          {!caps.canThemes ? (
            <Alert variant="warning" title={`Forfait ${caps.label}`}>
              <p>{caps.description}</p>
              <Button href="/dashboard/billing" variant="ghost" size="sm" className="mt-2 -ml-3">
                Voir les forfaits
              </Button>
            </Alert>
          ) : (
            <div className="border border-border rounded-[var(--radius-card)] bg-surface overflow-hidden shadow-sm">
              <button
                type="button"
                aria-expanded={accordion === 'murs-sols'}
                aria-controls="editor-panel-murs-sols"
                className={cn("w-full flex items-center justify-between p-3.5 text-left text-sm font-semibold transition-colors", accordion === 'murs-sols' ? 'bg-surface-muted text-foreground' : 'bg-surface text-muted hover:bg-surface-muted/50 hover:text-foreground')}
                onClick={() => setAccordion(accordion === 'murs-sols' ? '' : 'murs-sols')}
              >
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4" aria-hidden /> Environnement & Thèmes
                </span>
                <DiscloseChevron open={accordion === 'murs-sols'} />
              </button>
              
              {accordion === 'murs-sols' && (
                <div id="editor-panel-murs-sols" className="p-4 bg-surface space-y-5 border-t border-border">
                  {caps.canPlanFromPhoto ? (
                    <div
                      id="plan-import-ia"
                      aria-busy={aiPlanReading || undefined}
                      className={cn(
                        'space-y-2 rounded-[var(--radius-card)] border p-3',
                        planPath === 'photo' ? 'border-primary bg-primary/10' : 'border-border bg-surface',
                      )}
                    >
                      <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden />
                        Lire le plan avec l’IA
                      </p>
                      <p className={EDITOR_HINT}>
                        Photo vue du dessus ou scan. Rien n’est inventé (or, portes, pétales).
                      </p>
                      {aiPlanReading ? (
                        <p role="status" aria-live="polite" className="text-sm text-foreground">
                          Lecture du plan en cours…
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={readOnly || aiPlanReading}
                          aria-busy={aiPlanReading || undefined}
                          onClick={() => {
                            if (blueprint.metadata.floorImageUrl) {
                              void readRoomPlanWithAi();
                              return;
                            }
                            aiPlanFileRef.current?.click();
                          }}
                          className={cn(EDITOR_PANEL_BTN, 'bg-primary text-primary-foreground border-primary')}
                        >
                          <Sparkles className="w-3.5 h-3.5" aria-hidden />
                          {aiPlanReading
                            ? 'Lecture en cours…'
                            : blueprint.metadata.floorImageUrl
                              ? 'Lire cette image'
                              : 'Choisir une photo'}
                        </button>
                        {blueprint.metadata.floorImageUrl ? (
                          <button
                            type="button"
                            disabled={readOnly || aiPlanReading}
                            onClick={() => aiPlanFileRef.current?.click()}
                            className={cn(EDITOR_PANEL_BTN, 'bg-surface border-border text-foreground')}
                          >
                            Autre photo
                          </button>
                        ) : null}
                      </div>
                      {aiPlanError ? <Alert variant="error">{aiPlanError}</Alert> : null}
                      {aiPlanWarnings.length > 0 ? (
                        <Alert variant="warning" title="À vérifier">
                          <ul className="list-disc pl-4 space-y-1 text-sm">
                            {aiPlanWarnings.map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        </Alert>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Thème de la salle</p>
                <label className="flex items-center gap-2 min-h-11 text-sm text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={keepThemeFloor}
                    onChange={(e) => setKeepThemeFloor(e.target.checked)}
                    className="rounded border-border size-4"
                  />
                  Conserver le sol actuel en changeant de thème
                </label>
                <div className="space-y-4">
                  {themesByCategory.map(({ category, label, themes }) => (
                    <div key={category} className="space-y-2">
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {themes.map((theme) => (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => applyTheme(theme.id)}
                            className={cn(
                              'text-left min-h-11 py-2.5 px-2.5 rounded-[var(--radius-button)] border text-sm font-medium transition-colors overflow-hidden',
                              blueprint.metadata.roomThemeId === theme.id || (!blueprint.metadata.roomThemeId && theme.id === 'classic')
                                ? 'bg-primary/10 border-primary/50 text-primary ring-1 ring-primary/20'
                                : 'border-border text-muted hover:bg-surface-muted',
                            )}
                          >
                            <span
                              className="block h-8 rounded-[var(--radius-button)] mb-1.5 border border-black/5"
                              style={{
                                background: `${theme.canvasPattern ? `${theme.canvasPattern}, ` : ''}${theme.canvasBackground}`,
                              }}
                            />
                            <span className="flex items-center gap-1.5">
                              <span className="w-3 h-3 rounded-full border shrink-0" style={{ background: theme.accentColor, borderColor: theme.roomOutline.stroke }} />
                              {theme.name}
                              {theme.isCustom && <span className="text-xs text-primary font-normal">perso.</span>}
                            </span>
                            <span className="font-normal text-muted block mt-0.5 line-clamp-1">{theme.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {caps.canCustomTheme ? (
                  <CustomRoomThemePanel
                    blueprint={blueprint}
                    onChange={(next) => updateBlueprint(next)}
                    onApplyTheme={(id) => applyTheme(id as RoomThemeId)}
                    activeThemeId={blueprint.metadata.roomThemeId}
                  />
                ) : null}
                  </div>
                  <div className="space-y-3 pt-4 border-t border-border/50">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Ambiances complètes
                    </p>
                    <p className="text-sm text-muted leading-snug">
                      Applique murs, sol, thème et style de chaises / tables en un clic.
                    </p>
                    <Input
                      type="search"
                      label="Rechercher une ambiance"
                      value={ambiencePresetQuery}
                      onChange={(e) => setAmbiencePresetQuery(e.target.value)}
                      placeholder="Mariage, industriel…"
                      leftIcon={<Search className="w-4 h-4" />}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-0.5">
                      {filteredAmbiencePresets.map((preset) => (
                        <RoomAmbienceCard
                          key={preset.id}
                          preset={preset}
                          active={activeAmbienceId === preset.id}
                          onClick={() => applyAmbience(preset)}
                          onPreview={() => setAmbiencePreviewPreset(preset)}
                        />
                      ))}
                      {filteredAmbiencePresets.length === 0 ? (
                        <p className="text-sm text-muted col-span-full py-2">Aucun preset ne correspond à votre recherche.</p>
                      ) : null}
                    </div>
                    <div className="rounded-[var(--radius-button)] border border-dashed border-border p-2.5 space-y-2">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                        <BookmarkPlus className="w-3.5 h-3.5" /> Mes ambiances
                      </p>
                      <div className="flex gap-1.5 flex-wrap items-end">
                        <div className="flex-1 min-w-[10rem]">
                          <Input
                            label="Nom de l’ambiance"
                            value={customAmbienceName}
                            onChange={(e) => setCustomAmbienceName(e.target.value)}
                            placeholder="Nom de l’ambiance…"
                            maxLength={48}
                          />
                        </div>
                        <button
                          type="button"
                          disabled={!customAmbienceName.trim()}
                          onClick={() => {
                            const trimmed = customAmbienceName.trim();
                            if (!trimmed) return;
                            const next = saveCustomAmbienceToBlueprint(blueprint, trimmed);
                            updateBlueprint(next, { message: `Ambiance enregistrée : ${trimmed}`, kind: 'settings' });
                            setCustomAmbienceName('');
                          }}
                          className={cn(EDITOR_PANEL_BTN, 'border-primary/30 bg-primary/5 text-primary')}
                        >
                          Enregistrer
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadAmbienceExport(blueprint.metadata.customAmbiences ?? [], 'ambiances-salle.json')}
                          disabled={(blueprint.metadata.customAmbiences?.length ?? 0) === 0}
                          className={cn(EDITOR_PANEL_BTN, 'border-border text-muted')}
                        >
                          <Download className="w-3.5 h-3.5" /> Export
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAmbienceImportTarget('room');
                            ambienceImportRef.current?.click();
                          }}
                          className={cn(EDITOR_PANEL_BTN, 'border-border text-muted')}
                        >
                          <Upload className="w-3.5 h-3.5" /> Import
                        </button>
                      </div>
                      {(blueprint.metadata.customAmbiences?.length ?? 0) > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-0.5">
                          {blueprint.metadata.customAmbiences!.map((saved) => (
                            <div key={saved.id} className="min-w-0 space-y-1.5">
                              <RoomAmbienceCard
                                preset={saved.preset}
                                active={activeAmbienceId === saved.id}
                                onClick={() => applyAmbience(saved.preset)}
                                onPreview={() => setAmbiencePreviewPreset(saved.preset)}
                              />
                              <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Actions pour ${saved.name}`}>
                              {tenant?.id ? (
                                <button
                                  type="button"
                                  title="Publier pour l’équipe"
                                  aria-label="Publier pour l’équipe"
                                  onClick={() => {
                                    void publishOrgAmbience(saved).then((row) => {
                                      if (!row) return;
                                      setOrgAmbiences((prev) => [row, ...prev.filter((item) => item.id !== row.id)]);
                                      updateBlueprint(blueprint, { message: `Publié pour l’équipe : ${saved.name}`, kind: 'settings' });
                                    });
                                  }}
                                  className={EDITOR_CARD_ACTION}
                                >
                                  <Building2 className="w-3.5 h-3.5" aria-hidden />
                                </button>
                              ) : null}
                              <button
                                type="button"
                                title="Copier le lien de partage"
                                aria-label="Copier le lien de partage"
                                onClick={() => {
                                  void copyAmbienceShareLink(saved).then((ok) => {
                                    updateBlueprint(blueprint, {
                                      message: ok ? `Lien copié : ${saved.name}` : 'Impossible de copier le lien',
                                      kind: 'settings',
                                    });
                                  });
                                }}
                                className={EDITOR_CARD_ACTION}
                              >
                                <Link2 className="w-3.5 h-3.5" aria-hidden />
                              </button>
                              <button
                                type="button"
                                title="Ajouter à la bibliothèque globale"
                                aria-label="Ajouter à la bibliothèque globale"
                                onClick={() => {
                                  setAmbienceLibrary(addAmbienceToLibrary(saved));
                                }}
                                className={EDITOR_CARD_ACTION}
                              >
                                <BookmarkPlus className="w-3.5 h-3.5" aria-hidden />
                              </button>
                              <button
                                type="button"
                                title="Supprimer"
                                aria-label={`Supprimer ${saved.name}`}
                                onClick={() => {
                                  const next = deleteCustomAmbienceFromBlueprint(blueprint, saved.id);
                                  updateBlueprint(next, { message: `Ambiance supprimée : ${saved.name}`, kind: 'settings' });
                                }}
                                className={cn(EDITOR_CARD_ACTION, 'hover:text-rose-700')}
                              >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden />
                              </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={EDITOR_HINT}>Enregistrez la configuration actuelle (murs, sol, chaises, éclairage).</p>
                      )}
                    </div>
                    <div className="rounded-[var(--radius-button)] border border-border bg-surface-muted/40 p-2.5 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={EDITOR_HEADING}>
                          <Layers className="w-3.5 h-3.5" /> Bibliothèque globale
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            void captureAmbienceForLibrary(customAmbienceName);
                            if (!customAmbienceName.trim()) setCustomAmbienceName('');
                          }}
                          className={cn(EDITOR_PANEL_BTN, 'border-primary/30 bg-primary/5 text-primary')}
                        >
                          <Copy className="w-3 h-3" /> Capturer la salle
                        </button>
                        {user ? (
                          <button
                            type="button"
                            disabled={ambienceCloudSyncing}
                            onClick={() => void syncCloudLibrary()}
                            className={cn(EDITOR_PANEL_BTN, 'border-border text-muted')}
                          >
                            <Cloud className={`w-3 h-3 ${ambienceCloudSyncing ? 'animate-pulse' : ''}`} />
                            {ambienceCloudSyncing ? 'Sync…' : 'Sync cloud'}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => downloadAmbienceExport(ambienceLibrary)}
                          disabled={ambienceLibrary.length === 0}
                          className={cn(EDITOR_PANEL_BTN, 'border-border text-muted')}
                        >
                          <Download className="w-3 h-3" /> Export
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAmbienceImportTarget('library');
                            ambienceImportRef.current?.click();
                          }}
                          className={cn(EDITOR_PANEL_BTN, 'border-border text-muted')}
                        >
                          <Upload className="w-3 h-3" /> Import
                        </button>
                      </div>
                      <p className={EDITOR_HINT}>
                        {user
                          ? 'Synchronisée avec votre compte et disponible sur tous vos appareils.'
                          : 'Stockage local navigateur — connectez-vous pour la sync cloud.'}
                      </p>
                      {ambienceLibrary.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-0.5">
                          {ambienceLibrary.map((saved) => (
                            <div key={saved.id} className="min-w-0 space-y-1.5">
                              <RoomAmbienceCard
                                preset={saved.preset}
                                active={activeAmbienceId === saved.id}
                                onClick={() => applyAmbience(saved.preset)}
                                onPreview={() => setAmbiencePreviewPreset(saved.preset)}
                              />
                              <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Actions pour ${saved.name}`}>
                              <button
                                type="button"
                                title="Copier le lien de partage"
                                aria-label="Copier le lien de partage"
                                onClick={() => {
                                  void copyAmbienceShareLink(saved).then((ok) => {
                                    updateBlueprint(blueprint, {
                                      message: ok ? `Lien copié : ${saved.name}` : 'Impossible de copier le lien',
                                      kind: 'settings',
                                    });
                                  });
                                }}
                                className={EDITOR_CARD_ACTION}
                              >
                                <Link2 className="w-3.5 h-3.5" aria-hidden />
                              </button>
                              <button
                                type="button"
                                title="Importer dans cette salle"
                                aria-label="Importer dans cette salle"
                                onClick={() => {
                                  const next = importCustomAmbiencesToBlueprint(blueprint, [saved], 'merge');
                                  updateBlueprint(next, { message: `Ambiance ajoutée à la salle : ${saved.name}`, kind: 'settings' });
                                }}
                                className={EDITOR_CARD_ACTION}
                              >
                                <Plus className="w-3.5 h-3.5" aria-hidden />
                              </button>
                              <button
                                type="button"
                                title="Supprimer de la bibliothèque"
                                aria-label={`Supprimer ${saved.name} de la bibliothèque`}
                                onClick={() => {
                                  void (async () => {
                                    if (isCloudAmbienceId(saved.id)) {
                                      try { await deleteCloudAmbience(saved.id); } catch { /* ignore */ }
                                    }
                                    setAmbienceLibrary(removeAmbienceFromLibrary(saved.id));
                                  })();
                                }}
                                className={cn(EDITOR_CARD_ACTION, 'hover:text-rose-700')}
                              >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden />
                              </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={EDITOR_HINT}>Aucune ambiance globale pour l’instant.</p>
                      )}
                      <input
                        ref={ambienceImportRef}
                        type="file"
                        accept="application/json,.json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (file) void handleAmbienceFileImport(file);
                        }}
                      />
                    </div>
                    {tenant?.id ? (
                      <div className="rounded-[var(--radius-button)] border border-border bg-surface-muted/40 p-2.5 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> Bibliothèque organisation
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const name = customAmbienceName.trim() || 'Ambiance équipe';
                              const preset = captureRoomAmbienceFromBlueprint(blueprint, `org-${Date.now().toString(36)}`, name);
                              void publishBlueprintAmbienceToOrg(name, preset).then((row) => {
                                if (!row) return;
                                setOrgAmbiences((prev) => [row, ...prev.filter((item) => item.id !== row.id)]);
                                updateBlueprint(blueprint, { message: `Ambiance publiée pour l’équipe : ${name}`, kind: 'settings' });
                                if (!customAmbienceName.trim()) setCustomAmbienceName('');
                              });
                            }}
                            className={cn(EDITOR_PANEL_BTN, 'border-primary/30 bg-surface text-primary')}
                          >
                            <Building2 className="w-3 h-3" /> Publier pour l’équipe
                          </button>
                        </div>
                        <p className={EDITOR_HINT}>
                          Partagée avec tous les membres de votre organisation.
                        </p>
                        {orgAmbiences.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-0.5">
                            {orgAmbiences.map((saved) => (
                              <div key={saved.id} className="min-w-0 space-y-1.5">
                                <RoomAmbienceCard
                                  preset={saved.preset}
                                  active={activeAmbienceId === saved.id}
                                  authorName={saved.authorName}
                                  onClick={() => applyAmbience(saved.preset)}
                                  onPreview={() => setAmbiencePreviewPreset(saved.preset)}
                                />
                                <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Actions pour ${saved.name}`}>
                                <button
                                  type="button"
                                  title="Supprimer (équipe)"
                                  aria-label={`Supprimer ${saved.name} (équipe)`}
                                  onClick={() => {
                                    void deleteOrgAmbience(saved.id)
                                      .then(() => setOrgAmbiences((prev) => prev.filter((item) => item.id !== saved.id)))
                                      .catch(() => updateBlueprint(blueprint, { message: 'Suppression non autorisée', kind: 'settings' }));
                                  }}
                                  className={cn(EDITOR_CARD_ACTION, 'hover:text-rose-700')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" aria-hidden />
                                </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className={EDITOR_HINT}>Aucune ambiance partagée par l’équipe.</p>
                        )}
                      </div>
                    ) : null}
                    {(blueprint.metadata.ambienceHistory?.length ?? 0) > 0 ? (
                      <div className="rounded-[var(--radius-button)] border border-border/70 p-2.5 space-y-2">
                        <p className={EDITOR_HEADING}>
                          <History className="w-3.5 h-3.5" /> Historique récent
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {blueprint.metadata.ambienceHistory!.map((entry) => (
                            <button
                              key={entry.id}
                              type="button"
                              disabled={!entry.preset}
                              onClick={() => entry.preset && applyAmbience(entry.preset)}
                              className={cn(EDITOR_CHIP, 'border-border bg-surface text-foreground hover:border-primary/40 disabled:opacity-40')}
                              title={new Date(entry.appliedAt).toLocaleString('fr-FR')}
                            >
                              {entry.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-3 pt-4 border-t border-border/50">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> Sol de la salle</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FLOOR_TYPE_PICKER_ORDER.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFloorType(type)}
                      className={cn(
                        'min-h-11 py-2.5 px-2.5 rounded-[var(--radius-button)] border text-sm font-medium transition-colors overflow-hidden',
                        effectiveFloorType === type && !blueprint.metadata.floorImageUrl
                          ? 'bg-primary/10 border-primary/50 text-primary ring-1 ring-primary/20'
                          : 'border-border text-muted hover:bg-surface-muted',
                      )}
                    >
                      <span
                        className="block h-10 rounded mb-1 border border-black/10 shadow-inner"
                        style={resolveFloorStyle(type, undefined, activeTheme.accentColor)}
                      />
                      {floorTypeLabels[type]}
                    </button>
                  ))}
                </div>
                <div className="space-y-2 pt-2">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1"><Palette className="w-3.5 h-3.5" /> Teinte / couleur du sol</p>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {['#ffffff', '#f5f0e8', '#e8d5a3', '#d4a574', '#a16207', '#78716c', '#1e3a5f', '#166534', '#7f1d1d', '#312e81'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        title={c}
                        onClick={() => updateBlueprint({
                          ...blueprint,
                          metadata: { ...blueprint.metadata, floorColor: c === '#ffffff' ? undefined : c },
                        }, { message: 'Teinte de sol', kind: 'settings' })}
                        className={`min-h-11 min-w-11 rounded-full border-2 shrink-0 ${(blueprint.metadata.floorColor ?? '#ffffff') === c ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}
                        style={{ background: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={blueprint.metadata.floorColor ?? '#f5f0e8'}
                      onChange={(e) => updateBlueprint({
                        ...blueprint,
                        metadata: { ...blueprint.metadata, floorColor: e.target.value },
                      }, { message: 'Couleur de sol personnalisée', kind: 'settings' })}
                      className="min-h-11 min-w-11 rounded-[var(--radius-button)] border border-border cursor-pointer"
                    />
                  </div>
                </div>
                <div className="space-y-2 pt-3 border-t border-border/50">
                  <p className={EDITOR_HEADING}><BrickWall className="w-3 h-3" /> Peinture murs (globale)</p>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {['#e8e4df', '#f8fafc', '#d6d3d1', '#b4533c', '#8b6914', '#78716c', '#1e3a5f', '#fef3c7'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => updateBlueprint({
                          ...blueprint,
                          metadata: { ...blueprint.metadata, wallPaintColor: c },
                          walls: (blueprint.walls ?? []).map((w) => ({ ...w, color: c })),
                        }, { message: 'Peinture des murs', kind: 'settings' })}
                        className={`min-h-11 min-w-11 rounded-full border-2 ${(blueprint.metadata.wallPaintColor ?? '') === c ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}
                        style={{ background: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={blueprint.metadata.wallPaintColor ?? '#e8e4df'}
                      onChange={(e) => updateBlueprint({
                        ...blueprint,
                        metadata: { ...blueprint.metadata, wallPaintColor: e.target.value },
                        walls: (blueprint.walls ?? []).map((w) => ({ ...w, color: e.target.value })),
                      }, { message: 'Couleur mur personnalisée', kind: 'settings' })}
                      className="min-h-11 min-w-11 rounded-[var(--radius-button)] border border-border cursor-pointer"
                    />
                  </div>
                </div>
                <div className="space-y-3 pt-3 border-t border-border/50">
                  <div>
                    <p className={EDITOR_HEADING}>Toit & éclairage</p>
                    <p className={EDITOR_HINT}>Plafond visible + style de lustres.</p>
                  </div>
                  <label className="flex items-center gap-2 min-h-11 text-sm font-semibold text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={blueprint.metadata.showRoof === true}
                      onChange={(e) => updateBlueprint({
                        ...blueprint,
                        metadata: { ...blueprint.metadata, showRoof: e.target.checked },
                      }, { message: e.target.checked ? 'Toit affiché' : 'Toit masqué', kind: 'settings' })}
                      className="rounded border-border size-4"
                    />
                    Afficher le toit / plafond
                  </label>
                  {blueprint.metadata.showRoof && (
                    <div className="grid grid-cols-2 gap-3 pl-1">
                      <label className="block space-y-1.5 col-span-2">
                        <span className="text-xs font-semibold text-foreground">Style de toit</span>
                        <select
                          value={blueprint.metadata.roofStyle ?? 'flat'}
                          onChange={(e) => updateBlueprint({
                            ...blueprint,
                            metadata: { ...blueprint.metadata, roofStyle: e.target.value as RoofStyle },
                          }, { message: `Toit : ${roofStyleLabels[e.target.value as RoofStyle]}`, kind: 'settings' })}
                          className={EDITOR_FIELD}
                        >
                          {(Object.keys(roofStyleLabels) as RoofStyle[]).map((style) => (
                            <option key={style} value={style}>{roofStyleLabels[style]}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-xs font-semibold text-foreground">Couleur plafond</span>
                        <input
                          type="color"
                          value={blueprint.metadata.roofColor ?? '#d6d3d1'}
                          onChange={(e) => updateBlueprint({
                            ...blueprint,
                            metadata: { ...blueprint.metadata, roofColor: e.target.value },
                          }, { message: 'Couleur du toit', kind: 'settings' })}
                          className="w-full min-h-11 rounded-[var(--radius-button)] border border-border cursor-pointer"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-xs font-semibold text-foreground">Opacité {(Math.round((blueprint.metadata.roofOpacity ?? 0.45) * 100))}%</span>
                        <input
                          type="range"
                          min={0.15}
                          max={0.95}
                          step={0.05}
                          value={blueprint.metadata.roofOpacity ?? 0.45}
                          onChange={(e) => updateBlueprint({
                            ...blueprint,
                            metadata: { ...blueprint.metadata, roofOpacity: parseFloat(e.target.value) },
                          })}
                          className="w-full accent-primary"
                        />
                      </label>
                    </div>
                  )}

                  <div className="space-y-2 rounded-[var(--radius-button)] border border-border bg-surface-muted/40 p-2.5">
                    <label className="flex items-center gap-2 min-h-11 text-sm font-semibold text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={blueprint.metadata.showChandeliers === true}
                        onChange={(e) => updateBlueprint({
                          ...blueprint,
                          metadata: {
                            ...blueprint.metadata,
                            showChandeliers: e.target.checked,
                            ...(e.target.checked && !blueprint.metadata.showRoof ? { showRoof: true } : {}),
                          },
                        }, { message: e.target.checked ? 'Lustres activés' : 'Lustres masqués', kind: 'settings' })}
                        className="rounded border-border size-4"
                      />
                      Lustres au plafond
                    </label>
                    {blueprint.metadata.showChandeliers === true ? (
                      <div className="space-y-2">
                        <p className={EDITOR_HEADING}>Type de lustre</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {CHANDELIER_TYPE_ORDER.map((type) => {
                            const active = resolveChandelierType(blueprint.metadata.chandelierType) === type;
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => updateBlueprint({
                                  ...blueprint,
                                  metadata: {
                                    ...blueprint.metadata,
                                    showChandeliers: true,
                                    chandelierType: type,
                                    showRoof: blueprint.metadata.showRoof ?? true,
                                  },
                                }, { message: `Lustre : ${chandelierTypeLabels[type]}`, kind: 'settings' })}
                                className={cn(
                                  'text-left min-h-11 px-3 py-2.5 rounded-[var(--radius-button)] border text-sm font-medium transition-colors',
                                  active
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border bg-surface text-muted hover:bg-surface-muted',
                                )}
                              >
                                <span className="block font-semibold">{chandelierTypeLabels[type]}</span>
                                <span className="block text-xs opacity-80 font-normal mt-0.5">{chandelierTypeHints[type]}</span>
                              </button>
                            );
                          })}
                        </div>
                        <label className="block space-y-1.5">
                          <span className="text-xs font-semibold text-foreground">
                            Nombre : {resolveChandelierCount(blueprint.metadata.chandelierCount, 5)}
                          </span>
                          <input
                            type="range"
                            min={1}
                            max={5}
                            step={1}
                            value={resolveChandelierCount(blueprint.metadata.chandelierCount, 5)}
                            onChange={(e) => updateBlueprint({
                              ...blueprint,
                              metadata: {
                                ...blueprint.metadata,
                                chandelierCount: parseInt(e.target.value, 10) || 3,
                              },
                            }, { message: 'Nombre de lustres', kind: 'settings' })}
                            className="w-full accent-primary"
                          />
                        </label>
                      </div>
                    ) : (
                      <p className={EDITOR_HINT}>Activez pour choisir le style (classique, cristal, moderne…).</p>
                    )}
                  </div>

                  <details className="group rounded-[var(--radius-button)] border border-border bg-surface-muted/30 px-2.5 py-2">
                    <summary className="text-sm font-semibold text-foreground cursor-pointer select-none min-h-11 flex items-center justify-between gap-2 list-none [&::-webkit-details-marker]:hidden">
                      Autre décor (uplights, rideaux…)
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    <div className="mt-2 space-y-1.5">
                      {([
                        ['showUplights', 'Uplights muraux'],
                        ['showCurtains', 'Rideaux'],
                        ['showDecorPlants', 'Plantes d’angle'],
                      ] as const).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2 min-h-11 text-sm font-medium text-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={blueprint.metadata[key] === true}
                            onChange={(e) => updateBlueprint({
                              ...blueprint,
                              metadata: { ...blueprint.metadata, [key]: e.target.checked },
                            }, { message: e.target.checked ? `${label} activés` : `${label} masqués`, kind: 'settings' })}
                            className="rounded border-border size-4"
                          />
                          {label}
                        </label>
                      ))}
                      {blueprint.metadata.showCurtains === true ? (
                        <label className="flex items-center gap-2 min-h-11 text-sm font-medium text-foreground">
                          <span className="shrink-0">Teinte</span>
                          <input
                            type="color"
                            value={blueprint.metadata.curtainColor ?? '#7f1d1d'}
                            onChange={(e) => updateBlueprint({
                              ...blueprint,
                              metadata: { ...blueprint.metadata, curtainColor: e.target.value },
                            }, { message: 'Couleur des rideaux', kind: 'settings' })}
                            aria-label="Couleur des rideaux"
                            className="w-14 min-h-11 rounded-[var(--radius-button)] border border-border cursor-pointer"
                          />
                        </label>
                      ) : null}
                    </div>
                  </details>
                </div>
                {caps.canCustomImages ? (
                  <div className="space-y-3">
                    <label className="block text-xs space-y-1">
                      <span className="font-semibold text-muted flex items-center gap-1">
                        <ImagePlus className="w-3.5 h-3.5" /> Importer un plan de salle (image)
                      </span>
                      <p className={EDITOR_HINT}>
                        Photo ou scan du plan : affiché en entier sous le mobilier (repère pour placer tables &amp; allées).
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        className={EDITOR_FILE}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) await importRoomPlanImage(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <label className="block text-xs space-y-1">
                      <span className="font-semibold text-muted flex items-center gap-1">
                        <ImagePlus className="w-3.5 h-3.5" /> Texture de sol (mosaïque)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className={EDITOR_FILE}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) await setFloorImage(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {blueprint.metadata.floorImageUrl && (
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-sm font-medium text-primary">
                          {blueprint.metadata.floorImageFit === 'cover' ? 'Plan importé' : 'Texture tuilée'}
                        </span>
                        <button
                          type="button"
                          className={EDITOR_REMOVE}
                          onClick={() => updateBlueprint({
                            ...blueprint,
                            metadata: {
                              ...blueprint.metadata,
                              floorImageUrl: undefined,
                              floorImageFit: undefined,
                              floorType: activeTheme.defaultFloorType,
                            },
                          }, { message: 'Image de plan / sol retirée', kind: 'settings' })}
                        >
                          Retirer l&apos;image
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Accordion bâtiment */}
          <div className="border border-border rounded-[var(--radius-card)] bg-surface overflow-hidden shadow-sm">
            <button
              type="button"
              aria-expanded={accordion === 'batiment'}
              aria-controls="editor-panel-batiment"
              className={cn("w-full flex items-center justify-between p-3.5 text-left text-sm font-semibold transition-colors", accordion === 'batiment' ? 'bg-surface-muted text-foreground' : 'bg-surface text-muted hover:bg-surface-muted/50 hover:text-foreground')}
              onClick={() => setAccordion(accordion === 'batiment' ? '' : 'batiment')}
            >
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4" aria-hidden /> Étages & vues
              </span>
              <DiscloseChevron open={accordion === 'batiment'} />
            </button>
            {accordion === 'batiment' && (
              <div id="editor-panel-batiment" className="p-4 bg-surface space-y-4 border-t border-border">
                <div className="space-y-2">
                  <p className={EDITOR_HEADING}>Modèle prêt à l’emploi</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {BUILDING_STORY_PRESETS.map((preset) => {
                      const active = resolveBuildingPresetId(blueprint) === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            updateBlueprint(
                              applyBuildingStoryPreset(blueprint, preset.id),
                              { message: `Structure « ${preset.label} » appliquée`, kind: 'settings' },
                            );
                            setSelection([]);
                          }}
                          className={cn(
                            'text-left min-h-11 px-3 py-2.5 rounded-[var(--radius-button)] border text-sm',
                            active
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted hover:bg-surface-muted',
                          )}
                        >
                          <span className="font-bold block">{preset.label}</span>
                          <span className="opacity-80">{preset.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[var(--radius-button)] border border-primary/20 bg-primary/5 px-3 py-2 space-y-1">
                  <p className="text-sm font-semibold text-foreground">En 3 gestes</p>
                  <ol className="text-sm text-muted leading-relaxed list-decimal pl-3.5 space-y-0.5">
                    <li>Choisissez un modèle (ci-dessus) ou créez les étages</li>
                    <li>Ajustez escaliers / balcons si besoin</li>
                    <li>Activez « Empiler » pour voir le bâtiment</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <p className={EDITOR_HEADING}>Étages</p>
                  <div className="flex flex-wrap gap-1.5">
                    {resolveStories(blueprint).map((story) => (
                      <div
                        key={story.id}
                        className={cn(
                          'inline-flex items-center rounded-[var(--radius-button)] border text-sm font-medium overflow-hidden',
                          resolveActiveStoryId(blueprint) === story.id && !blueprint.metadata.stackView
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-border text-muted',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            updateBlueprint(
                              setStackView(setActiveStory(blueprint, story.id), false),
                              {
                                message: `Édition : ${story.label}`,
                                kind: 'settings',
                              },
                            );
                            setSelection([]);
                          }}
                          className="min-h-11 px-3 hover:bg-surface-muted"
                        >
                          {story.label}
                        </button>
                        {resolveStories(blueprint).length > 1 ? (
                          <button
                            type="button"
                            title={`Supprimer ${story.label}`}
                            onClick={() => removeActiveOrStory(story.id)}
                            className={cn(EDITOR_TOOL_ICON, 'border-l-0 rounded-l-none')}
                            aria-label={`Supprimer ${story.label}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden />
                          </button>
                        ) : null}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const next = addStory(blueprint);
                        updateBlueprint(setStackView(next, true), {
                          message: 'Nouvel étage — vue empilée',
                          kind: 'add',
                        });
                        setSelection([]);
                      }}
                      className={cn(EDITOR_TOOL, EDITOR_TOOL_MUTED, 'border-dashed')}
                    >
                      + Étage
                    </button>
                  </div>
                  <p className={EDITOR_HINT}>
                    Vous éditez : <span className="font-semibold text-foreground">{resolveStories(blueprint).find((s) => s.id === resolveActiveStoryId(blueprint))?.label ?? 'RDC'}</span>
                    {' '}— supprimer un étage retire aussi son mobilier.
                  </p>
                </div>

                {caps.fixtureKinds.includes('stairs') ? (
                  <div className="space-y-2">
                    <p className={EDITOR_HEADING}>Escalier vers…</p>
                    {resolveStories(blueprint).length < 2 ? (
                      <p className={EDITOR_HINT}>Ajoutez un 2ᵉ étage (ou un modèle Duplex) pour créer un escalier.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {resolveStories(blueprint)
                          .filter((s) => s.id !== resolveActiveStoryId(blueprint))
                          .map((story) => (
                            <button
                              key={story.id}
                              type="button"
                              onClick={() => addStairsToStory(story.id)}
                              className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}
                            >
                              <StepForward className="w-3 h-3" />
                              Vers {story.label}
                            </button>
                          ))}
                      </div>
                    )}
                    <StairsUserGuide compact defaultOpen={false} />
                  </div>
                ) : null}

                {caps.fixtureKinds.includes('balcony') ? (
                  <div className="space-y-2">
                    <p className={EDITOR_HEADING}>Balcons</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(Object.keys(balconySideLabels) as BalconySide[]).map((side) => (
                        <button
                          key={side}
                          type="button"
                          onClick={() => addBalconyOnSide(side)}
                          className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}
                        >
                          + {balconySideLabels[side]}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addAllFacadesBalconies}
                      className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE, 'w-full')}
                    >
                      Ajouter les 4 façades
                    </button>
                    <p className={EDITOR_HINT}>Les balcons se placent sur l’étage actif. Déplacez-les ensuite sur le plan.</p>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <p className={EDITOR_HEADING}>Vue</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        updateBlueprint(setStackView(blueprint, false), {
                          message: 'Vue étage unique',
                          kind: 'settings',
                        });
                      }}
                      className={cn(
                        EDITOR_PANEL_BTN,
                        !blueprint.metadata.stackView
                          ? 'bg-primary/10 border-primary/40 text-primary'
                          : 'border-border text-muted hover:bg-surface-muted',
                      )}
                    >
                      Éditer un étage
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (resolveStories(blueprint).length < 2) {
                          const next = addStory(blueprint);
                          updateBlueprint(setStackView(next, true), {
                            message: 'Étage ajouté — vue empilée',
                            kind: 'add',
                          });
                          return;
                        }
                        updateBlueprint(setStackView(blueprint, true), {
                          message: 'Étages empilés affichés',
                          kind: 'settings',
                        });
                      }}
                      className={cn(
                        EDITOR_PANEL_BTN,
                        blueprint.metadata.stackView
                          ? 'bg-primary/10 border-primary/40 text-primary'
                          : 'border-border text-muted hover:bg-surface-muted',
                      )}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Empiler les étages
                    </button>
                  </div>
                  <p className={EDITOR_HINT}>
                    {blueprint.metadata.stackView
                      ? 'Tous les niveaux sont empilés en 3D (RDC en bas, étages au-dessus). Tournez la caméra pour voir la coupe.'
                      : 'Seul l’étage actif est affiché — idéal pour placer tables et murs.'}
                  </p>
                </div>

                <details className="group rounded-[var(--radius-button)] border border-border bg-surface-muted/40 px-3 py-2">
                  <summary className="text-sm font-semibold text-foreground cursor-pointer select-none min-h-11 flex items-center justify-between gap-2 list-none [&::-webkit-details-marker]:hidden">
                    Options avancées (fondation, couloirs)
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <p className={EDITOR_HEADING}>Fondation</p>
                      <select
                        value={resolveFoundation(blueprint).kind}
                        onChange={(e) => {
                          const kind = e.target.value as FoundationKind;
                          updateBlueprint(
                            updateFoundation(blueprint, {
                              kind,
                              heightM: kind === 'none' ? 0 : kind === 'basement' ? 2.4 : kind === 'crawlspace' ? 0.9 : 0.35,
                            }),
                            { message: `Fondation : ${foundationKindLabels[kind]}`, kind: 'settings' },
                          );
                        }}
                        className={EDITOR_FIELD}
                      >
                        {(Object.keys(foundationKindLabels) as FoundationKind[]).map((k) => (
                          <option key={k} value={k}>{foundationKindLabels[k]}</option>
                        ))}
                      </select>
                      {resolveFoundation(blueprint).kind !== 'none' ? (
                        <label className="block space-y-1.5">
                          <span className="text-xs font-semibold text-foreground">Hauteur (m)</span>
                          <input
                            type="number"
                            min={0.1}
                            max={4}
                            step={0.05}
                            value={resolveFoundation(blueprint).heightM}
                            onChange={(e) => updateBlueprint(
                              updateFoundation(blueprint, { heightM: parseFloat(e.target.value) || 0.35 }),
                              { message: 'Hauteur fondation mise à jour', kind: 'settings' },
                            )}
                            className={EDITOR_FIELD}
                          />
                        </label>
                      ) : null}
                    </div>
                    {caps.fixtureKinds.includes('corridor') ? (
                      <div className="space-y-2">
                        <p className={EDITOR_HEADING}>Couloir</p>
                        <button
                          type="button"
                          onClick={addCorridor}
                          className={cn(EDITOR_PANEL_BTN, 'w-full border-border text-muted hover:bg-surface-muted')}
                        >
                          + Couloir sur l’étage actif
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const { blueprint: next, added } = punchCorridorOpenings(blueprint);
                            updateBlueprint(next, {
                              message: added > 0 ? `${added} ouverture(s) dans les murs` : 'Aucune ouverture ajoutée',
                              kind: 'edit',
                            });
                          }}
                          className={cn(EDITOR_PANEL_BTN, 'w-full border-dashed border-border text-muted hover:bg-surface-muted')}
                        >
                          Percer les portes (couloirs → murs)
                        </button>
                      </div>
                    ) : null}
                  </div>
                </details>
              </div>
            )}
          </div>
          <div className="border border-border rounded-[var(--radius-card)] bg-surface overflow-hidden shadow-sm">
            <button
              type="button"
              aria-expanded={accordion === 'outils'}
              aria-controls="editor-panel-outils"
              className={cn("w-full flex items-center justify-between p-3.5 text-left text-sm font-semibold transition-colors", accordion === 'outils' ? 'bg-surface-muted text-foreground' : 'bg-surface text-muted hover:bg-surface-muted/50 hover:text-foreground')}
              onClick={() => setAccordion(accordion === 'outils' ? '' : 'outils')}
            >
              <span className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" aria-hidden /> Agencement automatique
              </span>
              <DiscloseChevron open={accordion === 'outils'} />
            </button>
            
            {accordion === 'outils' && (
              <div id="editor-panel-outils" className="p-4 bg-surface space-y-4 border-t border-border">
                <p className="text-sm text-muted leading-relaxed">
                  Répartit les tables déverrouillées dans la salle, en évitant la scène.
                </p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(arrangeDensityLabels) as ArrangeDensity[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setArrangeDensity(id)}
                  className={cn(
                    EDITOR_CHIP,
                    arrangeDensity === id
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'border-border text-muted hover:bg-surface-muted',
                  )}
                >
                  {arrangeDensityLabels[id]}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['grid', LayoutGrid, tableArrangeLabels.grid],
                ['banquet', Columns2, tableArrangeLabels.banquet],
                ['ushape', BoxSelect, tableArrangeLabels.ushape],
                ['circle', Circle, tableArrangeLabels.circle],
              ] as Array<[TableArrangePreset, typeof LayoutGrid, string]>).map(([id, Icon, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => applyArrange(id)}
                  className={cn(EDITOR_PANEL_BTN, 'border-border text-muted hover:bg-surface-muted hover:text-foreground')}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between gap-2 min-h-11 text-sm font-semibold text-foreground">
                <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" aria-hidden /> Perspective 3D</span>
                <span className="tabular-nums text-muted">{depthAmount}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={depthAmount}
                onChange={(e) => setDepthAmount(Number(e.target.value))}
                aria-label="Perspective 3D"
                className="w-full accent-primary"
              />
              <p className={EDITOR_HINT}>
                0 = vue du dessus · 100 = vue 3D en perspective immersive.
              </p>
            </div>
            </div>
          )}
          </div>

          {/* Accordion murs */}
          <div className="border border-border rounded-[var(--radius-card)] bg-surface overflow-hidden shadow-sm">
            <button
              type="button"
              aria-expanded={accordion === 'murs'}
              aria-controls="editor-panel-murs"
              className={cn("w-full flex items-center justify-between p-3.5 text-left text-sm font-semibold transition-colors", accordion === 'murs' ? 'bg-surface-muted text-foreground' : 'bg-surface text-muted hover:bg-surface-muted/50 hover:text-foreground')}
              onClick={() => {
                const next = accordion === 'murs' ? '' : 'murs';
                setAccordion(next);
                setWallEditMode(next === 'murs');
              }}
            >
              <span className="flex items-center gap-2">
                <BrickWall className="w-4 h-4" aria-hidden /> Murs, portes & fenêtres
              </span>
              <DiscloseChevron open={accordion === 'murs'} />
            </button>
            {accordion === 'murs' && (
              <div id="editor-panel-murs" className="p-4 bg-surface space-y-3 border-t border-border">
                <p className={EDITOR_HINT}>
                  Configurez la hauteur, l&apos;épaisseur, la texture des murs et le style des ouvertures. Cliquez un mur dans la vue 3D pour le sélectionner.
                </p>
                <label className="flex items-center gap-2 min-h-11 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wallEditMode}
                    onChange={(e) => setWallEditMode(e.target.checked)}
                    className="rounded border-border size-4"
                  />
                  Mode édition murs (orbit désactivé)
                </label>
                <label className="flex items-center gap-2 min-h-11 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lockOrbit}
                    onChange={(e) => setLockOrbit(e.target.checked)}
                    className="rounded border-border size-4"
                  />
                  Bloquer la perspective pour déplacer (Ctrl+L)
                </label>
                <RoomWallEditorPanel
                  blueprint={blueprint}
                  selectedWallId={null}
                  onSelectWall={selectWall}
                  onChange={(next, action) => updateBlueprint(next, action)}
                />
              </div>
            )}
          </div>
          
          {/* Accordion 3 : Configuration Globale */}
          <div className="border border-border rounded-[var(--radius-card)] bg-surface overflow-hidden shadow-sm">
            <button
              type="button"
              aria-expanded={accordion === 'config'}
              aria-controls="editor-panel-config"
              className={cn("w-full flex items-center justify-between p-3.5 text-left text-sm font-semibold transition-colors", accordion === 'config' ? 'bg-surface-muted text-foreground' : 'bg-surface text-muted hover:bg-surface-muted/50 hover:text-foreground')}
              onClick={() => setAccordion(accordion === 'config' ? '' : 'config')}
            >
              <span className="flex items-center gap-2">
                <Ruler className="w-4 h-4" aria-hidden /> Configuration Globale
              </span>
              <DiscloseChevron open={accordion === 'config'} />
            </button>
            
            {accordion === 'config' && (
              <div id="editor-panel-config" className="p-4 bg-surface space-y-4 border-t border-border">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase text-muted">Dimensions de la zone</p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs space-y-1">
                      <span className="font-semibold text-muted">Largeur (m)</span>
                      <input
                        type="number"
                        min={5}
                        max={80}
                        value={blueprint.canvas.widthM}
                        onChange={(e) => updateBlueprint({ ...blueprint, canvas: { ...blueprint.canvas, widthM: parseInt(e.target.value, 10) || 5 } }, { message: 'Largeur de salle modifiée', kind: 'settings' })}
                        className={EDITOR_FIELD}
                      />
                    </label>
                    <label className="text-xs space-y-1">
                      <span className="font-semibold text-muted">Longueur (m)</span>
                <input
                  type="number"
                  min={5}
                  max={80}
                  value={blueprint.canvas.heightM}
                  onChange={(e) => updateBlueprint({ ...blueprint, canvas: { ...blueprint.canvas, heightM: parseInt(e.target.value, 10) || 5 } }, { message: 'Longueur de salle modifiée', kind: 'settings' })}
                  className={EDITOR_FIELD}
                />
              </label>
            </div>
          </div>
          <div className="p-4 bg-surface-muted rounded-[var(--radius-card)] border space-y-3">
            <p className={EDITOR_HEADING}><Palette className="w-3.5 h-3.5" /> Couleur des tables</p>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={blueprint.metadata.defaultTableColor ?? '#ffffff'}
                onChange={(e) => setDefaultTableColor(e.target.value)}
                className="min-h-11 min-w-11 rounded-[var(--radius-button)] border border-border cursor-pointer shrink-0"
              />
              <button
                type="button"
                onClick={() => applyTableColorToAll(blueprint.metadata.defaultTableColor ?? '#ffffff')}
                className={cn(EDITOR_PANEL_BTN, 'flex-1 border-primary/30 bg-primary/10 text-primary')}
              >
                Appliquer à toutes les tables
              </button>
            </div>
          </div>
          
          {caps.canChangeOutline ? (
            <div className="space-y-3 pt-4 border-t border-border/50">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1"><Shapes className="w-3.5 h-3.5" /> Forme de la salle</p>
              <p className="text-sm text-muted leading-relaxed">
                Met à jour le sol découpé et les murs 3D (L, U, hexagone, cercle…). Annulable avec Ctrl+Z.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(roomOutlineLabels) as RoomOutlineShape[]).map((shape) => (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => setRoomOutlineShape(shape)}
                    className={cn(
                      'min-h-11 py-2.5 px-1.5 rounded-[var(--radius-button)] border text-sm font-medium transition-colors',
                      outline.shape === shape
                        ? 'bg-primary/10 border-primary/50 text-primary'
                        : 'border-border text-muted hover:bg-surface-muted',
                    )}
                  >
                    <span
                      className="block h-7 mx-auto mb-1 bg-primary/25 border border-primary/20"
                      style={{
                        width: '70%',
                        clipPath: getRoomOutlineClipPath(shape) ?? 'none',
                        background: outline.shape === shape ? 'var(--color-primary, #6366f1)' : undefined,
                      }}
                    />
                    {roomOutlineLabels[shape]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
              </div>
            )}
          </div>
          <LayoutActionPanel actions={actionLog} />
        </div>
      );
    }

    if (selected?.kind === 'wall') {
      return (
        <div className="space-y-3">
          <div className="p-4 bg-surface-muted rounded-[var(--radius-card)] border space-y-3">
            <p className="text-xs font-bold uppercase text-muted flex items-center gap-1">
              <BrickWall className="w-3.5 h-3.5" /> Mur sélectionné
            </p>
            <RoomWallEditorPanel
              blueprint={blueprint}
              selectedWallId={selected.id}
              onSelectWall={selectWall}
              onChange={(next, action) => updateBlueprint(next, action)}
            />
          </div>
          <LayoutActionPanel actions={actionLog} />
        </div>
      );
    }

    if (selectedFixture) {
      const isColumn = selectedFixture.kind === 'pillar' || selectedFixture.kind === 'column';
      const isPodium = selectedFixture.kind === 'podium';
      const isStage = selectedFixture.kind === 'stage' || isPodium;
      const isFlower = selectedFixture.kind === 'flower';
      const isArch = selectedFixture.kind === 'arch';
      const isPartition = selectedFixture.kind === 'partition';
      const isDecal = selectedFixture.kind === 'decal';
      const isPedestal = selectedFixture.kind === 'pedestal';
      const isBuffet = selectedFixture.kind === 'buffet';
      const isStairs = selectedFixture.kind === 'stairs';
      const isBalcony = selectedFixture.kind === 'balcony';
      const isDoor = selectedFixture.kind === 'door' || selectedFixture.kind === 'entrance';
      const isAisle = selectedFixture.kind === 'aisle' || selectedFixture.kind === 'carpet';
      const isChandelier = selectedFixture.kind === 'chandelier';
      const canHaveImage = isColumn || isStage || isFlower || isBuffet || isStairs || isAisle || isDecal;

      return (
        <div className="space-y-3">
          <div className="p-4 bg-surface-muted rounded-[var(--radius-card)] border space-y-3">
            <p className="text-xs font-bold uppercase text-muted">
              {isDoor
                ? 'Porte & Entrée'
                : isAisle
                  ? 'Allée & Tapis'
                  : isChandelier
                    ? 'Lustre & Éclairage'
                    : isBalcony
                      ? 'Balcon'
                      : isStairs
                        ? 'Escalier'
                        : isBuffet
                          ? 'Buffet'
                          : isPodium
                            ? 'Podium'
                            : isArch
                              ? 'Arche florale'
                              : isPartition
                                ? 'Cloison basse'
                                : isDecal
                                  ? 'Motif au sol'
                                  : isPedestal
                                    ? 'Piédestal floral'
                                : isFlower
                                  ? 'Décoration florale'
                                  : isColumn
                                    ? 'Colonne / Poteau'
                                    : isStage
                                      ? 'Scène'
                                      : `Fixe — ${selectedFixture.kind}`}
            </p>
            <label className="block text-xs space-y-1">
              <span className="font-semibold text-muted">Libellé</span>
              <input value={selectedFixture.label ?? ''} onChange={(e) => updateFixture(selectedFixture.id, { label: e.target.value })} className="w-full px-3 py-2 rounded-[var(--radius-button)] border text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs space-y-1">
                <span className="font-semibold text-muted">Largeur %</span>
                <input type="number" min={1} max={100} value={Math.round(selectedFixture.w)} onChange={(e) => updateFixture(selectedFixture.id, { w: parseFloat(e.target.value) })} className={EDITOR_FIELD} />
              </label>
              <label className="text-xs space-y-1">
                <span className="font-semibold text-muted">Profondeur %</span>
                <input type="number" min={1} max={100} value={Math.round(selectedFixture.h)} onChange={(e) => updateFixture(selectedFixture.id, { h: parseFloat(e.target.value) })} className={EDITOR_FIELD} />
              </label>
            </div>

            {/* ───────── PORTES & ENTRÉES D’ACCUEIL ───────── */}
            {isDoor && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className={EDITOR_HEADING}>
                  <DoorOpen className="w-3.5 h-3.5 text-primary" /> Style de porte
                </p>
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-foreground">Modèle architectural</span>
                  <select
                    value={selectedFixture.doorStyle ?? (selectedFixture.kind === 'entrance' ? 'grandPortal' : 'frenchDoor')}
                    onChange={(e) => updateFixture(selectedFixture.id, { doorStyle: e.target.value as DoorStyle }, `Style porte : ${doorStyleLabels[e.target.value as DoorStyle]}`)}
                    className={EDITOR_FIELD}
                  >
                    {(Object.keys(doorStyleLabels) as DoorStyle[]).map((st) => (
                      <option key={st} value={st}>
                        {doorStyleLabels[st]}
                      </option>
                    ))}
                  </select>
                  {selectedFixture.doorStyle && doorStyleHints[selectedFixture.doorStyle] && (
                    <p className={EDITOR_HINT}>{doorStyleHints[selectedFixture.doorStyle]}</p>
                  )}
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-foreground">Sens battant</span>
                    <select
                      value={selectedFixture.doorSwing ?? 'double'}
                      onChange={(e) => updateFixture(selectedFixture.id, { doorSwing: e.target.value as any }, 'Sens ouverture porte')}
                      className={EDITOR_FIELD}
                    >
                      <option value="double">Double battant</option>
                      <option value="left">Gauche (tirant)</option>
                      <option value="right">Droite (tirant)</option>
                      <option value="sliding">Coulissant</option>
                      <option value="arch">Cintré / Arche</option>
                    </select>
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-foreground">Couleur porte</span>
                    <input
                      type="color"
                      value={selectedFixture.color ?? '#78350f'}
                      onChange={(e) => updateFixture(selectedFixture.id, { color: e.target.value })}
                      className="w-full min-h-11 rounded-[var(--radius-button)] border border-border cursor-pointer"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-foreground">Finition vantail</span>
                    <select
                      value={selectedFixture.openingMaterial ?? 'wood'}
                      onChange={(e) => updateFixture(selectedFixture.id, { openingMaterial: e.target.value as OpeningMaterial }, 'Finition porte')}
                      className={EDITOR_FIELD}
                    >
                      {(Object.keys(openingMaterialLabels) as OpeningMaterial[]).map((mat) => (
                        <option key={mat} value={mat}>{openingMaterialLabels[mat]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-foreground">Couleur huisserie</span>
                    <input
                      type="color"
                      value={selectedFixture.frameColor ?? '#3f2a1a'}
                      onChange={(e) => updateFixture(selectedFixture.id, { frameColor: e.target.value })}
                      className="w-full min-h-11 rounded-[var(--radius-button)] border border-border cursor-pointer"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between gap-2 p-2 rounded bg-surface border border-border">
                  <label className="flex items-center gap-2 min-h-11 text-sm font-medium text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFixture.hasMat !== false}
                      onChange={(e) => updateFixture(selectedFixture.id, { hasMat: e.target.checked }, e.target.checked ? 'Paillasson ajouté' : 'Paillasson masqué')}
                      className="rounded border-border size-4"
                    />
                    <span>Paillasson d’accueil VIP</span>
                  </label>
                  {selectedFixture.hasMat !== false && (
                    <input
                      type="color"
                      value={selectedFixture.matColor ?? '#451a03'}
                      onChange={(e) => updateFixture(selectedFixture.id, { matColor: e.target.value })}
                      aria-label="Couleur paillasson"
                      title="Couleur paillasson"
                      className="min-h-11 min-w-11 shrink-0 rounded-[var(--radius-button)] border border-border cursor-pointer"
                    />
                  )}
                </div>
              </div>
            )}

            {/* ───────── ALLÉES & TAPIS DE PRESTIGE ───────── */}
            {isAisle && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className={EDITOR_HEADING}>
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Style de l’allée d’honneur
                </p>
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-foreground">Thème de tapis</span>
                  <select
                    value={selectedFixture.aisleStyle ?? 'royalRed'}
                    onChange={(e) => updateFixture(selectedFixture.id, { aisleStyle: e.target.value as AisleStyle }, `Allée : ${aisleStyleLabels[e.target.value as AisleStyle]}`)}
                    className={EDITOR_FIELD}
                  >
                    {(Object.keys(aisleStyleLabels) as AisleStyle[]).map((st) => (
                      <option key={st} value={st}>
                        {aisleStyleLabels[st]}
                      </option>
                    ))}
                  </select>
                  {selectedFixture.aisleStyle && aisleStyleHints[selectedFixture.aisleStyle] && (
                    <p className={EDITOR_HINT}>{aisleStyleHints[selectedFixture.aisleStyle]}</p>
                  )}
                </label>

                <div className="space-y-1 p-2 rounded bg-surface border border-border">
                  <label className="flex items-center gap-2 min-h-11 text-sm font-medium text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFixture.hasGoldBorder !== false}
                      onChange={(e) => updateFixture(selectedFixture.id, { hasGoldBorder: e.target.checked }, 'Bordure dorée')}
                      className="rounded border-border size-4"
                    />
                    <span>Ganse / liseré doré sur les bords</span>
                  </label>
                  <label className="flex items-center gap-2 min-h-11 text-sm font-medium text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFixture.hasSideLanterns !== false}
                      onChange={(e) => updateFixture(selectedFixture.id, { hasSideLanterns: e.target.checked }, 'Lanternes latérales')}
                      className="rounded border-border size-4"
                    />
                    <span>Lanternes & bougies latérales</span>
                  </label>
                  <label className="flex items-center gap-2 min-h-11 text-sm font-medium text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFixture.hasPetals !== false}
                      onChange={(e) => updateFixture(selectedFixture.id, { hasPetals: e.target.checked }, 'Pétales de fleurs')}
                      className="rounded border-border size-4"
                    />
                    <span>Pétales de roses parsemés</span>
                  </label>
                </div>
              </div>
            )}

            {/* ───────── LUSTRES & SUSPENSIONS DE CRISTAL ───────── */}
            {isChandelier && (
              <div className="space-y-2.5 pt-2 border-t border-border">
                <p className={EDITOR_HEADING}>
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Suspension & éclairage
                </p>
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-foreground">Type de lustre</span>
                  <select
                    value={selectedFixture.chandelierStyle ?? 'crystalCascade'}
                    onChange={(e) => updateFixture(selectedFixture.id, { chandelierStyle: e.target.value as ChandelierFixtureStyle }, `Lustre : ${chandelierFixtureStyleLabels[e.target.value as ChandelierFixtureStyle]}`)}
                    className={EDITOR_FIELD}
                  >
                    {(Object.keys(chandelierFixtureStyleLabels) as ChandelierFixtureStyle[]).map((st) => (
                      <option key={st} value={st}>
                        {chandelierFixtureStyleLabels[st]}
                      </option>
                    ))}
                  </select>
                  {selectedFixture.chandelierStyle && chandelierFixtureStyleHints[selectedFixture.chandelierStyle] && (
                    <p className={EDITOR_HINT}>{chandelierFixtureStyleHints[selectedFixture.chandelierStyle]}</p>
                  )}
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-foreground">Ambiance lumineuse</span>
                    <select
                      value={selectedFixture.lightWarmth ?? 'gold'}
                      onChange={(e) => updateFixture(selectedFixture.id, { lightWarmth: e.target.value as any }, 'Teinte lumière')}
                      className={EDITOR_FIELD}
                    >
                      <option value="gold">Or & Ambre (2700K)</option>
                      <option value="candle">Flamme bougie chaleureuse</option>
                      <option value="neutral">Blanc pur (4000K)</option>
                      <option value="rose">Rose poudré romantique</option>
                      <option value="night">Nocturne & tamisé</option>
                    </select>
                  </label>

                  <label className="block text-xs space-y-1">
                    <span className="font-semibold text-muted">Intensité ({selectedFixture.lightIntensity ?? 85}%)</span>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={selectedFixture.lightIntensity ?? 85}
                      onChange={(e) => updateFixture(selectedFixture.id, { lightIntensity: parseInt(e.target.value, 10) }, 'Intensité lustre')}
                      className="w-full mt-2"
                    />
                  </label>
                </div>
              </div>
            )}

            {(isStage || isBuffet || isStairs) && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted">Matériau</span>
                <ZoneMaterialPicker
                  value={(selectedFixture.material ?? 'wood') as ZoneMaterial}
                  onChange={(material) => updateFixture(selectedFixture.id, { material }, 'Matériau modifié')}
                />
              </div>
            )}

            {isStairs && (() => {
              const def = resolveStairDefinition(blueprint, selectedFixture as Extract<typeof selectedFixture, { kind: 'stairs' }>);
              return (
              <>
                <div className="rounded-[var(--radius-button)] border border-border bg-surface-muted/40 px-3 py-2.5 space-y-3">
                  <div>
                    <p className={EDITOR_HEADING}>Définition de l’escalier</p>
                    <p className="text-[11px] font-semibold text-foreground mt-1">{formatStairSummary(def)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded border border-border bg-surface px-2 py-1.5">
                      <p className="font-bold uppercase text-muted">Départ</p>
                      <p className="font-semibold text-foreground mt-0.5">{def.fromLabel}</p>
                    </div>
                    <div className="rounded border border-border bg-surface px-2 py-1.5">
                      <p className="font-bold uppercase text-muted">Arrivée</p>
                      <p className="font-semibold text-foreground mt-0.5">{def.toLabel ?? '—'}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className={EDITOR_HEADING}>Étage d’arrivée</p>
                    <div className="flex flex-wrap gap-1.5">
                      {resolveStories(blueprint)
                        .filter((s) => s.id !== def.fromStoryId)
                        .map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => updateBlueprint(
                              linkStairsToStory(blueprint, selectedFixture.id, s.id, {
                                style: def.style,
                                keepPosition: true,
                              }),
                              { message: `Escalier : ${def.fromLabel} → ${s.label}`, kind: 'edit' },
                            )}
                            className={cn(
                              EDITOR_CHIP,
                              def.toStoryId === s.id
                                ? 'bg-primary/10 border-primary/40 text-primary'
                                : 'border-border bg-surface text-muted hover:bg-surface-muted',
                            )}
                          >
                            {s.label}
                          </button>
                        ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className={EDITOR_HEADING}>Style</p>
                    <div className="grid grid-cols-1 gap-1">
                      {(Object.keys(stairStyleLabels) as StairStyle[]).map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => {
                            if (def.toStoryId) {
                              updateBlueprint(
                                linkStairsToStory(blueprint, selectedFixture.id, def.toStoryId, {
                                  style,
                                  keepPosition: true,
                                }),
                                { message: `Style : ${stairStyleLabels[style]}`, kind: 'edit' },
                              );
                            } else {
                              updateFixture(selectedFixture.id, { stairStyle: style }, `Style ${stairStyleLabels[style]}`);
                            }
                          }}
                          className={cn(
                            'text-left min-h-11 px-3 py-2.5 rounded-[var(--radius-button)] border text-sm',
                            def.style === style
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border bg-surface text-muted hover:bg-surface-muted',
                          )}
                        >
                          <span className="font-bold">{stairStyleLabels[style]}</span>
                          <span className={cn('block mt-0.5', def.style === style ? 'text-primary-foreground/80' : 'opacity-80')}>
                            {stairStyleHints[style]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className={EDITOR_HEADING}>Orientation (montée)</p>
                    <div className="grid grid-cols-4 gap-1">
                      {STAIR_DIRECTION_ORDER.map((deg) => (
                        <button
                          key={deg}
                          type="button"
                          onClick={() => updateFixture(selectedFixture.id, { stairDirection: deg }, `Orientation ${stairDirectionLabels[deg]}`)}
                          className={cn(
                            'min-h-11 rounded-[var(--radius-button)] border text-sm font-medium',
                            def.direction === deg ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-surface text-muted',
                          )}
                        >
                          {stairDirectionLabels[deg]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {def.linked && def.toStoryId ? (
                    <button
                      type="button"
                      onClick={() => updateBlueprint(
                        linkStairsToStory(blueprint, selectedFixture.id, def.toStoryId!, {
                          style: def.style,
                          keepPosition: true,
                        }),
                        { message: 'Escalier recalibré', kind: 'edit' },
                      )}
                      className={cn(EDITOR_PANEL_BTN, 'w-full border-border bg-surface text-foreground hover:bg-surface-muted')}
                    >
                      Recalibrer hauteur &amp; course
                    </button>
                  ) : (
                    <p className={EDITOR_HINT}>Choisissez l’étage d’arrivée pour figer la définition.</p>
                  )}
                </div>

                <StairsUserGuide defaultOpen={!def.linked} />

                <details className="group text-xs">
                  <summary className="font-semibold text-muted cursor-pointer min-h-11 flex items-center justify-between gap-2 list-none [&::-webkit-details-marker]:hidden">
                    Réglages fins
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <div className="mt-2 space-y-2">
                    <label className="block space-y-1">
                      <span className="font-semibold text-muted">Hauteur (m)</span>
                      <input
                        type="number"
                        min={0.4}
                        max={6}
                        step={0.1}
                        value={selectedFixture.heightM ?? 1.2}
                        onChange={(e) => updateFixture(selectedFixture.id, { heightM: parseFloat(e.target.value) || 1.2 }, 'Hauteur escalier')}
                        className={EDITOR_FIELD}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="font-semibold text-muted">Marches</span>
                      <input
                        type="number"
                        min={4}
                        max={24}
                        value={selectedFixture.steps ?? 6}
                        onChange={(e) => updateFixture(selectedFixture.id, { steps: Math.max(4, Math.min(24, parseInt(e.target.value, 10) || 6)) }, 'Marches escalier')}
                        className={EDITOR_FIELD}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="font-semibold text-muted">Couleur</span>
                      <input type="color" value={selectedFixture.color ?? '#a8a29e'} onChange={(e) => updateFixture(selectedFixture.id, { color: e.target.value })} aria-label="Couleur de l’escalier" className="w-full min-h-11 rounded-[var(--radius-button)] border border-border cursor-pointer" />
                    </label>
                  </div>
                </details>
              </>
              );
            })()}

            {isBalcony && (
              <div className="space-y-2">
                <p className={EDITOR_HEADING}>Façade</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(balconySideLabels) as BalconySide[]).map((side) => (
                    <button
                      key={side}
                      type="button"
                      onClick={() => updateFixture(selectedFixture.id, { balconySide: side }, `Balcon ${balconySideLabels[side]}`)}
                      className={cn(
                        EDITOR_PANEL_BTN,
                        (selectedFixture.balconySide ?? 'south') === side
                          ? 'bg-primary/10 border-primary/40 text-primary'
                          : 'border-border text-muted hover:bg-surface-muted',
                      )}
                    >
                      {balconySideLabels[side]}
                    </button>
                  ))}
                </div>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-muted">Couleur dalle</span>
                  <input
                    type="color"
                    value={selectedFixture.color ?? '#d6d3d1'}
                    onChange={(e) => updateFixture(selectedFixture.id, { color: e.target.value })}
                    aria-label="Couleur dalle du balcon"
                    className="w-full min-h-11 rounded-[var(--radius-button)] border border-border cursor-pointer"
                  />
                </label>
              </div>
            )}

            {selectedFixture.kind === 'stage' ? (
              <label className="block text-xs space-y-1">
                <span className="font-semibold text-muted">Forme de scène</span>
                <select
                  value={selectedFixture.stageShape ?? 'rect'}
                  onChange={(e) => updateFixture(selectedFixture.id, { stageShape: e.target.value as StageShape }, `Scène : ${stageShapeLabels[e.target.value as StageShape]}`)}
                  className={EDITOR_FIELD}
                >
                  {(Object.keys(stageShapeLabels) as StageShape[]).map((shape) => (
                    <option key={shape} value={shape}>{stageShapeLabels[shape]}</option>
                  ))}
                </select>
              </label>
            ) : null}
            {selectedFixture.kind === 'stage' ? (
              <label className="block text-xs space-y-1">
                <span className="font-semibold text-muted">Toit de scène</span>
                <select
                  value={selectedFixture.stageRoof ?? 'none'}
                  onChange={(e) => updateFixture(selectedFixture.id, { stageRoof: e.target.value as StageRoofStyle }, 'Toit de scène')}
                  className={EDITOR_FIELD}
                >
                  <option value="none">Aucun</option>
                  <option value="gabled">Pignon (jardin)</option>
                </select>
              </label>
            ) : null}

            {isPodium && (
              <>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-muted">Hauteur podium (m)</span>
                  <input
                    type="number"
                    min={0.2}
                    max={2}
                    step={0.05}
                    value={selectedFixture.heightM ?? 0.6}
                    onChange={(e) => updateFixture(selectedFixture.id, { heightM: parseFloat(e.target.value) || 0.6 }, 'Hauteur podium')}
                    className={EDITOR_FIELD}
                  />
                </label>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-muted">Nombre de marches</span>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={selectedFixture.steps ?? 2}
                    onChange={(e) => updateFixture(selectedFixture.id, { steps: Math.max(1, Math.min(4, parseInt(e.target.value, 10) || 2)) }, 'Marches podium')}
                    className={EDITOR_FIELD}
                  />
                </label>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-muted">Couleur</span>
                  <input type="color" value={selectedFixture.color ?? '#b45309'} onChange={(e) => updateFixture(selectedFixture.id, { color: e.target.value })} aria-label="Couleur de l’élément" className="w-full min-h-11 rounded-[var(--radius-button)] border border-border cursor-pointer" />
                </label>
              </>
            )}

            {isBuffet && (
              <>
                <label className="flex items-center gap-2 min-h-11 text-sm font-medium text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFixture.hasCouverts !== false}
                    onChange={(e) => updateFixture(selectedFixture.id, { hasCouverts: e.target.checked }, e.target.checked ? 'Couverts affichés' : 'Couverts masqués')}
                    className="rounded border-border size-4"
                  />
                  Afficher assiettes & couverts
                </label>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-muted">Style buffet</span>
                  <select
                    value={selectedFixture.buffetStyle ?? 'straight'}
                    onChange={(e) => updateFixture(selectedFixture.id, { buffetStyle: e.target.value as 'straight' | 'corner' | 'island' })}
                    className={EDITOR_FIELD}
                  >
                    <option value="straight">Linéaire</option>
                    <option value="corner">En L / angle</option>
                    <option value="island">Îlot central</option>
                  </select>
                </label>
              </>
            )}

            {isDecal ? (
              <>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-muted">Motif</span>
                  <select
                    value={selectedFixture.decalKind ?? 'rose'}
                    onChange={(e) => updateFixture(selectedFixture.id, { decalKind: e.target.value as FloorDecalKind }, 'Motif au sol')}
                    className={EDITOR_FIELD}
                  >
                    <option value="rose">Roses</option>
                    <option value="butterfly">Papillons</option>
                    <option value="path">Chemin / allée au sol</option>
                    <option value="custom">Image (importer ci-dessous)</option>
                  </select>
                </label>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-muted">Couleur</span>
                  <input type="color" value={selectedFixture.color ?? '#dcaeae'} onChange={(e) => updateFixture(selectedFixture.id, { color: e.target.value }, 'Couleur du motif')} aria-label="Couleur du motif" className="w-full min-h-11 rounded-[var(--radius-button)] border border-border cursor-pointer" />
                </label>
              </>
            ) : null}

            {isPedestal ? (
              <>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-muted">Style</span>
                  <select
                    value={selectedFixture.pedestalStyle ?? 'squareWhite'}
                    onChange={(e) => updateFixture(selectedFixture.id, { pedestalStyle: e.target.value as PedestalStyle }, 'Style de piédestal')}
                    className={EDITOR_FIELD}
                  >
                    <option value="squareWhite">Colonne blanche</option>
                    <option value="columnGold">Colonne or</option>
                  </select>
                </label>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-muted">Hauteur (m)</span>
                  <input
                    type="number"
                    min={0.7}
                    max={2}
                    step={0.05}
                    value={selectedFixture.heightM ?? 1.15}
                    onChange={(e) => updateFixture(selectedFixture.id, { heightM: parseFloat(e.target.value) || 1.15 }, 'Hauteur piédestal')}
                    className={EDITOR_FIELD}
                  />
                </label>
              </>
            ) : null}

            {isFlower && (
              <>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-muted">Type de fleurs</span>
                  <select
                    value={selectedFixture.flowerType ?? 'boquet'}
                    onChange={(e) => updateFixture(selectedFixture.id, { flowerType: e.target.value as FlowerType }, 'Type de fleurs modifié')}
                    className={EDITOR_FIELD}
                  >
                    {Object.entries(flowerTypeLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-muted">Couleur des fleurs</span>
                  <input type="color" value={selectedFixture.flowerColor ?? '#e11d48'} onChange={(e) => updateFixture(selectedFixture.id, { flowerColor: e.target.value }, 'Couleur florale modifiée')} aria-label="Couleur des fleurs" className="w-full min-h-11 rounded-[var(--radius-button)] border border-border cursor-pointer" />
                </label>
              </>
            )}

            {isColumn && (
              <>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-muted">Forme colonne</span>
                  <select value={selectedFixture.columnShape ?? 'round'} onChange={(e) => updateFixture(selectedFixture.id, { columnShape: e.target.value as ColumnShape }, 'Forme colonne modifiée')} className={EDITOR_FIELD}>
                    <option value="round">Ronde</option>
                    <option value="square">Carrée</option>
                    <option value="fluted">Cannelée (classique)</option>
                  </select>
                </label>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-muted">Couleur (sans image)</span>
                  <input type="color" value={selectedFixture.color ?? '#78716c'} onChange={(e) => updateFixture(selectedFixture.id, { color: e.target.value })} aria-label="Couleur de la colonne" className="w-full min-h-11 rounded-[var(--radius-button)] border border-border cursor-pointer" />
                </label>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-muted">Rotation (°)</span>
                  <input type="number" min={0} max={360} value={selectedFixture.rotation ?? 0} onChange={(e) => updateFixture(selectedFixture.id, { rotation: parseFloat(e.target.value) })} className={EDITOR_FIELD} />
                </label>
                <div className="space-y-1.5">
                  <p className={EDITOR_HEADING}>Position</p>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => updateFixture(selectedFixture.id, { y: Math.max(1, selectedFixture.y - 2) }, 'Colonne déplacée ↑')}
                      className={EDITOR_TOOL_ICON}
                      aria-label="Déplacer la colonne vers le haut"
                    >
                      <ArrowUp className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateFixture(selectedFixture.id, { x: Math.max(1, selectedFixture.x - 2) }, 'Colonne déplacée ←')}
                      className={EDITOR_TOOL_ICON}
                      aria-label="Déplacer la colonne vers la gauche"
                    >
                      <ArrowLeft className="w-4 h-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateFixture(selectedFixture.id, {
                        x: Math.max(1, Math.min(99 - selectedFixture.w, 50 - selectedFixture.w / 2)),
                        y: Math.max(1, Math.min(99 - selectedFixture.h, 50 - selectedFixture.h / 2)),
                      }, 'Colonne centrée')}
                      className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}
                      aria-label="Centrer la colonne"
                    >
                      <Home className="w-3.5 h-3.5" aria-hidden /> Centre
                    </button>
                    <button
                      type="button"
                      onClick={() => updateFixture(selectedFixture.id, { x: Math.min(99 - selectedFixture.w, selectedFixture.x + 2) }, 'Colonne déplacée →')}
                      className={EDITOR_TOOL_ICON}
                      aria-label="Déplacer la colonne vers la droite"
                    >
                      <ArrowRight className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => updateFixture(selectedFixture.id, { y: Math.min(99 - selectedFixture.h, selectedFixture.y + 2) }, 'Colonne déplacée ↓')}
                      className={EDITOR_TOOL_ICON}
                      aria-label="Déplacer la colonne vers le bas"
                    >
                      <ArrowDown className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                  <p className={cn(EDITOR_HINT, 'text-center')}>Ou glissez la colonne dans la vue 3D</p>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={duplicateSelection}
                className={cn(EDITOR_PANEL_BTN, 'border-border text-muted')}
              >
                <Copy className="w-3 h-3" /> Dupliquer
              </button>
              <button
                type="button"
                onClick={rotateSelection}
                className={cn(EDITOR_PANEL_BTN, 'border-border text-muted')}
              >
                <RotateCw className="w-3 h-3" /> Tourner 90°
              </button>
              <button
                type="button"
                onClick={() => updateBlueprint(
                  applyFixtureStyleToSameKind(blueprint, selectedFixture.id),
                  { message: `Style appliqué aux autres ${fixtureStyleFamilyLabel(selectedFixture.kind)}`, kind: 'edit' },
                )}
                className={cn(EDITOR_PANEL_BTN, 'col-span-2 border-primary/30 bg-primary/10 text-primary')}
              >
                Appliquer aux autres {fixtureStyleFamilyLabel(selectedFixture.kind)}
              </button>
            </div>

            {canHaveImage && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-xs font-semibold text-muted flex items-center gap-1"><ImagePlus className="w-3.5 h-3.5" /> Image personnalisée</p>
                <button
                  type="button"
                  onClick={() => setCropTarget({ kind: 'fixture', id: selectedFixture.id })}
                  className="w-full py-2 rounded-[var(--radius-button)] border border-primary/30 bg-primary/10 text-primary text-xs font-bold hover:bg-primary/15"
                >
                  {selectedFixture.imageUrl ? 'Modifier / rogner l\'image' : 'Importer et rogner une image'}
                </button>
                {selectedFixture.imageUrl && (
                  <button
                    type="button"
                    onClick={() => updateFixture(selectedFixture.id, { imageUrl: undefined, imageCrop: undefined }, 'Image retirée')}
                    className={EDITOR_REMOVE}
                  >
                    Retirer l&apos;image
                  </button>
                )}
              </div>
            )}
          </div>
          <LayoutActionPanel actions={actionLog} />
        </div>
      );
    }

    if (selectedFurniture?.kind === 'table') {
      return (
        <div className="space-y-3">
          <div className="p-4 bg-surface-muted rounded-[var(--radius-card)] border space-y-3">
            <p className="text-xs font-bold uppercase text-muted">Table</p>
            <label className="block text-xs space-y-1">
              <span className="font-semibold text-muted">Nom</span>
              <input value={selectedFurniture.name} onChange={(e) => updateFurniture(selectedFurniture.id, { name: e.target.value })} className="w-full px-3 py-2 rounded-[var(--radius-button)] border text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs space-y-1">
                <span className="font-semibold text-muted">Forme</span>
                <select value={selectedFurniture.shape} onChange={(e) => updateFurniture(selectedFurniture.id, { shape: e.target.value as TableShape })} className={EDITOR_FIELD}>
                  {caps.tableShapes.includes('round') ? <option value="round">Ronde</option> : null}
                  {caps.tableShapes.includes('rectangular') ? <option value="rectangular">Rectangulaire</option> : null}
                  {caps.tableShapes.includes('square') ? <option value="square">Carrée</option> : null}
                  {caps.tableShapes.includes('oval') ? <option value="oval">Ovale</option> : null}
                  {caps.tableShapes.includes('cocktail') ? <option value="cocktail">Cocktail (basse)</option> : null}
                  {caps.tableShapes.includes('highTop') ? <option value="highTop">Mange-debout</option> : null}
                  {caps.tableShapes.includes('arc') ? <option value="arc">Courbe (arc)</option> : null}
                </select>
              </label>
              <label className="text-xs space-y-1">
                <span className="font-semibold text-muted">Places</span>
                <input type="number" min={2} max={24} value={selectedFurniture.capacity} onChange={(e) => updateFurniture(selectedFurniture.id, { capacity: parseInt(e.target.value, 10) })} className={EDITOR_FIELD} />
              </label>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1"><Palette className="w-3 h-3" /> Couleur de cette table</span>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={selectedFurniture.tableColor ?? blueprint.metadata.defaultTableColor ?? '#ffffff'}
                  onChange={(e) => updateFurniture(selectedFurniture.id, { tableColor: e.target.value }, 'Couleur de table modifiée')}
                  aria-label="Couleur de cette table"
                  className="w-full min-h-11 rounded-[var(--radius-button)] border border-border cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => updateFurniture(selectedFurniture.id, { tableColor: undefined }, 'Couleur table réinitialisée')}
                  className={cn(EDITOR_TOOL, EDITOR_TOOL_MUTED, 'shrink-0')}
                >
                  Défaut
                </button>
              </div>
            </label>
            <div className="block text-xs space-y-1.5">
              <span className="font-semibold text-muted">Plateau / finition</span>
              <TableSurfacePicker
                value={selectedFurniture.tableSurface ?? blueprint.metadata.defaultTableSurface ?? 'linen'}
                onChange={(tableSurface) => updateFurniture(selectedFurniture.id, { tableSurface }, 'Finition de table')}
              />
            </div>
            <label className="flex items-center gap-2 min-h-11 text-sm font-medium text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFurniture.hasCouverts === true}
                onChange={(e) => updateFurniture(selectedFurniture.id, { hasCouverts: e.target.checked }, e.target.checked ? 'Couverts affichés' : 'Couverts masqués')}
                className="rounded border-border size-4"
              />
              Afficher assiettes & couverts
            </label>
            {selectedFurniture.shape !== 'cocktail' && selectedFurniture.shape !== 'highTop' ? (
              <label className="flex items-center gap-2 min-h-11 text-sm font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedFurniture.hasCenterpiece === true}
                  onChange={(e) => updateFurniture(selectedFurniture.id, { hasCenterpiece: e.target.checked }, e.target.checked ? 'Centre de table affiché' : 'Centre de table masqué')}
                  className="rounded border-border size-4"
                />
                Centre de table (vase & bouquet)
              </label>
            ) : null}
            {selectedFurniture.hasCenterpiece && selectedFurniture.shape !== 'cocktail' && selectedFurniture.shape !== 'highTop' ? (
              <label className="block text-xs space-y-1">
                <span className="font-semibold text-muted">Style de centre</span>
                <select
                  value={selectedFurniture.centerpieceStyle ?? 'floral'}
                  onChange={(e) => updateFurniture(selectedFurniture.id, { centerpieceStyle: e.target.value as CenterpieceStyle }, 'Style de centre')}
                  className={EDITOR_FIELD}
                >
                  {(Object.keys(centerpieceStyleLabels) as CenterpieceStyle[]).map((style) => (
                    <option key={style} value={style}>{centerpieceStyleLabels[style]}</option>
                  ))}
                </select>
              </label>
            ) : null}
            {selectedFurniture.hasCouverts === true && (
              <label className="block text-xs space-y-1">
                <span className="font-semibold text-muted">Style de service</span>
                <select
                  value={selectedFurniture.couvertStyle ?? 'classic'}
                  onChange={(e) => updateFurniture(selectedFurniture.id, { couvertStyle: e.target.value as 'classic' | 'gold' | 'festive' }, 'Style couverts')}
                  className={EDITOR_FIELD}
                >
                  <option value="classic">Porcelaine classique</option>
                  <option value="gold">Or & liseré</option>
                  <option value="festive">Festif (verre teinté)</option>
                </select>
              </label>
            )}
            {(() => {
              const surface = resolveFurnitureSurfaceAt(blueprint, selectedFurniture.x, selectedFurniture.y);
              if (!surface) {
                return (
                  <p className={EDITOR_HINT}>
                    Glissez la table sur une moquette, piste ou podium : elle se pose automatiquement dessus (caméra bloquée recommandée).
                  </p>
                );
              }
              return (
                <Alert variant="info">
                  Posée sur « {surface.label} » ({surface.elevationM.toFixed(2)} m)
                </Alert>
              );
            })()}
            <div className="block text-xs space-y-1.5">
              <span className="font-semibold text-muted">Type de chaise</span>
              <ChairTypePicker
                value={selectedFurniture.chairType}
                onChange={(chairType) => updateFurniture(selectedFurniture.id, { chairType }, 'Type de chaise')}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs space-y-1">
                <span className="font-semibold text-muted">Style</span>
                <select
                  value={selectedFurniture.chairStyle ?? 'classic'}
                  onChange={(e) => updateFurniture(selectedFurniture.id, { chairStyle: e.target.value as ChairStyle }, 'Style chaise')}
                  className={EDITOR_FIELD}
                >
                  {(Object.keys(chairStyleLabels) as ChairStyle[]).map((k) => (
                    <option key={k} value={k}>{chairStyleLabels[k]}</option>
                  ))}
                </select>
              </label>
              <div className="text-xs space-y-1">
                <span className="font-semibold text-muted">Matériau</span>
                <SeatMaterialPicker
                  value={selectedFurniture.seatMaterial ?? 'fabric'}
                  onChange={(seatMaterial) => updateFurniture(selectedFurniture.id, { seatMaterial }, 'Matériau chaise')}
                />
              </div>
            </div>
            {caps.canCustomImages ? renderChairImageUpload(selectedFurniture.id, selectedFurniture.chairImageUrl) : null}
            {caps.canCustomImages ? renderTableImageUpload(selectedFurniture.id, selectedFurniture.tableImageUrl) : null}
            {caps.canRotate ? (
              <label className="block text-xs space-y-1">
                <span className="font-semibold text-muted">Rotation (°)</span>
                <input
                  type="number"
                  min={0}
                  max={360}
                  step={15}
                  value={selectedFurniture.rotation ?? 0}
                  onChange={(e) => updateFurniture(selectedFurniture.id, { rotation: parseFloat(e.target.value) || 0 }, 'Rotation de table')}
                  className={EDITOR_FIELD}
                />
              </label>
            ) : null}
            <div className="flex gap-2">
              {caps.canLock ? (
                <button
                  type="button"
                  onClick={() => updateFurniture(selectedFurniture.id, { locked: !selectedFurniture.locked }, selectedFurniture.locked ? 'Table déverrouillée' : 'Table verrouillée')}
                  className={cn(EDITOR_PANEL_BTN, 'flex-1 border-border')}
                >
                  {selectedFurniture.locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  {selectedFurniture.locked ? 'Déverrouiller' : 'Verrouiller'}
                </button>
              ) : null}
              {caps.canDuplicate ? (
                <button
                  type="button"
                  onClick={duplicateSelectedTable}
                  className={cn(EDITOR_PANEL_BTN, 'flex-1 border-primary/30 bg-primary/10 text-primary')}
                >
                  <Copy className="w-3 h-3" /> Dupliquer
                </button>
              ) : null}
            </div>
            {selectedFurniture.attachedChairs !== false ? (
              <button
                type="button"
                onClick={() => {
                  updateBlueprint(detachTableChairs(blueprint, selectedFurniture.id), {
                    message: 'Chaises détachées — déplacez-les librement',
                    kind: 'edit',
                  });
                }}
                className={cn(EDITOR_PANEL_BTN, 'w-full border-border bg-surface text-foreground hover:bg-surface-muted')}
              >
                Détacher les chaises (placement libre)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => updateFurniture(selectedFurniture.id, { attachedChairs: true }, 'Chaises rattachées à la table')}
                className={cn(EDITOR_PANEL_BTN, 'w-full border-border text-muted')}
              >
                Réafficher chaises autour de la table
              </button>
            )}
            <div className="pt-2 border-t border-border space-y-1.5">
              <p className={EDITOR_HEADING}>Appliquer à toutes les tables</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => updateBlueprint(applyTableStyleToAll(blueprint, selectedFurniture.id, ['shape']), { message: 'Forme appliquée à toutes les tables', kind: 'edit' })}
                  className={cn(EDITOR_PANEL_BTN, 'border-border text-muted hover:bg-surface-muted')}
                >
                  Forme
                </button>
                <button
                  type="button"
                  onClick={() => updateBlueprint(applyTableStyleToAll(blueprint, selectedFurniture.id, ['chairType']), { message: 'Chaises appliquées à toutes les tables', kind: 'edit' })}
                  className={cn(EDITOR_PANEL_BTN, 'border-border text-muted hover:bg-surface-muted')}
                >
                  Chaises
                </button>
                <button
                  type="button"
                  onClick={() => updateBlueprint(applyTableStyleToAll(blueprint, selectedFurniture.id, ['tableColor']), { message: 'Couleur appliquée à toutes les tables', kind: 'edit' })}
                  className={cn(EDITOR_PANEL_BTN, 'border-border text-muted hover:bg-surface-muted')}
                >
                  Couleur
                </button>
                <button
                  type="button"
                  onClick={() => updateBlueprint(applyTableStyleToAll(blueprint, selectedFurniture.id, ['tableSurface']), { message: 'Finition appliquée à toutes les tables', kind: 'edit' })}
                  className={cn(EDITOR_PANEL_BTN, 'border-border text-muted hover:bg-surface-muted')}
                >
                  Plateau
                </button>
                <button
                  type="button"
                  onClick={() => updateBlueprint(applyTableStyleToAll(blueprint, selectedFurniture.id, ['capacity']), { message: 'Places appliquées à toutes les tables', kind: 'edit' })}
                  className={cn(EDITOR_PANEL_BTN, 'border-border text-muted hover:bg-surface-muted')}
                >
                  Places
                </button>
                <button
                  type="button"
                  onClick={() => updateBlueprint(applyTableStyleToAll(blueprint, selectedFurniture.id, ['hasCouverts', 'couvertStyle']), { message: 'Couverts appliqués à toutes les tables', kind: 'edit' })}
                  className={cn(EDITOR_PANEL_BTN, 'border-border text-muted hover:bg-surface-muted')}
                >
                  Couverts
                </button>
                <button
                  type="button"
                  onClick={() => updateBlueprint(applyTableStyleToAll(blueprint, selectedFurniture.id, ['hasCenterpiece']), { message: 'Centres de table appliqués à toutes les tables', kind: 'edit' })}
                  className={cn(EDITOR_PANEL_BTN, 'border-border text-muted hover:bg-surface-muted')}
                >
                  Centres
                </button>
              </div>
            </div>
          </div>
          <LayoutActionPanel actions={actionLog} />
        </div>
      );
    }

    if (selectedFurniture?.kind === 'row') {
      return (
        <div className="space-y-3">
          <div className="p-4 bg-surface-muted rounded-[var(--radius-card)] border space-y-3">
            <p className="flex items-center justify-between gap-2">
              <span className={EDITOR_HEADING}>Rangée / Gradin</span>
              {selectedFurniture.elevationM ? (
                <span className="text-xs font-semibold tabular-nums text-primary px-2 py-1 rounded-[var(--radius-button)] bg-primary/10">
                  +{selectedFurniture.elevationM} m
                </span>
              ) : null}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Libellé"
                value={selectedFurniture.label}
                onChange={(e) => updateFurniture(selectedFurniture.id, { label: e.target.value })}
              />
              <Input
                label="Nom de rang"
                value={selectedFurniture.rowName ?? ''}
                placeholder="ex: Rang A"
                onChange={(e) => updateFurniture(selectedFurniture.id, { rowName: e.target.value })}
              />
            </div>

            <Input
              type="number"
              inputMode="numeric"
              label="Nombre de sièges"
              min={2}
              max={60}
              value={selectedFurniture.seatCount}
              onChange={(e) => updateFurniture(selectedFurniture.id, { seatCount: parseInt(e.target.value, 10) })}
            />

            {/* Courbure & Gradin (Amphithéâtre Pinterest) */}
            <div className="space-y-2 p-2.5 rounded bg-surface border border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground">Courbure de rangée</span>
                <span className="text-xs font-medium tabular-nums text-muted">{selectedFurniture.curve ?? 0}%</span>
              </div>
              <input
                type="range"
                min={-80}
                max={100}
                value={selectedFurniture.curve ?? 0}
                onChange={(e) => updateFurniture(selectedFurniture.id, { curve: parseInt(e.target.value, 10) }, 'Courbure rangée')}
                className="w-full"
              />

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 min-h-11 text-sm font-medium text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFurniture.aisleSplit === true}
                    onChange={(e) => updateFurniture(selectedFurniture.id, { aisleSplit: e.target.checked }, 'Allée de passage')}
                    className="rounded border-border size-4"
                  />
                  <span>Allée centrale de passage</span>
                </label>
                {selectedFurniture.aisleSplit && (
                  <span className="text-xs text-muted">Largeur 14%</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60">
                <Input
                  type="number"
                  inputMode="decimal"
                  label="Élévation gradin (m)"
                  step={0.05}
                  min={0}
                  max={4}
                  value={selectedFurniture.elevationM ?? 0}
                  onChange={(e) => updateFurniture(selectedFurniture.id, { elevationM: parseFloat(e.target.value) || 0 }, 'Élévation gradin')}
                />

                <label className="flex items-center gap-2 min-h-11 text-sm font-medium text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFurniture.showSeatNumbers !== false}
                    onChange={(e) => updateFurniture(selectedFurniture.id, { showSeatNumbers: e.target.checked }, 'Numéros sièges')}
                    className="rounded border-border size-4"
                  />
                  <span>Numéros de siège</span>
                </label>
              </div>
            </div>

            <div className="block text-xs space-y-1.5">
              <span className="font-semibold text-muted">Type de siège</span>
              <ChairTypePicker
                value={selectedFurniture.chairType}
                onChange={(chairType) => updateFurniture(selectedFurniture.id, { chairType })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs space-y-1">
                <span className="font-semibold text-muted">Style</span>
                <select
                  value={selectedFurniture.chairStyle ?? 'classic'}
                  onChange={(e) => updateFurniture(selectedFurniture.id, { chairStyle: e.target.value as ChairStyle })}
                  className={EDITOR_FIELD}
                >
                  {(Object.keys(chairStyleLabels) as ChairStyle[]).map((k) => (
                    <option key={k} value={k}>{chairStyleLabels[k]}</option>
                  ))}
                </select>
              </label>
              <div className="text-xs space-y-1">
                <span className="font-semibold text-muted">Matériau</span>
                <SeatMaterialPicker
                  value={selectedFurniture.seatMaterial ?? 'fabric'}
                  onChange={(seatMaterial) => updateFurniture(selectedFurniture.id, { seatMaterial })}
                />
              </div>
            </div>
            {caps.canCustomImages ? renderChairImageUpload(selectedFurniture.id, selectedFurniture.chairImageUrl) : null}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                type="button"
                onClick={duplicateSelection}
                className={cn(EDITOR_PANEL_BTN, 'border-border text-muted')}
              >
                <Copy className="w-3 h-3" /> Dupliquer
              </button>
              <button
                type="button"
                onClick={rotateSelection}
                className={cn(EDITOR_PANEL_BTN, 'border-border text-muted')}
              >
                <RotateCw className="w-3 h-3" /> Tourner 90°
              </button>
            </div>
          </div>
          <LayoutActionPanel actions={actionLog} />
        </div>
      );
    }

    if (selectedFurniture?.kind === 'zone') {
      return (
        <div className="space-y-3">
          <div className="p-4 bg-surface-muted rounded-[var(--radius-card)] border space-y-3">
            <p className="text-xs font-bold uppercase text-muted">
              {selectedFurniture.zoneKind === 'dance' ? 'Piste de danse' : selectedFurniture.zoneKind === 'carpet' ? 'Moquette' : 'Zone'}
            </p>
            <label className="block text-xs space-y-1">
              <span className="font-semibold text-muted">Libellé</span>
              <input value={selectedFurniture.label} onChange={(e) => updateFurniture(selectedFurniture.id, { label: e.target.value })} className="w-full px-3 py-2 rounded-[var(--radius-button)] border text-sm" />
            </label>
            <label className="block text-xs space-y-1">
              <span className="font-semibold text-muted">Type de zone</span>
              <select
                value={selectedFurniture.zoneKind ?? 'custom'}
                onChange={(e) => updateFurniture(selectedFurniture.id, { zoneKind: e.target.value as ZoneKind }, 'Type de zone modifié')}
                className={EDITOR_FIELD}
              >
                {(Object.keys(zoneKindLabels) as ZoneKind[]).map((k) => (
                  <option key={k} value={k}>{zoneKindLabels[k]}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs space-y-1">
              <span className="font-semibold text-muted">Matériau / sol</span>
              <ZoneMaterialPicker
                value={selectedFurniture.material ?? 'vinyl'}
                onChange={(material) => updateFurniture(selectedFurniture.id, { material }, 'Matériau de zone modifié')}
              />
            </label>
            <label className="block text-xs space-y-1">
              <span className="font-semibold text-muted">Teinte</span>
              <input
                type="color"
                value={selectedFurniture.color ?? '#312e81'}
                onChange={(e) => updateFurniture(selectedFurniture.id, { color: e.target.value }, 'Couleur de zone')}
                aria-label="Teinte de la zone"
                className="w-full min-h-11 rounded-[var(--radius-button)] border border-border cursor-pointer"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs space-y-1">
                <span className="font-semibold text-muted">Largeur %</span>
                <input type="number" min={8} max={90} value={selectedFurniture.w} onChange={(e) => updateFurniture(selectedFurniture.id, { w: parseInt(e.target.value, 10) || 20 })} className={EDITOR_FIELD} />
              </label>
              <label className="text-xs space-y-1">
                <span className="font-semibold text-muted">Profondeur %</span>
                <input type="number" min={8} max={90} value={selectedFurniture.h} onChange={(e) => updateFurniture(selectedFurniture.id, { h: parseInt(e.target.value, 10) || 16 })} className={EDITOR_FIELD} />
              </label>
            </div>
            <div className="space-y-2 pt-1 border-t border-border">
              <p className={EDITOR_HEADING}>Direction / placement</p>
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Déplacer la zone vers le haut"
                  onClick={() => updateFurniture(selectedFurniture.id, { y: Math.max(2, selectedFurniture.y - 3) }, 'Zone déplacée ↑')}
                  className={EDITOR_TOOL_ICON}
                >
                  <ArrowUp className="w-4 h-4" aria-hidden />
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Déplacer la zone vers la gauche"
                    onClick={() => updateFurniture(selectedFurniture.id, { x: Math.max(2, selectedFurniture.x - 3) }, 'Zone déplacée ←')}
                    className={EDITOR_TOOL_ICON}
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label="Centrer la zone"
                    onClick={() => updateFurniture(selectedFurniture.id, { x: 50 - selectedFurniture.w / 2, y: 50 - selectedFurniture.h / 2 }, 'Zone centrée')}
                    className={cn(EDITOR_TOOL_ICON, 'bg-primary/10 border-primary/40 text-primary')}
                  >
                    <Home className="w-4 h-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label="Déplacer la zone vers la droite"
                    onClick={() => updateFurniture(selectedFurniture.id, { x: Math.min(98 - selectedFurniture.w, selectedFurniture.x + 3) }, 'Zone déplacée →')}
                    className={EDITOR_TOOL_ICON}
                  >
                    <ArrowRight className="w-4 h-4" aria-hidden />
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="Déplacer la zone vers le bas"
                  onClick={() => updateFurniture(selectedFurniture.id, { y: Math.min(98 - selectedFurniture.h, selectedFurniture.y + 3) }, 'Zone déplacée ↓')}
                  className={EDITOR_TOOL_ICON}
                >
                  <ArrowDown className="w-4 h-4" aria-hidden />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {([
                  { deg: 0, label: 'Haut' },
                  { deg: 90, label: 'Droite' },
                  { deg: 180, label: 'Bas' },
                  { deg: 270, label: 'Gauche' },
                ] as const).map(({ deg, label }) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => updateFurniture(selectedFurniture.id, { rotation: deg }, `Orientation ${label}`)}
                    className={cn(
                      'min-h-11 rounded-[var(--radius-button)] border text-sm font-medium',
                      (selectedFurniture.rotation ?? 0) === deg
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'bg-surface text-muted',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className={EDITOR_HINT}>La flèche jaune dans la vue 3D indique l’orientation de la zone.</p>
            </div>
            <p className={EDITOR_HINT}>Glissez aussi la zone dans la vue 3D.</p>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                type="button"
                onClick={duplicateSelection}
                className={cn(EDITOR_PANEL_BTN, 'border-border text-muted')}
              >
                <Copy className="w-3 h-3" /> Dupliquer
              </button>
              <button
                type="button"
                onClick={rotateSelection}
                className={cn(EDITOR_PANEL_BTN, 'border-border text-muted')}
              >
                <RotateCw className="w-3 h-3" /> Tourner 90°
              </button>
            </div>
          </div>
          <LayoutActionPanel actions={actionLog} />
        </div>
      );
    }

    if (selectedFurniture?.kind === 'chair') {
      return (
        <div className="space-y-3">
          <div className="p-4 bg-surface-muted rounded-[var(--radius-card)] border space-y-3">
            <p className="text-xs font-bold uppercase text-muted">
              {selectedFurniture.chairType === 'ARMCHAIR' ? 'Fauteuil' : 'Chaise libre'}
            </p>
            <label className="block text-xs space-y-1">
              <span className="font-semibold text-muted">Libellé</span>
              <input value={selectedFurniture.label ?? ''} onChange={(e) => updateFurniture(selectedFurniture.id, { label: e.target.value })} className="w-full px-3 py-2 rounded-[var(--radius-button)] border text-sm" />
            </label>
            <div className="block text-xs space-y-1.5">
              <span className="font-semibold text-muted">Type</span>
              <ChairTypePicker
                value={selectedFurniture.chairType}
                onChange={(chairType) => updateFurniture(selectedFurniture.id, { chairType })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs space-y-1">
                <span className="font-semibold text-muted">Style</span>
                <select
                  value={selectedFurniture.chairStyle ?? 'lounge'}
                  onChange={(e) => updateFurniture(selectedFurniture.id, { chairStyle: e.target.value as ChairStyle }, 'Style siège')}
                  className={EDITOR_FIELD}
                >
                  {(Object.keys(chairStyleLabels) as ChairStyle[]).map((k) => (
                    <option key={k} value={k}>{chairStyleLabels[k]}</option>
                  ))}
                </select>
              </label>
              <div className="text-xs space-y-1">
                <span className="font-semibold text-muted">Matériau</span>
                <SeatMaterialPicker
                  value={selectedFurniture.seatMaterial ?? 'velvet'}
                  onChange={(seatMaterial) => updateFurniture(selectedFurniture.id, { seatMaterial }, 'Matériau siège')}
                />
              </div>
            </div>
            {caps.canRotate ? (
              <label className="block text-xs space-y-1">
                <span className="font-semibold text-muted">Rotation °</span>
                <input type="number" min={0} max={360} value={selectedFurniture.rotation ?? 0} onChange={(e) => updateFurniture(selectedFurniture.id, { rotation: parseFloat(e.target.value) || 0 })} className={EDITOR_FIELD} />
              </label>
            ) : null}
            {caps.canCustomImages ? renderChairImageUpload(selectedFurniture.id, selectedFurniture.chairImageUrl) : null}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={duplicateSelectedChair}
                className={cn(EDITOR_PANEL_BTN, 'border-border text-muted')}
              >
                <Copy className="w-3 h-3" /> Dupliquer
              </button>
              <button
                type="button"
                onClick={() => updateFurniture(selectedFurniture.id, { rotation: ((selectedFurniture.rotation ?? 0) + 90) % 360 }, 'Rotation +90°')}
                className={cn(EDITOR_PANEL_BTN, 'border-border text-muted')}
              >
                Tourner 90°
              </button>
            </div>
            {(() => {
              const surface = resolveFurnitureSurfaceAt(blueprint, selectedFurniture.x, selectedFurniture.y);
              if (!surface) {
                return (
                  <p className="text-xs text-muted">Glissez le siège sur une moquette, piste ou podium pour le poser dessus.</p>
                );
              }
              return (
                <Alert variant="info">
                  Posé sur « {surface.label} » ({surface.elevationM.toFixed(2)} m)
                </Alert>
              );
            })()}
            <p className="text-xs text-muted">Glissez la chaise librement dans la vue 3D.</p>
          </div>
          <LayoutActionPanel actions={actionLog} />
        </div>
      );
    }

    return null;
  };

  const templateBar = !readOnly && caps.canTemplates && (
    <details className="group rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden">
      <summary className="min-h-11 px-3 flex items-center justify-between gap-2 text-sm font-semibold text-foreground cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <LayoutTemplate className="w-3.5 h-3.5" aria-hidden /> Modèles de salle
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="px-3 pb-3 space-y-3 border-t border-border">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex items-center gap-2 min-h-11 text-sm text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={keepTemplateStyle}
            onChange={(e) => setKeepTemplateStyle(e.target.checked)}
            className="rounded border-border size-4"
          />
          Conserver thème et sol
        </label>
        <div className="w-[8.5rem]">
          <Input
            type="number"
            inputMode="numeric"
            label="Places au total"
            min={2}
            max={400}
            value={tplParams.totalSeats ?? 64}
            onChange={(e) => {
              const totalSeats = Math.max(2, parseInt(e.target.value, 10) || 2);
              const per = tplParams.seatsPerTable ?? 8;
              setTplParams((p) => ({
                ...p,
                totalSeats,
                tableCount: Math.max(1, Math.ceil(totalSeats / per)),
                rowCount: Math.max(1, Math.ceil(totalSeats / (p.seatsPerRow ?? per))),
              }));
            }}
            title="Cliquez ensuite un modèle pour générer ce nombre de places"
          />
        </div>
        <div className="w-[8.5rem]">
          <Input
            type="number"
            inputMode="numeric"
            label="Places / table"
            min={2}
            max={24}
            value={tplParams.seatsPerTable ?? 8}
            onChange={(e) => {
              const seatsPerTable = Math.max(2, parseInt(e.target.value, 10) || 2);
              const total = tplParams.totalSeats ?? 64;
              setTplParams((p) => ({
                ...p,
                seatsPerTable,
                seatsPerRow: seatsPerTable,
                tableCount: Math.max(1, Math.ceil(total / seatsPerTable)),
              }));
            }}
          />
        </div>
        <p className="text-sm text-muted pb-2">
          {Math.max(1, Math.ceil((tplParams.totalSeats ?? 64) / (tplParams.seatsPerTable ?? 8)))} tables · cliquez un modèle
        </p>
        <label className="block min-w-[8.5rem]">
          <span className="block text-xs font-semibold text-foreground mb-1.5">Forme</span>
          <select
            value={tplParams.tableShape ?? 'round'}
            onChange={(e) => setTplParams((p) => ({ ...p, tableShape: e.target.value as TableShape }))}
            className={EDITOR_FIELD}
          >
            {(Object.keys(tableShapeLabels) as TableShape[]).filter((shape) => caps.tableShapes.includes(shape)).map((shape) => (
              <option key={shape} value={shape}>{tableShapeLabels[shape]}</option>
            ))}
          </select>
        </label>
        <label className="block min-w-[8.5rem]">
          <span className="block text-xs font-semibold text-foreground mb-1.5">Chaises</span>
          <select
            value={tplParams.chairType ?? 'BANQUET'}
            onChange={(e) => setTplParams((p) => ({ ...p, chairType: e.target.value as ChairType }))}
            className={EDITOR_FIELD}
          >
            {Object.entries(chairTypeLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ROOM_LAYOUT_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => applyTemplate(tpl.id)}
            className={cn(
              'shrink-0 text-left min-h-11 px-3 py-2.5 rounded-[var(--radius-card)] border text-sm font-medium transition-colors min-w-[128px]',
              blueprint.templateId === tpl.id
                ? 'bg-primary/10 border-primary/50 text-primary'
                : 'bg-surface border-border text-muted hover:border-primary/30',
            )}
          >
            <span className="block">{tpl.name}</span>
            <span className="font-normal text-muted">{tpl.description}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border-subtle">
        <p className="text-sm font-semibold text-foreground shrink-0">Mes modèles</p>
        <div className="min-w-[140px] flex-1 max-w-[220px]">
          <Input
            label="Nom du modèle"
            value={customTplName}
            onChange={(e) => setCustomTplName(e.target.value)}
            placeholder="Nom du modèle"
          />
        </div>
        <button
          type="button"
          onClick={saveCurrentAsTemplate}
          className={cn(EDITOR_TOOL, EDITOR_TOOL_ON)}
        >
          <BookmarkPlus className="w-3 h-3" />
          Enregistrer le plan
        </button>
        {(blueprint.metadata.customTemplates ?? []).map((tpl) => (
          <span key={tpl.id} className="inline-flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => applyCustomTemplate(tpl.id)}
              className={cn(EDITOR_TOOL, blueprint.templateId === tpl.id ? EDITOR_TOOL_ON : EDITOR_TOOL_MUTED)}
              title={tpl.description || tpl.name}
            >
              {tpl.name}
            </button>
            <button
              type="button"
              onClick={() => updateBlueprint(deleteCustomTemplateFromBlueprint(blueprint, tpl.id), { message: `Modèle « ${tpl.name} » supprimé`, kind: 'template' })}
              className={EDITOR_TOOL_ICON}
              aria-label={`Supprimer le modèle ${tpl.name}`}
              title="Supprimer"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden />
            </button>
          </span>
        ))}
      </div>
      </div>
    </details>
  );

  const toolbar = !readOnly && (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start" role="toolbar" aria-label="Outils du plan">
      <ToolbarCluster label="Caméra">
      <button
        type="button"
        onClick={() => setLockOrbit((v) => !v)}
        title="Verrouiller / déverrouiller la caméra (Ctrl+L)"
        className={cn(EDITOR_TOOL, lockOrbit ? EDITOR_TOOL_ON : EDITOR_TOOL_MUTED)}
      >
        {lockOrbit ? <VideoOff className="w-3.5 h-3.5" aria-hidden /> : <Video className="w-3.5 h-3.5" aria-hidden />}
        {lockOrbit ? 'Caméra bloquée' : 'Caméra libre'}
      </button>
      <button
        type="button"
        onClick={() => {
          if (walkthroughActive) {
            setWalkthroughActive(false);
            setWalkthroughLabel('');
            return;
          }
          setLockOrbit(false);
          if (blueprint.metadata.presentationMode) {
            updateBlueprint({
              ...blueprint,
              metadata: { ...blueprint.metadata, presentationMode: false },
            }, { message: 'Présentation désactivée pour la visite', kind: 'settings' });
          }
          setWalkthroughActive(true);
          setWalkthroughLabel('Approche de l’entrée');
          log('Visite guidée démarrée', 'info');
        }}
        title="Entre par la porte et visite la salle en 3D"
        className={cn(EDITOR_TOOL, walkthroughActive ? EDITOR_TOOL_ON : EDITOR_TOOL_MUTED)}
      >
        <DoorOpen className="w-3.5 h-3.5" aria-hidden />
        {walkthroughActive ? (walkthroughLabel || 'Visite…') : 'Faire le tour'}
      </button>
      </ToolbarCluster>

      <ToolbarCluster label="Éditer">
      <button
        type="button"
        onClick={undo}
        disabled={!canUndo}
        title="Annuler (Ctrl+Z)"
        className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}
      >
        <Undo2 className="w-3.5 h-3.5" aria-hidden /> Annuler
      </button>
      <button
        type="button"
        onClick={redo}
        disabled={!canRedo}
        title="Rétablir (Ctrl+Y)"
        className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}
      >
        <Redo2 className="w-3.5 h-3.5" aria-hidden /> Rétablir
      </button>
      {onRegenerate && (
        <button type="button" onClick={() => { onRegenerate(); }} className={cn(EDITOR_TOOL, EDITOR_TOOL_ON)}>
          <RefreshCw className="w-3.5 h-3.5" aria-hidden /> Régénérer
        </button>
      )}
      {selection.length > 0 && (
        <button type="button" onClick={deleteSelected} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}>
          <Trash2 className="w-3.5 h-3.5" aria-hidden /> Supprimer{selection.length > 1 ? ` (${selection.length})` : ''}
        </button>
      )}
      </ToolbarCluster>

      <ToolbarCluster label="Réglages">
      <EditorToolGroup
        id="view"
        label="Vue"
        openId={toolbarGroup}
        onToggle={toggleToolbarGroup}
      >
      <label className={cn(EDITOR_TOOL, 'bg-surface-muted border-border text-muted')}>
        <Aperture className="w-3.5 h-3.5" aria-hidden />
        <select
          value={renderQuality}
          onChange={(e) => setRenderQuality(e.target.value as RenderQuality)}
          className="bg-transparent text-xs font-bold text-foreground outline-none"
          title="Qualité de rendu"
        >
          {(Object.keys(renderQualityLabels) as RenderQuality[])
            .filter((q) => q !== 'showcase' || caps.canShowcaseRender)
            .map((q) => (
            <option key={q} value={q}>{renderQualityLabels[q]}</option>
          ))}
        </select>
      </label>
      {caps.canShowcaseRender ? (
      <button
        type="button"
        onClick={() => {
          const next = !blueprint.metadata.presentationMode;
          updateBlueprint({
            ...blueprint,
            metadata: {
              ...blueprint.metadata,
              presentationMode: next,
              ...(next ? {
                showChandeliers: true,
                showUplights: true,
                renderQuality: 'showcase' as RenderQuality,
              } : {}),
            },
          }, { message: next ? 'Mode présentation activé' : 'Mode présentation désactivé', kind: 'settings' });
          if (next) {
            setLockOrbit(false);
            setWalkthroughActive(false);
          }
        }}
        title="Orbit automatique, ambiance, sans labels"
        className={cn(EDITOR_TOOL, blueprint.metadata.presentationMode ? EDITOR_TOOL_ON : EDITOR_TOOL_MUTED)}
      >
        <Presentation className="w-3.5 h-3.5" aria-hidden />
        {blueprint.metadata.presentationMode ? 'Présentation ON' : 'Présentation'}
      </button>
      ) : null}
      <button
        type="button"
        onClick={exportShowcasePng}
        className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}
        title="Exporter une capture PNG haute définition"
      >
        <Download className="w-3.5 h-3.5" aria-hidden /> Export PNG
      </button>
      </EditorToolGroup>

      <EditorToolGroup
        id="light"
        label="Lumière"
        openId={toolbarGroup}
        onToggle={toggleToolbarGroup}
      >
      <label className={cn(EDITOR_TOOL, 'bg-surface-muted border-border text-muted')}>
        <Sun className="w-3.5 h-3.5" aria-hidden />
        <select
          value={lightingPreset}
          onChange={(e) => setLightingPreset(e.target.value as LightingPreset)}
          className="bg-transparent text-xs font-bold text-foreground outline-none max-w-[140px]"
          title="Éclairage scénique"
        >
          {lightingPresetGroups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.presets.map((p) => (
                <option key={p} value={p}>{lightingPresetLabels[p]}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => setLightingPreset('day')}
        title="Soleil de midi — lumière zénithale, ombres franches"
        className={cn(EDITOR_TOOL, lightingPreset === 'day' ? EDITOR_TOOL_ON : EDITOR_TOOL_MUTED)}
      >
        <Sun className="w-3.5 h-3.5" aria-hidden />
        Midi
      </button>
      <button
        type="button"
        onClick={() => setLightingPreset('dusk')}
        title="Crépuscule — ciel orange / rose / violet, lumière latérale douce"
        className={cn(EDITOR_TOOL, lightingPreset === 'dusk' ? EDITOR_TOOL_ON : EDITOR_TOOL_MUTED)}
      >
        Crépuscule
      </button>
      <button
        type="button"
        onClick={() => setLightingPreset('night')}
        title="Nuit — ciel étoilé + réglette LED sur le haut du plan"
        className={cn(EDITOR_TOOL, lightingPreset === 'night' ? EDITOR_TOOL_ON : EDITOR_TOOL_MUTED)}
      >
        <Moon className="w-3.5 h-3.5" aria-hidden />
        Nuit LED
      </button>
      </EditorToolGroup>
      </ToolbarCluster>

      <ToolbarCluster label="Ajouter">
      <EditorToolGroup
        id="furniture"
        label="Mobilier"
        openId={toolbarGroup}
        onToggle={toggleToolbarGroup}
      >
      <button type="button" onClick={addTable} className={cn(EDITOR_TOOL, EDITOR_TOOL_PRIMARY)}>
        <Plus className="w-3.5 h-3.5" aria-hidden /> Table
      </button>
      {caps.tableShapes.includes('arc') ? (
        <button
          type="button"
          onClick={addArcRing}
          className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}
          title="Six tables en arc autour d’un centre"
        >
          Anneau d’arcs
        </button>
      ) : null}
      {caps.canAddRows ? (
        <>
          <button type="button" onClick={addRow} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}>
            <Plus className="w-3.5 h-3.5" aria-hidden /> Rangée
          </button>
          <button
            type="button"
            onClick={() => setQuickCreate(quickCreate === 'amphitheater' ? null : 'amphitheater')}
            className={cn(EDITOR_TOOL, quickCreate === 'amphitheater' ? EDITOR_TOOL_ON : EDITOR_TOOL_IDLE)}
            title="Générateur d’amphithéâtre et gradins en arc (Pinterest)"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden /> Amphithéâtre…
          </button>
          <button
            type="button"
            onClick={() => setQuickCreate(quickCreate === 'chairs' ? null : 'chairs')}
            className={cn(EDITOR_TOOL, quickCreate === 'chairs' ? EDITOR_TOOL_ON : EDITOR_TOOL_IDLE)}
            title="Créer plusieurs groupes de chaises en une fois"
          >
            Groupes chaises
          </button>
        </>
      ) : null}
      <button type="button" onClick={addFreeChair} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}>Fauteuil</button>
      </EditorToolGroup>

      <EditorToolGroup
        id="zones"
        label="Zones"
        openId={toolbarGroup}
        onToggle={toggleToolbarGroup}
      >
      {caps.canZones ? (
        <>
          <button type="button" onClick={() => addZone('Piste de danse', { zoneKind: 'dance', material: 'vinyl' })} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}>Piste</button>
          <button type="button" onClick={() => addZone('Espace VIP', { zoneKind: 'vip', material: 'marble' })} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}>VIP</button>
          <button type="button" onClick={() => addZone('Zone buffet', { zoneKind: 'buffet', material: 'wood' })} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}>Zone buffet</button>
          <button type="button" onClick={addCarpet} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}>Moquette</button>
        </>
      ) : null}
      </EditorToolGroup>

      <EditorToolGroup
        id="building"
        label="Bâtiment"
        openId={toolbarGroup}
        onToggle={toggleToolbarGroup}
      >
      {caps.canCustomImages ? (
        <label className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE, 'cursor-pointer')}>
          <ImagePlus className="w-3.5 h-3.5" aria-hidden />
          Importer plan
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await importRoomPlanImage(file);
              e.target.value = '';
            }}
          />
        </label>
      ) : null}
      {caps.canPlanFromPhoto ? (
        <button
          type="button"
          disabled={readOnly || aiPlanReading}
          aria-busy={aiPlanReading || undefined}
          onClick={() => {
            if (blueprint.metadata.floorImageUrl) {
              void readRoomPlanWithAi();
              return;
            }
            aiPlanFileRef.current?.click();
          }}
          className={cn(EDITOR_TOOL, aiPlanReading ? EDITOR_TOOL_ON : EDITOR_TOOL_IDLE)}
          title={`Lire le plan visible avec l’IA (${AI_ROOM_PLAN_TOKEN_COST} jetons)`}
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden />
          {aiPlanReading ? 'Lecture IA…' : 'Lire avec l’IA'}
        </button>
      ) : null}
      <button type="button" onClick={clearWalls} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}>Sans murs</button>
      {caps.fixtureKinds.includes('door') ? (
        <button
          type="button"
          onClick={() => setQuickCreate(quickCreate === 'doors' ? null : 'doors')}
          className={cn(EDITOR_TOOL, quickCreate === 'doors' ? EDITOR_TOOL_ON : EDITOR_TOOL_IDLE)}
          title="Ajouter une porte ouvrante ou grand portail"
        >
          <DoorOpen className="w-3.5 h-3.5" aria-hidden /> Portes…
        </button>
      ) : null}
      {caps.fixtureKinds.includes('stairs') ? (
        <button
          type="button"
          onClick={openStairsQuickCreate}
          className={cn(EDITOR_TOOL, quickCreate === 'stairs' ? EDITOR_TOOL_ON : EDITOR_TOOL_IDLE)}
          title="Escalier vers un autre étage"
        >
          <StepForward className="w-3.5 h-3.5" aria-hidden /> Escalier vers…
        </button>
      ) : null}
      {caps.fixtureKinds.includes('balcony') ? (
        <button
          type="button"
          onClick={() => setQuickCreate(quickCreate === 'balconies' ? null : 'balconies')}
          className={cn(EDITOR_TOOL, quickCreate === 'balconies' ? EDITOR_TOOL_ON : EDITOR_TOOL_IDLE)}
        >
          Balcons…
        </button>
      ) : null}
      {caps.fixtureKinds.includes('column') ? (
        <button type="button" onClick={() => addFixture('column')} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}>
          <Columns3 className="w-3.5 h-3.5" aria-hidden /> Colonne
        </button>
      ) : null}
      {caps.fixtureKinds.includes('corridor') ? (
        <button
          type="button"
          onClick={addCorridor}
          className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}
          title="Couloir structurant (circulation entre pièces)"
        >
          Couloir
        </button>
      ) : null}
      {caps.fixtureKinds.includes('perimeter') ? (
        <button type="button" onClick={() => addFixture('perimeter')} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}>Périmètre</button>
      ) : null}
      </EditorToolGroup>

      <EditorToolGroup
        id="scene"
        label="Décor"
        openId={toolbarGroup}
        onToggle={toggleToolbarGroup}
      >
      {caps.fixtureKinds.includes('stage') ? (
        <button type="button" onClick={() => addFixture('stage')} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}>Scène</button>
      ) : null}
      {caps.fixtureKinds.includes('podium') ? (
        <button type="button" onClick={() => addFixture('podium')} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}>Podium</button>
      ) : null}
      {caps.fixtureKinds.includes('chandelier') ? (
        <button
          type="button"
          onClick={() => setQuickCreate(quickCreate === 'chandeliers' ? null : 'chandeliers')}
          className={cn(EDITOR_TOOL, quickCreate === 'chandeliers' ? EDITOR_TOOL_ON : EDITOR_TOOL_IDLE)}
          title="Lustres de cristal, halos dorés, suspensions pampa"
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden /> Lustres…
        </button>
      ) : null}
      {caps.fixtureKinds.includes('aisle') ? (
        <button
          type="button"
          onClick={() => setQuickCreate(quickCreate === 'aisles' ? null : 'aisles')}
          className={cn(EDITOR_TOOL, quickCreate === 'aisles' ? EDITOR_TOOL_ON : EDITOR_TOOL_IDLE)}
          title="Tapis rouge royal, allée miroir blanc, lin & pétales"
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden /> Allées VIP…
        </button>
      ) : null}
      {caps.fixtureKinds.includes('buffet') ? (
        <button type="button" onClick={() => addFixture('buffet')} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}>Buffet + couverts</button>
      ) : null}
      {caps.fixtureKinds.includes('flower') ? (
        <button type="button" onClick={() => addFixture('flower')} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}>
          <Flower2 className="w-3.5 h-3.5" aria-hidden /> Fleurs
        </button>
      ) : null}
      {caps.fixtureKinds.includes('arch') ? (
        <button
          type="button"
          onClick={() => addFixture('arch')}
          className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}
          title="Arche florale (cérémonie, fond de salle)"
        >
          <Flower2 className="w-3.5 h-3.5" aria-hidden /> Arche
        </button>
      ) : null}
      {caps.fixtureKinds.includes('partition') ? (
        <button
          type="button"
          onClick={() => addFixture('partition')}
          className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}
          title="Cloison basse courbe végétalisée"
        >
          Cloison
        </button>
      ) : null}
      {caps.fixtureKinds.includes('pedestal') ? (
        <button
          type="button"
          onClick={() => addFixture('pedestal')}
          className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}
          title="Colonne carrée + bouquet (cérémonie)"
        >
          Piédestal
        </button>
      ) : null}
      {caps.fixtureKinds.includes('decal') ? (
        <button
          type="button"
          onClick={() => addFixture('decal')}
          className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}
          title="Motif au sol : roses ou papillons"
        >
          Motif sol
        </button>
      ) : null}
      {caps.fixtureKinds.includes('stringLight') ? (
        <button type="button" onClick={() => addFixture('stringLight')} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)} title="Guirlandes Edison sur poteaux">
          Guirlandes
        </button>
      ) : null}
      {caps.fixtureKinds.includes('fountain') ? (
        <button type="button" onClick={() => addFixture('fountain')} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}>
          Fontaine
        </button>
      ) : null}
      {caps.fixtureKinds.includes('gazebo') ? (
        <button type="button" onClick={() => addFixture('gazebo')} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}>
          Gloriette
        </button>
      ) : null}
      {caps.fixtureKinds.includes('djBooth') ? (
        <button type="button" onClick={() => addFixture('djBooth')} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}>
          Régie DJ
        </button>
      ) : null}
      {caps.fixtureKinds.includes('screen') ? (
        <button type="button" onClick={() => addFixture('screen')} className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}>
          Écran
        </button>
      ) : null}
      </EditorToolGroup>
      </ToolbarCluster>
    </div>
  );

  const quickCreatePanel = quickCreate ? (
    <div className="flex flex-wrap items-end gap-3 p-3 rounded-[var(--radius-card)] border border-border bg-surface-muted/60">
      {/* ───────── GÉNÉRATEUR D’AMPHITHÉÂTRE & GRADINS (PINTEREST) ───────── */}
      {quickCreate === 'amphitheater' && (
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div>
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" aria-hidden />
                Générateur d’Amphithéâtre & Gradins Étagés
              </h4>
              <p className="text-xs text-muted">
                Disposition fluide en arcs concentriques avec élévation et allée centrale de passage
              </p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
              Design scénique
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <label className="text-xs font-semibold text-foreground space-y-1">
              <span>Configuration d’arc</span>
              <select
                value={amphiStyle}
                onChange={(e) => setAmphiStyle(e.target.value as AmphitheaterStyle)}
                className={EDITOR_FIELD}
              >
                {(Object.keys(amphitheaterStyleLabels) as AmphitheaterStyle[]).map((st) => (
                  <option key={st} value={st}>
                    {amphitheaterStyleLabels[st]}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-foreground space-y-1">
              <span>Nombre de gradins</span>
              <input
                type="number"
                min={2}
                max={10}
                value={amphiTiers}
                onChange={(e) => setAmphiTiers(Math.max(2, Math.min(10, parseInt(e.target.value, 10) || 2)))}
                className={EDITOR_FIELD}
              />
            </label>

            <label className="text-xs font-semibold text-foreground space-y-1">
              <span>Sièges de base / rang</span>
              <input
                type="number"
                min={4}
                max={30}
                value={amphiSeatsPerRow}
                onChange={(e) => setAmphiSeatsPerRow(Math.max(4, Math.min(30, parseInt(e.target.value, 10) || 4)))}
                className={EDITOR_FIELD}
              />
            </label>

            <label className="text-xs font-semibold text-foreground space-y-1">
              <span>Type de siège</span>
              <select
                value={amphiChairType}
                onChange={(e) => setAmphiChairType(e.target.value as ChairType)}
                className={EDITOR_FIELD}
              >
                <option value="THEATER">Fauteuil Théâtre velours</option>
                <option value="ARMCHAIR">Fauteuil Club VIP</option>
                <option value="BANQUET">Chaise Banquet</option>
                <option value="CROSSBACK">Crossback Bois</option>
                <option value="GHOST">Ghost transparent</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border">
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 font-semibold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={amphiAisleSplit}
                  onChange={(e) => setAmphiAisleSplit(e.target.checked)}
                  className="rounded border-border text-primary"
                />
                <span>Allée centrale de passage</span>
              </label>

              <span className="text-[11px] text-muted">
                Capacité totale estimée : <strong className="text-foreground">{estimateAmphitheaterSeats(amphiStyle, amphiTiers, amphiSeatsPerRow)} places</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={addAmphitheaterQuick}
              className={cn(EDITOR_TOOL, EDITOR_TOOL_PRIMARY)}
            >
              <Sparkles className="w-4 h-4" aria-hidden />
              Générer l’amphithéâtre
            </button>
          </div>
        </div>
      )}

      {/* ───────── PORTES & ENTRÉES D’ACCUEIL (PINTEREST) ───────── */}
      {quickCreate === 'doors' && (
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div>
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <DoorOpen className="w-4 h-4 text-primary" aria-hidden />
                Styles de Portes & Entrées (Inspiration Pinterest)
              </h4>
              <p className="text-xs text-muted">
                Portails royaux, doubles portes françaises à croisillons, portes de grange et sas VIP
              </p>
            </div>
            <button
              type="button"
              onClick={() => setQuickCreate(null)}
              className={cn(EDITOR_TOOL, EDITOR_TOOL_MUTED)}
            >
              Fermer
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {(
              [
                ['frenchDoor', 'Porte française', 'Croisillons chic'],
                ['grandPortal', 'Portail royal doré', 'Ornements or'],
                ['barnDoor', 'Bois de grange', 'Rail métal noir'],
                ['velvetCurtain', 'Sas velours VIP', 'Drapé théâtral'],
                ['double', 'Double battante', 'Classique mouluré'],
                ['fireExit', 'Sortie secours', 'Badge vert LED'],
              ] as const
            ).map(([style, label, hint]) => (
              <button
                key={style}
                type="button"
                onClick={() => addDoorFixture(style)}
                className={EDITOR_PICK}
              >
                <div>
                  <p className="text-xs font-bold text-foreground">{label}</p>
                  <p className="text-xs text-muted mt-0.5">{hint}</p>
                </div>
                <span className="text-xs font-bold text-primary mt-2">
                  + Placer
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ───────── LUSTRES & SUSPENSIONS (PINTEREST) ───────── */}
      {quickCreate === 'chandeliers' && (
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div>
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" aria-hidden />
                Lustres & Suspensions Décoratives (Inspiration Pinterest)
              </h4>
              <p className="text-xs text-muted">
                Cascades de cristal scintillantes, suspensions rotin pampa, halos dorés et couronnes florales
              </p>
            </div>
            <button
              type="button"
              onClick={() => setQuickCreate(null)}
              className={cn(EDITOR_TOOL, EDITOR_TOOL_MUTED)}
            >
              Fermer
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {(
              [
                ['crystalCascade', 'Cascade Cristal', 'Pampilles scintillantes'],
                ['brassRings', 'Halos Laiton', 'Anneaux d’or brossé'],
                ['bohoPampas', 'Rotin & Pampa', 'Bohème chic naturel'],
                ['botanicalHalo', 'Couronne Florale', 'Roses & feuillages'],
                ['fairyCanopy', 'Ciel Étoilé', 'Micro-LEDs féériques'],
                ['candleCandelabra', 'Candélabre Grand Siècle', 'Bougies château'],
              ] as const
            ).map(([style, label, hint]) => (
              <button
                key={style}
                type="button"
                onClick={() => addChandelierFixture(style)}
                className={EDITOR_PICK}
              >
                <div>
                  <p className="text-xs font-bold text-foreground">{label}</p>
                  <p className="text-xs text-muted mt-0.5">{hint}</p>
                </div>
                <span className="text-xs font-bold text-primary mt-2">
                  + Suspendre
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ───────── ALLÉES & TAPIS DE PRESTIGE (PINTEREST) ───────── */}
      {quickCreate === 'aisles' && (
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div>
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden />
                Allées d’Honneur & Tapis de Cérémonie (Inspiration Pinterest)
              </h4>
              <p className="text-xs text-muted">
                Tapis rouge royal avec ganse or, allée miroir blanc, lin poudré & pétales, plancher chêne
              </p>
            </div>
            <button
              type="button"
              onClick={() => setQuickCreate(null)}
              className={cn(EDITOR_TOOL, EDITOR_TOOL_MUTED)}
            >
              Fermer
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {(
              [
                ['royalRed', 'Tapis Rouge Royal', 'Ganse or & velours'],
                ['whiteMirror', 'Miroir Blanc Laqué', 'Reflet haute couture'],
                ['botanicalRunner', 'Lin & Pétales', 'Bohème romantique'],
                ['rusticWood', 'Plancher Chêne', 'Lames de bois vintage'],
                ['damaskGold', 'Brocart Damas Or', 'Baroque prestigieux'],
                ['ledRunway', 'Catwalk LED', 'Bandes néon modernes'],
                ['blackVelvet', 'Velours Noir', 'Gala contrasté'],
              ] as const
            ).map(([style, label, hint]) => (
              <button
                key={style}
                type="button"
                onClick={() => addAisleCustomStyle(style)}
                className={EDITOR_PICK}
              >
                <div>
                  <p className="text-xs font-bold text-foreground">{label}</p>
                  <p className="text-xs text-muted mt-0.5">{hint}</p>
                </div>
                <span className="text-xs font-bold text-primary mt-1.5">
                  + Poser
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-1 border-t border-border text-xs">
            <label className="text-xs font-semibold text-foreground flex items-center gap-2">
              <span>Nombre d’allées parallèles :</span>
              <input
                type="number"
                min={1}
                max={12}
                value={aisleCount}
                onChange={(e) => setAisleCount(Math.max(1, Math.min(12, parseInt(e.target.value, 10) || 1)))}
                className="w-16 px-2 py-1 rounded border border-border text-xs font-bold text-foreground bg-surface"
              />
            </label>
            <button
              type="button"
              onClick={addAislesQuick}
              className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}
            >
              Générer {aisleCount} allée{aisleCount > 1 ? 's' : ''} standard
            </button>
          </div>
        </div>
      )}
      {quickCreate === 'chairs' && (
        <>
          <label className="text-xs font-semibold text-foreground space-y-1">
            <span>Groupes</span>
            <input
              type="number"
              min={1}
              max={8}
              value={chairGroups}
              onChange={(e) => setChairGroups(Math.max(1, Math.min(8, parseInt(e.target.value, 10) || 1)))}
              className="block w-20 px-2 py-1.5 rounded border border-border text-sm font-bold text-foreground bg-surface"
            />
          </label>
          <label className="text-xs font-semibold text-foreground space-y-1">
            <span>Rangées / groupe</span>
            <input
              type="number"
              min={1}
              max={20}
              value={rowsPerGroup}
              onChange={(e) => setRowsPerGroup(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))}
              className="block w-20 px-2 py-1.5 rounded border border-border text-sm font-bold text-foreground bg-surface"
            />
          </label>
          <label className="text-xs font-semibold text-foreground space-y-1">
            <span>Sièges / rangée</span>
            <input
              type="number"
              min={2}
              max={40}
              value={seatsPerRow}
              onChange={(e) => setSeatsPerRow(Math.max(2, Math.min(40, parseInt(e.target.value, 10) || 2)))}
              className="block w-20 px-2 py-1.5 rounded border border-border text-sm font-bold text-foreground bg-surface"
            />
          </label>
          <p className="text-xs text-muted self-center">
            = {chairGroups * rowsPerGroup} rangées · {chairGroups * rowsPerGroup * seatsPerRow} places
          </p>
          <button
            type="button"
            onClick={addChairGroupsQuick}
            className={cn(EDITOR_TOOL, EDITOR_TOOL_PRIMARY)}
          >
            Créer les groupes
          </button>
        </>
      )}
      {quickCreate === 'stairs' && (
        <>
          <p className="text-[11px] text-muted self-center">
            Depuis <span className="font-semibold text-foreground">{resolveStories(blueprint).find((s) => s.id === resolveActiveStoryId(blueprint))?.label ?? 'RDC'}</span>, créer un escalier vers :
          </p>
          {resolveStories(blueprint)
            .filter((s) => s.id !== resolveActiveStoryId(blueprint))
            .map((story) => (
              <button
                key={story.id}
                type="button"
                onClick={() => addStairsToStory(story.id)}
                className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}
              >
                <StepForward className="w-3.5 h-3.5" aria-hidden />
                {story.label}
              </button>
            ))}
          {resolveStories(blueprint).length < 2 ? (
            <button
              type="button"
              onClick={() => {
                const next = addStory(blueprint);
                updateBlueprint(setStackView(next, false), { message: 'Nouvel étage ajouté', kind: 'add' });
                setAccordion('batiment');
              }}
              className={cn(EDITOR_TOOL, EDITOR_TOOL_PRIMARY)}
            >
              + Créer un étage d’abord
            </button>
          ) : null}
        </>
      )}
      {quickCreate === 'balconies' && (
        <>
          <p className="text-[11px] text-muted self-center">Balcon sur l’étage actif :</p>
          {(Object.keys(balconySideLabels) as BalconySide[]).map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => {
                addBalconyOnSide(side);
                setQuickCreate(null);
              }}
              className={cn(EDITOR_TOOL, EDITOR_TOOL_IDLE)}
            >
              {balconySideLabels[side]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              addAllFacadesBalconies();
              setQuickCreate(null);
            }}
            className={cn(EDITOR_TOOL, EDITOR_TOOL_ON)}
          >
            4 façades
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => setQuickCreate(null)}
        className={cn(EDITOR_TOOL, EDITOR_TOOL_MUTED, 'ml-auto')}
      >
        Fermer
      </button>
    </div>
  ) : null;

  const stories = resolveStories(blueprint);
  const activeStory = stories.find((s) => s.id === resolveActiveStoryId(blueprint));
  const storyBar = (
    <div className="flex flex-wrap items-center gap-2 px-2.5 py-2 rounded-[var(--radius-card)] border border-border bg-surface-muted/50">
      <span className="text-xs font-bold uppercase tracking-wide text-muted shrink-0">Étage</span>
      <div className="flex flex-wrap gap-1">
        {stories.map((story) => (
          <button
            key={story.id}
            type="button"
            onClick={() => {
              updateBlueprint(
                setStackView(setActiveStory(blueprint, story.id), false),
                { message: `Édition : ${story.label}`, kind: 'settings' },
              );
              setSelection([]);
            }}
            className={cn(
              EDITOR_TOOL,
              !blueprint.metadata.stackView && resolveActiveStoryId(blueprint) === story.id
                ? EDITOR_TOOL_PRIMARY
                : EDITOR_TOOL_MUTED,
            )}
          >
            {story.label}
          </button>
        ))}
        {!readOnly ? (
          <button
            type="button"
            onClick={() => {
              const next = addStory(blueprint);
              updateBlueprint(setStackView(next, false), { message: 'Nouvel étage ajouté', kind: 'add' });
              setSelection([]);
              setAccordion('batiment');
            }}
            className={cn(EDITOR_TOOL, EDITOR_TOOL_MUTED, 'border-dashed')}
            aria-label="Ajouter un étage"
          >
            +
          </button>
        ) : null}
      </div>
      <div className="h-4 w-px bg-border mx-0.5 hidden sm:block" />
      <button
        type="button"
        onClick={() => {
          if (!blueprint.metadata.stackView && resolveStories(blueprint).length < 2) {
            const next = addStory(blueprint);
            updateBlueprint(setStackView(next, true), {
              message: 'Étage ajouté — vue empilée',
              kind: 'add',
            });
            return;
          }
          const next = !blueprint.metadata.stackView;
          updateBlueprint(setStackView(blueprint, next), {
            message: next ? 'Étages empilés affichés' : 'Vue étage unique',
            kind: 'settings',
          });
        }}
        className={cn(
          EDITOR_TOOL,
          'ml-auto sm:ml-0',
          blueprint.metadata.stackView ? EDITOR_TOOL_ON : EDITOR_TOOL_MUTED,
        )}
        title="Afficher les étages empilés les uns sur les autres"
      >
        <Eye className="w-3.5 h-3.5" aria-hidden />
        {blueprint.metadata.stackView ? 'Empilés · ON' : 'Empiler'}
      </button>
      <p className="text-xs text-muted w-full sm:w-auto sm:ml-1">
        {blueprint.metadata.stackView
          ? 'Étages empilés en 3D'
          : `Édition : ${activeStory?.label ?? 'RDC'}`}
      </p>
    </div>
  );

  const header = (
    <div className="flex items-center justify-between gap-2 shrink-0">
      <p className="text-sm font-semibold text-foreground truncate min-w-0">
        Plan — {roomTypeLabels[blueprint.roomType as RoomType]} · {blueprint.metadata.totalSeats} places
      </p>
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className={cn(EDITOR_TOOL, EDITOR_TOOL_MUTED)}
      >
        {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        {isExpanded ? 'Réduire' : 'Agrandir'}
      </button>
    </div>
  );

  const ambiencePreviewModal = (
    <RoomAmbiencePreviewModal
      open={Boolean(ambiencePreviewPreset)}
      onClose={() => setAmbiencePreviewPreset(null)}
      blueprint={blueprint}
      preset={ambiencePreviewPreset ?? ROOM_AMBIENCE_PRESETS[0]}
      onApply={(scope) => {
        if (ambiencePreviewPreset) applyAmbience(ambiencePreviewPreset, scope);
      }}
    />
  );

  const aiPlanFileInput = caps.canPlanFromPhoto && !readOnly ? (
    <input
      ref={aiPlanFileRef}
      type="file"
      accept="image/*"
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={async (e) => {
        const file = e.target.files?.[0];
        if (file) await readRoomPlanWithAi(file);
        e.target.value = '';
      }}
    />
  ) : null;

  if (isExpanded) {
    return (
      <>
        {aiPlanFileInput}
        {ambiencePreviewModal}
        <ImageCropModal
          open={Boolean(cropTarget)}
          onClose={() => setCropTarget(null)}
          onApply={handleCropApply}
          title={cropFixture?.kind === 'stage' ? 'Image de la scène' : cropFixture?.kind === 'flower' ? 'Image florale' : 'Image personnalisée'}
          initialImageUrl={cropFixture?.imageUrl}
          initialCrop={cropFixture?.imageCrop}
        />
        <div className="fixed inset-0 z-[70] bg-background/70 backdrop-blur-sm flex flex-col p-1.5 sm:p-3">
          <div className="bg-background sm:bg-surface rounded-none sm:rounded-2xl shadow-2xl flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="p-2.5 sm:p-4 space-y-2 sm:space-y-3 border-b border-border-subtle shrink-0">
              {header}
              {templateBar}
              {toolbar}
              {quickCreatePanel}
            </div>
            <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-2 sm:gap-3 p-2 sm:p-3 overflow-hidden">
              <div className="flex-1 min-w-0 min-h-[50dvh] md:min-h-0 flex flex-col gap-2">
                {storyBar}
                {renderCanvas('flex-1 min-h-0 h-full')}
              </div>
              <div className="md:flex-1 md:min-w-[240px] md:max-w-[320px] max-h-[34dvh] md:max-h-none overflow-y-auto shrink-0 space-y-3 contain-layout contain-paint">
                {renderCanvasInventory()}
                {renderEditPanel()}
              </div>
            </div>
            <div className="p-2 sm:p-3 border-t border-border-subtle flex justify-end shrink-0">
              <button type="button" onClick={() => setIsExpanded(false)} className="px-5 py-2.5 bg-surface-muted text-foreground rounded-[var(--radius-card)] text-xs font-bold">Fermer le mode agrandi</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {aiPlanFileInput}
      {ambiencePreviewModal}
      <ImageCropModal
        open={Boolean(cropTarget)}
        onClose={() => setCropTarget(null)}
        onApply={handleCropApply}
        title={cropFixture?.kind === 'stage' ? 'Image de la scène' : cropFixture?.kind === 'flower' ? 'Image florale' : 'Image de la colonne'}
        initialImageUrl={cropFixture?.imageUrl}
        initialCrop={cropFixture?.imageCrop}
      />
      <div className="space-y-3">
        {header}
        {templateBar}
        {toolbar}
        {quickCreatePanel}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
          <div className="lg:col-span-2 min-h-0 space-y-2">
            {storyBar}
            {renderCanvas('em-plan-stage min-h-[min(58vh,32rem)] lg:min-h-[min(64vh,40rem)]')}
          </div>
          <div className="max-h-[36dvh] lg:max-h-[520px] overflow-y-auto space-y-3 contain-layout contain-paint">
            {renderCanvasInventory()}
            {renderEditPanel()}
          </div>
        </div>
      </div>
    </>
  );
}
