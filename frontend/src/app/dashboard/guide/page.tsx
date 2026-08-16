'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui';
import UserGuideView from '@/components/guide/UserGuideView';
import GuideTourPanel from '@/components/guide/GuideTourPanel';
import { DASHBOARD_GUIDE_IDS, type UserGuideId } from '@/config/userGuides';
import { getGuideLabel, resolveUserGuideRole } from '@/lib/resolveUserGuideRole';
import { useTour } from '@/context/TourContext';
import { BookOpen, HelpCircle, Map } from 'lucide-react';
import { cn } from '@/lib/cn';

type GuideViewTab = 'doc' | 'tour';

function DashboardGuidePageContent() {
  const { user, access } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { startTour } = useTour();

  const resolved = useMemo(
    () => resolveUserGuideRole({ role: user?.role, access }),
    [user?.role, access],
  );

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [selectedGuideId, setSelectedGuideId] = useState<UserGuideId | null>(null);

  const viewParam = searchParams.get('view');
  const [activeTab, setActiveTab] = useState<GuideViewTab>(viewParam === 'tour' ? 'tour' : 'doc');

  useEffect(() => {
    setActiveTab(viewParam === 'tour' ? 'tour' : 'doc');
  }, [viewParam]);

  const activeGuideId = selectedGuideId ?? resolved.guideId;

  const setTab = (tab: GuideViewTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'tour') params.set('view', 'tour');
    else params.delete('view');
    params.delete('start');
    router.replace(`/dashboard/guide${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  };

  useEffect(() => {
    if (searchParams.get('start') === '1' && activeTab === 'tour') {
      startTour(activeGuideId, access);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('start');
      router.replace(`/dashboard/guide?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, activeTab, activeGuideId, access, startTour, router]);

  return (
    <div className="space-y-8 w-full">
      <PageHeader
        title="Guide utilisateur"
        description="Documentation et visite guidée adaptées à votre rôle sur EventMaster."
      />

      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 w-fit">
        <button
          type="button"
          onClick={() => setTab('doc')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition',
            activeTab === 'doc'
              ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
          )}
        >
          <BookOpen className="w-4 h-4" />
          Documentation
        </button>
        <button
          type="button"
          onClick={() => setTab('tour')}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition',
            activeTab === 'tour'
              ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
          )}
        >
          <Map className="w-4 h-4" />
          Visite guidée
        </button>
      </div>

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
              Consulter un autre profil :
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

      {activeTab === 'doc' ? (
        <UserGuideView guideId={activeGuideId} />
      ) : (
        <GuideTourPanel guideId={activeGuideId} />
      )}

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

export default function DashboardGuidePage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-slate-500">Chargement du guide…</div>
      }
    >
      <DashboardGuidePageContent />
    </Suspense>
  );
}
