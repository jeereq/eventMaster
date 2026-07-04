'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Route,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import {
  type EventWorkflowState,
  type EventWorkflowTab,
  type EventWorkflowStep,
} from '@/lib/eventWorkflow';

interface EventWorkflowPanelProps {
  workflow: EventWorkflowState;
  activeTab: string;
  onNavigateTab: (tab: EventWorkflowTab) => void;
  onAction?: (stepId: string) => void;
  compact?: boolean;
}

function StepIcon({ step }: { step: EventWorkflowStep }) {
  if (step.status === 'complete') {
    return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
  }
  if (step.status === 'current') {
    return (
      <span className="relative flex h-5 w-5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-30" />
        <span className="relative inline-flex rounded-full h-5 w-5 bg-indigo-600 ring-4 ring-indigo-100" />
      </span>
    );
  }
  return <Circle className="w-5 h-5 text-slate-300 shrink-0" />;
}

export default function EventWorkflowPanel({
  workflow,
  activeTab,
  onNavigateTab,
  onAction,
  compact = false,
}: EventWorkflowPanelProps) {
  const [expanded, setExpanded] = useState(!compact);

  const currentStep = workflow.steps.find((s) => s.status === 'current');

  const handleStepClick = (step: EventWorkflowStep) => {
    if (step.tab) {
      onNavigateTab(step.tab);
    }
    if (onAction && step.status !== 'complete') {
      onAction(step.id);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/60 border border-indigo-100 rounded-2xl overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/40 transition"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0">
            <Route className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900">Parcours événement</p>
            <p className="text-xs text-slate-500 truncate">
              {workflow.completedCount}/{workflow.totalCount} étapes
              {currentStep ? ` · Prochaine : ${currentStep.title}` : ' · Parcours terminé'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${workflow.progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-indigo-700 w-8">{workflow.progressPercent}%</span>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-indigo-100/80">
          <div className="sm:hidden flex items-center gap-2 pt-3">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${workflow.progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-indigo-700">{workflow.progressPercent}%</span>
          </div>

          <div className="hidden lg:grid lg:grid-cols-9 gap-2 pt-3">
            {workflow.steps.map((step, index) => (
              <WorkflowStepCard
                key={step.id}
                step={step}
                index={index}
                isActiveTab={step.tab === activeTab}
                onClick={() => handleStepClick(step)}
              />
            ))}
          </div>

          <div className="lg:hidden space-y-2 pt-3">
            {workflow.steps.map((step, index) => (
              <WorkflowStepRow
                key={step.id}
                step={step}
                index={index}
                isActiveTab={step.tab === activeTab}
                onClick={() => handleStepClick(step)}
              />
            ))}
          </div>

          {currentStep && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white/70 border border-indigo-100 rounded-xl">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Étape en cours</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{currentStep.title}</p>
                <p className="text-xs text-slate-500 mt-1">{currentStep.description}</p>
              </div>
              {currentStep.href ? (
                <Link
                  href={currentStep.href}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shrink-0"
                >
                  Ouvrir
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              ) : currentStep.tab ? (
                <button
                  type="button"
                  onClick={() => onNavigateTab(currentStep.tab!)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shrink-0"
                >
                  Continuer
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WorkflowStepCard({
  step,
  index,
  isActiveTab,
  onClick,
}: {
  step: EventWorkflowStep;
  index: number;
  isActiveTab: boolean;
  onClick: () => void;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-1 mb-2">
        <span className="text-[10px] font-bold text-slate-400">#{index + 1}</span>
        <StepIcon step={step} />
      </div>
      <p className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-2">{step.title}</p>
      <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-snug">{step.detail}</p>
    </>
  );

  if (step.href) {
    return (
      <Link
        href={step.href}
        className={`block p-2.5 rounded-xl border text-left transition hover:shadow-sm ${
          step.status === 'complete'
            ? 'bg-emerald-50/80 border-emerald-200'
            : step.status === 'current'
              ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200'
              : 'bg-white border-slate-200 hover:border-indigo-200'
        }`}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!step.tab}
      className={`p-2.5 rounded-xl border text-left transition hover:shadow-sm disabled:cursor-default ${
        isActiveTab && step.tab
          ? 'bg-indigo-100 border-indigo-400 ring-1 ring-indigo-300'
          : step.status === 'complete'
            ? 'bg-emerald-50/80 border-emerald-200 hover:border-emerald-300'
            : step.status === 'current'
              ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200'
              : 'bg-white border-slate-200 hover:border-indigo-200'
      }`}
    >
      {content}
    </button>
  );
}

function WorkflowStepRow({
  step,
  index,
  isActiveTab,
  onClick,
}: {
  step: EventWorkflowStep;
  index: number;
  isActiveTab: boolean;
  onClick: () => void;
}) {
  const rowClass = `w-full flex items-start gap-3 p-3 rounded-xl border text-left transition ${
    isActiveTab && step.tab
      ? 'bg-indigo-50 border-indigo-300'
      : step.status === 'complete'
        ? 'bg-emerald-50/60 border-emerald-200'
        : step.status === 'current'
          ? 'bg-indigo-50/80 border-indigo-200'
          : 'bg-white border-slate-200'
  }`;

  const inner = (
    <>
      <StepIcon step={step} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400">#{index + 1}</span>
          <p className="text-sm font-bold text-slate-900">{step.title}</p>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{step.detail}</p>
      </div>
      {(step.tab || step.href) && <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
    </>
  );

  if (step.href) {
    return (
      <Link href={step.href} className={rowClass}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={!step.tab} className={rowClass}>
      {inner}
    </button>
  );
}
