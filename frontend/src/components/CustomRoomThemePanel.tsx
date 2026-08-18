'use client';

import React, { useState } from 'react';
import { Copy, Plus, Trash2, Save } from 'lucide-react';
import {
 createCustomTheme,
 deleteCustomThemeFromBlueprint,
 getRoomTheme,
 saveCustomThemeToBlueprint,
 type CustomRoomTheme,
 type FloorType,
 type RoomTheme,
} from '@/lib/roomThemeUtils';
import { floorTypeLabels } from '@/lib/roomFloorUtils';
import type { RoomLayoutBlueprint } from '@/lib/roomLayoutUtils';

interface CustomRoomThemePanelProps {
 blueprint: RoomLayoutBlueprint;
 onChange: (blueprint: RoomLayoutBlueprint) => void;
 onApplyTheme: (themeId: string) => void;
 activeThemeId?: string;
}

const emptyDraft = (theme?: RoomTheme): Partial<RoomTheme> => ({
 name: theme?.isCustom ? `${theme.name} (copie)` : theme ? `${theme.name} perso.` : 'Mon thème',
 description: theme?.description ?? 'Thème sur mesure',
 accentColor: theme?.accentColor ?? '#6366f1',
 defaultTableColor: theme?.defaultTableColor ?? '#ffffff',
 canvasBackground: typeof theme?.canvasBackground === 'string' && theme.canvasBackground.startsWith('#')
  ? theme.canvasBackground
  : '#e2e8f0',
 defaultFloorType: theme?.defaultFloorType ?? 'parquet',
 tableBorderColor: theme?.tableBorderColor ?? theme?.accentColor ?? '#6366f1',
 roomOutline: theme?.roomOutline ?? {
  fill: 'rgba(248, 250, 252, 0.92)',
  stroke: theme?.accentColor ?? '#6366f1',
  strokeWidth: 2,
 },
});

export default function CustomRoomThemePanel({
 blueprint,
 onChange,
 onApplyTheme,
 activeThemeId,
}: CustomRoomThemePanelProps) {
 const customThemes = (blueprint.metadata.customThemes ?? []) as CustomRoomTheme[];
 const [editing, setEditing] = useState(false);
 const [draft, setDraft] = useState<Partial<RoomTheme>>(emptyDraft());

 const handleCreate = () => {
 const theme = createCustomTheme(draft as Parameters<typeof createCustomTheme>[0]);
 const next = saveCustomThemeToBlueprint(blueprint, theme);
 onChange(next);
 onApplyTheme(theme.id);
 setEditing(false);
 setDraft(emptyDraft());
 };

 const handleDelete = (themeId: string) => {
 onChange(deleteCustomThemeFromBlueprint(blueprint, themeId));
 };

 const startFromActive = () => {
 const theme = getRoomTheme(blueprint.metadata.roomThemeId, blueprint);
 setDraft(emptyDraft(theme));
 setEditing(true);
 };

 const outlineStroke = draft.roomOutline?.stroke ?? draft.accentColor ?? '#6366f1';
 const canvasColor = String(draft.canvasBackground ?? '#e2e8f0').startsWith('#')
  ? String(draft.canvasBackground)
  : '#e2e8f0';

 return (
 <div className="space-y-2 pt-2 border-t border-border">
 <div className="flex items-center justify-between gap-2">
 <p className="text-[10px] font-bold uppercase text-muted">Thèmes personnalisés</p>
 <div className="flex gap-1">
 <button
 type="button"
 onClick={startFromActive}
 className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border text-muted text-[10px] font-bold hover:bg-white"
 title="Reprendre le thème actif"
 >
 <Copy className="w-3 h-3" />
 Dupliquer
 </button>
 <button
 type="button"
 onClick={() => setEditing((v) => !v)}
 className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-primary/30 bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/15"
 >
 <Plus className="w-3 h-3" />
 {editing ? 'Annuler' : 'Créer'}
 </button>
 </div>
 </div>

 {editing && (
 <div className="p-3 bg-white rounded-xl border border-primary/20 space-y-2">
 <label className="block text-[10px] space-y-0.5">
 <span className="font-semibold text-muted">Nom du thème</span>
 <input
 value={draft.name ?? ''}
 onChange={(e) => setDraft({ ...draft, name: e.target.value })}
 className="w-full px-2 py-1.5 rounded-lg border text-xs"
 />
 </label>
 <label className="block text-[10px] space-y-0.5">
 <span className="font-semibold text-muted">Description</span>
 <input
 value={draft.description ?? ''}
 onChange={(e) => setDraft({ ...draft, description: e.target.value })}
 className="w-full px-2 py-1.5 rounded-lg border text-xs"
 placeholder="Ambiance, usage…"
 />
 </label>
 <div className="grid grid-cols-2 gap-2">
 <label className="text-[10px] space-y-0.5">
 <span className="font-semibold text-muted">Couleur accent</span>
 <input type="color" value={draft.accentColor ?? '#6366f1'} onChange={(e) => setDraft({ ...draft, accentColor: e.target.value })} className="w-full h-8 rounded-lg border cursor-pointer" />
 </label>
 <label className="text-[10px] space-y-0.5">
 <span className="font-semibold text-muted">Tables</span>
 <input type="color" value={draft.defaultTableColor ?? '#ffffff'} onChange={(e) => setDraft({ ...draft, defaultTableColor: e.target.value })} className="w-full h-8 rounded-lg border cursor-pointer" />
 </label>
 <label className="text-[10px] space-y-0.5">
 <span className="font-semibold text-muted">Fond du canvas</span>
 <input type="color" value={canvasColor} onChange={(e) => setDraft({ ...draft, canvasBackground: e.target.value })} className="w-full h-8 rounded-lg border cursor-pointer" />
 </label>
 <label className="text-[10px] space-y-0.5">
 <span className="font-semibold text-muted">Contour salle</span>
 <input
 type="color"
 value={outlineStroke.startsWith('#') ? outlineStroke : '#6366f1'}
 onChange={(e) => setDraft({
  ...draft,
  roomOutline: {
   fill: draft.roomOutline?.fill ?? 'rgba(248, 250, 252, 0.92)',
   stroke: e.target.value,
   strokeWidth: draft.roomOutline?.strokeWidth ?? 2,
  },
 })}
 className="w-full h-8 rounded-lg border cursor-pointer"
 />
 </label>
 <label className="text-[10px] space-y-0.5">
 <span className="font-semibold text-muted">Bordure tables</span>
 <input type="color" value={draft.tableBorderColor ?? '#6366f1'} onChange={(e) => setDraft({ ...draft, tableBorderColor: e.target.value })} className="w-full h-8 rounded-lg border cursor-pointer" />
 </label>
 </div>
 <label className="block text-[10px] space-y-0.5">
 <span className="font-semibold text-muted">Type de sol</span>
 <select
 value={draft.defaultFloorType ?? 'parquet'}
 onChange={(e) => setDraft({ ...draft, defaultFloorType: e.target.value as FloorType })}
 className="w-full px-2 py-1.5 rounded-lg border text-xs"
 >
 {(Object.keys(floorTypeLabels) as FloorType[]).filter((k) => k !== 'custom').map((k) => (
 <option key={k} value={k}>{floorTypeLabels[k]}</option>
 ))}
 </select>
 </label>
 <button
 type="button"
 onClick={handleCreate}
 disabled={!draft.name?.trim()}
 className="w-full py-2 rounded-lg bg-primary text-white text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-50"
 >
 <Save className="w-3 h-3" /> Enregistrer le thème
 </button>
 </div>
 )}

 {customThemes.length > 0 && (
 <div className="space-y-1.5">
 {customThemes.map((theme) => (
 <div key={theme.id} className="flex items-center gap-1">
 <button
 type="button"
 onClick={() => onApplyTheme(theme.id)}
 className={`flex-1 text-left py-2 px-2.5 rounded-lg border text-[10px] font-bold transition ${
 activeThemeId === theme.id
 ? 'bg-primary/10 border-primary/50 text-primary ring-1 ring-primary/20'
 : 'border-border text-muted hover:bg-white'
 }`}
 >
 <span className="flex items-center gap-1.5">
 <span className="w-3 h-3 rounded-full border shrink-0" style={{ background: theme.canvasBackground, borderColor: theme.accentColor }} />
 {theme.name}
 </span>
 </button>
 <button
 type="button"
 onClick={() => handleDelete(theme.id)}
 className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg shrink-0"
 title="Supprimer ce thème"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 ))}
 </div>
 )}
 </div>
 );
}
