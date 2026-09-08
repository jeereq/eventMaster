'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { isProtocolUser } from '@/lib/protocolAccess';
import AiStudioTabList, {
  AI_STUDIO_TABS,
  aiStudioPanelId,
  type AiStudioId,
} from '@/components/AiStudioTabList';

export type DashboardAiStudioId = AiStudioId;

const LandingInvitationAiGenerator = dynamic(
  () => import('@/components/landing/LandingInvitationAiGenerator'),
  {
    ssr: false,
    loading: () => <StudioPaneFallback label="Chargement du studio invitation…" />,
  },
);

const LandingRoomPlanAiStudio = dynamic(
  () => import('@/components/landing/LandingRoomPlanAiStudio'),
  {
    ssr: false,
    loading: () => <StudioPaneFallback label="Chargement du studio plan de salle…" />,
  },
);

function StudioPaneFallback({ label }: { label: string }) {
  return (
    <div
      className="min-h-[16rem] rounded-[var(--radius-card)] border border-border bg-surface-muted/40 animate-pulse"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}

const DASHBOARD_STUDIO_PREFIX = 'dashboard-ai-studio';

export default function DashboardAiStudios({
  value,
  onChange,
  budget,
}: {
  value: DashboardAiStudioId;
  onChange: (id: DashboardAiStudioId) => void;
  budget: React.ReactNode;
}) {
  const { access, tenant } = useAuth();
  const protocolLocked = isProtocolUser(access);
  const showRoom = tenant?.accountKind !== 'CLIENT' && !protocolLocked;
  const tabs = AI_STUDIO_TABS.filter((tab) => tab.id !== 'room' || showRoom);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-sm font-semibold text-foreground">Studios IA</h2>
        <p className="text-xs text-muted leading-relaxed max-w-2xl">
          Choisissez un atelier. Chaque studio a ses propres étapes : packs budget, carte invitation, ou plan 2D / 3D.
        </p>
      </div>
      <AiStudioTabList
        value={value}
        onChange={onChange}
        tabs={tabs}
        idPrefix={DASHBOARD_STUDIO_PREFIX}
      />

      {value === 'budget' ? (
        <div
          role="tabpanel"
          id={aiStudioPanelId(DASHBOARD_STUDIO_PREFIX, 'budget')}
          aria-labelledby={`${DASHBOARD_STUDIO_PREFIX}-budget`}
        >
          {budget}
        </div>
      ) : null}
      {value === 'invite' ? (
        <div
          role="tabpanel"
          id={aiStudioPanelId(DASHBOARD_STUDIO_PREFIX, 'invite')}
          aria-labelledby={`${DASHBOARD_STUDIO_PREFIX}-invite`}
        >
          <LandingInvitationAiGenerator id="dashboard-studio-invite" defaultExpanded />
        </div>
      ) : null}
      {value === 'room' && showRoom ? (
        <div
          role="tabpanel"
          id={aiStudioPanelId(DASHBOARD_STUDIO_PREFIX, 'room')}
          aria-labelledby={`${DASHBOARD_STUDIO_PREFIX}-room`}
        >
          <LandingRoomPlanAiStudio id="dashboard-studio-room" defaultExpanded />
        </div>
      ) : null}
    </div>
  );
}
