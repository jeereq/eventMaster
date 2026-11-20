'use client';

import React from 'react';
import { EyeOff, Info } from '@/components/icons';
import type { AmbienceRule, AmbienceRuleScope } from '@/lib/roomAmbienceRules';
import { cn } from '@/lib/cn';

const SCOPE_LABEL: Record<AmbienceRuleScope, string> = {
  walls: 'Murs',
  floor: 'Sol',
  theme: 'Thème',
  furniture: 'Mobilier',
  lighting: 'Éclairage',
};

/**
 * Règles d’application d’une ambiance pour la salle actuelle : ce qui ne se verra pas
 * (murs masqués, tente, lustres posés…) et ce qui reste par-dessus (tapis, images murales…).
 */
export default function AmbienceRulesList({
  rules,
  title = 'Ce qui ne s’applique pas ici',
  className,
}: {
  rules: AmbienceRule[];
  title?: string;
  className?: string;
}) {
  if (!rules.length) return null;
  const blocked = rules.filter((r) => r.level === 'blocked');
  const infos = rules.filter((r) => r.level === 'info');
  return (
    <section
      aria-label={title}
      className={cn(
        'rounded-[var(--radius-button)] border px-3 py-2.5 space-y-2',
        blocked.length
          ? 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10'
          : 'border-border bg-surface-muted/50',
        className,
      )}
    >
      <p className="text-xs font-bold uppercase text-foreground">{title}</p>
      <ul className="space-y-1.5">
        {[...blocked, ...infos].map((rule) => (
          <li key={rule.id} className="flex gap-2 text-xs leading-snug text-foreground">
            {rule.level === 'blocked' ? (
              <EyeOff className="mt-0.5 size-3.5 shrink-0 text-amber-700 dark:text-amber-400" aria-label="Sans effet visible" />
            ) : (
              <Info className="mt-0.5 size-3.5 shrink-0 text-muted" aria-label="À savoir" />
            )}
            <span>
              <span className="font-semibold">{SCOPE_LABEL[rule.scope]} · </span>
              {rule.text}
              {rule.fix ? <span className="block text-muted">{rule.fix}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
