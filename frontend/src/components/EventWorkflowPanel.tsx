'use client';

import React, { useRef, useEffect } from 'react';
import {
  CheckCircle2,
  Users,
  ClipboardList,
  Shirt,
  MessageSquare,
  Ticket,
  ScanLine,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
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
  /** Mode protocole : pas d’onglets support (infos, feed, staff…). */
  protocolDesk?: boolean;
}

const SUPPORT_TABS: Array<{ id: EventWorkflowTab; label: string; icon: LucideIcon }> = [
  { id: 'ticketing', label: 'Billetterie', icon: Ticket },
  { id: 'guestInfo', label: 'Infos invités', icon: Shirt },
  { id: 'feed', label: 'Feed', icon: MessageSquare },
  { id: 'tasks', label: 'Tâches', icon: ClipboardList },
  { id: 'staff', label: 'Équipe', icon: Users },
];

const PROTOCOL_TABS: Array<{ id: EventWorkflowTab; label: string; icon: LucideIcon }> = [
  { id: 'protocol', label: 'Accueil jour J (QR)', icon: ScanLine },
  { id: 'ticketing', label: 'Billetterie & Entrées', icon: Ticket },
  { id: 'tasks', label: 'Tâches', icon: ClipboardList },
];

const STEP_CTA: Record<EventWorkflowStepId, string> = {
  event: 'Configurer l’événement',
  prep: 'Ouvrir la préparation',
  guests: 'Gérer les invités',
  invitation: 'Ouvrir les invitations',
  rsvp: 'Voir les réponses',
  tablePlan: 'Ouvrir le plan de table',
  protocol: 'Ouvrir l’accueil',
  protocolTasks: 'Ouvrir les tâches',
};

const TAB_CHIP_CLASS =
  'inline-flex items-center gap-1.5 px-3 py-1.5 min-h-11 rounded-full text-xs font-semibold transition-colors border touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

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

function WorkflowTabChip({
  id,
  label,
  icon: Icon,
  selected,
  onSelect,
}: {
  id: EventWorkflowTab;
  label: string;
  icon: LucideIcon;
  selected: boolean;
  onSelect: (id: EventWorkflowTab) => void;
}) {
  return (
    <button
      type="button"
      id={`workflow-tab-${id}`}
      role="tab"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={() => onSelect(id)}
      className={cn(
        TAB_CHIP_CLASS,
        selected
          ? 'bg-foreground text-background border-foreground'
          : 'bg-surface text-muted border-border hover:text-foreground hover:bg-surface-muted',
      )}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden />
      {label}
    </button>
  );
}

export default function EventWorkflowPanel({
  workflow,
  activeTab,
  onNavigateTab,
  onAction,
  compact = false,
  protocolDesk = false,
}: EventWorkflowPanelProps) {
  const mainSteps = workflow.steps.filter((s) => s.tab);
  const showSupport = !compact && !protocolDesk;

  const activeIndex = mainSteps.findIndex((s) => s.tab === activeTab);
  const activeStep = activeIndex >= 0 ? mainSteps[activeIndex] : null;
  const currentStep = workflow.steps.find((s) => s.id === workflow.currentStepId) ?? activeStep;
  const onCurrentTab = Boolean(currentStep?.tab && currentStep.tab === activeTab);
  const allDone = workflow.completedCount >= workflow.totalCount && workflow.totalCount > 0;

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
    <div className="space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {activeStep ? activeStep.title : 'Vue active'}
          </p>
          {activeStep?.detail ? (
            <p className="text-xs text-muted truncate max-w-md">{activeStep.detail}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={workflow.progressPercent}
            aria-label="Progression de l’événement"
            className="w-24 sm:w-32 h-1.5 bg-surface-muted rounded-full overflow-hidden border border-border/40"
          >
            <div
              className="h-full bg-primary rounded-full transition-all duration-300 motion-reduce:transition-none"
              style={{ width: `${workflow.progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-muted tabular-nums">
            {workflow.completedCount}/{workflow.totalCount} terminées ({workflow.progressPercent}%)
          </span>
        </div>
      </div>

      {!compact && currentStep ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-surface px-3.5 py-3">
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-semibold text-foreground">
              {allDone ? 'Parcours prêt pour le jour J' : `À faire : ${currentStep.title}`}
            </p>
            <p className="text-xs text-muted leading-relaxed">
              {allDone
                ? 'Invitations, places et accueil sont en place. Le jour J, ouvrez Protocole pour scanner les QR.'
                : currentStep.description}
            </p>
          </div>
          {allDone ? (
            currentStep.tab && currentStep.tab !== activeTab ? (
              <Button type="button" size="sm" onClick={() => currentStep.tab && onNavigateTab(currentStep.tab)} rightIcon={<ArrowRight className="w-4 h-4" />}>
                {STEP_CTA[currentStep.id]}
              </Button>
            ) : null
          ) : (
            <Button
              type="button"
              size="sm"
              variant={onCurrentTab ? 'secondary' : 'primary'}
              onClick={handleNextAction}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {onCurrentTab ? 'Continuer ici' : STEP_CTA[currentStep.id]}
            </Button>
          )}
        </div>
      ) : null}

      <nav
        aria-label="Parcours de l’événement"
        className="bg-surface rounded-2xl border border-border shadow-2xs p-3.5 sm:p-4 overflow-x-auto scroll-smooth scrollbar-hide relative"
      >
        <div className="flex items-center justify-between gap-2 min-w-max">
          {mainSteps.map((step, index) => {
            const isLast = index === mainSteps.length - 1;
            const isActive = step.tab === activeTab;
            const isCompleted = step.status === 'complete' || step.status === 'skipped';
            const isCurrent = step.status === 'current';

            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  ref={isActive ? activeBtnRef : null}
                  onClick={() => step.tab && onNavigateTab(step.tab)}
                  aria-current={isActive ? 'step' : undefined}
                  className={cn(
                    'flex flex-col items-center gap-2 relative group p-2 rounded-xl transition-all min-h-11 min-w-[76px] touch-manipulation',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    isActive ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-surface-muted',
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all shadow-2xs',
                      isActive
                        ? 'border-primary-solid bg-primary-solid text-primary-foreground motion-reduce:scale-100 scale-105'
                        : isCompleted
                          ? 'border-primary-solid bg-primary-solid text-primary-foreground'
                          : isCurrent
                            ? 'border-primary/50 text-primary bg-primary/10'
                            : 'border-border bg-surface-muted text-muted',
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" aria-hidden />
                    ) : (
                      <span className="text-xs font-bold">{index + 1}</span>
                    )}
                  </div>

                  <div className="text-center">
                    <p
                      className={cn(
                        'text-xs font-semibold transition-colors',
                        isActive ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted',
                      )}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-muted mt-0.5 max-w-[140px] line-clamp-1">
                      {step.detail}
                    </p>
                  </div>
                </button>

                {!isLast && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 min-w-[2rem] mx-2 rounded-full',
                      isCompleted ? 'bg-primary' : 'bg-border',
                    )}
                    aria-hidden
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </nav>

      {showSupport ? (
        <div
          role="tablist"
          aria-label="Onglets complémentaires"
          className="flex flex-wrap gap-2 items-center pt-1"
          onKeyDown={(event) => onTabListKeyDown(event, SUPPORT_TABS, activeTab, onNavigateTab)}
        >
          {SUPPORT_TABS.map((tab) => (
            <WorkflowTabChip
              key={tab.id}
              {...tab}
              selected={activeTab === tab.id}
              onSelect={onNavigateTab}
            />
          ))}
        </div>
      ) : protocolDesk ? (
        <div
          role="tablist"
          aria-label="Desk protocole"
          className="flex flex-wrap gap-2 items-center pt-1"
          onKeyDown={(event) => onTabListKeyDown(event, PROTOCOL_TABS, activeTab, onNavigateTab)}
        >
          {PROTOCOL_TABS.map((tab) => (
            <WorkflowTabChip
              key={tab.id}
              {...tab}
              selected={activeTab === tab.id}
              onSelect={onNavigateTab}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
