'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { 
 Plus, Trash2, Users, Check, Move, X, RefreshCw, Search,
 HelpCircle, Edit2, LayoutGrid, Maximize2, Minimize2, Copy, Lock, Unlock, Palette, RotateCw, Sparkles, ChevronDown, Download, PlusCircle, Save, Box
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
 getOccupiedSeatCount,
 getSeatCoordinates,
 getTableShapeLabel,
 getTableVisualStyle,
 TableShape,
} from '@/lib/tablePlanUtils';
import { chairTypeLabels, getFixtureClass, type ChairType, type RoomLayoutBlueprint } from '@/lib/roomLayoutUtils';
import { resolveFloorStyle } from '@/lib/roomFloorUtils';
import type { FloorType } from '@/lib/roomThemeUtils';
import { roomEditorCapabilities, snapLayoutPct } from '@/lib/roomEditorAccess';
import { buildTablePlanPreviewBlueprint } from '@/lib/tablePlanPreviewBlueprint';
import type { PricingZone, TicketPricingMode } from '@/lib/ticketPricing';
import { pricingZonesFromTablePlan } from '@/lib/ticketPricing';
import type { LightingPreset } from '@/lib/roomRenderQuality';
import RoomLayoutPreview from '@/components/RoomLayoutPreview';
import Link from 'next/link';

type PlannerView = '2d' | '3d';

interface GuestItem {
 id: string;
 firstName: string;
 lastName: string;
 email: string;
 category?: string | null;
 rsvp: 'PENDING' | 'ACCEPTED' | 'DECLINED';
 preferences?: Record<string, unknown> | null;
}

interface Table {
 id: string;
 name: string;
 shape: TableShape;
 capacity: number;
 x: number;
 y: number;
 seats: Record<number, string | null>;
 locked?: boolean;
 chairType?: string;
 tableColor?: string;
 rotation?: number;
 pricingZoneId?: string;
}

interface TablePlannerProps {
 eventId?: string;
 guests: GuestItem[];
 initialTablePlan: {
   tables?: Table[];
   fixtures?: Array<{ id: string; kind: string; x: number; y: number; w: number; h: number; label?: string }>;
   floorType?: string | null;
   floorImageUrl?: string | null;
   floorColor?: string | null;
   roomOutline?: RoomLayoutBlueprint['roomOutline'];
   roomThemeId?: string | null;
   depthAmount?: number | null;
   depthView?: boolean | null;
   defaultTableColor?: string | null;
   sourceRoomType?: string | null;
   lightingPreset?: LightingPreset | null;
   renderQuality?: 'draft' | 'standard' | 'showcase' | null;
   pricingZones?: PricingZone[];
 } | null | undefined;
 onSave: (newTablePlan: { tables: Table[]; fixtures?: unknown[]; pricingZones?: PricingZone[] }) => Promise<void>;
 roomName?: string | null;
 roomLayoutBlueprint?: RoomLayoutBlueprint | null;
 previewLightingPreset?: Exclude<LightingPreset, 'auto'>;
 canImportRoomLayout?: boolean;
 onImportRoomLayout?: (replaceExisting: boolean) => Promise<void>;
 importingLayout?: boolean;
 editorLevel?: string | null;
 ticketPricingMode?: TicketPricingMode;
}

export default function TablePlanner({
 guests,
 initialTablePlan,
 onSave,
 roomName,
 roomLayoutBlueprint = null,
 previewLightingPreset,
 canImportRoomLayout,
 onImportRoomLayout,
 importingLayout,
 editorLevel = 'complete',
 ticketPricingMode = 'global',
}: TablePlannerProps) {
 const caps = roomEditorCapabilities(editorLevel, true);
 const zonePricing = ticketPricingMode === 'by_zone';
 const [pricingZones, setPricingZones] = useState<PricingZone[]>(() =>
   pricingZonesFromTablePlan(initialTablePlan),
 );
 const [tables, setTables] = useState<Table[]>(() => {
 if (initialTablePlan && Array.isArray(initialTablePlan.tables)) {
 return initialTablePlan.tables;
 }
 return [];
 });
 useEffect(() => {
   setPricingZones(pricingZonesFromTablePlan(initialTablePlan));
 }, [initialTablePlan]);
 const [fixtures] = useState(() => initialTablePlan?.fixtures ?? []);
 const floorStyle = useMemo(
   () => resolveFloorStyle(
     (initialTablePlan?.floorType as FloorType | undefined) ?? 'parquet',
     initialTablePlan?.floorImageUrl ?? undefined,
   ),
   [initialTablePlan?.floorType, initialTablePlan?.floorImageUrl],
 );
 const [saving, setSaving] = useState(false);
 const [activeTableId, setActiveTableId] = useState<string | null>(null);
 const [selectedSeat, setSelectedGuestSeat] = useState<{ tableId: string; seatIndex: number } | null>(null);
 const [editingTable, setEditingTable] = useState<Table | null>(null);

 // Modal states
 const [showAddModal, setShowAddModal] = useState(false);
 const [newTableName, setNewTableName] = useState('');
 const [newTableShape, setNewTableShape] = useState<TableShape>('round');
 const [newTableCapacity, setNewTableCapacity] = useState<number>(8);
 const [newTableColor, setNewTableColor] = useState('#f3e6c8');
 const [newChairType, setNewChairType] = useState<ChairType>('BANQUET');
 const [isExpanded, setIsExpanded] = useState(false);
 const [guestsOpen, setGuestsOpen] = useState(false);
 const [hoveredTableId, setHoveredTableId] = useState<string | null>(null);
 const [plannerView, setPlannerView] = useState<PlannerView>('2d');

 // Dragging states
 const canvasRef = useRef<HTMLDivElement>(null);
 const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
 const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

 // Filter guests who are eligible for seating (not declined)
 const placeableGuests = guests.filter(g => g.rsvp !== 'DECLINED');

 // Get list of assigned guest IDs
 const assignedGuestIds = new Set<string>();
 tables.forEach(table => {
 Object.values(table.seats).forEach(guestId => {
 if (guestId) assignedGuestIds.add(guestId);
 });
 });

  // Search term for unassigned guests
  const [guestSearch, setGuestSearch] = useState('');

  // Unassigned eligible guests
  const unassignedGuests = placeableGuests.filter(g => !assignedGuestIds.has(g.id));
 const filteredUnassignedGuests = unassignedGuests.filter(g => 
   (g.firstName + ' ' + g.lastName).toLowerCase().includes(guestSearch.toLowerCase()) || 
   (g.category || '').toLowerCase().includes(guestSearch.toLowerCase())
 );

 const previewBlueprint = useMemo(
   () => buildTablePlanPreviewBlueprint(initialTablePlan, tables, roomLayoutBlueprint),
   [initialTablePlan, tables, roomLayoutBlueprint],
 );

 const previewQuality = caps.canShowcaseRender ? 'showcase' as const : 'standard' as const;

 const previewLighting = previewLightingPreset
   ?? (initialTablePlan?.lightingPreset && initialTablePlan.lightingPreset !== 'auto'
     ? initialTablePlan.lightingPreset
     : 'dusk');

  // Add a new table
 const handleAddTable = () => {
 if (!newTableName.trim()) return;
 if (tables.length >= caps.maxTables) {
 alert(`Limite de ${caps.maxTables} tables atteinte (${caps.label}). Passez à un forfait supérieur.`);
 return;
 }
 if (!caps.tableShapes.includes(newTableShape)) {
 alert('Cette forme de table n’est pas incluse dans votre forfait.');
 return;
 }

 const seatsObj: Record<number, string | null> = {};
 for (let i = 0; i < newTableCapacity; i++) {
 seatsObj[i] = null;
 }

 const newTable: Table = {
 id: 'table_' + Math.random().toString(36).substr(2, 9),
 name: newTableName,
 shape: newTableShape,
 capacity: newTableCapacity,
 x: 30 + Math.random() * 40,
 y: 30 + Math.random() * 40,
 seats: seatsObj,
 tableColor: newTableColor,
 chairType: newChairType,
 locked: false,
 rotation: 0,
 };

 const updatedTables = [...tables, newTable];
 setTables(updatedTables);
 setShowAddModal(false);
 setNewTableName('');
 setNewTableCapacity(8);
 setNewTableColor('#f3e6c8');
 setNewChairType('BANQUET');
 };

 // Delete a table and free its guests
 const handleDeleteTable = (tableId: string) => {
 if (!confirm('Voulez-vous vraiment supprimer cette table ? Tous les invités installés à cette table seront libérés.')) return;
 setTables(tables.filter(t => t.id !== tableId));
 if (activeTableId === tableId) setActiveTableId(null);
 };

 // Open edit modal for table
 const handleOpenEditTable = (table: Table) => {
 setEditingTable(table);
 };

 // Save edited table settings
 const handleSaveEditTable = () => {
 if (!editingTable || !editingTable.name.trim()) return;

 setTables(tables.map(t => {
 if (t.id === editingTable.id) {
 // adjust seats if capacity changed
 const updatedSeats = { ...t.seats };
 if (editingTable.capacity > t.capacity) {
 for (let i = t.capacity; i < editingTable.capacity; i++) {
 updatedSeats[i] = null;
 }
 } else if (editingTable.capacity < t.capacity) {
 for (let i = editingTable.capacity; i < t.capacity; i++) {
 delete updatedSeats[i];
 }
 }
 return {
 ...t,
 name: editingTable.name,
 shape: editingTable.shape,
 capacity: editingTable.capacity,
 tableColor: editingTable.tableColor,
 chairType: editingTable.chairType,
 locked: editingTable.locked,
 rotation: editingTable.rotation || 0,
 pricingZoneId: editingTable.pricingZoneId,
 seats: updatedSeats
 };
 }
 return t;
 }));
 setEditingTable(null);
 };

 const handleDuplicateTable = (table: Table) => {
 if (!caps.canDuplicate) {
 alert('La duplication n’est pas incluse dans votre forfait.');
 return;
 }
 if (tables.length >= caps.maxTables) {
 alert(`Limite de ${caps.maxTables} tables atteinte (${caps.label}).`);
 return;
 }
 const seatsObj: Record<number, string | null> = {};
 for (let i = 0; i < table.capacity; i++) seatsObj[i] = null;
 const copy: Table = {
 ...table,
 id: 'table_' + Math.random().toString(36).substr(2, 9),
 name: `${table.name} (copie)`,
 x: Math.min(88, table.x + 8),
 y: Math.min(88, table.y + 8),
 seats: seatsObj,
 locked: false,
 };
 setTables([...tables, copy]);
 setActiveTableId(copy.id);
 };

 const handleToggleLock = (tableId: string) => {
 if (!caps.canLock) return;
 setTables(tables.map((t) => (t.id === tableId ? { ...t, locked: !t.locked } : t)));
 };

 // Assign guest to seat
 const handleAssignGuest = (tableId: string, seatIndex: number, guestId: string | null) => {
 setTables(tables.map(t => {
 if (t.id === tableId) {
 return {
 ...t,
 seats: {
 ...t.seats,
 [seatIndex]: guestId
 }
 };
 }
 return t;
 }));
 setSelectedGuestSeat(null);
 };

 const handleAutoAssign = () => {
 if (!caps.canAutoAssign) {
 alert('Le placement magique automatique n’est pas inclus dans votre forfait.');
 return;
 }
 if (unassignedGuests.length === 0) {
   alert("Tous les invités ayant accepté sont déjà placés !");
   return;
 }
 if (tables.length === 0) {
   alert("Veuillez d'abord ajouter des tables sur le plan.");
   return;
 }

 const updatedTables = [...tables.map(t => ({...t, seats: {...t.seats}}))];
 let unplaced = [...unassignedGuests];

 // Group unplaced guests by category
 const guestsByCat: Record<string, typeof unplaced> = {};
 unplaced.forEach(g => {
   const cat = g.category || 'Général';
   if (!guestsByCat[cat]) guestsByCat[cat] = [];
   guestsByCat[cat].push(g);
 });

 // Try to fill tables primarily with same category
 for (const table of updatedTables) {
   const totalSeats = table.capacity;
   
   // Find empty seats indices
   const emptySeatIndices: number[] = [];
   for (let i = 0; i < totalSeats; i++) {
     if (!table.seats[i]) emptySeatIndices.push(i);
   }
   
   if (emptySeatIndices.length === 0) continue;

   // Mode category for the table based on already placed guests
   const existingCats: string[] = [];
   for (let i = 0; i < totalSeats; i++) {
     const gid = table.seats[i];
     if (gid) {
       const g = placeableGuests.find(guest => guest.id === gid);
       if (g && g.category) existingCats.push(g.category);
     }
   }
   let dominantCat: string | null = null;
   if (existingCats.length > 0) {
     dominantCat = existingCats.sort((a,b) =>
       existingCats.filter(v => v===a).length
       - existingCats.filter(v => v===b).length
     ).pop() || 'Général';
   }

   // Pick guests
   for (const seatIndex of emptySeatIndices) {
     let catToPick = dominantCat;
     if (!catToPick || !guestsByCat[catToPick] || guestsByCat[catToPick].length === 0) {
       // Find largest category group remaining
       const availableCats = Object.keys(guestsByCat).filter(k => guestsByCat[k].length > 0);
       if (availableCats.length === 0) break; // no guests left
       catToPick = availableCats.sort((a,b) => guestsByCat[b].length - guestsByCat[a].length)[0];
     }
     if (catToPick && guestsByCat[catToPick]?.length > 0) {
       const guest = guestsByCat[catToPick].shift();
       if (guest) {
         table.seats[seatIndex] = guest.id;
       }
     }
   }
 }

 setTables(updatedTables);
 };

 const handleClearAssignments = () => {
 if (!confirm('Libérer tous les sièges ? Les tables restent en place.')) return;
 setTables(tables.map((table) => {
 const seats: Record<number, string | null> = {};
 for (let i = 0; i < table.capacity; i++) seats[i] = null;
 return { ...table, seats };
 }));
 };

 const handleLayoutGrid = () => {
 if (!caps.canAlign && !caps.canSnapGrid) {
 alert('L’alignement automatique n’est pas inclus dans votre forfait.');
 return;
 }
 const movable = tables.filter((t) => !t.locked);
 if (movable.length === 0) return;
 const cols = Math.max(1, Math.ceil(Math.sqrt(movable.length)));
 const rows = Math.max(1, Math.ceil(movable.length / cols));
 let i = 0;
 setTables(tables.map((table) => {
 if (table.locked) return table;
 const col = i % cols;
 const row = Math.floor(i / cols);
 i += 1;
 const x = cols === 1 ? 50 : 18 + (col / (cols - 1)) * 64;
 const y = rows === 1 ? 50 : 22 + (row / (rows - 1)) * 56;
 return { ...table, x, y };
 }));
 };

 const handleLayoutCircle = () => {
 if (!caps.canAlign) {
 alert('La disposition en cercle n’est pas incluse dans votre forfait (Premium).');
 return;
 }
 const movable = tables.filter((t) => !t.locked);
 if (movable.length === 0) return;
 const radius = Math.min(32, 10 + movable.length * 1.6);
 let i = 0;
 setTables(tables.map((table) => {
 if (table.locked) return table;
 const angle = (2 * Math.PI * i) / movable.length - Math.PI / 2;
 i += 1;
 return {
 ...table,
 x: 50 + radius * Math.cos(angle),
 y: 50 + radius * Math.sin(angle),
 };
 }));
 };

 const handleRotateTable = (tableId: string, delta: number) => {
 if (!caps.canRotate) return;
 setTables(tables.map((t) => {
 if (t.id !== tableId) return t;
 const next = ((t.rotation || 0) + delta + 360) % 360;
 return { ...t, rotation: next };
 }));
 };

  // Dragging logic via Pointer Events (compatible Touch, Stylus et Souris)
  const handlePointerDown = (tableId: string, e: React.PointerEvent) => {
    const table = tables.find((t) => t.id === tableId);
    if (table?.locked) return;
    if ((e.target as HTMLElement).closest('button, select, input, a, [data-no-drag]')) return;
    
    // Empêcher le scroll/geste natif du navigateur pendant le drag
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setDraggingTableId(tableId);

    if (table && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      const currentXPixels = (table.x / 100) * rect.width;
      const currentYPixels = (table.y / 100) * rect.height;

      setDragOffset({
        x: clickX - currentXPixels,
        y: clickY - currentYPixels,
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingTableId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let newXPixels = mouseX - dragOffset.x;
    let newYPixels = mouseY - dragOffset.y;

    // Constrain within canvas bounds
    newXPixels = Math.max(40, Math.min(rect.width - 40, newXPixels));
    newYPixels = Math.max(40, Math.min(rect.height - 40, newYPixels));

    const newXPercent = snapLayoutPct((newXPixels / rect.width) * 100, caps.canSnapGrid);
    const newYPercent = snapLayoutPct((newYPixels / rect.height) * 100, caps.canSnapGrid);

    setTables(tables.map(t => {
      if (t.id === draggingTableId) {
        return { ...t, x: newXPercent, y: newYPercent };
      }
      return t;
    }));
  };

  const handlePointerUp = (e?: React.PointerEvent) => {
    if (e && e.currentTarget instanceof HTMLElement && e.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    setDraggingTableId(null);
  };

 // Save plan to backend
 const handleSavePlan = async () => {
 setSaving(true);
 try {
 await onSave({
   ...(initialTablePlan && typeof initialTablePlan === 'object' ? initialTablePlan : {}),
   tables,
   fixtures: fixtures.length ? fixtures : undefined,
   pricingZones,
 });
 alert('Plan de table sauvegardé avec succès !');
 } catch (err) {
 console.error('Error saving table plan:', err);
 alert('Erreur lors de la sauvegarde du plan de table.');
 } finally {
 setSaving(false);
 }
 };

 // Helper to get guest names assigned to a table
 const getTableAssignedGuests = (table: Table) => {
 return Object.entries(table.seats)
 .filter(([, guestId]) => guestId)
 .map(([seatIndex, guestId]) => {
 const guest = guests.find((g) => g.id === guestId);
 return guest
 ? { seatIndex: parseInt(seatIndex, 10), name: `${guest.firstName} ${guest.lastName}` }
 : null;
 })
 .filter(Boolean) as Array<{ seatIndex: number; name: string }>;
 };

  const render3DPreview = (heightClass: string) => (
    <div className={cn('flex flex-col min-h-0 space-y-2', heightClass)}>
      {!previewBlueprint ? (
        <div className="flex-1 min-h-[320px] rounded-[var(--radius-card)] border border-dashed border-border bg-surface-muted flex flex-col items-center justify-center gap-2 p-6 text-center">
          <Box className="w-10 h-10 text-muted" />
          <p className="text-sm font-semibold text-foreground">Vue 3D indisponible</p>
          <p className="text-xs text-muted max-w-sm">
            Ajoutez des tables ou importez le plan depuis la salle liée pour activer l’aperçu 3D.
          </p>
          {canImportRoomLayout && onImportRoomLayout ? (
            <button
              type="button"
              onClick={() => onImportRoomLayout(tables.length > 0)}
              disabled={importingLayout}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary hover:underline"
            >
              {importingLayout ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Importer depuis la salle
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <RoomLayoutPreview
            blueprint={previewBlueprint}
            quality={previewQuality}
            lightingPreset={previewLighting}
            showMeta
            className="flex-1 min-h-[320px] [&_.em-floor-canvas]:min-h-[320px]"
          />
          <p className="text-[11px] text-muted leading-relaxed">
            Lecture seule — placement des invités en{' '}
            <button type="button" onClick={() => setPlannerView('2d')} className="font-semibold text-primary hover:underline">
              vue Plan 2D
            </button>
            .
            {roomLayoutBlueprint
              ? ' Architecture et décor depuis le modèle de salle.'
              : ' Rendu simplifié à partir du plan importé.'}
          </p>
        </>
      )}
    </div>
  );

  const renderCanvas = (heightClass: string) => (
    <div className="space-y-4 flex-1 flex flex-col min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface border border-border rounded-[var(--radius-card)] shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAddModal(true)}
            className="font-medium"
            disabled={tables.length >= caps.maxTables}
            title={tables.length >= caps.maxTables ? `Limite de ${caps.maxTables} tables atteinte (${caps.label})` : undefined}
          >
            {tables.length >= caps.maxTables ? <Lock className="w-4 h-4 mr-1.5 opacity-70" /> : <PlusCircle className="w-4 h-4 mr-1.5" />}
            Nouvelle table
          </Button>
          
          {canImportRoomLayout && onImportRoomLayout && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onImportRoomLayout(tables.length > 0)}
              disabled={importingLayout}
              className="bg-surface font-medium"
              title="Met à jour depuis le plan 3D de la salle (places conservées)"
            >
              {importingLayout ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
              Importer depuis salle
            </Button>
          )}

          {onImportRoomLayout && !canImportRoomLayout && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (tables.length > 0 && !confirm('Mettre à jour depuis la salle en conservant les places ?')) return;
                onImportRoomLayout?.(true);
              }}
              loading={importingLayout}
              disabled={importingLayout}
              className="text-primary hover:bg-primary/10 transition font-medium"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Importer plan type
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
       size="sm"
       variant="ghost"
       onClick={handleAutoAssign}
       disabled={unassignedGuests.length === 0}
       className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 border border-amber-200 shadow-sm transition font-medium"
     >
       <Sparkles className="w-4 h-4 mr-1.5 text-amber-500" />
       Placement Magique
     </Button>
     
          <Button
            size="sm"
            onClick={handleAutoAssign}
            disabled={unassignedGuests.length === 0}
            className="bg-gradient-to-r from-primary to-primary-hover text-white transition shadow-sm font-semibold border-0"
            title={caps.canAutoAssign ? "Placement Magique : regroupe les invités par catégorie" : "Le placement magique nécessite un forfait supérieur"}
          >
            {caps.canAutoAssign ? <Sparkles className="w-4 h-4 mr-1.5" /> : <Lock className="w-4 h-4 mr-1.5 opacity-80" />}
            Placement Magique
          </Button>

          <Button
            size="sm"
            onClick={handleSavePlan}
            loading={saving}
            disabled={saving}
            variant="secondary"
            className="transition shadow-sm font-semibold"
          >
            <Save className="w-4 h-4 mr-1.5" />
            Enregistrer
          </Button>
          
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-muted hover:text-foreground bg-surface hover:bg-surface-muted rounded-[var(--radius-button)] border border-border transition shadow-sm"
            title={isExpanded ? 'Réduire' : 'Plein écran'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
   </div>
 </div>

      <div
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          'em-floor-canvas em-floor-canvas--photo touch-none select-none',
          heightClass,
          'w-full flex-1 min-h-[400px]',
          draggingTableId && 'em-floor-canvas--dragging',
        )}
        style={{ ...floorStyle, touchAction: 'none' }}
      >
 {zonePricing && pricingZones.map((zone) => {
   if (zone.x == null || zone.y == null || zone.w == null || zone.h == null) return null;
   return (
     <div
       key={zone.id}
       className="absolute pointer-events-none z-[1] rounded-md border"
       style={{
         left: `${zone.x}%`,
         top: `${zone.y}%`,
         width: `${zone.w}%`,
         height: `${zone.h}%`,
         backgroundColor: zone.color ? `${zone.color}18` : 'rgba(196,163,90,0.1)',
         borderColor: zone.color ? `${zone.color}66` : 'rgba(196,163,90,0.3)',
       }}
       title={zone.name}
     />
   );
 })}
 {(fixtures ?? []).map((fixture) => (
 <div
 key={fixture.id}
 className={`absolute pointer-events-none border text-[9px] font-semibold flex items-center justify-center px-1 text-center opacity-70 ${getFixtureClass(fixture.kind)}`}
 style={{
 left: `${fixture.x}%`,
 top: `${fixture.y}%`,
 width: `${fixture.w}%`,
 height: `${fixture.h}%`,
 }}
 title={fixture.label}
 >
 {fixture.kind !== 'aisle' && fixture.label}
 </div>
 ))}

 {tables.length === 0 ? (
 <div className="absolute inset-0 flex flex-col items-center justify-center text-muted space-y-2 pointer-events-none">
 <div className="w-12 h-12 rounded-[var(--radius-card)] bg-surface border border-border flex items-center justify-center">
 <LayoutGrid className="w-6 h-6 text-primary" />
 </div>
 <div className="text-center px-4">
 <p className="font-semibold text-foreground text-sm">Aucune table</p>
 <p className="text-xs text-muted mt-1 max-w-xs mx-auto">
 Ajoutez une table ou importez le plan de salle pour commencer.
 </p>
 </div>
 </div>
 ) : (
 tables.map((table) => {
 const isActive = activeTableId === table.id;
 const isHovered = hoveredTableId === table.id;
 const isDragging = draggingTableId === table.id;
 const assignedGuests = getTableAssignedGuests(table);
 const occupiedCount = getOccupiedSeatCount(table);
 const zone = zonePricing ? pricingZones.find((z) => z.id === table.pricingZoneId) : null;
 const visual = getTableVisualStyle(table.shape, isActive, table.tableColor);

            return (
              <div
                key={table.id}
                onPointerDown={(e) => handlePointerDown(table.id, e)}
                onClick={() => setActiveTableId(table.id)}
                onMouseEnter={() => setHoveredTableId(table.id)}
                onMouseLeave={() => setHoveredTableId(null)}
                style={{
                  left: `${table.x}%`,
                  top: `${table.y}%`,
                  transform: `translate(-50%, -50%) rotate(${table.rotation || 0}deg)`,
                  touchAction: 'none',
                }}
                className={cn(
                  'absolute select-none p-3 em-floor-item touch-none',
                  table.locked ? 'cursor-not-allowed' : 'cursor-grab',
                  isActive && 'em-floor-item--active',
                  isDragging && 'em-floor-item--dragging',
                  isHovered && !isDragging && 'z-10',
                )}
              >
 {isHovered && !draggingTableId && (
 <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-52 z-50 pointer-events-none animate-fade-in">
 <div className="bg-surface text-foreground rounded-[var(--radius-card)] p-3 border border-border space-y-1.5 text-left shadow-[var(--shadow-soft)]">
 <p className="font-semibold text-sm leading-tight">{table.name}</p>
 <p className="text-[11px] text-primary font-medium">
 {getTableShapeLabel(table.shape)} · {occupiedCount}/{table.capacity} places
 {zone ? ` · ${zone.name}` : ''}
 </p>
 {assignedGuests.length > 0 ? (
 <div className="pt-1 border-t border-border space-y-0.5">
 {assignedGuests.slice(0, 5).map(({ seatIndex, name }) => (
 <p key={seatIndex} className="text-[10px] text-muted truncate">
 #{seatIndex + 1} · {name}
 </p>
 ))}
 {assignedGuests.length > 5 && (
 <p className="text-[10px] text-muted">+{assignedGuests.length - 5} autres</p>
 )}
 </div>
 ) : (
 <p className="text-[10px] text-muted">Table libre</p>
 )}
 </div>
 </div>
 )}

 <div
 className={cn(
 'relative flex items-center justify-center text-xs text-center',
 visual.className,
 )}
 style={visual.style}
 >
 <div className="px-2 relative z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.85)]">
 <div className="truncate max-w-[90px] font-semibold text-[11px] tracking-tight">{table.name}</div>
 <div className="text-[9px] opacity-80 mt-0.5 tabular-nums">
 {occupiedCount}/{table.capacity}
 </div>
 {zone && (
 <div
 className="text-[8px] font-bold mt-0.5 px-1 py-0.5 rounded text-white truncate max-w-[80px]"
 style={{ backgroundColor: zone.color || '#c4a35a' }}
 >
 {zone.name}
 </div>
 )}
 </div>

 {isActive && (
 <div className="absolute -top-2.5 -right-2.5 flex gap-1">
 {caps.canLock ? (
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 handleToggleLock(table.id);
 }}
 className="p-1.5 bg-surface border border-border text-muted hover:text-primary rounded-full shadow-[var(--shadow-soft)] transition"
 title={table.locked ? 'Déverrouiller' : 'Verrouiller'}
 >
 {table.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
 </button>
 ) : null}
 {caps.canRotate ? (
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 handleRotateTable(table.id, 15);
 }}
 className="p-1.5 bg-surface border border-border text-muted hover:text-primary rounded-full shadow-[var(--shadow-soft)] transition"
 title="Pivoter de 15°"
 >
 <RotateCw className="w-3 h-3" />
 </button>
 ) : null}
 {caps.canDuplicate ? (
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 handleDuplicateTable(table);
 }}
 className="p-1.5 bg-surface border border-border text-muted hover:text-primary rounded-full shadow-[var(--shadow-soft)] transition"
 title="Dupliquer"
 >
 <Copy className="w-3 h-3" />
 </button>
 ) : null}
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 handleOpenEditTable(table);
 }}
 className="p-1.5 bg-surface border border-border text-muted hover:text-primary rounded-full shadow-[var(--shadow-soft)] transition"
 title="Modifier la table"
 >
 <Edit2 className="w-3 h-3" />
 </button>
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 handleDeleteTable(table.id);
 }}
 className="p-1.5 bg-surface border border-border text-rose-600 hover:bg-rose-50 rounded-full shadow-[var(--shadow-soft)] transition"
 title="Supprimer la table"
 >
 <Trash2 className="w-3 h-3" />
 </button>
 </div>
 )}

 {Array.from({ length: table.capacity }).map((_, index) => {
 const coords = getSeatCoordinates(table.shape, table.capacity, index);
 const assignedGuestId = table.seats[index];
 const guest = guests.find((g) => g.id === assignedGuestId);

                    return (
                      <div
                        key={index}
                        data-no-drag
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGuestSeat({ tableId: table.id, seatIndex: index });
                        }}
                        style={{
                          left: `calc(50% + ${coords.x}px)`,
                          top: `calc(50% + ${coords.y}px)`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        className={cn(
                          'em-floor-seat absolute w-7 h-7 rounded-full border flex items-center justify-center text-[9px] font-semibold cursor-pointer touch-manipulation',
                          guest ? 'em-floor-seat--filled' : 'em-floor-seat--empty',
                        )}
                        title={guest ? `${guest.firstName} ${guest.lastName}` : `Siège ${index + 1} (libre)`}
                      >
 {guest ? (
 <span className="uppercase">{guest.firstName[0]}{guest.lastName[0]}</span>
 ) : (
 <span>{index + 1}</span>
 )}
 </div>
 );
 })}
 </div>
 </div>
 );
 })
 )}
   </div>
 </div>
 );

 return (
 <div className="space-y-6 animate-fade-in">
 {zonePricing && pricingZones.length > 0 && (
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-[var(--radius-card)] border border-border bg-surface-muted/60">
 <div>
 <p className="text-xs font-semibold text-foreground">Tarification par zones</p>
 <p className="text-[11px] text-muted">Assignez une zone à chaque table via « Modifier la table ».</p>
 </div>
 <div className="flex flex-wrap gap-2">
 {pricingZones.map((z) => (
 <span key={z.id} className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full border border-border bg-surface">
 <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: z.color || '#c4a35a' }} />
 {z.name}
 </span>
 ))}
 </div>
 </div>
 )}
 {canImportRoomLayout && onImportRoomLayout && (
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-surface-muted border border-border rounded-[var(--radius-card)]">
 <div className="text-sm">
 <p className="font-semibold text-primary">Plan de salle disponible</p>
 <p className="text-muted text-xs mt-0.5">
 {roomName ? (
 <>Mettre à jour depuis <span className="text-primary font-medium">« {roomName} »</span> — le nouveau plan 3D est appliqué ; les places déjà assignées sont conservées.</>
 ) : (
 'Importer le modèle de la salle liée (places conservées si possible).'
 )}
 </p>
 </div>
 <div className="flex flex-wrap gap-2">
 <button
 type="button"
 disabled={importingLayout}
 onClick={() => onImportRoomLayout(tables.length > 0)}
 className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-xs font-semibold rounded-[var(--radius-button)] transition"
 >
 {importingLayout ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
 {tables.length > 0 ? 'Mettre à jour depuis la salle' : 'Importer depuis la salle'}
 </button>
 </div>
 </div>
 )}

 {caps.level !== 'complete' ? (
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-amber-200 bg-amber-50 rounded-[var(--radius-card)]">
 <div className="text-sm">
 <p className="font-semibold text-amber-950 flex items-center gap-2">
 <Sparkles className="w-4 h-4" /> Éditeur {caps.label} · {tables.length}/{caps.maxTables} tables
 </p>
 <p className="text-xs text-amber-800 mt-0.5">{caps.description}</p>
 </div>
 <Link href="/dashboard/billing" className="text-xs font-bold text-primary hover:underline shrink-0">
 Voir les forfaits →
 </Link>
 </div>
 ) : null}

 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
 <div>
 <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
 <LayoutGrid className="w-5 h-5 text-primary" />
 Plan de Table Interactif
 </h2>
 <p className="text-muted text-sm mt-0.5">
 {plannerView === '3d'
   ? `Vue 3D ${previewQuality === 'showcase' ? 'showcase' : 'standard'} · orbitez pour inspecter la salle`
   : `${tables.length}/${caps.maxTables} tables · ${caps.label}${caps.canSnapGrid ? ' · grille' : ''}${caps.canRotate ? ' · rotation' : ''}. Placez les invités confirmés sur les sièges.`}
 </p>
 </div>
 <div className="flex flex-wrap gap-2">
 <div className="flex gap-1 rounded-full border border-border bg-surface p-0.5">
 <button
 type="button"
 onClick={() => setPlannerView('2d')}
 className={cn(
 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition',
 plannerView === '2d' ? 'bg-foreground text-background' : 'text-muted hover:text-foreground',
 )}
 >
 <LayoutGrid className="w-3 h-3" />
 Plan 2D
 </button>
 <button
 type="button"
 onClick={() => setPlannerView('3d')}
 className={cn(
 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition',
 plannerView === '3d' ? 'bg-foreground text-background' : 'text-muted hover:text-foreground',
 )}
 >
 <Box className="w-3 h-3" />
 Vue 3D
 </button>
 </div>
 <button
 onClick={() => {
 if (tables.length >= caps.maxTables) {
 alert(`Limite de ${caps.maxTables} tables atteinte (${caps.label}). Passez à un forfait supérieur.`);
 return;
 }
 setShowAddModal(true);
 }}
 className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 bg-surface border border-border text-foreground hover:bg-surface-muted font-medium rounded-[var(--radius-button)] text-xs sm:text-sm transition"
 >
 <Plus className="w-4 h-4" />
 Ajouter une Table
 </button>
 <button
 onClick={handleSavePlan}
 disabled={saving}
 className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-medium rounded-[var(--radius-button)] text-sm transition"
 >
 {saving ? (
 <>
 <RefreshCw className="w-4 h-4 animate-spin" />
 Sauvegarde...
 </>
 ) : (
 <>
 <Check className="w-4 h-4" />
 Sauvegarder le Plan
 </>
 )}
 </button>
 </div>
 </div>

 {/* Grid Layout for Planner — canvas first on mobile */}
 <div className="flex flex-col xl:grid xl:grid-cols-4 gap-3 xl:gap-6">
 <div className="order-1 xl:order-2 xl:col-span-3 flex flex-col space-y-3">
 {plannerView === '2d' ? (
 <div className="bg-surface border border-border rounded-[var(--radius-card)] px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs text-muted font-medium flex flex-wrap items-center gap-1.5 sm:gap-2 overflow-x-auto">
 <Move className="w-3.5 h-3.5 text-muted shrink-0" />
 <span className="flex-1 min-w-[10rem] hidden sm:inline">Glissez les tables · déverrouillez pour déplacer un import · cliquez un siège pour placer un invité</span>
 <span className="flex-1 sm:hidden">Glissez · touchez un siège</span>
 {tables.some((t) => Object.values(t.seats).some(Boolean)) ? (
 <button
 type="button"
 onClick={handleClearAssignments}
 className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-muted border border-border rounded-[var(--radius-button)] text-[10px] font-semibold text-foreground hover:bg-rose-50 transition"
 >
 Libérer les sièges
 </button>
 ) : null}
 {caps.canSnapGrid || caps.canAlign ? (
 <button
 type="button"
 onClick={handleLayoutGrid}
 disabled={tables.filter((t) => !t.locked).length === 0}
 className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-muted border border-border rounded-[var(--radius-button)] text-[10px] font-semibold text-foreground hover:bg-primary/10 transition disabled:opacity-50"
 >
 <LayoutGrid className="w-3.5 h-3.5" />
 Grille
 </button>
 ) : null}
 {caps.canAlign ? (
 <button
 type="button"
 onClick={handleLayoutCircle}
 disabled={tables.filter((t) => !t.locked).length === 0}
 className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-muted border border-border rounded-[var(--radius-button)] text-[10px] font-semibold text-foreground hover:bg-primary/10 transition disabled:opacity-50"
 >
 Cercle
 </button>
 ) : null}
 {tables.some((t) => t.locked) && caps.canLock && (
 <button
 type="button"
 onClick={() => setTables(tables.map((t) => ({ ...t, locked: false })))}
 className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-muted border border-border rounded-[var(--radius-button)] text-[10px] font-semibold text-foreground hover:bg-primary/10 transition"
 >
 <Unlock className="w-3.5 h-3.5" />
 Tout déverrouiller
 </button>
 )}
 <button
 type="button"
 onClick={() => setIsExpanded(true)}
 className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-muted border border-border rounded-[var(--radius-button)] text-[10px] font-semibold text-primary hover:bg-primary/10 transition"
 >
 <Maximize2 className="w-3.5 h-3.5" />
 Plein écran
 </button>
 </div>
 ) : (
 <div className="bg-surface border border-border rounded-[var(--radius-card)] px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs text-muted font-medium flex flex-wrap items-center gap-2">
 <Box className="w-3.5 h-3.5 text-primary shrink-0" />
 <span>Vue 3D en lecture seule · molette = zoom · glisser = orbit</span>
 <button
 type="button"
 onClick={() => setIsExpanded(true)}
 className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-muted border border-border rounded-[var(--radius-button)] text-[10px] font-semibold text-primary hover:bg-primary/10 transition"
 >
 <Maximize2 className="w-3.5 h-3.5" />
 Plein écran
 </button>
 </div>
 )}

 {!isExpanded && (plannerView === '3d' ? render3DPreview('em-plan-stage') : renderCanvas('em-plan-stage'))}
 </div>

 <div className="order-2 xl:order-1 xl:col-span-1 bg-surface border border-border rounded-[var(--radius-card)] p-3 sm:p-4 flex flex-col xl:h-[600px] shadow-sm">
 <button
 type="button"
 onClick={() => setGuestsOpen((open) => !open)}
 className="flex items-center justify-between gap-2 xl:pointer-events-none mb-3"
 >
 <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
 <Users className="w-5 h-5 text-primary" />
 À placer
 </h3>
 <span className="flex items-center gap-2">
 <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">{unassignedGuests.length}</span>
 <ChevronDown className={cn('w-4 h-4 text-muted xl:hidden transition', guestsOpen && 'rotate-180')} />
 </span>
 </button>

 <div className={cn('flex flex-col flex-1', guestsOpen ? '' : 'hidden', 'xl:flex')}>
  <div className="relative mb-3">
    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
    <input
      type="text"
      placeholder="Rechercher un invité..."
      value={guestSearch}
      onChange={e => setGuestSearch(e.target.value)}
      className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-muted border border-border rounded-[var(--radius-button)] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
    />
  </div>
  
  <div className="overflow-y-auto flex-1 bg-surface-muted/30 p-2 rounded-xl border border-border/50">
    {filteredUnassignedGuests.length === 0 ? (
    <div className="text-center py-8 text-muted space-y-3">
      {guestSearch ? (
        <p className="text-xs">Aucun résultat.</p>
      ) : (
        <>
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <Check className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-sm font-medium">Placement terminé !</p>
        </>
      )}
    </div>
    ) : (
      <div className="space-y-1.5">
        {filteredUnassignedGuests.map(g => (
        <div 
        key={g.id}
        className="p-2.5 bg-surface border border-border/80 hover:border-primary/40 rounded-[var(--radius-button)] shadow-sm hover:shadow transition flex flex-col gap-1 cursor-grab"
        >
        <div className="flex items-start justify-between">
        <span className="font-semibold text-foreground text-xs leading-tight">{g.firstName} {g.lastName}</span>
        <span className="text-[9px] uppercase tracking-wider font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100 shrink-0">Confirmé</span>
        </div>
        <div className="text-[10px] text-muted flex items-center gap-1.5 mt-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
        {g.category || 'Général'}
        </div>
        </div>
        ))}
      </div>
    )}
  </div>
 </div>
 </div>
 </div>

 {/* Expanded fullscreen canvas */}
 {isExpanded && (
 <div className="fixed inset-0 z-[100] bg-background flex flex-col p-1.5 sm:p-4 md:p-6" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
 <div className="flex items-center justify-between gap-3 mb-2 sm:mb-4 shrink-0">
 <div className="min-w-0">
 <h3 className="text-sm sm:text-lg font-semibold text-foreground flex items-center gap-2">
 <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
 <span className="truncate">Plan de table</span>
 </h3>
 <p className="text-[11px] text-muted mt-0.5 hidden sm:block">
 Survolez une table pour afficher son type, sa capacité et les invités placés.
 </p>
 </div>
 <button
 type="button"
 onClick={() => setIsExpanded(false)}
 className="inline-flex items-center gap-2 px-3 py-2 bg-surface border border-border text-foreground hover:bg-surface-muted font-medium rounded-[var(--radius-button)] text-sm transition shrink-0"
 >
 <Minimize2 className="w-4 h-4" />
 Réduire
 </button>
 </div>
 <div className="flex-1 min-h-0">
 {plannerView === '3d' ? render3DPreview('h-full min-h-0') : renderCanvas('h-full min-h-0')}
 </div>
 </div>
 )}

 {/* Seat Assignment Dropdown Modal/Popover */}
 {selectedSeat && (
 <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
 <div className="bg-surface rounded-[var(--radius-card)] border border-border max-w-md w-full p-6 space-y-4 animate-scale-up">
 <div className="flex justify-between items-center pb-3 border-b border-border">
 <h3 className="font-semibold text-foreground text-base">
 Placer un invité - Siège {selectedSeat.seatIndex + 1}
 </h3>
 <button 
 onClick={() => setSelectedGuestSeat(null)}
 className="p-1.5 text-muted hover:text-foreground rounded-[var(--radius-button)] hover:bg-surface-muted transition"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* If seat is already occupied, allow freeing it */}
 {tables.find(t => t.id === selectedSeat.tableId)?.seats[selectedSeat.seatIndex] && (
 <div className="p-3 bg-surface-muted border border-border rounded-[var(--radius-card)] flex items-center justify-between gap-3">
 <div>
 <div className="text-xs text-muted font-medium">Siège actuellement occupé par :</div>
 <div className="font-semibold text-foreground text-sm mt-1">
 {(() => {
 const guestId = tables.find(t => t.id === selectedSeat.tableId)?.seats[selectedSeat.seatIndex];
 const g = guests.find(guest => guest.id === guestId);
 return g ? `${g.firstName} ${g.lastName}` : 'Inconnu';
 })()}
 </div>
 </div>
 <button
 onClick={() => handleAssignGuest(selectedSeat.tableId, selectedSeat.seatIndex, null)}
 className="px-3 py-1.5 border border-border text-rose-600 hover:bg-surface-muted font-medium rounded-[var(--radius-button)] text-xs transition shrink-0"
 >
 Libérer le siège
 </button>
 </div>
 )}

 <div className="space-y-3">
 <div className="flex items-center justify-between">
   <label className="text-xs font-medium text-muted uppercase tracking-wider">
     Invités présents ({unassignedGuests.length})
   </label>
 </div>
 {unassignedGuests.length === 0 ? (
 <p className="text-xs text-muted italic">Tous les invités éligibles ont déjà une place attribuée.</p>
 ) : (
 <div className="space-y-2">
  <div className="relative">
    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
    <input
      type="text"
      placeholder="Rechercher..."
      value={guestSearch}
      onChange={e => setGuestSearch(e.target.value)}
      className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-border rounded-[var(--radius-button)] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
    />
  </div>
 <div className="max-h-52 overflow-y-auto bg-surface-muted/30 p-2 border border-border/50 rounded-xl space-y-1.5">
 {filteredUnassignedGuests.length === 0 ? (
   <div className="text-center py-4 text-xs text-muted">Aucun résultat</div>
 ) : (
 filteredUnassignedGuests.map(g => (
 <button
 key={g.id}
 onClick={() => handleAssignGuest(selectedSeat.tableId, selectedSeat.seatIndex, g.id)}
 className="w-full text-left p-2.5 bg-surface border border-border/80 hover:border-primary/40 rounded-[var(--radius-button)] shadow-sm hover:shadow transition flex items-center justify-between text-xs group"
 >
 <div>
 <span className="font-semibold text-foreground block leading-tight">{g.firstName} {g.lastName}</span>
 <span className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
   <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
   {g.category || 'Général'}
 </span>
 </div>
 <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
 Choisir
 </span>
 </button>
 )))}
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 )}

 {/* Add Table Modal */}
 {showAddModal && (
 <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
 <div className="bg-surface rounded-[var(--radius-card)] border border-border max-w-md w-full p-6 space-y-5 animate-scale-up">
 <div className="flex justify-between items-center pb-3 border-b border-border">
 <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
 <Plus className="w-5 h-5 text-primary" />
 Ajouter une nouvelle table
 </h3>
 <button 
 onClick={() => setShowAddModal(false)}
 className="p-1.5 text-muted hover:text-foreground rounded-[var(--radius-button)] hover:bg-surface-muted transition"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="space-y-4">
 <div>
 <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">Nom de la table</label>
 <input
 type="text"
 placeholder="Ex: Table d'honneur, Table 1..."
 value={newTableName}
 onChange={(e) => setNewTableName(e.target.value)}
 className="w-full px-4 py-2.5 bg-surface-muted border border-border rounded-[var(--radius-button)] text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">Forme</label>
 <select
 value={newTableShape}
 onChange={(e) => setNewTableShape(e.target.value as TableShape)}
 className="w-full px-4 py-2.5 bg-surface-muted border border-border rounded-[var(--radius-button)] text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
 >
 {caps.tableShapes.includes('round') ? <option value="round">Ronde</option> : null}
 {caps.tableShapes.includes('rectangular') ? <option value="rectangular">Rectangulaire</option> : null}
 {caps.tableShapes.includes('square') ? <option value="square">Carrée</option> : null}
 {caps.tableShapes.includes('oval') ? <option value="oval">Ovale</option> : null}
 </select>
 </div>

 <div>
 <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">Nombre de places</label>
 <input
 type="number"
 min={2}
 max={24}
 value={newTableCapacity}
 onChange={(e) => setNewTableCapacity(parseInt(e.target.value) || 8)}
 className="w-full px-4 py-2.5 bg-surface-muted border border-border rounded-[var(--radius-button)] text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">Type de chaise</label>
 <select
 value={newChairType}
 onChange={(e) => setNewChairType(e.target.value as ChairType)}
 className="w-full px-4 py-2.5 bg-surface-muted border border-border rounded-[var(--radius-button)] text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
 >
 {Object.entries(chairTypeLabels).map(([k, v]) => (
 <option key={k} value={k}>{v}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
 <Palette className="w-3 h-3" /> Couleur
 </label>
 <input
 type="color"
 value={newTableColor}
 onChange={(e) => setNewTableColor(e.target.value)}
 className="w-full h-10 rounded-[var(--radius-button)] border border-border cursor-pointer bg-surface-muted"
 />
 </div>
 </div>
 </div>

 <div className="flex gap-3 pt-3 border-t border-border">
 <button
 onClick={() => setShowAddModal(false)}
 className="flex-1 px-4 py-2.5 border border-border text-muted hover:bg-surface-muted font-medium rounded-[var(--radius-button)] text-sm transition"
 >
 Annuler
 </button>
 <button
 onClick={handleAddTable}
 disabled={!newTableName.trim()}
 className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-medium rounded-[var(--radius-button)] text-sm transition"
 >
 Ajouter la table
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Edit Table Modal */}
 {editingTable && (
 <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
 <div className="bg-surface rounded-[var(--radius-card)] border border-border max-w-md w-full p-6 space-y-5 animate-scale-up">
 <div className="flex justify-between items-center pb-3 border-b border-border">
 <h3 className="font-semibold text-foreground text-base">
 Modifier la table : {editingTable.name}
 </h3>
 <button 
 onClick={() => setEditingTable(null)}
 className="p-1.5 text-muted hover:text-foreground rounded-[var(--radius-button)] hover:bg-surface-muted transition"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="space-y-4">
 <div>
 <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">Nom de la table</label>
 <input
 type="text"
 value={editingTable.name}
 onChange={(e) => setEditingTable({ ...editingTable, name: e.target.value })}
 className="w-full px-4 py-2.5 bg-surface-muted border border-border rounded-[var(--radius-button)] text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">Forme</label>
 <select
 value={editingTable.shape}
 onChange={(e) => setEditingTable({ ...editingTable, shape: e.target.value as TableShape })}
 className="w-full px-4 py-2.5 bg-surface-muted border border-border rounded-[var(--radius-button)] text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
 >
 {caps.tableShapes.includes('round') ? <option value="round">Ronde</option> : null}
 {caps.tableShapes.includes('rectangular') ? <option value="rectangular">Rectangulaire</option> : null}
 {caps.tableShapes.includes('square') ? <option value="square">Carrée</option> : null}
 {caps.tableShapes.includes('oval') ? <option value="oval">Ovale</option> : null}
 </select>
 </div>

 <div>
 <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">Nombre de places</label>
 <input
 type="number"
 min={2}
 max={24}
 value={editingTable.capacity}
 onChange={(e) => setEditingTable({ ...editingTable, capacity: parseInt(e.target.value) || 8 })}
 className="w-full px-4 py-2.5 bg-surface-muted border border-border rounded-[var(--radius-button)] text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">Type de chaise</label>
 <select
 value={editingTable.chairType || 'BANQUET'}
 onChange={(e) => setEditingTable({ ...editingTable, chairType: e.target.value })}
 className="w-full px-4 py-2.5 bg-surface-muted border border-border rounded-[var(--radius-button)] text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
 >
 {Object.entries(chairTypeLabels).map(([k, v]) => (
 <option key={k} value={k}>{v}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
 <Palette className="w-3 h-3" /> Couleur
 </label>
 <input
 type="color"
 value={editingTable.tableColor || '#ffffff'}
 onChange={(e) => setEditingTable({ ...editingTable, tableColor: e.target.value })}
 className="w-full h-10 rounded-[var(--radius-button)] border border-border cursor-pointer bg-surface-muted"
 />
 </div>
 </div>
 {caps.canRotate ? (
 <label className="block text-xs font-medium text-muted uppercase tracking-wider space-y-1.5">
 Rotation ({editingTable.rotation || 0}°)
 <input
 type="range"
 min={0}
 max={345}
 step={15}
 value={editingTable.rotation || 0}
 onChange={(e) => setEditingTable({ ...editingTable, rotation: Number(e.target.value) })}
 className="w-full"
 />
 </label>
 ) : null}
 {caps.canLock ? (
 <label className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-[var(--radius-button)] border border-border bg-surface-muted cursor-pointer">
 <span className="text-xs font-medium text-foreground">Verrouiller la position</span>
 <input
 type="checkbox"
 checked={Boolean(editingTable.locked)}
 onChange={(e) => setEditingTable({ ...editingTable, locked: e.target.checked })}
 className="rounded border-border text-primary focus:ring-primary/30 h-4 w-4"
 />
 </label>
 ) : null}
 {zonePricing && pricingZones.length > 0 ? (
 <div>
 <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">Zone tarifaire</label>
 <select
 value={editingTable.pricingZoneId || ''}
 onChange={(e) => setEditingTable({
   ...editingTable,
   pricingZoneId: e.target.value || undefined,
 })}
 className="w-full px-4 py-2.5 bg-surface-muted border border-border rounded-[var(--radius-button)] text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
 >
 <option value="">Automatique / prix par défaut</option>
 {pricingZones.map((z) => (
 <option key={z.id} value={z.id}>{z.name}</option>
 ))}
 </select>
 </div>
 ) : null}
 </div>

 <div className="flex gap-3 pt-3 border-t border-border">
 <button
 onClick={() => setEditingTable(null)}
 className="flex-1 px-4 py-2.5 border border-border text-muted hover:bg-surface-muted font-medium rounded-[var(--radius-button)] text-sm transition"
 >
 Annuler
 </button>
 <button
 onClick={handleSaveEditTable}
 disabled={!editingTable.name.trim()}
 className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-medium rounded-[var(--radius-button)] text-sm transition"
 >
 Enregistrer
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
