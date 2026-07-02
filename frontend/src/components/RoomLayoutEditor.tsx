'use client';

import React, { useRef, useState, useCallback } from 'react';
import {
  Plus, Trash2, RefreshCw, Maximize2, Minimize2, Move, LayoutGrid, LayoutTemplate, Shapes, Columns3, ImagePlus, Flower2, Palette, Sparkles,
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
  chairTypeLabels,
  createBlueprintFixture,
  createBlueprintRow,
  createBlueprintTable,
  defaultRoomOutline,
  ensureBlueprintDefaults,
  flowerTypeLabels,
  getRoomOutlineClipPath,
  refreshBlueprintMetadata,
  resolveTableColor,
  roomOutlineLabels,
  roomTypeLabels,
} from '@/lib/roomLayoutUtils';
import { prependLayoutAction, LayoutActionEntry } from '@/lib/layoutActionLog';
import { getSeatCoordinates, getTableVisualStyle } from '@/lib/tablePlanUtils';
import { readImageFile } from '@/lib/imageCropUtils';
import { applyRoomTheme, getRoomTheme, roomThemeList, RoomThemeId } from '@/lib/roomThemeUtils';

type SelectableKind = 'table' | 'row' | 'zone' | 'fixture';

interface RoomLayoutEditorProps {
  blueprint: RoomLayoutBlueprint;
  onChange: (blueprint: RoomLayoutBlueprint) => void;
  onRegenerate?: () => void;
  readOnly?: boolean;
}

type CropTarget = { kind: 'fixture'; id: string } | null;

export default function RoomLayoutEditor({
  blueprint: rawBlueprint,
  onChange,
  onRegenerate,
  readOnly = false,
}: RoomLayoutEditorProps) {
  const blueprint = ensureBlueprintDefaults(rawBlueprint);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<{ kind: SelectableKind; id: string } | null>(null);
  const [dragging, setDragging] = useState<{ kind: SelectableKind; id: string } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isExpanded, setIsExpanded] = useState(false);
  const [actionLog, setActionLog] = useState<LayoutActionEntry[]>([]);
  const [cropTarget, setCropTarget] = useState<CropTarget>(null);

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
    const xPct = (Math.max(0, Math.min(rect.width, e.clientX - rect.left - dragOffset.x)) / rect.width) * 100;
    const yPct = (Math.max(0, Math.min(rect.height, e.clientY - rect.top - dragOffset.y)) / rect.height) * 100;

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
    const count = blueprint.furniture.filter((f) => f.kind === 'table').length + 1;
    const defaultChair: ChairType =
      blueprint.roomType === 'CONFERENCE' || blueprint.roomType === 'AMPHITHEATER' ? 'THEATER' : 'BANQUET';
    const table = createBlueprintTable(count, { chairType: defaultChair });
    updateBlueprint({ ...blueprint, furniture: [...blueprint.furniture, table] }, { message: `Table « ${table.name} » ajoutée`, kind: 'add' });
    setSelected({ kind: 'table', id: table.id });
  };

  const addRow = () => {
    const count = blueprint.furniture.filter((f) => f.kind === 'row').length + 1;
    const row = createBlueprintRow(count);
    updateBlueprint({ ...blueprint, furniture: [...blueprint.furniture, row] }, { message: `Rangée « ${row.label} » ajoutée`, kind: 'add' });
    setSelected({ kind: 'row', id: row.id });
  };

  const addFixture = (kind: RoomLayoutBlueprint['fixtures'][number]['kind']) => {
    const fixture = createBlueprintFixture(kind);
    updateBlueprint({ ...blueprint, fixtures: [...blueprint.fixtures, fixture] }, { message: `${fixture.label || kind} ajouté`, kind: 'add' });
    setSelected({ kind: 'fixture', id: fixture.id });
  };

  const applyTemplate = (templateId: string) => {
    const next = applyRoomTemplate(templateId);
    if (!next) return;
    onChange(next);
    log(`Modèle « ${ROOM_LAYOUT_TEMPLATES.find((t) => t.id === templateId)?.name} » appliqué`, 'template');
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
    const next = applyRoomTheme(blueprint, themeId);
    onChange(refreshBlueprintMetadata(ensureBlueprintDefaults(next)));
    log(`Thème « ${getRoomTheme(themeId).name} » appliqué`, 'settings');
  };

  const activeTheme = getRoomTheme(blueprint.metadata.roomThemeId);

  const outline = blueprint.roomOutline!;
  const clipPath = getRoomOutlineClipPath(outline.shape);

  const renderRoomOutline = () => (
    <div
      className="absolute pointer-events-none z-0"
      style={{
        left: `${outline.x}%`,
        top: `${outline.y}%`,
        width: `${outline.w}%`,
        height: `${outline.h}%`,
        background: outline.fill,
        border: `${outline.strokeWidth ?? 2}px solid ${outline.stroke}`,
        borderRadius: outline.shape === 'circle' ? '50%' : outline.shape === 'square' ? '4%' : '8px',
        clipPath: clipPath,
      }}
    />
  );

  const renderCanvas = (className: string) => (
    <div
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={() => setSelected(null)}
      className={`relative w-full ${className} border-2 rounded-2xl overflow-hidden shadow-inner`}
      style={{
        backgroundColor: activeTheme.canvasBackground,
        backgroundImage: `linear-gradient(${activeTheme.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${activeTheme.gridColor} 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }}
    >
      {renderRoomOutline()}

      {blueprint.fixtures.map((fixture) => {
        const isSel = selected?.kind === 'fixture' && selected.id === fixture.id;
        return (
          <div
            key={fixture.id}
            onMouseDown={(e) => handleMouseDown('fixture', fixture.id, e, 'topleft')}
            onClick={(e) => { e.stopPropagation(); setSelected({ kind: 'fixture', id: fixture.id }); }}
            className={`absolute cursor-move ${isSel ? 'ring-2 ring-indigo-500 z-30' : 'z-10'}`}
            style={{
              left: `${fixture.x}%`,
              top: `${fixture.y}%`,
              width: `${fixture.w}%`,
              height: `${fixture.h}%`,
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
              className={`absolute border-2 border-dashed border-sky-400 bg-sky-100/50 rounded-xl flex items-center justify-center text-xs font-semibold text-sky-800 cursor-move z-10 ${isSel ? 'ring-2 ring-indigo-500' : ''}`}
              style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.w}%`, height: `${item.h}%` }}
            >
              {item.label}
            </div>
          );
        }

        if (item.kind === 'row') {
          const isSel = selected?.kind === 'row' && selected.id === item.id;
          return (
            <div
              key={item.id}
              onMouseDown={(e) => handleMouseDown('row', item.id, e)}
              onClick={(e) => { e.stopPropagation(); setSelected({ kind: 'row', id: item.id }); }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-move ${isSel ? 'z-40' : 'z-20'}`}
              style={{ left: `${item.x}%`, top: `${item.y}%` }}
            >
              <div className={`px-3 py-2 bg-white/95 backdrop-blur border-2 rounded-xl shadow-lg min-w-[110px] ${isSel ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-300'}`}>
                <p className="text-[10px] font-bold text-slate-800 text-center truncate">{item.label}</p>
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
        const tableColor = resolveTableColor(item.tableColor, blueprint.metadata.defaultTableColor);
        const { className: tableClass, style: tableStyle } = getTableVisualStyle(item.shape, isSel, tableColor);
        return (
          <div
            key={item.id}
            onMouseDown={(e) => handleMouseDown('table', item.id, e)}
            onClick={(e) => { e.stopPropagation(); setSelected({ kind: 'table', id: item.id }); }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-move ${isSel ? 'z-40' : 'z-20'}`}
            style={{ left: `${item.x}%`, top: `${item.y}%` }}
          >
            <div className={`relative flex items-center justify-center ${tableClass} border-2`} style={tableStyle}>
              <div className="px-2 text-center z-10">
                <div className="text-[10px] font-black truncate max-w-[80px]">{item.name}</div>
                <div className="text-[8px] opacity-80">{item.capacity} pl.</div>
              </div>
              {Array.from({ length: item.capacity }).map((_, seatIndex) => {
                const coords = getSeatCoordinates(item.shape, item.capacity, seatIndex, 42);
                return (
                  <span
                    key={seatIndex}
                    className="absolute"
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
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none z-10">
          <LayoutGrid className="w-12 h-12 mb-2 text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">Plan vide — choisissez un modèle ou ajoutez des éléments</p>
        </div>
      )}
    </div>
  );

  const renderChairImageUpload = (id: string, currentUrl?: string) => (
    <label className="block text-xs space-y-1">
      <span className="font-semibold text-slate-600 flex items-center gap-1"><ImagePlus className="w-3.5 h-3.5" /> Image de chaise (optionnel)</span>
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

  const renderEditPanel = () => {
    if (readOnly) return null;

    if (!selected) {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl border space-y-3">
            <p className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Thème de la salle</p>
            <div className="grid grid-cols-2 gap-2">
              {roomThemeList.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => applyTheme(theme.id)}
                  className={`text-left py-2 px-2.5 rounded-lg border text-[10px] font-bold transition ${
                    blueprint.metadata.roomThemeId === theme.id || (!blueprint.metadata.roomThemeId && theme.id === 'classic')
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-800 ring-1 ring-indigo-200'
                      : 'border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full border shrink-0" style={{ background: theme.roomOutline.fill, borderColor: theme.roomOutline.stroke }} />
                    {theme.name}
                  </span>
                  <span className="font-normal text-slate-400 block mt-0.5 line-clamp-1">{theme.description}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border space-y-3">
            <p className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1"><Palette className="w-3.5 h-3.5" /> Couleur des tables</p>
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
                className="flex-1 py-2 px-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-[10px] font-bold hover:bg-indigo-100"
              >
                Appliquer à toutes les tables
              </button>
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border space-y-3">
            <p className="text-xs font-bold uppercase text-slate-500 flex items-center gap-1"><Shapes className="w-3.5 h-3.5" /> Forme de la salle</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(roomOutlineLabels) as RoomOutlineShape[]).map((shape) => (
                <button
                  key={shape}
                  type="button"
                  onClick={() => setRoomOutlineShape(shape)}
                  className={`py-2 px-2 rounded-lg border text-[10px] font-bold transition ${outline.shape === shape ? 'bg-indigo-50 border-indigo-400 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-white'}`}
                >
                  {roomOutlineLabels[shape]}
                </button>
              ))}
            </div>
          </div>
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
          <div className="p-4 bg-slate-50 rounded-xl border space-y-3">
            <p className="text-xs font-bold uppercase text-slate-500">
              {isFlower ? 'Décoration florale' : isColumn ? 'Colonne / Poteau' : isStage ? 'Scène / Podium' : `Fixe — ${selectedFixture.kind}`}
            </p>
            <label className="block text-xs space-y-1">
              <span className="font-semibold text-slate-600">Libellé</span>
              <input value={selectedFixture.label ?? ''} onChange={(e) => updateFixture(selectedFixture.id, { label: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs space-y-1">
                <span className="font-semibold text-slate-600">Largeur %</span>
                <input type="number" min={1} max={100} value={Math.round(selectedFixture.w)} onChange={(e) => updateFixture(selectedFixture.id, { w: parseFloat(e.target.value) })} className="w-full px-2 py-1.5 rounded-lg border text-sm" />
              </label>
              <label className="text-xs space-y-1">
                <span className="font-semibold text-slate-600">Hauteur %</span>
                <input type="number" min={1} max={100} value={Math.round(selectedFixture.h)} onChange={(e) => updateFixture(selectedFixture.id, { h: parseFloat(e.target.value) })} className="w-full px-2 py-1.5 rounded-lg border text-sm" />
              </label>
            </div>

            {isFlower && (
              <>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-slate-600">Type de fleurs</span>
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
                  <span className="font-semibold text-slate-600">Couleur des fleurs</span>
                  <input type="color" value={selectedFixture.flowerColor ?? '#e11d48'} onChange={(e) => updateFixture(selectedFixture.id, { flowerColor: e.target.value }, 'Couleur florale modifiée')} className="w-full h-9 rounded-lg border cursor-pointer" />
                </label>
              </>
            )}

            {isColumn && (
              <>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-slate-600">Forme colonne</span>
                  <select value={selectedFixture.columnShape ?? 'round'} onChange={(e) => updateFixture(selectedFixture.id, { columnShape: e.target.value as ColumnShape }, 'Forme colonne modifiée')} className="w-full px-2 py-1.5 rounded-lg border text-sm">
                    <option value="round">Ronde</option>
                    <option value="square">Carrée</option>
                  </select>
                </label>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-slate-600">Couleur (sans image)</span>
                  <input type="color" value={selectedFixture.color ?? '#78716c'} onChange={(e) => updateFixture(selectedFixture.id, { color: e.target.value })} className="w-full h-9 rounded-lg border cursor-pointer" />
                </label>
                <label className="block text-xs space-y-1">
                  <span className="font-semibold text-slate-600">Rotation (°)</span>
                  <input type="number" min={0} max={360} value={selectedFixture.rotation ?? 0} onChange={(e) => updateFixture(selectedFixture.id, { rotation: parseFloat(e.target.value) })} className="w-full px-2 py-1.5 rounded-lg border text-sm" />
                </label>
              </>
            )}

            {canHaveImage && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-600 flex items-center gap-1"><ImagePlus className="w-3.5 h-3.5" /> Image personnalisée</p>
                <button
                  type="button"
                  onClick={() => setCropTarget({ kind: 'fixture', id: selectedFixture.id })}
                  className="w-full py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100"
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
          <div className="p-4 bg-slate-50 rounded-xl border space-y-3">
            <p className="text-xs font-bold uppercase text-slate-500">Table</p>
            <label className="block text-xs space-y-1">
              <span className="font-semibold text-slate-600">Nom</span>
              <input value={selectedFurniture.name} onChange={(e) => updateFurniture(selectedFurniture.id, { name: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs space-y-1">
                <span className="font-semibold text-slate-600">Forme</span>
                <select value={selectedFurniture.shape} onChange={(e) => updateFurniture(selectedFurniture.id, { shape: e.target.value as TableShape })} className="w-full px-2 py-1.5 rounded-lg border text-sm">
                  <option value="round">Ronde</option>
                  <option value="rectangular">Rectangulaire</option>
                  <option value="square">Carrée</option>
                  <option value="oval">Ovale</option>
                </select>
              </label>
              <label className="text-xs space-y-1">
                <span className="font-semibold text-slate-600">Places</span>
                <input type="number" min={2} max={24} value={selectedFurniture.capacity} onChange={(e) => updateFurniture(selectedFurniture.id, { capacity: parseInt(e.target.value, 10) })} className="w-full px-2 py-1.5 rounded-lg border text-sm" />
              </label>
            </div>
            <label className="block text-xs space-y-1">
              <span className="font-semibold text-slate-600 flex items-center gap-1"><Palette className="w-3 h-3" /> Couleur de cette table</span>
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
                  className="shrink-0 px-2 py-1 text-[10px] font-bold text-slate-500 border rounded-lg"
                >
                  Défaut
                </button>
              </div>
            </label>
            <label className="block text-xs space-y-1">
              <span className="font-semibold text-slate-600">Type de chaise</span>
              <select value={selectedFurniture.chairType} onChange={(e) => updateFurniture(selectedFurniture.id, { chairType: e.target.value as ChairType })} className="w-full px-2 py-1.5 rounded-lg border text-sm">
                {Object.entries(chairTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            {renderChairImageUpload(selectedFurniture.id, selectedFurniture.chairImageUrl)}
          </div>
          <LayoutActionPanel actions={actionLog} />
        </div>
      );
    }

    if (selectedFurniture?.kind === 'row') {
      return (
        <div className="space-y-3">
          <div className="p-4 bg-slate-50 rounded-xl border space-y-3">
            <p className="text-xs font-bold uppercase text-slate-500">Rangée</p>
            <label className="block text-xs space-y-1">
              <span className="font-semibold text-slate-600">Libellé</span>
              <input value={selectedFurniture.label} onChange={(e) => updateFurniture(selectedFurniture.id, { label: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" />
            </label>
            <label className="block text-xs space-y-1">
              <span className="font-semibold text-slate-600">Places</span>
              <input type="number" min={2} max={60} value={selectedFurniture.seatCount} onChange={(e) => updateFurniture(selectedFurniture.id, { seatCount: parseInt(e.target.value, 10) })} className="w-full px-3 py-2 rounded-lg border text-sm" />
            </label>
            <label className="block text-xs space-y-1">
              <span className="font-semibold text-slate-600">Type de siège</span>
              <select value={selectedFurniture.chairType} onChange={(e) => updateFurniture(selectedFurniture.id, { chairType: e.target.value as ChairType })} className="w-full px-2 py-1.5 rounded-lg border text-sm">
                {Object.entries(chairTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            {renderChairImageUpload(selectedFurniture.id, selectedFurniture.chairImageUrl)}
          </div>
          <LayoutActionPanel actions={actionLog} />
        </div>
      );
    }

    return null;
  };

  const templateBar = !readOnly && (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
        <LayoutTemplate className="w-3.5 h-3.5" /> Modèles de salle
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ROOM_LAYOUT_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => applyTemplate(tpl.id)}
            className={`shrink-0 text-left px-3 py-2 rounded-xl border text-[10px] font-bold transition min-w-[120px] ${blueprint.templateId === tpl.id ? 'bg-indigo-50 border-indigo-400 text-indigo-800' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200'}`}
          >
            <span className="block">{tpl.name}</span>
            <span className="font-normal text-slate-400">{tpl.description}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const toolbar = !readOnly && (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={addTable} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm">
        <Plus className="w-3.5 h-3.5" /> Table
      </button>
      <button type="button" onClick={addRow} className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold">
        <Plus className="w-3.5 h-3.5" /> Rangée
      </button>
      <button type="button" onClick={() => addFixture('stage')} className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-bold">Scène</button>
      <button type="button" onClick={() => addFixture('podium')} className="px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg text-xs font-bold">Podium</button>
      <button type="button" onClick={() => addFixture('column')} className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-100 border border-stone-300 text-stone-700 rounded-lg text-xs font-bold">
        <Columns3 className="w-3.5 h-3.5" /> Colonne
      </button>
      <button type="button" onClick={() => addFixture('flower')} className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold">
        <Flower2 className="w-3.5 h-3.5" /> Fleurs
      </button>
      <button type="button" onClick={() => addFixture('aisle')} className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold">Allée</button>
      {selected && (
        <button type="button" onClick={deleteSelected} className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold ml-auto">
          <Trash2 className="w-3.5 h-3.5" /> Supprimer
        </button>
      )}
      {onRegenerate && (
        <button type="button" onClick={() => { onRegenerate(); log('Plan régénéré depuis les paramètres', 'template'); }} className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-700 rounded-lg text-xs font-bold">
          <RefreshCw className="w-3.5 h-3.5" /> Régénérer
        </button>
      )}
    </div>
  );

  const header = (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0">
      <div>
        <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Move className="w-4 h-4 text-indigo-600" />
          Éditeur 2D — {roomTypeLabels[blueprint.roomType as RoomType]}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          {blueprint.metadata.totalSeats} places · {roomOutlineLabels[outline.shape]} · Glissez-déposez
        </p>
      </div>
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
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
      <div className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm flex flex-col p-2 sm:p-3">
        <div className="bg-white rounded-2xl shadow-2xl flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-4 space-y-3 border-b border-slate-100 shrink-0">
            {header}
            {templateBar}
            {toolbar}
          </div>
          <div className="flex flex-1 min-h-0 gap-3 p-3 overflow-hidden">
            <div className="flex-[4] min-w-0 min-h-0 flex flex-col">
              {renderCanvas('flex-1 min-h-0 h-full')}
            </div>
            <div className="flex-1 min-w-[240px] max-w-[320px] overflow-y-auto shrink-0">
              {renderEditPanel()}
            </div>
          </div>
          <div className="p-3 border-t border-slate-100 flex justify-end shrink-0">
            <button type="button" onClick={() => setIsExpanded(false)} className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold">Fermer le mode agrandi</button>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 min-h-[320px]">{renderCanvas('aspect-[16/10] min-h-[320px]')}</div>
        <div className="max-h-[520px] overflow-y-auto">{renderEditPanel()}</div>
      </div>
    </div>
    </>
  );
}
