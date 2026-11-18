'use client';

import React, { useRef, useEffect } from 'react';
import {
  CheckCircle2,
  Users,
  ClipboardList,
  Shirt,
  MessageSquare,
  Ticket,
  Heart,
  ScanLine,
  ArrowRight,
  Store,
  Mail,
  LayoutGrid,
  type LucideIcon,
} from '@/components/icons';
import {
  type EventWorkflowState,
  type EventWorkflowStepId,
  type EventWorkflowTab,
} from '@/lib/eventWorkflow';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

interface EventWorkflowPanelProps {
  workflow: EventWorkflowState;
  activeTab: string;
  onNavigateTab: (tab: EventWorkflowTab) => void;
  onAction?: (stepId: string) => void;
  compact?: boolean;
  /** Mode protocole : Accueil, Billetterie et Tâches seulement. */
  protocolDesk?: boolean;
  /** Particulier (B2C) : pas de billetterie, équipe = co-organisateurs. */
  personal?: boolean;
  /** Compteur affiché dans l’onglet (ex. nombre d’invités). */
  badges?: Partial<Record<EventWorkflowTab, string | number>>;
  /** Onglets sans objet pour cet événement (masqués, sauf s’ils sont ouverts). */
  hiddenTabs?: EventWorkflowTab[];
}

type TabItem = {
  id: EventWorkflowTab;
  label: string;
  icon: LucideIcon;
  complete?: boolean;
};

const STEP_TAB_ICONS: Partial<Record<EventWorkflowTab, LucideIcon>> = {
  prep: Store,
  guests: Users,
  invitations: Mail,
  tablePlan: LayoutGrid,
  protocol: ScanLine,
};

const SUPPORT_TABS: TabItem[] = [
  { id: 'ticketing', label: 'Billetterie', icon: Ticket },
  { id: 'donations', label: 'Dons solidaires', icon: Heart },
  { id: 'guestInfo', label: 'Infos invités', icon: Shirt },
  { id: 'feed', label: 'Feed', icon: MessageSquare },
  { id: 'tasks', label: 'Tâches', icon: ClipboardList },
  { id: 'staff', label: 'Équipe', icon: Users },
];

const PROTOCOL_TABS: TabItem[] = [
  { id: 'protocol', label: 'Accueil jour J', icon: ScanLine },
  { id: 'ticketing', label: 'Billetterie', icon: Ticket },
  { id: 'tasks', label: 'Tâches', icon: ClipboardList },
];

/** Bouton du bandeau quand l’étape à faire est dans un autre onglet. */
const STEP_CTA: Record<EventWorkflowStepId, string> = {
  event: 'Modifier l’événement',
  prep: 'Ouvrir la préparation',
  guests: 'Gérer les invités',
  invitation: 'Ouvrir les invitations',
  rsvp: 'Voir les réponses',
  tablePlan: 'Ouvrir le plan de table',
  protocol: 'Ouvrir l’accueil',
  protocolTasks: 'Ouvrir les tâches',
};

/** Bouton du bandeau quand on est déjà dans l’onglet de l’étape (action directe). */
const IN_TAB_CTA: Partial<Record<EventWorkflowStepId, string>> = {
  event: 'Modifier l’événement',
  guests: 'Ajouter des invités',
  invitation: 'Rédiger l’invitation',
};

const TAB_CHIP_CLASS =
  'inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 min-h-11 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

function focusWorkflowTab(id: EventWorkflowTab) {
  document.getElementById(`workflow-tab-${id}`)?.focus();
}

function onTabListKeyDown(
  event: React.KeyboardEvent,
  tabs: Array<{ id: EventWorkflowTab }>,
  selectedId: string,
  onSelect: (id: EventWorkflowTab) => void,
) {
  const ids = tabs.map((tab) => tab.id);
  const current = Math.max(0, ids.indexOf(selectedId as EventWorkflowTab));
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
  onSelect(ids[next]);
  requestAnimationFrame(() => focusWorkflowTab(ids[next]));
}

/** Étapes du parcours (un onglet par écran, sans doublon) puis onglets complémentaires. */
function buildTabs(
  workflow: EventWorkflowState,
  protocolDesk: boolean,
  personal: boolean,
): TabItem[] {
  if (protocolDesk) return PROTOCOL_TABS;
  const seen = new Set<EventWorkflowTab>();
  const stepTabs: TabItem[] = [];
  for (const step of workflow.steps) {
    if (!step.tab || seen.has(step.tab)) continue;
    seen.add(step.tab);
    stepTabs.push({
      id: step.tab,
      label: step.title,
      icon: STEP_TAB_ICONS[step.tab] ?? ClipboardList,
      complete: step.status === 'complete',
    });
  }
  const supportTabs = personal
    ? SUPPORT_TABS.filter((tab) => tab.id !== 'ticketing').map((tab) =>
        tab.id === 'staff' ? { ...tab, label: 'Co-organisateurs' } : tab,
      )
    : SUPPORT_TABS;
  return [...stepTabs, ...supportTabs.filter((tab) => !seen.has(tab.id))];
}

export default function EventWorkflowPanel({
  workflow,
  activeTab,
  onNavigateTab,
  onAction,
  compact = false,
  protocolDesk = false,
  personal = false,
  badges,
  hiddenTabs,
}: EventWorkflowPanelProps) {
  const tabs = buildTabs(workflow, protocolDesk, personal).filter(
    (tab) => tab.id === activeTab || !hiddenTabs?.includes(tab.id),
  );

  const currentStep = workflow.steps.find((s) => s.id === workflow.currentStepId) ?? null;
  const onCurrentTab = Boolean(currentStep?.tab && currentStep.tab === activeTab);
  const allDone = workflow.completedCount >= workflow.totalCount && workflow.totalCount > 0;
  const inTabCta = currentStep ? IN_TAB_CTA[currentStep.id] : undefined;
  const showBanner =
    !compact &&
    !protocolDesk &&
    Boolean(currentStep) &&
    (allDone ? activeTab !== 'protocol' : !onCurrentTab || Boolean(inTabCta));

  const activeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!activeBtnRef.current) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    activeBtnRef.current.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [activeTab]);

  const handleNextAction = () => {
    if (!currentStep) return;
    if (currentStep.tab && currentStep.tab !== activeTab) {
      onNavigateTab(currentStep.tab);
    }
    onAction?.(currentStep.id);
  };

  return (
    <div className="space-y-3">
      {showBanner && currentStep ? (
        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-surface px-3.5 py-2.5">
          <p className="min-w-0 truncate text-sm font-semibold text-foreground">
            {allDone ? 'Prêt pour le jour J' : `À faire : ${currentStep.title}`}
          </p>
          {allDone ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => onNavigateTab('protocol')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {STEP_CTA.protocol}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleNextAction}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {onCurrentTab && inTabCta ? inTabCta : STEP_CTA[currentStep.id]}
            </Button>
          )}
        </div>
      ) : null}

      <div
        role="tablist"
        aria-label={protocolDesk ? 'Desk protocole' : 'Onglets de l’événement'}
        className="flex gap-2 items-center overflow-x-auto scrollbar-hide -mx-1 px-1 py-0.5 lg:flex-wrap lg:overflow-visible"
        onKeyDown={(event) => onTabListKeyDown(event, tabs, activeTab, onNavigateTab)}
      >
        {tabs.map((tab) => {
          const selected = activeTab === tab.id;
          const Icon = tab.complete ? CheckCircle2 : tab.icon;
          const badge = badges?.[tab.id];
          return (
            <button
              key={tab.id}
              ref={selected ? activeBtnRef : null}
              type="button"
              id={`workflow-tab-${tab.id}`}
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onNavigateTab(tab.id)}
              className={cn(
                TAB_CHIP_CLASS,
                selected
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-surface text-muted border-border hover:text-foreground hover:bg-surface-muted',
              )}
            >
              <Icon
                className={cn('w-3.5 h-3.5', tab.complete && !selected && 'text-primary')}
                aria-hidden
              />
              {tab.label}
              {badge !== undefined && badge !== '' ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-xs font-bold tabular-nums',
                    selected ? 'bg-background/20' : 'bg-surface-muted text-foreground',
                  )}
                >
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
