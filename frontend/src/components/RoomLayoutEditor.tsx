'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Plus, Trash2, RefreshCw, Maximize2, Minimize2, Move, LayoutGrid, LayoutTemplate, Shapes, Columns3, ImagePlus, Flower2, Palette, Sparkles, Layers, Copy, Lock, Unlock, Ruler, Circle, Columns2, BoxSelect, Eye, BookmarkPlus, BrickWall, Undo2, Redo2, VideoOff, Video,
} from 'lucide-react';
import LayoutActionPanel from '@/components/LayoutActionPanel';
import ImageCropModal from '@/components/ImageCropModal';
import RoomWebGLViewer from '@/components/RoomWebGLViewer';
import RoomWallEditorPanel from '@/components/RoomWallEditorPanel';
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
  applyTableStyleToAll,
  autoArrangeTables,
  arrangeDensityLabels,
  chairTypeLabels,
  chairStyleLabels,
  seatMaterialLabels,
  zoneKindLabels,
  zoneMaterialLabels,
  createBlueprintChair,
  createBlueprintFixture,
  createBlueprintRow,
  createBlueprintTable,
  createBlueprintZone,
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
  wallsFromRoomOutline,
  type ArrangeDensity,
  type ChairStyle,
  type LayoutParams,
  type SeatMaterial,
  type TableArrangePreset,
  type ZoneKind,
  type ZoneMaterial,
} from '@/lib/roomLayoutUtils';
import { roomEditorCapabilities, snapLayoutPct } from '@/lib/roomEditorAccess';
import { prependLayoutAction, LayoutActionEntry } from '@/lib/layoutActionLog';
import { readImageFile } from '@/lib/imageCropUtils';
import { applyRoomTheme, getRoomTheme, listAvailableThemes, RoomThemeId, type FloorType } from '@/lib/roomThemeUtils';
import { floorTypeLabels, resolveDepthAmount, resolveFloorStyle } from '@/lib/roomFloorUtils';
import CustomRoomThemePanel from '@/components/CustomRoomThemePanel';
import { cn } from '@/lib/cn';

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
}

type CropTarget = { kind: 'fixture'; id: string } | null;

export default function RoomLayoutEditor({
  blueprint: rawBlueprint,
  onChange,
  onRegenerate,
  readOnly = false,
  allowThemesFixtures = true,
  editorLevel = 'complete',
}: RoomLayoutEditorProps) {
  const blueprint = ensureBlueprintDefaults(rawBlueprint);
  const caps = roomEditorCapabilities(editorLevel, allowThemesFixtures);
  const [selected, setSelected] = useState<{ kind: SelectableKind; id: string } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [actionLog, setActionLog] = useState<LayoutActionEntry[]>([]);
  const [cropTarget, setCropTarget] = useState<CropTarget>(null);
  const [arrangeDensity, setArrangeDensity] = useState<ArrangeDensity>('comfortable');
  const [keepTemplateStyle, setKeepTemplateStyle] = useState(true);
  const [keepThemeFloor, setKeepThemeFloor] = useState(false);
  const [accordion, setAccordion] = useState<string>('murs-sols');
  const [wallEditMode, setWallEditMode] = useState(false);
  const [lockOrbit, setLockOrbit] = useState(true);
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

  const log = useCallback((message: string, kind: LayoutActionEntry['kind'] = 'info') => {
    setActionLog((prev) => prependLayoutAction(prev, message, kind));
  }, []);

  const updateBlueprint = (next: RoomLayoutBlueprint, action?: { message: string; kind?: LayoutActionEntry['kind'] }) => {
    if (!skipHistoryRef.current) {
      pushHistory(blueprint);
    }
    onChange(refreshBlueprintMetadata(ensureBlueprintDefaults(next)));
    if (action) log(action.message, action.kind);
  };

  const undo = useCallback(() => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current = [...futureRef.current, structuredClone(blueprint)];
    skipHistoryRef.current = true;
    onChange(refreshBlueprintMetadata(ensureBlueprintDefaults(prev)));
    skipHistoryRef.current = false;
    syncHistoryFlags();
    log('Annuler (Ctrl+Z)', 'info');
  }, [blueprint, log, onChange, syncHistoryFlags]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current = [...pastRef.current, structuredClone(blueprint)];
    skipHistoryRef.current = true;
    onChange(refreshBlueprintMetadata(ensureBlueprintDefaults(next)));
    skipHistoryRef.current = false;
    syncHistoryFlags();
    log('Rétablir (Ctrl+Y)', 'info');
  }, [blueprint, log, onChange, syncHistoryFlags]);

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

  const selectedFurniture = selected && selected.kind !== 'fixture' && selected.kind !== 'wall'
    ? blueprint.furniture.find((f) => f.id === selected.id)
    : null;
  const selectedFixture = selected?.kind === 'fixture'
    ? blueprint.fixtures.find((f) => f.id === selected.id)
    : null;

  const handleWebGLMove = useCallback((kind: SelectableKind, id: string, xPct: number, yPct: number) => {
    if (readOnly) return;
    if (!dragHistPushedRef.current) {
      pushHistory(blueprint);
      dragHistPushedRef.current = true;
    }
    const x = snapLayoutPct(xPct, caps.canSnapGrid);
    const y = snapLayoutPct(yPct, caps.canSnapGrid);
    skipHistoryRef.current = true;
    if (kind === 'fixture') {
      onChange(refreshBlueprintMetadata(ensureBlueprintDefaults({
        ...blueprint,
        fixtures: blueprint.fixtures.map((f) => (f.id === id ? { ...f, x, y } : f)),
      })));
    } else {
      onChange(refreshBlueprintMetadata(ensureBlueprintDefaults({
        ...blueprint,
        furniture: blueprint.furniture.map((f) => (f.id === id ? { ...f, x, y } : f)),
      })));
    }
    skipHistoryRef.current = false;
  }, [blueprint, caps.canSnapGrid, onChange, pushHistory, readOnly]);

  const handleWebGLMoveEnd = useCallback(() => {
    if (dragHistPushedRef.current) {
      log('Élément déplacé', 'move');
    }
    dragHistPushedRef.current = false;
  }, [log]);

  const deleteSelected = () => {
    if (!selected || readOnly) return;
    if (selected.kind === 'wall') {
      updateBlueprint({
        ...blueprint,
        walls: (blueprint.walls ?? []).filter((w) => w.id !== selected.id),
      }, { message: 'Mur supprimé', kind: 'delete' });
      setSelected(null);
      return;
    }
    const label = selected.kind === 'fixture' ? 'Élément fixe' : 'Mobilier';
    if (selected.kind === 'fixture') {
      updateBlueprint({
        ...blueprint,
        fixtures: blueprint.fixtures.filter((f) => f.id !== selected.id),
      }, { message: `${label} supprimé`, kind: 'delete' });
    } else {
      updateBlueprint({
        ...blueprint,
        furniture: blueprint.furniture.filter((f) => f.id !== selected.id),
      }, { message: `${label} supprimé`, kind: 'delete' });
    }
    setSelected(null);
  };

  const addTable = () => {
    const tableCount = blueprint.furniture.filter((f) => f.kind === 'table').length;
    if (tableCount >= caps.maxTables) {
      log(`Limite de ${caps.maxTables} tables atteinte (${caps.label})`, 'info');
      return;
    }
    const count = tableCount + 1;
    const defaultChair: ChairType =
      blueprint.roomType === 'CONFERENCE' || blueprint.roomType === 'AMPHITHEATER' ? 'THEATER' : 'BANQUET';
    const table = createBlueprintTable(count, { chairType: defaultChair, shape: caps.tableShapes[0] });
    updateBlueprint({ ...blueprint, furniture: [...blueprint.furniture, table] }, { message: `Table « ${table.name} » ajoutée`, kind: 'add' });
    setSelected({ kind: 'table', id: table.id });
  };

  const duplicateSelectedTable = () => {
    if (!caps.canDuplicate) {
      log('La duplication n’est pas incluse dans votre forfait', 'info');
      return;
    }
    const tableCount = blueprint.furniture.filter((f) => f.kind === 'table').length;
    if (tableCount >= caps.maxTables) {
      log(`Limite de ${caps.maxTables} tables atteinte (${caps.label})`, 'info');
      return;
    }
    const item = blueprint.furniture.find((f) => f.kind === 'table' && f.id === selected?.id);
    if (!item || item.kind !== 'table') return;
    const count = blueprint.furniture.filter((f) => f.kind === 'table').length + 1;
    const copy = {
      ...item,
      id: createBlueprintTable(count).id,
      name: `${item.name} (copie)`,
      x: Math.min(90, item.x + 6),
      y: Math.min(90, item.y + 6),
      locked: false,
    };
    updateBlueprint({ ...blueprint, furniture: [...blueprint.furniture, copy] }, { message: `Table « ${copy.name} » dupliquée`, kind: 'add' });
    setSelected({ kind: 'table', id: copy.id });
  };

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
    const row = createBlueprintRow(count);
    updateBlueprint({ ...blueprint, furniture: [...blueprint.furniture, row] }, { message: `Rangée « ${row.label} » ajoutée`, kind: 'add' });
    setSelected({ kind: 'row', id: row.id });
  };

  const addZone = (label: string, opts?: { zoneKind?: ZoneKind; material?: ZoneMaterial }) => {
    if (!caps.canZones) {
      log('Les zones (piste, VIP, buffet) ne sont pas incluses dans votre forfait', 'info');
      return;
    }
    const count = blueprint.furniture.filter((f) => f.kind === 'zone').length + 1;
    const zone = createBlueprintZone(label, count, opts);
    updateBlueprint({ ...blueprint, furniture: [...blueprint.furniture, zone] }, { message: `Zone « ${zone.label} » ajoutée`, kind: 'add' });
    setSelected({ kind: 'zone', id: zone.id });
  };

  const addFreeChair = () => {
    const count = blueprint.furniture.filter((f) => f.kind === 'chair').length + 1;
    const chair = createBlueprintChair(count, {
      chairType: 'ARMCHAIR',
      chairStyle: 'lounge',
      seatMaterial: 'velvet',
    });
    updateBlueprint({ ...blueprint, furniture: [...blueprint.furniture, chair] }, { message: 'Fauteuil ajouté', kind: 'add' });
    setSelected({ kind: 'chair', id: chair.id });
  };

  const addCarpet = () => {
    if (caps.canZones) {
      addZone('Moquette', { zoneKind: 'carpet', material: 'carpet' });
      return;
    }
    const fixture = createBlueprintFixture('carpet');
    updateBlueprint({ ...blueprint, fixtures: [...blueprint.fixtures, fixture] }, { message: 'Moquette ajoutée', kind: 'add' });
    setSelected({ kind: 'fixture', id: fixture.id });
  };

  const clearWalls = () => {
    updateBlueprint({ ...blueprint, walls: [] }, { message: 'Tous les murs ont été retirés', kind: 'settings' });
    setSelected(null);
    setWallEditMode(false);
  };

  const addFixture = (kind: RoomLayoutBlueprint['fixtures'][number]['kind']) => {
    if (!caps.canFixtures || !caps.fixtureKinds.includes(kind as (typeof caps.fixtureKinds)[number])) {
      log('Cet élément n’est pas inclus dans votre forfait', 'info');
      return;
    }
    const fixture = createBlueprintFixture(kind);
    updateBlueprint({ ...blueprint, fixtures: [...blueprint.fixtures, fixture] }, { message: `${fixture.label || kind} ajouté`, kind: 'add' });
    setSelected({ kind: 'fixture', id: fixture.id });
  };

  const applyTemplate = (templateId: string) => {
    const tpl = ROOM_LAYOUT_TEMPLATES.find((t) => t.id === templateId);
    const next = applyRoomTemplate(templateId, tplParams, blueprint, { keepStyle: keepTemplateStyle });
    if (!next) return;
    pushHistory(blueprint);
    skipHistoryRef.current = true;
    onChange(next);
    skipHistoryRef.current = false;
    const seats = next.metadata.totalSeats;
    log(
      `Modèle « ${tpl?.name} » généré${seats ? ` — ${seats} places` : ''}`,
      'template',
    );
    setSelected(null);
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
    pushHistory(blueprint);
    skipHistoryRef.current = true;
    onChange(next);
    skipHistoryRef.current = false;
    const name = blueprint.metadata.customTemplates?.find((t) => t.id === templateId)?.name ?? 'perso.';
    log(`Modèle « ${name} » appliqué`, 'template');
    setSelected(null);
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
      metadata: { ...blueprint.metadata, floorType, floorImageUrl: undefined },
    }, { message: `Sol : ${floorTypeLabels[floorType]}`, kind: 'settings' });
  };

  const setFloorImage = async (file: File) => {
    const url = await readImageFile(file);
    updateBlueprint({
      ...blueprint,
      metadata: { ...blueprint.metadata, floorImageUrl: url, floorType: 'custom' },
    }, { message: 'Image de sol importée', kind: 'settings' });
  };

  const activeTheme = getRoomTheme(blueprint.metadata.roomThemeId, blueprint);
  const effectiveFloorType = blueprint.metadata.floorType ?? activeTheme.defaultFloorType;
  const availableThemes = listAvailableThemes(blueprint);
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
    }, { message: next <= 0 ? 'Vue du dessus' : `Perspective WebGL : ${next}%`, kind: 'settings' });
  };

  const outline = blueprint.roomOutline!;

  const renderCanvas = (className: string) => (
    <RoomWebGLViewer
      blueprint={blueprint}
      selected={selected}
      onSelect={(sel) => setSelected(sel)}
      onMoveItem={handleWebGLMove}
      onMoveEnd={handleWebGLMoveEnd}
      readOnly={readOnly}
      wallEditMode={wallEditMode}
      lockOrbit={lockOrbit}
      className={className}
    />
  );

  const selectWall = useCallback((id: string | null) => {
    setSelected(id ? { kind: 'wall', id } : null);
  }, []);

  const renderChairImageUpload = (id: string, currentUrl?: string) => (
    <label className="block text-xs space-y-1">
      <span className="font-semibold text-muted flex items-center gap-1"><ImagePlus className="w-3.5 h-3.5" /> Image de chaise (optionnel)</span>
      <input
        type="file"
        accept="image/*"
        className="w-full text-[10px]"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const url = await readImageFile(file);
          updateFurniture(id, { chairImageUrl: url }, 'Image de chaise personnalisée');
        }}
      />
      {currentUrl && (
        <button type="button" className="text-[10px] text-rose-600 font-bold" onClick={() => updateFurniture(id, { chairImageUrl: undefined }, 'Image de chaise retirée')}>
          Retirer l&apos;image
        </button>
      )}
    </label>
  );

  const renderTableImageUpload = (id: string, currentUrl?: string) => (
    <label className="block text-xs space-y-1">
      <span className="font-semibold text-muted flex items-center gap-1"><ImagePlus className="w-3.5 h-3.5" /> Image de table (nappage, bois…)</span>
      <input
        type="file"
        accept="image/*"
        className="w-full text-[10px]"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const url = await readImageFile(file);
          updateFurniture(id, { tableImageUrl: url }, 'Image de table importée');
        }}
      />
      {currentUrl && (
        <button type="button" className="text-[10px] text-rose-600 font-bold" onClick={() => updateFurniture(id, { tableImageUrl: undefined }, 'Image de table retirée')}>
          Retirer l&apos;image
        </button>
      )}
    </label>
  );

  const renderEditPanel = () => {
    if (readOnly) return null;

    if (!selected) {
      return (
        <div className="space-y-4">
          {!caps.canThemes ? (
            <div className="p-4 bg-amber-50 rounded-[var(--radius-card)] border border-amber-200 space-y-2">
              <p className="text-xs font-bold uppercase text-amber-800 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Forfait {caps.label}
              </p>
              <p className="text-xs text-amber-900/80">
                {caps.description}
              </p>
              <a href="/dashboard/billing" className="inline-block text-xs font-bold text-primary hover:underline">
                Voir les forfaits →
              </a>
            </div>
          ) : (
            <div className="border border-border rounded-[var(--radius-card)] bg-surface overflow-hidden shadow-sm">
              <button
                type="button"
                className={cn("w-full flex items-center justify-between p-3.5 text-left text-sm font-semibold transition-colors", accordion === 'murs-sols' ? 'bg-surface-muted text-foreground' : 'bg-surface text-muted hover:bg-surface-muted/50 hover:text-foreground')}
                onClick={() => setAccordion(accordion === 'murs-sols' ? '' : 'murs-sols')}
              >
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Environnement & Thèmes
                </span>
              </button>
              
              {accordion === 'murs-sols' && (
                <div className="p-4 bg-surface space-y-5 border-t border-border">
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase text-muted flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Thème de la salle</p>
                <label className="flex items-center gap-2 text-[10px] text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={keepThemeFloor}
                    onChange={(e) => setKeepThemeFloor(e.target.checked)}
                    className="rounded border-border"
                  />
                  Conserver le sol actuel en changeant de thème
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableThemes.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => applyTheme(theme.id)}
                      className={`text-left py-2 px-2.5 rounded-[var(--radius-button)] border text-[10px] font-bold transition overflow-hidden ${blueprint.metadata.roomThemeId === theme.id || (!blueprint.metadata.roomThemeId && theme.id === 'classic')
                          ? 'bg-primary/10 border-primary/50 text-primary ring-1 ring-primary/20'
                          : 'border-border text-muted hover:bg-white'
                        }`}
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
                        {theme.isCustom && <span className="text-[8px] text-primary font-normal">perso.</span>}
                      </span>
                      <span className="font-normal text-muted block mt-0.5 line-clamp-1">{theme.description}</span>
                    </button>
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
                    <p className="text-xs font-bold uppercase text-muted flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> Sol de la salle</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(floorTypeLabels) as FloorType[]).filter((k) => k !== 'custom').map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFloorType(type)}
                      className={`py-2 px-2 rounded-[var(--radius-button)] border text-[10px] font-bold transition overflow-hidden ${effectiveFloorType === type && !blueprint.metadata.floorImageUrl
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-800 ring-1 ring-emerald-200'
                          : 'border-border text-muted hover:bg-white'
                        }`}
                    >
                      <span
                        className="block h-10 rounded mb-1 border border-black/10 shadow-inner"
                        style={resolveFloorStyle(type, undefined, activeTheme.accentColor)}
                      />
                      {floorTypeLabels[type]}
                    </button>
                  ))}
                </div>
                {caps.canCustomImages ? (
                  <label className="block text-xs space-y-1">
                    <span className="font-semibold text-muted flex items-center gap-1"><ImagePlus className="w-3.5 h-3.5" /> Importer une texture (photo de sol)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full text-[10px]"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) await setFloorImage(file);
                        e.target.value = '';
                      }}
                    />
                    {blueprint.metadata.floorImageUrl && (
                      <button
                        type="button"
                        className="text-[10px] text-rose-600 font-bold"
                        onClick={() => updateBlueprint({
                          ...blueprint,
                          metadata: { ...blueprint.metadata, floorImageUrl: undefined, floorType: activeTheme.defaultFloorType },
                        }, { message: 'Image de sol retirée', kind: 'settings' })}
                      >
                        Retirer l&apos;image de sol
                      </button>
                    )}
                  </label>
                ) : null}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Accordion 2 : Outils Automatiques */}
          <div className="border border-border rounded-[var(--radius-card)] bg-surface overflow-hidden shadow-sm">
            <button
              type="button"
              className={cn("w-full flex items-center justify-between p-3.5 text-left text-sm font-semibold transition-colors", accordion === 'outils' ? 'bg-surface-muted text-foreground' : 'bg-surface text-muted hover:bg-surface-muted/50 hover:text-foreground')}
              onClick={() => setAccordion(accordion === 'outils' ? '' : 'outils')}
            >
              <span className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" /> Agencement automatique
              </span>
            </button>
            
            {accordion === 'outils' && (
              <div className="p-4 bg-surface space-y-4 border-t border-border">
                <p className="text-[10px] text-muted leading-relaxed">
                  Répartit les tables déverrouillées dans la salle, en évitant la scène.
                </p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(arrangeDensityLabels) as ArrangeDensity[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setArrangeDensity(id)}
                  className={`px-2 py-1 rounded-[var(--radius-button)] border text-[10px] font-bold ${arrangeDensity === id ? 'bg-primary/10 border-primary/40 text-primary' : 'border-border text-muted hover:bg-white'
                    }`}
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
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-2 rounded-[var(--radius-button)] border border-border text-[10px] font-bold text-muted hover:bg-white hover:text-foreground"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <div className="space-y-1.5 pt-1">
              <label className="flex items-center justify-between gap-2 text-[10px] font-bold text-muted">
                <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Perspective 3D</span>
                <span className="tabular-nums">{depthAmount}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={depthAmount}
                onChange={(e) => setDepthAmount(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="text-[10px] text-muted leading-relaxed">
                0 = vue du dessus · 100 = caméra WebGL en perspective immersive.
              </p>
            </div>
            </div>
          )}
          </div>

          {/* Accordion murs */}
          <div className="border border-border rounded-[var(--radius-card)] bg-surface overflow-hidden shadow-sm">
            <button
              type="button"
              className={cn("w-full flex items-center justify-between p-3.5 text-left text-sm font-semibold transition-colors", accordion === 'murs' ? 'bg-surface-muted text-foreground' : 'bg-surface text-muted hover:bg-surface-muted/50 hover:text-foreground')}
              onClick={() => {
                const next = accordion === 'murs' ? '' : 'murs';
                setAccordion(next);
                setWallEditMode(next === 'murs');
              }}
            >
              <span className="flex items-center gap-2">
                <BrickWall className="w-4 h-4" /> Murs, portes & fenêtres
              </span>
            </button>
            {accordion === 'murs' && (
              <div className="p-4 bg-surface space-y-3 border-t border-border">
                <p className="text-[10px] text-muted leading-relaxed">
                  Configurez la hauteur, l&apos;épaisseur, la texture des murs et le style des ouvertures. Cliquez un mur dans la vue 3D pour le sélectionner.
                </p>
                <label className="flex items-center gap-2 text-[10px] text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wallEditMode}
                    onChange={(e) => setWallEditMode(e.target.checked)}
                    className="rounded border-border"
                  />
                  Mode édition murs (orbit désactivé)
                </label>
                <label className="flex items-center gap-2 text-[10px] text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lockOrbit}
                    onChange={(e) => setLockOrbit(e.target.checked)}
                    className="rounded border-border"
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
              className={cn("w-full flex items-center justify-between p-3.5 text-left text-sm font-semibold transition-colors", accordion === 'config' ? 'bg-surface-muted text-foreground' : 'bg-surface text-muted hover:bg-surface-muted/50 hover:text-foreground')}
              onClick={() => setAccordion(accordion === 'config' ? '' : 'config')}
            >
              <span className="flex items-center gap-2">
                <Ruler className="w-4 h-4" /> Configuration Globale
              </span>
            </button>
            
            {accordion === 'config' && (
              <div className="p-4 bg-surface space-y-4 border-t border-border">
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
                        className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm"
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
                  className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm"
                />
              </label>
            </div>
          </div>
          <div className="p-4 bg-surface-muted rounded-[var(--radius-card)] border space-y-3">
            <p className="text-xs font-bold uppercase text-muted flex items-center gap-1"><Palette className="w-3.5 h-3.5" /> Couleur des tables</p>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={blueprint.metadata.defaultTableColor ?? '#ffffff'}
                onChange={(e) => setDefaultTableColor(e.target.value)}
                className="w-12 h-9 rounded-[var(--radius-button)] border cursor-pointer shrink-0"
              />
              <button
                type="button"
                onClick={() => applyTableColorToAll(blueprint.metadata.defaultTableColor ?? '#ffffff')}
                className="flex-1 py-2 px-2 rounded-[var(--radius-button)] border border-primary/30 bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/15"
              >
                Appliquer à toutes les tables
              </button>
            </div>
          </div>
          
          {caps.canChangeOutline ? (
            <div className="space-y-3 pt-4 border-t border-border/50">
              <p className="text-xs font-bold uppercase text-muted flex items-center gap-1"><Shapes className="w-3.5 h-3.5" /> Forme de la salle</p>
              <p className="text-[10px] text-muted leading-relaxed">
                Met à jour le sol découpé et les murs 3D (L, U, hexagone, cercle…). Annulable avec Ctrl+Z.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(roomOutlineLabels) as RoomOutlineShape[]).map((shape) => (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => setRoomOutlineShape(shape)}
                    className={`py-2 px-1.5 rounded-[var(--radius-button)] border text-[10px] font-bold transition ${outline.shape === shape ? 'bg-primary/10 border-primary/50 text-primary' : 'border-border text-muted hover:bg-white'}`}
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
      const isBuffet = selectedFixture.kind === 'buffet';
      const canHaveImage = isColumn || isStage || isFlower || isBuffet;

      return (
        <div className="space-y-3">
          <div className="p-4 bg-surface-muted rounded-[var(--radius-card)] border space-y-3">
            <p className="text-xs font-bold uppercase text-muted">
              {isBuffet ? 'Buffet' : isPodium ? 'Podium' : isFlower ? 'Décoration florale' : isColumn ? 'Colonne / Poteau' : isStage ? 'Scène' : `Fixe — ${selectedFixture.kind}`}
            </p>
            <label className="block text-xs space-y-1">
              <span className="font-semibold text-muted">Libellé</span>
              <input value={selectedFixture.label ?? ''} onChange={(e) => updateFixture(selectedFixture.id, { label: e.target.value })} className="w-full px-3 py-2 rounded-[var(--radius-button)] border text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs space-y-1">
                <span className="font-semibold text-muted">Largeur %</span>
                <input type="number" min={1} max={100} value={Math.round(selectedFixture.w)} onChange={(e) => updateFixture(selectedFixture.id, { w: parseFloat(e.target.value) })} className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm" />
              </label>
              <label className="text-xs space-y-1">
                <span className="font-semibold text-muted">Profondeur %</span>
                <input type="number" min={1} max={100} value={Math.round(selectedFixture.h)} onChange={(e) => updateFixture(selectedFixture.id, { h: parseFloat(e.target.value) })} className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm" />
              </label>
            </div>

            {(isStage || isBuffet) && (
              <label className="block text-xs space-y-1">
                <span className="font-semibold text-muted">Matériau</span>
                <select
                  value={selectedFixture.material ?? 'wood'}
                  onChange={(e) => updateFixture(selectedFixture.id, { material: e.target.value as ZoneMaterial }, 'Matériau modifié')}
                  className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm"
                >
                  {(Object.keys(zoneMaterialLabels) as ZoneMaterial[]).map((k) => (
                    <option key={k} value={k}>{zoneMaterialLabels[k]}</option>
                  ))}
                </select>
              </label>
            )}

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
                    className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm"
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
                    className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm"
                  />
                </label>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-muted">Couleur</span>
                  <input type="color" value={selectedFixture.color ?? '#b45309'} onChange={(e) => updateFixture(selectedFixture.id, { color: e.target.value })} className="w-full h-9 rounded-[var(--radius-button)] border cursor-pointer" />
                </label>
              </>
            )}

            {isBuffet && (
              <>
                <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFixture.hasCouverts !== false}
                    onChange={(e) => updateFixture(selectedFixture.id, { hasCouverts: e.target.checked }, e.target.checked ? 'Couverts affichés' : 'Couverts masqués')}
                    className="rounded border-border"
                  />
                  Afficher assiettes & couverts
                </label>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-muted">Style buffet</span>
                  <select
                    value={selectedFixture.buffetStyle ?? 'straight'}
                    onChange={(e) => updateFixture(selectedFixture.id, { buffetStyle: e.target.value as 'straight' | 'corner' | 'island' })}
                    className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm"
                  >
                    <option value="straight">Linéaire</option>
                    <option value="corner">En L / angle</option>
                    <option value="island">Îlot central</option>
                  </select>
                </label>
              </>
            )}

            {isFlower && (
              <>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-muted">Type de fleurs</span>
                  <select
                    value={selectedFixture.flowerType ?? 'boquet'}
                    onChange={(e) => updateFixture(selectedFixture.id, { flowerType: e.target.value as FlowerType }, 'Type de fleurs modifié')}
                    className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm"
                  >
                    {Object.entries(flowerTypeLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-muted">Couleur des fleurs</span>
                  <input type="color" value={selectedFixture.flowerColor ?? '#e11d48'} onChange={(e) => updateFixture(selectedFixture.id, { flowerColor: e.target.value }, 'Couleur florale modifiée')} className="w-full h-9 rounded-[var(--radius-button)] border cursor-pointer" />
                </label>
              </>
            )}

            {isColumn && (
              <>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-muted">Forme colonne</span>
                  <select value={selectedFixture.columnShape ?? 'round'} onChange={(e) => updateFixture(selectedFixture.id, { columnShape: e.target.value as ColumnShape }, 'Forme colonne modifiée')} className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm">
                    <option value="round">Ronde</option>
                    <option value="square">Carrée</option>
                  </select>
                </label>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-muted">Couleur (sans image)</span>
                  <input type="color" value={selectedFixture.color ?? '#78716c'} onChange={(e) => updateFixture(selectedFixture.id, { color: e.target.value })} className="w-full h-9 rounded-[var(--radius-button)] border cursor-pointer" />
                </label>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-muted">Rotation (°)</span>
                  <input type="number" min={0} max={360} value={selectedFixture.rotation ?? 0} onChange={(e) => updateFixture(selectedFixture.id, { rotation: parseFloat(e.target.value) })} className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm" />
                </label>
              </>
            )}

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
                    className="text-[10px] text-rose-600 font-bold"
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
                <select value={selectedFurniture.shape} onChange={(e) => updateFurniture(selectedFurniture.id, { shape: e.target.value as TableShape })} className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm">
                  {caps.tableShapes.includes('round') ? <option value="round">Ronde</option> : null}
                  {caps.tableShapes.includes('rectangular') ? <option value="rectangular">Rectangulaire</option> : null}
                  {caps.tableShapes.includes('square') ? <option value="square">Carrée</option> : null}
                  {caps.tableShapes.includes('oval') ? <option value="oval">Ovale</option> : null}
                  {caps.tableShapes.includes('cocktail') ? <option value="cocktail">Cocktail (basse)</option> : null}
                  {caps.tableShapes.includes('highTop') ? <option value="highTop">Mange-debout</option> : null}
                </select>
              </label>
              <label className="text-xs space-y-1">
                <span className="font-semibold text-muted">Places</span>
                <input type="number" min={2} max={24} value={selectedFurniture.capacity} onChange={(e) => updateFurniture(selectedFurniture.id, { capacity: parseInt(e.target.value, 10) })} className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm" />
              </label>
            </div>
            <label className="block text-xs space-y-1">
              <span className="font-semibold text-muted flex items-center gap-1"><Palette className="w-3 h-3" /> Couleur de cette table</span>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={selectedFurniture.tableColor ?? blueprint.metadata.defaultTableColor ?? '#ffffff'}
                  onChange={(e) => updateFurniture(selectedFurniture.id, { tableColor: e.target.value }, 'Couleur de table modifiée')}
                  className="w-full h-9 rounded-[var(--radius-button)] border cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => updateFurniture(selectedFurniture.id, { tableColor: undefined }, 'Couleur table réinitialisée')}
                  className="shrink-0 px-2 py-1 text-[10px] font-bold text-muted border rounded-[var(--radius-button)]"
                >
                  Défaut
                </button>
              </div>
            </label>
            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFurniture.hasCouverts === true}
                onChange={(e) => updateFurniture(selectedFurniture.id, { hasCouverts: e.target.checked }, e.target.checked ? 'Couverts affichés' : 'Couverts masqués')}
                className="rounded border-border"
              />
              Afficher assiettes & couverts
            </label>
            <label className="block text-xs space-y-1">
              <span className="font-semibold text-muted">Type de chaise</span>
              <select value={selectedFurniture.chairType} onChange={(e) => updateFurniture(selectedFurniture.id, { chairType: e.target.value as ChairType })} className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm">
                {Object.entries(chairTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs space-y-1">
                <span className="font-semibold text-muted">Style</span>
                <select
                  value={selectedFurniture.chairStyle ?? 'classic'}
                  onChange={(e) => updateFurniture(selectedFurniture.id, { chairStyle: e.target.value as ChairStyle }, 'Style chaise')}
                  className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm"
                >
                  {(Object.keys(chairStyleLabels) as ChairStyle[]).map((k) => (
                    <option key={k} value={k}>{chairStyleLabels[k]}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs space-y-1">
                <span className="font-semibold text-muted">Matériau</span>
                <select
                  value={selectedFurniture.seatMaterial ?? 'fabric'}
                  onChange={(e) => updateFurniture(selectedFurniture.id, { seatMaterial: e.target.value as SeatMaterial }, 'Matériau chaise')}
                  className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm"
                >
                  {(Object.keys(seatMaterialLabels) as SeatMaterial[]).map((k) => (
                    <option key={k} value={k}>{seatMaterialLabels[k]}</option>
                  ))}
                </select>
              </label>
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
                  className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm"
                />
              </label>
            ) : null}
            <div className="flex gap-2">
              {caps.canLock ? (
                <button
                  type="button"
                  onClick={() => updateFurniture(selectedFurniture.id, { locked: !selectedFurniture.locked }, selectedFurniture.locked ? 'Table déverrouillée' : 'Table verrouillée')}
                  className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-[var(--radius-button)] border text-[10px] font-bold"
                >
                  {selectedFurniture.locked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {selectedFurniture.locked ? 'Déverrouiller' : 'Verrouiller'}
                </button>
              ) : null}
              {caps.canDuplicate ? (
                <button
                  type="button"
                  onClick={duplicateSelectedTable}
                  className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-[var(--radius-button)] border border-primary/30 bg-primary/10 text-primary text-[10px] font-bold"
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
                className="w-full py-2 rounded-[var(--radius-button)] border border-violet-200 bg-violet-50 text-violet-800 text-[10px] font-bold"
              >
                Détacher les chaises (placement libre)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => updateFurniture(selectedFurniture.id, { attachedChairs: true }, 'Chaises rattachées à la table')}
                className="w-full py-2 rounded-[var(--radius-button)] border text-[10px] font-bold text-muted"
              >
                Réafficher chaises autour de la table
              </button>
            )}
            <div className="pt-2 border-t border-border space-y-1.5">
              <p className="text-[10px] font-bold uppercase text-muted">Appliquer à toutes les tables</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => updateBlueprint(applyTableStyleToAll(blueprint, selectedFurniture.id, ['shape']), { message: 'Forme appliquée à toutes les tables', kind: 'edit' })}
                  className="py-1.5 px-2 rounded-[var(--radius-button)] border text-[10px] font-bold text-muted hover:bg-white"
                >
                  Forme
                </button>
                <button
                  type="button"
                  onClick={() => updateBlueprint(applyTableStyleToAll(blueprint, selectedFurniture.id, ['chairType']), { message: 'Chaises appliquées à toutes les tables', kind: 'edit' })}
                  className="py-1.5 px-2 rounded-[var(--radius-button)] border text-[10px] font-bold text-muted hover:bg-white"
                >
                  Chaises
                </button>
                <button
                  type="button"
                  onClick={() => updateBlueprint(applyTableStyleToAll(blueprint, selectedFurniture.id, ['tableColor']), { message: 'Couleur appliquée à toutes les tables', kind: 'edit' })}
                  className="py-1.5 px-2 rounded-[var(--radius-button)] border text-[10px] font-bold text-muted hover:bg-white"
                >
                  Couleur
                </button>
                <button
                  type="button"
                  onClick={() => updateBlueprint(applyTableStyleToAll(blueprint, selectedFurniture.id, ['capacity']), { message: 'Places appliquées à toutes les tables', kind: 'edit' })}
                  className="py-1.5 px-2 rounded-[var(--radius-button)] border text-[10px] font-bold text-muted hover:bg-white"
                >
                  Places
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
            <p className="text-xs font-bold uppercase text-muted">Rangée</p>
            <label className="block text-xs space-y-1">
              <span className="font-semibold text-muted">Libellé</span>
              <input value={selectedFurniture.label} onChange={(e) => updateFurniture(selectedFurniture.id, { label: e.target.value })} className="w-full px-3 py-2 rounded-[var(--radius-button)] border text-sm" />
            </label>
            <label className="block text-xs space-y-1">
              <span className="font-semibold text-muted">Places</span>
              <input type="number" min={2} max={60} value={selectedFurniture.seatCount} onChange={(e) => updateFurniture(selectedFurniture.id, { seatCount: parseInt(e.target.value, 10) })} className="w-full px-3 py-2 rounded-[var(--radius-button)] border text-sm" />
            </label>
            <label className="block text-xs space-y-1">
              <span className="font-semibold text-muted">Type de siège</span>
              <select value={selectedFurniture.chairType} onChange={(e) => updateFurniture(selectedFurniture.id, { chairType: e.target.value as ChairType })} className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm">
                {Object.entries(chairTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs space-y-1">
                <span className="font-semibold text-muted">Style</span>
                <select
                  value={selectedFurniture.chairStyle ?? 'classic'}
                  onChange={(e) => updateFurniture(selectedFurniture.id, { chairStyle: e.target.value as ChairStyle })}
                  className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm"
                >
                  {(Object.keys(chairStyleLabels) as ChairStyle[]).map((k) => (
                    <option key={k} value={k}>{chairStyleLabels[k]}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs space-y-1">
                <span className="font-semibold text-muted">Matériau</span>
                <select
                  value={selectedFurniture.seatMaterial ?? 'fabric'}
                  onChange={(e) => updateFurniture(selectedFurniture.id, { seatMaterial: e.target.value as SeatMaterial })}
                  className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm"
                >
                  {(Object.keys(seatMaterialLabels) as SeatMaterial[]).map((k) => (
                    <option key={k} value={k}>{seatMaterialLabels[k]}</option>
                  ))}
                </select>
              </label>
            </div>
            {caps.canCustomImages ? renderChairImageUpload(selectedFurniture.id, selectedFurniture.chairImageUrl) : null}
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
                className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm"
              >
                {(Object.keys(zoneKindLabels) as ZoneKind[]).map((k) => (
                  <option key={k} value={k}>{zoneKindLabels[k]}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs space-y-1">
              <span className="font-semibold text-muted">Matériau / sol</span>
              <select
                value={selectedFurniture.material ?? 'vinyl'}
                onChange={(e) => updateFurniture(selectedFurniture.id, { material: e.target.value as ZoneMaterial }, 'Matériau de zone modifié')}
                className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm"
              >
                {(Object.keys(zoneMaterialLabels) as ZoneMaterial[]).map((k) => (
                  <option key={k} value={k}>{zoneMaterialLabels[k]}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs space-y-1">
              <span className="font-semibold text-muted">Teinte</span>
              <input
                type="color"
                value={selectedFurniture.color ?? '#312e81'}
                onChange={(e) => updateFurniture(selectedFurniture.id, { color: e.target.value }, 'Couleur de zone')}
                className="w-full h-9 rounded-[var(--radius-button)] border cursor-pointer"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs space-y-1">
                <span className="font-semibold text-muted">Largeur %</span>
                <input type="number" min={8} max={90} value={selectedFurniture.w} onChange={(e) => updateFurniture(selectedFurniture.id, { w: parseInt(e.target.value, 10) || 20 })} className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm" />
              </label>
              <label className="text-xs space-y-1">
                <span className="font-semibold text-muted">Profondeur %</span>
                <input type="number" min={8} max={90} value={selectedFurniture.h} onChange={(e) => updateFurniture(selectedFurniture.id, { h: parseInt(e.target.value, 10) || 16 })} className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm" />
              </label>
            </div>
            <p className="text-[10px] text-muted">Glissez la zone dans la vue 3D pour la repositionner.</p>
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
            <label className="block text-xs space-y-1">
              <span className="font-semibold text-muted">Type</span>
              <select value={selectedFurniture.chairType} onChange={(e) => updateFurniture(selectedFurniture.id, { chairType: e.target.value as ChairType })} className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm">
                {Object.entries(chairTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs space-y-1">
                <span className="font-semibold text-muted">Style</span>
                <select
                  value={selectedFurniture.chairStyle ?? 'lounge'}
                  onChange={(e) => updateFurniture(selectedFurniture.id, { chairStyle: e.target.value as ChairStyle }, 'Style siège')}
                  className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm"
                >
                  {(Object.keys(chairStyleLabels) as ChairStyle[]).map((k) => (
                    <option key={k} value={k}>{chairStyleLabels[k]}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs space-y-1">
                <span className="font-semibold text-muted">Matériau</span>
                <select
                  value={selectedFurniture.seatMaterial ?? 'velvet'}
                  onChange={(e) => updateFurniture(selectedFurniture.id, { seatMaterial: e.target.value as SeatMaterial }, 'Matériau siège')}
                  className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm"
                >
                  {(Object.keys(seatMaterialLabels) as SeatMaterial[]).map((k) => (
                    <option key={k} value={k}>{seatMaterialLabels[k]}</option>
                  ))}
                </select>
              </label>
            </div>
            {caps.canRotate ? (
              <label className="block text-xs space-y-1">
                <span className="font-semibold text-muted">Rotation °</span>
                <input type="number" min={0} max={360} value={selectedFurniture.rotation ?? 0} onChange={(e) => updateFurniture(selectedFurniture.id, { rotation: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-sm" />
              </label>
            ) : null}
            {caps.canCustomImages ? renderChairImageUpload(selectedFurniture.id, selectedFurniture.chairImageUrl) : null}
            <p className="text-[10px] text-muted">Glissez la chaise librement dans la vue 3D.</p>
          </div>
          <LayoutActionPanel actions={actionLog} />
        </div>
      );
    }

    return null;
  };

  const templateBar = !readOnly && caps.canTemplates && (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
        <LayoutTemplate className="w-3.5 h-3.5" /> Modèles de salle
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex items-center gap-1.5 text-[10px] text-muted cursor-pointer pb-1">
          <input
            type="checkbox"
            checked={keepTemplateStyle}
            onChange={(e) => setKeepTemplateStyle(e.target.checked)}
            className="rounded border-border"
          />
          Conserver thème et sol
        </label>
        <label className="text-[10px] space-y-0.5">
          <span className="font-semibold text-muted">Places au total</span>
          <input
            type="number"
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
            className="w-[88px] px-2 py-1 rounded-[var(--radius-button)] border border-primary/40 text-xs font-bold"
            title="Cliquez ensuite un modèle pour générer ce nombre de places"
          />
        </label>
        <label className="text-[10px] space-y-0.5">
          <span className="font-semibold text-muted">Places / table</span>
          <input
            type="number"
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
            className="w-[72px] px-2 py-1 rounded-[var(--radius-button)] border text-xs"
          />
        </label>
        <p className="text-[10px] text-muted pb-1.5">
          → {Math.max(1, Math.ceil((tplParams.totalSeats ?? 64) / (tplParams.seatsPerTable ?? 8)))} tables · cliquez un modèle
        </p>
        <label className="text-[10px] space-y-0.5">
          <span className="font-semibold text-muted">Forme</span>
          <select
            value={tplParams.tableShape ?? 'round'}
            onChange={(e) => setTplParams((p) => ({ ...p, tableShape: e.target.value as TableShape }))}
            className="px-2 py-1 rounded-[var(--radius-button)] border text-xs"
          >
            {(Object.keys(tableShapeLabels) as TableShape[]).filter((shape) => caps.tableShapes.includes(shape)).map((shape) => (
              <option key={shape} value={shape}>{tableShapeLabels[shape]}</option>
            ))}
          </select>
        </label>
        <label className="text-[10px] space-y-0.5">
          <span className="font-semibold text-muted">Chaises</span>
          <select
            value={tplParams.chairType ?? 'BANQUET'}
            onChange={(e) => setTplParams((p) => ({ ...p, chairType: e.target.value as ChairType }))}
            className="px-2 py-1 rounded-[var(--radius-button)] border text-xs max-w-[140px]"
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
            className={`shrink-0 text-left px-3 py-2 rounded-[var(--radius-card)] border text-[10px] font-bold transition min-w-[128px] ${blueprint.templateId === tpl.id ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-white border-border text-muted hover:border-primary/30'}`}
          >
            <span className="block">{tpl.name}</span>
            <span className="font-normal text-muted">{tpl.description}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border-subtle">
        <p className="text-[10px] font-bold uppercase text-muted shrink-0">Mes modèles</p>
        <input
          value={customTplName}
          onChange={(e) => setCustomTplName(e.target.value)}
          placeholder="Nom du modèle"
          className="px-2 py-1 rounded-[var(--radius-button)] border text-xs min-w-[140px] flex-1 max-w-[220px]"
        />
        <button
          type="button"
          onClick={saveCurrentAsTemplate}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-button)] border border-primary/30 bg-primary/10 text-primary text-[10px] font-bold"
        >
          <BookmarkPlus className="w-3 h-3" />
          Enregistrer le plan
        </button>
        {(blueprint.metadata.customTemplates ?? []).map((tpl) => (
          <span key={tpl.id} className="inline-flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => applyCustomTemplate(tpl.id)}
              className={`px-2.5 py-1 rounded-[var(--radius-button)] border text-[10px] font-bold ${blueprint.templateId === tpl.id ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-white border-border text-muted hover:border-primary/30'}`}
              title={tpl.description || tpl.name}
            >
              {tpl.name}
            </button>
            <button
              type="button"
              onClick={() => updateBlueprint(deleteCustomTemplateFromBlueprint(blueprint, tpl.id), { message: `Modèle « ${tpl.name} » supprimé`, kind: 'template' })}
              className="p-1 text-rose-500 hover:bg-rose-50 rounded-[var(--radius-button)]"
              title="Supprimer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );

  const toolbar = !readOnly && (
    <div className="flex flex-nowrap lg:flex-wrap gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
      <button
        type="button"
        onClick={undo}
        disabled={!canUndo}
        title="Annuler (Ctrl+Z)"
        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-border text-foreground rounded-[var(--radius-button)] text-xs font-bold disabled:opacity-40"
      >
        <Undo2 className="w-3.5 h-3.5" /> Annuler
      </button>
      <button
        type="button"
        onClick={redo}
        disabled={!canRedo}
        title="Rétablir (Ctrl+Y)"
        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-border text-foreground rounded-[var(--radius-button)] text-xs font-bold disabled:opacity-40"
      >
        <Redo2 className="w-3.5 h-3.5" /> Rétablir
      </button>
      <button
        type="button"
        onClick={() => setLockOrbit((v) => !v)}
        title="Verrouiller / déverrouiller la caméra (Ctrl+L)"
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-button)] text-xs font-bold border',
          lockOrbit
            ? 'bg-amber-50 border-amber-300 text-amber-900'
            : 'bg-white border-border text-muted',
        )}
      >
        {lockOrbit ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
        {lockOrbit ? 'Caméra bloquée' : 'Caméra libre'}
      </button>
      <button type="button" onClick={addTable} className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-[var(--radius-button)] text-xs font-bold shadow-sm">
        <Plus className="w-3.5 h-3.5" /> Table
      </button>
      {caps.canAddRows ? (
        <button type="button" onClick={addRow} className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-border text-foreground rounded-[var(--radius-button)] text-xs font-bold">
          <Plus className="w-3.5 h-3.5" /> Rangée
        </button>
      ) : null}
      {caps.canZones ? (
        <>
          <button type="button" onClick={() => addZone('Piste de danse', { zoneKind: 'dance', material: 'vinyl' })} className="px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-800 rounded-[var(--radius-button)] text-xs font-bold">Piste</button>
          <button type="button" onClick={() => addZone('Espace VIP', { zoneKind: 'vip', material: 'marble' })} className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-[var(--radius-button)] text-xs font-bold">VIP</button>
          <button type="button" onClick={() => addZone('Zone buffet', { zoneKind: 'buffet', material: 'wood' })} className="px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-800 rounded-[var(--radius-button)] text-xs font-bold">Zone buffet</button>
          <button type="button" onClick={addCarpet} className="px-3 py-1.5 bg-sky-50 border border-sky-200 text-sky-800 rounded-[var(--radius-button)] text-xs font-bold">Moquette</button>
        </>
      ) : null}
      <button type="button" onClick={addFreeChair} className="px-3 py-1.5 bg-white border border-border text-foreground rounded-[var(--radius-button)] text-xs font-bold">Fauteuil</button>
      <button type="button" onClick={clearWalls} className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-[var(--radius-button)] text-xs font-bold">Sans murs</button>
      {caps.fixtureKinds.includes('stage') ? (
        <button type="button" onClick={() => addFixture('stage')} className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-[var(--radius-button)] text-xs font-bold">Scène</button>
      ) : null}
      {caps.fixtureKinds.includes('podium') ? (
        <button type="button" onClick={() => addFixture('podium')} className="px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-800 rounded-[var(--radius-button)] text-xs font-bold">Podium</button>
      ) : null}
      {caps.fixtureKinds.includes('buffet') ? (
        <button type="button" onClick={() => addFixture('buffet')} className="px-3 py-1.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-[var(--radius-button)] text-xs font-bold">Buffet + couverts</button>
      ) : null}
      {caps.fixtureKinds.includes('column') ? (
        <button type="button" onClick={() => addFixture('column')} className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-100 border border-stone-300 text-stone-700 rounded-[var(--radius-button)] text-xs font-bold">
          <Columns3 className="w-3.5 h-3.5" /> Colonne
        </button>
      ) : null}
      {caps.fixtureKinds.includes('flower') ? (
        <button type="button" onClick={() => addFixture('flower')} className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-[var(--radius-button)] text-xs font-bold">
          <Flower2 className="w-3.5 h-3.5" /> Fleurs
        </button>
      ) : null}
      {caps.fixtureKinds.includes('aisle') ? (
        <button type="button" onClick={() => addFixture('aisle')} className="px-3 py-1.5 bg-surface-muted border border-border text-muted rounded-[var(--radius-button)] text-xs font-bold">Allée</button>
      ) : null}
      {caps.fixtureKinds.includes('entrance') ? (
        <button type="button" onClick={() => addFixture('entrance')} className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-[var(--radius-button)] text-xs font-bold">Entrée</button>
      ) : null}
      {caps.fixtureKinds.includes('perimeter') ? (
        <button type="button" onClick={() => addFixture('perimeter')} className="px-3 py-1.5 bg-sky-50 border border-sky-200 text-sky-800 rounded-[var(--radius-button)] text-xs font-bold">Périmètre</button>
      ) : null}
      {selected && (
        <button type="button" onClick={deleteSelected} className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-[var(--radius-button)] text-xs font-bold ml-auto">
          <Trash2 className="w-3.5 h-3.5" /> Supprimer
        </button>
      )}
      {onRegenerate && (
        <button type="button" onClick={() => { onRegenerate(); log('Plan régénéré depuis les paramètres', 'template'); }} className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary rounded-[var(--radius-button)] text-xs font-bold">
          <RefreshCw className="w-3.5 h-3.5" /> Régénérer
        </button>
      )}
    </div>
  );

  const header = (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0">
      <div>
        <p className="text-sm font-bold text-foreground flex items-center gap-2">
          <Move className="w-4 h-4 text-primary" />
          Éditeur WebGL — {roomTypeLabels[blueprint.roomType as RoomType]}
        </p>
        <p className="text-xs text-muted mt-0.5">
          {blueprint.metadata.totalSeats} places · {(blueprint.walls ?? []).length} murs · {roomOutlineLabels[outline.shape]}
          {caps.canSnapGrid ? ' · Grille' : ''} · Éditeur {caps.label}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="inline-flex items-center gap-1 px-3 py-1.5 border border-border rounded-[var(--radius-button)] text-xs font-bold text-muted hover:bg-surface-muted"
      >
        {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        {isExpanded ? 'Réduire' : 'Agrandir'}
      </button>
    </div>
  );

  if (isExpanded) {
    return (
      <>
        <ImageCropModal
          open={Boolean(cropTarget)}
          onClose={() => setCropTarget(null)}
          onApply={handleCropApply}
          title={cropFixture?.kind === 'stage' ? 'Image de la scène' : cropFixture?.kind === 'flower' ? 'Image florale' : 'Image personnalisée'}
          initialImageUrl={cropFixture?.imageUrl}
          initialCrop={cropFixture?.imageCrop}
        />
        <div className="fixed inset-0 z-[70] bg-background/70 backdrop-blur-sm flex flex-col p-1.5 sm:p-3">
          <div className="bg-background sm:bg-white rounded-none sm:rounded-2xl shadow-2xl flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="p-2.5 sm:p-4 space-y-2 sm:space-y-3 border-b border-border-subtle shrink-0">
              {header}
              {templateBar}
              {toolbar}
            </div>
            <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-2 sm:gap-3 p-2 sm:p-3 overflow-hidden">
              <div className="flex-1 min-w-0 min-h-[50dvh] md:min-h-0 flex flex-col">
                {renderCanvas('flex-1 min-h-0 h-full')}
              </div>
              <div className="md:flex-1 md:min-w-[240px] md:max-w-[320px] max-h-[34dvh] md:max-h-none overflow-y-auto shrink-0">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
          <div className="lg:col-span-2 min-h-0">{renderCanvas('em-plan-stage lg:aspect-[16/10] lg:h-auto lg:min-h-[320px]')}</div>
          <div className="max-h-[36dvh] lg:max-h-[520px] overflow-y-auto">{renderEditPanel()}</div>
        </div>
      </div>
    </>
  );
}
