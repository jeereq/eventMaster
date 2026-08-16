'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Users, UserPlus, Trash2, Loader2, Shield, Briefcase } from 'lucide-react';

interface StaffItem {
 id: string;
 staffRole: 'MANAGER' | 'PROTOCOL';
 user: { id: string; name: string | null; email: string; orgRole: string | null };
}

interface TeamMemberOption {
 id: string;
 name: string | null;
 email: string;
 isOwner?: boolean;
}

const roleLabels: Record<string, string> = {
 MANAGER: 'Manager événement',
 PROTOCOL: 'Protocole événement',
};

export default function EventStaffPanel({ eventId }: { eventId: string }) {
 const [staff, setStaff] = useState<StaffItem[]>([]);
 const [canManage, setCanManage] = useState(false);
 const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
 const [loading, setLoading] = useState(true);
 const [userId, setUserId] = useState('');
 const [staffRole, setStaffRole] = useState<'MANAGER' | 'PROTOCOL'>('PROTOCOL');
 const [error, setError] = useState('');

 const load = async () => {
 setLoading(true);
 try {
 const [staffData, teamData] = await Promise.all([
 api.get(`/events/${eventId}/staff`),
 api.get('/team'),
 ]);
 setStaff(staffData.staff || []);
 setCanManage(Boolean(staffData.canManage));
 setTeamMembers((teamData.members || []).filter((m: TeamMemberOption) => !m.isOwner));
 } catch (err: any) {
 setError(err.message || 'Impossible de charger l\'équipe.');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 if (eventId) load();
 }, [eventId]);

 const handleAssign = async () => {
 if (!userId) return;
 try {
 await api.post(`/events/${eventId}/staff`, { userId, staffRole });
 setUserId('');
 await load();
 } catch (err: any) {
 setError(err.message || 'Erreur lors de l\'assignation.');
 }
 };

 const handleRemove = async (targetUserId: string) => {
 try {
 await api.delete(`/events/${eventId}/staff/${targetUserId}`);
 await load();
 } catch (err: any) {
 setError(err.message || 'Erreur.');
 }
 };

 if (loading) {
 return (
 <div className="py-12 flex justify-center">
 <Loader2 className="w-6 h-6 text-primary animate-spin" />
 </div>
 );
 }

 return (
 <div className="space-y-6 animate-fade-in">
 <div>
 <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
 <Users className="w-5 h-5 text-primary" />
 Équipe de l&apos;événement
 </h2>
 <p className="text-sm text-muted mt-1">
 Assignez des managers ou agents protocole spécifiquement pour cet événement.
 </p>
 </div>

 {error && <p className="text-xs text-rose-600">{error}</p>}

 <div className="space-y-3">
 {staff.length === 0 ? (
 <p className="text-sm text-muted italic">Aucun staff assigné à cet événement.</p>
 ) : (
 staff.map((s) => (
 <div key={s.id} className="flex items-center justify-between p-4 bg-surface-muted border border-border-subtle rounded-2xl">
 <div>
 <p className="font-bold text-sm text-foreground">{s.user.name || s.user.email}</p>
 <p className="text-[10px] font-bold uppercase tracking-wider text-primary mt-1 flex items-center gap-1">
 {s.staffRole === 'MANAGER' ? <Shield className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
 {roleLabels[s.staffRole]}
 </p>
 </div>
 {canManage && (
 <button type="button" onClick={() => handleRemove(s.user.id)} className="p-2 text-muted hover:text-rose-600 rounded-xl">
 <Trash2 className="w-4 h-4" />
 </button>
 )}
 </div>
 ))
 )}
 </div>

 {canManage && (
 <div className="bg-white border border-border rounded-2xl p-5 space-y-3">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <UserPlus className="w-4 h-4 text-primary" />
 Assigner un membre
 </h3>
 <div className="flex flex-wrap gap-2">
 <select value={userId} onChange={(e) => setUserId(e.target.value)} className="flex-1 min-w-[180px] px-3 py-2 rounded-xl border text-sm">
 <option value="">Sélectionner un utilisateur</option>
 {teamMembers.map((m) => (
 <option key={m.id} value={m.id}>{m.name || m.email}</option>
 ))}
 </select>
 <select value={staffRole} onChange={(e) => setStaffRole(e.target.value as 'MANAGER' | 'PROTOCOL')} className="px-3 py-2 rounded-xl border text-sm">
 <option value="MANAGER">Manager</option>
 <option value="PROTOCOL">Protocole</option>
 </select>
 <button type="button" onClick={handleAssign} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold">
 Assigner
 </button>
 </div>
 </div>
 )}
 </div>
 );
}
