'use client';

import React, { useRef, useState } from 'react';
import {
  Plus, Trash2, RefreshCw, Maximize2, Minimize2, Move, LayoutGrid,
} from 'lucide-react';
import {
  ChairType,
  RoomLayoutBlueprint,
  RoomType,
  TableShape,
  chairTypeLabels,
  createBlueprintFixture,
  createBlueprintRow,
  createBlueprintTable,
  getChairVisualClass,
  getFixtureClass,
  refreshBlueprintMetadata,
  roomTypeLabels,
} from '@/lib/roomLayoutUtils';
import { getSeatCoordinates, getTableVisualClasses } from '@/lib/tablePlanUtils';

type SelectableKind = 'table' | 'row' | 'zone' | 'fixture';

interface RoomLayoutEditorProps {
  blueprint: RoomLayoutBlueprint;
  onChange: (blueprint: RoomLayoutBlueprint) => void;
  onRegenerate?: () => void;
  readOnly?: boolean;
}

export default function RoomLayoutEditor({
  blueprint,
  onChange,
  onRegenerate,
  readOnly = false,
}: RoomLayoutEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<{ kind: SelectableKind; id: string } | null>(null);
  const [dragging, setDragging] = useState<{ kind: SelectableKind; id: string } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isExpanded, setIsExpanded] = useState(false);

  const updateBlueprint = (next: RoomLayoutBlueprint) => {
    onChange(refreshBlueprintMetadata(next));
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
      if (anchor === 'center') {
        // already center
      }
    }

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    setDragOffset({ x: clickX - itemX, y: clickY - itemY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current || readOnly) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const xPx = Math.max(0, Math.min(rect.width, e.clientX - rect.left - dragOffset.x));
    const yPx = Math.max(0, Math.min(rect.height, e.clientY - rect.top - dragOffset.y));
    const xPct = (xPx / rect.width) * 100;
    const yPct = (yPx / rect.height) * 100;

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

  const handleMouseUp = () => setDragging(null);

  const deleteSelected = () => {
    if (!selected || readOnly) return;
    if (selected.kind === 'fixture') {
      updateBlueprint({
        ...blueprint,
        fixtures: blueprint.fixtures.filter((f) => f.id !== selected.id),
      });
    } else {
      updateBlueprint({
        ...blueprint,
        furniture: blueprint.furniture.filter((f) => f.id !== selected.id),
      });
    }
    setSelected(null);
  };

  const addTable = () => {
    const count = blueprint.furniture.filter((f) => f.kind === 'table').length + 1;
    const defaultChair: ChairType =
      blueprint.roomType === 'CONFERENCE' || blueprint.roomType === 'AMPHITHEATER' ? 'THEATER' : 'BANQUET';
    const table = createBlueprintTable(count, { chairType: defaultChair });
    updateBlueprint({ ...blueprint, furniture: [...blueprint.furniture, table] });
    setSelected({ kind: 'table', id: table.id });
  };

  const addRow = () => {
    const count = blueprint.furniture.filter((f) => f.kind === 'row').length + 1;
    const row = createBlueprintRow(count);
    updateBlueprint({ ...blueprint, furniture: [...blueprint.furniture, row] });
    setSelected({ kind: 'row', id: row.id });
  };

  const addFixture = (kind: RoomLayoutBlueprint['fixtures'][number]['kind']) => {
    const fixture = createBlueprintFixture(kind);
    updateBlueprint({ ...blueprint, fixtures: [...blueprint.fixtures, fixture] });
    setSelected({ kind: 'fixture', id: fixture.id });
  };

  const updateFurniture = (id: string, patch: Record<string, unknown>) => {
    updateBlueprint({
      ...blueprint,
      furniture: blueprint.furniture.map((f) => (f.id === id ? { ...f, ...patch } as typeof f : f)),
    });
  };

  const updateFixture = (id: string, patch: Record<string, unknown>) => {
    updateBlueprint({
      ...blueprint,
      fixtures: blueprint.fixtures.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });
  };

  const renderCanvas = (heightClass: string) => (
    <div
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={() => setSelected(null)}
      className={`relative w-full ${heightClass} bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-inner`}
      style={{
        backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      {blueprint.fixtures.map((fixture) => {
        const isSel = selected?.kind === 'fixture' && selected.id === fixture.id;
        return (
          <div
            key={fixture.id}
            onMouseDown={(e) => handleMouseDown('fixture', fixture.id, e, 'topleft')}
            onClick={(e) => { e.stopPropagation(); setSelected({ kind: 'fixture', id: fixture.id }); }}
            className={`absolute border text-[9px] font-bold flex items-center justify-center px-1 text-center cursor-move ${getFixtureClass(fixture.kind)} ${isSel ? 'ring-2 ring-indigo-500 z-20' : 'z-10'}`}
            style={{ left: `${fixture.x}%`, top: `${fixture.y}%`, width: `${fixture.w}%`, height: `${fixture.h}%` }}
            title={fixture.label}
          >
            {fixture.kind !== 'aisle' && (fixture.label || fixture.kind)}
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
              className={`absolute border-2 border-dashed border-sky-300 bg-sky-50/70 rounded-xl flex items-center justify-center text-xs font-semibold text-sky-700 cursor-move ${isSel ? 'ring-2 ring-indigo-500' : ''}`}
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
              className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-move ${isSel ? 'z-30' : 'z-20'}`}
              style={{ left: `${item.x}%`, top: `${item.y}%` }}
            >
              <div className={`px-3 py-2 bg-white border rounded-xl shadow-md min-w-[100px] ${isSel ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-300'}`}>
                <p className="text-[10px] font-bold text-slate-800 text-center truncate">{item.label}</p>
                <div className="flex justify-center gap-0.5 mt-1.5 flex-wrap max-w-[120px]">
                  {Array.from({ length: Math.min(item.seatCount, 12) }).map((_, i) => (
                    <span key={i} className={getChairVisualClass(item.chairType)} title={chairTypeLabels[item.chairType]} />
                  ))}
                </div>
                <p className="text-[9px] text-slate-500 text-center mt-1">{item.seatCount} · {chairTypeLabels[item.chairType]}</p>
              </div>
            </div>
          );
        }

        const isSel = selected?.kind === 'table' && selected.id === item.id;
        return (
          <div
            key={item.id}
            onMouseDown={(e) => handleMouseDown('table', item.id, e)}
            onClick={(e) => { e.stopPropagation(); setSelected({ kind: 'table', id: item.id }); }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-move ${isSel ? 'z-30' : 'z-20'}`}
            style={{ left: `${item.x}%`, top: `${item.y}%` }}
          >
            <div className={`relative flex items-center justify-center ${getTableVisualClasses(item.shape, isSel)} shadow-md`}>
              <div className="px-2 text-center z-10">
                <div className="text-[10px] font-black truncate max-w-[80px]">{item.name}</div>
                <div className="text-[8px] opacity-80">{item.capacity} pl.</div>
              </div>
              {Array.from({ length: item.capacity }).map((_, seatIndex) => {
                const coords = getSeatCoordinates(item.shape, item.capacity, seatIndex, 38);
                return (
                  <span
                    key={seatIndex}
                    className={`absolute ${getChairVisualClass(item.chairType)}`}
                    style={{
                      left: `calc(50% + ${coords.x}px)`,
                      top: `calc(50% + ${coords.y}px)`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {blueprint.furniture.length === 0 && blueprint.fixtures.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 pointer-events-none">
          <LayoutGrid className="w-10 h-10 mb-2 text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">Plan vide</p>
          <p className="text-xs mt-1">Ajoutez des tables, rangées ou éléments fixes.</p>
        </div>
      )}
    </div>
  );

  const renderEditPanel = () => {
    if (readOnly || !selected) {
      return (
        <div className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-xl border border-dashed">
          Sélectionnez un élément sur le plan pour le modifier.
        </div>
      );
    }

    if (selectedFixture) {
      return (
        <div className="space-y-3 p-4 bg-slate-50 rounded-xl border">
          <p className="text-xs font-bold uppercase text-slate-500">Élément fixe — {selectedFixture.kind}</p>
          <label className="block text-xs space-y-1">
            <span className="font-semibold text-slate-600">Libellé</span>
            <input value={selectedFixture.label ?? ''} onChange={(e) => updateFixture(selectedFixture.id, { label: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs space-y-1">
              <span className="font-semibold text-slate-600">Largeur %</span>
              <input type="number" min={2} max={100} value={Math.round(selectedFixture.w)} onChange={(e) => updateFixture(selectedFixture.id, { w: parseFloat(e.target.value) })} className="w-full px-2 py-1.5 rounded-lg border text-sm" />
            </label>
            <label className="text-xs space-y-1">
              <span className="font-semibold text-slate-600">Hauteur %</span>
              <input type="number" min={2} max={100} value={Math.round(selectedFixture.h)} onChange={(e) => updateFixture(selectedFixture.id, { h: parseFloat(e.target.value) })} className="w-full px-2 py-1.5 rounded-lg border text-sm" />
            </label>
          </div>
        </div>
      );
    }

    if (selectedFurniture?.kind === 'table') {
      return (
        <div className="space-y-3 p-4 bg-slate-50 rounded-xl border">
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
            <span className="font-semibold text-slate-600">Type de chaise</span>
            <select value={selectedFurniture.chairType} onChange={(e) => updateFurniture(selectedFurniture.id, { chairType: e.target.value as ChairType })} className="w-full px-2 py-1.5 rounded-lg border text-sm">
              {Object.entries(chairTypeLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
        </div>
      );
    }

    if (selectedFurniture?.kind === 'row') {
      return (
        <div className="space-y-3 p-4 bg-slate-50 rounded-xl border">
          <p className="text-xs font-bold uppercase text-slate-500">Rangée</p>
          <label className="block text-xs space-y-1">
            <span className="font-semibold text-slate-600">Libellé</span>
            <input value={selectedFurniture.label} onChange={(e) => updateFurniture(selectedFurniture.id, { label: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm" />
          </label>
          <label className="block text-xs space-y-1">
            <span className="font-semibold text-slate-600">Nombre de places</span>
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
        </div>
      );
    }

    return null;
  };

  const toolbar = !readOnly && (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={addTable} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold">
        <Plus className="w-3.5 h-3.5" /> Table
      </button>
      <button type="button" onClick={addRow} className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold">
        <Plus className="w-3.5 h-3.5" /> Rangée
      </button>
      <button type="button" onClick={() => addFixture('stage')} className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-bold">Scène</button>
      <button type="button" onClick={() => addFixture('podium')} className="px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg text-xs font-bold">Podium</button>
      <button type="button" onClick={() => addFixture('aisle')} className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold">Allée</button>
      {selected && (
        <button type="button" onClick={deleteSelected} className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold ml-auto">
          <Trash2 className="w-3.5 h-3.5" /> Supprimer
        </button>
      )}
      {onRegenerate && (
        <button type="button" onClick={onRegenerate} className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-700 rounded-lg text-xs font-bold">
          <RefreshCw className="w-3.5 h-3.5" /> Régénérer
        </button>
      )}
    </div>
  );

  const header = (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div>
        <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Move className="w-4 h-4 text-indigo-600" />
          Éditeur 2D — {roomTypeLabels[blueprint.roomType as RoomType]}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          {blueprint.metadata.totalSeats} places · Glissez-déposez pour repositionner
        </p>
      </div>
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600"
      >
        {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        {isExpanded ? 'Réduire' : 'Plein écran'}
      </button>
    </div>
  );

  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm p-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto p-5 space-y-4">
          {header}
          {toolbar}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">{renderCanvas('h-[60vh] min-h-[400px]')}</div>
            <div>{renderEditPanel()}</div>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => setIsExpanded(false)} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold">Fermer</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {header}
      {toolbar}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">{renderCanvas('aspect-[4/3] min-h-[280px]')}</div>
        <div>{renderEditPanel()}</div>
      </div>
    </div>
  );
}
