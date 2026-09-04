'use client';

import React from 'react';
import { Coins, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatFc } from '@/config/landingPricing';
import { AI_TOKEN_PACK_PRICE_FC, AI_TOKEN_PACK_SIZE, type AiAllowance } from '@/lib/aiTokens';

/**
 * Détermine si au moins 60% des jetons ont été utilisés.
 * Le compteur ne doit s'afficher que si cette condition est remplie.
 */
export function isAiSimulationThresholdReached(allowance?: AiAllowance | null): boolean {
  if (!allowance) return false;

  // Si plus aucun crédit disponible (100% consommés)
  if (allowance.totalRemaining <= 0) return true;

  const freeMax = allowance.freeTrialsMax > 0 ? allowance.freeTrialsMax : 4;
  const freeUsed = Math.min(freeMax, Math.max(0, allowance.freeTrialsUsed || 0));
  const bonus = Math.max(0, allowance.bonusTokens || 0);

  // Cas où l'utilisateur n'a aucun jeton acheté : calcul sur les jetons gratuits
  if (bonus === 0) {
    const freeUsedRatio = freeUsed / freeMax;
    // 60% de 4 = 2.4 -> déclenché à partir de 3 utilisés (75%) ou plus
    return freeUsedRatio >= 0.6;
  }

  // Cas avec jetons bonus achetés : pool total = gratuits + bonus achetés (au moins la taille d'un pack)
  const totalAllocated = freeMax + Math.max(bonus, AI_TOKEN_PACK_SIZE);
  const remaining = Math.max(0, allowance.totalRemaining);
  const consumed = Math.max(0, totalAllocated - remaining);
  const usedRatio = consumed / totalAllocated;

  return usedRatio >= 0.6;
}

export default function AiSimulationCounter({
  allowance,
  onBuy,
  compact = false,
  className,
}: {
  allowance: AiAllowance;
  onBuy: () => void;
  compact?: boolean;
  className?: string;
}) {
  // Règle : le compteur ne s'affiche que lorsque 60% des jetons sont utilisés
  if (!isAiSimulationThresholdReached(allowance)) {
    return null;
  }

  const remaining = allowance.totalRemaining;
  const used = Math.min(allowance.freeTrialsUsed, allowance.freeTrialsMax);
  const max = allowance.freeTrialsMax;
  const bonus = allowance.bonusTokens;
  const empty = remaining <= 0;

  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border p-3 sm:p-3.5 animate-fade-in',
        empty
          ? 'border-amber-500/30 bg-amber-500/8'
          : 'border-primary/25 bg-primary/8',
        className,
      )}
    >
      <div className={cn('flex gap-3', compact ? 'flex-col sm:flex-row sm:items-center sm:justify-between' : 'flex-col sm:flex-row sm:items-center sm:justify-between')}>
        <div className="min-w-0 flex items-center gap-3">
          <div className={cn(
            'rounded-xl flex items-center justify-center shrink-0 tabular-nums font-black text-white shadow-sm',
            compact ? 'w-11 h-11 text-lg' : 'w-14 h-14 text-2xl',
            empty ? 'bg-amber-500' : 'bg-primary',
          )}>
            {remaining}
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs sm:text-sm font-bold text-foreground leading-snug">
              {remaining} simulation{remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''}
            </p>
            <p className="text-[11px] text-muted">
              {allowance.freeRemaining}/{max} essais gratuits
              {bonus > 0 ? ` · +${bonus} jeton${bonus > 1 ? 's' : ''} bonus` : ''}
            </p>
            <div
              className="flex items-center gap-1 pt-0.5 flex-wrap"
              aria-label={`${allowance.freeRemaining} essais gratuits restants sur ${max}`}
            >
              {Array.from({ length: max }, (_, index) => {
                const consumed = index < used;
                return compact ? (
                  <span
                    key={index}
                    className={cn(
                      'h-2 w-2 sm:w-2.5 rounded-full transition-colors',
                      consumed ? 'bg-muted/40' : 'bg-emerald-500',
                    )}
                    title={consumed ? `Essai ${index + 1} utilisé` : `Essai ${index + 1} disponible`}
                  />
                ) : (
                  <span
                    key={index}
                    className={cn(
                      'w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold border tabular-nums',
                      consumed
                        ? 'bg-muted/15 border-border text-muted line-through'
                        : 'bg-emerald-500 text-white border-emerald-600',
                    )}
                    title={consumed ? `Essai ${index + 1} utilisé` : `Essai ${index + 1} disponible`}
                  >
                    {index + 1}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onBuy}
          className="inline-flex items-center justify-center gap-1.5 min-h-11 sm:min-h-9 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-bold shrink-0 transition cursor-pointer touch-manipulation"
        >
          <Coins className="w-3.5 h-3.5 text-amber-500" />
          <span>Acheter {AI_TOKEN_PACK_SIZE} sims ({formatFc(AI_TOKEN_PACK_PRICE_FC)})</span>
        </button>
      </div>

      {!compact ? (
        <p className="mt-2.5 text-[11px] text-muted inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
          {empty
            ? 'Plus d’essai gratuit. Rechargez pour relancer le simulateur.'
            : 'Chaque génération de 3 packs consomme 1 simulation.'}
        </p>
      ) : null}
    </div>
  );
}
