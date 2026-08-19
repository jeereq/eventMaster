'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Compass,
  ListOrdered,
  Lightbulb,
  ExternalLink,
  Search,
  Play,
} from 'lucide-react';
import { getUserGuide, type UserGuideId } from '@/config/userGuides';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui';

interface UserGuideViewProps {
  guideId: UserGuideId;
  showHeader?: boolean;
  onStartTour?: () => void;
}

function parseSteps(content: string): string[] {
  return content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^\d+\.\s*/, ''));
}

export default function UserGuideView({ guideId, showHeader = true, onStartTour }: UserGuideViewProps) {
  const guide = getUserGuide(guideId);
  const [openWorkflowId, setOpenWorkflowId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const filteredWorkflows = useMemo(() => {
    if (!guide) return [];
    const q = query.trim().toLowerCase();
    if (!q) return guide.workflows;
    return guide.workflows.filter(
      (wf) =>
        wf.title.toLowerCase().includes(q) ||
        wf.content.toLowerCase().includes(q),
    );
  }, [guide, query]);

  if (!guide) {
    return (
      <p className="text-sm text-muted text-center py-8">Guide introuvable.</p>
    );
  }

  const firstWorkflowId = filteredWorkflows[0]?.id ?? null;
  const effectiveOpen = openWorkflowId === null && firstWorkflowId
    ? firstWorkflowId
    : openWorkflowId;

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2 min-w-0">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5" />
                {guide.badge}
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
                {guide.title}
              </h2>
              <p className="text-sm text-muted leading-relaxed max-w-2xl">{guide.summary}</p>
            </div>
            {onStartTour && (
              <Button size="sm" onClick={onStartTour} leftIcon={<Play className="w-3.5 h-3.5" />}>
                Lancer la visite
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-3">
        <div className="bg-surface border border-border rounded-[var(--radius-card)] p-4 sm:p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Ce que vous pouvez faire
          </h3>
          <ul className="space-y-2">
            {guide.canDo.map((item) => (
              <li key={item} className="text-sm text-foreground/80 flex gap-2 leading-relaxed">
                <span className="text-primary shrink-0 mt-1.5 w-1 h-1 rounded-full bg-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-surface border border-border rounded-[var(--radius-card)] p-4 sm:p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <XCircle className="w-4 h-4 text-muted" />
            Limites de votre rôle
          </h3>
          <ul className="space-y-2">
            {guide.cannotDo.map((item) => (
              <li key={item} className="text-sm text-foreground/80 flex gap-2 leading-relaxed">
                <span className="text-muted shrink-0 mt-1.5 w-1 h-1 rounded-full bg-muted" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {guide.navLinks.length > 0 && (
        <div className="bg-surface border border-border rounded-[var(--radius-card)] p-4 sm:p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Compass className="w-4 h-4 text-primary" />
            Raccourcis utiles
          </h3>
          <div className="flex flex-wrap gap-2">
            {guide.navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-button)] bg-surface-muted border border-border text-xs font-semibold text-foreground hover:border-primary/30 hover:text-primary transition"
              >
                {link.label}
                <ExternalLink className="w-3 h-3 opacity-50" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-primary" />
            Parcours pas-à-pas
            <span className="text-[10px] font-medium text-muted bg-surface-muted px-1.5 py-0.5 rounded-md">
              {filteredWorkflows.length}
            </span>
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrer un parcours…"
              className="w-full pl-8 pr-3 py-2 text-xs rounded-[var(--radius-button)] border border-border bg-surface text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
            />
          </div>
        </div>

        {filteredWorkflows.length === 0 ? (
          <p className="text-sm text-muted py-6 text-center border border-dashed border-border rounded-[var(--radius-card)]">
            Aucun parcours ne correspond à « {query} ».
          </p>
        ) : (
          <div className="space-y-2">
            {filteredWorkflows.map((wf, index) => {
              const open = effectiveOpen === wf.id;
              const steps = parseSteps(wf.content);
              return (
                <div
                  key={wf.id}
                  className={cn(
                    'border rounded-[var(--radius-card)] overflow-hidden transition-colors',
                    open ? 'border-primary/30 bg-surface' : 'border-border bg-surface',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpenWorkflowId(open ? null : wf.id)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-surface-muted/60 transition"
                    aria-expanded={open}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
                        {index + 1}
                      </span>
                      <span className="font-semibold text-sm text-foreground truncate">{wf.title}</span>
                    </span>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 text-muted shrink-0 transition-transform',
                        open && 'rotate-180',
                      )}
                    />
                  </button>
                  {open && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                      <ol className="space-y-2.5">
                        {steps.map((step, i) => (
                          <li key={i} className="flex gap-3 text-sm text-foreground/85 leading-relaxed">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[10px] font-bold text-muted">
                              {i + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                      {wf.links && wf.links.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {wf.links.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                              → {link.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-surface-muted border border-border rounded-[var(--radius-card)] p-4 sm:p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" />
          Astuces & dépannage
        </h3>
        <ul className="space-y-2.5">
          {guide.tips.map((tip) => (
            <li key={tip} className="text-sm text-foreground/80 flex gap-2.5 leading-relaxed">
              <Lightbulb className="w-4 h-4 text-muted shrink-0 mt-0.5" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
