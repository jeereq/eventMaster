'use client';

import React from 'react';
import {
  CheckCircle2,
  Users,
  ClipboardList,
  Shirt,
  MessageSquare,
} from 'lucide-react';
import {
  type EventWorkflowState,
  type EventWorkflowTab,
} from '@/lib/eventWorkflow';
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

const SUPPORT_TABS: Array<{ id: EventWorkflowTab; label: string; icon: any }> = [
  { id: 'guestInfo', label: 'Infos invités', icon: Shirt },
  { id: 'feed', label: 'Feed', icon: MessageSquare },
  { id: 'tasks', label: 'Tâches', icon: ClipboardList },
  { id: 'staff', label: 'Équipe', icon: Users },
];

export default function EventWorkflowPanel({
  workflow,
  activeTab,
  onNavigateTab,
  compact = false,
  protocolDesk = false,
}: EventWorkflowPanelProps) {
  
  const mainSteps = workflow.steps.filter(s => s.tab); // keep only steps with a tab mapped
  const showSupport = !compact && !protocolDesk;

  return (
    <div className="space-y-4">
      {/* Main Workflow Stepper */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm p-4 overflow-x-auto scrollbar-hide">
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
                  onClick={() => step.tab && onNavigateTab(step.tab)}
                  className={cn(
                    "flex flex-col items-center gap-2 relative group p-2 rounded-xl transition-all",
                    isActive ? "bg-primary/5" : "hover:bg-surface-muted"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                    isActive ? "border-primary bg-primary text-white" 
                    : isCompleted ? "border-emerald-500 bg-emerald-500 text-white"
                    : isCurrent ? "border-primary/50 text-primary bg-primary/10"
                    : "border-border bg-surface-muted text-muted"
                  )}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs font-bold">{index + 1}</span>}
                  </div>
                  
                  <div className="text-center">
                    <p className={cn(
                      "text-[11px] font-bold uppercase tracking-wider transition-colors",
                      isActive ? "text-primary" : isCompleted ? "text-emerald-700" : "text-muted"
                    )}>
                      {step.title}
                    </p>
                    <p className="text-[10px] text-muted mt-0.5 max-w-[140px] line-clamp-1">
                      {step.detail}
                    </p>
                  </div>
                </button>
                
                {!isLast && (
                  <div className={cn(
                    "flex-1 h-0.5 min-w-[2rem] mx-2 rounded-full",
                    isCompleted ? "bg-emerald-500" : "bg-border"
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Support / Secondary Navigation */}
      {showSupport && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[11px] font-semibold text-muted uppercase tracking-wider mr-2">
            Paramètres & Support :
          </span>
          {SUPPORT_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavigateTab(id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border",
                activeTab === id 
                  ? "bg-foreground text-background border-foreground shadow-sm" 
                  : "bg-surface text-muted border-border hover:text-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
