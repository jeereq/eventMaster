'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Building2, Plus, Trash2, Loader2, Users, UserPlus, AlertCircle, CheckCircle2,
  ChevronLeft, ChevronRight, LayoutGrid, Theater, Tent, Presentation, Edit3,
} from 'lucide-react';
import RoomLayoutPreview from '@/components/RoomLayoutPreview';
import RoomLayoutEditor from '@/components/RoomLayoutEditor';
import {
  ChairType,
  LayoutParams,
  RoomLayoutBlueprint,
  RoomType,
  chairTypeLabels,
  generateRoomBlueprint,
  refreshBlueprintMetadata,
  roomTypeDescriptions,
  roomTypeLabels,
} from '@/lib/roomLayoutUtils';

interface RoomStaffItem {
  id: string;
  staffRole: 'MANAGER' | 'PROTOCOL';
  user: { id: string; name: string | null; email: string; orgRole: string | null };
}

interface RoomItem {
  id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  floor: string | null;
  location: string | null;
  roomType: RoomType;
  layoutBlueprint: RoomLayoutBlueprint | null;
  staff: RoomStaffItem[];
  _count?: { events: number };
}

interface TeamMemberOption {
  id: string;
  name: string | null;
  email: string;
  isOwner?: boolean;
}

const roleLabels: Record<string, string> = {
  MANAGER: 'Manager de salle',
  PROTOCOL: 'Protocole de salle',
};

const roomTypeIcons: Record<RoomType, React.ReactNode> = {
  SIMPLE: <Building2 className="w-6 h-6" />,
  BANQUET: <LayoutGrid className="w-6 h-6" />,
  CONFERENCE: <Presentation className="w-6 h-6" />,
  AMPHITHEATER: <Theater className="w-6 h-6" />,
  TENT: <Tent className="w-6 h-6" />,
  CUSTOM: <Building2 className="w-6 h-6" />,
};

const selectableRoomTypes: RoomType[] = ['SIMPLE', 'BANQUET', 'CONFERENCE', 'AMPHITHEATER', 'TENT'];

const defaultParams: Record<RoomType, LayoutParams> = {
  SIMPLE: {},
  BANQUET: { tableCount: 8, tableShape: 'round', seatsPerTable: 8, chairType: 'BANQUET' },
  CONFERENCE: { rowCount: 6, seatsPerRow: 10, chairType: 'THEATER' },
  AMPHITHEATER: { tierCount: 3, rowsPerTier: 2, seatsPerRow: 12, chairType: 'THEATER' },
  TENT: { tentWidthM: 15, tentLengthM: 20, tableCount: 6, seatsPerTable: 8, chairType: 'BANQUET' },
  CUSTOM: {},
};

export default function RoomsManagement() {
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [floor, setFloor] = useState('');
  const [location, setLocation] = useState('');
  const [roomType, setRoomType] = useState<RoomType>('BANQUET');
  const [layoutParams, setLayoutParams] = useState<LayoutParams>(defaultParams.BANQUET);
  const [blueprintDraft, setBlueprintDraft] = useState<RoomLayoutBlueprint | null>(null);
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null);
  const [editBlueprint, setEditBlueprint] = useState<RoomLayoutBlueprint | null>(null);
  const [savingLayout, setSavingLayout] = useState(false);

  const [assignRoomId, setAssignRoomId] = useState<string | null>(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState<'MANAGER' | 'PROTOCOL'>('PROTOCOL');

  const regenerateBlueprint = () => {
    const bp =
      roomType === 'SIMPLE'
        ? generateRoomBlueprint('SIMPLE')
        : generateRoomBlueprint(roomType, layoutParams);
    setBlueprintDraft(refreshBlueprintMetadata(bp));
  };

  const resetWizard = () => {
    setWizardStep(1);
    setName('');
    setDescription('');
    setFloor('');
    setLocation('');
    setRoomType('BANQUET');
    setLayoutParams(defaultParams.BANQUET);
    setBlueprintDraft(null);
  };

  const goToStep = (step: number) => {
    if (step === 3 && !blueprintDraft) {
      regenerateBlueprint();
    }
    setWizardStep(step);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [roomsData, teamData] = await Promise.all([
        api.get('/rooms'),
        api.get('/team'),
      ]);
      setRooms(roomsData.rooms || []);
      setCanManage(Boolean(roomsData.canManage));
      setTeamMembers((teamData.members || []).filter((m: TeamMemberOption) => !m.isOwner));
    } catch (err: any) {
      setError(err.message || 'Impossible de charger les salles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateParam = <K extends keyof LayoutParams>(key: K, value: LayoutParams[K]) => {
    setLayoutParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreate = async () => {
    setError('');
    setSaving(true);
    try {
      await api.post('/rooms', {
        name,
        description: description || undefined,
        floor: floor || undefined,
        location: location || undefined,
        roomType,
        layoutBlueprint: blueprintDraft ?? undefined,
      });
      setSuccess('Salle créée avec son plan.');
      setShowWizard(false);
      resetWizard();
      await load();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (room: RoomItem) => {
    if (!confirm(`Supprimer la salle « ${room.name} » ?`)) return;
    try {
      await api.delete(`/rooms/${room.id}`);
      setSuccess('Salle supprimée.');
      await load();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression.');
    }
  };

  const handleSaveRoomLayout = async () => {
    if (!editingRoom || !editBlueprint) return;
    setSavingLayout(true);
    setError('');
    try {
      await api.put(`/rooms/${editingRoom.id}`, {
        layoutBlueprint: editBlueprint,
        roomType: editBlueprint.roomType,
      });
      setSuccess('Plan de salle enregistré.');
      setEditingRoom(null);
      setEditBlueprint(null);
      await load();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde du plan.');
    } finally {
      setSavingLayout(false);
    }
  };

  const openEditLayout = (room: RoomItem) => {
    const bp = room.layoutBlueprint as RoomLayoutBlueprint | null;
    setEditingRoom(room);
    setEditBlueprint(
      bp
        ? refreshBlueprintMetadata({ ...bp })
        : refreshBlueprintMetadata(generateRoomBlueprint(room.roomType || 'SIMPLE')),
    );
  };

  const handleAssignStaff = async (roomId: string) => {
    if (!assignUserId) return;
    try {
      await api.post(`/rooms/${roomId}/staff`, {
        userId: assignUserId,
        staffRole: assignRole,
      });
      setSuccess('Staff assigné à la salle.');
      setAssignRoomId(null);
      setAssignUserId('');
      await load();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'assignation.');
    }
  };

  const handleRemoveStaff = async (roomId: string, userId: string) => {
    try {
      await api.delete(`/rooms/${roomId}/staff/${userId}`);
      setSuccess('Staff retiré.');
      await load();
    } catch (err: any) {
      setError(err.message || 'Erreur.');
    }
  };

  const renderTypeParams = () => {
    switch (roomType) {
      case 'BANQUET':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1 text-xs">
              <span className="font-bold text-slate-500 uppercase">Nombre de tables</span>
              <input type="number" min={1} max={80} value={layoutParams.tableCount ?? 8} onChange={(e) => updateParam('tableCount', parseInt(e.target.value, 10))} className="w-full px-3 py-2 rounded-xl border text-sm" />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-bold text-slate-500 uppercase">Places / table</span>
              <input type="number" min={2} max={20} value={layoutParams.seatsPerTable ?? 8} onChange={(e) => updateParam('seatsPerTable', parseInt(e.target.value, 10))} className="w-full px-3 py-2 rounded-xl border text-sm" />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-bold text-slate-500 uppercase">Forme des tables</span>
              <select value={layoutParams.tableShape ?? 'round'} onChange={(e) => updateParam('tableShape', e.target.value as LayoutParams['tableShape'])} className="w-full px-3 py-2 rounded-xl border text-sm">
                <option value="round">Ronde</option>
                <option value="rectangular">Rectangulaire</option>
                <option value="square">Carrée</option>
                <option value="oval">Ovale</option>
              </select>
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-bold text-slate-500 uppercase">Type de chaise</span>
              <select value={layoutParams.chairType ?? 'BANQUET'} onChange={(e) => updateParam('chairType', e.target.value as ChairType)} className="w-full px-3 py-2 rounded-xl border text-sm">
                {Object.entries(chairTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
          </div>
        );
      case 'CONFERENCE':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1 text-xs">
              <span className="font-bold text-slate-500 uppercase">Nombre de rangées</span>
              <input type="number" min={1} max={30} value={layoutParams.rowCount ?? 6} onChange={(e) => updateParam('rowCount', parseInt(e.target.value, 10))} className="w-full px-3 py-2 rounded-xl border text-sm" />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-bold text-slate-500 uppercase">Places / rangée</span>
              <input type="number" min={2} max={40} value={layoutParams.seatsPerRow ?? 10} onChange={(e) => updateParam('seatsPerRow', parseInt(e.target.value, 10))} className="w-full px-3 py-2 rounded-xl border text-sm" />
            </label>
            <label className="space-y-1 text-xs sm:col-span-2">
              <span className="font-bold text-slate-500 uppercase">Type de siège</span>
              <select value={layoutParams.chairType ?? 'THEATER'} onChange={(e) => updateParam('chairType', e.target.value as ChairType)} className="w-full px-3 py-2 rounded-xl border text-sm">
                {Object.entries(chairTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
          </div>
        );
      case 'AMPHITHEATER':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1 text-xs">
              <span className="font-bold text-slate-500 uppercase">Gradins</span>
              <input type="number" min={1} max={10} value={layoutParams.tierCount ?? 3} onChange={(e) => updateParam('tierCount', parseInt(e.target.value, 10))} className="w-full px-3 py-2 rounded-xl border text-sm" />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-bold text-slate-500 uppercase">Rangées / gradin</span>
              <input type="number" min={1} max={10} value={layoutParams.rowsPerTier ?? 2} onChange={(e) => updateParam('rowsPerTier', parseInt(e.target.value, 10))} className="w-full px-3 py-2 rounded-xl border text-sm" />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-bold text-slate-500 uppercase">Places / rangée</span>
              <input type="number" min={2} max={40} value={layoutParams.seatsPerRow ?? 12} onChange={(e) => updateParam('seatsPerRow', parseInt(e.target.value, 10))} className="w-full px-3 py-2 rounded-xl border text-sm" />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-bold text-slate-500 uppercase">Type de siège</span>
              <select value={layoutParams.chairType ?? 'THEATER'} onChange={(e) => updateParam('chairType', e.target.value as ChairType)} className="w-full px-3 py-2 rounded-xl border text-sm">
                {Object.entries(chairTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
          </div>
        );
      case 'TENT':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="space-y-1 text-xs">
              <span className="font-bold text-slate-500 uppercase">Largeur (m)</span>
              <input type="number" min={5} value={layoutParams.tentWidthM ?? 15} onChange={(e) => updateParam('tentWidthM', parseInt(e.target.value, 10))} className="w-full px-3 py-2 rounded-xl border text-sm" />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-bold text-slate-500 uppercase">Longueur (m)</span>
              <input type="number" min={5} value={layoutParams.tentLengthM ?? 20} onChange={(e) => updateParam('tentLengthM', parseInt(e.target.value, 10))} className="w-full px-3 py-2 rounded-xl border text-sm" />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-bold text-slate-500 uppercase">Tables intérieures</span>
              <input type="number" min={0} max={40} value={layoutParams.tableCount ?? 0} onChange={(e) => updateParam('tableCount', parseInt(e.target.value, 10))} className="w-full px-3 py-2 rounded-xl border text-sm" />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-bold text-slate-500 uppercase">Places / table</span>
              <input type="number" min={2} max={20} value={layoutParams.seatsPerTable ?? 8} onChange={(e) => updateParam('seatsPerTable', parseInt(e.target.value, 10))} className="w-full px-3 py-2 rounded-xl border text-sm" />
            </label>
          </div>
        );
      default:
        return <p className="text-sm text-slate-500">Aucune configuration requise pour une salle simple.</p>;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Salles de l&apos;organisation
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Définissez le type de salle, générez un plan 2D et assignez le staff.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => { resetWizard(); setShowWizard(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition"
          >
            <Plus className="w-4 h-4" />
            Nouvelle salle
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4" /> {success}
        </div>
      )}

      {showWizard && canManage && (
        <div className="bg-slate-50 dark:bg-slate-950 border rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Étape {wizardStep} / 3</p>
            <button type="button" onClick={() => { setShowWizard(false); resetWizard(); }} className="text-xs text-slate-500 hover:text-slate-700">Fermer</button>
          </div>

          {wizardStep === 1 && (
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white">Informations générales</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input required placeholder="Nom de la salle *" value={name} onChange={(e) => setName(e.target.value)} className="px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-900" />
                <input placeholder="Étage / Aile" value={floor} onChange={(e) => setFloor(e.target.value)} className="px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-900" />
                <input placeholder="Emplacement" value={location} onChange={(e) => setLocation(e.target.value)} className="px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-900 sm:col-span-2" />
              </div>
              <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-900" />
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white">Type de salle</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectableRoomTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setRoomType(type);
                      setLayoutParams(defaultParams[type]);
                    }}
                    className={`text-left p-4 rounded-2xl border-2 transition ${roomType === type ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30' : 'border-slate-200 hover:border-indigo-200 bg-white dark:bg-slate-900'}`}
                  >
                    <div className={`mb-2 ${roomType === type ? 'text-indigo-600' : 'text-slate-500'}`}>{roomTypeIcons[type]}</div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{roomTypeLabels[type]}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{roomTypeDescriptions[type]}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {wizardStep === 3 && blueprintDraft && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-3 lg:col-span-1">
                  <h3 className="font-bold text-slate-900 dark:text-white">Paramètres — {roomTypeLabels[roomType]}</h3>
                  {roomType !== 'SIMPLE' && renderTypeParams()}
                  <p className="text-xs text-emerald-700 font-semibold">
                    Capacité : {blueprintDraft.metadata.totalSeats} places
                  </p>
                </div>
              </div>
              <RoomLayoutEditor
                blueprint={blueprintDraft}
                onChange={setBlueprintDraft}
                onRegenerate={roomType !== 'SIMPLE' ? regenerateBlueprint : undefined}
              />
            </div>
          )}

          <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              disabled={wizardStep === 1}
              onClick={() => goToStep(wizardStep - 1)}
              className="inline-flex items-center gap-1 px-4 py-2 border rounded-xl text-xs font-bold disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" /> Précédent
            </button>
            {wizardStep < 3 ? (
              <button
                type="button"
                disabled={wizardStep === 1 && !name.trim()}
                onClick={() => goToStep(wizardStep + 1)}
                className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold disabled:opacity-40"
              >
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={saving || !name.trim()}
                onClick={handleCreate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold disabled:opacity-40"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Créer la salle
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
      ) : rooms.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">Aucune salle configurée.</p>
      ) : (
        <div className="space-y-4">
          {rooms.map((room) => (
            <div key={room.id} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 dark:text-white">{room.name}</h3>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                      {roomTypeLabels[room.roomType || 'SIMPLE']}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {[room.floor, room.location, room.capacity ? `${room.capacity} places` : null].filter(Boolean).join(' · ') || 'Sans détails'}
                  </p>
                  {room.description && <p className="text-xs text-slate-600 mt-2">{room.description}</p>}
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button type="button" onClick={() => openEditLayout(room)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl" title="Modifier le plan 2D">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => handleDelete(room)} className="p-2 text-slate-400 hover:text-rose-600 rounded-xl">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {room.layoutBlueprint && (
                <RoomLayoutPreview blueprint={room.layoutBlueprint as RoomLayoutBlueprint} />
              )}

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Staff de la salle
                </p>
                {room.staff.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Aucun staff assigné.</p>
                ) : (
                  room.staff.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{s.user.name || s.user.email}</span>
                        <span className="ml-2 text-[10px] font-bold uppercase text-indigo-600">{roleLabels[s.staffRole]}</span>
                      </div>
                      {canManage && (
                        <button type="button" onClick={() => handleRemoveStaff(room.id, s.user.id)} className="text-rose-500 hover:text-rose-700">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {canManage && (
                assignRoomId === room.id ? (
                  <div className="flex flex-wrap gap-2 items-end pt-2 border-t border-slate-100 dark:border-slate-800">
                    <select value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} className="flex-1 min-w-[140px] px-3 py-2 rounded-xl border text-xs">
                      <option value="">Choisir un utilisateur</option>
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.id}>{m.name || m.email}</option>
                      ))}
                    </select>
                    <select value={assignRole} onChange={(e) => setAssignRole(e.target.value as 'MANAGER' | 'PROTOCOL')} className="px-3 py-2 rounded-xl border text-xs">
                      <option value="MANAGER">Manager</option>
                      <option value="PROTOCOL">Protocole</option>
                    </select>
                    <button type="button" onClick={() => handleAssignStaff(room.id)} className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">Assigner</button>
                    <button type="button" onClick={() => setAssignRoomId(null)} className="px-3 py-2 border rounded-xl text-xs">Annuler</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setAssignRoomId(room.id)} className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600">
                    <UserPlus className="w-3.5 h-3.5" /> Assigner un staff
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {editingRoom && editBlueprint && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Plan 2D — {editingRoom.name}</h3>
                <p className="text-xs text-slate-500 mt-1">Modifiez la disposition, les chaises et les éléments fixes.</p>
              </div>
              <button type="button" onClick={() => { setEditingRoom(null); setEditBlueprint(null); }} className="text-slate-400 hover:text-slate-600 text-sm font-bold">Fermer</button>
            </div>
            <RoomLayoutEditor
              blueprint={editBlueprint}
              onChange={setEditBlueprint}
              onRegenerate={() => {
                setEditBlueprint(refreshBlueprintMetadata(generateRoomBlueprint(editBlueprint.roomType)));
              }}
            />
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={() => { setEditingRoom(null); setEditBlueprint(null); }} className="px-4 py-2 border rounded-xl text-xs font-bold">Annuler</button>
              <button type="button" disabled={savingLayout} onClick={handleSaveRoomLayout} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold disabled:opacity-50">
                {savingLayout ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Enregistrer le plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
