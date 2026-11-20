'use client';

/**
 * Notice « règles murs & sols » : dit ce qui ne s’appliquera pas (ou pas
 * entièrement) et pourquoi, avec un bouton de correction quand il y en a un.
 */

import React from 'react';
import { EyeOff, Info, Lock } from '@/components/icons';
import { cn } from '@/lib/cn';
import type { SurfaceRule, SurfaceRuleAction, SurfaceRuleTone } from '@/lib/roomSurfaceRules';

const TONE_STYLE: Record<SurfaceRuleTone, { icon: typeof Info; box: string; iconClass: string; label: string }> = {
  hidden: {
    icon: EyeOff,
    box: 'border-amber-300/70 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10',
    iconClass: 'text-amber-700 dark:text-amber-300',
    label: 'Ne se voit pas',
  },
  partial: {
    icon: Info,
    box: 'border-sky-300/70 bg-sky-50 dark:border-sky-500/40 dark:bg-sky-500/10',
    iconClass: 'text-sky-700 dark:text-sky-300',
    label: 'S’applique en partie',
  },
  kept: {
    icon: Lock,
    box: 'border-border bg-surface-muted/60',
    iconClass: 'text-muted',
    label: 'Garde sa matière',
  },
};

export default function SurfaceRulesNotice({
  rules,
  title = 'À savoir pour les murs et le sol',
  onAction,
  className,
}: {
  rules: SurfaceRule[];
  title?: string;
  onAction?: (action: SurfaceRuleAction) => void;
  className?: string;
}) {
  if (!rules.length) return null;
  return (
    <div className={cn('space-y-1.5', className)} role="note" aria-label={title}>
      <p className="text-xs font-bold uppercase text-muted">{title}</p>
      <ul className="space-y-1.5">
        {rules.map((rule) => {
          const tone = TONE_STYLE[rule.tone];
          const Icon = tone.icon;
          return (
            <li
              key={rule.id}
              className={cn('flex items-start gap-2 rounded-[var(--radius-button)] border px-2.5 py-2', tone.box)}
            >
              <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', tone.iconClass)} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">
                  {rule.title}
                  <span className="sr-only"> ({tone.label})</span>
                </p>
                <p className="text-xs text-muted leading-snug">{rule.detail}</p>
              </div>
              {rule.action && onAction ? (
                <button
                  type="button"
                  onClick={() => onAction(rule.action!.id)}
                  className="shrink-0 self-center min-h-9 px-2.5 rounded-[var(--radius-button)] border border-border bg-surface text-xs font-bold text-foreground hover:bg-surface-muted"
                >
                  {rule.action.label}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
