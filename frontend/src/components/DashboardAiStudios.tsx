'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Building2, Mail, Wand2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/context/AuthContext';
import { isProtocolUser } from '@/lib/protocolAccess';

export type DashboardAiStudioId = 'budget' | 'invite' | 'room';

const STUDIO_TABS: Array<{
  id: DashboardAiStudioId;
  label: string;
  hint: string;
  icon: LucideIcon;
}> = [
  { id: 'budget', label: 'Budget', hint: 'Packs et formules dans l’enveloppe', icon: Wand2 },
  { id: 'invite', label: 'Invitation', hint: 'Carte 9:16 éditable', icon: Mail },
  { id: 'room', label: 'Plan de salle', hint: 'Brief ou photo → 2D / 3D', icon: Building2 },
];

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

function focusStudioTab(id: DashboardAiStudioId) {
  document.getElementById(`dashboard-ai-studio-${id}`)?.focus();
}

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
  const tabs = STUDIO_TABS.filter((tab) => tab.id !== 'room' || showRoom);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const ids = tabs.map((tab) => tab.id);
    const current = Math.max(0, ids.indexOf(value));
    let next = current;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = (current + 1) % ids.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = (current - 1 + ids.length) % ids.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = ids.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    onChange(ids[next]);
    requestAnimationFrame(() => focusStudioTab(ids[next]));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-sm font-semibold text-foreground">Studios IA</h2>
        <p className="text-xs text-muted leading-relaxed max-w-2xl">
          Budget (packs et formules), invitation, puis plan de salle — les trois ateliers au même endroit.
        </p>
      </div>
      <div
        role="tablist"
        aria-label="Studios IA"
        className="flex flex-col sm:flex-row gap-1 p-1 rounded-[var(--radius-button)] bg-surface-muted border border-border"
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = value === tab.id;
          return (
            <button
              key={tab.id}
              id={`dashboard-ai-studio-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={cn(
                'flex-1 min-h-11 px-3 py-2 rounded-[var(--radius-button)] text-left transition touch-manipulation',
                'inline-flex items-center gap-2.5',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                selected
                  ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', selected ? 'text-primary' : '')} aria-hidden />
              <span className="min-w-0">
                <span className="block text-xs font-semibold">{tab.label}</span>
                <span className="hidden sm:block text-xs text-muted">{tab.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      {value === 'budget' ? budget : null}
      {value === 'invite' ? (
        <LandingInvitationAiGenerator id="dashboard-studio-invite" defaultExpanded />
      ) : null}
      {value === 'room' && showRoom ? (
        <LandingRoomPlanAiStudio id="dashboard-studio-room" defaultExpanded />
      ) : null}
    </div>
  );
}
