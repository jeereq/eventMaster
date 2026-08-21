'use client';

import React, { useRef, useState, useCallback } from 'react';
import {
 Plus, Trash2, RefreshCw, Maximize2, Minimize2, Move, LayoutGrid, LayoutTemplate, Shapes, Columns3, ImagePlus, Flower2, Palette, Sparkles, Layers, Copy, Lock, Unlock, Ruler, Circle, Columns2, BoxSelect, Eye, BookmarkPlus,
} from 'lucide-react';
import ChairRenderer from '@/components/ChairRenderer';
import LayoutActionPanel from '@/components/LayoutActionPanel';
import FixtureRenderer from '@/components/FixtureRenderer';
import ImageCropModal from '@/components/ImageCropModal';
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
 createBlueprintFixture,
 createBlueprintRow,
 createBlueprintTable,
 createBlueprintZone,
 createSavedRoomTemplate,
 defaultRoomOutline,
 deleteCustomTemplateFromBlueprint,
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
 type ArrangeDensity,
 type LayoutParams,
 type TableArrangePreset,
} from '@/lib/roomLayoutUtils';
import { roomEditorCapabilities, snapLayoutPct } from '@/lib/roomEditorAccess';
import { prependLayoutAction, LayoutActionEntry } from '@/lib/layoutActionLog';
import { getSeatCoordinates, getTableVisualStyle } from '@/lib/tablePlanUtils';
import { readImageFile } from '@/lib/imageCropUtils';
import { applyRoomTheme, getRoomTheme, listAvailableThemes, RoomThemeId, type FloorType } from '@/lib/roomThemeUtils';
import { depthScaleForY, floorTypeLabels, furnitureDepthStyle, resolveDepthAmount, resolveFloorStyle } from '@/lib/roomFloorUtils';
import FloorDepthFrame from '@/components/FloorDepthFrame';
import CustomRoomThemePanel from '@/components/CustomRoomThemePanel';
import { cn } from '@/lib/cn';

type SelectableKind = 'table' | 'row' | 'zone' | 'fixture';

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
 const canvasRef = useRef<HTMLDivElement>(null);
 const [selected, setSelected] = useState<{ kind: SelectableKind; id: string } | null>(null);
 const [dragging, setDragging] = useState<{ kind: SelectableKind; id: string } | null>(null);
 const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
 const [isExpanded, setIsExpanded] = useState(false);
 const [actionLog, setActionLog] = useState<LayoutActionEntry[]>([]);
 const [cropTarget, setCropTarget] = useState<CropTarget>(null);
 const [arrangeDensity, setArrangeDensity] = useState<ArrangeDensity>('comfortable');
 const [keepTemplateStyle, setKeepTemplateStyle] = useState(true);
 const [keepThemeFloor, setKeepThemeFloor] = useState(false);
 const [customTplName, setCustomTplName] = useState('');
 const [tplParams, setTplParams] = useState<LayoutParams>({
  tableCount: 8,
  seatsPerTable: 8,
  tableShape: 'round',
  chairType: 'BANQUET',
  totalSeats: 64,
 });

 const log = useCallback((message: string, kind: LayoutActionEntry['kind'] = 'info') => {
 setActionLog((prev) => prependLayoutAction(prev, message, kind));
 }, []);

 const updateBlueprint = (next: RoomLayoutBlueprint, action?: { message: string; kind?: LayoutActionEntry['kind'] }) => {
 onChange(refreshBlueprintMetadata(ensureBlueprintDefaults(next)));
 if (action) log(action.message, action.kind);
 };

 const selectedFurniture = selected && selected.kind !== 'fixture'
 ? blueprint.furniture.find((f) => f.id === selected.id)
 : null;
 const selectedFixture = selected?.kind === 'fixture'
 ? blueprint.fixtures.find((f) => f.id === selected.id)
 : null;

 const handleMouseDown = (
 kind: SelectableKind,
 id: string,
 e: React.MouseEvent,
 anchor: 'center' | 'topleft' = 'center',
 ) => {
 if (readOnly) return;
 if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
 const furniture = blueprint.furniture.find((f) => f.id === id);
 if (furniture?.kind === 'table' && furniture.locked) {
   e.preventDefault();
   e.stopPropagation();
   setSelected({ kind, id });
   return;
 }
 e.preventDefault();
 e.stopPropagation();
 setSelected({ kind, id });
 setDragging({ kind, id });

 const rect = canvasRef.current?.getBoundingClientRect();
 if (!rect) return;

 let itemX: number;
 let itemY: number;

 if (kind === 'fixture') {
 const fixture = blueprint.fixtures.find((f) => f.id === id);
 if (!fixture) return;
 itemX = (fixture.x / 100) * rect.width;
 itemY = (fixture.y / 100) * rect.height;
 } else {
 const item = blueprint.furniture.find((f) => f.id === id);
 if (!item) return;
 itemX = (item.x / 100) * rect.width;
 itemY = (item.y / 100) * rect.height;
 void anchor;
 }

 setDragOffset({ x: e.clientX - rect.left - itemX, y: e.clientY - rect.top - itemY });
 };

 const handleMouseMove = (e: React.MouseEvent) => {
 if (!dragging || !canvasRef.current || readOnly) return;
 const rect = canvasRef.current.getBoundingClientRect();
 const rawX = (Math.max(0, Math.min(rect.width, e.clientX - rect.left - dragOffset.x)) / rect.width) * 100;
 const rawY = (Math.max(0, Math.min(rect.height, e.clientY - rect.top - dragOffset.y)) / rect.height) * 100;
 const xPct = snapLayoutPct(rawX, caps.canSnapGrid);
 const yPct = snapLayoutPct(rawY, caps.canSnapGrid);

 if (dragging.kind === 'fixture') {
 updateBlueprint({
 ...blueprint,
 fixtures: blueprint.fixtures.map((f) =>
 f.id === dragging.id ? { ...f, x: xPct, y: yPct } : f,
 ),
 });
 } else {
 updateBlueprint({
 ...blueprint,
 furniture: blueprint.furniture.map((f) =>
 f.id === dragging.id ? { ...f, x: xPct, y: yPct } : f,
 ),
 });
 }
 };

 const handleMouseUp = () => {
 if (dragging) {
 log(`Élément repositionné`, 'move');
 }
 setDragging(null);
 };

 const deleteSelected = () => {
 if (!selected || readOnly) return;
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

 const addZone = (label: string) => {
 if (!caps.canZones) {
   log('Les zones (piste, VIP, buffet) ne sont pas incluses dans votre forfait', 'info');
   return;
 }
 const count = blueprint.furniture.filter((f) => f.kind === 'zone').length + 1;
 const zone = createBlueprintZone(label, count);
 updateBlueprint({ ...blueprint, furniture: [...blueprint.furniture, zone] }, { message: `Zone « ${zone.label} » ajoutée`, kind: 'add' });
 setSelected({ kind: 'zone', id: zone.id });
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
 onChange(next);
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
 onChange(next);
 const name = blueprint.metadata.customTemplates?.find((t) => t.id === templateId)?.name ?? 'perso.';
 log(`Modèle « ${name} » appliqué`, 'template');
 setSelected(null);
 };

 const setRoomOutlineShape = (shape: RoomOutlineShape) => {
 updateBlueprint({
 ...blueprint,
 roomOutline: { ...(blueprint.roomOutline ?? defaultRoomOutline(shape)), shape },
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
 onChange(refreshBlueprintMetadata(ensureBlueprintDefaults(next)));
 log(`Thème « ${getRoomTheme(themeId, blueprint).name} » appliqué`, 'settings');
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
  }, { message: next <= 0 ? 'Vue à plat' : `Profondeur 2D : ${next}%`, kind: 'settings' });
 };

 const outline = blueprint.roomOutline!;
 const clipPath = getRoomOutlineClipPath(outline.shape);
 const floorStyle = resolveFloorStyle(
 effectiveFloorType,
 blueprint.metadata.floorImageUrl,
 activeTheme.accentColor,
 );
 const liveDepth = dragging ? 0 : depthAmount;

 const renderRoomOutline = () => {
 return (
 <div
 className="absolute pointer-events-none z-0 overflow-hidden"
 style={{
 left: `${outline.x}%`,
 top: `${outline.y}%`,
 width: `${outline.w}%`,
 height: `${outline.h}%`,
 borderRadius: outline.shape === 'circle' ? '50%' : outline.shape === 'square' ? '4%' : '8px',
 clipPath: clipPath,
 border: `${outline.strokeWidth ?? 2}px solid ${outline.stroke}`,
 boxShadow: activeTheme.roomOutline.innerGlow,
 }}
 >
 <div className="absolute inset-0" style={floorStyle} />
 {activeTheme.ambientOverlay && (
 <div className="absolute inset-0 pointer-events-none" style={{ background: activeTheme.ambientOverlay, opacity: 0.35 }} />
 )}
 {depthAmount > 0 && (
 <div className="absolute inset-0 pointer-events-none em-floor-depth-haze" />
 )}
 <div
 className="absolute inset-0 pointer-events-none"
 style={{ boxShadow: 'inset 0 0 0 8px rgba(70,42,16,0.35), inset 0 0 28px rgba(40,20,6,0.18)' }}
 />
 </div>
 );
 };

 const renderCanvas = (className: string) => (
 <FloorDepthFrame
 ref={canvasRef}
 amount={liveDepth}
 floorStyle={floorStyle}
 onMouseMove={handleMouseMove}
 onMouseUp={handleMouseUp}
 onMouseLeave={handleMouseUp}
 onClick={() => setSelected(null)}
 className={cn('w-full', className, dragging && 'em-floor-canvas--dragging')}
 >
 {renderRoomOutline()}

 {blueprint.fixtures.map((fixture) => {
 const isSel = selected?.kind === 'fixture' && selected.id === fixture.id;
 const isDrag = dragging?.kind === 'fixture' && dragging.id === fixture.id;
 return (
 <div
 key={fixture.id}
 onMouseDown={(e) => handleMouseDown('fixture', fixture.id, e, 'topleft')}
 onClick={(e) => { e.stopPropagation(); setSelected({ kind: 'fixture', id: fixture.id }); }}
 className={cn(
 'absolute cursor-grab em-floor-item',
 isSel && 'em-floor-item--active ring-2 ring-primary/60 z-30 rounded-[var(--radius-button)]',
 isDrag && 'opacity-90 cursor-grabbing z-40',
 !isSel && 'z-10',
 )}
 style={{
 left: `${fixture.x}%`,
 top: `${fixture.y}%`,
 width: `${fixture.w}%`,
 height: `${fixture.h}%`,
 transform: isDrag ? undefined : `scale(${depthScaleForY(fixture.y, liveDepth)})`,
 transformOrigin: '50% 100%',
 ...(!isSel && !isDrag ? furnitureDepthStyle(fixture.y, liveDepth) : {}),
 }}
 >
 <FixtureRenderer fixture={fixture} fill showLabel={fixture.kind !== 'flower'} />
 </div>
 );
 })}

 {blueprint.furniture.map((item) => {
 if (item.kind === 'zone') {
 const isSel = selected?.kind === 'zone' && selected.id === item.id;
 return (
 <div
 key={item.id}
 onMouseDown={(e) => handleMouseDown('zone', item.id, e, 'topleft')}
 onClick={(e) => { e.stopPropagation(); setSelected({ kind: 'zone', id: item.id }); }}
 className={cn(
 'absolute border border-dashed border-primary/40 bg-primary/5 rounded-[var(--radius-card)] flex items-center justify-center text-xs font-semibold text-primary cursor-grab z-10 em-floor-item',
 isSel && 'ring-2 ring-primary/50 bg-primary/10',
 )}
 style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.w}%`, height: `${item.h}%` }}
 >
 {item.label}
 </div>
 );
 }

 if (item.kind === 'row') {
 const isSel = selected?.kind === 'row' && selected.id === item.id;
 const isDrag = dragging?.kind === 'row' && dragging.id === item.id;
 return (
 <div
 key={item.id}
 onMouseDown={(e) => handleMouseDown('row', item.id, e)}
 onClick={(e) => { e.stopPropagation(); setSelected({ kind: 'row', id: item.id }); }}
 className={cn(
 'absolute -translate-x-1/2 -translate-y-1/2 cursor-grab em-floor-item',
 isSel && 'em-floor-item--active z-40',
 isDrag && 'z-40 scale-105 drop-shadow-md',
 !isSel && !isDrag && 'z-20',
 )}
 style={{
 left: `${item.x}%`,
 top: `${item.y}%`,
 transform: isDrag ? undefined : `translate(-50%, -50%) scale(${depthScaleForY(item.y, liveDepth)})`,
 ...(!isSel && !isDrag ? furnitureDepthStyle(item.y, liveDepth) : {}),
 }}
 >
 <div
 className={cn(
 'px-3 py-2 bg-surface/95 backdrop-blur-sm border rounded-[var(--radius-card)] min-w-[110px] shadow-[var(--shadow-soft)]',
 isSel ? 'border-primary ring-2 ring-primary/20' : 'border-border',
 )}
 >
 <p className="text-[10px] font-semibold text-foreground text-center truncate">{item.label}</p>
 <div className="flex justify-center gap-1 mt-1.5 flex-wrap max-w-[130px]">
 {Array.from({ length: Math.min(item.seatCount, 14) }).map((_, i) => (
 <ChairRenderer key={i} chairType={item.chairType} imageUrl={item.chairImageUrl} size="sm" />
 ))}
 </div>
 </div>
 </div>
 );
 }

 const isSel = selected?.kind === 'table' && selected.id === item.id;
 const isDrag = dragging?.kind === 'table' && dragging.id === item.id;
 const tableColor = resolveTableColor(item.tableColor, blueprint.metadata.defaultTableColor);
 const { className: tableClass, style: tableStyle } = getTableVisualStyle(item.shape, isSel, tableColor, item.tableImageUrl);
 const depthScale = depthScaleForY(item.y, liveDepth);
 return (
 <div
 key={item.id}
 onMouseDown={(e) => handleMouseDown('table', item.id, e)}
 onClick={(e) => { e.stopPropagation(); setSelected({ kind: 'table', id: item.id }); }}
 className={cn(
 'absolute cursor-grab em-floor-item',
 isSel && 'em-floor-item--active z-40',
 isDrag && 'em-floor-item--dragging',
 !isSel && !isDrag && 'z-20',
 )}
 style={{
 left: `${item.x}%`,
 top: `${item.y}%`,
 transform: isDrag
 ? undefined
 : `translate(-50%, -50%) scale(${depthScale})${item.rotation ? ` rotate(${item.rotation}deg)` : ''}`,
 ...(isSel || isDrag ? { zIndex: 50 } : furnitureDepthStyle(item.y, liveDepth)),
 }}
 >
 <div
 className={cn('relative flex items-center justify-center', tableClass)}
 style={tableStyle}
 >
 <div className="px-2 text-center z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.85)]">
 <div className="text-[10px] font-semibold truncate max-w-[80px] tracking-tight">{item.name}</div>
 <div className="text-[8px] opacity-80 tabular-nums">{item.capacity} pl.</div>
 </div>
 {Array.from({ length: item.capacity }).map((_, seatIndex) => {
 const coords = getSeatCoordinates(item.shape, item.capacity, seatIndex, 42);
 return (
 <span
 key={seatIndex}
 className="absolute transition-transform duration-150 hover:scale-110"
 style={{
 left: `calc(50% + ${coords.x}px)`,
 top: `calc(50% + ${coords.y}px)`,
 transform: 'translate(-50%, -50%)',
 }}
 >
 <ChairRenderer chairType={item.chairType} imageUrl={item.chairImageUrl} size="md" />
 </span>
 );
 })}
 </div>
 </div>
 );
 })}

 {blueprint.furniture.length === 0 && blueprint.fixtures.length <= 1 && (
 <div className="absolute inset-0 flex flex-col items-center justify-center text-muted pointer-events-none z-10">
 <div className="w-12 h-12 rounded-[var(--radius-card)] bg-surface border border-border flex items-center justify-center mb-2">
 <LayoutGrid className="w-6 h-6 text-primary" />
 </div>
 <p className="text-sm font-semibold text-foreground">Plan vide</p>
 <p className="text-xs text-muted mt-1">Choisissez un modèle ou ajoutez des éléments</p>
 </div>
 )}
 </FloorDepthFrame>
 );

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
 <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
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
 <>
 <div className="p-4 bg-surface-muted rounded-xl border space-y-3">
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
 className={`text-left py-2 px-2.5 rounded-lg border text-[10px] font-bold transition overflow-hidden ${
 blueprint.metadata.roomThemeId === theme.id || (!blueprint.metadata.roomThemeId && theme.id === 'classic')
 ? 'bg-primary/10 border-primary/50 text-primary ring-1 ring-primary/20'
 : 'border-border text-muted hover:bg-white'
 }`}
 >
 <span
 className="block h-8 rounded-md mb-1.5 border border-black/5"
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
 <div className="p-4 bg-surface-muted rounded-xl border space-y-3">
 <p className="text-xs font-bold uppercase text-muted flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> Sol de la salle</p>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
 {(Object.keys(floorTypeLabels) as FloorType[]).filter((k) => k !== 'custom').map((type) => (
 <button
 key={type}
 type="button"
 onClick={() => setFloorType(type)}
 className={`py-2 px-2 rounded-lg border text-[10px] font-bold transition overflow-hidden ${
 effectiveFloorType === type && !blueprint.metadata.floorImageUrl
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
 </>
 )}
 <div className="p-4 bg-surface-muted rounded-xl border space-y-3">
 <p className="text-xs font-bold uppercase text-muted flex items-center gap-1"><LayoutGrid className="w-3.5 h-3.5" /> Agencement auto</p>
 <p className="text-[10px] text-muted leading-relaxed">
 Répartit les tables déverrouillées dans la salle, en évitant la scène.
 </p>
 <div className="flex flex-wrap gap-1.5">
 {(Object.keys(arrangeDensityLabels) as ArrangeDensity[]).map((id) => (
 <button
 key={id}
 type="button"
 onClick={() => setArrangeDensity(id)}
 className={`px-2 py-1 rounded-md border text-[10px] font-bold ${
 arrangeDensity === id ? 'bg-primary/10 border-primary/40 text-primary' : 'border-border text-muted hover:bg-white'
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
 className="inline-flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border border-border text-[10px] font-bold text-muted hover:bg-white hover:text-foreground"
 >
 <Icon className="w-3.5 h-3.5" />
 {label}
 </button>
 ))}
 </div>
 <div className="space-y-1.5 pt-1">
 <label className="flex items-center justify-between gap-2 text-[10px] font-bold text-muted">
 <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Profondeur 2D</span>
 <span className="tabular-nums">{depthAmount}%</span>
 </label>
 <input
 type="range"
 min={0}
 max={100}
 value={depthAmount}
 onChange={(e) => setDepthAmount(Number(e.target.value))}
 className="w-full accent-indigo-600"
 />
 <p className="text-[10px] text-muted leading-relaxed">
 0 = plan à plat · 100 = salle en perspective (le sol recule, le fond est plus petit). Le plan se remet à plat pendant un glisser-déposer.
 </p>
 </div>
 </div>
 <div className="p-4 bg-surface-muted rounded-xl border space-y-3">
 <p className="text-xs font-bold uppercase text-muted flex items-center gap-1"><Ruler className="w-3.5 h-3.5" /> Dimensions réelles</p>
 <div className="grid grid-cols-2 gap-2">
 <label className="text-xs space-y-1">
 <span className="font-semibold text-muted">Largeur (m)</span>
 <input
 type="number"
 min={5}
 max={80}
 value={blueprint.canvas.widthM}
 onChange={(e) => updateBlueprint({ ...blueprint, canvas: { ...blueprint.canvas, widthM: parseInt(e.target.value, 10) || 5 } }, { message: 'Largeur de salle modifiée', kind: 'settings' })}
 className="w-full px-2 py-1.5 rounded-lg border text-sm"
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
 className="w-full px-2 py-1.5 rounded-lg border text-sm"
 />
 </label>
 </div>
 </div>
 <div className="p-4 bg-surface-muted rounded-xl border space-y-3">
 <p className="text-xs font-bold uppercase text-muted flex items-center gap-1"><Palette className="w-3.5 h-3.5" /> Couleur des tables</p>
 <div className="flex gap-2 items-center">
 <input
 type="color"
 value={blueprint.metadata.defaultTableColor ?? '#ffffff'}
 onChange={(e) => setDefaultTableColor(e.target.value)}
 className="w-12 h-9 rounded-lg border cursor-pointer shrink-0"
 />
 <button
 type="button"
 onClick={() => applyTableColorToAll(blueprint.metadata.defaultTableColor ?? '#ffffff')}
 className="flex-1 py-2 px-2 rounded-lg border border-primary/30 bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/15"
 >
 Appliquer à toutes les tables
 </button>
 </div>
 </div>
 {caps.canChangeOutline ? (
 <div className="p-4 bg-surface-muted rounded-xl border space-y-3">
 <p className="text-xs font-bold uppercase text-muted flex items-center gap-1"><Shapes className="w-3.5 h-3.5" /> Forme de la salle</p>
 <div className="grid grid-cols-3 gap-2">
 {(Object.keys(roomOutlineLabels) as RoomOutlineShape[]).map((shape) => (
 <button
 key={shape}
 type="button"
 onClick={() => setRoomOutlineShape(shape)}
 className={`py-2 px-1.5 rounded-lg border text-[10px] font-bold transition ${outline.shape === shape ? 'bg-primary/10 border-primary/50 text-primary' : 'border-border text-muted hover:bg-white'}`}
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
 <LayoutActionPanel actions={actionLog} />
 </div>
 );
 }

 if (selectedFixture) {
 const isColumn = selectedFixture.kind === 'pillar' || selectedFixture.kind === 'column';
 const isStage = selectedFixture.kind === 'stage' || selectedFixture.kind === 'podium';
 const isFlower = selectedFixture.kind === 'flower';
 const canHaveImage = isColumn || isStage || isFlower;

 return (
 <div className="space-y-3">
 <div className="p-4 bg-surface-muted rounded-xl border space-y-3">
 <p className="text-xs font-bold uppercase text-muted">
 {isFlower ? 'Décoration florale' : isColumn ? 'Colonne / Poteau' : isStage ? 'Scène / Podium' : `Fixe — ${selectedFixture.kind}`}
 </p>
 <label className="block text-xs space-y-1">
 <span className="font-semibold text-muted">Libellé</span>
 <input value={selectedFixture.label ?? ''} onChange={(e) => updateFixture(selectedFixture.id, { label: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" />
 </label>
 <div className="grid grid-cols-2 gap-2">
 <label className="text-xs space-y-1">
 <span className="font-semibold text-muted">Largeur %</span>
 <input type="number" min={1} max={100} value={Math.round(selectedFixture.w)} onChange={(e) => updateFixture(selectedFixture.id, { w: parseFloat(e.target.value) })} className="w-full px-2 py-1.5 rounded-lg border text-sm" />
 </label>
 <label className="text-xs space-y-1">
 <span className="font-semibold text-muted">Hauteur %</span>
 <input type="number" min={1} max={100} value={Math.round(selectedFixture.h)} onChange={(e) => updateFixture(selectedFixture.id, { h: parseFloat(e.target.value) })} className="w-full px-2 py-1.5 rounded-lg border text-sm" />
 </label>
 </div>

 {isFlower && (
 <>
 <label className="block text-xs space-y-1">
 <span className="font-semibold text-muted">Type de fleurs</span>
 <select
 value={selectedFixture.flowerType ?? 'boquet'}
 onChange={(e) => updateFixture(selectedFixture.id, { flowerType: e.target.value as FlowerType }, 'Type de fleurs modifié')}
 className="w-full px-2 py-1.5 rounded-lg border text-sm"
 >
 {Object.entries(flowerTypeLabels).map(([k, v]) => (
 <option key={k} value={k}>{v}</option>
 ))}
 </select>
 </label>
 <label className="block text-xs space-y-1">
 <span className="font-semibold text-muted">Couleur des fleurs</span>
 <input type="color" value={selectedFixture.flowerColor ?? '#e11d48'} onChange={(e) => updateFixture(selectedFixture.id, { flowerColor: e.target.value }, 'Couleur florale modifiée')} className="w-full h-9 rounded-lg border cursor-pointer" />
 </label>
 </>
 )}

 {isColumn && (
 <>
 <label className="block text-xs space-y-1">
 <span className="font-semibold text-muted">Forme colonne</span>
 <select value={selectedFixture.columnShape ?? 'round'} onChange={(e) => updateFixture(selectedFixture.id, { columnShape: e.target.value as ColumnShape }, 'Forme colonne modifiée')} className="w-full px-2 py-1.5 rounded-lg border text-sm">
 <option value="round">Ronde</option>
 <option value="square">Carrée</option>
 </select>
 </label>
 <label className="block text-xs space-y-1">
 <span className="font-semibold text-muted">Couleur (sans image)</span>
 <input type="color" value={selectedFixture.color ?? '#78716c'} onChange={(e) => updateFixture(selectedFixture.id, { color: e.target.value })} className="w-full h-9 rounded-lg border cursor-pointer" />
 </label>
 <label className="block text-xs space-y-1">
 <span className="font-semibold text-muted">Rotation (°)</span>
 <input type="number" min={0} max={360} value={selectedFixture.rotation ?? 0} onChange={(e) => updateFixture(selectedFixture.id, { rotation: parseFloat(e.target.value) })} className="w-full px-2 py-1.5 rounded-lg border text-sm" />
 </label>
 </>
 )}

 {canHaveImage && (
 <div className="space-y-2 pt-2 border-t border-border">
 <p className="text-xs font-semibold text-muted flex items-center gap-1"><ImagePlus className="w-3.5 h-3.5" /> Image personnalisée</p>
 <button
 type="button"
 onClick={() => setCropTarget({ kind: 'fixture', id: selectedFixture.id })}
 className="w-full py-2 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-bold hover:bg-primary/15"
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
 <div className="p-4 bg-surface-muted rounded-xl border space-y-3">
 <p className="text-xs font-bold uppercase text-muted">Table</p>
 <label className="block text-xs space-y-1">
 <span className="font-semibold text-muted">Nom</span>
 <input value={selectedFurniture.name} onChange={(e) => updateFurniture(selectedFurniture.id, { name: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" />
 </label>
 <div className="grid grid-cols-2 gap-2">
 <label className="text-xs space-y-1">
 <span className="font-semibold text-muted">Forme</span>
 <select value={selectedFurniture.shape} onChange={(e) => updateFurniture(selectedFurniture.id, { shape: e.target.value as TableShape })} className="w-full px-2 py-1.5 rounded-lg border text-sm">
 {caps.tableShapes.includes('round') ? <option value="round">Ronde</option> : null}
 {caps.tableShapes.includes('rectangular') ? <option value="rectangular">Rectangulaire</option> : null}
 {caps.tableShapes.includes('square') ? <option value="square">Carrée</option> : null}
 {caps.tableShapes.includes('oval') ? <option value="oval">Ovale</option> : null}
 </select>
 </label>
 <label className="text-xs space-y-1">
 <span className="font-semibold text-muted">Places</span>
 <input type="number" min={2} max={24} value={selectedFurniture.capacity} onChange={(e) => updateFurniture(selectedFurniture.id, { capacity: parseInt(e.target.value, 10) })} className="w-full px-2 py-1.5 rounded-lg border text-sm" />
 </label>
 </div>
 <label className="block text-xs space-y-1">
 <span className="font-semibold text-muted flex items-center gap-1"><Palette className="w-3 h-3" /> Couleur de cette table</span>
 <div className="flex gap-2 items-center">
 <input
 type="color"
 value={selectedFurniture.tableColor ?? blueprint.metadata.defaultTableColor ?? '#ffffff'}
 onChange={(e) => updateFurniture(selectedFurniture.id, { tableColor: e.target.value }, 'Couleur de table modifiée')}
 className="w-full h-9 rounded-lg border cursor-pointer"
 />
 <button
 type="button"
 onClick={() => updateFurniture(selectedFurniture.id, { tableColor: undefined }, 'Couleur table réinitialisée')}
 className="shrink-0 px-2 py-1 text-[10px] font-bold text-muted border rounded-lg"
 >
 Défaut
 </button>
 </div>
 </label>
 <label className="block text-xs space-y-1">
 <span className="font-semibold text-muted">Type de chaise</span>
 <select value={selectedFurniture.chairType} onChange={(e) => updateFurniture(selectedFurniture.id, { chairType: e.target.value as ChairType })} className="w-full px-2 py-1.5 rounded-lg border text-sm">
 {Object.entries(chairTypeLabels).map(([k, v]) => (
 <option key={k} value={k}>{v}</option>
 ))}
 </select>
 </label>
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
 className="w-full px-2 py-1.5 rounded-lg border text-sm"
 />
 </label>
 ) : null}
 <div className="flex gap-2">
 {caps.canLock ? (
 <button
 type="button"
 onClick={() => updateFurniture(selectedFurniture.id, { locked: !selectedFurniture.locked }, selectedFurniture.locked ? 'Table déverrouillée' : 'Table verrouillée')}
 className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-lg border text-[10px] font-bold"
 >
 {selectedFurniture.locked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
 {selectedFurniture.locked ? 'Déverrouiller' : 'Verrouiller'}
 </button>
 ) : null}
 {caps.canDuplicate ? (
 <button
 type="button"
 onClick={duplicateSelectedTable}
 className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-lg border border-primary/30 bg-primary/10 text-primary text-[10px] font-bold"
 >
 <Copy className="w-3 h-3" /> Dupliquer
 </button>
 ) : null}
 </div>
 <div className="pt-2 border-t border-border space-y-1.5">
 <p className="text-[10px] font-bold uppercase text-muted">Appliquer à toutes les tables</p>
 <div className="grid grid-cols-2 gap-1.5">
 <button
 type="button"
 onClick={() => updateBlueprint(applyTableStyleToAll(blueprint, selectedFurniture.id, ['shape']), { message: 'Forme appliquée à toutes les tables', kind: 'edit' })}
 className="py-1.5 px-2 rounded-lg border text-[10px] font-bold text-muted hover:bg-white"
 >
 Forme
 </button>
 <button
 type="button"
 onClick={() => updateBlueprint(applyTableStyleToAll(blueprint, selectedFurniture.id, ['chairType']), { message: 'Chaises appliquées à toutes les tables', kind: 'edit' })}
 className="py-1.5 px-2 rounded-lg border text-[10px] font-bold text-muted hover:bg-white"
 >
 Chaises
 </button>
 <button
 type="button"
 onClick={() => updateBlueprint(applyTableStyleToAll(blueprint, selectedFurniture.id, ['tableColor']), { message: 'Couleur appliquée à toutes les tables', kind: 'edit' })}
 className="py-1.5 px-2 rounded-lg border text-[10px] font-bold text-muted hover:bg-white"
 >
 Couleur
 </button>
 <button
 type="button"
 onClick={() => updateBlueprint(applyTableStyleToAll(blueprint, selectedFurniture.id, ['capacity']), { message: 'Places appliquées à toutes les tables', kind: 'edit' })}
 className="py-1.5 px-2 rounded-lg border text-[10px] font-bold text-muted hover:bg-white"
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
 <div className="p-4 bg-surface-muted rounded-xl border space-y-3">
 <p className="text-xs font-bold uppercase text-muted">Rangée</p>
 <label className="block text-xs space-y-1">
 <span className="font-semibold text-muted">Libellé</span>
 <input value={selectedFurniture.label} onChange={(e) => updateFurniture(selectedFurniture.id, { label: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" />
 </label>
 <label className="block text-xs space-y-1">
 <span className="font-semibold text-muted">Places</span>
 <input type="number" min={2} max={60} value={selectedFurniture.seatCount} onChange={(e) => updateFurniture(selectedFurniture.id, { seatCount: parseInt(e.target.value, 10) })} className="w-full px-3 py-2 rounded-lg border text-sm" />
 </label>
 <label className="block text-xs space-y-1">
 <span className="font-semibold text-muted">Type de siège</span>
 <select value={selectedFurniture.chairType} onChange={(e) => updateFurniture(selectedFurniture.id, { chairType: e.target.value as ChairType })} className="w-full px-2 py-1.5 rounded-lg border text-sm">
 {Object.entries(chairTypeLabels).map(([k, v]) => (
 <option key={k} value={k}>{v}</option>
 ))}
 </select>
 </label>
 {caps.canCustomImages ? renderChairImageUpload(selectedFurniture.id, selectedFurniture.chairImageUrl) : null}
 </div>
 <LayoutActionPanel actions={actionLog} />
 </div>
 );
 }

 if (selectedFurniture?.kind === 'zone') {
 return (
 <div className="space-y-3">
 <div className="p-4 bg-surface-muted rounded-xl border space-y-3">
 <p className="text-xs font-bold uppercase text-muted">Zone</p>
 <label className="block text-xs space-y-1">
 <span className="font-semibold text-muted">Libellé</span>
 <input value={selectedFurniture.label} onChange={(e) => updateFurniture(selectedFurniture.id, { label: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" />
 </label>
 <div className="grid grid-cols-2 gap-2">
 <label className="text-xs space-y-1">
 <span className="font-semibold text-muted">Largeur %</span>
 <input type="number" min={8} max={90} value={selectedFurniture.w} onChange={(e) => updateFurniture(selectedFurniture.id, { w: parseInt(e.target.value, 10) || 20 })} className="w-full px-2 py-1.5 rounded-lg border text-sm" />
 </label>
 <label className="text-xs space-y-1">
 <span className="font-semibold text-muted">Hauteur %</span>
 <input type="number" min={8} max={90} value={selectedFurniture.h} onChange={(e) => updateFurniture(selectedFurniture.id, { h: parseInt(e.target.value, 10) || 16 })} className="w-full px-2 py-1.5 rounded-lg border text-sm" />
 </label>
 </div>
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
 className="w-[88px] px-2 py-1 rounded-lg border border-primary/40 text-xs font-bold"
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
 className="w-[72px] px-2 py-1 rounded-lg border text-xs"
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
 className="px-2 py-1 rounded-lg border text-xs"
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
 className="px-2 py-1 rounded-lg border text-xs max-w-[140px]"
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
 className={`shrink-0 text-left px-3 py-2 rounded-xl border text-[10px] font-bold transition min-w-[128px] ${blueprint.templateId === tpl.id ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-white border-border text-muted hover:border-primary/30'}`}
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
 className="px-2 py-1 rounded-lg border text-xs min-w-[140px] flex-1 max-w-[220px]"
 />
 <button
 type="button"
 onClick={saveCurrentAsTemplate}
 className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-primary/30 bg-primary/10 text-primary text-[10px] font-bold"
 >
 <BookmarkPlus className="w-3 h-3" />
 Enregistrer le plan
 </button>
 {(blueprint.metadata.customTemplates ?? []).map((tpl) => (
 <span key={tpl.id} className="inline-flex items-center gap-0.5">
 <button
 type="button"
 onClick={() => applyCustomTemplate(tpl.id)}
 className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${blueprint.templateId === tpl.id ? 'bg-primary/10 border-primary/50 text-primary' : 'bg-white border-border text-muted hover:border-primary/30'}`}
 title={tpl.description || tpl.name}
 >
 {tpl.name}
 </button>
 <button
 type="button"
 onClick={() => updateBlueprint(deleteCustomTemplateFromBlueprint(blueprint, tpl.id), { message: `Modèle « ${tpl.name} » supprimé`, kind: 'template' })}
 className="p-1 text-rose-500 hover:bg-rose-50 rounded-md"
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
 <button type="button" onClick={addTable} className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold shadow-sm">
 <Plus className="w-3.5 h-3.5" /> Table
 </button>
 {caps.canAddRows ? (
 <button type="button" onClick={addRow} className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-border text-foreground rounded-lg text-xs font-bold">
 <Plus className="w-3.5 h-3.5" /> Rangée
 </button>
 ) : null}
 {caps.canZones ? (
 <>
 <button type="button" onClick={() => addZone('Piste de danse')} className="px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-800 rounded-lg text-xs font-bold">Piste</button>
 <button type="button" onClick={() => addZone('Espace VIP')} className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-bold">VIP</button>
 <button type="button" onClick={() => addZone('Buffet')} className="px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg text-xs font-bold">Buffet</button>
 </>
 ) : null}
 {caps.fixtureKinds.includes('stage') ? (
 <button type="button" onClick={() => addFixture('stage')} className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-bold">Scène</button>
 ) : null}
 {caps.fixtureKinds.includes('podium') ? (
 <button type="button" onClick={() => addFixture('podium')} className="px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg text-xs font-bold">Podium</button>
 ) : null}
 {caps.fixtureKinds.includes('column') ? (
 <button type="button" onClick={() => addFixture('column')} className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-100 border border-stone-300 text-stone-700 rounded-lg text-xs font-bold">
 <Columns3 className="w-3.5 h-3.5" /> Colonne
 </button>
 ) : null}
 {caps.fixtureKinds.includes('flower') ? (
 <button type="button" onClick={() => addFixture('flower')} className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold">
 <Flower2 className="w-3.5 h-3.5" /> Fleurs
 </button>
 ) : null}
 {caps.fixtureKinds.includes('aisle') ? (
 <button type="button" onClick={() => addFixture('aisle')} className="px-3 py-1.5 bg-surface-muted border border-border text-muted rounded-lg text-xs font-bold">Allée</button>
 ) : null}
 {caps.fixtureKinds.includes('entrance') ? (
 <button type="button" onClick={() => addFixture('entrance')} className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold">Entrée</button>
 ) : null}
 {caps.fixtureKinds.includes('perimeter') ? (
 <button type="button" onClick={() => addFixture('perimeter')} className="px-3 py-1.5 bg-sky-50 border border-sky-200 text-sky-800 rounded-lg text-xs font-bold">Périmètre</button>
 ) : null}
 {selected && (
 <button type="button" onClick={deleteSelected} className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold ml-auto">
 <Trash2 className="w-3.5 h-3.5" /> Supprimer
 </button>
 )}
 {onRegenerate && (
 <button type="button" onClick={() => { onRegenerate(); log('Plan régénéré depuis les paramètres', 'template'); }} className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary rounded-lg text-xs font-bold">
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
 Éditeur 2D — {roomTypeLabels[blueprint.roomType as RoomType]}
 </p>
 <p className="text-xs text-muted mt-0.5">
 {blueprint.metadata.totalSeats} places · {roomOutlineLabels[outline.shape]}
 {caps.canSnapGrid ? ' · Grille' : ''} · Éditeur {caps.label}
 </p>
 </div>
 <button
 type="button"
 onClick={() => setIsExpanded((v) => !v)}
 className="inline-flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-xs font-bold text-muted hover:bg-surface-muted"
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
 <button type="button" onClick={() => setIsExpanded(false)} className="px-5 py-2.5 bg-surface-muted text-foreground rounded-xl text-xs font-bold">Fermer le mode agrandi</button>
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
