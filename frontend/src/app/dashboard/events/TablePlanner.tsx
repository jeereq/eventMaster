'use client';

import React, { useState, useRef } from 'react';
import { 
  Plus, Trash2, Users, Check, Move, X, RefreshCw, 
  HelpCircle, Edit2, LayoutGrid, Maximize2, Minimize2
} from 'lucide-react';
import {
  getOccupiedSeatCount,
  getSeatCoordinates,
  getTableShapeDescription,
  getTableShapeEmoji,
  getTableShapeLabel,
  getTableVisualClasses,
  TableShape,
} from '@/lib/tablePlanUtils';

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
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  seats: Record<number, string | null>; // seatIndex -> guestId or null
}

interface TablePlannerProps {
  guests: GuestItem[];
  initialTablePlan: { tables?: Table[] } | null | undefined;
  onSave: (newTablePlan: { tables: Table[] }) => Promise<void>;
}

export default function TablePlanner({ guests, initialTablePlan, onSave }: TablePlannerProps) {
  const [tables, setTables] = useState<Table[]>(() => {
    if (initialTablePlan && Array.isArray(initialTablePlan.tables)) {
      return initialTablePlan.tables;
    }
    return [];
  });
  const [saving, setSaving] = useState(false);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [selectedSeat, setSelectedGuestSeat] = useState<{ tableId: string; seatIndex: number } | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableShape, setNewTableShape] = useState<TableShape>('round');
  const [newTableCapacity, setNewTableCapacity] = useState<number>(8);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredTableId, setHoveredTableId] = useState<string | null>(null);

  // Dragging states
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Filter guests who accepted the invitation
  const acceptedGuests = guests.filter(g => g.rsvp === 'ACCEPTED');

  // Get list of assigned guest IDs
  const assignedGuestIds = new Set<string>();
  tables.forEach(table => {
    Object.values(table.seats).forEach(guestId => {
      if (guestId) assignedGuestIds.add(guestId);
    });
  });

  // Unassigned accepted guests
  const unassignedGuests = acceptedGuests.filter(g => !assignedGuestIds.has(g.id));

  // Add a new table
  const handleAddTable = () => {
    if (!newTableName.trim()) return;

    const seatsObj: Record<number, string | null> = {};
    for (let i = 0; i < newTableCapacity; i++) {
      seatsObj[i] = null;
    }

    const newTable: Table = {
      id: 'table_' + Math.random().toString(36).substr(2, 9),
      name: newTableName,
      shape: newTableShape,
      capacity: newTableCapacity,
      x: 30 + Math.random() * 40, // center-ish
      y: 30 + Math.random() * 40,
      seats: seatsObj
    };

    const updatedTables = [...tables, newTable];
    setTables(updatedTables);
    setShowAddModal(false);
    setNewTableName('');
    setNewTableCapacity(8);
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
          seats: updatedSeats
        };
      }
      return t;
    }));
    setEditingTable(null);
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

  // Dragging logic
  const handleMouseDown = (tableId: string, e: React.MouseEvent) => {
    if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLSelectElement) return;
    e.preventDefault();
    setDraggingTableId(tableId);

    const table = tables.find(t => t.id === tableId);
    if (table && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      const currentXPixels = (table.x / 100) * rect.width;
      const currentYPixels = (table.y / 100) * rect.height;

      setDragOffset({
        x: clickX - currentXPixels,
        y: clickY - currentYPixels
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingTableId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let newXPixels = mouseX - dragOffset.x;
    let newYPixels = mouseY - dragOffset.y;

    // Constrain within canvas bounds
    newXPixels = Math.max(40, Math.min(rect.width - 40, newXPixels));
    newYPixels = Math.max(40, Math.min(rect.height - 40, newYPixels));

    const newXPercent = (newXPixels / rect.width) * 100;
    const newYPercent = (newYPixels / rect.height) * 100;

    setTables(tables.map(t => {
      if (t.id === draggingTableId) {
        return { ...t, x: newXPercent, y: newYPercent };
      }
      return t;
    }));
  };

  const handleMouseUp = () => {
    setDraggingTableId(null);
  };

  // Save plan to backend
  const handleSavePlan = async () => {
    setSaving(true);
    try {
      await onSave({ tables });
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

  const renderCanvas = (heightClass: string) => (
    <div 
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`relative w-full ${heightClass} bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden shadow-inner bg-grid-slate-200 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0.95))]`}
    >
      {tables.length === 0 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 space-y-3">
          <LayoutGrid className="w-12 h-12 text-slate-300" />
          <div className="text-center">
            <p className="font-bold text-slate-800">Aucune table dans votre plan</p>
            <p className="text-xs text-slate-500 mt-1">Cliquez sur &quot;Ajouter une Table&quot; pour commencer à organiser votre salle.</p>
          </div>
        </div>
      ) : (
        tables.map(table => {
          const isActive = activeTableId === table.id;
          const isHovered = hoveredTableId === table.id;
          const assignedGuests = getTableAssignedGuests(table);
          const occupiedCount = getOccupiedSeatCount(table);

          return (
            <div
              key={table.id}
              onMouseDown={(e) => handleMouseDown(table.id, e)}
              onClick={() => setActiveTableId(table.id)}
              onMouseEnter={() => setHoveredTableId(table.id)}
              onMouseLeave={() => setHoveredTableId(null)}
              style={{ 
                left: `${table.x}%`, 
                top: `${table.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              className={`absolute cursor-move select-none transition-shadow p-4 rounded-full ${isActive ? 'ring-2 ring-indigo-600 ring-offset-2 shadow-lg z-20' : isHovered ? 'z-10' : 'hover:shadow-md'}`}
            >
              {isHovered && !draggingTableId && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 z-50 pointer-events-none">
                  <div className="bg-slate-900 text-white rounded-xl p-3.5 shadow-2xl border border-slate-700 space-y-2 text-left">
                    <p className="font-bold text-sm leading-tight">{table.name}</p>
                    <p className="text-[11px] text-indigo-300 font-semibold">
                      {getTableShapeEmoji(table.shape)} Table {getTableShapeLabel(table.shape)}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      {getTableShapeDescription(table.shape)}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {occupiedCount}/{table.capacity} places occupées
                    </p>
                    {assignedGuests.length > 0 ? (
                      <div className="pt-1 border-t border-slate-800 space-y-1">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Invités placés</p>
                        {assignedGuests.slice(0, 6).map(({ seatIndex, name }) => (
                          <p key={seatIndex} className="text-[10px] text-slate-300 truncate">
                            Siège {seatIndex + 1} · {name}
                          </p>
                        ))}
                        {assignedGuests.length > 6 && (
                          <p className="text-[10px] text-slate-500">+{assignedGuests.length - 6} autres</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic">Aucun invité placé</p>
                    )}
                  </div>
                </div>
              )}

              <div className={`relative flex items-center justify-center font-bold text-xs text-center shadow-md ${getTableVisualClasses(table.shape, isActive)}`}>
                <div className="px-2">
                  <div className="truncate max-w-[90px] font-black text-[11px]">{table.name}</div>
                  <div className="text-[9px] opacity-85 mt-0.5">
                    {occupiedCount}/{table.capacity} · {getTableShapeLabel(table.shape)}
                  </div>
                </div>

                {isActive && (
                  <div className="absolute -top-3 -right-3 flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditTable(table);
                      }}
                      className="p-1 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 rounded-full shadow-sm"
                      title="Modifier la table"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTable(table.id);
                      }}
                      className="p-1 bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 rounded-full shadow-sm"
                      title="Supprimer la table"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {Array.from({ length: table.capacity }).map((_, index) => {
                  const coords = getSeatCoordinates(table.shape, table.capacity, index);
                  const assignedGuestId = table.seats[index];
                  const guest = guests.find(g => g.id === assignedGuestId);
                  
                  return (
                    <div
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGuestSeat({ tableId: table.id, seatIndex: index });
                      }}
                      style={{
                        left: `calc(50% + ${coords.x}px)`,
                        top: `calc(50% + ${coords.y}px)`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      className={`absolute w-7 h-7 rounded-full border flex items-center justify-center text-[9px] font-bold cursor-pointer transition shadow-sm ${guest ? 'bg-emerald-500 border-emerald-600 text-white hover:bg-emerald-600' : 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-600'}`}
                      title={guest ? `${guest.firstName} ${guest.lastName}` : `Siège ${index + 1} (Libre)`}
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
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-indigo-600" />
            Plan de Table Interactif
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Créez des tables, positionnez-les visuellement et placez vos invités confirmés.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-indigo-100"
          >
            <Plus className="w-4 h-4" />
            Ajouter une Table
          </button>
          <button
            onClick={handleSavePlan}
            disabled={saving}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-emerald-100"
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

      {/* Grid Layout for Planner */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Sidebar: Unassigned Guests */}
        <div className="xl:col-span-1 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col h-[600px]">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              Invités non placés ({unassignedGuests.length})
            </h3>
            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
              {acceptedGuests.length} Présents
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pt-4 space-y-2.5">
            {unassignedGuests.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <HelpCircle className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">Tous les invités présents ont été placés !</p>
              </div>
            ) : (
              unassignedGuests.map(g => (
                <div 
                  key={g.id}
                  className="p-3 bg-slate-50 border border-slate-150 rounded-2xl flex items-center justify-between text-xs hover:border-indigo-300 hover:bg-indigo-50/10 transition"
                >
                  <div>
                    <div className="font-bold text-slate-900">{g.firstName} {g.lastName}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{g.category || 'Général'}</div>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-2 py-0.5 rounded-full">
                    Confirmé
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Visual Canvas Area */}
        <div className="xl:col-span-3 flex flex-col space-y-4">
          <div className="bg-slate-100/80 border border-slate-200 rounded-3xl p-2 text-center text-xs text-slate-500 font-medium flex flex-wrap items-center justify-center gap-2">
            <Move className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Glissez-déposez les tables pour organiser la salle. Survolez une table pour voir ses détails.</span>
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 transition ml-auto"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Agrandir la zone
            </button>
          </div>

          {!isExpanded && renderCanvas('h-[520px]')}
        </div>
      </div>

      {/* Expanded fullscreen canvas */}
      {isExpanded && (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex flex-col p-4 md:p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-indigo-400" />
                Plan de table — vue agrandie
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Survolez une table pour afficher son type, sa capacité et les invités placés.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-sm transition border border-white/10"
            >
              <Minimize2 className="w-4 h-4" />
              Réduire
            </button>
          </div>
          <div className="flex-1 min-h-0">
            {renderCanvas('h-full min-h-[60vh]')}
          </div>
        </div>
      )}

      {/* Seat Assignment Dropdown Modal/Popover */}
      {selectedSeat && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-up">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">
                Placer un invité - Siège {selectedSeat.seatIndex + 1}
              </h3>
              <button 
                onClick={() => setSelectedGuestSeat(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If seat is already occupied, allow freeing it */}
            {tables.find(t => t.id === selectedSeat.tableId)?.seats[selectedSeat.seatIndex] && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs text-emerald-800 font-bold">Siège actuellement occupé par :</div>
                  <div className="font-extrabold text-slate-900 text-sm mt-1">
                    {(() => {
                      const guestId = tables.find(t => t.id === selectedSeat.tableId)?.seats[selectedSeat.seatIndex];
                      const g = guests.find(guest => guest.id === guestId);
                      return g ? `${g.firstName} ${g.lastName}` : 'Inconnu';
                    })()}
                  </div>
                </div>
                <button
                  onClick={() => handleAssignGuest(selectedSeat.tableId, selectedSeat.seatIndex, null)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition"
                >
                  Libérer le siège
                </button>
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Sélectionner un invité présent ({unassignedGuests.length} disponibles)
              </label>
              {unassignedGuests.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Aucun invité présent n'est disponible pour le placement.</p>
              ) : (
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
                  {unassignedGuests.map(g => (
                    <button
                      key={g.id}
                      onClick={() => handleAssignGuest(selectedSeat.tableId, selectedSeat.seatIndex, g.id)}
                      className="w-full text-left p-3 hover:bg-indigo-50/50 transition flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{g.firstName} {g.lastName}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">{g.category || 'Général'}</span>
                      </div>
                      <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                        Installer
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Table Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-scale-up">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Ajouter une nouvelle table
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nom de la table</label>
                <input
                  type="text"
                  placeholder="Ex: Table d'honneur, Table 1..."
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Forme</label>
                  <select
                    value={newTableShape}
                    onChange={(e) => setNewTableShape(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  >
                    <option value="round">Ronde 🟡</option>
                    <option value="rectangular">Rectangulaire ⬜</option>
                    <option value="square">Carrée 🔲</option>
                    <option value="oval">Ovale 🥚</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nombre de places</label>
                  <input
                    type="number"
                    min={2}
                    max={16}
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(parseInt(e.target.value) || 8)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-sm transition"
              >
                Annuler
              </button>
              <button
                onClick={handleAddTable}
                disabled={!newTableName.trim()}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-sm transition shadow-md shadow-indigo-100"
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
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-scale-up">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">
                Modifier la table : {editingTable.name}
              </h3>
              <button 
                onClick={() => setEditingTable(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nom de la table</label>
                <input
                  type="text"
                  value={editingTable.name}
                  onChange={(e) => setEditingTable({ ...editingTable, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Forme</label>
                  <select
                    value={editingTable.shape}
                    onChange={(e) => setEditingTable({ ...editingTable, shape: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  >
                    <option value="round">Ronde 🟡</option>
                    <option value="rectangular">Rectangulaire ⬜</option>
                    <option value="square">Carrée 🔲</option>
                    <option value="oval">Ovale 🥚</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nombre de places</label>
                  <input
                    type="number"
                    min={2}
                    max={16}
                    value={editingTable.capacity}
                    onChange={(e) => setEditingTable({ ...editingTable, capacity: parseInt(e.target.value) || 8 })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditingTable(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-sm transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEditTable}
                disabled={!editingTable.name.trim()}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-sm transition shadow-md shadow-indigo-100"
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
