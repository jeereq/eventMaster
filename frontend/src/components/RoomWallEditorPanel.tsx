'use client';

import React from 'react';
import { DoorOpen, Plus, Trash2, BrickWall } from 'lucide-react';
import {
  DoorStyle,
  OpeningMaterial,
  RoomLayoutBlueprint,
  RoomWallOpening,
  RoomWallSegment,
  WallTextureStyle,
  WindowStyle,
  createWallOpening,
  createWallSegment,
  doorStyleLabels,
  openingMaterialLabels,
  wallLengthMeters,
  wallTextureLabels,
  wallsFromRoomOutline,
  windowStyleLabels,
  WALL_STYLE_PRESETS,
} from '@/lib/roomLayoutUtils';
import { WallTextureSwatch, OpeningMaterialSwatch } from '@/components/room/RoomMaterialPreviews';
import type { LayoutActionEntry } from '@/lib/layoutActionLog';
import { cn } from '@/lib/cn';

interface RoomWallEditorPanelProps {
  blueprint: RoomLayoutBlueprint;
  selectedWallId: string | null;
  onSelectWall: (id: string | null) => void;
  onChange: (next: RoomLayoutBlueprint, action?: { message: string; kind?: LayoutActionEntry['kind'] }) => void;
}

export default function RoomWallEditorPanel({
  blueprint,
  selectedWallId,
  onSelectWall,
  onChange,
}: RoomWallEditorPanelProps) {
  const walls = blueprint.walls ?? [];
  const selected = walls.find((w) => w.id === selectedWallId) ?? null;

  const setWalls = (nextWalls: RoomWallSegment[], message: string) => {
    onChange({ ...blueprint, walls: nextWalls }, { message, kind: 'settings' });
  };

  const updateWall = (id: string, patch: Partial<RoomWallSegment>) => {
    setWalls(
      walls.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      'Mur mis à jour',
    );
  };

  const updateOpening = (wallId: string, openingId: string, patch: Partial<RoomWallOpening>) => {
    setWalls(
      walls.map((w) => {
        if (w.id !== wallId) return w;
        return {
          ...w,
          openings: (w.openings ?? []).map((o) => (o.id === openingId ? { ...o, ...patch } : o)),
        };
      }),
      'Ouverture mise à jour',
    );
  };

  const addWall = () => {
    const outline = blueprint.roomOutline;
    const y = outline ? outline.y + outline.h / 2 : 50;
    const wall = createWallSegment({
      start: { x: 20, y },
      end: { x: 80, y },
      heightM: walls[0]?.heightM ?? 3,
      thicknessM: walls[0]?.thicknessM ?? 0.2,
      texture: walls[0]?.texture ?? 'plaster',
    });
    setWalls([...walls, wall], 'Mur ajouté');
    onSelectWall(wall.id);
  };

  const deleteWall = (id: string) => {
    setWalls(walls.filter((w) => w.id !== id), 'Mur supprimé');
    if (selectedWallId === id) onSelectWall(null);
  };

  const resetFromOutline = () => {
    const outline = blueprint.roomOutline;
    if (!outline) return;
    const next = wallsFromRoomOutline(outline, {
      heightM: walls[0]?.heightM ?? 3,
      thicknessM: walls[0]?.thicknessM ?? 0.2,
      texture: walls[0]?.texture ?? 'plaster',
      withEntrance: true,
    });
    setWalls(next, 'Murs régénérés depuis le contour');
    onSelectWall(null);
  };

  const applyHeightToAll = (heightM: number) => {
    setWalls(walls.map((w) => ({ ...w, heightM })), `Hauteur des murs : ${heightM.toFixed(1)} m`);
  };

  const applyTextureToAll = (texture: WallTextureStyle) => {
    setWalls(walls.map((w) => ({ ...w, texture, color: undefined })), `Texture : ${wallTextureLabels[texture]}`);
  };

  const applyThicknessToAll = (thicknessM: number) => {
    setWalls(walls.map((w) => ({ ...w, thicknessM })), `Épaisseur : ${thicknessM.toFixed(2)} m`);
  };

  const applyWallPreset = (texture: WallTextureStyle, color?: string) => {
    setWalls(
      walls.map((w) => ({ ...w, texture, color: color ?? undefined })),
      `Ambiance : ${wallTextureLabels[texture]}`,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={addWall}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-button)] bg-primary text-white text-[10px] font-bold"
        >
          <Plus className="w-3 h-3" /> Mur
        </button>
        <button
          type="button"
          onClick={resetFromOutline}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-button)] border border-border text-[10px] font-bold text-muted hover:bg-surface-muted"
        >
          <BrickWall className="w-3 h-3" /> Contour → 4 murs
        </button>
        <button
          type="button"
          onClick={() => {
            setWalls([], 'Tous les murs retirés');
            onSelectWall(null);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-button)] border border-rose-200 bg-rose-50 text-rose-700 text-[10px] font-bold"
        >
          <Trash2 className="w-3 h-3" /> Enlever les murs
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label className="text-[10px] space-y-1">
          <span className="font-semibold text-muted">Hauteur (m)</span>
          <input
            type="number"
            min={1.5}
            max={8}
            step={0.1}
            value={walls[0]?.heightM ?? 3}
            onChange={(e) => applyHeightToAll(Math.max(1.5, parseFloat(e.target.value) || 3))}
            className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-xs"
          />
        </label>
        <label className="text-[10px] space-y-1">
          <span className="font-semibold text-muted">Épaisseur (m)</span>
          <input
            type="number"
            min={0.08}
            max={0.8}
            step={0.02}
            value={walls[0]?.thicknessM ?? 0.2}
            onChange={(e) => applyThicknessToAll(Math.max(0.08, parseFloat(e.target.value) || 0.2))}
            className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-xs"
          />
        </label>
        <label className="text-[10px] space-y-1">
          <span className="font-semibold text-muted">Texture</span>
          <select
            value={walls[0]?.texture ?? 'plaster'}
            onChange={(e) => applyTextureToAll(e.target.value as WallTextureStyle)}
            className="w-full px-1.5 py-1.5 rounded-[var(--radius-button)] border text-xs"
          >
            {(Object.keys(wallTextureLabels) as WallTextureStyle[]).map((k) => (
              <option key={k} value={k}>{wallTextureLabels[k]}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase text-muted">Ambiances prêtes</p>
        <div className="flex flex-wrap gap-1.5">
          {WALL_STYLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyWallPreset(preset.texture, preset.color)}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-button)] border border-border text-[9px] font-semibold hover:bg-surface-muted"
            >
              <WallTextureSwatch texture={preset.texture} className="h-4 w-4 shrink-0" />
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
        {(Object.keys(wallTextureLabels) as WallTextureStyle[]).map((tex) => (
          <button
            key={tex}
            type="button"
            onClick={() => applyTextureToAll(tex)}
            className={cn(
              'py-1.5 px-1 rounded-[var(--radius-button)] border text-[8px] font-bold transition text-center leading-tight',
              (walls[0]?.texture ?? 'plaster') === tex
                ? 'border-primary ring-1 ring-primary/30'
                : 'border-border hover:bg-surface-muted',
            )}
          >
            <WallTextureSwatch texture={tex} className="h-7 w-full mb-1" />
            {wallTextureLabels[tex]}
          </button>
        ))}
      </div>

      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        <p className="text-[10px] font-bold uppercase text-muted">Segments ({walls.length})</p>
        {walls.map((w, i) => {
          const len = wallLengthMeters(w, blueprint.canvas);
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => onSelectWall(w.id)}
              className={cn(
                'w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-[var(--radius-button)] border text-left text-[10px]',
                selectedWallId === w.id
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'border-border text-muted hover:bg-surface-muted',
              )}
            >
              <span className="font-bold">Mur {i + 1}</span>
              <span className="tabular-nums opacity-80">{len.toFixed(1)} m · {w.heightM} m</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="p-3 rounded-[var(--radius-card)] border border-border bg-surface-muted/50 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-foreground">Mur sélectionné</p>
            <button
              type="button"
              onClick={() => deleteWall(selected.id)}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600"
            >
              <Trash2 className="w-3 h-3" /> Supprimer
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] space-y-1">
              <span className="font-semibold text-muted">Départ X %</span>
              <input
                type="number"
                min={0}
                max={100}
                value={Math.round(selected.start.x)}
                onChange={(e) => updateWall(selected.id, { start: { ...selected.start, x: Number(e.target.value) } })}
                className="w-full px-2 py-1 rounded-[var(--radius-button)] border text-xs"
              />
            </label>
            <label className="text-[10px] space-y-1">
              <span className="font-semibold text-muted">Départ Y %</span>
              <input
                type="number"
                min={0}
                max={100}
                value={Math.round(selected.start.y)}
                onChange={(e) => updateWall(selected.id, { start: { ...selected.start, y: Number(e.target.value) } })}
                className="w-full px-2 py-1 rounded-[var(--radius-button)] border text-xs"
              />
            </label>
            <label className="text-[10px] space-y-1">
              <span className="font-semibold text-muted">Fin X %</span>
              <input
                type="number"
                min={0}
                max={100}
                value={Math.round(selected.end.x)}
                onChange={(e) => updateWall(selected.id, { end: { ...selected.end, x: Number(e.target.value) } })}
                className="w-full px-2 py-1 rounded-[var(--radius-button)] border text-xs"
              />
            </label>
            <label className="text-[10px] space-y-1">
              <span className="font-semibold text-muted">Fin Y %</span>
              <input
                type="number"
                min={0}
                max={100}
                value={Math.round(selected.end.y)}
                onChange={(e) => updateWall(selected.id, { end: { ...selected.end, y: Number(e.target.value) } })}
                className="w-full px-2 py-1 rounded-[var(--radius-button)] border text-xs"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] space-y-1">
              <span className="font-semibold text-muted">Hauteur (m)</span>
              <input
                type="number"
                min={1.5}
                max={8}
                step={0.1}
                value={selected.heightM}
                onChange={(e) => updateWall(selected.id, { heightM: Math.max(1.5, parseFloat(e.target.value) || 3) })}
                className="w-full px-2 py-1 rounded-[var(--radius-button)] border text-xs"
              />
            </label>
            <label className="text-[10px] space-y-1">
              <span className="font-semibold text-muted">Épaisseur (m)</span>
              <input
                type="number"
                min={0.08}
                max={0.8}
                step={0.02}
                value={selected.thicknessM}
                onChange={(e) => updateWall(selected.id, { thicknessM: Math.max(0.08, parseFloat(e.target.value) || 0.2) })}
                className="w-full px-2 py-1 rounded-[var(--radius-button)] border text-xs"
              />
            </label>
          </div>

          <label className="text-[10px] space-y-1 block">
            <span className="font-semibold text-muted">Texture</span>
            <select
              value={selected.texture}
              onChange={(e) => updateWall(selected.id, { texture: e.target.value as WallTextureStyle, color: undefined })}
              className="w-full px-2 py-1.5 rounded-[var(--radius-button)] border text-xs"
            >
              {(Object.keys(wallTextureLabels) as WallTextureStyle[]).map((k) => (
                <option key={k} value={k}>{wallTextureLabels[k]}</option>
              ))}
            </select>
          </label>

          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase text-muted flex items-center gap-1">
                <DoorOpen className="w-3 h-3" /> Portes & fenêtres
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const op = createWallOpening('door', { t: 0.5 });
                    updateWall(selected.id, { openings: [...(selected.openings ?? []), op] });
                  }}
                  className="px-2 py-0.5 rounded border text-[9px] font-bold text-emerald-700 border-emerald-200 bg-emerald-50"
                >
                  + Porte
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const op = createWallOpening('window', { t: 0.4 });
                    updateWall(selected.id, { openings: [...(selected.openings ?? []), op] });
                  }}
                  className="px-2 py-0.5 rounded border text-[9px] font-bold text-sky-700 border-sky-200 bg-sky-50"
                >
                  + Fenêtre
                </button>
              </div>
            </div>

            {(selected.openings ?? []).length === 0 && (
              <p className="text-[10px] text-muted">Aucune ouverture sur ce mur.</p>
            )}

            {(selected.openings ?? []).map((op) => (
              <div key={op.id} className="p-2 rounded-[var(--radius-button)] border border-border bg-surface space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold">{op.kind === 'door' ? 'Porte' : 'Fenêtre'}</span>
                  <button
                    type="button"
                    className="text-rose-500"
                    onClick={() => {
                      updateWall(selected.id, {
                        openings: (selected.openings ?? []).filter((o) => o.id !== op.id),
                      });
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <label className="text-[9px] space-y-0.5">
                    <span className="text-muted">Position</span>
                    <input
                      type="range"
                      min={0.1}
                      max={0.9}
                      step={0.02}
                      value={op.t}
                      onChange={(e) => updateOpening(selected.id, op.id, { t: parseFloat(e.target.value) })}
                      className="w-full accent-primary"
                    />
                  </label>
                  <label className="text-[9px] space-y-0.5">
                    <span className="text-muted">Largeur m</span>
                    <input
                      type="number"
                      min={0.4}
                      max={4}
                      step={0.05}
                      value={op.widthM}
                      onChange={(e) => updateOpening(selected.id, op.id, { widthM: parseFloat(e.target.value) || 0.9 })}
                      className="w-full px-1 py-0.5 rounded border text-[10px]"
                    />
                  </label>
                  <label className="text-[9px] space-y-0.5">
                    <span className="text-muted">Hauteur m</span>
                    <input
                      type="number"
                      min={0.4}
                      max={3.5}
                      step={0.05}
                      value={op.heightM}
                      onChange={(e) => updateOpening(selected.id, op.id, { heightM: parseFloat(e.target.value) || 2 })}
                      className="w-full px-1 py-0.5 rounded border text-[10px]"
                    />
                  </label>
                </div>
                <label className="text-[9px] space-y-0.5 block">
                  <span className="text-muted">{op.kind === 'door' ? 'Seuil / bas (m)' : 'Allège bas (m)'}</span>
                  <input
                    type="number"
                    min={0}
                    max={2.5}
                    step={0.05}
                    value={op.sillM ?? (op.kind === 'door' ? 0 : 0.9)}
                    onChange={(e) => updateOpening(selected.id, op.id, { sillM: parseFloat(e.target.value) || 0 })}
                    className="w-full px-1 py-0.5 rounded border text-[10px]"
                  />
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <label className="text-[9px] space-y-0.5">
                    <span className="text-muted">Style</span>
                    <select
                      value={op.style}
                      onChange={(e) => {
                        const style = e.target.value as DoorStyle | WindowStyle;
                        const patch: Partial<RoomWallOpening> = { style };
                        if (op.kind === 'door') {
                          if (style === 'double' || style === 'frenchDoor') patch.widthM = Math.max(op.widthM, 1.6);
                          if (style === 'folding') patch.widthM = Math.max(op.widthM, 2.2);
                          if (style === 'sliding') patch.widthM = Math.max(op.widthM, 1.2);
                          if (style === 'arch') patch.heightM = Math.max(op.heightM, 2.4);
                          if (style === 'fireExit') {
                            patch.widthM = Math.max(op.widthM, 1.1);
                            patch.material = 'blackSteel';
                          }
                          if (style === 'glass' || style === 'frenchDoor') patch.material = style === 'glass' ? 'glass' : 'wood';
                        }
                        if (op.kind === 'window' && style === 'bay') {
                          patch.widthM = Math.max(op.widthM, 1.8);
                        }
                        updateOpening(selected.id, op.id, patch);
                      }}
                      className="w-full px-1 py-1 rounded border text-[10px]"
                    >
                      {op.kind === 'door'
                        ? (Object.keys(doorStyleLabels) as DoorStyle[]).map((k) => (
                            <option key={k} value={k}>{doorStyleLabels[k]}</option>
                          ))
                        : (Object.keys(windowStyleLabels) as WindowStyle[]).map((k) => (
                            <option key={k} value={k}>{windowStyleLabels[k]}</option>
                          ))}
                    </select>
                  </label>
                  <label className="text-[9px] space-y-0.5">
                    <span className="text-muted">Matériau</span>
                    <select
                      value={op.material ?? (op.kind === 'door' ? 'wood' : 'glass')}
                      onChange={(e) => updateOpening(selected.id, op.id, {
                        material: e.target.value as OpeningMaterial,
                      })}
                      className="w-full px-1 py-1 rounded border text-[10px]"
                    >
                      {(Object.keys(openingMaterialLabels) as OpeningMaterial[]).map((k) => (
                        <option key={k} value={k}>{openingMaterialLabels[k]}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(openingMaterialLabels) as OpeningMaterial[]).map((mat) => (
                    <button
                      key={mat}
                      type="button"
                      title={openingMaterialLabels[mat]}
                      onClick={() => updateOpening(selected.id, op.id, { material: mat })}
                      className={cn(
                        'p-1 rounded border transition',
                        (op.material ?? (op.kind === 'door' ? 'wood' : 'glass')) === mat
                          ? 'border-primary ring-1 ring-primary/30'
                          : 'border-border hover:bg-surface-muted',
                      )}
                    >
                      <OpeningMaterialSwatch material={mat} className="h-5 w-5" />
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <label className="text-[9px] space-y-0.5">
                    <span className="text-muted">Couleur vantail</span>
                    <input
                      type="color"
                      value={op.color ?? '#6b4423'}
                      onChange={(e) => updateOpening(selected.id, op.id, { color: e.target.value })}
                      className="w-full h-7 rounded border cursor-pointer"
                    />
                  </label>
                  <label className="text-[9px] space-y-0.5">
                    <span className="text-muted">Couleur cadre</span>
                    <input
                      type="color"
                      value={op.frameColor ?? '#3f2a1a'}
                      onChange={(e) => updateOpening(selected.id, op.id, { frameColor: e.target.value })}
                      className="w-full h-7 rounded border cursor-pointer"
                    />
                  </label>
                </div>
                {op.kind === 'door' && (
                  <div className="space-y-1.5 pt-1 border-t border-border/60">
                    <label className="flex items-center gap-2 text-[9px] text-muted cursor-pointer">
                      <input
                        type="checkbox"
                        checked={op.hasMat !== false}
                        onChange={(e) => updateOpening(selected.id, op.id, { hasMat: e.target.checked })}
                        className="rounded border-border"
                      />
                      Paillasson / tapis d&apos;entrée
                    </label>
                    {op.hasMat !== false && (
                      <label className="text-[9px] space-y-0.5 block">
                        <span className="text-muted">Couleur tapis</span>
                        <input
                          type="color"
                          value={op.matColor ?? '#1e3a5f'}
                          onChange={(e) => updateOpening(selected.id, op.id, { matColor: e.target.value })}
                          className="w-full h-7 rounded border cursor-pointer"
                        />
                      </label>
                    )}
                  </div>
                )}
                <p className="text-[9px] text-muted leading-snug">
                  {op.kind === 'door'
                    ? 'Porte : largeur / hauteur / matériau (bois, vitre…) et tapis devant.'
                    : 'Fenêtre : allège = hauteur du bas ; baie / française / arche pour le style.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
