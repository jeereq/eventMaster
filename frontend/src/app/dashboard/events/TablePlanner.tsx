'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  Plus, Trash2, Users, Check, Move, X, RefreshCw, Search,
  HelpCircle, Edit2, LayoutGrid, Maximize2, Minimize2, Copy, Lock, Unlock, Palette, RotateCw, Sparkles, ChevronDown, Download, PlusCircle, Save, Box,
  Wand2, Paintbrush, Settings2, CheckCircle2, AlertCircle, Coins, Eye, Tag, SlidersHorizontal,
  ZoomIn, ZoomOut, Columns
} from 'lucide-react';
import { Button } from '@/components/ui';
import Modal from '@/components/ui/Modal';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import {
  getOccupiedSeatCount,
  getSeatCoordinates,
  getTableShapeLabel,
  getTableVisualStyle,
  TableShape,
} from '@/lib/tablePlanUtils';
import { chairTypeLabels, getFixtureClass, type ChairType, type RoomLayoutBlueprint, resolveBlueprintWalls, wallsFromRoomOutline } from '@/lib/roomLayoutUtils';
import { resolveFloorStyle } from '@/lib/roomFloorUtils';
import type { FloorType } from '@/lib/roomThemeUtils';
import { roomEditorCapabilities, snapLayoutPct } from '@/lib/roomEditorAccess';
import { buildTablePlanPreviewBlueprint } from '@/lib/tablePlanPreviewBlueprint';
import type { PricingZone, TicketPricingMode, ZoneDistributionStrategy } from '@/lib/ticketPricing';
import {
  pricingZonesFromTablePlan,
  computeTicketingRevenueSummary,
  autoDistributeTablesToZones,
  TICKETING_ZONE_PRESETS,
  createEmptyPricingZone,
  isLightHexColor,
} from '@/lib/ticketPricing';
import type { LightingPreset } from '@/lib/roomRenderQuality';
import RoomLayoutPreview from '@/components/RoomLayoutPreview';
import Room2DPlanWalls from '@/components/Room2DPlanWalls';
import Room2DScaleCompass from '@/components/Room2DScaleCompass';
import { PlanViewToggle, type PlanViewMode } from '@/components/PlanViewChrome';
import Link from 'next/link';

type PlannerView = PlanViewMode;

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

export type PlannerHeightPreset = 'standard' | 'comfort' | 'expanded' | 'screen';

export const HEIGHT_PRESET_CONFIG: Record<
  PlannerHeightPreset,
  { id: PlannerHeightPreset; label: string; heightClass: string; px: number }
> = {
  standard: {
    id: 'standard',
    label: 'Standard',
    heightClass: 'h-[580px] min-h-[500px]',
    px: 580,
  },
  comfort: {
    id: 'comfort',
    label: 'Confort',
    heightClass: 'h-[720px] min-h-[620px]',
    px: 720,
  },
  expanded: {
    id: 'expanded',
    label: 'Grand',
    heightClass: 'h-[860px] min-h-[740px]',
    px: 860,
  },
  screen: {
    id: 'screen',
    label: 'Écran',
    heightClass: 'h-[calc(100vh-210px)] min-h-[700px]',
    px: 920,
  },
};

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

  // Dimensions & Liberté d'espace de travail pour les utilisateurs
  const [heightPreset, setHeightPreset] = useState<PlannerHeightPreset>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('em-planner-height-preset') as PlannerHeightPreset | null;
      if (saved && HEIGHT_PRESET_CONFIG[saved]) {
        return saved;
      }
    }
    return 'comfort'; // Standard de confort agrandi par défaut (720px)
  });

  const [isPanoramic, setIsPanoramic] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('em-planner-panoramic') === 'true';
    }
    return false;
  });

  const [canvasZoom, setCanvasZoom] = useState<number>(1);

  const handleSetHeightPreset = (preset: PlannerHeightPreset) => {
    setHeightPreset(preset);
    if (typeof window !== 'undefined') {
      localStorage.setItem('em-planner-height-preset', preset);
    }
  };

  const handleTogglePanoramic = () => {
    setIsPanoramic((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('em-planner-panoramic', String(next));
      }
      return next;
    });
  };

  const currentHeightClass = HEIGHT_PRESET_CONFIG[heightPreset]?.heightClass || 'h-[720px] min-h-[620px]';

  // Zone distribution and management states
  const [paintZoneId, setPaintZoneId] = useState<string | null>(null);
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [showZoneManagerModal, setShowZoneManagerModal] = useState(false);
  const [distributeStrategy, setDistributeStrategy] = useState<ZoneDistributionStrategy>('front_to_back');
  const [updateBoundsOnDistribute, setUpdateBoundsOnDistribute] = useState(true);
  const [editingZonesList, setEditingZonesList] = useState<PricingZone[]>([]);

  const ticketingSummary = useMemo(
    () => computeTicketingRevenueSummary(tables, pricingZones),
    [tables, pricingZones],
  );

  const distributionPreview = useMemo(() => {
    if (!showDistributeModal || !pricingZones.length || !tables.length) return null;
    return autoDistributeTablesToZones(tables, pricingZones, {
      strategy: distributeStrategy,
      fixtures,
      updateBoundingBoxes: updateBoundsOnDistribute,
    });
  }, [showDistributeModal, tables, pricingZones, distributeStrategy, fixtures, updateBoundsOnDistribute]);

  // Cancel paint brush on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && paintZoneId) {
        setPaintZoneId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paintZoneId]);

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
    () => buildTablePlanPreviewBlueprint(initialTablePlan, tables, roomLayoutBlueprint, pricingZones),
    [initialTablePlan, tables, roomLayoutBlueprint, pricingZones],
  );

  const tablePlannerWalls = useMemo(() => {
    if (roomLayoutBlueprint) {
      return resolveBlueprintWalls(roomLayoutBlueprint);
    }
    if (initialTablePlan?.roomOutline) {
      return wallsFromRoomOutline(initialTablePlan.roomOutline, { withEntrance: true });
    }
    return [];
  }, [roomLayoutBlueprint, initialTablePlan?.roomOutline]);

  const plannerWidthM = roomLayoutBlueprint?.canvas.widthM ?? 20;
  const plannerHeightM = roomLayoutBlueprint?.canvas.heightM ?? 16;

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

    const updatedTables = [...tables.map(t => ({ ...t, seats: { ...t.seats } }))];
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
        dominantCat = existingCats.sort((a, b) =>
          existingCats.filter(v => v === a).length
          - existingCats.filter(v => v === b).length
        ).pop() || 'Général';
      }

      // Pick guests
      for (const seatIndex of emptySeatIndices) {
        let catToPick = dominantCat;
        if (!catToPick || !guestsByCat[catToPick] || guestsByCat[catToPick].length === 0) {
          // Find largest category group remaining
          const availableCats = Object.keys(guestsByCat).filter(k => guestsByCat[k].length > 0);
          if (availableCats.length === 0) break; // no guests left
          catToPick = availableCats.sort((a, b) => guestsByCat[b].length - guestsByCat[a].length)[0];
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

  const active3DTable = useMemo(() => {
    if (!activeTableId) return null;
    return tables.find((t) => t.id === activeTableId) ?? null;
  }, [activeTableId, tables]);

  const render3DPreview = (heightClass: string) => (
    <div className={cn('flex flex-col min-h-0 space-y-2.5', heightClass)}>
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
        <div className="flex-1 flex flex-col min-h-0 space-y-2">
          {/* Barre d'outils 3D pour la tarification par zone */}
          {zonePricing && pricingZones.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-surface border border-border shadow-2xs shrink-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider flex items-center gap-1 mr-1">
                  <Paintbrush className="w-3.5 h-3.5 text-primary" />
                  Pinceau 3D :
                </span>
                {pricingZones.map((zone) => {
                  const isPaintActive = paintZoneId === zone.id;
                  const stats = ticketingSummary.byZone.find((bz) => bz.zone.id === zone.id);
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => setPaintZoneId(isPaintActive ? null : zone.id)}
                      className={cn(
                        'inline-flex min-h-9 items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition shadow-2xs',
                        isPaintActive
                          ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/40'
                          : 'border-border bg-surface hover:bg-surface-muted text-foreground'
                      )}
                      title={
                        isPaintActive
                          ? 'Pinceau actif : touchez une table en 3D pour lui appliquer cette zone'
                          : `Cliquer pour peindre en 3D (${zone.name})`
                      }
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: zone.color || '#c4a35a' }}
                      />
                      <span className="truncate max-w-[100px]">{zone.name}</span>
                      {stats && (
                        <span className="text-[10px] text-muted tabular-nums">
                          ({stats.tableCount} tbl.)
                        </span>
                      )}
                      {isPaintActive && <Check className="w-3 h-3 text-primary ml-0.5" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowDistributeModal(true)}
                  className="text-xs h-8"
                  leftIcon={<Sparkles className="w-3 h-3" />}
                >
                  Répartir 3D
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingZonesList(pricingZones.length ? pricingZones : [createEmptyPricingZone(0), createEmptyPricingZone(1)]);
                    setShowZoneManagerModal(true);
                  }}
                  className="text-xs h-8"
                >
                  Gérer tarifs
                </Button>
              </div>
            </div>
          )}

          {/* Rendu 3D avec sélection de table interactive */}
          <div className="relative flex-1 min-h-[320px] rounded-2xl overflow-hidden border border-border bg-foreground shadow-[var(--shadow-soft)]">
            <RoomLayoutPreview
              blueprint={previewBlueprint}
              quality={previewQuality}
              lightingPreset={previewLighting}
              selectedTableId={activeTableId}
              onSelectTable={(tableId) => {
                if (paintZoneId) {
                  setTables((prev) =>
                    prev.map((t) => (t.id === tableId ? { ...t, pricingZoneId: paintZoneId } : t))
                  );
                  setActiveTableId(tableId);
                } else {
                  setActiveTableId(tableId);
                }
              }}
              showMeta={false}
              className="absolute inset-0 h-full w-full [&_.em-floor-canvas]:min-h-[320px]"
            />

            {/* Hint en haut du canvas */}
            <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 bg-foreground/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-background/20 text-[10px] font-semibold text-background">
              <Box className="w-3 h-3 text-primary" />
              <span>
                {paintZoneId
                  ? `Pinceau actif : touchez une table pour l'assigner à ${pricingZones.find((z) => z.id === paintZoneId)?.name}`
                  : 'Touchez une table en 3D pour la sélectionner et modifier sa zone'}
              </span>
            </div>

            {/* Carte de la table 3D active sélectionnée */}
            {active3DTable && (
              <div className="absolute bottom-2 left-2 right-2 z-20 rounded-xl bg-background/95 backdrop-blur-md border border-border p-2.5 shadow-lg flex flex-wrap items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-foreground">{active3DTable.name}</span>
                  <span className="text-[11px] text-muted">({active3DTable.capacity} places)</span>
                  {active3DTable.pricingZoneId && (
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-2xs"
                      style={{
                        backgroundColor:
                          pricingZones.find((z) => z.id === active3DTable.pricingZoneId)?.color || '#c4a35a',
                      }}
                    >
                      {pricingZones.find((z) => z.id === active3DTable.pricingZoneId)?.name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {zonePricing && pricingZones.length > 0 && (
                    <div className="flex items-center gap-1 mr-1">
                      <span className="text-[10px] text-muted">Zone :</span>
                      {pricingZones.map((z) => (
                        <button
                          key={z.id}
                          type="button"
                          onClick={() =>
                            setTables((prev) =>
                              prev.map((t) => (t.id === active3DTable.id ? { ...t, pricingZoneId: z.id } : t))
                            )
                          }
                          className={cn(
                            'w-5 h-5 rounded-full border transition hover:scale-110 active:scale-95',
                            active3DTable.pricingZoneId === z.id
                              ? 'ring-2 ring-primary border-white'
                              : 'border-border'
                          )}
                          style={{ backgroundColor: z.color || '#c4a35a' }}
                          title={`Assigner à ${z.name}`}
                        />
                      ))}
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditingTable(active3DTable)}
                    className="text-xs h-7 px-2"
                  >
                    Détails table
                  </Button>
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted leading-relaxed">
            Vue 3D interactive — sélectionnez ou peignez les tables directement en 3D. Pour placer manuellement les convives par siège, basculez en{' '}
            <button type="button" onClick={() => setPlannerView('2d')} className="font-semibold text-primary hover:underline">
              vue 2D
            </button>
            .
          </p>
        </div>
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

          {/* Zoom 2D */}
          <div className="inline-flex items-center gap-1 bg-surface-muted/70 p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setCanvasZoom((z) => Math.max(1, Number((z - 0.25).toFixed(2))))}
              disabled={canvasZoom <= 1}
              className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface disabled:opacity-40 transition"
              title="Dézoomer"
              aria-label="Dézoomer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span
              onClick={() => setCanvasZoom(1)}
              className="px-1 text-[11px] font-bold text-foreground cursor-pointer hover:text-primary transition tabular-nums"
              title="Cliquer pour réinitialiser le zoom à 100%"
            >
              {Math.round(canvasZoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setCanvasZoom((z) => Math.min(2, Number((z + 0.25).toFixed(2))))}
              disabled={canvasZoom >= 2}
              className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface disabled:opacity-40 transition"
              title="Zoomer"
              aria-label="Zoomer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

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
        className={cn(
          'relative w-full rounded-2xl border border-border bg-surface overflow-hidden shadow-[var(--shadow-soft)] flex flex-col',
          heightClass,
        )}
      >
        <div className="absolute inset-0 overflow-auto scrollbar-thin">
          <div
            ref={canvasRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={cn(
              'em-floor-canvas em-floor-canvas--photo touch-none select-none relative',
              'min-w-full min-h-full transition-[width,height] duration-150',
              draggingTableId && 'em-floor-canvas--dragging',
            )}
            style={{
              ...floorStyle,
              touchAction: 'none',
              width: `${canvasZoom * 100}%`,
              height: `${canvasZoom * 100}%`,
            }}
          >
        {tablePlannerWalls.length > 0 && (
          <Room2DPlanWalls
            walls={tablePlannerWalls}
            canvasWidthM={plannerWidthM}
            canvasHeightM={plannerHeightM}
            activeStoryId={roomLayoutBlueprint?.metadata.activeStoryId}
            showDoorSwings={true}
          />
        )}
        <Room2DScaleCompass
          widthM={plannerWidthM}
          heightM={plannerHeightM}
          showGrid={true}
        />
        {zonePricing && pricingZones.map((zone) => {
          if (zone.x == null || zone.y == null || zone.w == null || zone.h == null) return null;
          return (
            <div
              key={zone.id}
              className="absolute pointer-events-none z-[1] rounded-2xl border-2 border-dashed transition-all"
              style={{
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: `${zone.w}%`,
                height: `${zone.h}%`,
                backgroundColor: zone.color ? `${zone.color}18` : 'rgba(196,163,90,0.1)',
                borderColor: zone.color ? `${zone.color}80` : 'rgba(196,163,90,0.4)',
              }}
              title={`${zone.name} (${zone.priceFc > 0 ? formatFc(zone.priceFc) : 'Gratuit'})`}
            >
              <span
                className="absolute top-1.5 left-2 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-2xs tabular-nums flex items-center gap-1.5"
                style={{
                  backgroundColor: zone.color || '#c4a35a',
                  color: isLightHexColor(zone.color || '#c4a35a') ? '#1c1917' : '#ffffff',
                }}
              >
                <span>{zone.name}</span>
                {zone.priceFc > 0 && <span className="opacity-90 font-normal">· {formatFc(zone.priceFc)}</span>}
              </span>
            </div>
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
                onPointerDown={(e) => {
                  if (paintZoneId) return;
                  handlePointerDown(table.id, e);
                }}
                onClick={(e) => {
                  if (paintZoneId) {
                    e.stopPropagation();
                    setTables((prev) =>
                      prev.map((t) => (t.id === table.id ? { ...t, pricingZoneId: paintZoneId } : t))
                    );
                    return;
                  }
                  setActiveTableId(table.id);
                }}
                onMouseEnter={() => setHoveredTableId(table.id)}
                onMouseLeave={() => setHoveredTableId(null)}
                style={{
                  left: `${table.x}%`,
                  top: `${table.y}%`,
                  transform: `translate(-50%, -50%) rotate(${table.rotation || 0}deg)`,
                  touchAction: 'none',
                }}
                className={cn(
                  'absolute select-none p-3 em-floor-item touch-none transition-all',
                  paintZoneId
                    ? 'cursor-pointer hover:scale-105 ring-2 ring-primary/40'
                    : table.locked
                      ? 'cursor-not-allowed'
                      : 'cursor-grab',
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
                      {paintZoneId && (
                        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                          Cliquer pour assigner à la zone {pricingZones.find((z) => z.id === paintZoneId)?.name}
                        </p>
                      )}
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
                    'relative flex items-center justify-center text-xs text-center transition-all',
                    visual.className,
                  )}
                  style={{
                    ...visual.style,
                    ...(zonePricing && zone ? { boxShadow: `0 0 0 2px ${zone.color || '#c4a35a'}, 0 3px 10px rgba(0,0,0,0.12)` } : {}),
                  }}
                >
                  <div className="px-2 relative z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.85)]">
                    <div className="truncate max-w-[90px] font-semibold text-[11px] tracking-tight">{table.name}</div>
                    <div className="text-[9px] opacity-80 mt-0.5 tabular-nums">
                      {occupiedCount}/{table.capacity}
                    </div>
                    {zonePricing && (
                      zone ? (
                        <div
                          className="text-[8px] font-bold mt-0.5 px-1.5 py-0.5 rounded truncate max-w-[85px] shadow-2xs"
                          style={{
                            backgroundColor: zone.color || '#c4a35a',
                            color: isLightHexColor(zone.color || '#c4a35a') ? '#1c1917' : '#ffffff',
                          }}
                          title={`${zone.name}${zone.priceFc > 0 ? ` · ${formatFc(zone.priceFc)}` : ''}`}
                        >
                          {zone.name}
                        </div>
                      ) : (
                        <div
                          className="text-[7.5px] font-bold mt-0.5 px-1 py-0.5 rounded bg-slate-500/80 text-white truncate max-w-[85px] border border-white/20"
                          title="Table sans zone tarifaire assignée"
                        >
                          Sans zone
                        </div>
                      )
                    )}
                  </div>

                  {isActive && (
                    <div className="absolute -top-3 -right-3 flex items-center gap-1.5 z-30">
                      {caps.canLock ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLock(table.id);
                          }}
                          className="relative p-2 sm:p-1.5 min-h-[36px] min-w-[36px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center bg-surface border border-border text-muted hover:text-primary rounded-full shadow-[var(--shadow-soft)] transition before:absolute before:-inset-1.5 before:content-[''] focus-visible:ring-2 focus-visible:ring-primary"
                          title={table.locked ? 'Déverrouiller la table' : 'Verrouiller la table'}
                          aria-label={table.locked ? 'Déverrouiller la table' : 'Verrouiller la table'}
                        >
                          {table.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                      ) : null}
                      {caps.canRotate ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRotateTable(table.id, 15);
                          }}
                          className="relative p-2 sm:p-1.5 min-h-[36px] min-w-[36px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center bg-surface border border-border text-muted hover:text-primary rounded-full shadow-[var(--shadow-soft)] transition before:absolute before:-inset-1.5 before:content-[''] focus-visible:ring-2 focus-visible:ring-primary"
                          title="Pivoter de 15°"
                          aria-label="Pivoter la table de 15 degrés"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                      {caps.canDuplicate ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateTable(table);
                          }}
                          className="relative p-2 sm:p-1.5 min-h-[36px] min-w-[36px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center bg-surface border border-border text-muted hover:text-primary rounded-full shadow-[var(--shadow-soft)] transition before:absolute before:-inset-1.5 before:content-[''] focus-visible:ring-2 focus-visible:ring-primary"
                          title="Dupliquer la table"
                          aria-label="Dupliquer la table"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditTable(table);
                        }}
                        className="relative p-2 sm:p-1.5 min-h-[36px] min-w-[36px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center bg-surface border border-border text-muted hover:text-primary rounded-full shadow-[var(--shadow-soft)] transition before:absolute before:-inset-1.5 before:content-[''] focus-visible:ring-2 focus-visible:ring-primary"
                        title="Modifier la table"
                        aria-label="Modifier la table"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTable(table.id);
                        }}
                        className="relative p-2 sm:p-1.5 min-h-[36px] min-w-[36px] sm:min-h-[28px] sm:min-w-[28px] flex items-center justify-center bg-surface border border-border text-rose-600 hover:bg-rose-50 rounded-full shadow-[var(--shadow-soft)] transition before:absolute before:-inset-1.5 before:content-[''] focus-visible:ring-2 focus-visible:ring-rose-500"
                        title="Supprimer la table"
                        aria-label="Supprimer la table"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {zonePricing && (
        <div className="p-4 rounded-[var(--radius-card)] border border-border bg-surface shadow-2xs space-y-3.5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-bold text-foreground">Tarification & Répartition des zones de billetterie</p>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Événement payant
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Répartissez vos tables par zones (VIP, Carré d’Or, Standard). Les billets vendus sur la plateforme appliquent automatiquement ces tarifs.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditingZonesList(pricingZones.length ? pricingZones : [createEmptyPricingZone(0), createEmptyPricingZone(1)]);
                  setShowZoneManagerModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] border border-border bg-surface hover:bg-surface-muted text-foreground text-xs font-semibold transition shadow-2xs"
                title="Gérer les catégories tarifaires et leurs prix"
              >
                <Settings2 className="w-3.5 h-3.5 text-muted" />
                Gérer les zones
              </button>
              <button
                type="button"
                disabled={tables.length === 0 || pricingZones.length === 0}
                onClick={() => setShowDistributeModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-button)] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 disabled:pointer-events-none"
                title="Répartir automatiquement les tables dans les zones"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Répartir les zones
              </button>
            </div>
          </div>

          {/* Jauge prévisionnelle de recettes et de capacité */}
          <div className="bg-surface-muted/60 border border-border rounded-xl p-3 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted">Recettes potentielles :</span>
                <span className="text-sm font-extrabold text-foreground tabular-nums">
                  {formatFc(ticketingSummary.totalRevenueFc)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted tabular-nums">
                <span>{ticketingSummary.totalSeats - ticketingSummary.unassigned.seatCount} / {ticketingSummary.totalSeats} places assignées</span>
                <span>·</span>
                <span>{tables.length} tables</span>
              </div>
            </div>

            {/* Segmented progress bar */}
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex border border-border">
              {ticketingSummary.byZone.map((stat) => (
                <div
                  key={stat.zone.id}
                  style={{ width: `${stat.percentageOfSeats}%`, backgroundColor: stat.zone.color || '#c4a35a' }}
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

          {/* Interactive zone cards with paint brush */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider mr-1">
              Pinceau rapide :
            </span>
            {ticketingSummary.byZone.map((stat) => {
              const isPaintActive = paintZoneId === stat.zone.id;
              return (
                <button
                  key={stat.zone.id}
                  type="button"
                  onClick={() => setPaintZoneId(isPaintActive ? null : stat.zone.id)}
                  className={cn(
                    'group inline-flex items-center gap-2 px-3 py-2 min-h-11 rounded-xl border text-xs transition-all shadow-2xs text-left',
                    isPaintActive
                      ? 'ring-2 ring-primary border-primary bg-primary/10 text-primary font-bold scale-[1.02]'
                      : 'border-border bg-surface text-foreground hover:bg-surface-muted'
                  )}
                  title={
                    isPaintActive
                      ? 'Pinceau actif : cliquez pour désactiver'
                      : `Cliquer pour activer le pinceau : assignez ensuite n'importe quelle table d'un clic sur le plan`
                  }
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs border border-black/10"
                    style={{ backgroundColor: stat.zone.color || '#c4a35a' }}
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">{stat.zone.name}</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {stat.zone.priceFc > 0 ? formatFc(stat.zone.priceFc) : '0 FC'}
                      </span>
                    </div>
                    <div className="text-xs text-muted tabular-nums">
                      {stat.tableCount} tbl · {stat.seatCount} pl. ({stat.percentageOfSeats}%)
                    </div>
                  </div>
                  {isPaintActive ? (
                    <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-black bg-primary text-white tracking-wide animate-pulse motion-reduce:animate-none">
                      Actif
                    </span>
                  ) : (
                    <Paintbrush className="w-3.5 h-3.5 text-muted opacity-40 group-hover:opacity-100 transition-opacity ml-1" />
                  )}
                </button>
              );
            })}

            {ticketingSummary.unassigned.tableCount > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-2 min-h-11 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <span className="font-semibold">{ticketingSummary.unassigned.tableCount} table{ticketingSummary.unassigned.tableCount > 1 ? 's' : ''} sans zone</span>
                  <p className="text-xs opacity-80">{ticketingSummary.unassigned.seatCount} places en attente</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDistributeModal(true)}
                  className="ml-1 px-3 py-1.5 min-h-[32px] rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-2xs"
                >
                  Répartir
                </button>
              </div>
            )}
          </div>

          {/* Active paint banner feedback */}
          {paintZoneId && (
            <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-medium animate-fade-in motion-reduce:animate-none">
              <div className="flex items-center gap-2">
                <Paintbrush className="w-4 h-4 animate-pulse motion-reduce:animate-none text-primary shrink-0" />
                <span>
                  Pinceau actif sur <strong className="font-bold underline">{pricingZones.find((z) => z.id === paintZoneId)?.name}</strong> : cliquez sur une table du plan pour lui assigner cette zone.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPaintZoneId(null)}
                className="px-3 py-1.5 min-h-[32px] rounded text-xs font-semibold bg-primary text-white hover:bg-primary-hover transition shrink-0"
              >
                Quitter (Échap)
              </button>
            </div>
          )}
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
            Plan de table
          </h2>
          <p className="text-muted text-sm mt-0.5">
            {plannerView === '3d'
              ? `3D ${previewQuality === 'showcase' ? 'showcase' : 'standard'} · orbitez pour inspecter la salle`
              : `${tables.length}/${caps.maxTables} tables · ${caps.label}${caps.canSnapGrid ? ' · grille' : ''}${caps.canRotate ? ' · rotation' : ''}. Placez les invités confirmés sur les sièges.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PlanViewToggle value={plannerView} onChange={setPlannerView} />
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
      <div className={cn('flex flex-col gap-3 xl:gap-6', isPanoramic ? 'w-full' : 'xl:grid xl:grid-cols-4')}>
        <div className={cn('order-1 flex flex-col space-y-3', isPanoramic ? 'w-full' : 'xl:order-2 xl:col-span-3')}>
          {/* Barre d'espace & dimensionnement du plan de salle */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-surface border border-border rounded-2xl shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted flex items-center gap-1.5 mr-0.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                Taille du plan :
              </span>
              <div className="inline-flex items-center gap-1 p-0.5 bg-surface-muted rounded-xl border border-border">
                {(['standard', 'comfort', 'expanded', 'screen'] as PlannerHeightPreset[]).map((pKey) => {
                  const cfg = HEIGHT_PRESET_CONFIG[pKey];
                  const isActive = heightPreset === pKey;
                  return (
                    <button
                      key={pKey}
                      type="button"
                      onClick={() => handleSetHeightPreset(pKey)}
                      className={cn(
                        'px-2.5 py-1 min-h-[32px] rounded-lg text-xs font-bold transition-all touch-manipulation',
                        isActive
                          ? 'bg-foreground text-background shadow-xs'
                          : 'text-muted hover:text-foreground hover:bg-surface'
                      )}
                      title={`Hauteur du plan : ${cfg.label} (${cfg.px}px)`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>

              {/* Mode Panoramique 100% largeur */}
              <button
                type="button"
                onClick={handleTogglePanoramic}
                className={cn(
                  'inline-flex min-h-[36px] items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-semibold transition touch-manipulation',
                  isPanoramic
                    ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/30 font-bold'
                    : 'border-border bg-surface text-muted hover:text-foreground hover:bg-surface-muted'
                )}
                title="Occuper toute la largeur de l'écran (100% largeur)"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Panoramique (100%)</span>
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="inline-flex min-h-[36px] items-center gap-1.5 px-3 py-1 bg-surface-muted border border-border rounded-xl text-xs font-semibold text-primary hover:bg-primary/10 transition"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Plein écran
              </button>
            </div>
          </div>

          {plannerView === '2d' ? (
            <div className="bg-surface border border-border rounded-[var(--radius-card)] px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs text-muted font-medium flex flex-wrap items-center gap-1.5 sm:gap-2 overflow-x-auto">
              <Move className="w-3.5 h-3.5 text-muted shrink-0" />
              <span className="flex-1 min-w-[10rem] hidden sm:inline">Glissez les tables · déverrouillez pour déplacer un import · cliquez un siège pour placer un invité</span>
              <span className="flex-1 sm:hidden">Glissez · touchez un siège</span>
              {tables.some((t) => Object.values(t.seats).some(Boolean)) ? (
                <button
                  type="button"
                  onClick={handleClearAssignments}
                  className="inline-flex items-center gap-1.5 px-3 py-2 min-h-11 sm:min-h-[36px] bg-surface-muted border border-border rounded-[var(--radius-button)] text-xs font-semibold text-foreground hover:bg-rose-500/10 hover:text-rose-600 transition"
                >
                  Libérer les sièges
                </button>
              ) : null}
              {caps.canSnapGrid || caps.canAlign ? (
                <button
                  type="button"
                  onClick={handleLayoutGrid}
                  disabled={tables.filter((t) => !t.locked).length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-2 min-h-11 sm:min-h-[36px] bg-surface-muted border border-border rounded-[var(--radius-button)] text-xs font-semibold text-foreground hover:bg-primary/10 transition disabled:opacity-50"
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
                  className="inline-flex items-center gap-1.5 px-3 py-2 min-h-11 sm:min-h-[36px] bg-surface-muted border border-border rounded-[var(--radius-button)] text-xs font-semibold text-foreground hover:bg-primary/10 transition disabled:opacity-50"
                >
                  Cercle
                </button>
              ) : null}
              {tables.some((t) => t.locked) && caps.canLock && (
                <button
                  type="button"
                  onClick={() => setTables(tables.map((t) => ({ ...t, locked: false })))}
                  className="inline-flex items-center gap-1.5 px-3 py-2 min-h-11 sm:min-h-[36px] bg-surface-muted border border-border rounded-[var(--radius-button)] text-xs font-semibold text-foreground hover:bg-primary/10 transition"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Tout déverrouiller
                </button>
              )}
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-[var(--radius-card)] px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs text-muted font-medium flex flex-wrap items-center gap-2">
              <Box className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Vue 3D interactive · orbitez, zoomez et sélectionnez ou peignez les zones de tables en 3D</span>
            </div>
          )}

          {!isExpanded && (plannerView === '3d' ? render3DPreview(currentHeightClass) : renderCanvas(currentHeightClass))}
        </div>

        <div className={cn(
          'order-2 bg-surface border border-border rounded-[var(--radius-card)] p-3 sm:p-4 flex flex-col shadow-sm transition-all',
          isPanoramic ? 'w-full mt-2' : 'xl:order-1 xl:col-span-1',
          !isPanoramic && (heightPreset === 'expanded' || heightPreset === 'screen' ? 'xl:h-[860px]' : heightPreset === 'comfort' ? 'xl:h-[720px]' : 'xl:h-[600px]')
        )}>
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
                        <span className="text-xs uppercase tracking-wider font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25 px-1.5 py-0.5 rounded shrink-0">Confirmé</span>
                      </div>
                      <div className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
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
            <div className="flex items-center gap-2 shrink-0">
              <PlanViewToggle value={plannerView} onChange={setPlannerView} />
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="inline-flex items-center gap-2 min-h-11 px-3 py-2 bg-surface border border-border text-foreground hover:bg-surface-muted font-medium rounded-[var(--radius-button)] text-sm transition"
              >
                <Minimize2 className="w-4 h-4" />
                Réduire
              </button>
            </div>
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

      {/* Modal: Répartition intelligente des zones de billetterie */}
      {showDistributeModal && (
        <Modal
          open={showDistributeModal}
          onClose={() => setShowDistributeModal(false)}
          title={
            <div className="flex items-center gap-2 text-base font-bold text-foreground">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Répartition intelligente des zones de billetterie</span>
            </div>
          }
          description="Répartissez automatiquement vos tables selon la configuration scénique, la proximité et vos quotas tarifaires."
          size="lg"
        >
          <div className="space-y-5">
            {/* Choix de la stratégie */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">
                Stratégie de répartition
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setDistributeStrategy('front_to_back')}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all space-y-1 shadow-2xs',
                    distributeStrategy === 'front_to_back'
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/40'
                      : 'border-border bg-surface hover:bg-surface-muted'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Scène & Devant</span>
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      Populaire
                    </span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    VIP en premier rang devant la scène / estrade, puis Carré d’Or et Standard vers le fond.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDistributeStrategy('concentric')}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all space-y-1 shadow-2xs',
                    distributeStrategy === 'concentric'
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/40'
                      : 'border-border bg-surface hover:bg-surface-muted'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Cercles concentriques</span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Tables d’honneur VIP au cœur de la salle, tables standard sur tout le pourtour.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDistributeStrategy('capacity_ratio')}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all space-y-1 shadow-2xs',
                    distributeStrategy === 'capacity_ratio'
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/40'
                      : 'border-border bg-surface hover:bg-surface-muted'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Quotas de capacité</span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Répartition proportionnelle équilibrée selon les pourcentages de jauges de places.
                  </p>
                </button>
              </div>
            </div>

            {/* Options complémentaires */}
            <div className="p-3 rounded-xl border border-border bg-surface-muted/50 space-y-2">
              <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={updateBoundsOnDistribute}
                  onChange={(e) => setUpdateBoundsOnDistribute(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30"
                />
                <span>Délimiter automatiquement les périmètres visuels des zones sur le plan (rectangles en pointillés)</span>
              </label>
            </div>

            {/* Aperçu du résultat spéculatif */}
            {distributionPreview && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">Aperçu de la répartition ({tables.length} tables)</span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    Recettes estimées : {formatFc(distributionPreview.summary.totalRevenueFc)}
                  </span>
                </div>

                <div className="border border-border rounded-xl overflow-hidden divide-y divide-border bg-surface">
                  {distributionPreview.summary.byZone.map((stat) => (
                    <div key={stat.zone.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: stat.zone.color || '#c4a35a' }}
                        />
                        <div>
                          <p className="font-semibold text-foreground">{stat.zone.name}</p>
                          <p className="text-xs text-muted">{stat.zone.priceFc > 0 ? formatFc(stat.zone.priceFc) : 'Gratuit'} / place</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground tabular-nums">
                          {stat.tableCount} table{stat.tableCount > 1 ? 's' : ''} · {stat.seatCount} place{stat.seatCount > 1 ? 's' : ''} ({stat.percentageOfSeats}%)
                        </p>
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatFc(stat.totalRevenueFc)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowDistributeModal(false)}
                className="px-4 py-2 rounded-[var(--radius-button)] border border-border text-muted hover:bg-surface-muted text-xs font-semibold transition"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!distributionPreview}
                onClick={() => {
                  if (distributionPreview) {
                    setTables(distributionPreview.tables);
                    if (updateBoundsOnDistribute) {
                      setPricingZones(distributionPreview.zones);
                    }
                    setShowDistributeModal(false);
                  }
                }}
                className="px-5 py-2 rounded-[var(--radius-button)] bg-primary hover:bg-primary-hover text-white text-xs font-bold transition shadow-xs flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Appliquer la répartition ({tables.length} tables)
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Gestion des zones tarifaires */}
      {showZoneManagerModal && (
        <Modal
          open={showZoneManagerModal}
          onClose={() => setShowZoneManagerModal(false)}
          title={
            <div className="flex items-center gap-2 text-base font-bold text-foreground">
              <Settings2 className="w-5 h-5 text-primary" />
              <span>Gestion des zones tarifaires de billetterie</span>
            </div>
          }
          description="Définissez les catégories de billets (VIP, Carré d’Or, Standard…) et leurs prix en Franc Congolais."
          size="lg"
        >
          <div className="space-y-5">
            {/* Modèles prédéfinis rapides */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">
                Modèles prédéfinis en 1 clic
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {TICKETING_ZONE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setEditingZonesList(
                        preset.zones.map((z, idx) => ({
                          id: `zone-${preset.id}-${idx}`,
                          name: z.name,
                          priceFc: z.priceFc,
                          color: z.color,
                        }))
                      );
                    }}
                    className="p-2.5 rounded-xl border border-border bg-surface hover:bg-surface-muted text-left transition space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{preset.label}</span>
                    </div>
                    <p className="text-xs text-muted truncate">{preset.description}</p>
                    <div className="flex gap-1 pt-1">
                      {preset.zones.map((z) => (
                        <span
                          key={z.name}
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: z.color }}
                          title={`${z.name} (${formatFc(z.priceFc)})`}
                        />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Liste des zones modifiables */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted">
                  Zones configurées ({editingZonesList.length})
                </label>
                <button
                  type="button"
                  onClick={() => setEditingZonesList((prev) => [...prev, createEmptyPricingZone(prev.length)])}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter une zone
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {editingZonesList.map((zone, idx) => (
                  <div
                    key={zone.id || idx}
                    className="grid grid-cols-[auto_1fr_1fr_auto] gap-2.5 items-center p-2.5 rounded-xl border border-border bg-surface"
                  >
                    <input
                      type="color"
                      value={zone.color || '#c4a35a'}
                      onChange={(e) =>
                        setEditingZonesList((prev) =>
                          prev.map((z, i) => (i === idx ? { ...z, color: e.target.value } : z))
                        )
                      }
                      className="w-9 h-9 rounded-lg border border-border cursor-pointer shrink-0"
                      aria-label={`Couleur de la zone ${zone.name}`}
                    />
                    <div>
                      <label className="text-xs font-semibold text-muted block mb-0.5">Nom de la zone</label>
                      <input
                        type="text"
                        value={zone.name}
                        onChange={(e) =>
                          setEditingZonesList((prev) =>
                            prev.map((z, i) => (i === idx ? { ...z, name: e.target.value } : z))
                          )
                        }
                        className="w-full px-3 py-1.5 text-xs bg-surface-muted border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                        placeholder="Ex: VIP Prestige"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted block mb-0.5">Tarif par place (FC)</label>
                      <input
                        type="number"
                        min={0}
                        value={zone.priceFc > 0 ? zone.priceFc : ''}
                        onChange={(e) =>
                          setEditingZonesList((prev) =>
                            prev.map((z, i) => (i === idx ? { ...z, priceFc: Number(e.target.value) || 0 } : z))
                          )
                        }
                        className="w-full px-3 py-1.5 text-xs bg-surface-muted border border-border rounded-lg text-foreground focus:outline-none focus:border-primary tabular-nums"
                        placeholder="Ex: 50000"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={editingZonesList.length <= 1}
                      onClick={() => setEditingZonesList((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-2 text-muted hover:text-rose-600 rounded-lg hover:bg-rose-50 transition disabled:opacity-30 disabled:pointer-events-none self-end mb-0.5"
                      title="Supprimer la zone"
                      aria-label={`Supprimer la zone ${zone.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowZoneManagerModal(false)}
                className="px-4 py-2 rounded-[var(--radius-button)] border border-border text-muted hover:bg-surface-muted text-xs font-semibold transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  const cleanZones = editingZonesList.filter((z) => z.name.trim());
                  setPricingZones(cleanZones);
                  setShowZoneManagerModal(false);
                }}
                className="px-5 py-2 rounded-[var(--radius-button)] bg-primary hover:bg-primary-hover text-white text-xs font-bold transition shadow-xs flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Enregistrer les zones
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
