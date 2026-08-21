'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Breadcrumbs, Button } from '@/components/ui';
import UserGuideView from '@/components/guide/UserGuideView';
import GuideTourPanel from '@/components/guide/GuideTourPanel';
import { DASHBOARD_GUIDE_IDS, type UserGuideId } from '@/config/userGuides';
import { getGuideLabel, resolveUserGuideRole } from '@/lib/resolveUserGuideRole';
import { useTour } from '@/context/TourContext';
import { buildNavTourOptions } from '@/lib/buildNavProductTour';
import { BookOpen, HelpCircle, Map, Play } from 'lucide-react';
import { cn } from '@/lib/cn';

type GuideViewTab = 'doc' | 'tour';

function DashboardGuidePageContent() {
  const { user, access, tenant, planQuota, planFeatures } = useAuth();
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

  const tourOpts = useMemo(
    () =>
      buildNavTourOptions({
        accountKind: tenant?.accountKind,
        access,
        planQuota,
        planFeatures,
        planId: tenant?.plan,
      }),
    [access, tenant?.accountKind, tenant?.plan, planQuota, planFeatures],
  );

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
      startTour(activeGuideId, access, tourOpts);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('start');
      router.replace(`/dashboard/guide?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, activeTab, activeGuideId, access, startTour, router, tourOpts]);

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Guide utilisateur"
        description="Documentation à jour selon votre rôle : Explorer, devis / réservations, tâches protocole, éditeur de salles."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: 'Accueil', href: '/dashboard' },
              { label: 'Guide utilisateur' },
            ]}
          />
        }
        action={
          activeTab === 'doc' ? (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Play className="w-3.5 h-3.5" />}
              onClick={() => {
                setTab('tour');
                setTimeout(() => startTour(activeGuideId, access, tourOpts), 100);
              }}
            >
              Visite guidée
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col lg:flex-row gap-4 lg:items-stretch">
        <div className="lg:w-56 shrink-0 space-y-3">
          <div className="inline-flex w-full gap-1 p-1 bg-surface-muted border border-border rounded-[var(--radius-button)]">
            <button
              type="button"
              onClick={() => setTab('doc')}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--radius-button)] text-xs font-semibold transition',
                activeTab === 'doc'
                  ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Doc
            </button>
            <button
              type="button"
              onClick={() => setTab('tour')}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[var(--radius-button)] text-xs font-semibold transition',
                activeTab === 'tour'
                  ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <Map className="w-3.5 h-3.5" />
              Visite
            </button>
          </div>

          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3.5 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Votre profil</p>
            <p className="text-sm font-semibold text-foreground leading-snug">{resolved.label}</p>
            {isSuperAdmin && (
              <div className="pt-2 border-t border-border space-y-1.5">
                <label htmlFor="guide-select" className="text-[10px] font-medium text-muted block">
                  Consulter un autre profil
                </label>
                <select
                  id="guide-select"
                  value={activeGuideId}
                  onChange={(e) => setSelectedGuideId(e.target.value as UserGuideId)}
                  className="w-full px-2.5 py-2 bg-background border border-border rounded-[var(--radius-button)] text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
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

          <Link
            href="/faq"
            className="hidden lg:flex items-center gap-2 text-xs font-medium text-muted hover:text-primary transition px-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            FAQ publique
          </Link>
        </div>

        <div className="flex-1 min-w-0">
          {activeTab === 'doc' ? (
            <UserGuideView
              guideId={activeGuideId}
              onStartTour={() => {
                setTab('tour');
                setTimeout(() => startTour(activeGuideId, access, tourOpts), 120);
              }}
            />
          ) : (
            <GuideTourPanel guideId={activeGuideId} />
          )}
        </div>
      </div>

      <p className="lg:hidden text-center text-xs text-muted pt-2 border-t border-border">
        Questions générales ?{' '}
        <Link href="/faq" className="text-primary font-semibold hover:underline inline-flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" />
          FAQ
        </Link>
      </p>
    </div>
  );
}

export default function DashboardGuidePage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-muted">Chargement du guide…</div>
      }
    >
      <DashboardGuidePageContent />
    </Suspense>
  );
}
