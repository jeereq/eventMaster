'use client';

import React from 'react';
import { Check, Clock, Edit2, Eye, Trash2, X } from 'lucide-react';
import type { PlanId } from '@/config/landingPricing';

function planBadgeClass(plan: string): string {
  if (plan === 'FREE') return 'bg-slate-50 border-slate-200 text-slate-600';
  if (plan === 'STANDARD') return 'bg-blue-50 border-blue-100 text-blue-700';
  if (plan.startsWith('PREMIUM')) return 'bg-indigo-50 border-indigo-100 text-indigo-700';
  if (plan.startsWith('ENTERPRISE')) return 'bg-amber-50 border-amber-100 text-amber-700';
  return 'bg-slate-50 border-slate-200 text-slate-600';
}

function AdminActionButtons({
  onView,
  onEdit,
  onDelete,
  showEdit = true,
  showDelete = true,
  deleteDisabled = false,
}: {
  onView: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showEdit?: boolean;
  showDelete?: boolean;
  deleteDisabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <button
        type="button"
        onClick={onView}
        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
      >
        <Eye className="w-3.5 h-3.5" />
        Détails
      </button>
      {showEdit && onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
          title="Modifier"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      )}
      {showDelete && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleteDisabled}
          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-30"
          title="Supprimer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export type AdminTenantRow = {
  id: string;
  name: string;
  plan: PlanId;
  licenseActive: boolean;
  licenseExpiresAt: string | null;
  licenseKey: string | null;
  createdAt: string;
  managerName: string;
  managerEmail: string;
  eventsCount: number;
  usersCount: number;
};

export function TenantsMobileList({
  tenants,
  isCommercialPlatform,
  onView,
  onEdit,
  onDelete,
}: {
  tenants: AdminTenantRow[];
  isCommercialPlatform: boolean;
  onView: (t: AdminTenantRow) => void;
  onEdit: (t: AdminTenantRow) => void;
  onDelete: (id: string, name: string) => void;
}) {
  if (tenants.length === 0) {
    return <p className="text-center text-slate-500 font-medium py-8">Aucune organisation trouvée.</p>;
  }

  return (
    <>
      {tenants.map((t) => {
        const licenseExpired = t.licenseExpiresAt && new Date(t.licenseExpiresAt) < new Date();
        const licenseLabel = t.licenseActive
          ? (licenseExpired ? 'Expirée' : 'Active')
          : 'Désactivée';
        const licenseClass = t.licenseActive
          ? (licenseExpired ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700')
          : 'bg-slate-100 border-slate-200 text-slate-600';

        return (
          <div key={t.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-950">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-slate-900 dark:text-white truncate">{t.name}</p>
                <p className="text-[10px] text-slate-400">Inscrite le {new Date(t.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 ${planBadgeClass(t.plan)}`}>
                {t.plan}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${licenseClass}`}>
                {licenseLabel}
              </span>
              {t.licenseExpiresAt && (
                <span className="text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Exp. {new Date(t.licenseExpiresAt).toLocaleDateString('fr-FR')}
                </span>
              )}
              <span className="text-slate-500">{t.usersCount} membres</span>
              <span className="text-indigo-600 font-bold">{t.eventsCount} évén.</span>
            </div>
            <div className="text-xs">
              <p className="font-semibold text-slate-800 dark:text-slate-200">{t.managerName}</p>
              <p className="text-slate-400 break-all">{t.managerEmail}</p>
            </div>
            {t.licenseKey && (
              <p className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded border font-mono truncate" title={t.licenseKey}>
                {t.licenseKey}
              </p>
            )}
            <AdminActionButtons
              onView={() => onView(t)}
              onEdit={!isCommercialPlatform ? () => onEdit(t) : undefined}
              onDelete={!isCommercialPlatform ? () => onDelete(t.id, t.name) : undefined}
              showEdit={!isCommercialPlatform}
              showDelete={!isCommercialPlatform}
            />
          </div>
        );
      })}
    </>
  );
}

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  role: 'SUPER_ADMIN' | 'COMMERCIAL' | 'USER';
  isEmailVerified: boolean;
  tenantId: string | null;
  tenantName: string;
  createdAt: string;
};

export function UsersMobileList({
  users,
  currentUserId,
  onView,
  onEdit,
  onDelete,
}: {
  users: AdminUserRow[];
  currentUserId?: string;
  onView: (u: AdminUserRow) => void;
  onEdit: (u: AdminUserRow) => void;
  onDelete: (id: string, email: string) => void;
}) {
  if (users.length === 0) {
    return <p className="text-center text-slate-500 font-medium py-8">Aucun utilisateur trouvé.</p>;
  }

  return (
    <>
      {users.map((u) => (
        <div key={u.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-950">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-slate-900 dark:text-white truncate">{u.name || 'Sans nom'}</p>
              <p className="text-xs text-slate-400 break-all">{u.email}</p>
            </div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 ${
              u.role === 'SUPER_ADMIN' ? 'bg-rose-50 border-rose-100 text-rose-700' :
              u.role === 'COMMERCIAL' ? 'bg-amber-50 border-amber-100 text-amber-700' :
              'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              {u.role}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${
              u.isEmailVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {u.isEmailVerified ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              {u.isEmailVerified ? 'Vérifié' : 'Non vérifié'}
            </span>
            <span className="text-slate-600 font-semibold truncate">{u.tenantName}</span>
          </div>
          <AdminActionButtons
            onView={() => onView(u)}
            onEdit={() => onEdit(u)}
            onDelete={() => onDelete(u.id, u.email)}
            deleteDisabled={u.id === currentUserId}
          />
        </div>
      ))}
    </>
  );
}

export function EventsMobileList({
  events,
  onView,
  onEdit,
  onDelete,
}: {
  events: Array<{
    id: string;
    title: string;
    date: string;
    tenantName: string;
    location: string;
    guestCount: number;
    invitationCount: number;
  }>;
  onView: (e: (typeof events)[number]) => void;
  onEdit: (e: (typeof events)[number]) => void;
  onDelete: (id: string, title: string) => void;
}) {
  if (events.length === 0) {
    return <p className="text-center text-slate-500 font-medium py-8">Aucun événement trouvé.</p>;
  }

  return (
    <>
      {events.map((e) => (
        <div key={e.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-950">
          <div className="min-w-0">
            <p className="font-bold text-slate-900 dark:text-white">{e.title}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date(e.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="text-xs space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300">{e.tenantName}</p>
            <p className="text-slate-500 break-words">{e.location}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-bold">
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
              {e.guestCount} invités
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
              {e.invitationCount} invitations
            </span>
          </div>
          <AdminActionButtons
            onView={() => onView(e)}
            onEdit={() => onEdit(e)}
            onDelete={() => onDelete(e.id, e.title)}
          />
        </div>
      ))}
    </>
  );
}

export function GuestsMobileList({
  guests,
  onView,
  onEdit,
  onDelete,
}: {
  guests: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    category: string;
    rsvp: string;
    eventTitle: string;
    tenantName: string;
  }>;
  onView: (g: (typeof guests)[number]) => void;
  onEdit: (g: (typeof guests)[number]) => void;
  onDelete: (id: string, name: string) => void;
}) {
  if (guests.length === 0) {
    return <p className="text-center text-slate-500 font-medium py-8">Aucun invité trouvé.</p>;
  }

  return (
    <>
      {guests.map((g) => (
        <div key={g.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-950">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-slate-900 dark:text-white">{g.lastName} {g.firstName}</p>
              <p className="text-xs text-slate-500 break-all">{g.email}</p>
            </div>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 ${
              g.rsvp === 'ACCEPTED' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
              g.rsvp === 'DECLINED' ? 'bg-rose-50 border-rose-100 text-rose-700' :
              'bg-amber-50 border-amber-100 text-amber-700'
            }`}>
              {g.rsvp === 'ACCEPTED' ? 'Accepté' : g.rsvp === 'DECLINED' ? 'Décliné' : 'En attente'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {g.category}
            </span>
          </div>
          <div className="text-xs">
            <p className="font-semibold text-slate-800 dark:text-slate-200">{g.eventTitle}</p>
            <p className="text-slate-400">{g.tenantName}</p>
          </div>
          <AdminActionButtons
            onView={() => onView(g)}
            onEdit={() => onEdit(g)}
            onDelete={() => onDelete(g.id, `${g.firstName} ${g.lastName}`)}
          />
        </div>
      ))}
    </>
  );
}
