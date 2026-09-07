'use client';

import React, { useState, useMemo } from 'react';
import {
  History,
  Plus,
  Trash2,
  Move,
  Settings,
  LayoutTemplate,
  Pencil,
  Sparkles,
  Building2,
  Layers,
  Keyboard,
  Palette,
  BrickWall,
} from 'lucide-react';
import {
  type LayoutActionEntry,
  type LayoutActionSource,
  LAYOUT_ACTION_SOURCE_LABELS,
} from '@/lib/layoutActionLog';

const kindIcons: Record<LayoutActionEntry['kind'], React.ReactNode> = {
  add: <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
  edit: <Pencil className="w-3.5 h-3.5 text-primary" />,
  delete: <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />,
  move: <Move className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
  template: <LayoutTemplate className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
  settings: <Settings className="w-3.5 h-3.5 text-muted" />,
  info: <History className="w-3.5 h-3.5 text-muted" />,
};

const sourceIcons: Partial<Record<LayoutActionSource, React.ReactNode>> = {
  ai_studio: <Sparkles className="w-3 h-3 text-primary" />,
  template: <LayoutTemplate className="w-3 h-3 text-amber-600 dark:text-amber-400" />,
  story: <Building2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />,
  shortcut: <Keyboard className="w-3 h-3 text-muted" />,
  ambience: <Palette className="w-3 h-3 text-purple-600 dark:text-purple-400" />,
  wall_editor: <BrickWall className="w-3 h-3 text-stone-600 dark:text-stone-400" />,
  drag_drop: <Move className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />,
};

interface LayoutActionPanelProps {
  actions: LayoutActionEntry[];
  className?: string;
}

type ActionFilter = 'all' | 'furniture' | 'ai' | 'story' | 'template';

export default function LayoutActionPanel({ actions, className = '' }: LayoutActionPanelProps) {
  const [filter, setFilter] = useState<ActionFilter>('all');

  const filteredActions = useMemo(() => {
    if (filter === 'all') return actions;
    if (filter === 'ai') return actions.filter((a) => a.context?.source === 'ai_studio' || a.message.toLowerCase().includes('ia'));
    if (filter === 'furniture') return actions.filter((a) => a.context?.category === 'furniture' || a.kind === 'add' || a.kind === 'move' || a.kind === 'delete');
    if (filter === 'story') return actions.filter((a) => a.context?.category === 'story' || a.context?.storyLabel || a.message.toLowerCase().includes('étage'));
    if (filter === 'template') return actions.filter((a) => a.context?.source === 'template' || a.kind === 'template');
    return actions;
  }, [actions, filter]);

  return (
    <div className={`bg-surface border border-border rounded-[var(--radius-card)] overflow-hidden shadow-2xs ${className}`}>
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between gap-2 bg-surface-muted/50">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold text-foreground uppercase tracking-wider">Journal des actions</p>
        </div>
        <span className="text-xs font-bold text-muted px-2 py-0.5 rounded-full bg-surface border border-border">
          {actions.length} action{actions.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Filtres de contexte ergonomiques */}
      {actions.length > 3 && (
        <div className="px-2.5 py-1.5 border-b border-border-subtle bg-surface flex items-center gap-1.5 overflow-x-auto text-xs" role="tablist" aria-label="Filtrer l'historique">
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'all'}
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 min-h-[32px] rounded-md text-xs font-semibold transition ${
              filter === 'all' ? 'bg-primary/10 text-primary font-bold' : 'text-muted hover:text-foreground'
            }`}
          >
            Toutes
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'furniture'}
            onClick={() => setFilter('furniture')}
            className={`px-2.5 py-1 min-h-[32px] rounded-md text-xs font-semibold transition ${
              filter === 'furniture' ? 'bg-primary/10 text-primary font-bold' : 'text-muted hover:text-foreground'
            }`}
          >
            Mobilier
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'ai'}
            onClick={() => setFilter('ai')}
            className={`px-2.5 py-1 min-h-[32px] rounded-md text-xs font-semibold transition ${
              filter === 'ai' ? 'bg-primary/10 text-primary font-bold' : 'text-muted hover:text-foreground'
            }`}
          >
            Studio IA
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'story'}
            onClick={() => setFilter('story')}
            className={`px-2.5 py-1 min-h-[32px] rounded-md text-xs font-semibold transition ${
              filter === 'story' ? 'bg-primary/10 text-primary font-bold' : 'text-muted hover:text-foreground'
            }`}
          >
            Étages
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'template'}
            onClick={() => setFilter('template')}
            className={`px-2.5 py-1 min-h-[32px] rounded-md text-xs font-semibold transition ${
              filter === 'template' ? 'bg-primary/10 text-primary font-bold' : 'text-muted hover:text-foreground'
            }`}
          >
            Modèles
          </button>
        </div>
      )}

      <ul className="max-h-56 overflow-y-auto divide-y divide-border">
        {filteredActions.length === 0 ? (
          <li className="px-3 py-6 text-xs text-muted italic text-center">
            {actions.length === 0
              ? 'Aucune action enregistrée — chaque geste sera conservé avec son contexte.'
              : 'Aucune action trouvée pour ce filtre.'}
          </li>
        ) : (
          filteredActions.map((a) => {
            const ctx = a.context;
            return (
              <li key={a.id} className="px-3 py-2.5 flex items-start gap-2.5 text-xs hover:bg-surface-muted/30 transition">
                <span className="mt-0.5 shrink-0 p-1 rounded-md bg-surface-muted border border-border">
                  {kindIcons[a.kind]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-foreground font-medium leading-snug">{a.message}</p>
                    {ctx?.seatsDelta !== undefined && ctx.seatsDelta !== 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
                          ctx.seatsDelta > 0
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {ctx.seatsDelta > 0 ? `+${ctx.seatsDelta}` : ctx.seatsDelta} places
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted flex-wrap">
                    <span>
                      {new Date(a.at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    {ctx?.storyLabel && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 font-semibold text-[10px]">
                        <Building2 className="w-2.5 h-2.5" /> {ctx.storyLabel}
                      </span>
                    )}
                    {ctx?.source && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-muted border border-border text-foreground font-semibold text-[10px]">
                        {sourceIcons[ctx.source] || null}
                        {LAYOUT_ACTION_SOURCE_LABELS[ctx.source] || ctx.source}
                      </span>
                    )}
                    {ctx?.targetLabel && (
                      <span className="truncate max-w-[120px] text-muted/80">
                        {ctx.targetLabel}
                      </span>
                    )}
                    {ctx?.authorName && (
                      <span className="text-muted/70">
                        par {ctx.authorName}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
