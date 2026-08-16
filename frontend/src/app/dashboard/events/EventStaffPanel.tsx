'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Users, UserPlus, Trash2, Loader2, Shield, Briefcase } from 'lucide-react';
import {
  ProjectCard,
  StatusPill,
  ViewModeToggle,
  useViewMode,
  listStackClass,
} from '@/components/ui';
import { cn } from '@/lib/cn';

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
  const {
    mode: staffViewMode,
    setViewMode: setStaffViewMode,
    columns: staffColumns,
    setGridColumns: setStaffColumns,
    gridClassName: staffGridClass,
  } = useViewMode('em-view-event-staff', 'grid', 3);

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
      setError(err.message || "Impossible de charger l'équipe.");
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
      setError(err.message || "Erreur lors de l'assignation.");
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
      <div className="py-16 flex justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-4.5 h-4.5 text-primary" />
            Équipe de l&apos;événement
          </h2>
          <p className="text-sm text-muted">
            Assignez des managers ou agents protocole pour cet événement.
          </p>
        </div>
        {staff.length > 0 && (
          <ViewModeToggle
            storageKey="em-view-event-staff"
            value={staffViewMode}
            onChange={setStaffViewMode}
            columns={staffColumns}
            onColumnsChange={setStaffColumns}
            defaultMode="grid"
            defaultColumns={3}
          />
        )}
      </div>

      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-[var(--radius-card)] px-3 py-2">
          {error}
        </p>
      )}

      {staff.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface px-6 py-12 text-center">
          <Users className="w-9 h-9 text-muted mx-auto mb-3 opacity-60" />
          <p className="text-sm font-semibold text-foreground">Aucun membre assigné</p>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            Assignez un membre de l&apos;organisation pour gérer ou accueillir les invités.
          </p>
        </div>
      ) : (
        <div
          className={cn(
            staffViewMode === 'grid' ? staffGridClass : listStackClass,
          )}
        >
          {staff.map((s) => {
            const title = s.user.name || s.user.email;
            const isManager = s.staffRole === 'MANAGER';
            return (
              <ProjectCard
                key={s.id}
                id={s.id}
                layout={staffViewMode}
                title={title}
                meta={s.user.email}
                icon={
                  isManager ? (
                    <Shield className="w-4 h-4" />
                  ) : (
                    <Briefcase className="w-4 h-4" />
                  )
                }
                status={
                  <StatusPill tone={isManager ? 'primary' : 'sky'}>
                    {roleLabels[s.staffRole]}
                  </StatusPill>
                }
                description={
                  staffViewMode === 'grid' ? roleLabels[s.staffRole] : undefined
                }
                actions={
                  canManage ? (
                    <button
                      type="button"
                      onClick={() => handleRemove(s.user.id)}
                      className="p-2 text-muted hover:text-rose-600 hover:bg-rose-50 rounded-[var(--radius-button)] transition"
                      title="Retirer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      )}

      {canManage && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            Assigner un membre
          </h3>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="flex-1 min-w-[180px] px-3 py-2.5 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Sélectionner un utilisateur</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.email}
                </option>
              ))}
            </select>
            <select
              value={staffRole}
              onChange={(e) => setStaffRole(e.target.value as 'MANAGER' | 'PROTOCOL')}
              className="px-3 py-2.5 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="MANAGER">Manager</option>
              <option value="PROTOCOL">Protocole</option>
            </select>
            <button
              type="button"
              onClick={handleAssign}
              disabled={!userId}
              className="px-4 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-[var(--radius-button)] text-sm font-semibold transition"
            >
              Assigner
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
