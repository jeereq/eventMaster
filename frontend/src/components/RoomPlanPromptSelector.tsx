'use client';

import React, { useState } from 'react';
import { Heart, Building2, PartyPopper, Sparkles } from 'lucide-react';
import {
  ROOM_PLAN_PROMPT_CATEGORIES,
  ROOM_PLAN_PROMPT_MODELS,
  type RoomPlanPromptCategory,
  type RoomPlanPromptModel,
} from '@/config/roomPlanPromptModels';
import { cn } from '@/lib/cn';

export default function RoomPlanPromptSelector({
  onSelect,
  selectedPrompt,
  disabled = false,
}: {
  onSelect: (model: RoomPlanPromptModel) => void;
  selectedPrompt?: string;
  disabled?: boolean;
}) {
  const [category, setCategory] = useState<RoomPlanPromptCategory | 'all'>('all');
  const models = category === 'all'
    ? ROOM_PLAN_PROMPT_MODELS
    : ROOM_PLAN_PROMPT_MODELS.filter((model) => model.category === category);

  const iconFor = (id: RoomPlanPromptCategory) => {
    if (id === 'wedding') return <Heart className="w-3.5 h-3.5" aria-hidden />;
    if (id === 'banquet') return <Sparkles className="w-3.5 h-3.5" aria-hidden />;
    if (id === 'pro') return <Building2 className="w-3.5 h-3.5" aria-hidden />;
    return <PartyPopper className="w-3.5 h-3.5" aria-hidden />;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">Exemples de brief</p>
        <p className="text-xs text-muted hidden sm:block">Cliquez pour remplir</p>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Types d’événement">
        <button
          type="button"
          aria-pressed={category === 'all'}
          disabled={disabled}
          onClick={() => setCategory('all')}
          className={cn(
            'min-h-11 px-2.5 rounded-full border text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            category === 'all'
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-border bg-surface text-muted hover:text-foreground',
          )}
        >
          Tous
        </button>
        {ROOM_PLAN_PROMPT_CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={category === item.id}
            disabled={disabled}
            onClick={() => setCategory(item.id)}
            className={cn(
              'min-h-11 px-2.5 rounded-full border text-xs font-semibold inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              category === item.id
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-surface text-muted hover:text-foreground',
            )}
          >
            {iconFor(item.id)}
            {item.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {models.map((model) => {
          const active = selectedPrompt === model.prompt;
          return (
            <button
              key={model.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(model)}
              className={cn(
                'text-left min-h-11 p-3 rounded-[var(--radius-card)] border transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                active
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-surface hover:border-primary/40',
                disabled && 'opacity-60',
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-foreground">{model.title}</span>
                <span className="text-xs font-semibold text-primary-solid shrink-0">{model.badge}</span>
              </span>
              <span className="block text-xs text-muted mt-1 leading-snug">{model.summary}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
