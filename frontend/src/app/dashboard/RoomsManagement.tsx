'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  Building2, Plus, Trash2, Loader2, Users, UserPlus, AlertCircle, CheckCircle2, Shield, Briefcase,
} from 'lucide-react';

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

export default function RoomsManagement() {
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('');
  const [floor, setFloor] = useState('');
  const [location, setLocation] = useState('');
  const [assignRoomId, setAssignRoomId] = useState<string | null>(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState<'MANAGER' | 'PROTOCOL'>('PROTOCOL');

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/rooms', {
        name,
        description: description || undefined,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        floor: floor || undefined,
        location: location || undefined,
      });
      setSuccess('Salle créée.');
      setShowForm(false);
      setName('');
      setDescription('');
      setCapacity('');
      setFloor('');
      setLocation('');
      await load();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création.');
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

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Salles de l&apos;organisation
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Créez des salles et assignez des managers ou agents protocole par salle.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
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

      {showForm && canManage && (
        <form onSubmit={handleCreate} className="bg-slate-50 dark:bg-slate-950 border rounded-2xl p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input required placeholder="Nom de la salle *" value={name} onChange={(e) => setName(e.target.value)} className="px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-900" />
            <input type="number" min={1} placeholder="Capacité" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-900" />
            <input placeholder="Étage / Aile" value={floor} onChange={(e) => setFloor(e.target.value)} className="px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-900" />
            <input placeholder="Emplacement" value={location} onChange={(e) => setLocation(e.target.value)} className="px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-900" />
          </div>
          <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-slate-900" />
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">Créer la salle</button>
        </form>
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
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{room.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {[room.floor, room.location, room.capacity ? `${room.capacity} places` : null].filter(Boolean).join(' · ') || 'Sans détails'}
                  </p>
                  {room.description && <p className="text-xs text-slate-600 mt-2">{room.description}</p>}
                </div>
                {canManage && (
                  <button type="button" onClick={() => handleDelete(room)} className="p-2 text-slate-400 hover:text-rose-600 rounded-xl">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

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
    </div>
  );
}
