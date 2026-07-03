'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui';
import UserGuideView from '@/components/guide/UserGuideView';
import { DASHBOARD_GUIDE_IDS, type UserGuideId } from '@/config/userGuides';
import { getGuideLabel, resolveUserGuideRole } from '@/lib/resolveUserGuideRole';
import { HelpCircle } from 'lucide-react';

export default function DashboardGuidePage() {
  const { user, access } = useAuth();
  const resolved = useMemo(
    () => resolveUserGuideRole({ role: user?.role, access }),
    [user?.role, access],
  );

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [selectedGuideId, setSelectedGuideId] = useState<UserGuideId | null>(null);

  const activeGuideId = selectedGuideId ?? resolved.guideId;

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title="Guide utilisateur"
        description="Documentation adaptée à votre rôle sur EventMaster."
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Votre profil
          </p>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{resolved.label}</p>
        </div>
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <label htmlFor="guide-select" className="text-xs font-semibold text-slate-600 dark:text-slate-400 shrink-0">
              Consulter un autre guide :
            </label>
            <select
              id="guide-select"
              value={activeGuideId}
              onChange={(e) => setSelectedGuideId(e.target.value as UserGuideId)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {DASHBOARD_GUIDE_IDS.map((id) => (
                <option key={id} value={id}>
                  {getGuideLabel(id)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <UserGuideView guideId={activeGuideId} />

      <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-200 dark:border-slate-800">
        Questions générales (forfaits, légal) ?{' '}
        <Link href="/faq" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" />
          Consulter la FAQ
        </Link>
      </p>
    </div>
  );
}
